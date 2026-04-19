import { useState, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import EngineeringIcon from '@mui/icons-material/Engineering';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import InventoryIcon from '@mui/icons-material/Inventory';
import MenuBookIcon from '@mui/icons-material/MenuBook';
// Custom Analytics Components
import YieldAnalytics from '../../components/manager/YieldAnalytics';
import CostAnalytics from '../../components/manager/CostAnalytics';
import CropPerformanceCard from '../../components/manager/CropPerformanceCard';

export default function ChiefClerkDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    const [inventoryPending, setInventoryPending] = useState(0);
    const [permanentWorkers, setPermanentWorkers] = useState(0);
    const [casualWorkers, setCasualWorkers] = useState(0);
    const [contractWorkersToday, setContractWorkersToday] = useState(0);
    const [costLoggedToday, setCostLoggedToday] = useState(false);
    const [todateYield, setTodateYield] = useState(0);

    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;
    const userId = userSession.userId || userSession.id;

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!tenantId) return;
            try {
            const now = new Date();
            // Use local date (not UTC) to prevent off-by-one errors in IST (+05:30)
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const startOfMonth = today.substring(0, 8) + '01';
            
            // Perform all requests in parallel to optimize loading time
            const [invTransRes, wRes, costsRes, workRes] = await Promise.all([
                axios.get(`/api/inventory/transactions?tenantId=${tenantId}`),
                axios.get(`/api/workers?tenantId=${tenantId}`),
                axios.get(`/api/daily-costs/range?tenantId=${tenantId}&cropType=TEA&startDate=${today}&endDate=${today}`),
                // Fetch ONLY current month's work to minimize payload and processing time
                axios.get(`/api/operations/daily-work?tenantId=${tenantId}&startDate=${startOfMonth}&endDate=${today}`)
            ]);

            // 1. Inventory Transactions
            const ccPending = (invTransRes.data || []).filter((t: any) => 
                t.type === 'RESTOCK_REQUEST' && 
                ((t.status === 'PENDING' && t.issuedTo && t.issuedTo.includes('SYSTEM')) || t.status === 'CHIEF_CLERK_PENDING')
            ).length;
            setInventoryPending(ccPending);

            // 2. Workers
            const wList = wRes.data || [];
            setPermanentWorkers(wList.filter((w: any) => w.employmentType === 'PERMANENT').length);
            setCasualWorkers(wList.filter((w: any) => w.employmentType === 'CASUAL').length);
            setContractWorkersToday(wList.filter((w: any) => w.employmentType === 'CONTRACT' && w.registeredDate === today).length);

            // 4. Cost Analysis
            setCostLoggedToday((costsRes.data || []).length > 0);

            // 5. Crop Book Yield
            let facWeight = 0;
            (workRes.data || []).forEach((w: any) => {
                if (w.bulkWeights) {
                    try {
                        const bw = JSON.parse(w.bulkWeights);
                        if (bw['__FACTORY__']?.factoryWt) facWeight += Number(bw['__FACTORY__'].factoryWt);
                    } catch(e) {}
                }
            });
            setTodateYield(facWeight);

            } catch (err) {
                console.error("Dashboard error", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
        
        const interval = setInterval(fetchDashboardData, 30000); // 30s auto-refresh
        return () => clearInterval(interval);
    }, [tenantId, userId]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
                <CircularProgress color="success" />
            </Box>
        );
    }

    const todayDateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    return (
        <Box sx={{ pb: 6 }}>
            {/* Blinking Animation Styles */}
            <style>
                {`
                    @keyframes blink {
                        0% { opacity: 1; }
                        50% { opacity: 0.4; }
                        100% { opacity: 1; }
                    }
                    .urgent-blink {
                        animation: blink 1s infinite ease-in-out;
                    }
                `}
            </style>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h4" fontWeight="900" sx={{ color: '#1b5e20', letterSpacing: '-0.5px' }}>
                    Chief Clerk Dashboard
                </Typography>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#689f38', bgcolor: '#f1f8e9', px: 2, py: 0.5, borderRadius: 2 }}>
                    {todayDateStr}
                </Typography>
            </Box>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Welcome back. Here is your fast-action operational overview.
            </Typography>

            {/* TOP ROW: 5 Little Tiles - Compact Operational Overview */}
            <Box sx={{ mb: 4, display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' }, gap: 2 }}>
                {/* INVENTORY TILE */}
                <Card onClick={() => navigate('/dashboard/chief-inventory')} sx={{ borderRadius: 3, cursor: 'pointer', transition: '0.2s', '&:hover': { transform: 'scale(1.02)', boxShadow: 4 }, bgcolor: inventoryPending > 0 ? '#fff5f5' : '#ffffff', border: inventoryPending > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0' }}>
                    <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: 2, bgcolor: inventoryPending > 0 ? '#ef4444' : '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <InventoryIcon fontSize="small" />
                        </Box>
                        <Box overflow="hidden">
                            <Typography variant="subtitle2" fontWeight="900" noWrap sx={{ color: inventoryPending > 0 ? '#b91c1c' : '#1e293b', lineHeight: 1.1 }}>
                                {inventoryPending} Out of stock
                            </Typography>
                            <Typography variant="caption" fontWeight="700" color="text.secondary" noWrap sx={{ textTransform: 'uppercase', display: 'block', mt: 0.2 }}>
                                items to review
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>

                {/* COST ANALYSIS TILE */}
                <Card onClick={() => navigate('/dashboard/chief-cost-analysis')} sx={{ borderRadius: 3, cursor: 'pointer', transition: '0.2s', '&:hover': { transform: 'scale(1.02)', boxShadow: 4 }, bgcolor: !costLoggedToday ? '#fff5f5' : '#ffffff', border: !costLoggedToday ? '1px solid #feb2b2' : '1px solid #e2e8f0' }}>
                    <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: 2, bgcolor: !costLoggedToday ? '#ef4444' : '#22c55e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <AttachMoneyIcon fontSize="small" />
                        </Box>
                        <Box overflow="hidden">
                            <Typography variant="subtitle2" fontWeight="900" noWrap className={!costLoggedToday ? "urgent-blink" : ""} sx={{ color: !costLoggedToday ? '#c53030' : '#15803d', lineHeight: 1.1 }}>
                                {costLoggedToday ? "Cost Entered" : "Cost not entered"}
                            </Typography>
                            <Typography variant="caption" fontWeight="700" color="text.secondary" noWrap sx={{ textTransform: 'uppercase', display: 'block', mt: 0.2 }}>
                                Daily Entry Status
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>

                {/* WORKERS TILE */}
                <Card onClick={() => navigate('/dashboard/workers')} sx={{ borderRadius: 3, cursor: 'pointer', transition: '0.2s', '&:hover': { transform: 'scale(1.02)', boxShadow: 4 }, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
                    <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: 2, bgcolor: '#8b5cf6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <EngineeringIcon fontSize="small" />
                        </Box>
                        <Box overflow="hidden">
                            <Typography variant="caption" fontWeight="900" noWrap sx={{ color: '#4c1d95', display: 'block', lineHeight: 1.1 }}>
                                {permanentWorkers} permanent
                            </Typography>
                            <Typography variant="caption" fontWeight="900" color="#8b5cf6" noWrap sx={{ display: 'block', mt: 0.2 }}>
                                {casualWorkers} casual
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>

                {/* CONTRACT TILE */}
                <Card onClick={() => navigate('/dashboard/workers?tab=contract')} sx={{ borderRadius: 3, cursor: 'pointer', transition: '0.2s', '&:hover': { transform: 'scale(1.02)', boxShadow: 4 }, bgcolor: contractWorkersToday === 0 ? '#fff5f5' : '#f0fdf4', border: contractWorkersToday === 0 ? '1px solid #feb2b2' : '1px solid #bbf7d0' }}>
                    <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: 2, bgcolor: contractWorkersToday === 0 ? '#ef4444' : '#16a34a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <EngineeringIcon fontSize="small" />
                        </Box>
                        <Box overflow="hidden">
                            <Typography variant="caption" fontWeight="900" noWrap className={contractWorkersToday === 0 ? "urgent-blink" : ""} sx={{ color: contractWorkersToday === 0 ? '#c53030' : '#166534', display: 'block', lineHeight: 1.1 }}>
                                {contractWorkersToday > 0 ? `${contractWorkersToday} contracts logged` : "daily contract"}
                            </Typography>
                            <Typography variant="caption" fontWeight="900" color="text.secondary" noWrap sx={{ display: 'block', mt: 0.2 }}>
                                {contractWorkersToday === 0 ? "workers not logged" : "successfully saved"}
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>

                {/* HARVEST TILE */}
                <Card onClick={() => navigate('/dashboard/crop-book')} sx={{ borderRadius: 3, cursor: 'pointer', transition: '0.2s', '&:hover': { transform: 'scale(1.02)', boxShadow: 4 }, bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
                    <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: 2, bgcolor: '#16a34a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <MenuBookIcon fontSize="small" />
                        </Box>
                        <Box overflow="hidden">
                            <Typography variant="subtitle2" fontWeight="900" noWrap sx={{ color: '#166534', lineHeight: 1.1 }}>
                                {todateYield.toLocaleString()} <Typography component="span" variant="caption" fontWeight="bold">Kg</Typography>
                            </Typography>
                            <Typography variant="caption" fontWeight="700" color="text.secondary" noWrap sx={{ textTransform: 'uppercase', display: 'block', mt: 0.2 }}>
                                Harvested MTD
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            {/* MAIN DASHBOARD CONTENT */}
            <Grid container spacing={4}>
                {/* Visual Analytics - Crop Performance (Full Width) */}
                <Grid size={{ xs: 12 }}>
                    <CropPerformanceCard tenantId={tenantId} />
                </Grid>

                {/* Analytics Grid - Yield & Cost Charts */}
                <Grid size={{ xs: 12, lg: 6 }}>
                    <YieldAnalytics tenantId={tenantId} />
                </Grid>
                <Grid size={{ xs: 12, lg: 6 }}>
                    <CostAnalytics tenantId={tenantId} />
                </Grid>
            </Grid>
        </Box>
    );
}
