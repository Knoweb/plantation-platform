import { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../../../context/LanguageContext';
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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider
} from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import { Autocomplete } from '@mui/material';

export default function LeaveManagement() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;
    const { t } = useLanguage();

    const [tabIndex, setTabIndex] = useState(0);
    const [staffMembers, setStaffMembers] = useState<any[]>([]);
    const [selectedStaff, setSelectedStaff] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [quotas, setQuotas] = useState({ duty: 5, annual: 14, casual: 7 });

    // Leave Management State
    const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
    const [historyLeaves, setHistoryLeaves] = useState<any[]>([]);
    const [loadingLeaves, setLoadingLeaves] = useState(false);
    const [rejectDialog, setRejectDialog] = useState<{ open: boolean; appId: string | null; remarks: string }>({
        open: false, appId: null, remarks: ''
    });

    const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({
        open: false, message: '', severity: 'success'
    });

    // View Dialog state
    const [viewDialog, setViewDialog] = useState<{ open: boolean; application: any }>({
        open: false,
        application: null
    });
    const [editedActingPerson, setEditedActingPerson] = useState<string>('');
    const [managerRemarks, setManagerRemarks] = useState<string>('');

    const showNotification = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
        setNotification({ open: true, message, severity });
    };

    // ─── Fetch pending leave applications for this tenant ────────────────────
    const fetchPendingLeaves = async (isPolling = false) => {
        if (!tenantId) return;
        if (!isPolling) setLoadingLeaves(true);
        try {
            const res = await axios.get(`/api/operations/leaves/tenant/${tenantId}/applications`);
            const all = res.data || [];
            
            const pending = all.filter((a: any) => a.status === 'PENDING');
            setPendingLeaves(pending);
            
            const history = all.filter((a: any) => a.status !== 'PENDING')
                .sort((a: any, b: any) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
            setHistoryLeaves(history);
        } catch (err) {
            console.error('Failed to fetch leave applications', err);
        } finally {
            if (!isPolling) setLoadingLeaves(false);
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
        fetchPendingLeaves(false); // Initial load with spinner

        // ─── Polling for real-time updates (every 20 seconds) ────────────
        const interval = setInterval(() => {
            fetchPendingLeaves(true); // Background poll without spinner
        }, 20000);

        return () => clearInterval(interval);
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

    const handleApprove = async (appId: string) => {
        try {
            const remarksParam = managerRemarks ? `&remarks=${encodeURIComponent(managerRemarks)}` : '';
            const actingParam = editedActingPerson ? `&actingPersonId=${encodeURIComponent(editedActingPerson)}` : '';
            
            await axios.put(`/api/operations/leaves/applications/${appId}/review?status=APPROVED${remarksParam}${actingParam}`);
            showNotification('Leave approved successfully', 'success');
            setViewDialog({ open: false, application: null });
            fetchPendingLeaves();
        } catch {
            showNotification('Failed to approve leave', 'error');
        }
    };

    const handleRejectConfirm = async () => {
        const appId = rejectDialog.appId || viewDialog.application?.id;
        if (!appId) return;
        
        try {
            const remarks = rejectDialog.remarks || managerRemarks;
            const remarksParam = remarks ? `&remarks=${encodeURIComponent(remarks)}` : '';
            const actingParam = editedActingPerson ? `&actingPersonId=${encodeURIComponent(editedActingPerson)}` : '';

            await axios.put(`/api/operations/leaves/applications/${appId}/review?status=REJECTED${remarksParam}${actingParam}`);
            showNotification('Leave rejected', 'info');
            setRejectDialog({ open: false, appId: null, remarks: '' });
            setViewDialog({ open: false, application: null });
            fetchPendingLeaves();
        } catch {
            showNotification('Failed to reject leave', 'error');
        }
    };

    const handleOpenView = (app: any) => {
        setViewDialog({ open: true, application: app });
        setEditedActingPerson(app.actingPersonId || 'NONE');
        setManagerRemarks(app.managerRemarks || '');
    };

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <Typography variant="h6" fontWeight="bold" color="primary">
                {t('Staff Leave Management')}
            </Typography>

            <Box sx={{ borderBottom: '1px solid #e2e8f0', mb: 2, width: '100%', display: 'flex' }}>
                <Tabs 
                    value={tabIndex} 
                    onChange={(_, v) => setTabIndex(v)} 
                    sx={{ 
                        '& .MuiTabs-indicator': {
                            height: 2,
                            bgcolor: 'primary.main',
                        },
                        '& .MuiTab-root': {
                            minHeight: 40,
                            px: 1.5,
                            fontSize: '0.8rem',
                            textTransform: 'none',
                        }
                    }}
                >
                    <Tab 
                        label={t('Quotas')} 
                        icon={<EventAvailableIcon sx={{ fontSize: 18 }} />} 
                        iconPosition="start" 
                        sx={{ 
                            mr: 1, 
                            borderRadius: '4px 4px 0 0',
                            bgcolor: tabIndex === 0 ? 'transparent' : '#f8fafc',
                            fontWeight: tabIndex === 0 ? 'bold' : 500,
                            minHeight: 40,
                            fontSize: '0.75rem'
                        }}
                    />
                    <Tab
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <span>{t('Approvals')}</span>
                                {pendingLeaves.length > 0 && (
                                    <Box sx={{ 
                                        bgcolor: 'error.main', color: 'white', 
                                        borderRadius: '50%', width: 16, height: 16, 
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                        fontSize: '0.65rem', fontWeight: 'bold'
                                    }}>
                                        {pendingLeaves.length}
                                    </Box>
                                )}
                            </Box>
                        }
                        icon={<CheckCircleIcon sx={{ fontSize: 18 }} />}
                        iconPosition="start"
                        sx={{ 
                            mr: 1,
                            borderRadius: '4px 4px 0 0',
                            bgcolor: tabIndex === 1 ? 'transparent' : '#f8fafc',
                            fontWeight: tabIndex === 1 ? 'bold' : 500,
                            minHeight: 40,
                            fontSize: '0.75rem'
                        }}
                    />
                    <Tab
                        label={t('History')}
                        icon={<VisibilityIcon sx={{ fontSize: 18 }} />}
                        iconPosition="start"
                        sx={{ 
                            borderRadius: '4px 4px 0 0',
                            bgcolor: tabIndex === 2 ? 'transparent' : '#f8fafc',
                            fontWeight: tabIndex === 2 ? 'bold' : 500,
                            minHeight: 40,
                            fontSize: '0.75rem'
                        }}
                    />
                </Tabs>
            </Box>

            {/* ── TAB 1: CONFIGURE QUOTAS ─────────────────────────────── */}
            {tabIndex === 0 && (
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Paper sx={{ p: 2, height: '100%' }}>
                            <Typography variant="subtitle1" fontWeight="bold" mb={2}>{t('Select Staff Member')}</Typography>
                            {loading ? <CircularProgress /> : staffMembers.length === 0 ? (
                                <Typography>{t('No field staff found.')}</Typography>
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
                                    {t('Configure Quotas for')} {staffMembers.find(s => s.id === selectedStaff)?.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" mb={3}>
                                    {t('Set annual leave availability. Field Officers will see these values in their dashboard.')}
                                </Typography>
                                <Grid container spacing={3}>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <TextField fullWidth label={t('Duty Leave')} type="text" value={quotas.duty}
                                            onChange={(e) => setQuotas({ ...quotas, duty: Number(e.target.value.replace(/[^0-9]/g, '')) })}
                                            InputProps={{ inputProps: { min: 0, inputMode: 'numeric' } }} />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <TextField fullWidth label={t('Annual Leave')} type="text" value={quotas.annual}
                                            onChange={(e) => setQuotas({ ...quotas, annual: Number(e.target.value.replace(/[^0-9]/g, '')) })}
                                            InputProps={{ inputProps: { min: 0, inputMode: 'numeric' } }} />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <TextField fullWidth label={t('Casual Leave')} type="text" value={quotas.casual}
                                            onChange={(e) => setQuotas({ ...quotas, casual: Number(e.target.value.replace(/[^0-9]/g, '')) })}
                                            InputProps={{ inputProps: { min: 0, inputMode: 'numeric' } }} />
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <Button variant="contained" color="success" size="large" onClick={handleSaveQuota} sx={{ mt: 2 }}>
                                            {t('Update Quotas')}
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
                        <Typography variant="subtitle1" fontWeight="bold">{t('Pending Leave Requests')}</Typography>
                        {pendingLeaves.length > 0 && (
                            <Chip label={`${pendingLeaves.length} ${t('Pending')}`} color="error" size="small" />
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
                        <TableContainer component={Box} sx={{ overflowX: 'auto' }}>
                            <Table sx={{ minWidth: 700 }}>
                                        <TableHead sx={{ bgcolor: '#eeeeee' }}>
                                            <TableRow>
                                                <TableCell>Staff Name</TableCell>
                                                <TableCell>Leave Type</TableCell>
                                                <TableCell>Leave Dates</TableCell>
                                                <TableCell component="th">Days</TableCell>
                                                <TableCell align="right">Action</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {pendingLeaves.length > 0 ? (
                                                pendingLeaves.map((req) => (
                                                    <TableRow key={req.id}>
                                                        <TableCell sx={{ fontWeight: 'bold' }}>
                                                            {req.userName || '—'}
                                                            {(() => {
                                                                const staff = staffMembers.find(s => s.id === req.userId);
                                                                return staff ? ` (${staff.role})` : '';
                                                            })()}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip label={req.leaveType} color="primary" size="small" variant="outlined" />
                                                        </TableCell>
                                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                                            <Box sx={{ fontSize: '0.75rem', display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                                                <span>{req.fromDate}</span>
                                                                <span style={{ opacity: 0.5 }}>→</span>
                                                                <span>{req.toDate}</span>
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold' }}>{req.daysApplied}</TableCell>
                                                        <TableCell align="right">
                                                            <Button
                                                                size="small" variant="contained" color="primary"
                                                                startIcon={<VisibilityIcon />}
                                                                onClick={() => handleOpenView(req)}
                                                            >
                                                                {t('View')}
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                                <Typography color="text.secondary">{t('No pending leave requests at this time.')}</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>
            )}

            {/* ── TAB 2: HISTORY ────────────────────────────────────────── */}
            {tabIndex === 2 && (
                <Paper sx={{ p: 0, overflow: 'hidden', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" p={3} bgcolor="#f8fafc" borderBottom="1px solid #e0e0e0">
                        <Typography variant="h6" fontWeight="bold">{t('Leave Processing History')}</Typography>
                        <Chip label={`${historyLeaves.length} ${t('records')}`} size="small" variant="outlined" />
                    </Box>
                    <TableContainer component={Box} sx={{ maxHeight: '60vh', overflowX: 'auto' }}>
                        <Table stickyHeader size="small" sx={{ minWidth: 750 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Employee</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Leave Type</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Duration</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Days</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {historyLeaves.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                                            <Box sx={{ opacity: 0.5 }}>
                                                <Typography color="text.secondary">{t('No leave applications found in history.')}</Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    historyLeaves.map((app) => (
                                        <TableRow key={app.id} hover>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Avatar sx={{ width: 28, height: 28, fontSize: '0.8rem', bgcolor: 'primary.light' }}>
                                                        {app.userName?.charAt(0)}
                                                    </Avatar>
                                                    <Box>
                                                        <Typography variant="body2" fontWeight="bold">{app.userName}</Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {(staffMembers.find(s => s.id === app.userId)?.role) || 'Staff'}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.85rem' }}>{app.leaveType}</TableCell>
                                            <TableCell sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                                                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                                    <span>{app.fromDate}</span>
                                                    <span style={{ opacity: 0.5 }}>→</span>
                                                    <span>{app.toDate}</span>
                                                </Box>
                                            </TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>{app.daysApplied}</TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={app.status === 'APPROVED' ? 'Approved' : 'Rejected'} 
                                                    size="small" 
                                                    color={app.status === 'APPROVED' ? 'success' : 'error'} 
                                                    sx={{ fontWeight: 'bold', minWidth: 85 }} 
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Button 
                                                    size="small" 
                                                    onClick={() => handleOpenView(app)}
                                                    sx={{ fontSize: '0.75rem' }}
                                                >
                                                    {t('View Details')}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* Leave Details Dialog */}
            <Dialog open={viewDialog.open} onClose={() => setViewDialog({ open: false, application: null })} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight="bold">{t('Leave Application Details')}</Typography>
                    <Button onClick={() => setViewDialog({ open: false, application: null })} color="inherit"><CloseIcon /></Button>
                </DialogTitle>
                <DialogContent sx={{ py: 3 }}>
                    {viewDialog.application && (
                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary">{t('Staff Name')}</Typography>
                                <Typography variant="body1" fontWeight="bold">
                                    {viewDialog.application.userName}
                                    {(() => {
                                        const staff = staffMembers.find(s => s.id === viewDialog.application.userId);
                                        return staff ? ` (${staff.role})` : '';
                                    })()}
                                </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary">{t('Leave Type')}</Typography>
                                <Box mt={0.5}>
                                    <Chip label={viewDialog.application.leaveType} color="primary" size="small" />
                                </Box>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary">{t('From Date')}</Typography>
                                <Typography variant="body1">{viewDialog.application.fromDate}</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary">{t('To Date')}</Typography>
                                <Typography variant="body1">{viewDialog.application.toDate}</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary">{t('Days Applied')}</Typography>
                                <Typography variant="body1" fontWeight="bold">{viewDialog.application.daysApplied} Days</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary">{t('Applied On')}</Typography>
                                <Typography variant="body1">{viewDialog.application.submittedAt ? new Date(viewDialog.application.submittedAt + (viewDialog.application.submittedAt.includes('Z') ? '' : 'Z')).toLocaleDateString() : '—'}</Typography>
                            </Grid>

                            <Grid size={{ xs: 12 }}>
                                <Typography variant="caption" color="text.secondary">{t('Reason for Leave')}</Typography>
                                <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, bgcolor: '#f5f5f5' }}>
                                    <Typography variant="body2">{viewDialog.application.reason || 'No reason provided.'}</Typography>
                                </Paper>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary">{t('Contact Number')}</Typography>
                                <Typography variant="body1">{viewDialog.application.contactNo || '—'}</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary">{t('Address While on Leave')}</Typography>
                                <Typography variant="body1">{viewDialog.application.address || '—'}</Typography>
                            </Grid>

                            <Grid size={{ xs: 12 }}>
                                <Divider sx={{ my: 1 }} />
                            </Grid>

                            <Grid size={{ xs: 12 }}>
                                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>{t('Acting Arrangement')}</Typography>
                                <Autocomplete
                                    freeSolo
                                    disabled={viewDialog.application?.status !== 'PENDING'}
                                    options={staffMembers.filter(s => s.id !== viewDialog.application?.userId)}
                                    getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                                    value={staffMembers.find(s => s.id === editedActingPerson) || editedActingPerson}
                                    onChange={(_, newValue) => {
                                        if (typeof newValue === 'string') {
                                            setEditedActingPerson(newValue);
                                        } else if (newValue && newValue.id) {
                                            setEditedActingPerson(newValue.id);
                                        } else {
                                            setEditedActingPerson('');
                                        }
                                    }}
                                    renderInput={(params) => (
                                        <TextField 
                                            {...params} 
                                            label={t('Select or Type Acting Officer')} 
                                            size="small"
                                            onChange={(e) => setEditedActingPerson(e.target.value)}
                                        />
                                    )}
                                />
                            </Grid>

                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth label={t('Manager Remarks')}
                                    multiline rows={2}
                                    disabled={viewDialog.application?.status !== 'PENDING'}
                                    value={managerRemarks}
                                    onChange={(e) => setManagerRemarks(e.target.value)}
                                />
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
                    {viewDialog.application?.status === 'PENDING' ? (
                        <>
                            <Button 
                                variant="outlined" 
                                color="error" 
                                onClick={() => handleRejectConfirm()}
                            >
                                {t('Reject Application')}
                            </Button>
                            <Box flexGrow={1} />
                            <Button 
                                variant="contained" 
                                color="success" 
                                onClick={() => handleApprove(viewDialog.application.id)}
                            >
                                {t('Approve Leave')}
                            </Button>
                        </>
                    ) : (
                        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                            <Chip 
                                label={t(`Request ${viewDialog.application?.status === 'APPROVED' ? 'Approved' : 'Rejected'}`)} 
                                color={viewDialog.application?.status === 'APPROVED' ? 'success' : 'error'}
                                sx={{ fontWeight: 'bold', px: 2 }}
                            />
                        </Box>
                    )}
                </DialogActions>
            </Dialog>

            {/* Reject Confirmation Dialog (Keep as backup or simplified) */}
            <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, appId: null, remarks: '' })}>
                <DialogTitle sx={{ fontWeight: 'bold' }}>{t('Reject Leave Request')}</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Typography variant="body2" mb={2} color="text.secondary">
                        Optionally provide a reason for rejection. The Field Officer will see this message.
                    </Typography>
                    <TextField
                        fullWidth label={t('Reason for Rejection (Optional)')}
                        multiline rows={3}
                        value={rejectDialog.remarks}
                        onChange={(e) => setRejectDialog(prev => ({ ...prev, remarks: e.target.value }))}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setRejectDialog({ open: false, appId: null, remarks: '' })} sx={{ color: 'text.secondary' }}>{t('Cancel')}</Button>
                    <Button variant="contained" color="error" onClick={handleRejectConfirm}>{t('Confirm Reject')}</Button>
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
