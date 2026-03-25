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
    DialogActions
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AccessTimeIcon from '@mui/icons-material/AccessTime'; // Pending icon
import PersonIcon from '@mui/icons-material/Person';
import axios from 'axios';

export default function LeaveApplication() {
    // Current User Mock
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const userName = userSession.fullName || userSession.username || 'Staff Member';
    const designation = userSession.role === 'FIELD_OFFICER' ? 'Field Officer' : 'Staff';
    const appointmentDate = '2020-05-15'; // Mock

    // Form State
    const [leaveType, setLeaveType] = useState('Annual');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [daysApplying, setDaysApplying] = useState(0);
    const [reason, setReason] = useState('');
    const [address, setAddress] = useState('');
    const [contactNo, setContactNo] = useState('');
    const [actingPerson, setActingPerson] = useState('NONE');
    const [actingOfficers, setActingOfficers] = useState<any[]>([]);

    useEffect(() => {
        const fetchOfficers = async () => {
            if (!userSession.tenantId) return;
            try {
                const res = await axios.get(`/api/tenants/${userSession.tenantId}/users`);
                const officers = res.data
                    .filter((u: any) =>
                        (u.role === 'FIELD_OFFICER' || u.role === 'ASST_FIELD_OFFICER') &&
                        u.userId !== userSession.userId
                    )
                    .map((u: any) => ({
                        id: u.userId,
                        name: u.fullName || u.username
                    }));
                setActingOfficers(officers);
            } catch (err) {
                console.error("Failed to fetch officers", err);
            }
        };
        fetchOfficers();
    }, [userSession.tenantId, userSession.userId]);

    // Mock Data for Leave Balances
    const [balances, setBalances] = useState({
        Duty: { available: 5, taken: 1, pending: 0 },
        Annual: { available: 14, taken: 4, pending: 0 },
        Casual: { available: 7, taken: 2, pending: 0 }
    });

    // Fetch quotas set by Manager
    useEffect(() => {
        // Use userSession.userId if available, fallback to 'FO' for dev
        const userId = userSession.userId || 'FO';
        const storedQuotas = localStorage.getItem(`leave_quota_${userId}`);

        const fetchQuota = async () => {
            try {
                const response = await axios.get(`/api/operations/leaves/users/${userId}/quota`);
                if (response.data) {
                    setBalances(prev => ({
                        ...prev,
                        Duty: { ...prev.Duty, available: response.data.dutyLeave },
                        Annual: { ...prev.Annual, available: response.data.annualLeave },
                        Casual: { ...prev.Casual, available: response.data.casualLeave }
                    }));
                }
            } catch (error) {
                console.error("Failed to fetch quota", error);
            }
        };

        if (storedQuotas) {
            const parsed = JSON.parse(storedQuotas);
            setBalances(prev => ({
                ...prev,
                Duty: { ...prev.Duty, available: parsed.duty },
                Annual: { ...prev.Annual, available: parsed.annual },
                Casual: { ...prev.Casual, available: parsed.casual }
            }));
        } else {
            fetchQuota();
        }
    }, [userSession.userId]);

    // Mock Pending Requests
    const pendingRequests: any[] = [
        // { date: '2024-06-20', acting: true, manager: false, reason: 'Personal' }
    ];

    // Calculate Days
    useEffect(() => {
        if (fromDate && toDate) {
            const start = new Date(fromDate);
            const end = new Date(toDate);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
                const diffTime = Math.abs(end.getTime() - start.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                setDaysApplying(diffDays);
            } else {
                setDaysApplying(0);
            }
        } else {
            setDaysApplying(0);
        }
    }, [fromDate, toDate]);

    const [openSuccess, setOpenSuccess] = useState(false);

    // Handle Submit
    const handleSubmit = () => {
        // Here you would typically send data to backend
        setOpenSuccess(true);
    };

    const handleCloseSuccess = () => {
        setOpenSuccess(false);
        // Reset form logic if desired
        setReason('');
        setFromDate('');
        setToDate('');
        setDaysApplying(0);
        setActingPerson('NONE');
    };

    return (
        <Box>
            {/* Standard Header */}
            <Box sx={{ px: { xs: 1.5, sm: 3 }, py: { xs: 1.5, sm: 2 } }}>
                <Typography variant="h4" fontWeight="bold" color="primary.dark" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
                    Leave Application
                </Typography>
            </Box>

            <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>

                <Grid container spacing={4}>
                    {/* LEFT PANEL: Balances & Status */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Paper elevation={3} sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, bgcolor: '#f1f8e9' }}>

                            {/* Role Tabs - Dynamic based on actual officers */}
                            <Box display="flex" mb={2} borderBottom="1px solid #c5e1a5" sx={{ overflowX: 'auto' }}>
                                <Box
                                    sx={{
                                        px: 2, py: 1,
                                        bgcolor: '#2e7d32',
                                        color: 'white',
                                        cursor: 'default',
                                        fontWeight: 'bold',
                                        fontSize: '0.85rem',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    FO
                                </Box>
                                {actingOfficers.map((officer, index) => (
                                    <Box
                                        key={officer.id}
                                        title={officer.name}
                                        sx={{
                                            px: 2, py: 1,
                                            bgcolor: 'transparent',
                                            color: 'text.secondary',
                                            cursor: 'default',
                                            fontWeight: 'bold',
                                            fontSize: '0.85rem',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        AFO {index + 1}
                                    </Box>
                                ))}
                            </Box>

                            {/* Officer Info Card */}
                            <Box display="flex" alignItems="center" gap={2} mb={3} p={1} bgcolor="white" borderRadius={2} border="1px solid #e0e0e0">
                                <Avatar sx={{ bgcolor: '#2e7d32' }}><PersonIcon /></Avatar>
                                <Box>
                                    <Typography variant="subtitle2" fontWeight="bold">{userName}</Typography>
                                    <Typography variant="caption" color="text.secondary">{designation}</Typography>
                                </Box>
                            </Box>

                            {/* Leave Balance Table */}
                            <Typography variant="subtitle2" fontWeight="bold" mb={1} color="#33691e">Leave Balance</Typography>
                            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #c5e1a5', mb: 3, overflowX: 'auto' }}>
                                <Table size="small" sx={{ minWidth: 300 }}>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#dcedc8' }}>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Metric</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Duty</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Annual</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Casual</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell component="th" scope="row">Available</TableCell>
                                            <TableCell align="center">{balances.Duty.available}</TableCell>
                                            <TableCell align="center">{balances.Annual.available}</TableCell>
                                            <TableCell align="center">{balances.Casual.available}</TableCell>
                                        </TableRow>
                                        <TableRow sx={{ bgcolor: '#f9fbe7' }}>
                                            <TableCell component="th" scope="row">Apply</TableCell>
                                            <TableCell align="center">{leaveType === 'Duty' ? daysApplying : 0}</TableCell>
                                            <TableCell align="center">{leaveType === 'Annual' ? daysApplying : 0}</TableCell>
                                            <TableCell align="center">{leaveType === 'Casual' ? daysApplying : 0}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell component="th" scope="row">Previous</TableCell>
                                            <TableCell align="center">{balances.Duty.taken}</TableCell>
                                            <TableCell align="center">{balances.Annual.taken}</TableCell>
                                            <TableCell align="center">{balances.Casual.taken}</TableCell>
                                        </TableRow>
                                        <TableRow sx={{ bgcolor: '#fff3e0' }}>
                                            <TableCell component="th" scope="row">To Date</TableCell>
                                            <TableCell align="center">{balances.Duty.taken + (leaveType === 'Duty' ? daysApplying : 0)}</TableCell>
                                            <TableCell align="center">{balances.Annual.taken + (leaveType === 'Annual' ? daysApplying : 0)}</TableCell>
                                            <TableCell align="center">{balances.Casual.taken + (leaveType === 'Casual' ? daysApplying : 0)}</TableCell>
                                        </TableRow>
                                        <TableRow sx={{ borderTop: '2px solid #aed581' }}>
                                            <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Balance</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold', color: '#1b5e20' }}>
                                                {balances.Duty.available - balances.Duty.taken - (leaveType === 'Duty' ? daysApplying : 0)}
                                            </TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold', color: '#1b5e20' }}>
                                                {balances.Annual.available - balances.Annual.taken - (leaveType === 'Annual' ? daysApplying : 0)}
                                            </TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold', color: '#1b5e20' }}>
                                                {balances.Casual.available - balances.Casual.taken - (leaveType === 'Casual' ? daysApplying : 0)}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>

                                    {/* Pending Leave Tracker - Only visible if there are requests */}
                                    {pendingRequests.length > 0 && (
                                        <>
                                            <Typography variant="subtitle2" fontWeight="bold" mb={1} color="#33691e">Pending Leave Status:</Typography>
                                            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #eeeeee', overflowX: 'auto' }}>
                                                <Table size="small" sx={{ minWidth: 400 }}>
                                            <TableHead sx={{ bgcolor: '#eeeeee' }}>
                                                <TableRow>
                                                    <TableCell>Date</TableCell>
                                                    <TableCell align="center">Acting</TableCell>
                                                    <TableCell align="center">Manager</TableCell>
                                                    <TableCell>Reason</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {pendingRequests.map((req, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell sx={{ fontSize: '0.8rem' }}>{req.date}</TableCell>
                                                        <TableCell align="center">
                                                            {req.acting ? <CheckCircleIcon color="success" fontSize="small" /> : <AccessTimeIcon color="warning" fontSize="small" />}
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            {req.manager ? <CheckCircleIcon color="success" fontSize="small" /> : <CancelIcon color="error" fontSize="small" />}
                                                        </TableCell>
                                                        <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{req.reason}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </>
                            )}
                        </Paper>
                    </Grid>

                    {/* RIGHT PANEL: Application Form */}
                    <Grid size={{ xs: 12, md: 8 }}>
                        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 2 }}>
                            <Grid container spacing={3}>
                                {/* Static Info */}
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField fullWidth label="Name" value={userName} disabled variant="filled" size="small" />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField fullWidth label="Designation" value={designation} disabled variant="filled" size="small" />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField fullWidth label="Date of Appointment" value={appointmentDate} disabled variant="filled" size="small" />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        fullWidth
                                        label="No of Days Applying"
                                        type="text"
                                        value={daysApplying}
                                        onChange={(e) => {
                                            const val = Number(e.target.value.replace(/[^0-9]/g, ''));
                                            setDaysApplying(val);
                                        }}
                                        InputProps={{ inputProps: { min: 0, inputMode: 'numeric', pattern: '[0-9]*' } }}
                                        sx={{ '& input': { fontWeight: 'bold', color: '#1b5e20' } }}
                                        size="small"
                                    />
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <Divider sx={{ my: 1, borderColor: '#c5e1a5' }} />
                                </Grid>

                                {/* Dates */}
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField
                                        fullWidth type="date" label="From" InputLabelProps={{ shrink: true }}
                                        value={fromDate} onChange={(e) => setFromDate(e.target.value)} size="small"
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField
                                        fullWidth type="date" label="To" InputLabelProps={{ shrink: true }}
                                        value={toDate} onChange={(e) => setToDate(e.target.value)} size="small"
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField
                                        select fullWidth label="Leave Type"
                                        value={leaveType} onChange={(e) => setLeaveType(e.target.value)} size="small"
                                    >
                                        <MenuItem value="Annual">Annual</MenuItem>
                                        <MenuItem value="Casual">Casual</MenuItem>
                                        <MenuItem value="Duty">Duty</MenuItem>
                                        <MenuItem value="Medical">Medical</MenuItem>
                                    </TextField>
                                </Grid>

                                {/* Reason */}
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth label="Reason For Leave" multiline rows={2}
                                        value={reason} onChange={(e) => setReason(e.target.value)}
                                    />
                                </Grid>

                                {/* Address & Contact */}
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth label="Address While on Leave"
                                        value={address} onChange={(e) => setAddress(e.target.value)}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        fullWidth label="Additional Contact No"
                                        value={contactNo} onChange={(e) => setContactNo(e.target.value)}
                                    />
                                </Grid>

                                {/* Acting Arrangement */}
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        select fullWidth label="Acting Arrangement (Who covers?)"
                                        value={actingPerson} onChange={(e) => setActingPerson(e.target.value)}
                                        size="small"
                                    >
                                        <MenuItem value="NONE">
                                            <em>None</em>
                                        </MenuItem>
                                        {actingOfficers.length > 0 ? (
                                            actingOfficers.map((officer) => (
                                                <MenuItem key={officer.id} value={officer.id}>
                                                    {officer.name}
                                                </MenuItem>
                                            ))
                                        ) : (
                                            <MenuItem disabled value="">No other officers found</MenuItem>
                                        )}
                                    </TextField>
                                </Grid>

                                {/* Submit Button */}
                                <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                                    <Button
                                        variant="contained"
                                        size="large"
                                        onClick={handleSubmit}
                                        sx={{
                                            bgcolor: '#ffee58', color: 'black', fontWeight: 'bold', px: 4,
                                            '&:hover': { bgcolor: '#fdd835' }
                                        }}
                                    >
                                        Submit Application
                                    </Button>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>
                </Grid>
            </Box>

            {/* Success Dialog */}
            <Dialog
                open={openSuccess}
                onClose={handleCloseSuccess}
                aria-labelledby="success-dialog-title"
            >
                <DialogTitle id="success-dialog-title" sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', display: 'flex', alignItems: 'center', gap: 1 }}>
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
        </Box >
    );
}
