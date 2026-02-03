import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Alert, Snackbar } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info'; // For notification
import SettingsIcon from '@mui/icons-material/Settings'; // For unconfigured status
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import CancelIcon from '@mui/icons-material/Cancel';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function GeneralStock() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Buffer Edit State
    const [editOpen, setEditOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [bufferInput, setBufferInput] = useState<string>('');

    // Restock State (Manager Only)
    const [receiveOpen, setReceiveOpen] = useState(false);
    const [restockItemId, setRestockItemId] = useState('');
    const [transactionQty, setTransactionQty] = useState<string>('');
    const [restockRequests, setRestockRequests] = useState<any[]>([]); // New state
    // Approval Dialog State
    const [approveOpen, setApproveOpen] = useState(false);
    const [approveReq, setApproveReq] = useState<any>(null);
    const [approveQty, setApproveQty] = useState('');

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
    const isManager = userSession.role === 'MANAGER';

    useEffect(() => {
        fetchInventory();
    }, [tenantId]);

    const fetchInventory = async () => {
        try {
            const res = await axios.get(`http://localhost:8080/api/inventory?tenantId=${tenantId}`);
            setItems(res.data);

            if (isManager) {
                const transRes = await axios.get(`http://localhost:8080/api/inventory/transactions?tenantId=${tenantId}`);
                setRestockRequests(transRes.data.filter((t: any) => t.type === 'RESTOCK_REQUEST' && (t.status === 'PENDING' || t.status === null)));
            }

            setLoading(false);
        } catch (err) {
            console.error(err);
            setError("Failed to load inventory.");
            setLoading(false);
        }
    };

    const handleRequestAction = async (req: any, status: string) => {
        if (status === 'APPROVED') {
            const isAuto = req.issuedTo && (req.issuedTo.includes('Auto-Refill') || req.issuedTo.includes('SYSTEM'));
            setApproveReq({ ...req, isAuto });
            setApproveQty(isAuto ? '' : req.quantity); // Pre-fill for manual, empty for auto
            setApproveOpen(true);
            return;
        }

        // For Decline
        try {
            await axios.put(`http://localhost:8080/api/inventory/transactions/${req.id}/status?status=${status}`);
            fetchInventory();
            showNotification(`Request ${status}`, 'success');
        } catch (e) {
            showNotification("Action failed", 'error');
        }
    };

    const handleConfirmApprove = async () => {
        if (!approveReq || !approveQty) return;
        try {
            await axios.put(`http://localhost:8080/api/inventory/transactions/${approveReq.id}/status?status=APPROVED&quantity=${approveQty}`);
            setApproveOpen(false);
            fetchInventory();
            showNotification("Request APPROVED", 'success');
        } catch (e) {
            showNotification("Approval Failed", 'error');
        }
    };

    const handleEditClick = (item: any) => {
        setSelectedItem(item);
        setBufferInput(String(item.bufferLevel));
        setEditOpen(true);
    };

    const handleSaveBuffer = async () => {
        if (!selectedItem) return;
        const newLevel = parseInt(bufferInput) || 0;
        try {
            await axios.put(`http://localhost:8080/api/inventory/${selectedItem.id}/buffer`, newLevel, {
                headers: { 'Content-Type': 'application/json' }
            });
            setEditOpen(false);
            fetchInventory();
        } catch (err) {
            showNotification("Failed to update buffer level", 'error');
        }
    };

    const handleRestock = async () => {
        try {
            await axios.post('http://localhost:8080/api/inventory/transaction', {
                itemId: restockItemId,
                quantity: Number(transactionQty) || 0,
                type: 'RECEIPT',
                tenantId: tenantId
            });
            setReceiveOpen(false);
            setTransactionQty('');
            fetchInventory();
            showNotification("Stock Received Successfully", 'success');
        } catch (err) {
            showNotification("Transaction Failed", 'error');
        }
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                    General Stock & Inventory Level
                </Typography>
                {isManager && (
                    <Button
                        variant="contained"
                        color="success"
                        startIcon={<AddShoppingCartIcon />}
                        onClick={() => { setReceiveOpen(true); setTransactionQty(''); }}
                    >
                        Receive Stock (Refill)
                    </Button>
                )}
            </Box>
            <Typography variant="body1" color="text.secondary" mb={4}>
                Overview of current stock levels. Managers can set buffer thresholds here.
            </Typography>

            {/* Manager Alert Summary */}
            {/* Manager Alert Summary */}
            {isManager && items.some(i => i.bufferLevel === 0) && (
                <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2, border: '1px solid #0288d1' }}>
                    <strong>Action Required:</strong> New items detected. Please set simple buffer levels for unconfigured items.
                </Alert>
            )}

            {isManager && items.some(i => i.currentQuantity < i.bufferLevel && i.bufferLevel > 0) && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    Attention Manager: Some items are below their buffer level. Please review stock and authorize purchase requests.
                </Alert>
            )}

            {/* Restock Requests Display */}
            {isManager && restockRequests.length > 0 && (
                <Paper sx={{ mb: 4, p: 2, border: '1px solid #ed6c02', bgcolor: '#fff3e0' }}>
                    <Box display="flex" alignItems="center" mb={2}>
                        <InfoIcon color="warning" sx={{ mr: 1 }} />
                        <Typography variant="h6" color="warning.dark" fontWeight="bold">
                            Pending Restock Requests (From Store Keeper)
                        </Typography>
                    </Box>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell><strong>Date</strong></TableCell>
                                <TableCell><strong>Item</strong></TableCell>
                                <TableCell><strong>Quantity</strong></TableCell>
                                <TableCell><strong>Note</strong></TableCell>
                                <TableCell align="center"><strong>Actions</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {restockRequests.slice(0, 5).map(req => (
                                <TableRow key={req.id}>
                                    <TableCell>{new Date(req.date).toLocaleDateString()} {new Date(req.date).toLocaleTimeString()}</TableCell>
                                    <TableCell>{req.itemName}</TableCell>
                                    <TableCell>{req.quantity || '-'}</TableCell>
                                    <TableCell>{req.issuedTo || '-'}</TableCell>
                                    <TableCell align="center">
                                        <IconButton size="small" color="success" onClick={() => handleRequestAction(req, 'APPROVED')} title="Approve & Refill">
                                            <CheckCircleIcon />
                                        </IconButton>
                                        <IconButton size="small" color="error" onClick={() => handleRequestAction(req, 'DECLINED')} title="Decline">
                                            <CancelIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Paper>
            )}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell><strong>Item Name</strong></TableCell>
                            <TableCell><strong>Category</strong></TableCell>
                            <TableCell align="center"><strong>Unit</strong></TableCell>
                            <TableCell align="center"><strong>Current Qty</strong></TableCell>
                            <TableCell align="center"><strong>Buffer Level</strong></TableCell>
                            <TableCell align="center"><strong>Status</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {items.map((item) => {
                            const isLow = item.currentQuantity < item.bufferLevel;
                            return (
                                <TableRow key={item.id} sx={{ bgcolor: isLow ? '#fff4f4' : 'inherit' }}>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell><Chip label={item.category} size="small" /></TableCell>
                                    <TableCell align="center">{item.unit}</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>{item.currentQuantity}</TableCell>
                                    <TableCell align="center">
                                        {item.bufferLevel}
                                        {isManager && (
                                            <IconButton size="small" onClick={() => handleEditClick(item)} sx={{ ml: 1 }}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                    <TableCell align="center">
                                        {item.bufferLevel === 0 ? (
                                            <Chip icon={<SettingsIcon />} label="Configure" color="info" size="small" variant="outlined" />
                                        ) : item.currentQuantity < item.bufferLevel ? (
                                            <Chip icon={<WarningIcon />} label="Low Stock" color="error" size="small" />
                                        ) : (
                                            <Chip icon={<CheckCircleIcon />} label="Good" color="success" size="small" variant="outlined" />
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {items.length === 0 && !loading && (
                            <TableRow><TableCell colSpan={6} align="center">No inventory items found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Buffer Edit Dialog */}
            <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
                <DialogTitle>Update Buffer Level</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" mb={2}>
                        Set the minimum stock level for <strong>{selectedItem?.name}</strong>.
                    </Typography>
                    <TextField
                        type="number"
                        label="Buffer Level"
                        fullWidth
                        value={bufferInput}
                        onChange={(e) => setBufferInput(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveBuffer}>Update</Button>
                </DialogActions>
            </Dialog>

            {/* Restock Dialog */}
            <Dialog open={receiveOpen} onClose={() => setReceiveOpen(false)}>
                <DialogTitle>Receive New Stock (Refill)</DialogTitle>
                <DialogContent sx={{ minWidth: 400, pt: 2 }}>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Select Item</InputLabel>
                        <Select
                            value={restockItemId}
                            label="Select Item"
                            onChange={(e) => setRestockItemId(e.target.value)}
                        >
                            {items.map(i => (
                                <MenuItem key={i.id} value={i.id}>{i.name} ({i.currentQuantity} {i.unit})</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Quantity to Add"
                        type="number"
                        margin="normal"
                        value={transactionQty}
                        onChange={(e) => setTransactionQty(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setReceiveOpen(false)}>Cancel</Button>
                    <Button variant="contained" color="success" onClick={handleRestock}>
                        Confirm Receipt
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Approval Confirmation Dialog */}
            <Dialog open={approveOpen} onClose={() => setApproveOpen(false)}>
                <DialogTitle>Approve Refill Request</DialogTitle>
                <DialogContent sx={{ minWidth: 350, pt: 2 }}>
                    <Typography variant="body1" gutterBottom>
                        Refilling for: <strong>{approveReq?.itemName}</strong>
                    </Typography>
                    {(() => {
                        const item = items.find(i => i.id === approveReq?.itemId);
                        return item ? (
                            <Box sx={{ mb: 2, p: 1, bgcolor: '#f0faff', borderRadius: 1 }}>
                                <Typography variant="caption" display="block">Buffer Level: <strong>{item.bufferLevel} {item.unit}</strong></Typography>
                                <Typography variant="caption" display="block">Current Stock: <strong>{item.currentQuantity} {item.unit}</strong></Typography>
                            </Box>
                        ) : null;
                    })()}



                    {approveReq?.isAuto ? (
                        <TextField
                            autoFocus
                            fullWidth
                            label={`Quantity to Refill`}
                            type="number"
                            value={approveQty}
                            onChange={(e) => setApproveQty(e.target.value)}
                            variant="outlined"
                            placeholder="Enter amount"
                            helperText="System Auto-Request: Please specify refill amount."
                        />
                    ) : (
                        <Box mt={2}>
                            <Typography variant="subtitle1" gutterBottom sx={{ color: 'text.secondary' }}>
                                Store Keeper Requested Amount:
                            </Typography>
                            <Typography variant="h5" color="primary" fontWeight="bold">
                                {approveQty} {items.find(i => i.id === approveReq?.itemId)?.unit}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Click 'Confirm Approval' to accept this request.
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setApproveOpen(false)}>Cancel</Button>
                    <Button variant="contained" color="success" onClick={handleConfirmApprove}>
                        Confirm Approval
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
