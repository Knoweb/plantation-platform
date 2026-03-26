import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Alert, Snackbar } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info'; // For notification
import SettingsIcon from '@mui/icons-material/Settings'; // For unconfigured status
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export default function GeneralStock() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Buffer Edit State
    const [editOpen, setEditOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [bufferInput, setBufferInput] = useState<string>('');
    const [minimumInput, setMinimumInput] = useState<string>('');

    // Restock State (Manager Only)
    const [restockRequests, setRestockRequests] = useState<any[]>([]); // New state
    // Approval Dialog State
    const [approveOpen, setApproveOpen] = useState(false);
    const [approveReq, setApproveReq] = useState<any>(null);
    const [approveQty, setApproveQty] = useState('');
    const [approveRemarks, setApproveRemarks] = useState('');

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
    const isManager = userSession.role === 'MANAGER' || userSession.role === 'ESTATE_ADMIN';
    const fetchInventory = useCallback(async () => {
        try {
            const res = await axios.get(`/api/inventory?tenantId=${tenantId}`);
            setItems(res.data);

            if (isManager) {
                const transRes = await axios.get(`/api/inventory/transactions?tenantId=${tenantId}`);
                setRestockRequests(transRes.data.filter((t: any) =>
                    t.type === 'RESTOCK_REQUEST' &&
                    (t.status === 'PENDING' || t.status === null) &&
                    !(t.issuedTo && t.issuedTo.includes('SYSTEM')) // Hide auto-refills from Manager
                ));
            }

            setLoading(false);
        } catch (err) {
            console.error(err);
            setError("Failed to load inventory.");
            setLoading(false);
        }
    }, [tenantId, isManager]);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    const handleRequestAction = async (req: any) => {
        const isAuto = req.issuedTo && (req.issuedTo.includes('Auto-Refill') || req.issuedTo.includes('SYSTEM'));
        setApproveReq({ ...req, isAuto });
        setApproveQty(req.quantity ? String(req.quantity) : '');
        setApproveRemarks('');
        setApproveOpen(true);
    };

    const handleConfirmApprove = async (status: 'APPROVED' | 'DECLINED') => {
        if (!approveReq) return;
        if (status === 'APPROVED' && !approveQty) {
            showNotification("Quantity is required for approval.", 'error');
            return;
        }
        try {
            await axios.put(`/api/inventory/transactions/${approveReq.id}/status?status=${status}&quantity=${approveQty || approveReq.quantity}&remarks=${encodeURIComponent(approveRemarks || (status === 'APPROVED' ? "Manager approved." : "Manager declined."))}`);
            setApproveOpen(false);
            fetchInventory();
            showNotification(status === 'APPROVED' ? "Restock Approved and Stock Updated" : "Restock Request Declined", 'success');
        } catch (e: any) {
            showNotification("Action Failed: " + (e.response?.data || e.message), 'error');
        }
    };

    const handleEditClick = (item: any) => {
        setSelectedItem(item);
        setBufferInput(String(item.bufferLevel));
        setMinimumInput(String(item.minimumLevel || 0));
        setEditOpen(true);
    };

    const handleSaveBuffer = async () => {
        if (!selectedItem) return;
        const newBuffer = parseInt(bufferInput) || 0;
        const newMin = parseInt(minimumInput) || 0;

        try {
            // Update Buffer Level
            await axios.put(`/api/inventory/${selectedItem.id}/buffer`, newBuffer, {
                headers: { 'Content-Type': 'application/json' }
            });

            // Update Minimum Level (via updateItem)
            await axios.put(`/api/inventory/${selectedItem.id}`, {
                ...selectedItem,
                minimumLevel: newMin
            });

            setEditOpen(false);
            fetchInventory();
            showNotification("Stock levels updated successfully", 'success');
        } catch (err) {
            console.error(err);
            showNotification("Failed to update stock levels", 'error');
        }
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                    General Stock & Inventory Level
                </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary" mb={4}>
                Overview of current stock levels. Managers can set buffer and minimum thresholds here.
            </Typography>

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
                            Pending Restock Requests (From Chief Clerk)
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
                                        <Button
                                            size="small"
                                            variant="contained"
                                            color="success"
                                            onClick={() => handleRequestAction(req)}
                                        >
                                            Review Request
                                        </Button>
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
                            <TableCell align="center"><strong>Minimum Level</strong></TableCell>
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
                                    <TableCell align="center" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                                        {item.minimumLevel || 0}
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
                            <TableRow><TableCell colSpan={7} align="center">No inventory items found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Buffer Edit Dialog */}
            <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
                <DialogTitle>Update Stock Levels</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" mb={2}>
                        Set stock thresholds for <strong>{selectedItem?.name}</strong>.
                    </Typography>
                    <TextField
                        type="number"
                        label="Buffer Level (Reorder Point)"
                        fullWidth
                        margin="normal"
                        value={bufferInput}
                        onChange={(e) => setBufferInput(e.target.value)}
                        helperText="Stock level to trigger restock alerts"
                    />
                    <TextField
                        type="number"
                        label="Minimum Level (Blocking Point)"
                        fullWidth
                        margin="normal"
                        value={minimumInput}
                        onChange={(e) => setMinimumInput(e.target.value)}
                        helperText="Absolute minimum. Issues below this are blocked."
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveBuffer}>Update</Button>
                </DialogActions>
            </Dialog>

            {/* Approval Confirmation Dialog */}
            <Dialog open={approveOpen} onClose={() => setApproveOpen(false)}>
                <DialogTitle>Review Refill Request</DialogTitle>
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



                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                        {approveReq?.isAuto
                            ? "System Auto-Request: Please verify the quantity before adding to stock."
                            : `Requested Amount: ${approveReq?.quantity || '-'} ${items.find(i => i.id === approveReq?.itemId)?.unit || ''}. You can adjust this below.`}
                    </Typography>

                    <TextField
                        autoFocus
                        fullWidth
                        label="Quantity to Refill"
                        type="number"
                        value={approveQty}
                        onChange={(e) => setApproveQty(e.target.value)}
                        variant="outlined"
                        margin="normal"
                        sx={{ mb: 2 }}
                    />

                    <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="Manager Remarks (Optional)"
                        value={approveRemarks}
                        onChange={(e) => setApproveRemarks(e.target.value)}
                        variant="outlined"
                        placeholder="Add reason or notes..."
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <Button onClick={() => setApproveOpen(false)}>Cancel</Button>
                    <Box gap={1} display="flex">
                        <Button
                            variant="contained"
                            color="error"
                            onClick={() => handleConfirmApprove('DECLINED')}
                        >
                            Reject Request
                        </Button>
                        <Button
                            variant="contained"
                            color="success"
                            onClick={() => handleConfirmApprove('APPROVED')}
                        >
                            Final Approve & Refill
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
        </Box>
    );
}
