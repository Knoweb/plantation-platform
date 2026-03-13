import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tab, CircularProgress, TextField } from '@mui/material';
import { useState, useEffect } from 'react';
import axios from 'axios';

interface CostItem {
    id: string;
    name: string;
    dayAmount?: string;
    todateAmount?: string;
    lastMonthAmount?: string;
    ytdAmount?: string;
}

interface CostCategory {
    id: string;
    name: string;
    items: CostItem[];
}

const CROP_COLORS: Record<string, { tab: string; total: string }> = {
    Tea: { tab: '#2e7d32', total: '#e8f5e9' },
    Rubber: { tab: '#0277bd', total: '#e1f5fe' },
    Cinnamon: { tab: '#e65100', total: '#fff3e0' },
};
const DEFAULT_COLOR = { tab: '#757575', total: '#f5f5f5' };

const fmt = (val?: string) => {
    const n = parseFloat(val || '0');
    return n > 0 ? n.toLocaleString('en-LK', { minimumFractionDigits: 2 }) : '-';
};

const catTotal = (items: CostItem[], field: keyof CostItem) =>
    items.reduce((s, i) => s + (parseFloat((i[field] as string) || '0') || 0), 0);

const fmtTotal = (n: number) => n > 0 ? n.toLocaleString('en-LK', { minimumFractionDigits: 2 }) : '-';

