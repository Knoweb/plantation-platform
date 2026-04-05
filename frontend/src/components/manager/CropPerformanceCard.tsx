import React, { useState, useEffect } from 'react';
import { Box, Typography, Select, MenuItem, FormControl, InputLabel, Grid, CircularProgress, LinearProgress, Paper } from '@mui/material';
import axios from 'axios';
import DashboardCard from './DashboardCard';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import StarIcon from '@mui/icons-material/Star';

interface CropPerformanceProps {
    tenantId: string;
}

const CropPerformanceCard: React.FC<CropPerformanceProps> = ({ tenantId }) => {
    const [activeCrop, setActiveCrop] = useState('Tea');
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [loading, setLoading] = useState<boolean>(true);
    const [performance, setPerformance] = useState<any>(null);
    const [availableCrops, setAvailableCrops] = useState<string[]>(['Tea']);

    useEffect(() => {
        const fetchCrops = async () => {
            try {
                const res = await axios.get(`/api/fields?tenantId=${tenantId}`);
                const cropsList = Array.from(new Set(res.data.map((f: any) => f.cropType).filter(Boolean))) as string[];
                if (cropsList.length > 0) {
                    setAvailableCrops(cropsList);
                    if (!cropsList.includes(activeCrop)) {
                        setActiveCrop(cropsList[0]);
                    }
                }
            } catch (err) {}
        };
        fetchCrops();
    }, [tenantId]);

    useEffect(() => {
        const fetchPerformance = async () => {
            setLoading(true);
            try {
                const [year, month] = selectedMonth.split('-');
                const startDate = `${year}-${month}-01`;
                const lastDay = new Date(Number(year), Number(month), 0).getDate();
                const today = new Date();
                const isCurrentMonth = today.getFullYear() === Number(year) && (today.getMonth() + 1) === Number(month);
                const endDay = isCurrentMonth ? today.getDate() : lastDay;
                const endDate = `${year}-${month}-${String(endDay).padStart(2, '0')}`;

                // Fetch Crop Config for Budget
                const configRes = await axios.get(`/api/crop-configs?tenantId=${tenantId}&cropType=${activeCrop}`);
                const config = configRes.data || {};

                // Fetch Daily Work for Actual Achievement
                const workRes = await axios.get(`/api/operations/daily-work?tenantId=${tenantId}&startDate=${startDate}&endDate=${endDate}`);
                const records = workRes.data || [];

                // Fetch fields to filter by crop type (logic from CropBook.tsx)
                const fieldsRes = await axios.get(`/api/fields?tenantId=${tenantId}`);
                const fields = fieldsRes.data || [];
                const fieldIdsForCrop = new Set(fields.filter((f: any) => f.cropType && f.cropType.toLowerCase() === activeCrop.toLowerCase()).map((f: any) => f.id));

                const dailyWeights = new Map<string, number>();
                records.forEach((record: any) => {
                    if (!fieldIdsForCrop.has(record.fieldId)) return;
                    
                    if (record.bulkWeights) {
                        try {
                            const bw = JSON.parse(record.bulkWeights);
                            const wt = Number(bw.__FACTORY__?.factoryWt || 0);
                            if (wt > 0 && record.workDate) {
                                const key = String(record.workDate).slice(0, 10);
                                dailyWeights.set(key, (dailyWeights.get(key) || 0) + wt);
                            }
                        } catch (e) {}
                    }
                });

                const actualWeight = dailyWeights.size > 0
                    ? (isCurrentMonth
                        ? (dailyWeights.get(Array.from(dailyWeights.keys()).sort().pop() || '') || 0)
                        : Array.from(dailyWeights.values()).reduce((sum, value) => sum + value, 0))
                    : 0;

                // Get budget for the selected month
                const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const monthProp = `budget${monthNamesShort[Number(month) - 1]}`;
                const budget = Number(config[monthProp] || 0);

                setPerformance({
                    actual: actualWeight,
                    budget: budget,
                    percent: budget > 0 ? (actualWeight / budget) * 100 : 0
                });
            } catch (err) {
                console.error("Failed to fetch crop performance", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPerformance();
    }, [tenantId, activeCrop, selectedMonth]);

    return (
        <DashboardCard 
            title="Crop Performance (vs Budget)" 
            icon={<MenuBookIcon />}
            filters={
                <Box display="flex" gap={1.5}>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <InputLabel>Crop</InputLabel>
                        <Select
                            value={activeCrop}
                            label="Crop"
                            onChange={(e) => setActiveCrop(e.target.value)}
                        >
                            {availableCrops.map(crop => (
                                <MenuItem key={crop} value={crop}>{crop.charAt(0).toUpperCase() + crop.slice(1).toLowerCase()}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl size="small">
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                outline: 'none',
                                color: '#1e293b',
                                fontWeight: '500'
                            }}
                        />
                    </FormControl>
                </Box>
            }
        >
            {loading ? (
                <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
            ) : performance ? (
                <Box>
                    <Grid container spacing={4}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Paper variant="outlined" sx={{ p: 2.5, textAlign: 'center', bgcolor: '#fdfcfe', borderRadius: 3 }}>
                                <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 'bold', textTransform: 'uppercase' }}>Achievement</Typography>
                                <Typography variant="h4" fontWeight="800" sx={{ color: '#4f46e5', my: 0.5 }}>{performance.actual.toLocaleString()} <Typography component="span" variant="subtitle1">kg</Typography></Typography>
                                <Typography variant="body2" color="text.secondary">Total harvested this month to date</Typography>
                            </Paper>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Paper variant="outlined" sx={{ p: 2.5, textAlign: 'center', bgcolor: '#fffbeb', borderRadius: 3 }}>
                                <Typography variant="caption" sx={{ color: '#d97706', fontWeight: 'bold', textTransform: 'uppercase' }}>Target Budget</Typography>
                                <Typography variant="h4" fontWeight="800" sx={{ color: '#b45309', my: 0.5 }}>{performance.budget.toLocaleString()} <Typography component="span" variant="subtitle1">kg</Typography></Typography>
                                <Typography variant="body2" color="text.secondary">Budgeted for {new Date(selectedMonth).toLocaleString('default', { month: 'long' })}</Typography>
                            </Paper>
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 2, px: 1 }}>
                        <Box display="flex" justifyContent="space-between" mb={1} alignItems="center">
                            <Box display="flex" alignItems="center" gap={1}>
                                <StarIcon fontSize="small" sx={{ color: '#fbbf24' }} />
                                <Typography variant="subtitle2" fontWeight="bold" color="#1e293b">Target Achievement</Typography>
                            </Box>
                            <Typography variant="h6" fontWeight="bold" color={performance.percent >= 100 ? '#10b981' : '#f59e0b'}>
                                {performance.percent.toFixed(1)}%
                            </Typography>
                        </Box>
                        <LinearProgress 
                            variant="determinate" 
                            value={Math.min(performance.percent, 100)} 
                            sx={{ 
                                height: 12, 
                                borderRadius: 6, 
                                bgcolor: '#f1f5f9',
                                '& .MuiLinearProgress-bar': {
                                    bgcolor: performance.percent >= 100 ? '#10b981' : '#f59e0b',
                                    borderRadius: 6
                                }
                            }} 
                        />
                        {performance.percent < 100 && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                Shortfall of {(performance.budget - performance.actual).toLocaleString()} kg to reach target.
                            </Typography>
                        )}
                        {performance.percent >= 100 && (
                            <Typography variant="caption" color="#10b981" sx={{ mt: 1, display: 'block', fontWeight: 'bold' }}>
                                Target Exceeded! Well done.
                            </Typography>
                        )}
                    </Box>
                </Box>
            ) : (
                <Typography color="text.secondary">No performance data available for this selection.</Typography>
            )}
        </DashboardCard>
    );
};

export default CropPerformanceCard;
