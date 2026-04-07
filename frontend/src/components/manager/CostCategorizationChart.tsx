import React, { useState, useEffect, useMemo } from 'react';
import { 
    Box, 
    Typography, 
    ToggleButton, 
    ToggleButtonGroup, 
    CircularProgress, 
    Divider,
    IconButton,
    Select,
    MenuItem,
    FormControl,
    Stack
} from '@mui/material';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    Tooltip, 
    ResponsiveContainer, 
    Cell,
    LabelList
} from 'recharts';
import axios from 'axios';
import BarChartIcon from '@mui/icons-material/BarChart';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { format, endOfMonth, isAfter } from 'date-fns';
import DashboardCard from './DashboardCard';

interface CostCategorizationChartProps {
    tenantId: string;
}

const FILTERS = [
    { label: 'Today', value: 'dayAmount' },
    { label: 'To-date', value: 'todateAmount' },
    { label: 'Last Month', value: 'lastMonthAmount' },
    { label: 'YTD', value: 'ytdAmount' }
];

const CATEGORY_COLORS: Record<string, string> = {
    'Plucking': '#10b981',
    'Chemical Weeding': '#ef4444',
    'Manual Weeding': '#f59e0b',
    'Fertilizing': '#3b82f6',
    'Roads': '#6366f1',
    'Staff': '#8b5cf6',
    'General': '#94a3b8'
};

