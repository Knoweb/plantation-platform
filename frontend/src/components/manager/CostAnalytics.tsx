import React, { useState, useEffect } from 'react';
import { Box, Typography, Select, MenuItem, FormControl, InputLabel, Grid, CircularProgress, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Area } from 'recharts';
import axios from 'axios';
import PaymentsIcon from '@mui/icons-material/Payments';
import DashboardCard from './DashboardCard';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { eachDayOfInterval, format, endOfMonth, eachWeekOfInterval, isSameDay, isSameWeek } from 'date-fns';

interface CostAnalyticsProps {
    tenantId: string;
}

const CostAnalytics: React.FC<CostAnalyticsProps> = ({ tenantId }) => {
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
    const [loading, setLoading] = useState<boolean>(true);
    const [chartData, setChartData] = useState<any[]>([]);
    const [totalCost, setTotalCost] = useState<number>(0);
    const [avgCostPerKg, setAvgCostPerKg] = useState<number>(0);
    const [activeMetric, setActiveMetric] = useState<'cost' | 'costPerKg'>('cost');

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                let startDate, endDate;
                if (granularity === 'monthly') {
                    startDate = `${selectedYear}-01-01`;
                    endDate = `${selectedYear}-12-31`;
                } else {
                    const monthStr = String(selectedMonth + 1).padStart(2, '0');
                    startDate = `${selectedYear}-${monthStr}-01`;
                    endDate = format(endOfMonth(new Date(selectedYear, selectedMonth)), 'yyyy-MM-dd');
                }

                const [costsRes, workRes, attRes, workersRes, fieldsRes, configRes] = await Promise.all([
                    axios.get(`/api/daily-costs/range?tenantId=${tenantId}&cropType=TEA&startDate=${startDate}&endDate=${endDate}`),
                    axios.get(`/api/operations/daily-work?tenantId=${tenantId}`),
                    axios.get(`/api/operations/attendance?tenantId=${tenantId}&startDate=${startDate}&endDate=${endDate}`),
                    axios.get(`/api/workers?tenantId=${tenantId}`),
                    axios.get(`/api/fields?tenantId=${tenantId}`),
                    axios.get(`/api/crop-configs?tenantId=${tenantId}&cropType=TEA`)
                ]);

                const startDateObj = new Date(startDate);
                const endDateObj = new Date(endDate);

                const costRecords = costsRes.data || [];
                const processedCosts = costRecords.map((c: any) => {
                    let daySum = 0;
                    if (c.costData) {
                        try {
                            const categories = JSON.parse(c.costData);
                            if (Array.isArray(categories)) {
                                categories.forEach((cat: any) => {
                                    if (cat.items && Array.isArray(cat.items)) {
                                        cat.items.forEach((item: any) => {
                                            daySum += Number(item.dayAmount || 0);
                                        });
                                    }
                                });
                            }
                        } catch (e) {}
                    }
                    return { date: new Date(c.date), amount: daySum };
                });

                const config = configRes.data || {};
                const aththamaWage = Number(config.aththamaWage || 0);
                const overKiloRate = Number(config.overKiloRate || 0);

                const workerTypeMap = new Map();
                (workersRes.data || []).forEach((w: any) => workerTypeMap.set(w.id, w.employmentType));

                const fieldMap = new Map();
                (fieldsRes.data || []).forEach((f: any) => fieldMap.set(f.id, f.cropType));

                const workMap = new Map();
                (workRes.data || []).forEach((w: any) => {
                    const workD = new Date(w.workDate);
                    // Match crop and date range
                    if (workD >= startDateObj && workD <= endDateObj && fieldMap.get(w.fieldId)?.toLowerCase() === 'tea') {
                        workMap.set(w.workId || w.id, w);
                    }
                });

                // Pre-calculate Plucking Cost and Plucking Weight per day matching Crop Book logic
                const pluckingDataByDate = new Map();
                (attRes.data || []).forEach((a: any) => {
                    const work = workMap.get(a.dailyWorkId);
                    if (!work || !work.bulkWeights) return;
                    if (a.workType?.toLowerCase() !== 'plucking') return;
                    
                    const wType = workerTypeMap.get(a.workerId);
                    if (wType !== 'PERMANENT' && wType !== 'CASUAL') return;

                    let pKilos = 0;
                    let pCost = 0;
                    
                    if (a.status === 'PRESENT' || a.status === 'HALF_DAY') {
                        const am = Number(a.amWeight || a.am || 0);
                        const pm = Number(a.pmWeight || a.pm || 0);
                        pKilos += (am + pm);

                        if (a.status === 'PRESENT') {
                            pCost += aththamaWage;
                        } else {
                            pCost += aththamaWage / 2;
                        }
                        pCost += (Number(a.overKilos || 0) * overKiloRate);
                    }
                    
                    if (!a.workDate) return;
                    const ds = a.workDate;
                    const current = pluckingDataByDate.get(ds) || { cost: 0, weight: 0 };
                    current.cost += pCost;
                    current.weight += pKilos;
                    pluckingDataByDate.set(ds, current);
                });

                let aggregatedData: any[] = [];
                let totalCostSum = 0;
                let totalPluckingCostSum = 0;
                let totalPluckingWeightSum = 0;

                if (granularity === 'monthly') {
                    const monthsNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    aggregatedData = monthsNames.map((m, i) => {
                        const monthCost = processedCosts.filter(c => c.date.getMonth() === i).reduce((s, c) => s + c.amount, 0);
                        
                        let monthPluckingCost = 0;
                        let monthPluckingWeight = 0;
                        pluckingDataByDate.forEach((data, dateStr) => {
                            if (new Date(dateStr).getMonth() === i) {
                                monthPluckingCost += data.cost;
                                monthPluckingWeight += data.weight;
                            }
                        });

                        totalCostSum += monthCost;
                        totalPluckingCostSum += monthPluckingCost;
                        totalPluckingWeightSum += monthPluckingWeight;
                        return { label: m, cost: monthCost, costPerKg: monthPluckingWeight > 0 ? monthPluckingCost / monthPluckingWeight : 0 };
                    });
                } else if (granularity === 'daily') {
                    const days = eachDayOfInterval({
                        start: new Date(selectedYear, selectedMonth, 1),
                        end: endOfMonth(new Date(selectedYear, selectedMonth, 1))
                    });
                    aggregatedData = days.map(day => {
                        const dayCost = processedCosts.filter(c => isSameDay(c.date, day)).reduce((s, c) => s + c.amount, 0);
                        
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const pData = pluckingDataByDate.get(dateStr) || { cost: 0, weight: 0 };

                        totalCostSum += dayCost;
                        totalPluckingCostSum += pData.cost;
                        totalPluckingWeightSum += pData.weight;
                        return { label: format(day, 'dd'), fullDate: format(day, 'MMM dd'), cost: dayCost, costPerKg: pData.weight > 0 ? pData.cost / pData.weight : 0 };
                    });
                } else if (granularity === 'weekly') {
                    const weeks = eachWeekOfInterval({
                        start: new Date(selectedYear, selectedMonth, 1),
                        end: endOfMonth(new Date(selectedYear, selectedMonth, 1))
                    });
                    aggregatedData = weeks.map((week, i) => {
                        const weekCost = processedCosts.filter(c => isSameWeek(c.date, week, { weekStartsOn: 1 })).reduce((s, c) => s + c.amount, 0);
                        
                        let weekPluckingCost = 0;
                        let weekPluckingWeight = 0;
                        pluckingDataByDate.forEach((data, dateStr) => {
                            if (isSameWeek(new Date(dateStr), week, { weekStartsOn: 1 })) {
                                weekPluckingCost += data.cost;
                                weekPluckingWeight += data.weight;
                            }
                        });

                        totalCostSum += weekCost;
                        totalPluckingCostSum += weekPluckingCost;
                        totalPluckingWeightSum += weekPluckingWeight;
                        return { label: `W${i + 1}`, fullDate: `Week of ${format(week, 'MMM dd')}`, cost: weekCost, costPerKg: weekPluckingWeight > 0 ? weekPluckingCost / weekPluckingWeight : 0 };
                    });
                }

                setChartData(aggregatedData);
                setTotalCost(totalCostSum);
                setAvgCostPerKg(totalPluckingWeightSum > 0 ? totalPluckingCostSum / totalPluckingWeightSum : 0);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchAnalytics();
    }, [tenantId, selectedYear, selectedMonth, granularity]);

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <Box sx={{ bgcolor: 'rgba(255, 255, 255, 0.95)', p: 1.5, border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backdropFilter: 'blur(4px)' }}>
                    <Typography variant="caption" fontWeight="bold" color="#64748b" display="block" mb={0.5}>
                        {payload[0].payload.fullDate || payload[0].payload.label}
                    </Typography>
                    {activeMetric === 'cost' ? (
                        <Typography variant="body1" fontWeight="bold" color="#3b82f6" mb={0.5}>
                            Cost: රු. {Number(payload[0].payload.cost).toLocaleString()}
                        </Typography>
                    ) : (
                        <Typography variant="body1" fontWeight="bold" color="#ef4444">
                            Plucking Cost / Kg: රු. {Number(payload[0].payload.costPerKg).toFixed(2)}
                        </Typography>
                    )}
                </Box>
            );
        }
        return null;
    };

    return (
        <DashboardCard 
            title="Cost Analytics" 
            icon={<MonetizationOnIcon sx={{ color: '#ef4444' }} />}
            filters={
                <Box display="flex" gap={1} flexWrap="wrap">
                    <ToggleButtonGroup
                        size="small"
                        value={granularity}
                        exclusive
                        onChange={(_, v) => v && setGranularity(v)}
                        sx={{ mr: 1, bgcolor: '#f8fafc' }}
                    >
                        <ToggleButton value="daily" sx={{ textTransform: 'none', fontWeight: 'bold' }}>Day</ToggleButton>
                        <ToggleButton value="weekly" sx={{ textTransform: 'none', fontWeight: 'bold' }}>Week</ToggleButton>
                        <ToggleButton value="monthly" sx={{ textTransform: 'none', fontWeight: 'bold' }}>Month</ToggleButton>
                    </ToggleButtonGroup>

                    {granularity !== 'monthly' && (
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                            <InputLabel>Month</InputLabel>
                            <Select value={selectedMonth} label="Month" onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                                {months.map((m, i) => (<MenuItem key={i} value={i}>{m}</MenuItem>))}
                            </Select>
                        </FormControl>
                    )}

                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <InputLabel>Year</InputLabel>
                        <Select value={selectedYear} label="Year" onChange={(e) => setSelectedYear(Number(e.target.value))}>
                            {[2024, 2025, 2026].map(y => (<MenuItem key={y} value={y}>{y}</MenuItem>))}
                        </Select>
                    </FormControl>
                </Box>
            }
        >
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Box 
                        onClick={() => setActiveMetric('cost')}
                        sx={{ p: 2, borderRadius: 3, bgcolor: '#eff6ff', border: '1px solid', borderColor: activeMetric === 'cost' ? '#3b82f6' : '#bfdbfe', display: 'flex', alignItems: 'center', gap: 2.5, cursor: 'pointer', opacity: activeMetric === 'cost' ? 1 : 0.6, transition: 'all 0.2s', boxShadow: activeMetric === 'cost' ? '0 4px 12px -2px rgba(59, 130, 246, 0.2)' : 'none' }}>
                        <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><PaymentsIcon /></Box>
                        <Box>
                            <Typography variant="caption" color="#1e40af" fontWeight="800" sx={{ textTransform: 'uppercase' }}>Total Cost</Typography>
                            <Typography variant="h5" fontWeight="900" color="#1e40af">රු. {totalCost.toLocaleString()}</Typography>
                        </Box>
                    </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Box 
                        onClick={() => setActiveMetric('costPerKg')}
                        sx={{ p: 2, borderRadius: 3, bgcolor: '#fef2f2', border: '1px solid', borderColor: activeMetric === 'costPerKg' ? '#ef4444' : '#fecaca', display: 'flex', alignItems: 'center', gap: 2.5, cursor: 'pointer', opacity: activeMetric === 'costPerKg' ? 1 : 0.6, transition: 'all 0.2s', boxShadow: activeMetric === 'costPerKg' ? '0 4px 12px -2px rgba(239, 68, 68, 0.2)' : 'none' }}>
                        <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><MonetizationOnIcon /></Box>
                        <Box>
                            <Typography variant="caption" color="#991b1b" fontWeight="800" sx={{ textTransform: 'uppercase' }}>Plucking Cost Per Kg</Typography>
                            <Typography variant="h5" fontWeight="900" color="#991b1b">රු. {avgCostPerKg.toFixed(2)}</Typography>
                        </Box>
                    </Box>
                </Grid>
            </Grid>
            
            <Box sx={{ flex: 1, minHeight: 280, width: '100%', mt: 2 }}>
                {loading ? ( 
                    <Box display="flex" justifyContent="center" alignItems="center" height="280px">
                        <CircularProgress sx={{ color: '#3b82f6' }} />
                    </Box> 
                ) : (
                    <ResponsiveContainer width="100%" height={280}>
                        <ComposedChart data={chartData}>
                            <defs>
                                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorCostPerKg" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="label" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} 
                                dy={10} 
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: activeMetric === 'cost' ? '#3b82f6' : '#ef4444', fontSize: 11 }} 
                            />
                            <Tooltip content={<CustomTooltip />} />
                            {activeMetric === 'cost' ? (
                                <Area 
                                    type="monotone" 
                                    dataKey="cost" 
                                    stroke="#3b82f6" 
                                    strokeWidth={3} 
                                    fillOpacity={1} 
                                    fill="url(#colorCost)" 
                                    animationDuration={1000}
                                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3, stroke: '#fff' }}
                                    activeDot={{ r: 5, strokeWidth: 0 }}
                                />
                            ) : (
                                <Area 
                                    type="monotone" 
                                    dataKey="costPerKg" 
                                    stroke="#ef4444" 
                                    strokeWidth={3} 
                                    fillOpacity={1} 
                                    fill="url(#colorCostPerKg)" 
                                    animationDuration={1000}
                                    dot={{ fill: '#ef4444', strokeWidth: 2, r: 3, stroke: '#fff' }}
                                    activeDot={{ r: 5, strokeWidth: 0 }}
                                />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </Box>
        </DashboardCard>
    );
};

export default CostAnalytics;
