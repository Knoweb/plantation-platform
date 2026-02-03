import { Box, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Button, CircularProgress, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Snackbar, Alert } from '@mui/material';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function PendingApprovals() {
    const [pendingItems, setPendingItems] = useState<any[]>([]);
    const [inventoryItems, setInventoryItems] = useState<any[]>([]); // To show buffer/unit
    const [loading, setLoading] = useState(true);
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    // Approval Dialog State
    const [approveOpen, setApproveOpen] = useState(false);
    const [approveItem, setApproveItem] = useState<any>(null);
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

    useEffect(() => {
        fetchPending();
    }, [tenantId]);

    const fetchPending = async () => {
        try {
            const [workRes, invRes, itemsRes] = await Promise.all([
                axios.get(`http://localhost:8080/api/tenants/daily-work?tenantId=${tenantId}&status=PENDING`),
                axios.get(`http://localhost:8080/api/inventory/transactions?tenantId=${tenantId}`),
                axios.get(`http://localhost:8080/api/inventory?tenantId=${tenantId}`)
            ]);

            setInventoryItems(itemsRes.data);

            const workItems = workRes.data.map((item: any) => ({
                id: item.workId,
                displayId: item.workId.substring(0, 8),
                type: item.workType,
                details: `${item.divisionId} - ${item.details || ''}`,
                date: item.workDate,
                source: 'WORK'
            }));

            const invItems = invRes.data
                .filter((t: any) => t.type === 'RESTOCK_REQUEST' && t.status === 'PENDING')
                .map((t: any) => ({
                    id: t.id,
                    displayId: `INV-${t.id}`,
                    type: 'Stock Refill',
                    details: `${t.itemName}`,
                    itemId: t.itemId,
                    quantity: t.quantity, // Capture requested qty
                    issuedTo: t.issuedTo, // Capture note/source
                    date: t.date?.split('T')[0],
                    source: 'INVENTORY'
                }));

            setPendingItems([...workItems, ...invItems]);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (item: any) => {
        if (item.source === 'INVENTORY') {
            const isAuto = item.issuedTo && (item.issuedTo.includes('Auto-Refill') || item.issuedTo.includes('SYSTEM'));
            setApproveItem({ ...item, isAuto });
            setApproveQty(isAuto ? '' : item.quantity); // Pre-fill manual, empty auto
            setApproveOpen(true);
        } else {
            try {
                await axios.put(`http://localhost:8080/api/tenants/daily-work/${item.id}/approve`);
                fetchPending();
                showNotification("Work Approved", 'success');
            } catch (err) {
                showNotification("Failed to approve.", 'error');
            }
        }
    };

    const handleConfirmApprove = async () => {
        if (!approveItem || !approveQty) return;
        try {
            await axios.put(`http://localhost:8080/api/inventory/transactions/${approveItem.id}/status?status=APPROVED&quantity=${approveQty}`);
            setApproveOpen(false);
            fetchPending();
            showNotification("Inventory Request Approved", 'success');
        } catch (e) {
            showNotification("Failed to approve inventory.", 'error');
        }
    };

    if (loading) {
        return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;
    }

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                Pending Approvals
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={4}>
                Review and approve stock requests, musters, and other pending actions.
            </Typography>

            <Card>
                <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                        <PendingActionsIcon color="warning" sx={{ mr: 1, fontSize: 32 }} />
                        <Typography variant="h6">Items Waiting for Action</Typography>
                    </Box>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Quantity</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell>Details</TableCell>
                                <TableCell align="right">Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {pendingItems.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.displayId}</TableCell>
                                    <TableCell>{item.type}</TableCell>
                                    <TableCell>{item.quantity ? <strong>{item.quantity}</strong> : '-'}</TableCell>
                                    <TableCell>{item.date}</TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{item.details || '-'}</Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="error"
                                            sx={{ mr: 1 }}
                                            onClick={() => alert('Reject not implemented')}
                                        >
                                            Reject
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            color="primary"
                                            onClick={() => handleApprove(item)}
                                        >
                                            Approve
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {pendingItems.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">No pending approvals found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>

            </Card>

            {/* Approval Dialog */}
            <Dialog open={approveOpen} onClose={() => setApproveOpen(false)}>
                <DialogTitle>Approve Refill Request</DialogTitle>
                <DialogContent sx={{ minWidth: 350, pt: 2 }}>
                    <Typography variant="body1" gutterBottom>
                        Refilling for: <strong>{approveItem?.details}</strong>
                    </Typography>
                    {(() => {
                        const invItem = inventoryItems.find(i => i.id === approveItem?.itemId);
                        return invItem ? (
                            <Box sx={{ mb: 2, p: 1, bgcolor: '#f0faff', borderRadius: 1 }}>
                                <Typography variant="caption" display="block">Buffer Level: <strong>{invItem.bufferLevel} {invItem.unit}</strong></Typography>
                                <Typography variant="caption" display="block">Current Stock: <strong>{invItem.currentQuantity} {invItem.unit}</strong></Typography>
                            </Box>
                        ) : null;
                    })()}
                    {approveItem?.isAuto ? (
                        <TextField
                            autoFocus
                            fullWidth
                            label="Quantity to Refill"
                            type="number"
                            value={approveQty}
                            onChange={(e) => setApproveQty(e.target.value)}
                            placeholder="Enter amount"
                            helperText="System Auto-Request: Please specify refill amount."
                        />
                    ) : (
                        <Box mt={2}>
                            <Typography variant="subtitle1" gutterBottom sx={{ color: 'text.secondary' }}>
                                Store Keeper Requested Amount:
                            </Typography>
                            <Typography variant="h5" color="primary" fontWeight="bold">
                                {approveQty} {inventoryItems.find(i => i.id === approveItem?.itemId)?.unit}
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
        </Box >
    );
}
