import { Box, Typography, Grid, Card, CardContent, Chip } from '@mui/material';
import EngineeringIcon from '@mui/icons-material/Engineering';
import EventNoteIcon from '@mui/icons-material/EventNote';

export default function ChiefClerkDashboard() {
    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ color: '#1b5e20', mb: 1 }}>
                Chief Clerk Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Manage Estate Norms, Monthly Aththama, Worker HR Registry, and <strong>Cost Analysis Structure</strong>.
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Card 
                        sx={{ height: '100%', borderRadius: 3, boxShadow: 2, borderLeft: '6px solid #2e7d32', cursor: 'pointer', '&:hover': { boxShadow: 4 } }}
                        onClick={() => window.location.href = '/dashboard/chief-cost-analysis'}
                    >
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={2} mb={2}>
                                <AttachMoneyIcon fontSize="large" sx={{ color: '#2e7d32' }} />
                                <Typography variant="h6" fontWeight="bold">Cost Analysis</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                Define the monthly cost structure and line items for Tea, Rubber, and other crops. Used for FO reporting.
                            </Typography>
                            <Box mt={2}>
                                <Chip label="New Feature" size="small" color="success" />
                            </Box>
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
                            <Box mt={2}>
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
