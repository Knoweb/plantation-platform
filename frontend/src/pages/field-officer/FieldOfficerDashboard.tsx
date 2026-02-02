import { Box, Grid, Paper, Typography, Card, CardContent, Button, Divider, List, ListItem, ListItemText } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InventoryIcon from '@mui/icons-material/Inventory';
import GroupIcon from '@mui/icons-material/Group';
import { BarChart } from '@mui/x-charts/BarChart';

export default function FieldOfficerDashboard() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={4}>
                Overview of Division Performance, Muster, and Stock Levels.
            </Typography>

            {/* KPI Section */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={2} sx={{ p: 2, borderLeft: '4px solid #4caf50' }}>
                        <Typography variant="subtitle2" color="text.secondary">Daily Yield</Typography>
                        <Typography variant="h4" fontWeight="bold">1,250 kg</Typography>
                        <Typography variant="caption" color="success.main">+5% vs Target</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={2} sx={{ p: 2, borderLeft: '4px solid #2196f3' }}>
                        <Typography variant="subtitle2" color="text.secondary">Worker Turnout</Typography>
                        <Typography variant="h4" fontWeight="bold">92%</Typography>
                        <Typography variant="caption" color="text.secondary">45/49 Present</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={2} sx={{ p: 2, borderLeft: '4px solid #ff9800' }}>
                        <Typography variant="subtitle2" color="text.secondary">Productivity</Typography>
                        <Typography variant="h4" fontWeight="bold">28 kg/p</Typography>
                        <Typography variant="caption" color="error.main">-2% vs Avg</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={2} sx={{ p: 2, borderLeft: '4px solid #9c27b0' }}>
                        <Typography variant="subtitle2" color="text.secondary">Fertilizer Stock</Typography>
                        <Typography variant="h4" fontWeight="bold">Low</Typography>
                        <Typography variant="caption" color="error.main">Reorder Required</Typography>
                    </Paper>
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                {/* Crop Achievements (Chart) */}
                <Grid item xs={12} md={8}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                                <Typography variant="h6">Crop Achievements & Yield</Typography>
                            </Box>
                            <Box height={300} width="100%">
                                <BarChart
                                    xAxis={[{ scaleType: 'band', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }]}
                                    series={[{ data: [1200, 1350, 1100, 1400, 1250, 1300, 900], label: 'Green Leaf (kg)', color: '#4caf50' }]}
                                    height={280}
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Muster Approval & Review */}
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                <GroupIcon color="secondary" sx={{ mr: 1 }} />
                                <Typography variant="h6">Muster Approval</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                Pending morning muster approvals for Division A.
                            </Typography>
                            <List dense>
                                <ListItem disablePadding sx={{ mb: 1 }}>
                                    <ListItemText primary="Gang #1 (Plucking)" secondary="22 Workers • 07:30 AM" />
                                    <Button size="small" variant="contained" color="success">Approve</Button>
                                </ListItem>
                                <Divider />
                                <ListItem disablePadding sx={{ mt: 1 }}>
                                    <ListItemText primary="Gang #2 (Weeding)" secondary="12 Workers • 07:45 AM" />
                                    <Button size="small" variant="contained" color="success">Approve</Button>
                                </ListItem>
                            </List>
                            <Button fullWidth variant="outlined" sx={{ mt: 2 }} href="/dashboard/muster">Muster Review</Button>
                        </CardContent>
                    </Card>
                </Grid>

                {/* General Stock */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                <InventoryIcon color="warning" sx={{ mr: 1 }} />
                                <Typography variant="h6">General Stock</Typography>
                            </Box>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Paper sx={{ p: 1, textAlign: 'center', bgcolor: '#f1f8e9' }}>
                                        <Typography variant="subtitle2">Fertilizer (NPK)</Typography>
                                        <Typography variant="h6" color="success.main">450 kg</Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={6}>
                                    <Paper sx={{ p: 1, textAlign: 'center', bgcolor: '#fff3e0' }}>
                                        <Typography variant="subtitle2">Tools (Baskets)</Typography>
                                        <Typography variant="h6" color="warning.main">12 Units</Typography>
                                    </Paper>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
