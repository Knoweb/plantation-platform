import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tab, CircularProgress, TextField } from '@mui/material';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

interface CostItem {
    id: string;
    name: string;
    dayAmount?: string;
    todateAmount?: string;
    lastMonthAmount?: string;
    ytdAmount?: string;
    dayCostPerKgOverride?: string;
    todateCostPerKgOverride?: string;
}

interface CostCategory {
    id: string;
    name: string;
    items: CostItem[];
}

const DEFAULT_CATEGORY_STRUCTURE = [
    { name: 'Plucking', items: ['Pluckers', 'Kanganies', 'Sack Coolies', 'Staff OT for Plucking', 'Leaf Bags', 'Cash Kilos', 'Meals', 'Over Kilos'] },
    { name: 'Chemical Weeding', items: ['Chemical Weeding ManDays', 'Cost of Chemical', 'Tank Repair', 'Meals', 'Transport'] },
    { name: 'Manual Weeding', items: ['Manual Weeding ManDays', 'Tools'] },
    { name: 'Fertilizing', items: ['Fertilizer Cost'] },
];

const ITEM_TO_CATEGORY = new Map(
    DEFAULT_CATEGORY_STRUCTURE.flatMap((category) => category.items.map((item) => [item, category.name] as const)),
);
const KNOWN_CATEGORY_NAMES = new Set(DEFAULT_CATEGORY_STRUCTURE.map((category) => category.name));
const HEADER_ROW_ONE_HEIGHT = 38;
const HEADER_ROW_TWO_HEIGHT = 44;

const sanitizeCostPerKgOverride = (overrideText?: string, amountText?: string) => {
    const trimmed = String(overrideText || '').trim();
    if (!trimmed) return '';

    const overrideValue = Number.parseFloat(trimmed);
    const amountValue = Number.parseFloat(String(amountText || '0'));
    if (!Number.isFinite(overrideValue) || overrideValue <= 0 || !Number.isFinite(amountValue) || amountValue <= 0) {
        return '';
    }

    if (overrideValue >= 100 && amountValue >= 100) return '';
    if (overrideValue >= amountValue * 0.2) return '';
    return trimmed;
};

const normalizeCategories = (input: any): CostCategory[] => {
    if (!Array.isArray(input)) return [];

    const grouped = new Map<string, CostCategory>();
    const ensureCategory = (name: string) => {
        if (!grouped.has(name)) grouped.set(name, { id: `${name}-${Math.random().toString(36).slice(2, 8)}`, name, items: [] });
        return grouped.get(name)!;
    };

    const repairMalformedItem = (workItemName: string, source: any): CostItem => {
        const sourceName = String(source?.name || '').trim();
        const sourceNameNumber = Number.parseFloat(sourceName);
        const todateFromSource = String(source?.todateAmount || '').trim();
        const ytdFromSource = String(source?.ytdAmount || '').trim();
        const ytdNumber = Number.parseFloat(ytdFromSource || '0');
        const todateNumber = Number.parseFloat(todateFromSource || '0');

        const repaired: CostItem = {
            id: source?.id || `${workItemName}-${Math.random().toString(36).slice(2, 8)}`,
            name: workItemName,
            dayAmount: String(source?.dayAmount || '0'),
            lastMonthAmount: String(source?.lastMonthAmount || '0'),
            ytdAmount: ytdFromSource,
            dayCostPerKgOverride: sanitizeCostPerKgOverride(source?.dayCostPerKgOverride, source?.dayAmount),
            todateCostPerKgOverride: sanitizeCostPerKgOverride(source?.todateCostPerKgOverride, source?.todateAmount),
        };

        if (!Number.isNaN(sourceNameNumber) && sourceNameNumber > 0 && (Math.abs(ytdNumber - sourceNameNumber) < 0.001 || todateNumber === 0)) {
            repaired.todateAmount = sourceName;
            if (!repaired.todateCostPerKgOverride && todateNumber > 0) {
                repaired.todateCostPerKgOverride = todateFromSource;
            }
        } else {
            repaired.todateAmount = String(source?.todateAmount || '0');
        }

        return repaired;
    };

    for (const rawCategory of input) {
        const categoryName = String(rawCategory?.name || '').trim();
        const rawItems = Array.isArray(rawCategory?.items) ? rawCategory.items : [];
        if (!categoryName) continue;

        if (ITEM_TO_CATEGORY.has(categoryName) && !KNOWN_CATEGORY_NAMES.has(categoryName)) {
            const bucket = ensureCategory(ITEM_TO_CATEGORY.get(categoryName)!);
            bucket.items.push(repairMalformedItem(categoryName, rawItems[0] || {}));
            continue;
        }

        const bucket = ensureCategory(categoryName);
        for (const rawItem of rawItems) {
            const itemName = String(rawItem?.name || '').trim();
            if (!itemName) continue;
            bucket.items.push({
                ...rawItem,
                id: rawItem?.id || `${itemName}-${Math.random().toString(36).slice(2, 8)}`,
                name: itemName,
                dayCostPerKgOverride: sanitizeCostPerKgOverride(rawItem?.dayCostPerKgOverride, rawItem?.dayAmount),
                todateCostPerKgOverride: sanitizeCostPerKgOverride(rawItem?.todateCostPerKgOverride, rawItem?.todateAmount),
            });
        }
    }

    return Array.from(grouped.values()).map((category) => ({
        ...category,
        items: category.items.filter((item, index, items) =>
            items.findIndex((candidate) => candidate.name.toLowerCase() === item.name.toLowerCase()) === index,
        ),
    }));
};