const monthsList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const CostCategorizationChart: React.FC<CostCategorizationChartProps> = ({ tenantId }) => {
    const [loading, setLoading] = useState(true);
    const [selectedFilter, setSelectedFilter] = useState('todateAmount');
    const [chartData, setChartData] = useState<any[]>([]);
    const [activeCrop, setActiveCrop] = useState('Tea');
    const [availableCrops, setAvailableCrops] = useState<string[]>(['Tea']);
    const [drillDownCategory, setDrillDownCategory] = useState<string | null>(null);
    const [fullData, setFullData] = useState<any[]>([]);
    
    // New selection state
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear - i);
    }, []);

    useEffect(() => {
        const fetchCrops = async () => {
            try {
                const res = await axios.get(`/api/fields?tenantId=${tenantId}`);
                const crops = Array.from(new Set((res.data || []).map((f: any) => f.cropType).filter(Boolean))) as string[];
                if (crops.length > 0) setAvailableCrops(crops);
            } catch (e) { console.error("Crop fetch failed", e); }
        };
        fetchCrops();
    }, [tenantId]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Determine target date: If today's month/year, use today. Else use end of that month.
                const now = new Date();
                const targetBase = new Date(selectedYear, selectedMonth, 1);
                let targetDateStr;
                
                if (selectedYear === now.getFullYear() && selectedMonth === now.getMonth()) {
                    targetDateStr = format(now, 'yyyy-MM-dd');
                } else {
                    targetDateStr = format(endOfMonth(targetBase), 'yyyy-MM-dd');
                }

                const res = await axios.get(`/api/daily-costs`, {
                    params: { tenantId, cropType: activeCrop.toUpperCase(), date: targetDateStr }
                });

                if (res.data?.costData) {
                    const categories = JSON.parse(res.data.costData);
                    setFullData(categories);
                } else {
                    setFullData([]);
                }
            } catch (e) {
                console.error("Chart data fetch failed", e);
                setFullData([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [tenantId, activeCrop, selectedYear, selectedMonth]);

    useEffect(() => {
        if (!fullData || fullData.length === 0) {
            setChartData([]);
            return;
        }

        if (drillDownCategory) {
            const categoryObj = fullData.find(cat => cat.category === drillDownCategory);
            if (categoryObj && categoryObj.items) {
                const data = categoryObj.items.map((item: any) => ({
                    name: item.itemName,
                    amount: Number(item[selectedFilter] || 0),
                    fullItem: item
                })).sort((a: any, b: any) => b.amount - a.amount);
                setChartData(data);
            }
        } else {
            const data = fullData.map((cat: any) => ({
                name: cat.category,
                amount: Number(cat[selectedFilter] || 0),
                raw: cat
            })).sort((a: any, b: any) => b.amount - a.amount);
            setChartData(data);
        }
    }, [fullData, selectedFilter, drillDownCategory]);

    const handleBarClick = (data: any) => {
        if (!drillDownCategory) {
            setDrillDownCategory(data.name);
        }
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <Box sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.95)', p: 1.5, 
                    border: '1px solid #e2e8f0', borderRadius: 2, 
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    backdropFilter: 'blur(8px)'
                }}>
                    <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block">
                        {drillDownCategory ? 'ITEM' : 'CATEGORY'}
                    </Typography>
                    <Typography variant="subtitle1" fontWeight="900" color="#1e293b">
                        {payload[0].payload.name}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="h6" fontWeight="1000" color="#10b981">
                        Rs. {payload[0].value.toLocaleString()}
                    </Typography>
                </Box>
            );
        }
        return null;
    };

    return (
        <DashboardCard
            title="Cost Distribution"
            subtitle={`Analyzing expenses for ${monthsList[selectedMonth]} ${selectedYear}`}
            icon={<BarChartIcon sx={{ color: '#10b981' }} />}
            filters={
                <ToggleButtonGroup
                    size="small"
                    value={selectedFilter}
                    exclusive
                    onChange={(_, v) => v && setSelectedFilter(v)}
                    sx={{ 
                        bgcolor: '#f1f5f9', p: 0.5, borderRadius: 2,
                        '& .MuiToggleButton-root': {
                            px: 2, py: 0.5, border: 'none', borderRadius: '6px !important',
                            textTransform: 'none', fontWeight: '800', fontSize: '0.7rem', color: '#64748b',
                            '&.Mui-selected': { bgcolor: '#ffffff', color: '#10b981', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }
                        }
                    }}
                >
                    {FILTERS.map(f => <ToggleButton key={f.value} value={f.value}>{f.label}</ToggleButton>)}
                </ToggleButtonGroup>
            }
        >
            {/* Extended Control Bar (Month/Year/Crop Selection) */}
            <Box sx={{ 
                mb: 3, p: 1.5, borderRadius: 3, 
                bgcolor: '#f8fafc', border: '1px solid #f1f5f9',
                display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap'
            }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="caption" fontWeight="1000" color="text.secondary" sx={{ textTransform: 'uppercase' }}>Period:</Typography>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <Select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            sx={{ borderRadius: 2, bgcolor: '#ffffff', height: 28, fontSize: '0.65rem', fontWeight: '800', border: '1px solid #e2e8f0', '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}
                        >
                            {monthsList.map((m, i) => (<MenuItem key={i} value={i} sx={{ fontSize: '0.7rem' }}>{m}</MenuItem>))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 70 }}>
                        <Select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            sx={{ borderRadius: 2, bgcolor: '#ffffff', height: 28, fontSize: '0.65rem', fontWeight: '800', border: '1px solid #e2e8f0', '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}
                        >
                            {years.map(y => (<MenuItem key={y} value={y} sx={{ fontSize: '0.7rem' }}>{y}</MenuItem>))}
                        </Select>
                    </FormControl>
                </Stack>

                <Divider orientation="vertical" flexItem sx={{ mx: 1, opacity: 0.5 }} />

                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="caption" fontWeight="1000" color="text.secondary" sx={{ textTransform: 'uppercase' }}>Crop:</Typography>
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                        <Select
                            value={activeCrop}
                            onChange={(e) => setActiveCrop(e.target.value)}
                            sx={{ borderRadius: 2, bgcolor: '#ffffff', height: 28, fontSize: '0.65rem', fontWeight: '800', border: '1px solid #e2e8f0', '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}
                        >
                            {availableCrops.map(c => <MenuItem key={c} value={c} sx={{ fontSize: '0.7rem' }}>{c}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Stack>

                {drillDownCategory && (
                    <IconButton 
                        size="small" 
                        onClick={() => setDrillDownCategory(null)}
                        sx={{ ml: 'auto', bgcolor: '#f1f5f9', color: '#10b981', '&:hover': { bgcolor: '#e2e8f0' } }}
                    >
                        <ArrowBackIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                )}
            </Box>

            {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" height={360}>
                    <CircularProgress sx={{ color: '#10b981' }} size={40} thickness={4} />
                </Box>
            ) : chartData.length > 0 ? (
                <Box sx={{ width: '100%', height: 360, mt: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                            data={chartData} 
                            layout="vertical" 
                            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            onClick={(data) => data?.activePayload && handleBarClick(data.activePayload[0].payload)}
                        >
                            <XAxis type="number" hide />
                            <YAxis 
                                type="category" 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                width={120}
                                tick={{ fill: '#475569', fontSize: 11, fontWeight: '700' }}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.5 }} />
                            <Bar 
                                dataKey="amount" 
                                radius={[0, 8, 8, 0]} 
                                barSize={24}
                                animationDuration={1000}
                                style={{ cursor: drillDownCategory ? 'default' : 'pointer' }}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={drillDownCategory ? CATEGORY_COLORS[drillDownCategory] || '#10b981' : CATEGORY_COLORS[entry.name] || '#10b981'} 
                                        fillOpacity={0.9}
                                    />
                                ))}
                                <LabelList 
                                    dataKey="amount" 
                                    position="right" 
                                    formatter={(v: number) => `Rs. ${v.toLocaleString()}`} 
                                    style={{ fill: '#475569', fontSize: 11, fontWeight: '900' }} 
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Box>
            ) : (
                <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height={360} sx={{ opacity: 0.5 }}>
                    <InfoOutlinedIcon sx={{ fontSize: 40, mb: 1, color: '#94a3b8' }} />
                    <Typography variant="subtitle2" fontWeight="800" color="text.secondary">No cost data for this period</Typography>
                </Box>
            )}

            <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary" fontWeight="700">
                    {drillDownCategory ? `Viewing breakdown for ${drillDownCategory}` : 'Authoritative Financial Distribution'}
                </Typography>
                <Typography variant="caption" fontWeight="900" color="#10b981" sx={{ letterSpacing: 1 }}>
                    LIVE DATA SOURCE
                </Typography>
            </Box>
        </DashboardCard>
    );
};

export default CostCategorizationChart;
