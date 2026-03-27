import { Box, Grid, Typography, Card, CardContent, Button, Table, TableHead, TableRow, TableCell, TableBody, Chip, LinearProgress, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Select, MenuItem, InputLabel, FormControl, Alert, Snackbar, Checkbox, FormControlLabel, TableContainer, Tooltip } from '@mui/material';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { InputAdornment } from '@mui/material';
import axios from 'axios';
import { IconButton } from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarningIcon from '@mui/icons-material/Warning';
import RemoveShoppingCartIcon from '@mui/icons-material/RemoveShoppingCart';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import AddAlertIcon from '@mui/icons-material/AddAlert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SpaIcon from '@mui/icons-material/Spa';
import ChatIcon from '@mui/icons-material/Chat';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useLocation, useNavigate } from 'react-router-dom';

const buildSocketUrl = (path: string) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${path}`;
};

export default function StoreKeeperDashboard() {
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
        try {
            await axios.put(`/api/inventory/transactions/${orderToIssue}/status?status=ISSUED`);
            fetchInventory();
            showNotification('Stock Successfully Issued to Field Officer', 'success');
            setConfirmIssueOpen(false);
        } catch (err: any) {
            showNotification('Failed to issue order: ' + (err.response?.data || err.message), 'error');
        }
    };

    const handleRejectOrder = async (orderId: number) => {
        if (!window.confirm("Are you sure you want to REJECT this field requisition? This will remove it from the dispatch queue.")) return;
        try {
            await axios.put(`/api/inventory/transactions/${orderId}/status?status=REJECTED&remarks=${encodeURIComponent('Rejected by Store Keeper (Insufficient Stock)')}`);
            fetchInventory();
            showNotification('Order rejected and removed from queue', 'info');
        } catch (err: any) {
            showNotification('Failed to reject order: ' + (err.response?.data || err.message), 'error');
        }
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
            showNotification('Auto-Refill Request forwarded to Manager', 'success');
        } catch (err: any) {
            showNotification('Failed to forward order: ' + (err.response?.data || err.message), 'error');
        }
    };

    const handleCcReject = async () => {
        if (!ccSelectedOrder) return;
        if (!window.confirm("Are you sure you want to REJECT this auto-refill request?")) return;
        try {
            const remarksParam = ccRemarks ? `&remarks=${encodeURIComponent(ccRemarks)}` : '';
            await axios.put(`/api/inventory/transactions/${ccSelectedOrder.id}/status?status=REJECTED${remarksParam}`);
            setCcApproveOpen(false);
            fetchInventory();
            showNotification('Auto-Refill Request Rejected', 'success');
        } catch (err: any) {
            showNotification('Failed to reject order: ' + (err.response?.data || err.message), 'error');
        }
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
                    showNotification(`Cannot issue stock! Remaining quantity (${projectedQty} ${item.unit}) would fall below the mandatory minimum level of ${minLevel} ${item.unit}.`, 'error');
                    return;
                }
            }
        }

        try {
            let finalIssuedTo = undefined;
            if (modalType === 'RESTOCK_REQUEST') {
                const uName = user.fullName || 'Chief Clerk';
                // Only add (Chief Clerk) if the name doesn't already somehow include it
                const roleSuffix = uName.includes('(Chief Clerk)') ? '' : ' (Chief Clerk)';
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
            showNotification("Transaction Successful", 'success');
        } catch (err: any) {
            showNotification("Transaction Failed: " + (err.response?.data || err.message), 'error');
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
                showNotification("Item Updated Successfully", 'success');
            } else {
                // Create Item
                await axios.post('/api/inventory', {
                    ...newItem,
                    currentQuantity: Number(newItem.currentQuantity) || 0,
                    pricePerUnit: Number(newItem.pricePerUnit) || 0,
                    tenantId
                });
                showNotification("Item Created Successfully", 'success');
            }
            setNewItemOpen(false);
            fetchInventory();
            resetForm();
        } catch (err) {
            showNotification(isEditing ? "Failed to update item" : "Failed to create item", 'error');
        }
    };

    const handleDeleteItem = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this item?")) return;
        try {
            await axios.delete(`/api/inventory/${id}`);
            fetchInventory();
            showNotification("Item Deleted", 'success');
        } catch (err) {
            showNotification("Failed to delete item", 'error');
        }
    };

    const handleEditItem = (item: any) => {
        setIsEditing(true);
        setEditId(item.id);
        setNewItem({
            name: item.name,
            category: item.category,
            unit: item.unit,
            currentQuantity: item.currentQuantity,
            bufferLevel: item.bufferLevel,
            minimumLevel: item.minimumLevel || 0,
            pricePerUnit: item.pricePerUnit
        });
        setNewItemOpen(true);
    };

    const resetForm = () => {
        setNewItem({ name: '', category: 'FERTILIZER', unit: 'kg', currentQuantity: '' as any, bufferLevel: 0, minimumLevel: 0, pricePerUnit: '' as any });
        setIsEditing(false);
        setEditId(null);
    };

    const lowStockItems = items.filter(i => i.currentQuantity < i.bufferLevel);

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h4" fontWeight="bold" color="primary">
                    {currentTab === 0 ? "Dashboard & Messages" : currentTab === 1 ? "Inventory Records" : "Pending Approvals"}
                </Typography>

                {currentTab === 1 && user.role === 'CHIEF_CLERK' && (
                    <Box>
                        <Button
                            startIcon={<AddIcon />}
                            variant="contained"
                            sx={{ mr: 2, bgcolor: '#424242' }}
                            onClick={() => { resetForm(); setNewItemOpen(true); }}
                        >
                            New Item
                        </Button>
                    </Box>
                )}
            </Box>
            <Typography variant="body1" color="text.secondary" mb={4}>
                {currentTab === 0 ? "View your critical stock alerts and internal messages." :
                    currentTab === 1 ? "Manage plantation materials, add new items, or issue stock manually." :
                        "Review and dispatch approved Field Officer requests."}
            </Typography>

            {/* Stop Pilferage / Low Stock Alerts -> DASHBOARD TAB */}
            {currentTab === 0 && (
                <Box>
                    <Grid container spacing={3} mb={5}>
                        {/* PENDING DISPATCHES TILE */}
                        <Grid item xs={12} md={3}>
                            <Card onClick={() => navigate('/dashboard/store/approvals')} sx={{ height: '100%', borderRadius: 4, cursor: 'pointer', transition: '0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }, bgcolor: approvedOrders.length > 0 ? '#fff5f5' : '#ffffff', border: approvedOrders.length > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0' }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                        <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: approvedOrders.length > 0 ? '#ef4444' : '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <LocalShippingIcon fontSize="medium" />
                                        </Box>
                                        <IconButton size="small"><ArrowForwardIosIcon sx={{ fontSize: 14, color: '#94a3b8' }} /></IconButton>
                                    </Box>
                                    <Box mt={3}>
                                        <Typography variant="h3" fontWeight="900" sx={{ color: approvedOrders.length > 0 ? '#b91c1c' : '#1e293b' }}>
                                            {approvedOrders.length}
                                        </Typography>
                                        <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase', mt: 0.5 }}>
                                            Pending Dispatches
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: approvedOrders.length > 0 ? '#dc2626' : '#64748b', mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            {approvedOrders.length > 0 ? <><WarningAmberIcon fontSize="small"/> Requires issue</> : <><CheckCircleOutlineIcon fontSize="small"/> All caught up</>}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* CRITICAL STOCK TILE */}
                        <Grid item xs={12} md={3}>
                            <Card onClick={() => navigate('/dashboard/store/inventory')} sx={{ height: '100%', borderRadius: 4, cursor: 'pointer', transition: '0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }, bgcolor: lowStockItems.length > 0 ? '#fffbeb' : '#ffffff', border: lowStockItems.length > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0' }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                        <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: lowStockItems.length > 0 ? '#f59e0b' : '#22c55e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <WarningIcon fontSize="medium" />
                                        </Box>
                                        <IconButton size="small"><ArrowForwardIosIcon sx={{ fontSize: 14, color: '#94a3b8' }} /></IconButton>
                                    </Box>
                                    <Box mt={3}>
                                        <Typography variant="h3" fontWeight="900" sx={{ color: lowStockItems.length > 0 ? '#b45309' : '#15803d' }}>
                                            {lowStockItems.length}
                                        </Typography>
                                        <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase', mt: 0.5 }}>
                                            Critical Stock Alerts
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: lowStockItems.length > 0 ? '#d97706' : '#64748b', mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            {lowStockItems.length > 0 ? <><WarningAmberIcon fontSize="small"/> Below buffer level</> : <><CheckCircleOutlineIcon fontSize="small"/> Stock healthy</>}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* TOTAL INVENTORY VALUE TILE */}
                        <Grid item xs={12} md={3}>
                            <Card onClick={() => navigate('/dashboard/store/inventory')} sx={{ height: '100%', borderRadius: 4, cursor: 'pointer', transition: '0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                        <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: '#16a34a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <AttachMoneyIcon fontSize="medium" />
                                        </Box>
                                        <IconButton size="small"><ArrowForwardIosIcon sx={{ fontSize: 14, color: '#94a3b8' }} /></IconButton>
                                    </Box>
                                    <Box mt={3}>
                                        <Typography variant="h4" fontWeight="900" sx={{ color: '#166534' }}>
                                            {items.reduce((s, i) => s + (i.currentQuantity * (i.pricePerUnit || 0)), 0).toLocaleString('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 })}
                                        </Typography>
                                        <Typography variant="subtitle2" fontWeight="700" color="#16a34a" sx={{ textTransform: 'uppercase', mt: 0.5 }}>
                                            Total Stock Value
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#15803d', mt: 1 }}>
                                            Across {items.length} materials
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* UNREAD MESSAGES TILE */}
                        <Grid item xs={12} md={3}>
                            <Card onClick={() => navigate('/dashboard/correspondence')} sx={{ height: '100%', borderRadius: 4, cursor: 'pointer', transition: '0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }, border: '1px solid #e2e8f0' }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                        <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: '#0ea5e9', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <ChatIcon fontSize="medium" />
                                        </Box>
                                        <IconButton size="small"><ArrowForwardIosIcon sx={{ fontSize: 14, color: '#94a3b8' }} /></IconButton>
                                    </Box>
                                    <Box mt={3}>
                                        <Typography variant="h3" fontWeight="900" sx={{ color: '#0369a1' }}>
                                            {unreadMessages}
                                        </Typography>
                                        <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase', mt: 0.5 }}>
                                            Unread Messages
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: unreadMessages > 0 ? '#0284c7' : '#64748b', mt: 1 }}>
                                            Check correspondence
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {lowStockItems.length > 0 ? (
                        <Card sx={{ mb: 4, borderLeft: '6px solid #d32f2f', bgcolor: '#ffebee' }}>
                            <CardContent>
                                <Box display="flex" alignItems="center" mb={1}>
                                    <WarningIcon color="error" sx={{ mr: 1, fontSize: 30 }} />
                                    <Typography variant="h6" color="error" fontWeight="bold">
                                        CRITICAL STOCK DETAILS
                                    </Typography>
                                </Box>
                                <Grid container spacing={2}>
                                    {lowStockItems.map(item => (
                                        <Grid key={item.id} item xs={12} md={4}>
                                            <Box bgcolor="white" p={2} borderRadius={1} border="1px solid #ffcdd2">
                                                <Typography variant="subtitle1" fontWeight="bold">{item.name}</Typography>
                                                <Typography variant="body2" color="error">
                                                    Current: {item.currentQuantity} {item.unit} (Buffer: {item.bufferLevel} {item.unit})
                                                </Typography>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={(item.currentQuantity / item.bufferLevel) * 100}
                                                    color="error"
                                                    sx={{ mt: 1 }}
                                                />
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>
                            </CardContent>
                        </Card>
                    ) : (
                        <Alert severity="success" sx={{ mb: 4 }}>
                            No critical stock details to review. All inventory is well-stocked!
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
                                    General Stock Overview
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
                                            Approved Field Orders (Ready for Dispatch)
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
                                                                    <Chip label="Shortfall" size="small" color="error" sx={{ ml: 1, height: 18, fontSize: '10px' }} />
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
                                                                        Issue Stock
                                                                    </Button>
                                                                    <Button
                                                                        variant="outlined"
                                                                        color="error"
                                                                        size="small"
                                                                        onClick={() => handleRejectOrder(order.id)}
                                                                    >
                                                                        Reject
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
                                There are no pending manager approvals waiting to be dispatched.
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
                                                    System Refill Review (Chief Clerk)
                                                </Typography>
                                            </Box>
                                            <Typography variant="body2" color="text.secondary" mb={2}>
                                                The following low-stock auto-refill suggestions require Chief Clerk review before being sent to the Manager.
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
                                                                        Request Refill
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
                                        No pending auto-refill requests requiring Chief Clerk approval at this time.
                                    </Alert>
                                )}
                            </Grid>
                        </Grid>
                    )}

                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                                <Box display="flex" alignItems="center">
                                    <InventoryIcon color="action" sx={{ mr: 1 }} />
                                    <Typography variant="h6">Current Inventory</Typography>
                                </Box>
                                <TextField
                                    placeholder="Search Items..."
                                    size="small"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                                    }}
                                    sx={{ width: 300, bgcolor: 'white' }}
                                />
                            </Box>

                            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Item Name</TableCell>
                                        <TableCell>Category</TableCell>
                                        <TableCell align="right">Available Stock</TableCell>
                                        <TableCell align="right">Total Value (Rs)</TableCell>
                                        <TableCell align="right">Buffer Level</TableCell>
                                        <TableCell align="right">Minimum Level</TableCell>
                                        <TableCell align="center">Status</TableCell>
                                        <TableCell align="center">Actions</TableCell>
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
                                            <TableCell sx={{ fontWeight: 'bold' }}>{item.name}</TableCell>
                                            <TableCell><Chip label={item.category} size="small" /></TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                                {item.currentQuantity} {item.unit}
                                            </TableCell>
                                            <TableCell align="right">
                                                {(item.currentQuantity * (item.pricePerUnit || 0)).toLocaleString('en-LK', { style: 'currency', currency: 'LKR' })}
                                            </TableCell>
                                            <TableCell align="right" sx={{ color: 'text.secondary' }}>
                                                {item.bufferLevel} {item.unit}
                                            </TableCell>
                                            <TableCell align="right" sx={{ color: 'error.main', fontWeight: 'bold' }}>
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
                                                    onClick={() => {
                                                        setSelectedItem(item.id);
                                                        setModalType('RESTOCK_REQUEST');
                                                        setQty('');
                                                        setIssuedTo('');
                                                        setSelectedDivisions([]);
                                                        setSelectedFields([]);
                                                        setOpenModal(true);
                                                    }}
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
                        </CardContent>
                    </Card>
                </>
            )}

            {/* Transaction Modal */}
            <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {modalType === 'RECEIPT' ? 'Receive New Stock' :
                        modalType === 'ISSUE' ? 'Issue Stock to Field' :
                            'Request Restock'}
                </DialogTitle>
                <DialogContent sx={{ minWidth: 400, pt: 2 }}>
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
                <DialogActions>
                    <Button onClick={() => setOpenModal(false)}>Cancel</Button>
                    <Button variant="contained" color={modalType === 'RECEIPT' ? "success" : "warning"} onClick={handleTransaction}>
                        {modalType === 'RESTOCK_REQUEST' ? 'Send Request' : `Confirm ${modalType}`}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Create / Edit Item Modal */}
            <Dialog open={newItemOpen} onClose={() => setNewItemOpen(false)}>
                <DialogTitle>{isEditing ? "Edit Item Details" : "Add New Inventory Item"}</DialogTitle>
                <DialogContent sx={{ minWidth: 400, pt: 2 }}>
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
            <Dialog open={confirmIssueOpen} onClose={() => setConfirmIssueOpen(false)}>
                <DialogTitle>Confirm Issuance</DialogTitle>
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
            <Dialog open={ccApproveOpen} onClose={() => setCcApproveOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Request Auto-Refill</DialogTitle>
                <DialogContent>
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

            {/* Notification Snackbar */}
            <Snackbar open={notification.open} autoHideDuration={6000} onClose={handleCloseNotification} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
                    {notification.message}
                </Alert>
            </Snackbar>
        </Box >
    );
}
