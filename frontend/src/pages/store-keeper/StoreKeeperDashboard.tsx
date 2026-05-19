import { Box, Grid, Typography, Card, CardContent, Button, Table, TableHead, TableRow, TableCell, TableBody, Chip, LinearProgress, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Select, MenuItem, InputLabel, FormControl, Alert, Snackbar, Checkbox, FormControlLabel, TableContainer, useTheme, useMediaQuery } from '@mui/material';
import { useState, useEffect, useRef } from 'react';
import { InputAdornment } from '@mui/material';
import axios from 'axios';
import { IconButton } from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarningIcon from '@mui/icons-material/Warning';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import SpaIcon from '@mui/icons-material/Spa';
import ChatIcon from '@mui/icons-material/Chat';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

const buildSocketUrl = (path: string) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${path}`;
};

export default function StoreKeeperDashboard() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { t } = useLanguage();
    
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [approvedOrders, setApprovedOrders] = useState<any[]>([]);
    const [chiefClerkPending, setChiefClerkPending] = useState<any[]>([]);
    const [unreadMessages, setUnreadMessages] = useState(0);

    const navigate = useNavigate();

    const [ccApproveOpen, setCcApproveOpen] = useState(false);
    const [ccSelectedOrder, setCcSelectedOrder] = useState<any>(null);
    const [ccApproveQty, setCcApproveQty] = useState('');
    const [ccRemarks, setCcRemarks] = useState('');

    // Tab Navigation via URL route
    const location = useLocation();
    let currentTab = 1; // Default to inventory
    if (location.pathname.includes('main')) currentTab = 0;
    else if (location.pathname.includes('approvals')) currentTab = 2;
    else if (location.pathname.includes('inventory')) currentTab = 1;

    // Transaction Modal
    const [openModal, setOpenModal] = useState(false);
    const [modalType, setModalType] = useState<'ISSUE' | 'RECEIPT' | 'RESTOCK_REQUEST'>('ISSUE');
    const [selectedItem, setSelectedItem] = useState('');
    const [qty, setQty] = useState<string | number>('');
    const [issuedTo, setIssuedTo] = useState('');
    const [search, setSearch] = useState('');

    // --- Division / Field Selection ---
    const [divisions, setDivisions] = useState<any[]>([]);
    const [fields, setFields] = useState<any[]>([]);
    const [officers, setOfficers] = useState<any[]>([]);
    const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
    const [selectedFields, setSelectedFields] = useState<string[]>([]);
    // ----------------------------------

    // New Item / Edit Modal
    const [newItemOpen, setNewItemOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [newItem, setNewItem] = useState({
        name: '',
        category: 'FERTILIZER',
        unit: 'kg',
        currentQuantity: '' as any, // Allow string for input
        bufferLevel: 0,
        minimumLevel: 0,
        pricePerUnit: '' as any
    });

    const [orderToIssue, setOrderToIssue] = useState<number | null>(null);
    const [confirmIssueOpen, setConfirmIssueOpen] = useState(false);

    // Notification State
    const [notification, setNotification] = useState<{ open: boolean, message: string, severity: 'success' | 'error' | 'info' | 'warning' }>({
        open: false,
        message: '',
        severity: 'info'
    });

    const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
        setNotification({ open: true, message, severity });
    };

    const handleCloseNotification = () => {
        setNotification({ ...notification, open: false });
    };

    const [user] = useState(() => JSON.parse(sessionStorage.getItem('user') || '{}'));
    const tenantId = user?.tenantId;
    const userId = user?.userId || user?.id;
    const isFetching = useRef(false);

    const fetchInventory = async (isFirstLoad = false) => {
        if (!tenantId || isFetching.current) return;
        isFetching.current = true;
        if (isFirstLoad) setLoading(true);
        try {
            const [itemsRes, transRes] = await Promise.all([
                axios.get(`/api/inventory?tenantId=${tenantId}`),
                axios.get(`/api/inventory/transactions?tenantId=${tenantId}`)
            ]);

            setItems(itemsRes.data);

            const approvedFoOrders = transRes.data.filter((t: any) =>
                t.type === 'FO_REQUISITION' && t.status === 'APPROVED'
            );
            setApprovedOrders(approvedFoOrders);

            const ccPending = transRes.data.filter((t: any) =>
                t.type === 'RESTOCK_REQUEST' &&
                (t.status === 'CHIEF_CLERK_PENDING' || (t.status === 'PENDING' && t.issuedTo?.includes('SYSTEM')))
            );
            setChiefClerkPending(ccPending);

            try {
                const msgRes = await axios.get(`/api/messages?userId=${userId}&userRole=STORE_KEEPER`, {
                    headers: { 'X-Tenant-ID': tenantId }
                });
                setUnreadMessages(msgRes.data.filter((m: any) => m.receiverId === userId && !m.read).length);
            } catch (e) {}

            setError('');
        } catch (err) {
            console.error("Failed to fetch inventory.", err);
            setError("Could not load inventory data.");
        } finally {
            isFetching.current = false;
            if (isFirstLoad) setLoading(false);
        }
    };

    useEffect(() => {
        if (!tenantId) return;
        fetchInventory(true);
        
        axios.get(`/api/divisions?tenantId=${tenantId}`)
            .then(res => setDivisions(res.data))
            .catch(err => console.error("Failed to load divisions", err));
            
    }, [tenantId]); // ONLY depend on tenantId

    useEffect(() => {
        if (!tenantId) return;
        let socket: WebSocket | null = null;
        let reconnectTimer: any = null;
        let mountTimer: any = null;

        const connect = () => {
            if (socket) return;
            try {
                socket = new WebSocket(buildSocketUrl('/ws/inventory'));
                socket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'inventory-updated' && data.tenantId === tenantId) {
                            fetchInventory(); // Subtle fetch without full page reload
                        }
                    } catch (e) {
                        console.error("WS parse error", e);
                    }
                };
                socket.onclose = () => {
                    socket = null;
                    reconnectTimer = setTimeout(connect, 5000); // Wait 5s before reconnect
                };
                socket.onerror = () => {
                    if (socket) socket.close();
                };
            } catch (err) {
                console.error("WS error", err);
            }
        };

        mountTimer = setTimeout(connect, 2000); // 2s delay to avoid mount race

        return () => {
            if (mountTimer) clearTimeout(mountTimer);
            if (socket) {
                socket.onclose = null;
                socket.close();
            }
            if (reconnectTimer) clearTimeout(reconnectTimer);
        };
    }, [tenantId]);

    const handleRestockRequest = (item: any) => {
        setSelectedItem(item.id);
        setModalType('RESTOCK_REQUEST');
        setOpenModal(true);
        setQty('');
        setIssuedTo('');
        setSelectedDivisions([]);
        setSelectedFields([]);
    };

    const handleIssueOrder = (orderId: number) => {
        setOrderToIssue(orderId);
        setConfirmIssueOpen(true);
    };

    const confirmIssueOrder = async () => {
        if (!orderToIssue) return;
        
        // Safety Validation: FALLING BELOW MANDATORY MINIMUM LEVEL
        const order = approvedOrders.find(o => o.id === orderToIssue);
        if (order) {
            const item = items.find(i => i.id === order.itemId);
            if (item) {
                const projectedQty = item.currentQuantity - order.quantity;
                const minLevel = item.minimumLevel || 0;
                
                if (projectedQty < minLevel) {
                    showNotification(`SAFETY ALERT: Transaction Blocked! Issuing this order would leave only ${projectedQty} ${item.unit} in stock, violating the mandatory minimum level of ${minLevel} ${item.unit}.`, 'error');
                    setConfirmIssueOpen(false);
                    return;
                }
            }
        }
        
        try {
            await axios.put(`/api/inventory/transactions/${orderToIssue}/status?status=ISSUED`);
            fetchInventory();
            showNotification(t('Stock Successfully Issued to Field Officer'), 'success');
            setConfirmIssueOpen(false);
        } catch (err: any) {
            showNotification(t('Failed to issue order') + ': ' + (err.response?.data || err.message), 'error');
        }
    };

    // --- Confirmation Dialog ---
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        title: string;
        message: string;
        onConfirm: () => void | Promise<void>;
    }>({
        open: false,
        title: '',
        message: '',
        onConfirm: () => {}
    });

    const triggerConfirm = (title: string, message: string, onConfirm: () => void | Promise<void>) => {
        setConfirmDialog({
            open: true,
            title,
            message,
            onConfirm
        });
    };

    const handleConfirmClose = () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
    };

    const handleConfirmAction = async () => {
        await confirmDialog.onConfirm();
        handleConfirmClose();
    };

    const handleRejectOrder = (orderId: number) => {
        triggerConfirm(
            t("Reject Field Requisition?"),
            t("Are you sure you want to REJECT this field requisition? This will remove it from the dispatch queue."),
            async () => {
                try {
                    await axios.put(`/api/inventory/transactions/${orderId}/status?status=REJECTED&remarks=${encodeURIComponent('Rejected by Store Keeper (Insufficient Stock)')}`);
                    fetchInventory();
                    showNotification('Order rejected and removed from queue', 'info');
                } catch (err: any) {
                    showNotification('Failed to reject order: ' + (err.response?.data || err.message), 'error');
                }
            }
        );
    };

    const handleOpenCcApproveModal = (order: any) => {
        setCcSelectedOrder(order);
        setCcApproveQty(String(order.quantity));
        setCcApproveOpen(true);
    };

    const handleConfirmCcApprove = async () => {
        if (!ccSelectedOrder || !ccApproveQty || !user) return;
        try {
            const remarksParam = ccRemarks ? `&remarks=${encodeURIComponent(ccRemarks)}` : '';
            // Change status to PENDING but update issuedTo so the Manager now sees it
            const issuedToParam = `&issuedTo=${encodeURIComponent((user.fullName || user.username || 'Chief Clerk') + ' (Chief Clerk)')}`;
            await axios.put(`/api/inventory/transactions/${ccSelectedOrder.id}/status?status=PENDING&quantity=${ccApproveQty}${remarksParam}${issuedToParam}`);
            setCcApproveOpen(false);
            fetchInventory();
            showNotification(t('Auto-Refill Request forwarded to Manager'), 'success');
        } catch (err: any) {
            showNotification(t('Failed to forward order') + ': ' + (err.response?.data || err.message), 'error');
        }
    };

    const handleCcReject = () => {
        if (!ccSelectedOrder) return;
        triggerConfirm(
            t("Reject Auto-Refill?"),
            t("Are you sure you want to REJECT this auto-refill request?"),
            async () => {
                try {
                    const remarksParam = ccRemarks ? `&remarks=${encodeURIComponent(ccRemarks)}` : '';
                    await axios.put(`/api/inventory/transactions/${ccSelectedOrder.id}/status?status=REJECTED${remarksParam}`);
                    setCcApproveOpen(false);
                    fetchInventory();
                    showNotification(t('Auto-Refill Request Rejected'), 'success');
                } catch (err: any) {
                    showNotification(t('Failed to reject order') + ': ' + (err.response?.data || err.message), 'error');
                }
            }
        );
    };

    const handleTransaction = async () => {
        // Validation: Prevent issuing below buffer level
        if (modalType === 'ISSUE') {
            const item = items.find(i => i.id === selectedItem);
            if (item) {
                const requestQty = Number(qty) || 0;
                const projectedQty = item.currentQuantity - requestQty;

                // Use minimumLevel if defined, otherwise fallback to bufferLevel or 0
                const minLevel = item.minimumLevel || 0;

                if (projectedQty < minLevel) {
                    showNotification(t('Cannot issue stock! Remaining quantity') + ` (${projectedQty} ${item.unit}) ` + t('would fall below the mandatory minimum level of') + ` ${minLevel} ${item.unit}.`, 'error');
                    return;
                }
            }
        }

        try {
            let finalIssuedTo = undefined;
            if (modalType === 'RESTOCK_REQUEST') {
                const uName = user.fullName || 'User';
                const roleLabel = user.role === 'STORE_KEEPER'
                    ? 'Store Keeper'
                    : user.role === 'CHIEF_CLERK'
                        ? 'Chief Clerk'
                        : 'User';
                const roleSuffix = uName.includes(`(${roleLabel})`) ? '' : ` (${roleLabel})`;
                finalIssuedTo = issuedTo ? `${uName}${roleSuffix} - ${issuedTo}` : `${uName}${roleSuffix}`;
            } else if (modalType === 'ISSUE') {
                finalIssuedTo = issuedTo;
            }

            await axios.post('/api/inventory/transaction', {
                itemId: selectedItem,
                quantity: Number(qty) || 0,
                type: modalType,
                tenantId: tenantId,
                issuedTo: finalIssuedTo,
                // Add Division / Field Info (Joined as comma-separated string)
                divisionId: selectedDivisions.length > 0 ? selectedDivisions.join(',') : undefined,
                divisionName: selectedDivisions.length > 0 ? selectedDivisions.map(id => divisions.find(d => d.divisionId === id)?.name).join(', ') : undefined,
                fieldId: selectedFields.length > 0 ? selectedFields.join(',') : undefined,
                fieldName: selectedFields.length > 0 ? selectedFields.map(id => fields.find(f => f.fieldId === id)?.name).join(', ') : undefined
            });

            setOpenModal(false);
            setQty('');
            setIssuedTo('');
            setSelectedDivisions([]);
            setSelectedFields([]);
            fetchInventory();
            showNotification(modalType === 'RESTOCK_REQUEST' ? t("Request sent to manager") : t("Transaction Successful"), 'success');
        } catch (err: any) {
            showNotification(t("Transaction Failed") + ": " + (err.response?.data || err.message), 'error');
        }
    };

    const handleSaveItem = async () => {
        try {
            if (isEditing && editId) {
                // Update Item
                await axios.put(`/api/inventory/${editId}`, {
                    ...newItem,
                    pricePerUnit: Number(newItem.pricePerUnit) || 0,
                    tenantId
                });
                showNotification(t("Item Updated Successfully"), 'success');
            } else {
                // Create Item
                await axios.post('/api/inventory', {
                    ...newItem,
                    currentQuantity: Number(newItem.currentQuantity) || 0,
                    pricePerUnit: Number(newItem.pricePerUnit) || 0,
                    tenantId
                });
                showNotification(t("Item Created Successfully"), 'success');
            }
            setNewItemOpen(false);
            fetchInventory();
            resetForm();
        } catch (err) {
            showNotification(isEditing ? t("Failed to update item") : t("Failed to create item"), 'error');
        }
    };

    const resetForm = () => {
        setNewItem({ name: '', category: 'FERTILIZER', unit: 'kg', currentQuantity: '' as any, bufferLevel: 0, minimumLevel: 0, pricePerUnit: '' as any });
        setIsEditing(false);
        setEditId(null);
    };

    const lowStockItems = items.filter(i => i.currentQuantity < i.bufferLevel);

    return (
        <Box sx={{ px: { xs: 1.5, md: 3 }, py: { xs: 2, md: 3 }, height: '100%', overflowY: 'auto', position: 'relative' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h5" fontWeight="800" color="primary" sx={{ fontSize: { xs: '1.25rem', md: '2rem' } }}>
                    {currentTab === 0 ? t("Overview") : currentTab === 1 ? t("Inventory") : t("Approvals")}
                </Typography>

                {currentTab === 1 && user.role === 'CHIEF_CLERK' && (
                    <Box>
                        <Button
                            startIcon={<AddIcon />}
                            variant="contained"
                            sx={{ mr: 2, bgcolor: '#424242' }}
                            onClick={() => { resetForm(); setNewItemOpen(true); }}
                        >
                            {t('New Item')}
                        </Button>
                    </Box>
                )}
            </Box>
            <Typography variant="body2" color="text.secondary" mb={3} sx={{ fontSize: { xs: '0.85rem', md: '1rem' } }}>
                {currentTab === 0 ? t("Stock alerts and internal notifications.") :
                    currentTab === 1 ? t("Manage materials and issue stock.") :
                        t("Review and dispatch officer requests.")}
            </Typography>

            {/* Stop Pilferage / Low Stock Alerts -> DASHBOARD TAB */}
            {currentTab === 0 && (
                <Box>
                    <Grid container spacing={2} mb={4}>
                        {/* PENDING DISPATCHES TILE */}
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Card onClick={() => navigate('/dashboard/store/approvals')} sx={{ height: '100%', borderRadius: 4, cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 20px rgba(0,0,0,0.1)' }, bgcolor: approvedOrders.length > 0 ? '#fffafa' : '#ffffff', border: approvedOrders.length > 0 ? '1.5px solid #ffcdd2' : '1px solid #edf2f7' }}>
                                <CardContent sx={{ p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', height: '100%' }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Box sx={{ width: { xs: 36, sm: 48 }, height: { xs: 36, sm: 48 }, borderRadius: 2.5, bgcolor: approvedOrders.length > 0 ? '#e53935' : '#1976d2', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                                            <LocalShippingIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                                        </Box>
                                        <IconButton size="small" sx={{ display: { xs: 'none', sm: 'flex' } }}><ArrowForwardIosIcon sx={{ fontSize: 12, color: '#94a3b8' }} /></IconButton>
                                    </Box>
                                    <Box mt={{ xs: 2, sm: 3 }}>
                                        <Typography variant="h4" fontWeight="800" sx={{ color: approvedOrders.length > 0 ? '#c62828' : '#2d3748', fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                                            {approvedOrders.length}
                                        </Typography>
                                        <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase', mt: 0.5, display: 'block', letterSpacing: 0.5, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                                            {t('Pending Orders')}
                                        </Typography>
                                        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5, color: approvedOrders.length > 0 ? '#d32f2f' : '#718096' }}>
                                            {approvedOrders.length > 0 ? <WarningAmberIcon sx={{ fontSize: 14 }}/> : <CheckCircleOutlineIcon sx={{ fontSize: 14 }}/>}
                                            <Typography variant="caption" fontWeight="600">{approvedOrders.length > 0 ? t('Action Reqd') : t('No Action')}</Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
 
                        {/* CRITICAL STOCK TILE */}
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Card onClick={() => navigate('/dashboard/store/inventory')} sx={{ height: '100%', borderRadius: 4, cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 20px rgba(0,0,0,0.1)' }, bgcolor: lowStockItems.length > 0 ? '#fffdf5' : '#ffffff', border: lowStockItems.length > 0 ? '1.5px solid #ffe082' : '1px solid #edf2f7' }}>
                                <CardContent sx={{ p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', height: '100%' }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Box sx={{ width: { xs: 36, sm: 48 }, height: { xs: 36, sm: 48 }, borderRadius: 2.5, bgcolor: lowStockItems.length > 0 ? '#f57c00' : '#388e3c', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                                            <WarningIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                                        </Box>
                                        <IconButton size="small" sx={{ display: { xs: 'none', sm: 'flex' } }}><ArrowForwardIosIcon sx={{ fontSize: 12, color: '#94a3b8' }} /></IconButton>
                                    </Box>
                                    <Box mt={{ xs: 2, sm: 3 }}>
                                        <Typography variant="h4" fontWeight="800" sx={{ color: lowStockItems.length > 0 ? '#e65100' : '#2e7d32', fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                                            {lowStockItems.length}
                                        </Typography>
                                        <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase', mt: 0.5, display: 'block', letterSpacing: 0.5, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                                            {t('Critical Alerts')}
                                        </Typography>
                                        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5, color: lowStockItems.length > 0 ? '#f57c00' : '#718096' }}>
                                            {lowStockItems.length > 0 ? <WarningAmberIcon sx={{ fontSize: 14 }}/> : <CheckCircleOutlineIcon sx={{ fontSize: 14 }}/>}
                                            <Typography variant="caption" fontWeight="600">{lowStockItems.length > 0 ? t('Restock Reqd') : t('Stock Safe')}</Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
 
                        {/* TOTAL INVENTORY VALUE TILE */}
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Card onClick={() => navigate('/dashboard/store/inventory')} sx={{ height: '100%', borderRadius: 4, cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 20px rgba(0,0,0,0.1)' }, bgcolor: '#f1f8e9', border: '1.5px solid #c5e1a5' }}>
                                <CardContent sx={{ p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', height: '100%' }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Box sx={{ width: { xs: 36, sm: 48 }, height: { xs: 36, sm: 48 }, borderRadius: 2.5, bgcolor: '#2e7d32', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                                            <AttachMoneyIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                                        </Box>
                                        <IconButton size="small" sx={{ display: { xs: 'none', sm: 'flex' } }}><ArrowForwardIosIcon sx={{ fontSize: 12, color: '#94a3b8' }} /></IconButton>
                                    </Box>
                                    <Box mt={{ xs: 2, sm: 3 }}>
                                        <Typography variant="h4" fontWeight="800" sx={{ color: '#1b5e20', fontSize: { xs: '1.2rem', sm: '2.125rem' } }}>
                                            {items.reduce((s, i) => s + (i.currentQuantity * (i.pricePerUnit || 0)), 0).toLocaleString('en-LK', { maximumFractionDigits: 0 })}
                                        </Typography>
                                        <Typography variant="caption" fontWeight="700" color="#2e7d32" sx={{ textTransform: 'uppercase', mt: 0.5, display: 'block', letterSpacing: 0.5, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                                            {t('Stock Value (LKR)')}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: '#388e3c', mt: 1, fontWeight: 600 }}>
                                            {t('Across')} {items.length} {t('items')}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
 
                        {/* UNREAD MESSAGES TILE */}
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Card onClick={() => navigate('/dashboard/correspondence')} sx={{ height: '100%', borderRadius: 4, cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 20px rgba(0,0,0,0.1)' }, border: '1px solid #edf2f7', bgcolor: '#f0f9ff' }}>
                                <CardContent sx={{ p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', height: '100%' }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Box sx={{ width: { xs: 36, sm: 48 }, height: { xs: 36, sm: 48 }, borderRadius: 2.5, bgcolor: '#0284c7', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                                            <ChatIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                                        </Box>
                                        <IconButton size="small" sx={{ display: { xs: 'none', sm: 'flex' } }}><ArrowForwardIosIcon sx={{ fontSize: 12, color: '#94a3b8' }} /></IconButton>
                                    </Box>
                                    <Box mt={{ xs: 2, sm: 3 }}>
                                        <Typography variant="h4" fontWeight="800" sx={{ color: '#0369a1', fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                                            {unreadMessages}
                                        </Typography>
                                        <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase', mt: 0.5, display: 'block', letterSpacing: 0.5, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                                            {t('Messages')}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: unreadMessages > 0 ? '#0284c7' : '#718096', mt: 1, fontWeight: 600 }}>
                                            {unreadMessages > 0 ? t('Review chats') : t('No new mail')}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {lowStockItems.length > 0 ? (
                        <Card sx={{ mb: 4, borderRadius: 4, borderLeft: '6px solid #d32f2f', boxShadow: '0 4px 12px rgba(211, 47, 47, 0.15)', bgcolor: '#fff5f5' }}>
                            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                                <Box display="flex" alignItems="center" mb={2}>
                                    <WarningIcon color="error" sx={{ mr: 1, fontSize: 24 }} />
                                    <Typography variant="subtitle1" color="error" fontWeight="800">
                                        {t('ACTION REQUIRED: LOW STOCK')}
                                    </Typography>
                                </Box>
                                <Box display="flex" flexDirection="column" gap={1.5}>
                                    {lowStockItems.map(item => (
                                        <Box key={item.id} sx={{ bgcolor: 'white', p: 2, borderRadius: 3, border: '1px solid #fee2e2', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                                <Typography variant="subtitle2" fontWeight="700" sx={{ color: '#1e293b' }}>{item.name}</Typography>
                                                <Typography variant="caption" fontWeight="800" sx={{ color: '#ef4444' }}>
                                                    {item.currentQuantity} / {item.bufferLevel} {item.unit}
                                                </Typography>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={Math.min((item.currentQuantity / item.bufferLevel) * 100, 100)}
                                                sx={{ 
                                                    height: 8, 
                                                    borderRadius: 4, 
                                                    bgcolor: '#fee2e2',
                                                    '& .MuiLinearProgress-bar': { bgcolor: '#ef4444', borderRadius: 4 }
                                                }}
                                            />
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontWeight: 500 }}>
                                                {item.currentQuantity <= item.minimumLevel ? t('Below Critical Minimum') : t('Below Buffer Level')}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                            </CardContent>
                        </Card>
                    ) : (
                        <Alert severity="success" sx={{ mb: 4, borderRadius: 3, fontWeight: 600 }}>
                            {t('Inventory healthy. No critical restock alerts.')}
                        </Alert>
                    )}
                </Box>
            )}

            {currentTab === 2 && (
                <Grid container spacing={3} mb={4}>

                    {/* General Stock mini table */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Card sx={{ borderTop: '4px solid #1976d2', height: '100%' }}>
                            <CardContent>
                                <Typography variant="h6" color="primary" fontWeight="bold" mb={2}>
                                    {t('General Stock Overview')}
                                </Typography>
                                <TableContainer sx={{ maxHeight: 400 }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell><strong>Item</strong></TableCell>
                                                <TableCell><strong>Unit</strong></TableCell>
                                                <TableCell align="right"><strong>Qty</strong></TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {items.map(item => (
                                                <TableRow key={item.id}>
                                                    <TableCell>{item.name}</TableCell>
                                                    <TableCell>{item.unit}</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{item.currentQuantity}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Pending Approvals Table */}
                    <Grid size={{ xs: 12, md: 8 }}>
                        {approvedOrders.length > 0 ? (
                            <Card sx={{ borderLeft: '6px solid #2e7d32', bgcolor: '#f1f8e9', height: '100%' }}>
                                <CardContent>
                                    <Box display="flex" alignItems="center" mb={2}>
                                        <InventoryIcon color="success" sx={{ mr: 1, fontSize: 30 }} />
                                        <Typography variant="h6" color="success" fontWeight="bold">
                                            {t('Approved Field Orders (Ready for Dispatch)')}
                                        </Typography>
                                    </Box>
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell><strong>Item</strong></TableCell>
                                                    <TableCell><strong>Requested</strong></TableCell>
                                                    <TableCell align="right"><strong>Stock Available</strong></TableCell>
                                                    <TableCell><strong>Division</strong></TableCell>
                                                    <TableCell><strong>Requested By</strong></TableCell>
                                                    <TableCell><strong>Manager Remarks</strong></TableCell>
                                                    <TableCell align="center"><strong>Action</strong></TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {approvedOrders.map((order) => {
                                                    const item = items.find(i => i.id === order.itemId);
                                                    const isShortfall = item && item.currentQuantity < order.quantity;
                                                    return (
                                                        <TableRow key={order.id} sx={isShortfall ? { bgcolor: '#fff5f5' } : {}}>
                                                            <TableCell>{order.itemName}</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', color: isShortfall ? 'error.main' : 'inherit' }}>
                                                                {order.quantity}
                                                                {isShortfall && (
                                                                    <Chip label={t("Shortfall")} size="small" color="error" sx={{ ml: 1, height: 18, fontSize: '10px' }} />
                                                                )}
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                                                <Typography variant="body2" sx={{ color: isShortfall ? 'error.main' : 'success.main', fontWeight: 'bold' }}>
                                                                    {item ? `${item.currentQuantity} ${item.unit}` : 'N/A'}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell>{order.divisionName || '-'}</TableCell>
                                                            <TableCell>{order.issuedTo?.split(' - ')[0] || '-'}</TableCell>
                                                            <TableCell>{order.managerRemarks || '-'}</TableCell>
                                                            <TableCell align="center">
                                                                <Box display="flex" gap={1} justifyContent="center">
                                                                    <Button
                                                                        variant="contained"
                                                                        color="success"
                                                                        size="small"
                                                                        disabled={!!isShortfall}
                                                                        onClick={() => handleIssueOrder(order.id)}
                                                                    >
                                                                        {t('Issue Stock')}
                                                                    </Button>
                                                                    <Button
                                                                        variant="outlined"
                                                                        color="error"
                                                                        size="small"
                                                                        onClick={() => handleRejectOrder(order.id)}
                                                                    >
                                                                        {t('Reject')}
                                                                    </Button>
                                                                </Box>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </CardContent>
                            </Card>
                        ) : (
                            <Alert severity="info" sx={{ height: '100%' }}>
                                {t('There are no pending manager approvals waiting to be dispatched.')}
                            </Alert>
                        )}
                    </Grid>
                </Grid>
            )}

            {/* Full Inventory Table -> INVENTORY TAB */}
            {currentTab === 1 && (
                <>
                    {user.role === 'CHIEF_CLERK' && (
                        <Grid container spacing={3} mb={4}>
                            <Grid size={{ xs: 12 }}>
                                {chiefClerkPending.length > 0 ? (
                                    <Card sx={{ borderLeft: '6px solid #1976d2', bgcolor: '#e3f2fd', height: '100%' }}>
                                        <CardContent>
                                            <Box display="flex" alignItems="center" mb={2}>
                                                <InventoryIcon color="primary" sx={{ mr: 1, fontSize: 30 }} />
                                                <Typography variant="h6" color="primary" fontWeight="bold">
                                                    {t('System Refill Review (Chief Clerk)')}
                                                </Typography>
                                            </Box>
                                            <Typography variant="body2" color="text.secondary" mb={2}>
                                                {t('The following low-stock auto-refill suggestions require Chief Clerk review before being sent to the Manager.')}
                                            </Typography>
                                            <TableContainer>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell><strong>Item</strong></TableCell>
                                                            <TableCell><strong>Quantity</strong></TableCell>
                                                            <TableCell><strong>Issued To / Note</strong></TableCell>
                                                            <TableCell align="center"><strong>Action</strong></TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {chiefClerkPending.map((order) => (
                                                            <TableRow key={order.id}>
                                                                <TableCell>{order.itemName}</TableCell>
                                                                <TableCell sx={{ fontWeight: 'bold' }}>{order.quantity}</TableCell>
                                                                <TableCell>{order.issuedTo || '-'}</TableCell>
                                                                <TableCell align="center">
                                                                    <Button
                                                                        variant="contained"
                                                                        color="primary"
                                                                        size="small"
                                                                        onClick={() => handleOpenCcApproveModal(order)}
                                                                    >
                                                                        {t('Request Refill')}
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <Alert severity="info">
                                        {t('No pending auto-refill requests requiring Chief Clerk approval at this time.')}
                                    </Alert>
                                )}
                            </Grid>
                        </Grid>
                    )}

                    <Card>
                        <CardContent>
                            <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" mb={2}>
                                <Box display="flex" alignItems="center">
                                    <InventoryIcon color="action" sx={{ mr: 1 }} />
                                    <Typography variant="h6">{t('Current Inventory')}</Typography>
                                </Box>
                                <TextField
                                    placeholder={t("Search...")}
                                    size="small"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                                    }}
                                    sx={{ width: { xs: '100%', sm: 300 }, mt: { xs: 1, sm: 0 }, bgcolor: 'white' }}
                                />
                            </Box>

                            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                            <TableContainer>
                                <Table sx={{ minWidth: 650 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: 'inherit' }, px: { xs: 0.8, sm: 2 } }}>Item Name</TableCell>
                                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: 'inherit' }, px: { xs: 0.8, sm: 2 } }}>Category</TableCell>
                                        <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: 'inherit' }, px: { xs: 0.8, sm: 2 } }}>Available Stock</TableCell>
                                        <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: 'inherit' }, px: { xs: 0.8, sm: 2 } }}>Total Value (Rs)</TableCell>
                                        <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: 'inherit' }, px: { xs: 0.8, sm: 2 } }}>Buffer Level</TableCell>
                                        <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: 'inherit' }, px: { xs: 0.8, sm: 2 } }}>Minimum Level</TableCell>
                                        <TableCell align="center" sx={{ fontSize: { xs: '0.75rem', sm: 'inherit' }, px: { xs: 0.8, sm: 2 } }}>Status</TableCell>
                                        <TableCell align="center" sx={{ fontSize: { xs: '0.75rem', sm: 'inherit' }, px: { xs: 0.8, sm: 2 } }}>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
                                                <Box display="flex" flexDirection="column" alignItems="center">
                                                    <SpaIcon
                                                        sx={{
                                                            fontSize: 60,
                                                            color: '#2e7d32',
                                                            animation: 'pulse 1.5s infinite ease-in-out',
                                                            '@keyframes pulse': {
                                                                '0%': { transform: 'scale(1)', opacity: 0.7 },
                                                                '50%': { transform: 'scale(1.2)', opacity: 1 },
                                                                '100%': { transform: 'scale(1)', opacity: 0.7 }
                                                            }
                                                        }}
                                                    />
                                                    <Typography variant="h6" color="primary" mt={2} fontWeight="bold">
                                                        Loading Plantation Inventory...
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Fetching fertilizers, tools, and harvest data.
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ) : items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())).map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell sx={{ fontWeight: 'bold', fontSize: { xs: '0.8rem', sm: 'inherit' }, px: { xs: 0.8, sm: 2 } }}>{item.name}</TableCell>
                                            <TableCell sx={{ fontSize: { xs: '0.75rem', sm: 'inherit' }, px: { xs: 0.8, sm: 2 } }}><Chip label={item.category} size="small" sx={{ fontSize: { xs: '0.7rem', sm: '0.8125rem' }, height: { xs: 20, sm: 24 } }} /></TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: { xs: '0.85rem', sm: '1.1rem' }, px: { xs: 0.8, sm: 2 } }}>
                                                {item.currentQuantity} {item.unit}
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: 'inherit' }, px: { xs: 0.8, sm: 2 } }}>
                                                {(item.currentQuantity * (item.pricePerUnit || 0)).toLocaleString('en-LK', { maximumFractionDigits: 0 })}
                                            </TableCell>
                                            <TableCell align="right" sx={{ color: 'text.secondary', fontSize: { xs: '0.75rem', sm: 'inherit' }, px: { xs: 0.8, sm: 2 } }}>
                                                {item.bufferLevel} {item.unit}
                                            </TableCell>
                                            <TableCell align="right" sx={{ color: 'error.main', fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: 'inherit' }, px: { xs: 0.8, sm: 2 } }}>
                                                {item.minimumLevel || 0} {item.unit}
                                            </TableCell>
                                            <TableCell align="center">
                                                {item.currentQuantity < item.bufferLevel ? (
                                                    <Chip label="LOW STOCK" color="error" size="small" />
                                                ) : (
                                                    <Chip label="Good" color="success" size="small" />
                                                )}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Button
                                                    variant="outlined"
                                                    color="primary"
                                                    size="small"
                                                    onClick={() => handleRestockRequest(item)}
                                                >
                                                    Request Refill
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {!loading && items.length === 0 && !error && (
                                        <TableRow>
                                            <TableCell colSpan={9} align="center">No inventory items found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </>
            )}

            {/* Transaction Modal */}
            <Dialog 
                open={openModal} 
                onClose={() => setOpenModal(false)} 
                maxWidth="sm" 
                fullWidth
                PaperProps={{ sx: { borderRadius: 4, m: { xs: 2, sm: 'auto' } } }}
            >
                <DialogTitle sx={{ fontWeight: 800, mt: 1, color: '#1a3352' }}>
                    {modalType === 'RECEIPT' ? 'Receive New Stock' :
                        modalType === 'ISSUE' ? 'Issue Stock to Field' :
                            'Request Restock'}
                </DialogTitle>
                <DialogContent sx={{ pt: 2, px: { xs: 2.5, sm: 3 } }}>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Select Item</InputLabel>
                        <Select value={selectedItem} label="Select Item" onChange={(e) => setSelectedItem(e.target.value)}>
                            {items.map(i => (
                                <MenuItem key={i.id} value={i.id}>{i.name} ({i.currentQuantity} {i.unit})</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label={modalType === 'RESTOCK_REQUEST' ? "Quantity Needed" : "Quantity"}
                        type="number"
                        margin="normal"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                    />

                    {modalType === 'ISSUE' && (
                        <>
                            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>Select Issued Divisions & Fields</Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 300, overflowY: 'auto', border: '1px solid #e0e0e0', p: 1, borderRadius: 1 }}>
                                {divisions.map((d: any) => {
                                    const isDivisionSelected = selectedDivisions.includes(d.divisionId);
                                    const divisionFields = fields.filter((f: any) => f.divisionId === d.divisionId);

                                    return (
                                        <Box key={d.divisionId} sx={{ display: 'flex', flexDirection: 'column' }}>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={isDivisionSelected}
                                                        onChange={(e) => {
                                                            let newSelectedDivisions;
                                                            let newSelectedFields = [...selectedFields];

                                                            if (e.target.checked) {
                                                                newSelectedDivisions = [...selectedDivisions, d.divisionId];
                                                            } else {
                                                                newSelectedDivisions = selectedDivisions.filter(id => id !== d.divisionId);
                                                                // When a division is unchecked, remove its fields from selectedFields
                                                                const fieldsToRemove = fields.filter(f => f.divisionId === d.divisionId).map(f => f.fieldId);
                                                                newSelectedFields = selectedFields.filter(fieldId => !fieldsToRemove.includes(fieldId));
                                                            }

                                                            setSelectedDivisions(newSelectedDivisions);
                                                            setSelectedFields(newSelectedFields);

                                                            if (newSelectedDivisions.length > 0) {
                                                                const ids = newSelectedDivisions.join(',');
                                                                axios.get(`/api/fields?divisionIds=${ids}`).then(res => setFields(res.data)).catch(() => setFields([]));
                                                                axios.get(`/api/tenants/${tenantId}/field-officers?divisionIds=${ids}`).then(res => {
                                                                    setOfficers(res.data);
                                                                    setIssuedTo(res.data.map((u: any) => u.fullName).join(', '));
                                                                }).catch(() => {
                                                                    setOfficers([]);
                                                                    setIssuedTo('');
                                                                });
                                                            } else {
                                                                setFields([]);
                                                                setOfficers([]);
                                                                setIssuedTo('');
                                                            }
                                                        }}
                                                    />
                                                }
                                                label={d.name}
                                            />
                                            {isDivisionSelected && (
                                                <Box sx={{ ml: 4, display: 'flex', flexDirection: 'column', borderLeft: '2px solid #ccc', pl: 1 }}>
                                                    {divisionFields.length > 0 ? divisionFields.map((f: any) => (
                                                        <FormControlLabel
                                                            key={f.fieldId}
                                                            control={
                                                                <Checkbox
                                                                    checked={selectedFields.includes(f.fieldId)}
                                                                    onChange={(e) => {
                                                                        const newFields = e.target.checked
                                                                            ? [...selectedFields, f.fieldId]
                                                                            : selectedFields.filter(id => id !== f.fieldId);
                                                                        setSelectedFields(newFields);
                                                                    }}
                                                                    size="small"
                                                                />
                                                            }
                                                            label={f.name}
                                                        />
                                                    )) : (
                                                        <Typography variant="caption" color="text.secondary">Loading fields...</Typography>
                                                    )}
                                                </Box>
                                            )}
                                        </Box>
                                    );
                                })}
                            </Box>

                            {selectedFields.length > 0 && (
                                <TextField
                                    fullWidth
                                    margin="normal"
                                    label="Assigned Field Officer(s)"
                                    value={issuedTo}
                                    InputProps={{
                                        readOnly: true,
                                    }}
                                    helperText={issuedTo ? "Automatically assigned based on selected divisions" : "No Field Officer Found for these divisions"}
                                    disabled={!issuedTo}
                                />
                            )}
                        </>
                    )}

                    {(modalType === 'RESTOCK_REQUEST') && (
                        <TextField
                            fullWidth
                            label="Notes / Reason"
                            margin="normal"
                            value={issuedTo}
                            onChange={(e) => setIssuedTo(e.target.value)}
                        />
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
                    <Button onClick={() => setOpenModal(false)} sx={{ color: '#2e7d32', fontWeight: 600 }}>Cancel</Button>
                    <Button 
                        variant="contained" 
                        sx={{ 
                            borderRadius: 2.5, 
                            px: 3, 
                            fontWeight: 700, 
                            bgcolor: modalType === 'RECEIPT' ? '#2e7d32' : '#f57c00', // Premium orange/green
                            '&:hover': { bgcolor: modalType === 'RECEIPT' ? '#1b5e20' : '#e65100' }
                        }}
                        onClick={handleTransaction}
                    >
                        {modalType === 'RESTOCK_REQUEST' ? 'Send Request' : `Confirm ${modalType}`}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Create / Edit Item Modal */}
            <Dialog 
                open={newItemOpen} 
                onClose={() => setNewItemOpen(false)}
                fullWidth
                maxWidth="sm"
                PaperProps={{ sx: { borderRadius: 4, m: { xs: 2, sm: 'auto' } } }}
            >
                <DialogTitle sx={{ fontWeight: 'bold' }}>{isEditing ? "Edit Item Details" : "Add New Inventory Item"}</DialogTitle>
                <DialogContent sx={{ minWidth: { xs: 'auto', sm: 400 }, pt: 2 }}>
                    <TextField
                        fullWidth
                        label="Item Name"
                        margin="normal"
                        value={newItem.name}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Category</InputLabel>
                        <Select
                            value={newItem.category}
                            label="Category"
                            onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                        >
                            <MenuItem value="FERTILIZER">Fertilizer</MenuItem>
                            <MenuItem value="AGRO_CHEMICAL">Agro Chemical</MenuItem>
                            <MenuItem value="TOOL">Tool / Equipment</MenuItem>
                            <MenuItem value="SEED">Seeds / Plants</MenuItem>
                            <MenuItem value="OTHER">Other</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Unit</InputLabel>
                        <Select
                            value={newItem.unit}
                            label="Unit"
                            onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                        >
                            <MenuItem value="kg">Kilogram (kg)</MenuItem>
                            <MenuItem value="liters">Liters (L)</MenuItem>
                            <MenuItem value="units">Units</MenuItem>
                            <MenuItem value="pairs">Pairs</MenuItem>
                            <MenuItem value="packets">Packets</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Initial Quantity"
                        type="number"
                        margin="normal"
                        value={newItem.currentQuantity}
                        onChange={(e) => setNewItem({ ...newItem, currentQuantity: e.target.value })}
                        disabled={isEditing} // Prevent stock edit here
                    />
                    <TextField
                        fullWidth
                        label="Buffer Level (Reorder Point)"
                        type="number"
                        margin="normal"
                        value={newItem.bufferLevel}
                        onChange={(e) => setNewItem({ ...newItem, bufferLevel: Number(e.target.value) })}
                        helperText="Stock level to trigger restock alert (Manager Only)"
                        disabled
                    />
                    <TextField
                        fullWidth
                        label="Minimum Level (Blocking Point)"
                        type="number"
                        margin="normal"
                        value={newItem.minimumLevel}
                        onChange={(e) => setNewItem({ ...newItem, minimumLevel: Number(e.target.value) })}
                        helperText="Absolute minimum stock allowed (Manager Only)"
                        disabled
                    />
                    <TextField
                        fullWidth
                        label="Unit Price (Rs)"
                        type="number"
                        margin="normal"
                        value={newItem.pricePerUnit}
                        onChange={(e) => setNewItem({ ...newItem, pricePerUnit: e.target.value })}
                    />

                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setNewItemOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveItem}>{isEditing ? "Update Item" : "Create Item"}</Button>
                </DialogActions>
            </Dialog>

            {/* Issue Order Confirmation Dialog */}
            <Dialog 
                open={confirmIssueOpen} 
                onClose={() => setConfirmIssueOpen(false)}
                PaperProps={{ sx: { borderRadius: 3, m: { xs: 2, sm: 'auto' } } }}
            >
                <DialogTitle sx={{ fontWeight: 800 }}>Confirm Issuance</DialogTitle>
                <DialogContent>
                    <Typography>Are you sure you want to confirm issuance of stock to the Field Officer?</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmIssueOpen(false)}>Cancel</Button>
                    <Button onClick={confirmIssueOrder} color="success" variant="contained" autoFocus>
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>

            {/* CC Request Auto-Refill Dialog */}
            <Dialog 
                open={ccApproveOpen} 
                onClose={() => setCcApproveOpen(false)} 
                maxWidth="sm" 
                fullWidth
                PaperProps={{ sx: { borderRadius: 4, m: { xs: 2, sm: 'auto' } } }}
            >
                <DialogTitle sx={{ fontWeight: 800, mt: 1 }}>Request Auto-Refill</DialogTitle>
                <DialogContent sx={{ px: { xs: 2.5, sm: 3 } }}>
                    <Typography variant="body2" color="text.secondary" mb={3} mt={1}>
                        You are reviewing the system-generated auto-refill suggestion for <strong>{ccSelectedOrder?.itemName}</strong>.
                        You can adjust the required quantity or add internal comments before forwarding your request to the Manager.
                    </Typography>

                    <TextField
                        fullWidth
                        label="Requested Quantity"
                        type="number"
                        variant="outlined"
                        value={ccApproveQty}
                        onChange={(e) => setCcApproveQty(e.target.value)}
                        sx={{ mb: 2 }}
                        InputProps={{ style: { fontWeight: 'bold' } }}
                    />

                    <TextField
                        fullWidth
                        label="Remarks / Adjustments Note (Optional)"
                        multiline
                        rows={3}
                        variant="outlined"
                        value={ccRemarks}
                        onChange={(e) => setCcRemarks(e.target.value)}
                        placeholder="e.g. Authorized extra 5 bags for upcoming schedule..."
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <Button onClick={() => setCcApproveOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
                    <Box gap={1} display="flex">
                        <Button variant="contained" color="error" onClick={handleCcReject}>
                            Reject Refill
                        </Button>
                        <Button variant="contained" color="success" onClick={handleConfirmCcApprove}>
                            Forward to Manager
                        </Button>
                    </Box>
                </DialogActions>
            </Dialog>

            {/* Global Confirmation Dialog */}
            <Dialog 
                open={confirmDialog.open} 
                onClose={handleConfirmClose}
                PaperProps={{ sx: { borderRadius: 3, m: { xs: 2, sm: 'auto' } } }}
            >
                <DialogTitle sx={{ fontWeight: 800 }}>{confirmDialog.title}</DialogTitle>
                <DialogContent>
                    <Typography>{confirmDialog.message}</Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleConfirmClose} sx={{ color: 'text.secondary' }}>Cancel</Button>
                    <Button onClick={handleConfirmAction} variant="contained" color="error">
                        Confirm Action
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Notification Snackbar */}
            <Snackbar open={notification.open} autoHideDuration={6000} onClose={handleCloseNotification} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
                    {notification.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
