import React from 'react';
import {
    Box,
    Typography,
    Grid,
    Paper
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useLanguage } from '../../context/LanguageContext';

// Custom Analytics Components
import YieldAnalytics from '../../components/manager/YieldAnalytics';
import CostAnalytics from '../../components/manager/CostAnalytics';
import CropPerformanceCard from '../../components/manager/CropPerformanceCard';
import ProfitSummaryCard from '../../components/manager/ProfitSummaryCard';
import CostCategorizationChart from '../../components/manager/CostCategorizationChart';

const ManagerDashboard: React.FC = () => {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;
    const { t } = useLanguage();

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
                        {t('Welcome back,')} {userSession.name}. {t("Here's what's happening today.")}
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
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>{t('Current Date')}</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: '800', color: '#1e293b' }}>
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </Typography>
                    </Box>
                </Paper>
            </Box>

            {/* Main Analytics Grid */}
            <Grid container spacing={3} alignItems="stretch">
                {/* Top Row: Mission Critical Targets (Unified High-Density Shelf) */}
                <Grid size={{ xs: 12, lg: 4 }}>
                    <ProfitSummaryCard tenantId={tenantId} />
                </Grid>

                <Grid size={{ xs: 12, lg: 8 }}>
                    <CropPerformanceCard tenantId={tenantId} />
                </Grid>

                {/* Second Row: Operational Breakdown & Yield Correlation */}
                <Grid size={{ xs: 12, lg: 8 }}>
                    <CostCategorizationChart tenantId={tenantId} />
                </Grid>

                <Grid size={{ xs: 12, lg: 4 }}>
                    <YieldAnalytics tenantId={tenantId} />
                </Grid>

                {/* Third Row: Comprehensive Financial History */}
                <Grid size={{ xs: 12 }}>
                    <CostAnalytics tenantId={tenantId} />
                </Grid>
            </Grid>
        </Box>
    );
};

export default ManagerDashboard;