const CROP_COLORS: Record<string, { tab: string; total: string }> = {
    Tea: { tab: '#2e7d32', total: '#e8f5e9' },
    Rubber: { tab: '#0277bd', total: '#e1f5fe' },
    Cinnamon: { tab: '#e65100', total: '#fff3e0' },
};
const DEFAULT_COLOR = { tab: '#757575', total: '#f5f5f5' };

const fmt = (val?: string) => {
    const n = parseFloat(val || '0');
    return Number.isFinite(n) ? n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';
};

const catTotal = (items: CostItem[], field: keyof CostItem) =>
    items.reduce((s, i) => s + (parseFloat((i[field] as string) || '0') || 0), 0);

const fmtTotal = (n: number) => n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPerKg = (amtTotal: number, weight?: number, overrideText?: string) => {
    const sanitizedOverride = sanitizeCostPerKgOverride(overrideText, String(amtTotal));
    if (sanitizedOverride && amtTotal > 0) return sanitizedOverride;
    if (amtTotal === 0 || !weight || weight === 0) return '-';
    return (amtTotal / weight).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getTodayLocalISO = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function CostAnalysis() {
    const location = useLocation();
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const [activeCrop, setActiveCrop] = useState('Tea');
    const [availableCrops, setAvailableCrops] = useState<string[]>(['Tea']);
    const [categories, setCategories] = useState<CostCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [now, setNow] = useState(new Date());
    
    // date selection
    const [selectedDate, setSelectedDate] = useState<string>(() => getTodayLocalISO());

    const [fieldCropMap, setFieldCropMap] = useState<Map<string, string>>(new Map());
    const [weights, setWeights] = useState({ day: 0, todate: 0, lastMonth: 0, ytd: 0 });

    // Live clock
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (location.pathname.endsWith('/cost-analysis')) {
            setSelectedDate(getTodayLocalISO());
        }
    }, [location.pathname, location.key]);

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
                    setCategories(normalizeCategories(parsed));
                } catch {
                    setCategories([]);
                }
            } else {
                setCategories([]);
            }
        })
        .catch(() => setCategories([]))
        .finally(() => setLoading(false));
        
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
        <TableCell
            align="right"
            sx={{ fontWeight: 'bold', bgcolor: '#fafafa', color: '#1b5e20', fontSize: '0.8rem', height: `${HEADER_ROW_TWO_HEIGHT}px` }}
        >
            {label}
        </TableCell>
    );

    return (
        <Box sx={{ pb: 4, p: { xs: 1.5, sm: 2, md: 3 } }}>
            {/* Title Header */}
            <Box mb={2}>
                <Typography variant="h4" fontWeight="bold" sx={{ color: '#1b5e20', fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
                    Cost Analysis
                </Typography>
            </Box>

            {/* Header Section */}
            <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: '#e8f5e9', borderRadius: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'center', border: '1px solid #81c784', gap: 2 }}>
                <Box display="flex" alignItems="center" gap={2} width={{ xs: '100%', sm: 'auto' }} justifyContent="center">
                    <Typography variant="body1" fontWeight="bold" color="#1b5e20" sx={{ whiteSpace: 'nowrap' }}>Analysis Date:</Typography>
                    <TextField
                        type="date"
                        variant="outlined"
                        size="small"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        sx={{ bgcolor: 'white', borderRadius: 1, width: { xs: '100%', sm: 'auto' } }}
                    />
                </Box>
            </Paper>

            <Paper elevation={3} sx={{ overflow: 'hidden', border: '1px solid #e0e0e0', borderRadius: 2 }}>

                {/* Excel-style top ribbon inside the table card */}
                <Box sx={{ borderBottom: '1px solid #ccc', bgcolor: '#fff', pt: 0, pb: 0 }}>
                    <Box sx={{ borderTop: '2px solid #1b5e20', borderBottom: '1px solid #ccc', textAlign: 'center', py: 0.5 }}>
                        <Typography sx={{ fontSize: { xs: '1rem', sm: '1.2rem' }, color: '#000', fontFamily: 'Calibri, Arial, sans-serif' }}>
                            Cost Analysis - {activeCrop}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, borderBottom: '1px solid #ccc', py: { xs: 0.5, sm: 0.2 } }}>
                        <Box sx={{ flex: 1, borderRight: { xs: 'none', sm: '1px solid #ccc' }, borderBottom: { xs: '1px solid #ccc', sm: 'none' }, display: { xs: 'none', sm: 'block' } }} />
                        <Box sx={{ flex: 3, textAlign: 'center', borderBottom: { xs: '1px solid #ccc', sm: 'none' }, py: { xs: 0.2, sm: 0 } }}>
                            <Typography sx={{ color: '#000', fontSize: '0.85rem', fontFamily: 'Calibri, Arial, sans-serif' }}>
                                {new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }).replace(/ /g, '-')}
                            </Typography>
                        </Box>
                        <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'right' }, pr: { xs: 0, sm: 2 }, borderLeft: { xs: 'none', sm: '1px solid #ccc' }, py: { xs: 0.2, sm: 0 } }}>
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
                    <TableContainer sx={{ maxHeight: 'calc(100vh - 280px)', overflowX: 'auto' }}>
                        <Table
                            size="small"
                            stickyHeader
                            sx={{
                                minWidth: 800,
                                '& .MuiTableCell-root': { borderRight: '1px solid #e8e8e8', padding: '5px 12px' },
                                tableLayout: { xs: 'auto', md: 'fixed' },
                                '& .MuiTableHead-root .MuiTableRow-root:first-of-type .MuiTableCell-root': {
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 4,
                                    height: `${HEADER_ROW_ONE_HEIGHT}px`,
                                    backgroundColor: '#fafafa',
                                    backgroundImage: 'none',
                                    boxShadow: 'inset 0 -1px 0 #e0e0e0',
                                },
                                '& .MuiTableHead-root .MuiTableRow-root:nth-of-type(2) .MuiTableCell-root': {
                                    position: 'sticky',
                                    top: HEADER_ROW_ONE_HEIGHT,
                                    zIndex: 4,
                                    height: `${HEADER_ROW_TWO_HEIGHT}px`,
                                    backgroundColor: '#fafafa',
                                    backgroundImage: 'none',
                                    boxShadow: 'inset 0 -1px 0 #e0e0e0',
                                },
                                '& .MuiTableHead-root .MuiTableCell-root[rowspan="2"]': {
                                    top: 0,
                                    zIndex: 5,
                                    height: `${HEADER_ROW_ONE_HEIGHT + HEADER_ROW_TWO_HEIGHT}px`,
                                    backgroundColor: '#fafafa',
                                    backgroundImage: 'none',
                                },
                            }}
                        >
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
                                                No published cost analysis is available yet for <strong>{activeCrop}</strong> on this date.<br />
                                                The Chief Clerk must save or upload the report before it becomes visible here.
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
                                                {fmtPerKg(parseFloat(item.dayAmount || '0'), weights.day, item.dayCostPerKgOverride)}
                                            </TableCell>
                                            <TableCell align="right" sx={{ ...(idx === 0 && { borderTop: `2px solid ${colors.tab}` }) }}>
                                                {fmt(item.todateAmount)}
                                            </TableCell>
                                            <TableCell align="right" sx={{ color: '#888', ...(idx === 0 && { borderTop: `2px solid ${colors.tab}` }) }}>
                                                {fmtPerKg(parseFloat(item.todateAmount || '0'), weights.todate, item.todateCostPerKgOverride)}
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
                                                    {fmtPerKg(totalDayAmount, weights.day)}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold', color: colors.tab }}>
                                                    {fmtTotal(totalTodateAmount)}
                                                </TableCell>
                                                <TableCell align="right" sx={{ color: '#888' }}>
                                                    {fmtPerKg(totalTodateAmount, weights.todate)}
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
