import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    TextField,
    MenuItem,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Divider,
    Avatar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    CircularProgress,
    Alert,
    Stack,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import axios from 'axios';
import { useLanguage } from '../../../context/LanguageContext';

export default function LeaveApplication() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const userId = userSession.userId || userSession.id;
    const tenantId = userSession.tenantId;
    const userName = userSession.fullName || userSession.username || 'Staff Member';
    const designation = userSession.role === 'FIELD_OFFICER' ? 'Field Officer' : 'Staff';
    const applicationDate = new Date().toLocaleDateString('en-CA');
    const { t } = useLanguage();

    // Form State
    const [leaveType, setLeaveType] = useState('Annual');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [daysApplying, setDaysApplying] = useState<number | ''>('');
    const [reason, setReason] = useState('');
    const [address, setAddress] = useState('');
    const [contactNo, setContactNo] = useState('');
    const [actingPerson, setActingPerson] = useState('NONE');
    const [actingOfficers, setActingOfficers] = useState<any[]>([]);

    // Loading / error
    const [loadingBalances, setLoadingBalances] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [balanceError, setBalanceError] = useState('');

    // Leave Balance State — ALL from backend
    const [quota, setQuota] = useState({ dutyLeave: 0, annualLeave: 0, casualLeave: 0 });
    const [taken, setTaken] = useState({ dutyLeave: 0, annualLeave: 0, casualLeave: 0 });

    // Past applications for this user
    const [myApplications, setMyApplications] = useState<any[]>([]);

    // Dialog
    const [openSuccess, setOpenSuccess] = useState(false);

    // ─── Fetch quota + taken days from backend ───────────────────────────────
    const fetchBalances = React.useCallback(async (isPolling = false) => {
        if (!userId) return;
        if (!isPolling) setLoadingBalances(true);
        setBalanceError('');
        try {
            const [quotaRes, takenRes, appsRes] = await Promise.all([
                axios.get(`/api/operations/leaves/users/${userId}/quota`),
                axios.get(`/api/operations/leaves/users/${userId}/taken`),
                axios.get(`/api/operations/leaves/users/${userId}/applications`)
            ]);
            setQuota(quotaRes.data);
            setTaken(takenRes.data);
            setMyApplications(appsRes.data || []);
        } catch (err) {
            console.error('Failed to fetch leave balances', err);
            if (!isPolling) setBalanceError('Could not load leave balance. Please try refreshing.');
        } finally {
            if (!isPolling) setLoadingBalances(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchBalances(false); // Initial load with spinner

        // ─── Polling for real-time updates (every 30 seconds) ────────────
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchBalances(true); // Background poll without spinner
            }
        }, 30000); 

        return () => clearInterval(interval);
    }, [fetchBalances]);

    // ─── Fetch acting officers ───────────────────────────────────────────────
    useEffect(() => {
        const fetchOfficers = async () => {
            if (!tenantId) return;
            try {
                const res = await axios.get(`/api/tenants/${tenantId}/users`);
                const officers = res.data
                    .filter((u: any) =>
                        (u.role === 'FIELD_OFFICER' || u.role === 'ASST_FIELD_OFFICER') &&
                        u.userId !== userId
                    )
                    .map((u: any) => ({ id: u.userId, name: u.fullName || u.username }));
                setActingOfficers(officers);
            } catch (err) {
                console.error('Failed to fetch officers', err);
            }
        };
        fetchOfficers();
    }, [tenantId, userId]);

    const officerMap = actingOfficers.reduce((acc: any, off: any) => {
        acc[off.id] = off.name;
        return acc;
    }, {});

    // ─── Auto-calculate days ─────────────────────────────────────────────────
    useEffect(() => {
        if (fromDate && toDate) {
            const start = new Date(fromDate);
            const end = new Date(toDate);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
                const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                setDaysApplying(diffDays);
            } else {
                setDaysApplying('');
            }
        } else {
            setDaysApplying('');
        }
    }, [fromDate, toDate]);

    // ─── Helpers ─────────────────────────────────────────────────────────────
    const getAvailable = (type: 'Duty' | 'Annual' | 'Casual') => {
        if (type === 'Duty') return quota.dutyLeave;
        if (type === 'Annual') return quota.annualLeave;
        return quota.casualLeave;
    };
    const getTaken = (type: 'Duty' | 'Annual' | 'Casual') => {
        if (type === 'Duty') return taken.dutyLeave;
        if (type === 'Annual') return taken.annualLeave;
        return taken.casualLeave;
    };
    const getApplying = (type: 'Duty' | 'Annual' | 'Casual') =>
        leaveType === type ? (Number(daysApplying) || 0) : 0;
    const getBalance = (type: 'Duty' | 'Annual' | 'Casual') =>
        getAvailable(type) - getTaken(type) - getApplying(type);

    // ─── Submit application to backend ───────────────────────────────────────
    const handleSubmit = async () => {
        if (!fromDate || !toDate || !daysApplying || Number(daysApplying) <= 0) {
            alert('Please fill in all required date fields.');
            return;
        }
        setSubmitLoading(true);
        try {
            await axios.post('/api/operations/leaves/applications', {
                tenantId,
                userId,
                userName,
                leaveType,
                fromDate,
                toDate,
                daysApplied: Number(daysApplying),
                reason,
                address,
                contactNo,
                actingPersonId: actingPerson !== 'NONE' ? actingPerson : null,
            });
            setOpenSuccess(true);
            fetchBalances(); // Refresh balance sheet immediately
        } catch (err: any) {
            alert('Failed to submit leave application: ' + (err.response?.data || err.message));
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleCloseSuccess = () => {
        setOpenSuccess(false);
        setReason('');
        setFromDate('');
        setToDate('');
        setDaysApplying(0);
        setActingPerson('NONE');
    };

    const recentApps = myApplications.slice(0, 5); // Show last 5 applications

    return (
        <Box sx={{ p: { xs: 1, sm: 2 } }}>
            <Box sx={{ mb: 1.5, px: 0.5 }}>
                <Typography variant="h6" fontWeight="bold" color="primary.dark">
                    {t('Leave Application')}
                </Typography>
            </Box>

            <Box>
                <Grid container spacing={2}>
                    {/* ── LEFT PANEL: Balance Sheet ─────────────────────── */}
                    <Grid size={{ xs: 12, md: 7 }}>
                        <Paper elevation={3} sx={{ p: 1, borderRadius: 2, bgcolor: '#f1f8e9' }}>
                            {/* Acting Roles - Mini Tabs */}
                            <Box display="flex" mb={1} borderBottom="1px solid #c5e1a5" sx={{ overflowX: 'auto', gap: 0.5 }}>
                                <Box sx={{ px: 1, py: 0.25, bgcolor: '#2e7d32', color: 'white', borderRadius: '4px 4px 0 0', fontWeight: 'bold', fontSize: '0.65rem' }}>FO</Box>
                                {actingOfficers.map((_, i) => (
                                    <Box key={i} sx={{ px: 1, py: 0.25, color: 'text.secondary', fontWeight: 'bold', fontSize: '0.65rem' }}>AFO {i+1}</Box>
                                ))}
                            </Box>

                            {/* Officer Info - Ultra Compact */}
                            <Box display="flex" alignItems="center" gap={1} mb={1.5} p={0.75} bgcolor="white" borderRadius={1} border="1px solid #e0e0e0">
                                <Avatar sx={{ width: 24, height: 24, bgcolor: '#2e7d32' }}><PersonIcon sx={{ fontSize: 16 }} /></Avatar>
                                <Box>
                                    <Typography sx={{ fontWeight: 'bold', fontSize: '0.8rem', lineHeight: 1.1 }}>{userName}</Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>{designation}</Typography>
                                </Box>
                            </Box>

                            {/* Leave Balance Table */}
                            <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.5, color: '#33691e', display: 'block' }}>{t('Leave Balance')}</Typography>

                            {balanceError && (
                                <Alert severity="error" sx={{ mb: 2, fontSize: '0.8rem' }}>{balanceError}</Alert>
                            )}

                            {loadingBalances ? (
                                <Box display="flex" justifyContent="center" py={4}>
                                    <CircularProgress size={28} color="success" />
                                </Box>
                            ) : (
                                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #c5e1a5', mb: 3, overflowX: 'auto' }}>
                                    <Table size="small" sx={{ minWidth: 280 }}>
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: '#dcedc8' }}>
                                                <TableCell sx={{ fontWeight: 'bold', py: 0.5, fontSize: '0.75rem' }}>{t('Metric')}</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, fontSize: '0.75rem' }}>{t('Duty')}</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, fontSize: '0.75rem' }}>{t('Annual')}</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, fontSize: '0.75rem' }}>{t('Casual')}</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell sx={{ py: 0.5, fontSize: '0.75rem' }}>{t('Available')}</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontSize: '0.75rem' }}>{getAvailable('Duty')}</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontSize: '0.75rem' }}>{getAvailable('Annual')}</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontSize: '0.75rem' }}>{getAvailable('Casual')}</TableCell>
                                            </TableRow>
                                            <TableRow sx={{ bgcolor: '#f9fbe7' }}>
                                                <TableCell sx={{ py: 0.5, fontSize: '0.75rem' }}>{t('Apply')}</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontSize: '0.75rem' }}>{getApplying('Duty')}</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontSize: '0.75rem' }}>{getApplying('Annual')}</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontSize: '0.75rem' }}>{getApplying('Casual')}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell sx={{ py: 0.5, fontSize: '0.75rem' }}>{t('Previous')}</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontSize: '0.75rem' }}>{getTaken('Duty')}</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontSize: '0.75rem' }}>{getTaken('Annual')}</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontSize: '0.75rem' }}>{getTaken('Casual')}</TableCell>
                                            </TableRow>
                                            <TableRow sx={{ bgcolor: '#fff3e0' }}>
                                                <TableCell sx={{ py: 0.5, fontSize: '0.75rem' }}>{t('To Date')}</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontSize: '0.75rem' }}>{getTaken('Duty') + getApplying('Duty')}</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontSize: '0.75rem' }}>{getTaken('Annual') + getApplying('Annual')}</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontSize: '0.75rem' }}>{getTaken('Casual') + getApplying('Casual')}</TableCell>
                                            </TableRow>
                                            <TableRow sx={{ borderTop: '2px solid #aed581' }}>
                                                <TableCell sx={{ py: 0.5, fontWeight: 'bold', fontSize: '0.75rem' }}>{t('Balance')}</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontWeight: 'bold', fontSize: '0.75rem', color: getBalance('Duty') < 0 ? 'error.main' : '#1b5e20' }}>{getBalance('Duty')}</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontWeight: 'bold', fontSize: '0.75rem', color: getBalance('Annual') < 0 ? 'error.main' : '#1b5e20' }}>{getBalance('Annual')}</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontWeight: 'bold', fontSize: '0.75rem', color: getBalance('Casual') < 0 ? 'error.main' : '#1b5e20' }}>{getBalance('Casual')}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}

                        </Paper>
                    </Grid>

                    {/* ── RIGHT PANEL: Application Form ─────────────────── */}
                    <Grid size={{ xs: 12, md: 5 }}>
                        <Paper elevation={3} sx={{ p: 1.5, borderRadius: 2 }}>
                            <Grid container spacing={1.5}>
                                <Grid size={{ xs: 12 }}>
                                    <Box sx={{ p: 1, bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1', mb: 1 }}>
                                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', mb: 0.5, display: 'block', textTransform: 'uppercase' }}>{t('Applicant Info')}</Typography>
                                        <Stack direction="row" spacing={2} divider={<Divider orientation="vertical" flexItem />}>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">{t('Name')}</Typography>
                                                <Typography variant="body2" fontWeight="700">{userName}</Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">{t('Position')}</Typography>
                                                <Typography variant="body2" fontWeight="700">{designation}</Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">{t('Date')}</Typography>
                                                <Typography variant="body2" fontWeight="700">{applicationDate}</Typography>
                                            </Box>
                                        </Stack>
                                    </Box>
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <Divider sx={{ my: 1, borderColor: '#c5e1a5' }} />
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <TextField select fullWidth label={t('Leave Type')} value={leaveType} onChange={(e) => setLeaveType(e.target.value)} size="small"
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                                        <MenuItem value="Annual">{t('Annual')}</MenuItem>
                                        <MenuItem value="Casual">{t('Casual')}</MenuItem>
                                        <MenuItem value="Duty">{t('Duty')}</MenuItem>
                                        <MenuItem value="Medical">{t('Medical')}</MenuItem>
                                    </TextField>
                                </Grid>

                                <Grid size={{ xs: 6 }}>
                                    <TextField fullWidth type="date" label={t('From')} InputLabelProps={{ shrink: true }}
                                        value={fromDate} onChange={(e) => setFromDate(e.target.value)} size="small" 
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <TextField fullWidth type="date" label={t('To')} InputLabelProps={{ shrink: true }}
                                        value={toDate} onChange={(e) => setToDate(e.target.value)} size="small" 
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: '#f0f4f8', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                                        <Typography variant="body2" fontWeight="700" color="text.secondary">{t('Total Days (calculated)')}</Typography>
                                        <Typography variant="h6" fontWeight="900" color="primary.dark">{daysApplying || '—'}</Typography>
                                    </Box>
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <TextField fullWidth label={t('Reason For Leave')} multiline rows={2}
                                        value={reason} onChange={(e) => setReason(e.target.value)} size="small" 
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <TextField fullWidth label={t('Address While on Leave')}
                                        value={address} onChange={(e) => setAddress(e.target.value)} size="small" 
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField fullWidth label={t('Contact Number')}
                                        value={contactNo} onChange={(e) => setContactNo(e.target.value)} size="small" 
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField select fullWidth label={t('Acting Arrangement')}
                                        value={actingPerson} onChange={(e) => setActingPerson(e.target.value)} size="small"
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                                        <MenuItem value="NONE"><em>None</em></MenuItem>
                                        {actingOfficers.length > 0 ? (
                                            actingOfficers.map((officer) => (
                                                <MenuItem key={officer.id} value={officer.id}>{officer.name}</MenuItem>
                                            ))
                                        ) : (
                                            <MenuItem disabled value="">No other officers found</MenuItem>
                                        )}
                                    </TextField>
                                </Grid>

                                <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
                                    <Button
                                        variant="contained" 
                                        fullWidth
                                        onClick={handleSubmit}
                                        disabled={submitLoading}
                                        startIcon={submitLoading ? <CircularProgress size={20} color="inherit" /> : undefined}
                                        sx={{ 
                                            bgcolor: '#2e7d32', 
                                            color: 'white', 
                                            fontWeight: 'bold', 
                                            py: 1.25,
                                            borderRadius: 2,
                                            boxShadow: '0 4px 12px rgba(46, 125, 50, 0.2)',
                                            '&:hover': { bgcolor: '#1b5e20' },
                                            fontSize: '0.9rem',
                                            textTransform: 'none'
                                        }}
                                    >
                                        {submitLoading ? t('Submitting Application...') : t('Submit Application')}
                                    </Button>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>

                    {/* ── BOTTOM PANEL: Recent Applications (Full Width) ── */}
                    <Grid size={{ xs: 12 }}>
                        {recentApps.length > 0 && (
                            <Paper elevation={3} sx={{ p: 2, borderRadius: 2 }}>
                                <Typography variant="subtitle2" fontWeight="bold" mb={1.5} color="#33691e">{t('Your Recent Leave Applications')}</Typography>
                                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #eeeeee', overflowX: 'auto' }}>
                                    <Table size="small" sx={{ minWidth: 700 }}>
                                        <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                                            <TableRow>
                                                <TableCell sx={{ py: 1, fontWeight: 'bold' }}>{t('Leave Type')}</TableCell>
                                                <TableCell sx={{ py: 1, fontWeight: 'bold' }}>{t('Submission Date')}</TableCell>
                                                <TableCell align="center" sx={{ py: 1, fontWeight: 'bold' }}>{t('Days')}</TableCell>
                                                <TableCell align="center" sx={{ py: 1, fontWeight: 'bold' }}>{t('Acting Person')}</TableCell>
                                                <TableCell align="center" sx={{ py: 1, fontWeight: 'bold' }}>{t('Status')}</TableCell>
                                                <TableCell sx={{ py: 1, fontWeight: 'bold' }}>{t('Manager Remarks (Optional)')}</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {recentApps.map((app) => (
                                                <TableRow key={app.id}>
                                                    <TableCell sx={{ fontSize: '0.85rem' }}>{app.leaveType}</TableCell>
                                                    <TableCell sx={{ fontSize: '0.85rem' }}>
                                                        {app.submittedAt ? (
                                                            <Box sx={{ whiteSpace: 'nowrap' }}>
                                                                <Typography component="span" sx={{ display: 'block', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                                    {new Date(app.submittedAt).toLocaleDateString('en-CA')}
                                                                </Typography>
                                                                <Typography component="span" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.75rem' }}>
                                                                    {new Date(app.submittedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                                </Typography>
                                                            </Box>
                                                        ) : '—'}
                                                    </TableCell>
                                                    <TableCell align="center" sx={{ fontSize: '0.85rem' }}>{app.daysApplied} Days</TableCell>
                                                    <TableCell align="center" sx={{ fontSize: '0.85rem' }}>
                                                        {(!app.actingPersonId || app.actingPersonId === 'NONE') ? 'None' : (officerMap[app.actingPersonId] || app.actingPersonId)}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        {app.status === 'PENDING' && <Chip label={t('Pending')} color="warning" size="small" icon={<AccessTimeIcon />} sx={{ fontWeight: 'bold' }} />}
                                                        {app.status === 'APPROVED' && <Chip label={t('Approved')} color="success" size="small" icon={<CheckCircleIcon />} sx={{ fontWeight: 'bold' }} />}
                                                        {app.status === 'REJECTED' && <Chip label={t('Rejected')} color="error" size="small" icon={<CancelIcon />} sx={{ fontWeight: 'bold' }} />}
                                                    </TableCell>
                                                    <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary', minWidth: 150, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                        {app.managerRemarks || t('Waiting for review...')}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                        )}
                    </Grid>
                </Grid>
            </Box>

            {/* Success Dialog */}
            <Dialog open={openSuccess} onClose={handleCloseSuccess}>
                <DialogTitle sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon color="success" /> {t('Application Submitted')}
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <DialogContentText color="text.primary">
                        Your leave application has been successfully submitted for approval.
                    </DialogContentText>
                    <DialogContentText variant="body2" sx={{ mt: 1 }}>
                        You will be notified once the Manager reviews your request.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleCloseSuccess} variant="contained" color="success" autoFocus>
                        {t('Okay, Got it')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
