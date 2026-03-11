import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tab, CircularProgress } from '@mui/material';
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

export default function CostAnalysis() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const [activeCrop, setActiveCrop] = useState('Tea');
    const [availableCrops, setAvailableCrops] = useState<string[]>(['Tea']);
    const [categories, setCategories] = useState<CostCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [now, setNow] = useState(new Date());

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
            }).catch(() => { });
    }, []);

    useEffect(() => {
        setLoading(true);
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
    }, [activeCrop]);

    const colors = CROP_COLORS[activeCrop] || DEFAULT_COLOR;

    const headerCell = (label: string) => (
        <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: '#fafafa', color: '#1b5e20', fontSize: '0.8rem' }}>
            {label}
        </TableCell>
    );

    return (
        <Box sx={{ pb: 4 }}>
            {/* Main Header */}
            <Box mb={3}>
                <Typography variant="h4" fontWeight="bold" sx={{ color: '#1b5e20' }}>
                    Cost Analysis
                </Typography>
            </Box>

            <Paper elevation={3} sx={{ overflow: 'hidden', border: '1px solid #e0e0e0', borderRadius: 2 }}>

                {/* Excel-style top ribbon inside the table card */}
                <Box sx={{ borderBottom: '1px solid #ccc', bgcolor: '#fff', pt: 0, pb: 0 }}>
                    <Box sx={{ borderTop: '2px solid #1b5e20', borderBottom: '1px solid #ccc', textAlign: 'center', py: 0.5 }}>
                        <Typography sx={{ fontSize: '1.2rem', color: '#000', fontFamily: 'Calibri, Arial, sans-serif' }}>
                            Cost Analysis
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', borderBottom: '1px solid #ccc', py: 0.2 }}>
                        <Box sx={{ flex: 1, borderRight: '1px solid #ccc' }} />
                        <Box sx={{ flex: 3, textAlign: 'center' }}>
                            <Typography sx={{ color: '#000', fontSize: '0.85rem', fontFamily: 'Calibri, Arial, sans-serif' }}>
                                {now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }).replace(/ /g, '-')}
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
                                                -
                                            </TableCell>
                                            <TableCell align="right" sx={{ ...(idx === 0 && { borderTop: `2px solid ${colors.tab}` }) }}>
                                                {fmt(item.todateAmount)}
                                            </TableCell>
                                            <TableCell align="right" sx={{ color: '#888', ...(idx === 0 && { borderTop: `2px solid ${colors.tab}` }) }}>
                                                -
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
                                        rows.push(
                                            <TableRow key={`${cat.id}-total`} sx={{ bgcolor: colors.total }}>
                                                <TableCell sx={{ fontWeight: 'bold', color: '#333', fontSize: '0.82rem' }}>
                                                    Total Cost for {cat.name}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold', color: colors.tab }}>
                                                    {fmtTotal(catTotal(cat.items, 'dayAmount'))}
                                                </TableCell>
                                                <TableCell align="right" sx={{ color: '#888' }}>-</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold', color: colors.tab }}>
                                                    {fmtTotal(catTotal(cat.items, 'todateAmount'))}
                                                </TableCell>
                                                <TableCell align="right" sx={{ color: '#888' }}>-</TableCell>
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
