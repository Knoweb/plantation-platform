import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Grid, Paper, TextField, IconButton, CircularProgress, Divider, Chip } from '@mui/material';
import axios from 'axios';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PaymentsIcon from '@mui/icons-material/Payments';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface ProfitSummaryCardProps {
    tenantId: string;
}

const ProfitSummaryCard: React.FC<ProfitSummaryCardProps> = ({ tenantId }) => {
    const [loading, setLoading] = useState(true);
    const [assumedRate, setAssumedRate] = useState(0);
    const [savedRate, setSavedRate] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    const [metrics, setMetrics] = useState({
        totalYield: 0,
        totalCost: 0,
        revenue: 0,
        profit: 0
    });

    const currentMonth = React.useMemo(() => new Date(), []);
    const monthName = format(currentMonth, 'MMMM yyyy');

    const fetchProfitData = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);
        try {
            const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
            const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

            // 1. Fetch Daily Costs (Authoritative Source for Cost Analysis Tab)
            // 2. Fetch Daily Work (Authoritative Source for Yield/Crop Book)
            // 3. Fetch Crop Config (Authoritative Source for Rates)
            const [costsRes, workRes, fieldsRes, configRes] = await Promise.all([
                axios.get(`/api/daily-costs/range?tenantId=${tenantId}&cropType=TEA&startDate=${startDate}&endDate=${endDate}`),
                axios.get(`/api/operations/daily-work?tenantId=${tenantId}&startDate=${startDate}&endDate=${endDate}`),
                axios.get(`/api/fields?tenantId=${tenantId}`),
                axios.get(`/api/crop-configs?tenantId=${tenantId}&cropType=TEA`)
            ]);

            // A. PROCESS TOTAL COST (Synchronized with Cost Analysis Tab)
            // We sum the 'dayAmount' for all items across all days in the monthly range
            let opCostSum = 0;
            (costsRes.data || []).forEach((c: any) => {
                try {
                    const categories = JSON.parse(c.costData);
                    if (Array.isArray(categories)) {
                        categories.forEach((cat: any) => {
                            (cat.items || []).forEach((item: any) => {
                                opCostSum += Number(item.dayAmount || 0);
                            });
                        });
                    }
                } catch (e) { /* ignore parse error */ }
            });

            // B. PROCESS YIELD (Synchronized with Crop Book - Last Todate Factory Weight)
            const fieldMap = new Map();
            (fieldsRes.data || []).forEach((f: any) => fieldMap.set(String(f.id), (f.cropType || '').toLowerCase()));

            let factoryYield = 0;
            const validWorkRecords = (workRes.data || []).filter((w: any) => {
                return w.workDate && w.workDate >= startDate && w.workDate <= endDate;
            });

            if (validWorkRecords.length > 0) {
                // Sum factoryWt for the month (matching Crop Book monthly logic)
                let sum = 0;
                validWorkRecords.forEach((op: any) => {
                    if (fieldMap.get(String(op.fieldId)) !== 'tea') return;
                    if (op.bulkWeights) {
                        try {
                            const bw = JSON.parse(op.bulkWeights);
                            if (bw.__FACTORY__?.factoryWt) {
                                sum += Number(bw.__FACTORY__.factoryWt);
                            }
                        } catch (e) { }
                    }
                });
                factoryYield = sum;
            }

            // C. RATES AND CALCULATIONS
            const config = configRes.data || {};
            const currentAssumedRate = config.assumedGreenLeafRate || 0;
            setAssumedRate(currentAssumedRate);
            setSavedRate(currentAssumedRate);

            const revenue = factoryYield * currentAssumedRate;

            setMetrics({
                totalYield: factoryYield,
                totalCost: opCostSum,
                revenue: revenue,
                profit: revenue - opCostSum
            });

        } catch (error) {
            console.error("Failed to fetch profit metrics:", error);
        } finally {
            setLoading(false);
        }
    }, [tenantId, currentMonth]);

    useEffect(() => {
        fetchProfitData();
    }, [fetchProfitData]);

    const handleSaveRate = async () => {
        setIsSaving(true);
        try {
            await axios.post(`/api/crop-configs`, {
                tenantId: tenantId,
                cropType: 'TEA',
                assumedGreenLeafRate: assumedRate
            });
            setSavedRate(assumedRate);
            const newRevenue = metrics.totalYield * assumedRate;
            setMetrics(prev => ({
                ...prev,
                revenue: newRevenue,
                profit: newRevenue - prev.totalCost
            }));
        } catch (e) {
            console.error("Failed to save rate", e);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <Paper sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400, borderRadius: 5 }}>
                <CircularProgress size={40} />
            </Paper>
        );
    }

    const currentRevenue = metrics.totalYield * assumedRate;
    const currentProfit = currentRevenue - metrics.totalCost;
    const isProfit = currentProfit >= 0;

    return (
        <Paper 
            elevation={0}
            sx={{ 
                p: { xs: 2, md: 3 }, 
                height: '100%',
                minHeight: { md: 500 },
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 7, 
                background: isProfit 
                    ? 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)' 
                    : 'linear-gradient(135deg, #fff1f2 0%, #ffffff 100%)',
                border: '1px solid',
                borderColor: isProfit ? '#bbf7d0' : '#fecaca',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.05)',
                position: 'relative',
                overflow: 'visible',
                transition: 'all 0.3s ease'
            }}
        >
            {/* Premium Background Accent */}
            <Box sx={{ 
                position: 'absolute', top: -40, right: -40, width: 220, height: 220, 
                borderRadius: '50%', background: isProfit ? '#dcfce7' : '#fee2e2', 
                filter: 'blur(40px)', opacity: 0.4, zIndex: 0 
            }} />

            {/* Header with Conceptual Information */}
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2} sx={{ zIndex: 1 }}>
                <Box>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="caption" fontWeight="1000" color="text.secondary" sx={{ letterSpacing: 1.5, textTransform: 'uppercase', opacity: 0.7 }}>
                            Internal Projections
                        </Typography>
                        <Chip 
                            label="PROJECTION" 
                            size="small" 
                            sx={{ height: 16, fontSize: '0.6rem', fontWeight: '1000', bgcolor: '#e2e8f0', color: '#64748b' }} 
                        />
                    </Box>
                    <Typography variant="h6" fontWeight="1000" sx={{ color: '#0f172a', mt: 0.5 }}>
                        {monthName.toUpperCase()}
                    </Typography>
                </Box>
                <Box display="flex" flexDirection="column" alignItems="flex-end" gap={0.5}>
                    <Chip 
                        label={isProfit ? 'PROFITABLE' : 'POTENTIAL LOSS'} 
                        size="small"
                        sx={{ 
                            fontWeight: '1000', 
                            fontSize: '0.65rem',
                            bgcolor: isProfit ? '#22c55e' : '#ef4444', 
                            color: '#fff'
                        }} 
                    />
                </Box>
            </Box>

            <Divider sx={{ mb: 2, borderColor: isProfit ? '#dcfce7' : '#fee2e2', opacity: 0.5 }} />

            {/* Assumed Profit Metric */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', zIndex: 1, py: 2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight="900" sx={{ letterSpacing: 3, textTransform: 'uppercase', mb: 1 }}>
                    Assumed Profit
                </Typography>
                <Typography 
                    variant="h2" 
                    fontWeight="1000" 
                    color={isProfit ? '#15803d' : '#991b1b'}
                    sx={{ 
                        fontSize: { xs: '2.8rem', md: '3.4rem' }, 
                        letterSpacing: -2,
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 1
                    }}
                >
                    <Typography component="span" variant="h5" fontWeight="1000" sx={{ opacity: 0.6 }}>Rs.</Typography>
                    {Math.abs(currentProfit).toLocaleString()}
                </Typography>
                
                <Box sx={{ 
                    mt: 2, display: 'flex', alignItems: 'center', gap: 1.2, px: 2, py: 1, 
                    borderRadius: 4, bgcolor: '#ffffff', border: '1px solid', 
                    borderColor: isProfit ? '#dcfce7' : '#fee2e2', 
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' 
                }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: isProfit ? '#22c55e' : '#ef4444', animation: 'pulse 2s infinite' }} />
                    <Typography variant="subtitle2" fontWeight="1000" color={isProfit ? '#15803d' : '#991b1b'}>
                        {isProfit ? 'Operating with Surplus' : 'Budget Shortfall'}
                    </Typography>
                </Box>
            </Box>

            <Divider sx={{ my: 2, borderColor: isProfit ? '#dcfce7' : '#fee2e2', opacity: 0.5 }} />

            {/* Config & Costs Grid */}
            <Grid container spacing={2} sx={{ zIndex: 1 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Box 
                        onClick={() => !isEditing && setIsEditing(true)}
                        sx={{ 
                            p: 1.5, borderRadius: 4, bgcolor: '#ffffff', border: '1px solid', 
                            borderColor: isEditing ? '#22c55e' : '#e2e8f0',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            cursor: isEditing ? 'default' : 'pointer',
                            '&:hover': { transform: isEditing ? 'none' : 'translateY(-2px)', boxShadow: isEditing ? 'none' : '0 4px 12px rgba(0,0,0,0.05)' }
                        }}
                    >
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <TrendingUpIcon sx={{ fontSize: 16, color: '#22c55e' }} />
                            <Typography variant="caption" fontWeight="1000" color="text.secondary" sx={{ letterSpacing: 0.5 }}>Assumed green leaf rate</Typography>
                        </Box>
                        
                        <Box display="flex" alignItems="center" gap={1}>
                            {isEditing ? (
                                <>
                                    <TextField
                                        autoFocus
                                        variant="standard"
                                        type="number"
                                        value={assumedRate || ''}
                                        onChange={(e) => setAssumedRate(Number(e.target.value))}
                                        onBlur={() => assumedRate === savedRate && setIsEditing(false)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveRate().then(() => setIsEditing(false))}
                                        sx={{ 
                                            // Dynamic width calculation: 
                                            // Base 40px + character count * multiplier
                                            width: Math.max(80, (String(assumedRate).length * 12) + 40),
                                            '& .MuiInputBase-input': { 
                                                fontSize: '1.25rem', 
                                                fontWeight: '1000',
                                                p: 0,
                                                color: '#0f172a'
                                            }
                                        }}
                                        InputProps={{ 
                                            startAdornment: <Typography variant="subtitle1" sx={{ mr: 0.5, fontWeight: '1000', color: '#64748b' }}>Rs.</Typography>,
                                            disableUnderline: true
                                        }}
                                    />
                                    {assumedRate !== savedRate && (
                                        <IconButton 
                                            size="small" 
                                            onClick={(e) => { e.stopPropagation(); handleSaveRate().then(() => setIsEditing(false)); }} 
                                            disabled={isSaving}
                                            sx={{ bgcolor: '#22c55e', '&:hover': { bgcolor: '#16a34a' }, width: 24, height: 24 }}
                                        >
                                            {isSaving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon sx={{ fontSize: 14, color: '#fff' }} />}
                                        </IconButton>
                                    )}
                                </>
                            ) : (
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Typography variant="h5" fontWeight="1000" sx={{ color: '#0f172a', display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                        <Typography component="span" variant="subtitle1" fontWeight="1000" sx={{ color: '#64748b' }}>Rs.</Typography>
                                        {assumedRate}
                                    </Typography>
                                    <EditIcon sx={{ fontSize: 16, color: '#94a3b8', opacity: 0.6 }} />
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Grid>
                
                <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ p: 1.5, borderRadius: 4, bgcolor: '#f8fafc', border: '1px solid', borderColor: '#e2e8f0' }}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <PaymentsIcon sx={{ fontSize: 16, color: '#ef4444' }} />
                            <Typography variant="caption" fontWeight="1000" color="text.secondary" sx={{ letterSpacing: 0.5 }}>Total Cost (Actual)</Typography>
                        </Box>
                        <Typography variant="h6" fontWeight="1000" sx={{ color: '#0f172a', display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                            <Typography component="span" variant="subtitle2" fontWeight="1000" sx={{ color: '#64748b' }}>Rs.</Typography>
                            {metrics.totalCost.toLocaleString()}
                        </Typography>
                    </Box>
                </Grid>
            </Grid>

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(${isProfit ? '34, 197, 94' : '239, 68, 68'}, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(${isProfit ? '34, 197, 94' : '239, 68, 68'}, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(${isProfit ? '34, 197, 94' : '239, 68, 68'}, 0); }
                }
            `}</style>
        </Paper>
    );
};

export default ProfitSummaryCard;
