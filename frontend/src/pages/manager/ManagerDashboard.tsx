import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Grid,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Chip,
    CircularProgress,
    Alert,
    Tooltip,
    Avatar,
    IconButton
} from '@mui/material';
import axios from 'axios';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import PersonIcon from '@mui/icons-material/Person';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

// Custom Analytics Components
import YieldAnalytics from '../../components/manager/YieldAnalytics';
import CostAnalytics from '../../components/manager/CostAnalytics';
import CropPerformanceCard from '../../components/manager/CropPerformanceCard';

const ManagerDashboard: React.FC = () => {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    const [pendingWorks, setPendingWorks] = useState<any[]>([]);
    const [loadingPending, setLoadingPending] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch pending works for approval
    const fetchPending = async () => {
        setLoadingPending(true);
        try {
            const res = await axios.get(`/api/operations/daily-work?tenantId=${tenantId}&status=PENDING`);
            setPendingWorks(res.data || []);
            setError(null);
        } catch (err) {
            console.error("Failed to fetch pending approvals", err);
            setError("Could not load pending approvals");
        } finally {
            setLoadingPending(false);
        }
    };

    useEffect(() => {
        fetchPending();
    }, [tenantId]);

    const handleApprove = async (workId: string) => {
        try {
            await axios.put(`/api/operations/daily-work/${workId}/approve`, {
                status: 'APPROVED',
                approverId: userSession.id
            });
            fetchPending();
        } catch (err) {
            console.error("Failed to approve work", err);
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
            {/* Header Section */}
            <Box mb={4} display="flex" justifyContent="space-between" alignItems="flex-end">
                <Box>
                    <Typography 
                        variant="h3" 
                        fontWeight="900" 
                        color="#1e293b" 
                        sx={{ 
                            fontSize: { xs: '1.75rem', md: '2.5rem' },
                            letterSpacing: '-0.025em'
                        }}
                    >
                        Manager Dashboard
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                        Welcome back, {userSession.name}. Here's what's happening today.
                    </Typography>
                </Box>
                <Paper 
                    variant="outlined" 
                    sx={{ 
                        p: 1.5, 
                        px: 2, 
                        borderRadius: 3, 
                        bgcolor: '#ffffff',
                        display: { xs: 'none', md: 'flex' },
                        alignItems: 'center',
                        gap: 2,
                        border: '1px solid #e2e8f0'
                    }}
                >
                    <CalendarMonthIcon sx={{ color: '#10b981' }} />
                    <Box>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Current Date</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: '800', color: '#1e293b' }}>
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </Typography>
                    </Box>
                </Paper>
            </Box>

            {/* Main Analytics Grid */}
            <Grid container spacing={4}>
                {/* Crop Performance Card (Full Width) */}
                <Grid size={{ xs: 12 }}>
                    <CropPerformanceCard tenantId={tenantId} />
                </Grid>

                {/* Yield Analytics */}
                <Grid size={{ xs: 12, lg: 6 }}>
                    <YieldAnalytics tenantId={tenantId} />
                </Grid>

                {/* Cost Analytics */}
                <Grid size={{ xs: 12, lg: 6 }}>
                    <CostAnalytics tenantId={tenantId} />
                </Grid>

                {/* Pending Approvals Table */}
                <Grid size={{ xs: 12 }}>
                    <Paper 
                        elevation={0} 
                        variant="outlined" 
                        sx={{ 
                            borderRadius: 3, 
                            overflow: 'hidden',
                            borderColor: '#e2e8f0',
                            bgcolor: '#ffffff'
                        }}
                    >
                        <Box p={3} borderBottom="1px solid #f1f5f9" display="flex" justifyContent="space-between" alignItems="center">
                            <Box display="flex" alignItems="center" gap={1.5}>
                                <Avatar sx={{ bgcolor: '#f59e0b', width: 40, height: 40 }}>
                                    <PendingActionsIcon />
                                </Avatar>
                                <Box>
                                    <Typography variant="h6" fontWeight="bold" color="#1e293b">Pending Approvals</Typography>
                                    <Typography variant="caption" color="text.secondary">Review and approve field operations</Typography>
                                </Box>
                            </Box>
                            <Chip 
                                label={`${pendingWorks.length} Pending`} 
                                color="warning" 
                                size="small" 
                                sx={{ fontWeight: 'bold' }} 
                            />
                        </Box>

                        <TableContainer sx={{ minHeight: pendingWorks.length === 0 ? 200 : 'auto' }}>
                            {loadingPending ? (
                                <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
                            ) : error ? (
                                <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
                            ) : pendingWorks.length === 0 ? (
                                <Box display="flex" flexDirection="column" alignItems="center" py={8} sx={{ opacity: 0.6 }}>
                                    <CheckCircleIcon sx={{ fontSize: 48, color: '#10b981', mb: 2 }} />
                                    <Typography variant="subtitle1" fontWeight="bold">Nothing to approve!</Typography>
                                    <Typography variant="body2" color="text.secondary">All field works are up to date.</Typography>
                                </Box>
                            ) : (
                                <Table sx={{ '& .MuiTableCell-head': { bgcolor: '#f8fafc', fontWeight: 'bold', color: '#64748b' } }}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Division</TableCell>
                                            <TableCell>Date</TableCell>
                                            <TableCell>Field Officer</TableCell>
                                            <TableCell>Task Type</TableCell>
                                            <TableCell align="center">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {pendingWorks.map((work) => (
                                            <TableRow key={work.id} hover>
                                                <TableCell sx={{ fontWeight: 'bold' }}>{work.divisionName}</TableCell>
                                                <TableCell>{new Date(work.workDate).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}><PersonIcon fontSize="inherit" /></Avatar>
                                                        {work.officerName}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label={work.workType} size="small" variant="outlined" sx={{ color: '#6366f1', borderColor: '#c7d2fe' }} />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Box display="flex" justifyContent="center" gap={1}>
                                                        <Tooltip title="View Details">
                                                            <Button size="small" startIcon={<VisibilityIcon />} variant="text" sx={{ color: '#64748b' }}>Details</Button>
                                                        </Tooltip>
                                                        <Button 
                                                            size="small" 
                                                            variant="contained" 
                                                            color="success" 
                                                            onClick={() => handleApprove(work.id)}
                                                            sx={{ 
                                                                bgcolor: '#10b981', 
                                                                '&:hover': { bgcolor: '#059669' },
                                                                borderRadius: 2,
                                                                textTransform: 'none',
                                                                fontWeight: 'bold'
                                                            }}
                                                        >
                                                            Approve
                                                        </Button>
                                                        <IconButton size="small" color="error">
                                                            <HighlightOffIcon />
                                                        </IconButton>
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </TableContainer>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ManagerDashboard;