const fmtPerKg = (amtTotal: number, weight?: number) => {
    if (amtTotal === 0 || !weight || weight === 0) return '-';
    return amtTotal.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function CostAnalysis() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const [activeCrop, setActiveCrop] = useState('Tea');
    const [availableCrops, setAvailableCrops] = useState<string[]>(['Tea']);
    const [categories, setCategories] = useState<CostCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [now, setNow] = useState(new Date());
    
    // date selection
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );

    const [fieldCropMap, setFieldCropMap] = useState<Map<string, string>>(new Map());
    const [weights, setWeights] = useState({ day: 0, todate: 0, lastMonth: 0, ytd: 0 });

    // Live clock
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        axios.get(`/api/fields?tenantId=${userSession.tenantId}`)
            .then(r => {
                const crops = Array.from(new Set((r.data || []).map((f: any) => f.cropType).filter(Boolean))) as string[];
                if (crops.length > 0) { setAvailableCrops(crops); setActiveCrop(crops[0]); }
                
                const fMap = new Map<string, string>();
                r.data.forEach((f: any) => {
                    if (f.name && f.cropType) fMap.set(f.name.toLowerCase(), f.cropType.toUpperCase());
                    if (f.id && f.cropType) fMap.set(String(f.id), f.cropType.toUpperCase());
                });
                setFieldCropMap(fMap);
            }).catch(() => { });
    }, [userSession.tenantId]);

    useEffect(() => {
        setLoading(true);
        axios.get(`/api/daily-costs`, {
            params: { tenantId: userSession.tenantId, cropType: activeCrop, date: selectedDate }
        })
        .then(r => {
            if (r.status === 200 && r.data?.costData) {
                try {
                    const parsed = JSON.parse(r.data.costData);
                    setCategories(Array.isArray(parsed) ? parsed : []);
                    setLoading(false);
                    return;
                } catch { }
            }
            fetchConfigFallback();
        })
        .catch(() => fetchConfigFallback());

        function fetchConfigFallback() {
            axios.get(`/api/crop-configs?tenantId=${userSession.tenantId}&cropType=${activeCrop}`)
                .then(r => {
                    if (r.data?.costItems) {
                        try {
                            const parsed = JSON.parse(r.data.costItems);
                            setCategories(Array.isArray(parsed) ? parsed : []);
                        } catch { setCategories([]); }
                    } else { setCategories([]); }
                }).catch(() => setCategories([]))
                .finally(() => setLoading(false));
        }
        
        // Fetch Daily Work for True Factory Weights
        const reqDateForFetch = new Date(`${selectedDate}T00:00:00`);
        const fwYearBase = reqDateForFetch.getMonth() >= 3 ? reqDateForFetch.getFullYear() : reqDateForFetch.getFullYear() - 1;
        const startFetchStr = `${fwYearBase}-04-01`;

        axios.get(`/api/operations/daily-work?tenantId=${userSession.tenantId}&startDate=${startFetchStr}&endDate=${selectedDate}`)
            .then(r => {
                let dWeight = 0, tWeight = 0, lmWeight = 0, ytdWeight = 0;
                const reqDate = new Date(`${selectedDate}T00:00:00`);
                const sYear = reqDate.getFullYear();
                const sMonth = reqDate.getMonth();
                const sDate = reqDate.getDate();

                const fwYear = sMonth >= 3 ? sYear : sYear - 1;
                const dYTD = new Date(fwYear, 3, 1);
                const lDateStart = new Date(sYear, sMonth - 1, 1);
                const lDateEnd = new Date(sYear, sMonth, 0);

                const works = r.data || [];
                works.forEach((w: any) => {
                    if (w.bulkWeights) {
                        try {
                            const bw = JSON.parse(w.bulkWeights);
                            let factorySum = 0;
                            let belongsToCrop = false;

                            // Check all fields inside bulkWeights to see if any match the active crop
                            for (const key in bw) {
                                if (key !== '__FACTORY__' && fieldCropMap.has(key.toLowerCase())) {
                                    if (fieldCropMap.get(key.toLowerCase())?.toUpperCase() === activeCrop.toUpperCase()) {
                                        belongsToCrop = true;
                                    }
                                }
                            }

                            if (belongsToCrop && bw.__FACTORY__ && bw.__FACTORY__.factoryWt) {
                                factorySum = Number(bw.__FACTORY__.factoryWt) || 0;
                            }
                            
                            if (factorySum > 0) {
                                const wDateStr = w.workDate;
                                if (!wDateStr) return;
                                const wDate = new Date(`${wDateStr}T00:00:00`);
                                
                                if (wDateStr === selectedDate) dWeight += factorySum;
                                if (wDate.getFullYear() === sYear && wDate.getMonth() === sMonth && wDate.getDate() <= sDate) tWeight += factorySum;
                                if (wDate >= lDateStart && wDate <= lDateEnd) lmWeight += factorySum;
                                if (wDate >= dYTD && wDate <= reqDate) ytdWeight += factorySum;
                            }
                        } catch(e) {}
                    }
                });
                setWeights({ day: dWeight, todate: tWeight, lastMonth: lmWeight, ytd: ytdWeight });
            }).catch(() => {});

    }, [activeCrop, selectedDate, userSession.tenantId, fieldCropMap]);

    const colors = CROP_COLORS[activeCrop] || DEFAULT_COLOR;

    const headerCell = (label: string) => (
        <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: '#fafafa', color: '#1b5e20', fontSize: '0.8rem' }}>
            {label}
        </TableCell>
    );

    return (
        <Box sx={{ pb: 4 }}>
            {/* Title Header */}
            <Box mb={2}>
                <Typography variant="h4" fontWeight="bold" sx={{ color: '#1b5e20' }}>
                    Cost Analysis
                </Typography>
            </Box>

            {/* Header Section */}
            <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: '#e8f5e9', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #81c784' }}>
                <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="body1" fontWeight="bold" color="#1b5e20">Analysis Date:</Typography>
                    <TextField
                        type="date"
                        variant="outlined"
                        size="small"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        sx={{ bgcolor: 'white', borderRadius: 1 }}
                    />
                </Box>
            </Paper>

            <Paper elevation={3} sx={{ overflow: 'hidden', border: '1px solid #e0e0e0', borderRadius: 2 }}>

                {/* Excel-style top ribbon inside the table card */}
                <Box sx={{ borderBottom: '1px solid #ccc', bgcolor: '#fff', pt: 0, pb: 0 }}>
                    <Box sx={{ borderTop: '2px solid #1b5e20', borderBottom: '1px solid #ccc', textAlign: 'center', py: 0.5 }}>
                        <Typography sx={{ fontSize: '1.2rem', color: '#000', fontFamily: 'Calibri, Arial, sans-serif' }}>
                            Cost Analysis - {activeCrop}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', borderBottom: '1px solid #ccc', py: 0.2 }}>
                        <Box sx={{ flex: 1, borderRight: '1px solid #ccc' }} />
                        <Box sx={{ flex: 3, textAlign: 'center' }}>
                            <Typography sx={{ color: '#000', fontSize: '0.85rem', fontFamily: 'Calibri, Arial, sans-serif' }}>
                                {new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }).replace(/ /g, '-')}
                            </Typography>
                        </Box>
                        <Box sx={{ flex: 1, textAlign: 'right', pr: 2, borderLeft: '1px solid #ccc' }}>
                            <Typography sx={{ color: '#000', fontSize: '0.85rem', fontFamily: 'Calibri, Arial, sans-serif' }}>
                                {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
                {/* Crop Tabs */}
                <Box sx={{ borderBottom: '1px solid #e0e0e0', bgcolor: '#f5f5f5' }}>
                    <Tabs value={activeCrop} onChange={(_, v) => setActiveCrop(v)}
                        sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, fontWeight: 'bold', textTransform: 'none', borderRight: '1px solid #ccc' } }}>
                        {availableCrops.map(crop => (
                            <Tab key={crop} label={crop} value={crop} sx={{
                                bgcolor: activeCrop === crop ? (CROP_COLORS[crop]?.tab || '#757575') : '#e8e8e8',
                                color: activeCrop === crop ? '#fff !important' : '#555',
                            }} />
                        ))}
                    </Tabs>
                </Box>

                {loading && (
                    <Box display="flex" justifyContent="center" py={6}>
                        <CircularProgress size={30} sx={{ color: colors.tab }} />
                    </Box>
                )}

                {!loading && (
                    <TableContainer sx={{ maxHeight: 'calc(100vh - 280px)' }}>
                        <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { borderRight: '1px solid #e8e8e8', padding: '5px 12px' }, tableLayout: 'fixed' }}>
                            <colgroup>
                                <col style={{ width: '28%' }} />
                                <col style={{ width: '12%' }} />
                                <col style={{ width: '12%' }} />
                                <col style={{ width: '12%' }} />
                                <col style={{ width: '12%' }} />
                                <col style={{ width: '12%' }} />
                                <col style={{ width: '12%' }} />
                            </colgroup>
                            <TableHead>
                                <TableRow>
                                    <TableCell rowSpan={2} sx={{ fontWeight: 'bold', bgcolor: '#fafafa', width: '28%' }}>
                                        Work Item
                                    </TableCell>
                                    <TableCell colSpan={2} align="center" sx={{ fontWeight: 'bold', bgcolor: '#fafafa', color: '#1b5e20', borderBottom: '1px solid #e0e0e0' }}>
                                        Day
                                    </TableCell>
                                    <TableCell colSpan={2} align="center" sx={{ fontWeight: 'bold', bgcolor: '#fafafa', color: '#1b5e20', borderBottom: '1px solid #e0e0e0' }}>
                                        Todate
                                    </TableCell>
                                    <TableCell colSpan={2} align="center" sx={{ fontWeight: 'bold', bgcolor: '#fafafa', color: '#555', borderBottom: '1px solid #e0e0e0' }}>
                                        History
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    {headerCell('Amount (Rs.)')}
                                    {headerCell('Cost/Kg')}
                                    {headerCell('Amount (Rs.)')}
                                    {headerCell('Cost/Kg')}
                                    {headerCell('Last Mth')}
                                    {headerCell('YTD')}
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {categories.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#aaa' }}>
                                            <Typography variant="body2">
                                                No cost data entered yet for <strong>{activeCrop}</strong>.<br />
                                                The Chief Clerk can enter amounts in the Cost Analysis Manager.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}

                                {categories.flatMap(cat => {
                                    const rows = cat.items.map((item, idx) => (
                                        <TableRow key={`${cat.id}-item-${item.id}`} sx={{ '&:hover': { bgcolor: '#fafafa' } }}>
                                            <TableCell sx={{ pl: idx === 0 ? 2 : 4, ...(idx === 0 && { borderTop: `2px solid ${colors.tab}` }) }}>
                                                {item.name}
                                            </TableCell>
                                            <TableCell align="right" sx={{ ...(idx === 0 && { borderTop: `2px solid ${colors.tab}` }) }}>
                                                {fmt(item.dayAmount)}
                                            </TableCell>
                                            <TableCell align="right" sx={{ color: '#888', ...(idx === 0 && { borderTop: `2px solid ${colors.tab}` }) }}>
                                                {fmtPerKg(parseFloat(item.dayAmount || '0') / (weights.day || 1), weights.day)}
                                            </TableCell>
                                            <TableCell align="right" sx={{ ...(idx === 0 && { borderTop: `2px solid ${colors.tab}` }) }}>
                                                {fmt(item.todateAmount)}
                                            </TableCell>
                                            <TableCell align="right" sx={{ color: '#888', ...(idx === 0 && { borderTop: `2px solid ${colors.tab}` }) }}>
                                                {fmtPerKg(parseFloat(item.todateAmount || '0') / (weights.todate || 1), weights.todate)}
                                            </TableCell>
                                            <TableCell align="right" sx={{ color: '#666', ...(idx === 0 && { borderTop: `2px solid ${colors.tab}` }) }}>
                                                {fmt(item.lastMonthAmount)}
                                            </TableCell>
                                            <TableCell align="right" sx={{ color: '#666', ...(idx === 0 && { borderTop: `2px solid ${colors.tab}` }) }}>
                                                {fmt(item.ytdAmount)}
                                            </TableCell>
                                        </TableRow>
                                    ));

                                    // Total row
                                    if (cat.items.length > 0) {
                                        const totalDayAmount = catTotal(cat.items, 'dayAmount');
                                        const totalTodateAmount = catTotal(cat.items, 'todateAmount');
                                        
                                        rows.push(
                                            <TableRow key={`${cat.id}-total`} sx={{ bgcolor: colors.total }}>
                                                <TableCell sx={{ fontWeight: 'bold', color: '#333', fontSize: '0.82rem' }}>
                                                    Total Cost for {cat.name}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold', color: colors.tab }}>
                                                    {fmtTotal(totalDayAmount)}
                                                </TableCell>
                                                <TableCell align="right" sx={{ color: '#888' }}>
                                                    {fmtPerKg(totalDayAmount / (weights.day || 1), weights.day)}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold', color: colors.tab }}>
                                                    {fmtTotal(totalTodateAmount)}
                                                </TableCell>
                                                <TableCell align="right" sx={{ color: '#888' }}>
                                                    {fmtPerKg(totalTodateAmount / (weights.todate || 1), weights.todate)}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold', color: '#555' }}>
                                                    {fmtTotal(catTotal(cat.items, 'lastMonthAmount'))}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold', color: '#555' }}>
                                                    {fmtTotal(catTotal(cat.items, 'ytdAmount'))}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    }
                                    return rows;
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
        </Box>
    );
}
