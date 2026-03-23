import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Select, MenuItem, FormControl, InputLabel, Grid, CircularProgress, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import axios from 'axios';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DashboardCard from './DashboardCard';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import { eachDayOfInterval, format, endOfMonth, eachWeekOfInterval, isSameDay, isSameWeek } from 'date-fns';

interface YieldAnalyticsProps {
    tenantId: string;
}

const YieldAnalytics: React.FC<YieldAnalyticsProps> = ({ tenantId }) => {
    const [divisions, setDivisions] = useState<any[]>([]);
    const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // 0-indexed
    const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
    const [loading, setLoading] = useState<boolean>(true);
    const [chartData, setChartData] = useState<any[]>([]);
    const [totalYield, setTotalYield] = useState<number>(0);

    useEffect(() => {
        const fetchDivisions = async () => {
            try {
                const res = await axios.get(`/api/divisions?tenantId=${tenantId}`);
                setDivisions(res.data || []);
            } catch (err) { console.error(err); }
        };
        fetchDivisions();
    }, [tenantId]);

    useEffect(() => {
        const fetchYieldData = async () => {
            setLoading(true);
            try {
                let startDate, endDate;
                if (granularity === 'monthly') {
                    startDate = `${selectedYear}-01-01`;
                    endDate = `${selectedYear}-12-31`;
                } else {
                    // daily or weekly for a specific month
                    const monthStr = String(selectedMonth + 1).padStart(2, '0');
                    startDate = `${selectedYear}-${monthStr}-01`;
                    endDate = format(endOfMonth(new Date(selectedYear, selectedMonth)), 'yyyy-MM-dd');
                }

                // Fetch DailyWork (Muster Records)
                const res = await axios.get(`/api/operations/daily-work?tenantId=${tenantId}`);
                const records = res.data || [];

                const startDateObj = new Date(startDate);
                const endDateObj = new Date(endDate);

                // Filter for records that actually have submitted evening musters (bulkWeights exist)
                // match the selected division, and fall within the selected date range
                const validMusters = records.filter((r: any) => {
                    const workD = new Date(r.workDate);
                    const inRange = workD >= startDateObj && workD <= endDateObj;
                    const hasWeights = r.bulkWeights && r.bulkWeights !== '';
                    const matchesDivision = selectedDivision === 'ALL' || String(r.divisionId) === String(selectedDivision);
                    return inRange && hasWeights && matchesDivision;
                });

                // Extract factory weights
                const recordsWithParsedWeights = validMusters.map((r: any) => {
                    let weight = 0;
                    try {
                        const weights = JSON.parse(r.bulkWeights);
                        weight = Number(weights['__FACTORY__']?.factoryWt || 0);
                    } catch (e) {}
                    
                    return { ...r, parsedWeight: weight, date: new Date(r.workDate) };
                });

                let aggregatedData: any[] = [];
                let total = 0;

                if (granularity === 'monthly') {
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    aggregatedData = months.map((m, i) => {
                        const monthSum = recordsWithParsedWeights
                            .filter((r: any) => r.date.getMonth() === i)
                            .reduce((sum: number, r: any) => sum + r.parsedWeight, 0);
                        total += monthSum;
                        return { label: m, value: monthSum };
                    });
                } else if (granularity === 'daily') {
                    const days = eachDayOfInterval({
                        start: new Date(selectedYear, selectedMonth, 1),
                        end: endOfMonth(new Date(selectedYear, selectedMonth, 1))
                    });
                    aggregatedData = days.map(day => {
                        const daySum = recordsWithParsedWeights
                            .filter((r: any) => isSameDay(r.date, day))
                            .reduce((sum: number, r: any) => sum + r.parsedWeight, 0);
                        total += daySum;
                        return { label: format(day, 'dd'), fullDate: format(day, 'MMM dd'), value: daySum };
                    });
                } else if (granularity === 'weekly') {
                    const weeks = eachWeekOfInterval({
                        start: new Date(selectedYear, selectedMonth, 1),
                        end: endOfMonth(new Date(selectedYear, selectedMonth, 1))
                    });
                    aggregatedData = weeks.map((week, i) => {
                        const weekSum = recordsWithParsedWeights
                            .filter((r: any) => isSameWeek(r.date, week, { weekStartsOn: 1 }))
                            .reduce((sum: number, r: any) => sum + r.parsedWeight, 0);
                        total += weekSum;
                        return { label: `Week ${i + 1}`, fullDate: `Week of ${format(week, 'MMM dd')}`, value: weekSum };
                    });
                }

                setChartData(aggregatedData);
                setTotalYield(total);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchYieldData();
    }, [tenantId, selectedDivision, selectedYear, selectedMonth, granularity]);

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear - i);
    }, []);

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <Box sx={{ bgcolor: 'rgba(255, 255, 255, 0.95)', p: 1.5, border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backdropFilter: 'blur(4px)' }}>
                    <Typography variant="caption" fontWeight="bold" color="#64748b" display="block" mb={0.5}>
                        {payload[0].payload.fullDate || payload[0].payload.label}
                    </Typography>
                    <Typography variant="h6" fontWeight="900" color="#10b981">
                        {payload[0].value.toLocaleString()} <Typography component="span" variant="caption">kg</Typography>
                    </Typography>
                </Box>
            );
        }
        return null;
    };

    return (
        <DashboardCard 
            title="Yield Analytics" 
            icon={<AgricultureIcon color="success" />}
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

                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Division</InputLabel>
                        <Select
                            value={selectedDivision}
                            label="Division"
                            onChange={(e) => setSelectedDivision(e.target.value)}
                        >
                            <MenuItem value="ALL" sx={{ fontWeight: 'bold' }}>All Divisions</MenuItem>
                            {divisions.map((d: any) => (<MenuItem key={d.divisionId} value={d.divisionId}>{d.name}</MenuItem>))}
                        </Select>
                    </FormControl>

                    {granularity !== 'monthly' && (
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Month</InputLabel>
                            <Select value={selectedMonth} label="Month" onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                                {months.map((m, i) => (<MenuItem key={i} value={i}>{m}</MenuItem>))}
                            </Select>
                        </FormControl>
                    )}

                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <InputLabel>Year</InputLabel>
                        <Select value={selectedYear} label="Year" onChange={(e) => setSelectedYear(Number(e.target.value))}>
                            {years.map(y => (<MenuItem key={y} value={y}>{y}</MenuItem>))}
                        </Select>
                    </FormControl>
                </Box>
            }
        >
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
                <Grid size={{ xs: 12 }}>
                    <Box 
                        sx={{ 
                            p: 2, borderRadius: 3, 
                            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                            border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 2
                        }}
                    >
                        <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 8px 16px -4px rgba(16, 185, 129, 0.4)' }}>
                            <TrendingUpIcon sx={{ fontSize: 24 }} />
                        </Box>
                        <Box>
                            <Typography variant="caption" color="#166534" fontWeight="800" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                                {granularity === 'monthly' ? `Total Yield (${selectedYear})` : `Total Yield (${months[selectedMonth]})`}
                            </Typography>
                            <Typography variant="h4" fontWeight="900" color="#166534" sx={{ mt: -0.5 }}>
                                {totalYield.toLocaleString()} <Typography component="span" variant="subtitle1" fontWeight="700">kg</Typography>
                            </Typography>
                        </Box>
                    </Box>
                </Grid>
            </Grid>

            <Box sx={{ flex: 1, minHeight: 280, width: '100%' }}>
                {loading ? ( 
                    <Box display="flex" justifyContent="center" alignItems="center" height="280px">
                        <CircularProgress sx={{ color: '#10b981' }} />
                    </Box> 
                ) : (
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="label" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} 
                                dy={10} 
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#64748b', fontSize: 12 }} 
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#10b981" 
                                strokeWidth={4} 
                                fillOpacity={1} 
                                fill="url(#colorYield)" 
                                animationDuration={1500}
                                dot={{ fill: '#10b981', strokeWidth: 2, r: 4, stroke: '#fff' }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </Box>
        </DashboardCard>
    );
};

export default YieldAnalytics;
