import { Box, Grid, Paper, Typography, Card, CardContent, Button } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import DomainIcon from '@mui/icons-material/Domain';
import SettingsIcon from '@mui/icons-material/Settings';
import AssessmentIcon from '@mui/icons-material/Assessment';

export default function EstateAdminDashboard() {
    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={4}>
                Welcome, Estate Owner. Here is the high-level overview of your entire plantation.
            </Typography>

            <Grid container spacing={3}>
                {/* Staff Overview */}
                <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%', borderLeft: '4px solid #9c27b0' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                <PeopleIcon color="secondary" sx={{ fontSize: 40, mr: 2 }} />
                                <Typography variant="h6">Staff Management</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">Manage Managers, Field Officers, and Storekeepers.</Typography>
                            <Button size="small" variant="contained" color="secondary" sx={{ mt: 2 }} href="/dashboard/users">Manage Staff</Button>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Divisions */}
                <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%', borderLeft: '4px solid #2196f3' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                <DomainIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
                                <Typography variant="h6">Divisions</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">Configure plantation divisions and fields.</Typography>
                            <Button size="small" variant="outlined" sx={{ mt: 2 }} href="/dashboard/divisions">View Divisions</Button>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Analytics */}
                <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%', borderLeft: '4px solid #ff9800' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                <AssessmentIcon color="warning" sx={{ fontSize: 40, mr: 2 }} />
                                <Typography variant="h6">Global Reports</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">Financial and Yield reports across all divisions.</Typography>
                            <Button size="small" variant="outlined" sx={{ mt: 2 }}>View Analytics</Button>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Settings */}
                <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%', borderLeft: '4px solid #607d8b' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                <SettingsIcon sx={{ fontSize: 40, mr: 2, color: '#607d8b' }} />
                                <Typography variant="h6">Configuration</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">Estate settings, crops, and system configurations.</Typography>
                            <Button size="small" variant="outlined" sx={{ mt: 2 }}>Settings</Button>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
