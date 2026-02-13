import { Box, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Button, CircularProgress, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Snackbar, Alert, IconButton, Chip, Avatar } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ManIcon from '@mui/icons-material/Man';
import WomanIcon from '@mui/icons-material/Woman';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function MusterReviewManager() {
    const [pendingItems, setPendingItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewStatus, setViewStatus] = useState<'PENDING' | 'APPROVED'>('PENDING');
    const [workerMap, setWorkerMap] = useState<Map<string, any>>(new Map());

    // Review Item State
    const [selectedItem, setSelectedItem] = useState<any>(null);

    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    const [notification, setNotification] = useState<{ open: boolean, message: string, severity: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (tenantId) fetchPending();
    }, [tenantId, viewStatus]);

    const fetchPending = async () => {
        setLoading(true);
        try {
            const [workRes, divRes, workerRes] = await Promise.all([
                axios.get(`/api/tenants/daily-work?tenantId=${tenantId}&status=${viewStatus}`),
                axios.get(`/api/divisions?tenantId=${tenantId}`),
                axios.get(`/api/workers?tenantId=${tenantId}`)
            ]);

            const divMap = new Map(divRes.data.map((d: any) => [d.divisionId, d.name]));

            // Build Worker Map
            const wMap = new Map<string, any>();
            workerRes.data.forEach((w: any) => {
                wMap.set(w.id, w);
                if (w.workerId) wMap.set(w.workerId, w);
            });
            setWorkerMap(wMap);

            // Filter ONLY 'Morning Muster' (and potentially 'Evening Muster' if backend supports status)
            const musters = workRes.data
                .filter((item: any) => item.workType === 'Morning Muster' || item.workType === 'Evening Muster')
                .map((item: any) => ({
                    id: item.workId,
                    displayId: item.workId.substring(0, 8),
                    type: item.workType,
                    detailsRaw: item.details,
                    date: item.workDate,
                    createdAt: item.createdAt, // Added field
                    quantity: item.workerCount,
                    divisionName: divMap.get(item.divisionId) || 'Unknown Division',
                    status: item.status
                }));

            setPendingItems(musters);
        } catch (e) {
            console.error("Failed to fetch", e);
        }
        setLoading(false);
    };

    const handleApprove = async () => {
        if (!selectedItem) return;
        try {
            // Updated Endpoint: /approve (Backend has @PutMapping("/{id}/approve"))
            await axios.put(`/api/tenants/daily-work/${selectedItem.id}/approve`);
            setNotification({ open: true, message: "Muster Approved Successfully", severity: 'success' });
            setSelectedItem(null);
            fetchPending();
        } catch (e) {
            setNotification({ open: true, message: "Failed to Approve", severity: 'error' });
        }
    };

    const handleReject = async () => {
        if (!selectedItem || (viewStatus === 'PENDING' && !window.confirm("Reject this muster?")) || (viewStatus !== 'PENDING' && !window.confirm("Delete this record permanently?"))) return;
        try {
            await axios.delete(`/api/tenants/daily-work/${selectedItem.id}`);
            setNotification({ open: true, message: viewStatus === 'PENDING' ? "Muster Rejected" : "Record Deleted", severity: 'success' });
            setSelectedItem(null);
            fetchPending();
        } catch (e) {
            setNotification({ open: true, message: "Failed to Process", severity: 'error' });
        }
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" mb={3}>Muster Review</Typography>

            <Box display="flex" gap={2} mb={3}>
                <Button variant={viewStatus === 'PENDING' ? "contained" : "outlined"} onClick={() => setViewStatus('PENDING')}>Pending</Button>
                <Button variant={viewStatus === 'APPROVED' ? "contained" : "outlined"} onClick={() => setViewStatus('APPROVED')}>History</Button>
            </Box>

            {loading ? <CircularProgress /> : (
                <Card>
                    <Table>
                        <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Division</TableCell>
                                <TableCell>Date & Time</TableCell>
                                <TableCell align="right">Workers</TableCell>
                                <TableCell align="center">Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {pendingItems.length === 0 ? (
                                <TableRow><TableCell colSpan={6} align="center">No records found.</TableCell></TableRow>
                            ) : (
                                pendingItems.map((row) => (
                                    <TableRow key={row.id} hover>
                                        <TableCell>{row.displayId}</TableCell>
                                        <TableCell><Chip label={row.type} size="small" color="primary" variant="outlined" /></TableCell>
                                        <TableCell>{row.divisionName}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{row.date}</Typography>
                                            {row.createdAt && <Typography variant="caption" color="text.secondary">{new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>}
                                        </TableCell>
                                        <TableCell align="right">{row.quantity}</TableCell>
                                        <TableCell align="center">
                                            <Button
                                                variant="contained"
                                                size="small"
                                                color="success"
                                                startIcon={<VisibilityIcon />}
                                                onClick={() => setSelectedItem(row)}
                                            >
                                                Review
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Card>
            )}

            {/* Review Dialog */}
            <Dialog open={Boolean(selectedItem)} onClose={() => setSelectedItem(null)} maxWidth="lg" fullWidth>
                <DialogTitle sx={{ bgcolor: '#e8f5e9', display: 'flex', justifyContent: 'space-between' }}>
                    <Typography component="div" variant="h6">Review Muster: {selectedItem?.divisionName} ({selectedItem?.date})</Typography>
                    <Chip label={viewStatus} color={viewStatus === 'APPROVED' ? 'success' : 'warning'} />
                </DialogTitle>
                <DialogContent sx={{ bgcolor: '#f1f8e9', p: 3 }}>
                    {selectedItem && (
                        <Box display="flex" gap={3} flexDirection={{ xs: 'column', md: 'row' }} mt={2}>
                            {/* Detailed View Logic (Reused from PendingApprovals) */}
                            <Box flex={1}>
                                <Card variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="h6" gutterBottom>Summary</Typography>
                                    {/* Parse Details RAW */}
                                    {(() => {
                                        try {
                                            const details = JSON.parse(selectedItem.detailsRaw);
                                            if (Array.isArray(details)) {
                                                return details.map((d: any, idx: number) => (
                                                    <Box key={idx} mb={1} display="flex" justifyContent="space-between" borderBottom="1px dashed #ccc" pb={1}>
                                                        <Box flex={1}>
                                                            <Typography variant="caption" color="text.secondary">Work item</Typography>
                                                            <Typography variant="body2" fontWeight="bold">{d.task}</Typography>
                                                        </Box>
                                                        <Box flex={1}>
                                                            <Typography variant="caption" color="text.secondary">Field No</Typography>
                                                            <Typography variant="body2">{d.field}</Typography>
                                                        </Box>
                                                        <Box flex={1} textAlign="right">
                                                            <Typography variant="caption" color="text.secondary">No of Workers</Typography>
                                                            <Typography variant="body2">{d.count || d.workers}</Typography>
                                                        </Box>
                                                    </Box>
                                                ));
                                            }
                                        } catch (e) { return "No details available."; }
                                    })()}
                                    <Box mt={2} pt={2} borderTop="2px solid #ddd" display="flex" justifyContent="space-between">
                                        <Typography fontWeight="bold">Total Workers</Typography>
                                        <Typography fontWeight="bold">{selectedItem.quantity}</Typography>
                                    </Box>
                                </Card>
                            </Box>
                            <Box flex={2}>
                                <Typography variant="h6" gutterBottom>Worker Assignments</Typography>
                                <Box maxHeight={400} overflow="auto">
                                    {(() => {
                                        try {
                                            const details = JSON.parse(selectedItem.detailsRaw);
                                            if (Array.isArray(details)) {
                                                return details.map((d: any, idx: number) => (
                                                    <Box key={idx} mb={2} p={2} bgcolor="white" borderRadius={2} boxShadow={1}>
                                                        <Typography variant="subtitle2" color="primary">{d.task} - {d.field}</Typography>
                                                        <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                                                            {d.assigned && d.assigned.map((w: any, i: number) => {
                                                                // Find worker gender
                                                                const worker = workerMap.get(w.id);
                                                                const isFemale = worker?.gender === 'FEMALE';
                                                                return (
                                                                    <Chip
                                                                        key={i}
                                                                        avatar={<Avatar sx={{ bgcolor: isFemale ? '#f48fb1' : '#90caf9', color: 'white' }}>
                                                                            {isFemale ? <WomanIcon /> : <ManIcon />}
                                                                        </Avatar>}
                                                                        label={w.name}
                                                                        variant="outlined"
                                                                        sx={{ borderRadius: 2 }}
                                                                    />
                                                                );
                                                            })}
                                                        </Box>
                                                    </Box>
                                                ));
                                            }
                                        } catch (e) { return null; }
                                    })()}
                                </Box>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, bgcolor: '#e8f5e9' }}>
                    <Button onClick={() => setSelectedItem(null)}>Close</Button>
                    {viewStatus === 'PENDING' ? (
                        <>
                            <Button variant="outlined" color="error" startIcon={<CancelIcon />} onClick={handleReject}>Reject</Button>
                            <Button variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={handleApprove}>Approve & Sign</Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outlined" color="error" startIcon={<CancelIcon />} onClick={handleReject}>Delete Record (Reset)</Button>
                            <Button onClick={() => setSelectedItem(null)}>Close</Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>

            <Snackbar open={!!notification} autoHideDuration={4000} onClose={() => setNotification(null)}>
                <Alert severity={notification?.severity || 'info'}>{notification?.message}</Alert>
            </Snackbar>
        </Box>
    );
}
