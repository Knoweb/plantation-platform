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
    const [viewStatus, setViewStatus] = useState<'PENDING' | 'HISTORY'>('PENDING');
    const [workerMap, setWorkerMap] = useState<Map<string, any>>(new Map());

    // Review Item State
    const [selectedItem, setSelectedItem] = useState<any>(null);

    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    const [notification, setNotification] = useState<{ open: boolean, message: string, severity: 'success' | 'error' | 'warning' | 'info' } | null>(null);

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
            // Filter Logic:
            // If PENDING view, backend returns PENDING (if endpoint supports it or we filter here).
            // If HISTORY view, backend returns ALL (if status!=PENDING param).
            // So we need to filter "non-Pending" for History view.

            const musters = workRes.data
                .filter((item: any) => {
                    // Filter Morning/Evening Muster
                    const isMuster = item.workType === 'Morning Muster' || item.workType === 'Evening Muster';
                    if (!isMuster) return false;

                    // Filter based on View Status
                    if (viewStatus === 'PENDING') {
                        return item.status === 'PENDING' || !item.status; // Default to pending if null
                    } else {
                        // History: Show Approved or Rejected
                        return item.status === 'APPROVED' || item.status === 'REJECTED';
                    }
                })
                .map((item: any) => ({
                    id: item.workId,
                    displayId: item.workId.substring(0, 8),
                    type: item.workType,
                    detailsRaw: item.details,
                    date: item.workDate,
                    createdAt: item.createdAt,
                    actionAt: item.actionAt, // Include action timestamp
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
            if (viewStatus === 'PENDING') {
                await axios.put(`/api/tenants/daily-work/${selectedItem.id}/reject`);
                setNotification({ open: true, message: "Muster Rejected", severity: 'warning' });
            } else {
                await axios.delete(`/api/tenants/daily-work/${selectedItem.id}`);
                setNotification({ open: true, message: "Record Deleted", severity: 'success' });
            }
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
                <Button variant={viewStatus === 'HISTORY' ? "contained" : "outlined"} onClick={() => setViewStatus('HISTORY')}>History</Button>
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
                                <TableCell align="center">Status</TableCell>
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
                                            {/* Show Action Time if available (History), else Submission Time (Pending) */}
                                            {row.actionAt ? (
                                                <Typography variant="caption" color="primary" fontWeight="bold">
                                                    {row.status === 'APPROVED' ? 'Approved' : 'Rejected'}: {new Date(row.actionAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </Typography>
                                            ) : (
                                                row.createdAt && <Typography variant="caption" color="text.secondary">
                                                    Submitted: {new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={row.status || 'PENDING'}
                                                size="small"
                                                color={row.status === 'APPROVED' ? 'success' : row.status === 'REJECTED' ? 'error' : 'warning'}
                                                variant={row.status === 'PENDING' ? 'outlined' : 'filled'}
                                            />
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
                    <Chip label={viewStatus} color={viewStatus === 'HISTORY' ? 'success' : 'warning'} />
                </DialogTitle>
                <DialogContent sx={{ bgcolor: '#f1f8e9', p: 3 }}>
                    {selectedItem && (
                        <Box display="flex" gap={3} flexDirection={{ xs: 'column', md: 'row' }} mt={1} sx={{ height: '60vh' }}>
                            {/* Left Pane: Muster Chit */}
                            <Box flex={1} display="flex" flexDirection="column">
                                <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32', fontWeight: 'bold' }}>Muster Chit</Typography>
                                <Card variant="outlined" sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: '#ffffff', borderRadius: 2 }}>
                                    {(() => {
                                        try {
                                            const details = JSON.parse(selectedItem.detailsRaw);
                                            if (Array.isArray(details)) {
                                                return details.map((d: any, idx: number) => (
                                                    <Box key={idx} mb={1.5} display="flex" justifyContent="space-between" borderBottom="1px dashed #e0e0e0" pb={1}>
                                                        <Box flex={1}>
                                                            <Typography variant="caption" color="text.secondary" display="block">Work item</Typography>
                                                            <Typography variant="body2" fontWeight="600" color="#424242">{d.task}</Typography>
                                                        </Box>
                                                        <Box flex={1}>
                                                            <Typography variant="caption" color="text.secondary" display="block">Field No</Typography>
                                                            <Typography variant="body2" color="#424242">{d.field}</Typography>
                                                        </Box>
                                                        <Box flex={0.5} textAlign="right">
                                                            <Typography variant="caption" color="text.secondary" display="block">Workers</Typography>
                                                            <Typography variant="body2" fontWeight="600" color="#2e7d32">{d.count || d.workers}</Typography>
                                                        </Box>
                                                    </Box>
                                                ));
                                            }
                                        } catch (e) { return <Typography color="text.secondary" align="center">No details available.</Typography>; }
                                    })()}
                                    <Box mt={2} pt={2} borderTop="2px solid #edeff1" display="flex" justifyContent="space-between" bgcolor="#f9fbe7" p={1} borderRadius={1}>
                                        <Typography fontWeight="bold" color="#2e7d32">Total Workers</Typography>
                                        <Typography fontWeight="bold" color="#2e7d32">{selectedItem.quantity}</Typography>
                                    </Box>
                                </Card>
                            </Box>

                            {/* Right Pane: Worker Assignments */}
                            <Box flex={2} display="flex" flexDirection="column">
                                <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32', fontWeight: 'bold' }}>Worker Assignments</Typography>
                                <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
                                    {(() => {
                                        try {
                                            const details = JSON.parse(selectedItem.detailsRaw);
                                            if (Array.isArray(details)) {
                                                return details.map((d: any, idx: number) => (
                                                    <Box key={idx} mb={2} p={2} bgcolor="white" borderRadius={3} border="1px solid #e0e0e0" sx={{ '&:hover': { borderColor: '#a5d6a7', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' } }}>
                                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5} borderBottom="1px solid #f0f0f0" pb={1}>
                                                            <Typography variant="subtitle1" fontWeight="bold" color="#37474f">{d.task}</Typography>
                                                            <Chip label={d.field} size="small" variant="outlined" color="primary" sx={{ borderRadius: 1 }} />
                                                        </Box>
                                                        <Box display="flex" gap={1} flexWrap="wrap">
                                                            {d.assigned && d.assigned.length > 0 ? d.assigned.map((w: any, i: number) => {
                                                                const worker = workerMap.get(w.id);
                                                                const isFemale = worker?.gender === 'FEMALE';
                                                                return (
                                                                    <Chip
                                                                        key={i}
                                                                        avatar={
                                                                            <Avatar sx={{ bgcolor: isFemale ? '#f8bbd0' : '#bbdefb', color: isFemale ? '#c2185b' : '#0d47a1', width: 24, height: 24 }}>
                                                                                {isFemale ? <WomanIcon sx={{ fontSize: 16 }} /> : <ManIcon sx={{ fontSize: 16 }} />}
                                                                            </Avatar>
                                                                        }
                                                                        label={w.name}
                                                                        variant="outlined"
                                                                        size="small"
                                                                        sx={{ borderRadius: 4, bgcolor: '#fafafa', border: '1px solid #eeeeee' }}
                                                                    />
                                                                );
                                                            }) : (
                                                                <Typography variant="body2" color="text.secondary" fontStyle="italic">No specific workers assigned</Typography>
                                                            )}
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
