import { Box, Grid, Typography, Card, CardContent, Button, Table, TableHead, TableRow, TableCell, TableBody, Chip, LinearProgress, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Select, MenuItem, InputLabel, FormControl, Alert, Snackbar } from '@mui/material';
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

export default function StoreKeeperDashboard() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [pendingItems, setPendingItems] = useState<Map<number, number>>(new Map());

    // Transaction Modal
    const [openModal, setOpenModal] = useState(false);
    const [modalType, setModalType] = useState<'ISSUE' | 'RECEIPT' | 'RESTOCK_REQUEST'>('ISSUE');
    const [selectedItem, setSelectedItem] = useState('');
    const [qty, setQty] = useState<string | number>('');
    const [issuedTo, setIssuedTo] = useState('');
    const [search, setSearch] = useState('');

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
        fetchInventory();
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
    };

    const handleTransaction = async () => {
        try {
            await axios.post('/api/inventory/transaction', {
                itemId: selectedItem,
                quantity: Number(qty) || 0,
                type: modalType,
                tenantId: tenantId,
                issuedTo: (modalType === 'ISSUE' || modalType === 'RESTOCK_REQUEST') ? issuedTo : undefined
            });

            // Automated Low Stock Notification
            if (modalType === 'ISSUE') {
                const item = items.find(i => i.id === selectedItem);
                if (item) {
                    const newQty = item.currentQuantity - (Number(qty) || 0);
                    if (newQty < item.bufferLevel) {
                        showNotification(`Note: ${item.name} is below buffer level. System has auto-generated a refill request.`, 'warning');
                    }
                }
            }

            setOpenModal(false);
            setQty('');
            setIssuedTo('');
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
            pricePerUnit: item.pricePerUnit
        });
        setNewItemOpen(true);
    };

    const resetForm = () => {
        setNewItem({ name: '', category: 'FERTILIZER', unit: 'kg', currentQuantity: '' as any, bufferLevel: 0, pricePerUnit: '' as any });
        setIsEditing(false);
        setEditId(null);
    };

    const lowStockItems = items.filter(i => i.currentQuantity < i.bufferLevel);

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4" fontWeight="bold" color="primary">
                    Dashboard
                </Typography>
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
                        onClick={() => { setModalType('ISSUE'); setOpenModal(true); setQty(''); }}
                    >
                        Issue Stock
                    </Button>
                </Box>
            </Box>

            {/* Stop Pilferage / Low Stock Alerts */}
            {lowStockItems.length > 0 && (
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
                                <Grid key={item.id} xs={12} md={4}>
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
            )}

            {/* Full Inventory Table */}
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
                                <TableCell align="center">Status</TableCell>
                                <TableCell align="center">Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
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
                                    <TableCell colSpan={6} align="center">No inventory items found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Transaction Modal */}
            <Dialog open={openModal} onClose={() => setOpenModal(false)}>
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
                    {(modalType === 'ISSUE' || modalType === 'RESTOCK_REQUEST') && (
                        <TextField
                            fullWidth
                            label={modalType === 'RESTOCK_REQUEST' ? "Notes / Reason" : "Issued To (Person / Field)"}
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
