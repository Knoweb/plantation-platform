import React from 'react';
import { Box, Typography, Grid } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

import YieldAnalytics from '../../components/manager/YieldAnalytics';
import CostAnalytics from '../../components/manager/CostAnalytics';
import CropPerformanceCard from '../../components/manager/CropPerformanceCard';

const EstateAdminDashboard: React.FC = () => {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>

            {/* Header */}
            <Box mb={4} display="flex" justifyContent="space-between" alignItems="flex-end">
                <Box>
                    <Typography
                        variant="h3"
                        fontWeight="900"
                        color="#1e293b"
                        sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' }, letterSpacing: '-0.025em' }}
                    >
                        Estate Admin Dashboard
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                        Overview of your plantation's performance and yield.
                    </Typography>
                </Box>
                <Box
                    sx={{
                        p: 1.5, px: 2, borderRadius: 3, bgcolor: '#ffffff',
                        display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2,
                        border: '1px solid #e2e8f0',
                    }}
                >
                    <CalendarMonthIcon sx={{ color: '#10b981' }} />
                    <Box>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>
                            Current Date
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: '800', color: '#1e293b' }}>
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Analytics Grid */}
            <Grid container spacing={4}>
                {/* Crop Performance — full width */}
                <Grid size={{ xs: 12 }}>
                    <CropPerformanceCard tenantId={tenantId} />
                </Grid>

                {/* Yield Analytics — left half */}
                <Grid size={{ xs: 12, lg: 6 }}>
                    <YieldAnalytics tenantId={tenantId} />
                </Grid>

                {/* Cost Analytics — right half */}
                <Grid size={{ xs: 12, lg: 6 }}>
                    <CostAnalytics tenantId={tenantId} />
                </Grid>
            </Grid>
        </Box>
    );
};

export default EstateAdminDashboard;
