import { Box, Typography, Card, CardContent, Grid, Paper, LinearProgress } from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';

export default function GeneralStock() {
    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                General Stock
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={4}>
                Real-time updates on seeds, fertilizers, and field equipment.
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                <InventoryIcon color="success" sx={{ mr: 1 }} />
                                <Typography variant="h6">Fertilizers & Chemicals</Typography>
                            </Box>

                            <Box mb={3}>
                                <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography variant="body2">NPK Fertilizer</Typography>
                                    <Typography variant="body2" fontWeight="bold">450 kg / 1000 kg</Typography>
                                </Box>
                                <LinearProgress variant="determinate" value={45} color="warning" />
                            </Box>

                            <Box mb={3}>
                                <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography variant="body2">Urea</Typography>
                                    <Typography variant="body2" fontWeight="bold">800 kg / 1000 kg</Typography>
                                </Box>
                                <LinearProgress variant="determinate" value={80} color="success" />
                            </Box>

                            <Box>
                                <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography variant="body2">Weedicide</Typography>
                                    <Typography variant="body2" fontWeight="bold">20 L / 50 L</Typography>
                                </Box>
                                <LinearProgress variant="determinate" value={40} color="error" />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                <InventoryIcon color="info" sx={{ mr: 1 }} />
                                <Typography variant="h6">Tools & Equipment</Typography>
                            </Box>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd' }}>
                                        <Typography variant="h5" fontWeight="bold">128</Typography>
                                        <Typography variant="body2">Baskets</Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={6}>
                                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd' }}>
                                        <Typography variant="h5" fontWeight="bold">45</Typography>
                                        <Typography variant="body2">Pruning Shears</Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={6}>
                                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd' }}>
                                        <Typography variant="h5" fontWeight="bold">12</Typography>
                                        <Typography variant="body2">Safety Kits</Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={6}>
                                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff3e0' }}>
                                        <Typography variant="h5" fontWeight="bold" color="warning.main">2</Typography>
                                        <Typography variant="body2">Broken/Repair</Typography>
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
