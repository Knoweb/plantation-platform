import { Box, Grid, Typography, Card, CardContent, Button } from '@mui/material';
import StoreIcon from '@mui/icons-material/Store';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

export default function StoreKeeperDashboard() {
    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                Store Keeper Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={4}>
                Manage inventory, receipts, and issues for the estate warehouse.
            </Typography>

            <Grid container spacing={3}>
                {/* Inventory */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ height: '100%', borderLeft: '4px solid #f44336' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                <StoreIcon color="error" sx={{ fontSize: 40, mr: 2 }} />
                                <Typography variant="h6">Inventory Management</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">View current stock levels for Fertilizer, Chemicals, and Tools.</Typography>
                            <Button size="small" variant="contained" color="error" sx={{ mt: 2 }}>Manage Stock</Button>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Issues/Receipts */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ height: '100%', borderLeft: '4px solid #ff9800' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                <LocalShippingIcon color="warning" sx={{ fontSize: 40, mr: 2 }} />
                                <Typography variant="h6">Issues & Receipts</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">Record new stock arrivals and issue items to divisions.</Typography>
                            <Button size="small" variant="outlined" sx={{ mt: 2 }}>New Transaction</Button>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
