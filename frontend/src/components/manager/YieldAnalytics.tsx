import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Select, MenuItem, FormControl, CircularProgress, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import axios from 'axios';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DashboardCard from './DashboardCard';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import { eachDayOfInterval, format, endOfMonth, eachWeekOfInterval, isSameDay, isSameWeek } from 'date-fns';

interface YieldAnalyticsProps {
    tenantId: string;
}

interface ChartDataPoint {
    label: string;
    fullDate?: string;
    value: number;
}

const YieldAnalytics: React.FC<YieldAnalyticsProps> = ({ tenantId }) => {
    const [divisions, setDivisions] = useState<any[]>([]);
    const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // 0-indexed
    const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
    const [loading, setLoading] = useState<boolean>(true);
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
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
                    const monthStr = String(selectedMonth + 1).padStart(2, '0');
                    startDate = `${selectedYear}-${monthStr}-01`;
                    endDate = format(endOfMonth(new Date(selectedYear, selectedMonth)), 'yyyy-MM-dd');
                }

                const res = await axios.get(`/api/operations/daily-work?tenantId=${tenantId}`);
                const records = res.data || [];

                const startDateObj = new Date(startDate);
                const endDateObj = new Date(endDate);

                const validMusters = records.filter((r: any) => {
                    const workD = new Date(r.workDate);
                    const inRange = workD >= startDateObj && workD <= endDateObj;
                    const hasWeights = r.bulkWeights && r.bulkWeights !== '';
                    const matchesDivision = selectedDivision === 'ALL' || String(r.divisionId) === String(selectedDivision);
                    return inRange && hasWeights && matchesDivision;
                });

                const recordsWithParsedWeights = validMusters.map((r: any) => {
                    let weight = 0;
                    try {
                        const weights = JSON.parse(r.bulkWeights);
                        weight = Number(weights['__FACTORY__']?.factoryWt || 0);
                    } catch (e) {}
                    return { ...r, parsedWeight: weight, date: new Date(r.workDate) };
                });

                let aggregatedData: ChartDataPoint[] = [];
                let total = 0;

                if (granularity === 'monthly') {
                    const monthsNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    aggregatedData = monthsNames.map((m, i) => {
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
                        return { label: `W${i + 1}`, fullDate: `Week of ${format(week, 'MMM dd')}`, value: weekSum };
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
                <Box sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.9)', p: 1.5, 
                    border: '1px solid rgba(16, 185, 129, 0.2)', 
                    borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.1)', 
                    backdropFilter: 'blur(10px)' 
                }}>
                    <Typography variant="caption" fontWeight="800" color="#64748b" display="block" mb={0.5} sx={{ textTransform: 'uppercase' }}>
                        {payload[0].payload.fullDate || payload[0].payload.label}
                    </Typography>
                    <Typography variant="h6" fontWeight="900" color="#10b981">
                        {payload[0].value.toLocaleString()} <Typography component="span" variant="caption" fontWeight="800">kg</Typography>
                    </Typography>
                </Box>
            );
        }
        return null;
    };

    return (
        <DashboardCard 
            variant="amber"
            title="Yield Analytics" 
            icon={<AgricultureIcon sx={{ color: '#10b981' }} />}
        >
            {/* Relocated Filter Bar: Integrated into Body for better space management */}
            <Box sx={{ 
                mb: 3, p: 1.5, borderRadius: 3, 
                bgcolor: '#f8fafc', border: '1px solid #f1f5f9',
                display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap'
            }}>
                <ToggleButtonGroup
                    size="small"
                    value={granularity}
                    exclusive
                    onChange={(_, v) => v && setGranularity(v)}
                    sx={{ 
                        bgcolor: '#ffffff', p: 0.5, borderRadius: 2, border: '1px solid #e2e8f0',
                        '& .MuiToggleButton-root': {
                            px: 1.5, py: 0.25, border: 'none', borderRadius: '6px !important',
                            textTransform: 'none', fontWeight: '800', fontSize: '0.65rem', color: '#64748b',
                            '&.Mui-selected': { bgcolor: '#f1f5f9', color: '#10b981' }
                        }
                    }}
                >
                    <ToggleButton value="daily">Day</ToggleButton>
                    <ToggleButton value="weekly">Week</ToggleButton>
                    <ToggleButton value="monthly">Month</ToggleButton>
                </ToggleButtonGroup>

                <FormControl size="small" sx={{ minWidth: 100 }}>
                    <Select
                        value={selectedDivision}
                        onChange={(e) => setSelectedDivision(e.target.value)}
                        sx={{ borderRadius: 2, bgcolor: '#ffffff', height: 28, fontSize: '0.65rem', fontWeight: '800', border: '1px solid #e2e8f0', '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}
                    >
                        <MenuItem value="ALL" sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>All Divisions</MenuItem>
                        {divisions.map((d: any) => (<MenuItem key={d.divisionId} value={d.divisionId} sx={{ fontSize: '0.7rem' }}>{d.name}</MenuItem>))}
                    </Select>
                </FormControl>

                {granularity !== 'monthly' && (
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                        <Select 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            sx={{ borderRadius: 2, bgcolor: '#ffffff', height: 28, fontSize: '0.65rem', fontWeight: '800', border: '1px solid #e2e8f0', '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}
                        >
                            {months.map((m, i) => (<MenuItem key={i} value={i} sx={{ fontSize: '0.7rem' }}>{m.slice(0,3)}</MenuItem>))}
                        </Select>
                    </FormControl>
                )}

                <FormControl size="small" sx={{ minWidth: 70 }}>
                    <Select 
                        value={selectedYear} 
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        sx={{ borderRadius: 2, bgcolor: '#ffffff', height: 28, fontSize: '0.65rem', fontWeight: '800', border: '1px solid #e2e8f0', '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}
                    >
                        {years.map(y => (<MenuItem key={y} value={y} sx={{ fontSize: '0.7rem' }}>{y}</MenuItem>))}
                    </Select>
                </FormControl>
            </Box>

            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight="900" sx={{ textTransform: 'uppercase', letterSpacing: 2, opacity: 0.8 }}>
                        {granularity === 'monthly' ? `Total Harvested (${selectedYear})` : `Period Harvested (${months[selectedMonth]})`}
                    </Typography>
                    <Box display="flex" alignItems="baseline" gap={1} mt={0.5}>
                        <Typography variant="h2" fontWeight="950" color="#1e293b" sx={{ letterSpacing: -2, lineHeight: 1 }}>
                            {totalYield.toLocaleString()}
                        </Typography>
                        <Typography variant="h5" fontWeight="900" color="#10b981" sx={{ opacity: 0.9 }}>
                            kg
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 2, py: 0.75, borderRadius: 10, bgcolor: '#f0fdf4', border: '1px solid #dcfce7', boxShadow: '0 2px 10px rgba(16, 185, 129, 0.05)' }}>
                        <TrendingUpIcon sx={{ fontSize: 16, color: '#166534' }} />
                        <Typography variant="caption" fontWeight="950" color="#166534">
                            LIVE TREND
                        </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block' }}>
                        Updated just now
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ flex: 1, minHeight: 320, width: '100%' }}>
                {loading ? ( 
                    <Box display="flex" justifyContent="center" alignItems="center" height="320px">
                        <CircularProgress sx={{ color: '#10b981' }} size={40} thickness={4} />
                    </Box> 
                ) : (
                    <ResponsiveContainer width="100%" height={320}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 35, left: -25, bottom: 25 }}>
                            <defs>
                                <linearGradient id="mainYieldGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                            <XAxis 
                                dataKey="label" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: '800' }} 
                                dy={10}
                                interval="preserveStartEnd" // Automatically hide overlapping labels while keeping first/last
                                minTickGap={15} // Ensure at least 15px between labels
                                padding={{ left: 15, right: 15 }}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: '700' }} 
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }} />
                            <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#10b981" 
                                strokeWidth={4} 
                                fillOpacity={1} 
                                fill="url(#mainYieldGradient)" 
                                animationDuration={1200}
                                animationEasing="ease-in-out"
                                dot={{ fill: '#10b981', strokeWidth: 0, r: 0 }}
                                activeDot={{ r: 6, strokeWidth: 3, stroke: '#fff', fill: '#10b981', filter: 'drop-shadow(0 0 5px rgba(16, 185, 129, 0.5))' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </Box>
        </DashboardCard>
    );
};

export default YieldAnalytics;
