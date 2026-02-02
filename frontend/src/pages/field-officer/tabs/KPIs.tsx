import { Box, Typography, Grid, Paper } from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';

export default function KPIs() {
    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                Key Performance Indicators
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={4}>
                Tracks critical metrics related to plantation efficiency and productivity.
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={3} sx={{ p: 3, borderTop: '4px solid #4caf50', textAlign: 'center' }}>
                        <Typography variant="subtitle2" color="text.secondary">Land Productivity</Typography>
                        <Typography variant="h4" fontWeight="bold" sx={{ mt: 1, mb: 1 }}>1,500</Typography>
                        <Typography variant="body2">kg / Ha</Typography>
                        <Typography variant="caption" color="success.main">+12% vs Target</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={3} sx={{ p: 3, borderTop: '4px solid #2196f3', textAlign: 'center' }}>
                        <Typography variant="subtitle2" color="text.secondary">Labor Efficiency</Typography>
                        <Typography variant="h4" fontWeight="bold" sx={{ mt: 1, mb: 1 }}>32</Typography>
                        <Typography variant="body2">kg / Worker / Day</Typography>
                        <Typography variant="caption" color="success.main">Matches Target</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={3} sx={{ p: 3, borderTop: '4px solid #ff9800', textAlign: 'center' }}>
                        <Typography variant="subtitle2" color="text.secondary">Cost per Kg</Typography>
                        <Typography variant="h4" fontWeight="bold" sx={{ mt: 1, mb: 1 }}>$1.20</Typography>
                        <Typography variant="body2">Production Cost</Typography>
                        <Typography variant="caption" color="error.main">+5% vs Budget</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={3} sx={{ p: 3, borderTop: '4px solid #9c27b0', textAlign: 'center' }}>
                        <Typography variant="subtitle2" color="text.secondary">Asset Utilization</Typography>
                        <Typography variant="h4" fontWeight="bold" sx={{ mt: 1, mb: 1 }}>95%</Typography>
                        <Typography variant="body2">Vehicle/Machinery</Typography>
                        <Typography variant="caption" color="success.main">Excellent</Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Detailed Analysis Section (Placeholder) */}
            <Box mt={4}>
                <Paper sx={{ p: 3 }}>
                    <Box display="flex" alignItems="center" mb={2}>
                        <AssessmentIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6">Historical Trend</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                        Detailed charts comparing this month's performance against previous years would appear here.
                    </Typography>
                    <Box height={200} bgcolor="#f5f5f5" mt={2} display="flex" alignItems="center" justifyContent="center">
                        <Typography color="text.secondary">Chart Placeholder</Typography>
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}
