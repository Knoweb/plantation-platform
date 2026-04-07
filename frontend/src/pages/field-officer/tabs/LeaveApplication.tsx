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
    Alert
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import axios from 'axios';

export default function LeaveApplication() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const userId = userSession.userId || userSession.id;
    const tenantId = userSession.tenantId;
    const userName = userSession.fullName || userSession.username || 'Staff Member';
    const designation = userSession.role === 'FIELD_OFFICER' ? 'Field Officer' : 'Staff';
    const applicationDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format (today)

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
                    Leave Application
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
                            <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.5, color: '#33691e', display: 'block' }}>Leave Balance</Typography>

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
                                                <TableCell sx={{ fontWeight: 'bold', py: 0.5, fontSize: '0.75rem' }}>Metric</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, fontSize: '0.75rem' }}>Duty</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, fontSize: '0.75rem' }}>Annual</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, fontSize: '0.75rem' }}>Casual</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell sx={{ py: 0.5, fontSize: '0.75rem' }}>Available</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontSize: '0.75rem' }}>{getAvailable('Duty')}</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontSize: '0.75rem' }}>{getAvailable('Annual')}</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontSize: '0.75rem' }}>{getAvailable('Casual')}</TableCell>
                                            </TableRow>
                                            <TableRow sx={{ bgcolor: '#f9fbe7' }}>
                                                <TableCell sx={{ py: 0.5, fontSize: '0.75rem' }}>Apply</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontSize: '0.75rem' }}>{getApplying('Duty')}</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontSize: '0.75rem' }}>{getApplying('Annual')}</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontSize: '0.75rem' }}>{getApplying('Casual')}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell sx={{ py: 0.5, fontSize: '0.75rem' }}>Previous</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontSize: '0.75rem' }}>{getTaken('Duty')}</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontSize: '0.75rem' }}>{getTaken('Annual')}</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontSize: '0.75rem' }}>{getTaken('Casual')}</TableCell>
                                            </TableRow>
                                            <TableRow sx={{ bgcolor: '#fff3e0' }}>
                                                <TableCell sx={{ py: 0.5, fontSize: '0.75rem' }}>To Date</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontSize: '0.75rem' }}>{getTaken('Duty') + getApplying('Duty')}</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontSize: '0.75rem' }}>{getTaken('Annual') + getApplying('Annual')}</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontSize: '0.75rem' }}>{getTaken('Casual') + getApplying('Casual')}</TableCell>
                                            </TableRow>
                                            <TableRow sx={{ borderTop: '2px solid #aed581' }}>
                                                <TableCell sx={{ py: 0.5, fontWeight: 'bold', fontSize: '0.75rem' }}>Balance</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontWeight: 'bold', fontSize: '0.75rem', color: getBalance('Duty') < 0 ? 'error.main' : '#1b5e20' }}>{getBalance('Duty')}</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontWeight: 'bold', fontSize: '0.75rem', color: getBalance('Annual') < 0 ? 'error.main' : '#1b5e20' }}>{getBalance('Annual')}</TableCell>
                                                <TableCell align="center" sx={{ py: 0.5, fontWeight: 'bold', fontSize: '0.75rem', color: getBalance('Casual') < 0 ? 'error.main' : '#1b5e20' }}>{getBalance('Casual')}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}

                            {/* Recent Leave Applications Tracker */}
                            {recentApps.length > 0 && (
                                <>
                                    <Typography variant="subtitle2" fontWeight="bold" mb={1} color="#33691e">Recent Leave Applications:</Typography>
                                    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #eeeeee', overflowX: 'auto' }}>
                                        <Table size="small" sx={{ minWidth: 600 }}>
                                            <TableHead sx={{ bgcolor: '#eeeeee' }}>
                                                <TableRow>
                                                    <TableCell sx={{ py: 0.5, fontSize: '0.7rem' }}>Type</TableCell>
                                                    <TableCell sx={{ py: 0.5, fontSize: '0.7rem' }}>Submitted</TableCell>
                                                    <TableCell align="center" sx={{ py: 0.5, fontSize: '0.7rem' }}>Days</TableCell>
                                                    <TableCell align="center" sx={{ py: 0.5, fontSize: '0.7rem' }}>Acting</TableCell>
                                                    <TableCell align="center" sx={{ py: 0.5, fontSize: '0.7rem' }}>Status</TableCell>
                                                    <TableCell sx={{ py: 0.5, fontSize: '0.7rem' }}>Remarks</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {recentApps.map((app) => (
                                                    <TableRow key={app.id}>
                                                        <TableCell sx={{ fontSize: '0.8rem' }}>{app.leaveType}</TableCell>
                                                        <TableCell sx={{ fontSize: '0.8rem' }}>
                                                            {app.submittedAt ? (
                                                                <Box sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                                                                    <Typography component="span" sx={{ display: 'block', fontWeight: 'bold', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                                                        {new Date(app.submittedAt).toLocaleDateString('en-CA')}
                                                                    </Typography>
                                                                    <Typography component="span" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
                                                                        {new Date(app.submittedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                                    </Typography>
                                                                </Box>
                                                            ) : '—'}
                                                        </TableCell>
                                                        <TableCell align="center" sx={{ fontSize: '0.8rem' }}>{app.daysApplied}</TableCell>
                                                        <TableCell align="center" sx={{ fontSize: '0.75rem' }}>
                                                            {(!app.actingPersonId || app.actingPersonId === 'NONE') ? 'None' : (officerMap[app.actingPersonId] || app.actingPersonId)}
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            {app.status === 'PENDING' && <Chip label="Pending" color="warning" size="small" icon={<AccessTimeIcon />} />}
                                                            {app.status === 'APPROVED' && <Chip label="Approved" color="success" size="small" icon={<CheckCircleIcon />} />}
                                                            {app.status === 'REJECTED' && <Chip label="Rejected" color="error" size="small" icon={<CancelIcon />} />}
                                                        </TableCell>
                                                        <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary', minWidth: 120, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                            {app.managerRemarks || '—'}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </>
                            )}
                        </Paper>
                    </Grid>

                    {/* ── RIGHT PANEL: Application Form ─────────────────── */}
                    <Grid size={{ xs: 12, md: 5 }}>
                        <Paper elevation={3} sx={{ p: 1.5, borderRadius: 2 }}>
                            <Grid container spacing={1.5}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField fullWidth label="Name" value={userName} disabled variant="filled" size="small" />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField fullWidth label="Designation" value={designation} disabled variant="filled" size="small" />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField fullWidth label="Application Date" value={applicationDate} disabled variant="filled" size="small" />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        fullWidth label="No of Days" type="text"
                                        value={daysApplying}
                                        onChange={(e) => {
                                            const raw = e.target.value.replace(/[^0-9]/g, '');
                                            setDaysApplying(raw === '' ? '' : Number(raw));
                                        }}
                                        InputProps={{ inputProps: { min: 0 } }}
                                        size="small"
                                    />
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <Divider sx={{ my: 1, borderColor: '#c5e1a5' }} />
                                </Grid>

                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField fullWidth type="date" label="From" InputLabelProps={{ shrink: true }}
                                        value={fromDate} onChange={(e) => setFromDate(e.target.value)} size="small" />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField fullWidth type="date" label="To" InputLabelProps={{ shrink: true }}
                                        value={toDate} onChange={(e) => setToDate(e.target.value)} size="small" />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField select fullWidth label="Type" value={leaveType} onChange={(e) => setLeaveType(e.target.value)} size="small">
                                        <MenuItem value="Annual">Annual</MenuItem>
                                        <MenuItem value="Casual">Casual</MenuItem>
                                        <MenuItem value="Duty">Duty</MenuItem>
                                        <MenuItem value="Medical">Medical</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <TextField fullWidth label="Reason For Leave" multiline rows={1}
                                        value={reason} onChange={(e) => setReason(e.target.value)} size="small" />
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <TextField fullWidth label="Address While on Leave"
                                        value={address} onChange={(e) => setAddress(e.target.value)} size="small" />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField fullWidth label="Additional Contact No"
                                        value={contactNo} onChange={(e) => setContactNo(e.target.value)} size="small" />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField select fullWidth label="Acting Arrangement"
                                        value={actingPerson} onChange={(e) => setActingPerson(e.target.value)} size="small">
 drum
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

                                <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                    <Button
                                        variant="contained" size="small"
                                        onClick={handleSubmit}
                                        disabled={submitLoading}
                                        startIcon={submitLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
                                        sx={{ bgcolor: '#ffee58', color: 'black', fontWeight: 'bold', px: 3, '&:hover': { bgcolor: '#fdd835' }, fontSize: '0.75rem' }}
                                    >
                                        {submitLoading ? 'Submitting...' : 'Submit Application'}
                                    </Button>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>
                </Grid>
            </Box>

            {/* Success Dialog */}
            <Dialog open={openSuccess} onClose={handleCloseSuccess}>
                <DialogTitle sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon color="success" /> Application Submitted
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
                        Okay, Got it
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
