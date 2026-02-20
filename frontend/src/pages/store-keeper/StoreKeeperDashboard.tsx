import { Box, Grid, Typography, Card, CardContent, Button, Table, TableHead, TableRow, TableCell, TableBody, Chip, LinearProgress, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Select, MenuItem, InputLabel, FormControl, Alert, Snackbar, Checkbox, FormControlLabel, TableContainer } from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarningIcon from '@mui/icons-material/Warning';

import RemoveShoppingCartIcon from '@mui/icons-material/RemoveShoppingCart';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';

import AddAlertIcon from '@mui/icons-material/AddAlert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SpaIcon from '@mui/icons-material/Spa';
import { IconButton } from '@mui/material';
import { useState, useEffect } from 'react';
import { InputAdornment } from '@mui/material';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

export default function StoreKeeperDashboard() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [pendingItems, setPendingItems] = useState<Map<number, number>>(new Map());
    const [approvedOrders, setApprovedOrders] = useState<any[]>([]);

    // Tab Navigation via URL route
    const location = useLocation();
    let currentTab = 1; // Default to inventory
    if (location.pathname.includes('main')) currentTab = 0;
    else if (location.pathname.includes('approvals')) currentTab = 2;

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

    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    useEffect(() => {
        if (tenantId) {
            fetchInventory();
            // Fetch Divisions for dropdown
            axios.get(`/api/divisions?tenantId=${tenantId}`)
                .then(res => setDivisions(res.data))
                .catch(err => console.error("Failed to load divisions", err));
        }
    }, [tenantId]);

    const fetchInventory = async () => {
        try {
            // Connect to Gateway -> Inventory Service (Fetch Items and Transactions)
            const [itemsRes, transRes] = await Promise.all([
                axios.get(`/api/inventory?tenantId=${tenantId}`),
                axios.get(`/api/inventory/transactions?tenantId=${tenantId}`)
            ]);

            setItems(itemsRes.data);

            // Identify items with PENDING restock requests
            const pending = new Map<number, number>();
            transRes.data.forEach((t: any) => {
                if (t.type === 'RESTOCK_REQUEST' && t.status === 'PENDING') {
                    const current = pending.get(t.itemId) || 0;
                    pending.set(t.itemId, current + t.quantity);
                }
            });
            setPendingItems(pending);

            const approvedFoOrders = transRes.data.filter((t: any) =>
                t.type === 'FO_REQUISITION' && t.status === 'APPROVED'
            );
            setApprovedOrders(approvedFoOrders);

            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch inventory. Ensure Inventory Service is running.");
            setError("Could not load inventory data. Please check connection.");
            setLoading(false);
        }
    };

    const handleRestockRequest = (item: any) => {
        setSelectedItem(item.id);
        setModalType('RESTOCK_REQUEST');
        setOpenModal(true);
        setQty('');
        setIssuedTo('');
        setSelectedDivisions([]);
        setSelectedFields([]);
    };

    const handleIssueOrder = async (orderId: number) => {
        if (!window.confirm("Confirm issuance of stock to the Field Officer?")) return;
        try {
            await axios.put(`/api/inventory/transactions/${orderId}/status?status=ISSUED`);
            fetchInventory();
            showNotification('Stock Successfully Issued to Field Officer', 'success');
        } catch (err: any) {
            showNotification('Failed to issue order: ' + (err.response?.data || err.message), 'error');
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
            await axios.post('/api/inventory/transaction', {
                itemId: selectedItem,
                quantity: Number(qty) || 0,
                type: modalType,
                tenantId: tenantId,
                issuedTo: (modalType === 'ISSUE' || modalType === 'RESTOCK_REQUEST') ? issuedTo : undefined,
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

                {currentTab === 1 && (
                    <Box>
                        <Button
                            startIcon={<AddIcon />}
                            variant="contained"
                            sx={{ mr: 2, bgcolor: '#424242' }}
                            onClick={() => { resetForm(); setNewItemOpen(true); }}
                        >
                            New Item
                        </Button>

                        <Button
                            startIcon={<RemoveShoppingCartIcon />}
                            variant="contained"
                            color="warning"
                            onClick={() => { setModalType('ISSUE'); setOpenModal(true); setQty(''); setSelectedDivisions([]); setSelectedFields([]); }}
                        >
                            Issue Stock
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
                    {lowStockItems.length > 0 ? (
                        <Card sx={{ mb: 4, borderLeft: '6px solid #d32f2f', bgcolor: '#ffebee' }}>
                            <CardContent>
                                <Box display="flex" alignItems="center" mb={1}>
                                    <WarningIcon color="error" sx={{ mr: 1, fontSize: 30 }} />
                                    <Typography variant="h6" color="error" fontWeight="bold">
                                        CRITICAL STOCK ALERTS (Below Buffer Level)
                                    </Typography>
                                </Box>
                                <Grid container spacing={2}>
                                    {lowStockItems.map(item => (
                                        <Grid key={item.id} size={{ xs: 12, md: 4 }}>
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
                            No critical stock alerts or messages at this time. All inventory is well-stocked!
                        </Alert>
                    )}
                </Box>
            )}

            {/* Approved Field Officer Orders Ready for Collection -> PENDING APPROVALS TAB */}
            {currentTab === 2 && (
                <Box>
                    {approvedOrders.length > 0 ? (
                        <Card sx={{ mb: 4, borderLeft: '6px solid #2e7d32', bgcolor: '#f1f8e9' }}>
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
                                                <TableCell><strong>Quantity</strong></TableCell>
                                                <TableCell><strong>Division</strong></TableCell>
                                                <TableCell><strong>Requested By</strong></TableCell>
                                                <TableCell><strong>Manager Remarks</strong></TableCell>
                                                <TableCell align="center"><strong>Action</strong></TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {approvedOrders.map((order) => (
                                                <TableRow key={order.id}>
                                                    <TableCell>{order.itemName}</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>{order.quantity}</TableCell>
                                                    <TableCell>{order.divisionName || '-'}</TableCell>
                                                    <TableCell>{order.issuedTo?.split(' - ')[0] || '-'}</TableCell>
                                                    <TableCell>{order.managerRemarks || '-'}</TableCell>
                                                    <TableCell align="center">
                                                        <Button
                                                            variant="contained"
                                                            color="success"
                                                            size="small"
                                                            onClick={() => handleIssueOrder(order.id)}
                                                        >
                                                            Issue Stock
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
                        <Alert severity="info" sx={{ mb: 4 }}>
                            There are no pending manager approvals waiting to be dispatched.
                        </Alert>
                    )}
                </Box>
            )}

            {/* Full Inventory Table -> INVENTORY TAB */}
            {currentTab === 1 && (
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
                                    <TableCell align="center">Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
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
                                            {pendingItems.has(item.id) ? (
                                                <Chip
                                                    label={`Pending: ${pendingItems.get(item.id)} ${item.unit}`}
                                                    color="warning"
                                                    variant="outlined"
                                                    size="small"
                                                />
                                            ) : (
                                                <Button
                                                    variant="outlined"
                                                    color="warning"
                                                    size="small"
                                                    startIcon={<AddAlertIcon />}
                                                    onClick={() => handleRestockRequest(item)}
                                                >
                                                    Restock
                                                </Button>
                                            )}
                                            <Box display="inline-flex" ml={1}>
                                                <IconButton size="small" onClick={() => handleEditItem(item)} title="Edit Details">
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton size="small" onClick={() => handleDeleteItem(item.id)} color="error" title="Delete Item">
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!loading && items.length === 0 && !error && (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center">No inventory items found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
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

            {/* Notification Snackbar */}
            <Snackbar open={notification.open} autoHideDuration={6000} onClose={handleCloseNotification} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
                    {notification.message}
                </Alert>
            </Snackbar>
        </Box >
    );
}
