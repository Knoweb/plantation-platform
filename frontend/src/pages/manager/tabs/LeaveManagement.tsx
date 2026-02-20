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
    CircularProgress
} from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function LeaveManagement() {
    const [tabIndex, setTabIndex] = useState(0);
    const [staffMembers, setStaffMembers] = useState<any[]>([]);
    const [selectedStaff, setSelectedStaff] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [quotas, setQuotas] = useState({
        duty: 5,
        annual: 14,
        casual: 7
    });
    const [pendingLeaves, setPendingLeaves] = useState([
        {
            id: 'req-001',
            name: 'Mr. R.S. Wickramasinghe',
            type: 'Annual',
            date: '2024-06-20', // keeping original mock data structure mostly
            from: '2024-06-20',
            to: '2024-06-21',
            days: 2,
            reason: 'Personal Matter'
        }
    ]);

    // ... (existing code)

    return (
        <Box p={3}>
            {/* ... headers ... */}
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

            {/* TAB 1: CONFIGURE QUOTAS */}
            {tabIndex === 0 && (
                <Grid container spacing={3}>
                    {/* ... (existing Grid content for Tab 1) ... */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Paper sx={{ p: 2, height: '100%' }}>
                            <Typography variant="subtitle1" fontWeight="bold" mb={2}>Select Staff Member</Typography>
                            {loading ? <CircularProgress /> : staffMembers.length === 0 ? <Typography>No field staff found.</Typography> : (
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
                                    Set availability for the current year. Field Officers will see these values in their dashboard.
                                </Typography>

                                <Grid container spacing={3}>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <TextField
                                            fullWidth label="Duty Leave" type="text"
                                            value={quotas.duty}
                                            onChange={(e) => {
                                                const val = Number(e.target.value.replace(/[^0-9]/g, ''));
                                                setQuotas({ ...quotas, duty: val });
                                            }}
                                            InputProps={{ inputProps: { min: 0, inputMode: 'numeric', pattern: '[0-9]*' } }}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <TextField
                                            fullWidth label="Annual Leave" type="text"
                                            value={quotas.annual}
                                            onChange={(e) => {
                                                const val = Number(e.target.value.replace(/[^0-9]/g, ''));
                                                setQuotas({ ...quotas, annual: val });
                                            }}
                                            InputProps={{ inputProps: { min: 0, inputMode: 'numeric', pattern: '[0-9]*' } }}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <TextField
                                            fullWidth label="Casual Leave" type="text"
                                            value={quotas.casual}
                                            onChange={(e) => {
                                                const val = Number(e.target.value.replace(/[^0-9]/g, ''));
                                                setQuotas({ ...quotas, casual: val });
                                            }}
                                            InputProps={{ inputProps: { min: 0, inputMode: 'numeric', pattern: '[0-9]*' } }}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <Button
                                            variant="contained" color="success" size="large"
                                            onClick={handleSaveQuota}
                                            sx={{ mt: 2 }}
                                        >
                                            Update Quotas
                                        </Button>
                                    </Grid>
                                </Grid>
                            </Paper>
                        )}
                    </Grid>
                </Grid>
            )}

            {/* TAB 2: APPROVALS */}
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
                            You have <b>{pendingLeaves.length} leave requests</b> pending approval. Please review them promptly.
                        </Alert>
                    )}

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
                                    <TableCell align="right">Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pendingLeaves.length > 0 ? (
                                    pendingLeaves.map((req) => (
                                        <TableRow key={req.id}>
                                            <TableCell>{req.name}</TableCell>
                                            <TableCell><Chip label={req.type} color="primary" size="small" variant="outlined" /></TableCell>
                                            <TableCell>{req.from}</TableCell>
                                            <TableCell>{req.to}</TableCell>
                                            <TableCell>{req.days}</TableCell>
                                            <TableCell>{req.reason}</TableCell>
                                            <TableCell align="right">
                                                <Button size="small" color="error" sx={{ mr: 1 }}>Reject</Button>
                                                <Button size="small" variant="contained" color="success">Approve</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                            <Typography color="text.secondary">No pending leave requests.</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            <Snackbar open={notification.open} autoHideDuration={4000} onClose={() => setNotification({ ...notification, open: false })}>
                <Alert severity={notification.severity} onClose={() => setNotification({ ...notification, open: false })}>
                    {notification.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
