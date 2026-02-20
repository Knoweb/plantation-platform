import { Box, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Button, CircularProgress, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Snackbar, Alert, IconButton, Chip, ToggleButton, ToggleButtonGroup, Grid } from '@mui/material';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function PendingApprovals() {
    // Data State
    const [pendingItems, setPendingItems] = useState<any[]>([]);
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
    const [approveRemarks, setApproveRemarks] = useState('');

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

            workItems = workRes.data
                .filter((item: any) => item.workType !== 'Morning Muster' && item.workType !== 'Evening Muster')
                .map((item: any) => ({
                    id: item.workId,
                    displayId: item.workId.substring(0, 8),
                    type: item.workType,
                    details: item.details && item.details.startsWith('[') ? 'Detailed Muster Plan' : `${item.details || ''}`,
                    detailsRaw: item.details,
                    date: item.workDate,
                    time: '-',
                    status: item.status || 'PENDING',
                    source: 'WORK',
                    quantity: item.workerCount,
                    divisionId: item.divisionId,
                    divisionName: divMap.get(item.divisionId) || item.divisionId || 'N/A'
                }));
        } catch (e: any) {
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
                .filter((t: any) => (t.type === 'RESTOCK_REQUEST' || t.type === 'FO_REQUISITION') && t.status === viewStatus)
                .map((t: any) => ({
                    id: t.id,
                    displayId: `INV-${t.id}`,
                    type: t.type === 'FO_REQUISITION' ? 'FO Requisition' : 'Stock Refill',
                    details: `${t.itemName}`,
                    itemId: t.itemId,
                    quantity: t.quantity,
                    issuedTo: t.issuedTo,
                    date: t.date?.split('T')[0],
                    time: t.date?.split('T')[1]?.substring(0, 5) || '-',
                    status: t.status || 'PENDING',
                    divisionId: t.divisionId,
                    divisionName: t.divisionName || t.divisionId || '-',
                    fieldName: t.fieldName || t.fieldId || '-',
                    source: 'INVENTORY',
                    actualType: t.type
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
            if (item.actualType === 'FO_REQUISITION') {
                setApproveItem({ ...item, isFORequisition: true, isAuto: false });
                setApproveQty(item.quantity);
                setApproveRemarks('');
                setApproveOpen(true);
            } else {
                const isAuto = item.issuedTo && (item.issuedTo.includes('Auto-Refill') || item.issuedTo.includes('SYSTEM'));
                setApproveItem({ ...item, isAuto, isFORequisition: false });
                setApproveQty(isAuto ? '' : item.quantity);
                setApproveRemarks('');
                setApproveOpen(true);
            }
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
            await axios.put(`/api/inventory/transactions/${approveItem.id}/status?status=APPROVED&quantity=${approveQty}&remarks=${encodeURIComponent(approveRemarks)}`);
            setApproveOpen(false);
            fetchPending();
            showNotification("Inventory Request Approved", 'success');
        } catch (e: any) {
            showNotification("Failed to approve inventory.", 'error');
        }
    };

    const handleRejectInv = async (item: any) => {
        if (!window.confirm("Are you sure you want to REJECT this request?")) return;
        try {
            await axios.put(`/api/inventory/transactions/${item.id}/status?status=DECLINED&remarks=${encodeURIComponent(approveRemarks)}`);
            fetchPending();
            showNotification("Request Rejected", "success");
            setApproveOpen(false);
        } catch (e) {
            console.error("Reject failed", e);
            showNotification("Failed to reject request", "error");
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
                            onChange={(_e, newStatus) => { if (newStatus) setViewStatus(newStatus); }}
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
                                <TableCell>Requested By</TableCell>
                                <TableCell>Division</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell>Time</TableCell>
                                <TableCell>Status</TableCell>
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
                                            <span style={{ fontWeight: 600 }}>{item.source === 'INVENTORY' && item.issuedTo ? item.issuedTo.split(' - ')[0] : 'System/Manager'}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={item.divisionName || '-'} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell>{item.date}</TableCell>
                                        <TableCell>{item.time}</TableCell>
                                        <TableCell>
                                            <Chip label={item.status} size="small" color={item.status === 'APPROVED' ? 'success' : (item.status === 'DECLINED' ? 'error' : 'warning')} />
                                        </TableCell>
                                        <TableCell><Typography variant="body2">{item.details}</Typography></TableCell>
                                        <TableCell align="right">
                                            <Box display="flex" gap={1} justifyContent="flex-end">
                                                {viewStatus === 'PENDING' && (
                                                    <IconButton size="small" color="error" onClick={() => handleDelete(item)} title="Delete Record">
                                                        <DeleteIcon />
                                                    </IconButton>
                                                )}
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    color={viewStatus === 'APPROVED' ? 'inherit' : 'primary'}
                                                    startIcon={<VisibilityIcon />}
                                                    onClick={() => handleApprove(item)}
                                                >
                                                    View
                                                </Button>
                                            </Box>
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
            <Dialog open={approveOpen} onClose={() => setApproveOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ bgcolor: '#e8f5e9', color: '#1b5e20', borderBottom: '1px solid #c8e6c9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight="bold">
                        {approveItem?.actualType === 'FO_REQUISITION' ? 'Review Order Request' : 'Approve Refill Request'}
                    </Typography>
                    <Chip label={approveItem?.status || 'PENDING'} color={approveItem?.status === 'APPROVED' ? "success" : "warning"} size="small" />
                </DialogTitle>
                <DialogContent sx={{ minWidth: 350, pt: 3 }}>
                    {approveItem?.actualType === 'FO_REQUISITION' ? (
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 6 }}>
                                <Typography variant="caption" color="text.secondary">Item</Typography>
                                <Typography variant="body1" fontWeight="bold">{approveItem?.details}</Typography>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <Typography variant="caption" color="text.secondary">Quantity Request</Typography>
                                <Typography variant="body1" fontWeight="bold">
                                    {approveItem?.quantity} {inventoryItems.find((i: any) => i.id === approveItem?.itemId)?.unit}
                                </Typography>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <Typography variant="caption" color="text.secondary">Division</Typography>
                                <Typography variant="body1" fontWeight="bold">{approveItem?.divisionName || '-'}</Typography>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <Typography variant="caption" color="text.secondary">Field</Typography>
                                <Typography variant="body1" fontWeight="bold">{approveItem?.fieldName || '-'}</Typography>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <Typography variant="caption" color="text.secondary">Date & Time</Typography>
                                <Typography variant="body1" fontWeight="bold">{approveItem?.date} {approveItem?.time !== '-' ? approveItem?.time : ''}</Typography>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <Typography variant="caption" color="text.secondary">Requested By</Typography>
                                <Typography variant="body1" fontWeight="bold">{approveItem?.issuedTo?.split(' - ')[0] || '-'}</Typography>
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <Typography variant="caption" color="text.secondary">Remarks</Typography>
                                <Typography variant="body1" fontWeight="bold">{approveItem?.issuedTo?.split(' - ')[1] || '-'}</Typography>
                            </Grid>
                        </Grid>
                    ) : (
                        <>
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
                        </>
                    )}
                    {approveItem?.status !== 'APPROVED' && (
                        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #ddd' }}>
                            <TextField
                                fullWidth
                                label="Manager Remarks (Optional)"
                                multiline
                                rows={2}
                                value={approveRemarks}
                                onChange={(e) => setApproveRemarks(e.target.value)}
                                placeholder="Add notes, reasons for rejection, or delivery instructions..."
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5', justifyContent: approveItem?.status === 'APPROVED' ? 'flex-end' : 'space-between' }}>
                    {approveItem?.status !== 'APPROVED' ? (
                        <>
                            <Button variant="outlined" color="error" onClick={() => handleRejectInv(approveItem)}>Reject</Button>
                            <Box>
                                <Button onClick={() => setApproveOpen(false)} sx={{ mr: 1 }}>Cancel</Button>
                                <Button variant="contained" color="success" onClick={handleConfirmApprove}>
                                    {approveItem?.isFORequisition ? 'Approve' : 'Confirm Approval'}
                                </Button>
                            </Box>
                        </>
                    ) : (
                        <Button onClick={() => setApproveOpen(false)}>Close</Button>
                    )}
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
