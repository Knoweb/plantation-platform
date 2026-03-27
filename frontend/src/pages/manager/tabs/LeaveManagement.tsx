import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Box,
    Typography,
    Paper,
    Grid,
    TextField,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Tab,
    Alert,
    Snackbar,
    Chip,
    Avatar,
    CircularProgress,
    Badge,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function LeaveManagement() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    const [tabIndex, setTabIndex] = useState(0);
    const [staffMembers, setStaffMembers] = useState<any[]>([]);
    const [selectedStaff, setSelectedStaff] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [quotas, setQuotas] = useState({ duty: 5, annual: 14, casual: 7 });

    // Leave Approvals State
    const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
    const [loadingLeaves, setLoadingLeaves] = useState(false);
    const [rejectDialog, setRejectDialog] = useState<{ open: boolean; appId: string | null; remarks: string }>({
        open: false, appId: null, remarks: ''
    });

    const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({
        open: false, message: '', severity: 'success'
    });

    const showNotification = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
        setNotification({ open: true, message, severity });
    };

    // ─── Fetch pending leave applications for this tenant ────────────────────
    const fetchPendingLeaves = async () => {
        if (!tenantId) return;
        setLoadingLeaves(true);
        try {
            const res = await axios.get(`/api/operations/leaves/tenant/${tenantId}/applications`);
            const pending = (res.data || []).filter((a: any) => a.status === 'PENDING');
            setPendingLeaves(pending);
        } catch (err) {
            console.error('Failed to fetch leave applications', err);
        } finally {
            setLoadingLeaves(false);
        }
    };

    // ─── Fetch Field Officers ────────────────────────────────────────────────
    useEffect(() => {
        const fetchStaff = async () => {
            if (!tenantId) return;
            try {
                const res = await axios.get(`/api/tenants/${tenantId}/users`);
                const officers = res.data
                    .filter((u: any) => u.role === 'FIELD_OFFICER' || u.role === 'ASST_FIELD_OFFICER')
                    .map((u: any) => ({
                        id: u.userId,
                        name: u.fullName || u.username,
                        role: u.role === 'FIELD_OFFICER' ? 'Field Officer' : 'Asst. Field Officer'
                    }));
                setStaffMembers(officers);
            } catch (error) {
                console.error('Failed to fetch staff', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStaff();
        fetchPendingLeaves();
    }, [tenantId]);

    // ─── Fetch quota when a staff member is selected ─────────────────────────
    useEffect(() => {
        if (!selectedStaff) return;
        const fetchQuota = async () => {
            try {
                const res = await axios.get(`/api/operations/leaves/users/${selectedStaff}/quota`);
                if (res.data) {
                    setQuotas({
                        duty: res.data.dutyLeave,
                        annual: res.data.annualLeave,
                        casual: res.data.casualLeave
                    });
                }
            } catch {
                setQuotas({ duty: 5, annual: 14, casual: 7 });
            }
        };
        fetchQuota();
    }, [selectedStaff]);

    const handleSaveQuota = async () => {
        if (!selectedStaff || !tenantId) return;
        try {
            await axios.put(`/api/operations/leaves/users/${selectedStaff}/quota`, {
                tenantId,
                userId: selectedStaff,
                dutyLeave: quotas.duty,
                annualLeave: quotas.annual,
                casualLeave: quotas.casual
            });
            const staffName = staffMembers.find(s => s.id === selectedStaff)?.name || 'Staff';
            showNotification(`Quotas updated for ${staffName}`, 'success');
        } catch (error) {
            showNotification('Failed to update quotas', 'error');
        }
    };

    // ─── Approve / Reject actions ────────────────────────────────────────────
    const handleApprove = async (appId: string) => {
        try {
            await axios.put(`/api/operations/leaves/applications/${appId}/review?status=APPROVED`);
            showNotification('Leave approved successfully', 'success');
            fetchPendingLeaves();
        } catch {
            showNotification('Failed to approve leave', 'error');
        }
    };

    const handleRejectConfirm = async () => {
        if (!rejectDialog.appId) return;
        try {
            const remarksParam = rejectDialog.remarks
                ? `&remarks=${encodeURIComponent(rejectDialog.remarks)}`
                : '';
            await axios.put(`/api/operations/leaves/applications/${rejectDialog.appId}/review?status=REJECTED${remarksParam}`);
            showNotification('Leave rejected', 'info');
            setRejectDialog({ open: false, appId: null, remarks: '' });
            fetchPendingLeaves();
        } catch {
            showNotification('Failed to reject leave', 'error');
        }
    };

    return (
        <Box p={3}>
            <Typography variant="h4" fontWeight="bold" color="primary" gutterBottom>
                Staff Leave Management
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={3}>
                Configure leave quotas and approve leave requests for your Field Officers.
            </Typography>

            <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Tab label="Leave Quotas" icon={<EventAvailableIcon />} iconPosition="start" />
                <Tab
                    label={
                        <Badge badgeContent={pendingLeaves.length} color="error" sx={{ '& .MuiBadge-badge': { right: -12, top: 2 } }}>
                            Leave Approvals
                        </Badge>
                    }
                    icon={<CheckCircleIcon />}
                    iconPosition="start"
                />
            </Tabs>

            {/* ── TAB 1: CONFIGURE QUOTAS ─────────────────────────────── */}
            {tabIndex === 0 && (
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Paper sx={{ p: 2, height: '100%' }}>
                            <Typography variant="subtitle1" fontWeight="bold" mb={2}>Select Staff Member</Typography>
                            {loading ? <CircularProgress /> : staffMembers.length === 0 ? (
                                <Typography>No field staff found.</Typography>
                            ) : (
                                staffMembers.map(staff => (
                                    <Box
                                        key={staff.id}
                                        onClick={() => setSelectedStaff(staff.id)}
                                        sx={{
                                            p: 2, mb: 1, borderRadius: 1, cursor: 'pointer',
                                            bgcolor: selectedStaff === staff.id ? '#e8f5e9' : 'transparent',
                                            border: selectedStaff === staff.id ? '1px solid #4caf50' : '1px solid transparent',
                                            display: 'flex', alignItems: 'center', gap: 2,
                                            '&:hover': { bgcolor: '#f1f8e9' }
                                        }}
                                    >
                                        <Avatar sx={{ bgcolor: selectedStaff === staff.id ? '#2e7d32' : 'grey.400' }}>
                                            <PersonIcon />
                                        </Avatar>
                                        <Box>
                                            <Typography variant="body2" fontWeight="bold">{staff.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">{staff.role}</Typography>
                                        </Box>
                                    </Box>
                                ))
                            )}
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, md: 8 }}>
                        {selectedStaff && (
                            <Paper sx={{ p: 3 }}>
                                <Typography variant="h6" gutterBottom color="primary.dark">
                                    Configure Quotas for {staffMembers.find(s => s.id === selectedStaff)?.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" mb={3}>
                                    Set annual leave availability. Field Officers will see these values in their dashboard.
                                </Typography>
                                <Grid container spacing={3}>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <TextField fullWidth label="Duty Leave" type="text" value={quotas.duty}
                                            onChange={(e) => setQuotas({ ...quotas, duty: Number(e.target.value.replace(/[^0-9]/g, '')) })}
                                            InputProps={{ inputProps: { min: 0, inputMode: 'numeric' } }} />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <TextField fullWidth label="Annual Leave" type="text" value={quotas.annual}
                                            onChange={(e) => setQuotas({ ...quotas, annual: Number(e.target.value.replace(/[^0-9]/g, '')) })}
                                            InputProps={{ inputProps: { min: 0, inputMode: 'numeric' } }} />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <TextField fullWidth label="Casual Leave" type="text" value={quotas.casual}
                                            onChange={(e) => setQuotas({ ...quotas, casual: Number(e.target.value.replace(/[^0-9]/g, '')) })}
                                            InputProps={{ inputProps: { min: 0, inputMode: 'numeric' } }} />
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <Button variant="contained" color="success" size="large" onClick={handleSaveQuota} sx={{ mt: 2 }}>
                                            Update Quotas
                                        </Button>
                                    </Grid>
                                </Grid>
                            </Paper>
                        )}
                    </Grid>
                </Grid>
            )}

            {/* ── TAB 2: LEAVE APPROVALS ──────────────────────────────── */}
            {tabIndex === 1 && (
                <Paper sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="subtitle1" fontWeight="bold">Pending Leave Requests</Typography>
                        {pendingLeaves.length > 0 && (
                            <Chip label={`${pendingLeaves.length} Pending`} color="error" size="small" />
                        )}
                    </Box>

                    {pendingLeaves.length > 0 && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            You have <b>{pendingLeaves.length} leave request{pendingLeaves.length > 1 ? 's' : ''}</b> pending approval. Please review them promptly.
                        </Alert>
                    )}

                    {loadingLeaves ? (
                        <Box display="flex" justifyContent="center" py={4}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table>
                                <TableHead sx={{ bgcolor: '#eeeeee' }}>
                                    <TableRow>
                                        <TableCell>Staff Name</TableCell>
                                        <TableCell>Leave Type</TableCell>
                                        <TableCell>From</TableCell>
                                        <TableCell>To</TableCell>
                                        <TableCell>Days</TableCell>
                                        <TableCell>Reason</TableCell>
                                        <TableCell>Applied On</TableCell>
                                        <TableCell align="right">Action</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {pendingLeaves.length > 0 ? (
                                        pendingLeaves.map((req) => (
                                            <TableRow key={req.id}>
                                                <TableCell sx={{ fontWeight: 'bold' }}>{req.userName || '—'}</TableCell>
                                                <TableCell>
                                                    <Chip label={req.leaveType} color="primary" size="small" variant="outlined" />
                                                </TableCell>
                                                <TableCell>{req.fromDate}</TableCell>
                                                <TableCell>{req.toDate}</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>{req.daysApplied}</TableCell>
                                                <TableCell sx={{ color: 'text.secondary', maxWidth: 200 }}>{req.reason || '—'}</TableCell>
                                                <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                                                    {req.submittedAt ? new Date(req.submittedAt + (req.submittedAt.includes('Z') ? '' : 'Z')).toLocaleDateString() : '—'}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Box display="flex" gap={1} justifyContent="flex-end">
                                                        <Button
                                                            size="small" color="error" variant="outlined"
                                                            onClick={() => setRejectDialog({ open: true, appId: req.id, remarks: '' })}
                                                        >
                                                            Reject
                                                        </Button>
                                                        <Button
                                                            size="small" variant="contained" color="success"
                                                            onClick={() => handleApprove(req.id)}
                                                        >
                                                            Approve
                                                        </Button>
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                                <Typography color="text.secondary">No pending leave requests at this time.</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>
            )}

            {/* Reject Confirmation Dialog */}
            <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, appId: null, remarks: '' })}>
                <DialogTitle sx={{ fontWeight: 'bold' }}>Reject Leave Request</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Typography variant="body2" mb={2} color="text.secondary">
                        Optionally provide a reason for rejection. The Field Officer will see this message.
                    </Typography>
                    <TextField
                        fullWidth label="Reason for Rejection (Optional)"
                        multiline rows={3}
                        value={rejectDialog.remarks}
                        onChange={(e) => setRejectDialog(prev => ({ ...prev, remarks: e.target.value }))}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setRejectDialog({ open: false, appId: null, remarks: '' })} sx={{ color: 'text.secondary' }}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleRejectConfirm}>Confirm Reject</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={notification.open} autoHideDuration={4000} onClose={() => setNotification({ ...notification, open: false })}>
                <Alert severity={notification.severity} onClose={() => setNotification({ ...notification, open: false })}>
                    {notification.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
