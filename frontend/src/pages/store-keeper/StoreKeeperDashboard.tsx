import { Box, Grid, Typography, Card, CardContent, Button, Table, TableHead, TableRow, TableCell, TableBody, Chip, LinearProgress, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Select, MenuItem, InputLabel, FormControl, Alert } from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarningIcon from '@mui/icons-material/Warning';

import RemoveShoppingCartIcon from '@mui/icons-material/RemoveShoppingCart';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';

import AddAlertIcon from '@mui/icons-material/AddAlert';
import { useState, useEffect } from 'react';
import { InputAdornment } from '@mui/material';
import axios from 'axios';

export default function StoreKeeperDashboard() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [pendingItems, setPendingItems] = useState<Set<number>>(new Set());

    // Transaction Modal
    const [openModal, setOpenModal] = useState(false);
    const [modalType, setModalType] = useState<'ISSUE' | 'RECEIPT' | 'RESTOCK_REQUEST'>('ISSUE');
    const [selectedItem, setSelectedItem] = useState('');
    const [qty, setQty] = useState<string | number>('');
    const [issuedTo, setIssuedTo] = useState('');
    const [search, setSearch] = useState('');

    // New Item Modal
    const [newItemOpen, setNewItemOpen] = useState(false);
    const [newItem, setNewItem] = useState({
        name: '',
        category: 'FERTILIZER',
        unit: 'kg',
        currentQuantity: '' as any, // Allow string for input
        bufferLevel: 0
    });

    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    useEffect(() => {
        fetchInventory();
    }, [tenantId]);

    const fetchInventory = async () => {
        try {
            // Connect to Gateway -> Inventory Service (Fetch Items and Transactions)
            const [itemsRes, transRes] = await Promise.all([
                axios.get(`http://localhost:8080/api/inventory?tenantId=${tenantId}`),
                axios.get(`http://localhost:8080/api/inventory/transactions?tenantId=${tenantId}`)
            ]);

            setItems(itemsRes.data);

            // Identify items with PENDING restock requests
            const pending = new Set<number>();
            transRes.data.forEach((t: any) => {
                if (t.type === 'RESTOCK_REQUEST' && t.status === 'PENDING') {
                    pending.add(t.itemId);
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
            await axios.post('http://localhost:8080/api/inventory/transaction', {
                itemId: selectedItem,
                quantity: Number(qty) || 0,
                type: modalType,
                tenantId: tenantId,
                issuedTo: (modalType === 'ISSUE' || modalType === 'RESTOCK_REQUEST') ? issuedTo : undefined
            });
            setOpenModal(false);
            setQty(''); // Reset
            setIssuedTo('');
            fetchInventory(); // Refresh
            alert("Transaction Successful");
        } catch (err: any) {
            alert("Transaction Failed: " + (err.response?.data || err.message));
        }
    };

    const handleCreateItem = async () => {
        try {
            await axios.post('http://localhost:8080/api/inventory', {
                ...newItem,
                currentQuantity: Number(newItem.currentQuantity) || 0, // Ensure number
                tenantId
            });
            setNewItemOpen(false);
            fetchInventory();
            alert("Item Created Successfully");
            setNewItem({ name: '', category: 'FERTILIZER', unit: 'kg', currentQuantity: '', bufferLevel: 0 });
        } catch (err) {
            alert("Failed to create item");
        }
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
                        onClick={() => setNewItemOpen(true)}
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
                                <TableCell align="right">Buffer Level</TableCell>
                                <TableCell align="center">Status</TableCell>
                                <TableCell align="center">Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">Loading...</TableCell>
                                </TableRow>
                            ) : items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())).map(item => (
                                <TableRow key={item.id}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>{item.name}</TableCell>
                                    <TableCell><Chip label={item.category} size="small" /></TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                        {item.currentQuantity} {item.unit}
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
                                            <Chip label="Pending..." color="warning" variant="outlined" size="small" />
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

            {/* Create Item Modal */}
            <Dialog open={newItemOpen} onClose={() => setNewItemOpen(false)}>
                <DialogTitle>Add New Inventory Item</DialogTitle>
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
                    <TextField
                        fullWidth
                        label="Unit (e.g., kg, L, units)"
                        margin="normal"
                        value={newItem.unit}
                        onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    />
                    <TextField
                        fullWidth
                        label="Initial Quantity"
                        type="number"
                        margin="normal"
                        value={newItem.currentQuantity}
                        onChange={(e) => setNewItem({ ...newItem, currentQuantity: e.target.value })}
                    />

                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setNewItemOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreateItem}>Create Item</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
