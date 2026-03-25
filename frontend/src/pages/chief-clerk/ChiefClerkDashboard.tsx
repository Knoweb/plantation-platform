import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, CircularProgress, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import EngineeringIcon from '@mui/icons-material/Engineering';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import InventoryIcon from '@mui/icons-material/Inventory';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ChatIcon from '@mui/icons-material/Chat';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

export default function ChiefClerkDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    const [inventoryPending, setInventoryPending] = useState(0);
    const [workersActive, setWorkersActive] = useState(0);
    const [workersPending, setWorkersPending] = useState(0);
    const [contractWorkersToday, setContractWorkersToday] = useState(0);
    const [costLoggedToday, setCostLoggedToday] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState(0);
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
            
            // 1. Inventory Transactions (Chief Clerk reviews SYSTEM Restocks & FO requests)
            const invTransRes = await axios.get(`/api/inventory/transactions?tenantId=${tenantId}`);
            const ccPending = invTransRes.data.filter((t: any) => 
                t.type === 'RESTOCK_REQUEST' && 
                ((t.status === 'PENDING' && t.issuedTo && t.issuedTo.includes('SYSTEM')) || t.status === 'CHIEF_CLERK_PENDING')
            ).length;
            setInventoryPending(ccPending);

            // 2. Workers
            const wRes = await axios.get(`/api/workers?tenantId=${tenantId}`);
            const wList = wRes.data || [];
            setWorkersActive(wList.filter((w: any) => w.employmentType === 'PERMANENT' || w.employmentType === 'CASUAL').length);
            setWorkersPending(wList.filter((w: any) => w.status === 'PENDING_APPROVAL' && w.employmentType !== 'CONTRACT_MEMBER').length);
            // Count contract workers logged today (registeredDate matches today's local date)
            setContractWorkersToday(wList.filter((w: any) => w.employmentType === 'CONTRACT' && w.registeredDate === today).length);

                // 3. Messages
                try {
                    const msgRes = await axios.get(`/api/messages?userId=${userId}&userRole=CHIEF_CLERK`, {
                        headers: { 'X-Tenant-ID': tenantId }
                    });
                    setUnreadMessages(msgRes.data.filter((m: any) => m.receiverId === userId && !m.read).length);
                } catch (e) {}

                // 4. Cost Analysis (Did they save today's row?)
                const costsRes = await axios.get(`/api/daily-costs/range?tenantId=${tenantId}&cropType=TEA&startDate=${today}&endDate=${today}`);
                setCostLoggedToday((costsRes.data || []).length > 0);

                // 5. Crop Book Yield (Factory Weight MTD)
                const workRes = await axios.get(`/api/operations/daily-work?tenantId=${tenantId}`);
                let facWeight = 0;
                (workRes.data || []).forEach((w: any) => {
                    if (w.workDate && w.workDate >= startOfMonth && w.workDate <= today && w.bulkWeights) {
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

            <Grid container spacing={3}>
                {/* INVENTORY TILE */}
                <Grid item xs={12} md={4}>
                    <Card onClick={() => navigate('/dashboard/chief-inventory')} sx={{ height: '100%', borderRadius: 4, cursor: 'pointer', transition: '0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }, bgcolor: inventoryPending > 0 ? '#fff5f5' : '#ffffff', border: inventoryPending > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: inventoryPending > 0 ? '#ef4444' : '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <InventoryIcon fontSize="medium" />
                                </Box>
                                <IconButton size="small"><ArrowForwardIosIcon sx={{ fontSize: 14, color: '#94a3b8' }} /></IconButton>
                            </Box>
                            <Box mt={3}>
                                <Typography variant="h3" fontWeight="900" sx={{ color: inventoryPending > 0 ? '#b91c1c' : '#1e293b' }}>
                                    {inventoryPending}
                                </Typography>
                                <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase', mt: 0.5 }}>
                                    Pending Inventory Actions
                                </Typography>
                                <Typography variant="body2" sx={{ color: inventoryPending > 0 ? '#dc2626' : '#64748b', mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {inventoryPending > 0 ? <><WarningAmberIcon fontSize="small"/> Requires approval</> : <><CheckCircleOutlineIcon fontSize="small"/> All caught up</>}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* COST ANALYSIS TILE */}
                <Grid item xs={12} md={4}>
                    <Card onClick={() => navigate('/dashboard/chief-cost-analysis')} sx={{ height: '100%', borderRadius: 4, cursor: 'pointer', transition: '0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }, bgcolor: !costLoggedToday ? '#fffbeb' : '#ffffff', border: !costLoggedToday ? '1px solid #fde68a' : '1px solid #e2e8f0' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: !costLoggedToday ? '#f59e0b' : '#22c55e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <AttachMoneyIcon fontSize="medium" />
                                </Box>
                                <IconButton size="small"><ArrowForwardIosIcon sx={{ fontSize: 14, color: '#94a3b8' }} /></IconButton>
                            </Box>
                            <Box mt={3}>
                                <Typography variant="h4" fontWeight="900" sx={{ color: !costLoggedToday ? '#b45309' : '#15803d', mt: 0.5 }}>
                                    {costLoggedToday ? "Submitted" : "Pending Entry"}
                                </Typography>
                                <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase', mt: 0.5 }}>
                                    Today's Cost Analysis
                                </Typography>
                                <Typography variant="body2" sx={{ color: !costLoggedToday ? '#d97706' : '#64748b', mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {!costLoggedToday ? <><WarningAmberIcon fontSize="small"/> Save daily report</> : <><CheckCircleOutlineIcon fontSize="small"/> Daily costs logged</>}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* WORKERS TILE */}
                <Grid item xs={12} md={4}>
                    <Card onClick={() => navigate('/dashboard/workers')} sx={{ height: '100%', borderRadius: 4, cursor: 'pointer', transition: '0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }, border: contractWorkersToday === 0 ? '1px solid #fde68a' : '1px solid #e2e8f0', bgcolor: contractWorkersToday === 0 ? '#fffbeb' : '#ffffff' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: '#8b5cf6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <EngineeringIcon fontSize="medium" />
                                </Box>
                                <IconButton size="small"><ArrowForwardIosIcon sx={{ fontSize: 14, color: '#94a3b8' }} /></IconButton>
                            </Box>
                            <Box mt={3}>
                                <Typography variant="h3" fontWeight="900" sx={{ color: '#4c1d95' }}>
                                    {workersActive} <Typography component="span" variant="h6" fontWeight="bold" color="#8b5cf6">Active</Typography>
                                </Typography>
                                <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase', mt: 0.5 }}>
                                    Worker Registry
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {contractWorkersToday > 0
                                        ? <><CheckCircleOutlineIcon fontSize="small" sx={{ color: '#16a34a' }}/> <span style={{ color: '#16a34a', fontWeight: 600 }}>{contractWorkersToday} contract</span> workers logged today</>
                                        : <><WarningAmberIcon fontSize="small" sx={{ color: '#d97706' }}/> No contract workers logged today</>
                                    }
                                </Typography>
                                <Typography variant="body2" sx={{ color: workersPending > 0 ? '#ea580c' : '#64748b', mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {workersPending > 0 ? <><WarningAmberIcon fontSize="small"/> {workersPending} pending approval</> : <><CheckCircleOutlineIcon fontSize="small"/> Registry clean</>}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* CROP BOOK TILE */}
                <Grid item xs={12} md={6}>
                    <Card onClick={() => navigate('/dashboard/crop-book')} sx={{ height: '100%', borderRadius: 4, cursor: 'pointer', transition: '0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: '#16a34a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <MenuBookIcon fontSize="medium" />
                                </Box>
                                <IconButton size="small"><ArrowForwardIosIcon sx={{ fontSize: 14, color: '#94a3b8' }} /></IconButton>
                            </Box>
                            <Box mt={3}>
                                <Typography variant="h3" fontWeight="900" sx={{ color: '#166534' }}>
                                    {todateYield.toLocaleString()} <Typography component="span" variant="h6" fontWeight="bold">Kg</Typography>
                                </Typography>
                                <Typography variant="subtitle2" fontWeight="700" color="#16a34a" sx={{ textTransform: 'uppercase', mt: 0.5 }}>
                                    Harvested MTD
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#15803d', mt: 1 }}>
                                    Review the complete Crop Book
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* CORRESPONDENCE TILE */}
                <Grid item xs={12} md={6}>
                    <Card onClick={() => navigate('/dashboard/correspondence')} sx={{ height: '100%', borderRadius: 4, cursor: 'pointer', transition: '0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }, border: '1px solid #e2e8f0' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: '#0ea5e9', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ChatIcon fontSize="medium" />
                                </Box>
                                <IconButton size="small"><ArrowForwardIosIcon sx={{ fontSize: 14, color: '#94a3b8' }} /></IconButton>
                            </Box>
                            <Box mt={3}>
                                <Typography variant="h3" fontWeight="900" sx={{ color: '#0369a1' }}>
                                    {unreadMessages}
                                </Typography>
                                <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase', mt: 0.5 }}>
                                    Unread Messages
                                </Typography>
                                <Typography variant="body2" sx={{ color: unreadMessages > 0 ? '#0284c7' : '#64748b', mt: 1 }}>
                                    Estate correspondence hub
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
