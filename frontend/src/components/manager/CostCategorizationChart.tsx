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
    Stack,
    useMediaQuery,
    useTheme
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
import { format, endOfMonth } from 'date-fns';
import DashboardCard from './DashboardCard';

interface CostCategorizationChartProps {
    tenantId: string;
}

interface WorkItem {
    id: string;
    name: string;
    dayAmount: string;
    todateAmount: string;
    lastMonthAmount: string;
    ytdAmount: string;
    [key: string]: string; // For selectedFilter access
}

interface Category {
    id: string;
    name: string;
    items: WorkItem[];
    [key: string]: any;
}

interface ChartDataPoint {
    name: string;
    amount: number;
    raw?: Category;
    fullItem?: WorkItem;
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
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [loading, setLoading] = useState(true);
    const [selectedFilter, setSelectedFilter] = useState('todateAmount');
    const [chartData, setChartData] = useState<any[]>([]);
    const [activeCrop, setActiveCrop] = useState('TEA');
    const [availableCrops, setAvailableCrops] = useState<string[]>(['TEA']);
    const [drillDownCategory, setDrillDownCategory] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
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
                const crops = Array.from(new Set((res.data || []).map((f: any) => String(f.cropType).toUpperCase()).filter(Boolean))) as string[];
                if (crops.length > 0) {
                    setAvailableCrops(crops);
                    if (!crops.includes(activeCrop)) {
                        setActiveCrop(crops[0]);
                    }
                }
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
            const categoryObj = (fullData as Category[]).find(cat => (cat.name || (cat as any).category) === drillDownCategory);
            if (categoryObj && categoryObj.items) {
                const data: ChartDataPoint[] = categoryObj.items
                    .map((item: WorkItem) => ({
                        name: item.name,
                        amount: Number(item[selectedFilter] || 0),
                        fullItem: item
                    }))
                    .filter((item: ChartDataPoint) => item.amount > 0) // Filter zero costs
                    .sort((a: ChartDataPoint, b: ChartDataPoint) => b.amount - a.amount);
                setChartData(data);
            }
        } else {
            const data: ChartDataPoint[] = (fullData as Category[])
                .map((cat: Category) => {
                    const total = (cat.items || []).reduce((sum: number, item: WorkItem) => {
                        return sum + Number(item[selectedFilter] || 0);
                    }, 0);
                    
                    return {
                        name: cat.name || (cat as any).category,
                        amount: total,
                        raw: cat
                    };
                })
                .filter((cat: ChartDataPoint) => cat.amount > 0) // Filter zero costs
                .sort((a: ChartDataPoint, b: ChartDataPoint) => b.amount - a.amount);
            setChartData(data);
        }
    }, [fullData, selectedFilter, drillDownCategory]);


    const renderActiveShape = (props: any) => {
        const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value, percent } = props;

        return (
            <g>
                <text x={cx} y={cy} dy={8} textAnchor="middle" fill="#1e293b" style={{ fontSize: '1.2rem', fontWeight: '1000' }}>
                    {((percent || 0) * 100).toFixed(0)}%
                </text>
                <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={fill}
                />
                <Sector
                    cx={cx}
                    cy={cy}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    innerRadius={outerRadius + 6}
                    outerRadius={outerRadius + 10}
                    fill={fill}
                />
                <path d={`M${cx},${cy}L${cx + 10},${cy + 10}`} stroke={fill} fill="none" />
                <text x={cx > 200 ? cx + 120 : cx - 120} y={cy} textAnchor={cx > 200 ? "start" : "end"} fill="#1e293b" style={{ fontSize: '0.85rem', fontWeight: '900' }}>{payload.name}</text>
                <text x={cx > 200 ? cx + 120 : cx - 120} y={cy} dy={20} textAnchor={cx > 200 ? "start" : "end"} fill="#64748b" style={{ fontSize: '0.75rem', fontWeight: '700' }}>
                    Rs. {value?.toLocaleString()}
                </text>
            </g>
        );
    };

    const CustomTooltip = ({ active, payload }: { active?: boolean, payload?: any[] }) => {
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

    const CustomLegend = () => {
        if (isMobile) return null;
        return (
            <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                justifyContent: 'center', 
                gap: 2, 
                mt: 3,
                px: 2,
                pb: 2
            }}>
                {chartData.map((entry, index) => (
                    <Box key={`legend-${index}`} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <Box sx={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            bgcolor: drillDownCategory ? CATEGORY_COLORS[drillDownCategory] || '#10b981' : CATEGORY_COLORS[entry.name] || '#10b981'
                        }} />
                        <Typography sx={{ color: '#64748b', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.01em' }}>
                            {entry.name}
                        </Typography>
                    </Box>
                ))}
            </Box>
        );
    };

    const MobileListView = () => {
        const totalAmount = chartData.reduce((sum, item) => sum + item.amount, 0);

        return (
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {chartData.map((item, index) => {
                    const percentage = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
                    const color = drillDownCategory ? CATEGORY_COLORS[drillDownCategory] || '#10b981' : CATEGORY_COLORS[item.name] || '#10b981';
                    const isSelected = selectedCategory === item.name;

                    return (
                        <Box 
                            key={`mobile-item-${index}`}
                            onClick={() => !drillDownCategory && setSelectedCategory(isSelected ? null : item.name)}
                            sx={{ 
                                bgcolor: '#ffffff', 
                                p: 1.8, 
                                borderRadius: 3, 
                                border: '2px solid',
                                borderColor: isSelected ? color : '#f1f5f9',
                                boxShadow: isSelected ? `0 10px 20px -5px ${color}20` : '0 2px 8px rgba(0,0,0,0.02)',
                                cursor: drillDownCategory ? 'default' : 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.2 }}>
                                <Box>
                                    <Typography sx={{ fontSize: '0.85rem', fontWeight: '900', color: '#1e293b', mb: 0.2 }}>
                                        {item.name}
                                    </Typography>
                                    <Typography sx={{ fontSize: '0.7rem', fontWeight: '700', color: isSelected ? color : '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        {percentage.toFixed(0)}% Total Cost
                                    </Typography>
                                </Box>
                                <Typography sx={{ fontSize: '1rem', fontWeight: '1000', color: color }}>
                                    Rs. {item.amount.toLocaleString()}
                                </Typography>
                            </Box>
                            
                            <Box sx={{ height: 8, width: '100%', bgcolor: '#f1f5f9', borderRadius: 4, overflow: 'hidden', mb: isSelected ? 2 : 0 }}>
                                <Box sx={{ 
                                    height: '100%', 
                                    width: `${percentage}%`, 
                                    bgcolor: color, 
                                    borderRadius: 4,
                                    transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                                }} />
                            </Box>

                            {isSelected && !drillDownCategory && (
                                <Box 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDrillDownCategory(item.name);
                                        setSelectedCategory(null);
                                    }}
                                    sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        gap: 1,
                                        py: 1.2,
                                        bgcolor: color,
                                        borderRadius: 2,
                                        color: '#ffffff',
                                        animation: 'fadeInUp 0.3s ease-out'
                                    }}
                                >
                                    <Typography sx={{ fontSize: '0.75rem', fontWeight: '900' }}>VIEW BREAKDOWN</Typography>
                                    <ArrowBackIcon sx={{ fontSize: 14, transform: 'rotate(180deg)' }} />
                                </Box>
                            )}

                            <style>{`
                                @keyframes fadeInUp {
                                    from { opacity: 0; transform: translateY(10px); }
                                    to { opacity: 1; transform: translateY(0); }
                                }
                            `}</style>
                        </Box>
                    );
                })}
            </Box>
        );
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
                <Box sx={{ mt: 2 }}>
                    {isMobile ? (
                        <MobileListView />
                    ) : (
                        <Box sx={{ 
                            display: 'block', 
                            width: '100%', 
                            height: 380, 
                            position: 'relative',
                        }}>
                            <ResponsiveContainer width="100%" height="100%" debounce={200}>
                                <BarChart 
                                    data={chartData} 
                                    margin={{ top: 30, right: 30, left: 10, bottom: 20 }}
                                >
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        interval={0}
                                        tick={{ fill: '#1e293b', fontSize: 11, fontWeight: '800' }}
                                        height={40}
                                    />
                                    <YAxis hide domain={[0, 'auto']} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.5 }} />
                                    
                                    <Bar 
                                        dataKey="amount" 
                                        radius={[12, 12, 0, 0]} 
                                        barSize={45}
                                        onClick={(data: any) => !drillDownCategory && data.name && setDrillDownCategory(data.name)}
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
                                            position="top" 
                                            formatter={(v: any) => `Rs.${v.toLocaleString()}`} 
                                            style={{ fill: '#1e293b', fontSize: 11, fontWeight: '1000' }} 
                                            offset={10}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    )}
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
