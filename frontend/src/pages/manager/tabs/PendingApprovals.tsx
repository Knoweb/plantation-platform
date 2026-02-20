import { Box, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Button, CircularProgress, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Snackbar, Alert, IconButton, Chip, ToggleButton, ToggleButtonGroup } from '@mui/material';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function PendingApprovals() {
    // Data State
    const [pendingItems, setPendingItems] = useState<any[]>([]);
    const [divisions, setDivisions] = useState<any[]>([]);
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter State
    const [viewStatus, setViewStatus] = useState<'PENDING' | 'APPROVED'>('PENDING');
    const [searchTerm, setSearchTerm] = useState('');

    // User Session
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    // Approval Dialog State (Inventory)
    const [approveOpen, setApproveOpen] = useState(false);
    const [approveItem, setApproveItem] = useState<any>(null);
    const [approveQty, setApproveQty] = useState('');

    // Muster Review State (Morning Muster)
    const [musterReviewItem, setMusterReviewItem] = useState<any>(null);

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
        if (tenantId) {
            fetchPending();
        } else {
            setLoading(false);
            // Optionally redirect or show message
        }
    }, [tenantId, viewStatus]);

    const fetchPending = async () => {
        setLoading(true);
        let workItems: any[] = [];
        let invItems: any[] = [];

        try {
            // Fetch Daily Work and Divisions
            const [workRes, divRes] = await Promise.all([
                axios.get(`/api/operations/daily-work?tenantId=${tenantId}&status=${viewStatus}`),
                axios.get(`/api/divisions?tenantId=${tenantId}`)
            ]);

            const divMap = new Map(divRes.data.map((d: any) => [d.divisionId, d.name]));
            setDivisions(divRes.data);

            workItems = workRes.data
                .filter((item: any) => item.workType !== 'Morning Muster' && item.workType !== 'Evening Muster')
                .map((item: any) => ({
                    id: item.workId,
                    displayId: item.workId.substring(0, 8),
                    type: item.workType,
                    details: item.details && item.details.startsWith('[') ? 'Detailed Muster Plan' : `${item.details || ''}`,
                    detailsRaw: item.details,
                    date: item.workDate,
                    source: 'WORK',
                    quantity: item.workerCount,
                    divisionId: item.divisionId,
                    divisionName: divMap.get(item.divisionId) || item.divisionId || 'N/A'
                }));
        } catch (e) {
            console.error("Failed to load work items", e);
        }

        try {
            // Fetch Inventory items
            const [invRes, itemsRes] = await Promise.all([
                axios.get(`/api/inventory/transactions?tenantId=${tenantId}`),
                axios.get(`/api/inventory?tenantId=${tenantId}`)
            ]);
            setInventoryItems(itemsRes.data);

            invItems = invRes.data
                .filter((t: any) => t.type === 'RESTOCK_REQUEST' && t.status === viewStatus)
                .map((t: any) => ({
                    id: t.id,
                    displayId: `INV-${t.id}`,
                    type: 'Stock Refill',
                    details: `${t.itemName}`,
                    itemId: t.itemId,
                    quantity: t.quantity,
                    issuedTo: t.issuedTo,
                    date: t.date?.split('T')[0],
                    source: 'INVENTORY'
                }));
        } catch (e) {
            console.warn("Inventory service unavailable", e);
        }

        setPendingItems([...workItems, ...invItems]);
        setLoading(false);
    };

    const handleDelete = async (item: any) => {
        if (!window.confirm("Are you sure you want to PERMANENTLY DELETE this record?")) return;
        try {
            if (item.source === 'WORK') {
                await axios.delete(`/api/operations/daily-work/${item.id}`);
            } else {
                // Future: Inventory delete endpoint
            }
            fetchPending();
            showNotification("Item deleted successfully", "success");
        } catch (e) {
            console.error("Delete failed", e);
            showNotification("Failed to delete item", "error");
        }
    };

    const handleApprove = (item: any) => {
        if (item.source === 'INVENTORY') {
            const isAuto = item.issuedTo && (item.issuedTo.includes('Auto-Refill') || item.issuedTo.includes('SYSTEM'));
            setApproveItem({ ...item, isAuto });
            setApproveQty(isAuto ? '' : item.quantity);
            setApproveOpen(true);
        } else {
            setMusterReviewItem(item);
        }
    };

    const handleConfirmMusterApprove = async () => {
        if (!musterReviewItem) return;
        try {
            await axios.put(`/api/operations/daily-work/${musterReviewItem.id}/approve`);
            setMusterReviewItem(null);
            fetchPending();
            showNotification("Muster Approved", 'success');
        } catch (err) {
            showNotification("Failed to approve muster.", 'error');
        }
    };

    const handleConfirmApprove = async () => {
        if (!approveItem || !approveQty) return;
        try {
            await axios.put(`/api/inventory/transactions/${approveItem.id}/status?status=APPROVED&quantity=${approveQty}`);
            setApproveOpen(false);
            fetchPending();
            showNotification("Inventory Request Approved", 'success');
        } catch (e) {
            showNotification("Failed to approve inventory.", 'error');
        }
    };

    if (loading && pendingItems.length === 0) return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">Pending Approvals</Typography>
            <Typography variant="body1" color="text.secondary" mb={4}>Review and approve stock requests, musters, and other pending actions.</Typography>

            <Card>
                <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                        <PendingActionsIcon color="warning" sx={{ mr: 1, fontSize: 32 }} />
                        <Typography variant="h6">{viewStatus === 'PENDING' ? 'Items Waiting for Action' : 'Approval History'}</Typography>
                        <Box flexGrow={1} />
                        <ToggleButtonGroup
                            value={viewStatus}
                            exclusive
                            onChange={(e, newStatus) => { if (newStatus) setViewStatus(newStatus); }}
                            size="small"
                        >
                            <ToggleButton value="PENDING">Pending</ToggleButton>
                            <ToggleButton value="APPROVED">History</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>

                    {/* Search Bar */}
                    <Box mb={2}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search by ID, Division, or Details..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </Box>

                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Division</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell>Details</TableCell>
                                <TableCell align="right">Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {pendingItems
                                .filter(item => {
                                    if (!searchTerm) return true;
                                    const lower = searchTerm.toLowerCase();
                                    return (
                                        item.displayId.toLowerCase().includes(lower) ||
                                        (item.divisionName && item.divisionName.toLowerCase().includes(lower)) ||
                                        (item.details && item.details.toLowerCase().includes(lower)) ||
                                        (item.date && item.date.includes(lower))
                                    );
                                })
                                .map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.displayId}</TableCell>
                                        <TableCell>{item.type}</TableCell>
                                        <TableCell>
                                            {item.source === 'WORK' ? <Chip label={item.divisionName} size="small" variant="outlined" /> : '-'}
                                        </TableCell>
                                        <TableCell>{item.date}</TableCell>
                                        <TableCell><Typography variant="body2">{item.details}</Typography></TableCell>
                                        <TableCell align="right">
                                            {item.source === 'WORK' ? (
                                                <Box display="flex" gap={1} justifyContent="flex-end">
                                                    <IconButton size="small" color="error" onClick={() => handleDelete(item)} title="Delete Record">
                                                        <DeleteIcon />
                                                    </IconButton>
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        color={viewStatus === 'APPROVED' ? 'inherit' : 'primary'}
                                                        startIcon={<VisibilityIcon />}
                                                        onClick={() => setMusterReviewItem(item)}
                                                    >
                                                        {viewStatus === 'APPROVED' ? 'View' : 'Review'}
                                                    </Button>
                                                </Box>
                                            ) : (
                                                viewStatus === 'PENDING' && (
                                                    <>
                                                        <Button size="small" variant="outlined" color="error" sx={{ mr: 1 }} onClick={() => handleDelete(item)}>Reject</Button>
                                                        <Button size="small" variant="contained" color="primary" onClick={() => handleApprove(item)}>Approve</Button>
                                                    </>
                                                )
                                            )}
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

            {/* Inventory Approval Dialog */}
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

            {/* Muster Review Dialog */}
            <Dialog open={Boolean(musterReviewItem)} onClose={() => setMusterReviewItem(null)} maxWidth="lg" fullWidth>
                <DialogTitle sx={{ bgcolor: '#e8f5e9', color: '#1b5e20', borderBottom: '1px solid #c8e6c9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="h6" fontWeight="bold">Morning Muster Review</Typography>
                        <Typography variant="caption">{musterReviewItem?.date}</Typography>
                    </Box>
                    <Chip
                        label={viewStatus === 'APPROVED' ? "APPROVED" : "PENDING APPROVAL"}
                        color={viewStatus === 'APPROVED' ? "success" : "warning"}
                    />
                </DialogTitle>
                <DialogContent sx={{ pt: 3, bgcolor: '#f1f8e9', minHeight: '400px' }}>
                    <Box display="flex" gap={3} flexDirection={{ xs: 'column', md: 'row' }}>
                        {/* LEFT: Muster Chit Summary */}
                        <Box flex={1} minWidth={{ md: '300px' }}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ color: '#2e7d32' }}>Muster Chit</Typography>
                            <Card variant="outlined" sx={{ bgcolor: 'white' }}>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: '#a5d6a7' }}>
                                        <TableRow>
                                            <TableCell><strong>Work Item</strong></TableCell>
                                            <TableCell><strong>Field No</strong></TableCell>
                                            <TableCell align="right"><strong>Workers</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(() => {
                                            try {
                                                const details = musterReviewItem?.detailsRaw ? JSON.parse(musterReviewItem.detailsRaw) : [];
                                                if (Array.isArray(details)) {
                                                    return details.map((d: any, idx: number) => (
                                                        <TableRow key={idx}>
                                                            <TableCell>{d.task || musterReviewItem.type}</TableCell>
                                                            <TableCell>{d.field}</TableCell>
                                                            <TableCell align="right"><strong>{d.count || d.workers}</strong></TableCell>
                                                        </TableRow>
                                                    ));
                                                }
                                            } catch (e) {
                                                return <TableRow><TableCell colSpan={3}>Error loading details</TableCell></TableRow>;
                                            }
                                            return <TableRow><TableCell colSpan={3}>No details</TableCell></TableRow>;
                                        })()}
                                        <TableRow sx={{ bgcolor: '#c8e6c9' }}>
                                            <TableCell colSpan={2}><strong>Grand Total</strong></TableCell>
                                            <TableCell align="right"><strong>{musterReviewItem?.quantity}</strong></TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </Card>
                        </Box>

                        {/* RIGHT: Division View (Detailed Assignments) */}
                        <Box flex={2}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ color: '#1565c0' }}>Field Assignments (Division View)</Typography>
                            <Box sx={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {(() => {
                                    try {
                                        const details = musterReviewItem?.detailsRaw ? JSON.parse(musterReviewItem.detailsRaw) : [];
                                        if (Array.isArray(details)) {
                                            const groupedByTask: any = {};
                                            details.forEach((d: any) => {
                                                const task = d.task || musterReviewItem.type;
                                                if (!groupedByTask[task]) groupedByTask[task] = [];
                                                groupedByTask[task].push(d);
                                            });

                                            return Object.entries(groupedByTask).map(([task, assignments]: any) => (
                                                <Box key={task} mb={3}>
                                                    <Typography variant="h6" color="primary" gutterBottom>{task}</Typography>
                                                    {assignments.map((assign: any, idx: number) => (
                                                        <Card key={idx} variant="outlined" sx={{ mb: 1, p: 2 }}>
                                                            <Typography variant="subtitle2" gutterBottom>
                                                                Field: <strong>{assign.field}</strong> • ({assign.count || assign.workers} workers)
                                                            </Typography>
                                                            <Box display="flex" flexWrap="wrap" gap={1}>
                                                                {assign.assigned && assign.assigned.length > 0 ? (
                                                                    assign.assigned.map((w: any, wIdx: number) => (
                                                                        <Chip
                                                                            key={wIdx}
                                                                            label={w.name}
                                                                            size="small"
                                                                        // variant="outlined"
                                                                        />
                                                                    ))
                                                                ) : (
                                                                    <Typography variant="caption" color="text.secondary">Worker details not available for this record.</Typography>
                                                                )}
                                                            </Box>
                                                        </Card>
                                                    ))}
                                                </Box>
                                            ));
                                        }
                                    } catch (e) {
                                        return <Typography color="error">Cannot display detailed view.</Typography>;
                                    }
                                })()}
                            </Box>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ bgcolor: '#e8f5e9', borderTop: '1px solid #c8e6c9', p: 2, justifyContent: viewStatus === 'APPROVED' ? 'flex-end' : 'space-between' }}>
                    {viewStatus === 'PENDING' ? (
                        <>
                            <Button variant="outlined" color="error" onClick={() => {
                                if (window.confirm("Reject this muster?")) {
                                    handleDelete(musterReviewItem);
                                    setMusterReviewItem(null);
                                }
                            }}>
                                Reject Muster
                            </Button>
                            <Button variant="contained" color="success" onClick={handleConfirmMusterApprove}>
                                Approve & Sign
                            </Button>
                        </>
                    ) : (
                        <Button onClick={() => setMusterReviewItem(null)}>Close</Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Notification Snackbar */}
            <Snackbar open={notification.open} autoHideDuration={6000} onClose={handleCloseNotification} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>{notification.message}</Alert>
            </Snackbar>
        </Box >
    );
}
