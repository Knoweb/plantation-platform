import { Box, Typography, Paper, Grid, Card, CardContent, Divider, Chip } from '@mui/material';
import EngineeringIcon from '@mui/icons-material/Engineering';
import SettingsIcon from '@mui/icons-material/Settings';
import EventNoteIcon from '@mui/icons-material/EventNote';

export default function ChiefClerkDashboard() {
    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ color: '#1b5e20', mb: 1 }}>
                Chief Clerk Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Manage Estate Norms, Monthly Aththama, and Core Worker HR Registry.
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 2, borderLeft: '6px solid #1b5e20' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={2} mb={2}>
                                <SettingsIcon fontSize="large" color="primary" />
                                <Typography variant="h6" fontWeight="bold">Norm Setting</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                Prepare the monthly minimum yield targets for Tea Plucking & Rubber Tapping based on the 25th-of-the-month discussions.
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 2, borderLeft: '6px solid #f57c00' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={2} mb={2}>
                                <EngineeringIcon fontSize="large" sx={{ color: '#f57c00' }} />
                                <Typography variant="h6" fontWeight="bold">Worker Registry</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                Maintain the central worker employee roster. Shift contracts from Casual to Permanent, and update EPF numbers.
                            </Typography>
                            <Box mt={2} display="flex" gap={1}>
                                <Chip label="HR Managed" size="small" color="warning" />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 2, borderLeft: '6px solid #1976d2' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={2} mb={2}>
                                <EventNoteIcon fontSize="large" color="info" />
                                <Typography variant="h6" fontWeight="bold">Aththama Planning</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                Link set norms directly to the workers' daily wage structure dynamically across all divisions.
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* In the future this section can have quick stats like total workers registered this week, current tea norm, etc. */}
        </Box>
    );
}
