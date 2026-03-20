import { Box, Grid, Typography, Card, CardContent, Button, Table, TableBody, TableCell, TableHead, TableRow, Chip, CircularProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import SettingsIcon from '@mui/icons-material/Settings'; // Added for Norm Setting
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function ManagerDashboard() {
    const [pendingItems, setPendingItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    useEffect(() => {
        fetchPending();
    }, [tenantId]);

    const fetchPending = async () => {
        try {
            const res = await axios.get(`/api/operations/daily-work?tenantId=${tenantId}&status=PENDING`);
            setPendingItems(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await axios.put(`/api/operations/daily-work/${id}/approve`);
            fetchPending(); // Refresh
        } catch (err) {
            alert("Failed to approve.");
        }
    };

    if (loading) {
        return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;
    }

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={4}>
                Manage approvals and oversee crop lifecycle records.
            </Typography>

            <Grid container spacing={3}>
                {/* Pending Approvals Section */}
                <Grid item xs={12} md={5}>
                    <Card sx={{ height: '100%', borderTop: '4px solid #fbdc57' }}> {/* Warning Color */}
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                <PendingActionsIcon color="warning" sx={{ mr: 1, fontSize: 32 }} />
                                <Typography variant="h6">Pending Approvals</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                Actions requiring your immediate attention.
                            </Typography>

                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Request</TableCell>
                                        <TableCell align="right">Action</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {pendingItems.map(item => (
                                        <TableRow key={item.workId}>
                                            <TableCell>
                                                <Typography variant="subtitle2">{item.workType}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {item.divisionId} • {item.workDate}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    color="primary"
                                                    onClick={() => handleApprove(item.workId)}
                                                >
                                                    Approve
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {pendingItems.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={2} align="center">No pending items.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>

                            <Box mt={2} textAlign="center">
                                <Button variant="text">View All Pending</Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Norm Setting Section */}
                <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 2, borderTop: '4px solid #1b5e20', cursor: 'pointer' }} onClick={() => navigate('/dashboard/norms')}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1} mb={2}>
                                <SettingsIcon color="primary" sx={{ fontSize: 32 }} />
                                <Typography variant="h6">Operational Targets & Norms</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                Prepare and manage the monthly minimum yield targets for Tea Plucking & Rubber Tapping.
                            </Typography>
                            <Box mt={2} textAlign="right">
                                <Button size="small" variant="text">Manage Norms</Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Crop Book Section */}
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%', borderTop: '4px solid #2e7d32' }}> {/* Plantation Green */}
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2} justifyContent="space-between">
                                <Box display="flex" alignItems="center">
                                    <MenuBookIcon color="success" sx={{ mr: 1, fontSize: 32 }} />
                                    <Typography variant="h6">Crop Book</Typography>
                                </Box>
                                <Button variant="outlined" size="small">Add New Field</Button>
                            </Box>
                            <Typography variant="body2" color="text.secondary" mb={3}>
                                Comprehensive records of planting schedules, growth stages, and yield analysis.
                            </Typography>

                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Field ID</TableCell>
                                        <TableCell>Crop Type</TableCell>
                                        <TableCell>Stage</TableCell>
                                        <TableCell align="right">Est. Yield</TableCell>
                                        <TableCell>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <TableRow>
                                        <TableCell><b>FD-001</b> (Upper)</TableCell>
                                        <TableCell>Tea (VP 2023)</TableCell>
                                        <TableCell>Mature</TableCell>
                                        <TableCell align="right">1,200 kg/ha</TableCell>
                                        <TableCell><Chip label="Healthy" color="success" size="small" /></TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell><b>FD-004</b> (Lower)</TableCell>
                                        <TableCell>Tea (S-Clone)</TableCell>
                                        <TableCell>Pruning</TableCell>
                                        <TableCell align="right">-</TableCell>
                                        <TableCell><Chip label="Maintenance" color="warning" size="small" /></TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell><b>FD-009</b> (New)</TableCell>
                                        <TableCell>Rubber</TableCell>
                                        <TableCell>Sapling</TableCell>
                                        <TableCell align="right">-</TableCell>
                                        <TableCell><Chip label="Growth" color="info" size="small" /></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
