import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Grid, Paper, CircularProgress,
    Snackbar, Alert, Divider, Chip, FormControl, InputLabel,
    Select, MenuItem, TextField, Tabs, Tab,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import axios from 'axios';
import * as XLSX from 'xlsx';

// ─── helper ─────────────────────────────────────────────────────────────────

const writeExcel = (rows: Record<string, string | number>[], sheetName: string, fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${fileName}.xlsx`);
};

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];
const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

// ─── main ────────────────────────────────────────────────────────────────────

export default function EstateReports() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    // Build auth headers fresh (avoids stale-closure issues)
    const getHeaders = () => {
        const s = JSON.parse(sessionStorage.getItem('user') || '{}');
        return s.token ? { Authorization: `Bearer ${s.token}` } : {};
    };

    // shared state for "active report card"
    const [activeReport, setActiveReport] = useState(0);

    // per-report filters
    const today = new Date();
    const [dowYear, setDowYear] = useState(today.getFullYear());
    const [dowMonth, setDowMonth] = useState(today.getMonth()); // 0-indexed
    const [costDate, setCostDate] = useState(today.toISOString().slice(0, 10));
    const [cropBookMonth, setCropBookMonth] = useState(
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    );
    const [fertMonth, setFertMonth] = useState(
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    );
    const [fertDivision, setFertDivision] = useState('');
    const [divisions, setDivisions] = useState<{ divisionId: string; name: string }[]>([]);

    const [loading, setLoading] = useState(false);
    const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
        open: false, msg: '', sev: 'success',
    });
    const notify = (msg: string, sev: 'success' | 'error' = 'success') =>
        setSnack({ open: true, msg, sev });

    useEffect(() => {
        if (!tenantId) return;
        axios.get(`/api/divisions?tenantId=${tenantId}`, { headers: getHeaders() })
            .then(r => {
                setDivisions(r.data || []);
                if (r.data?.length) setFertDivision(r.data[0].divisionId);
            })
            .catch(() => { });
    }, [tenantId]);

    // ─────────────────────────────────────────────────────────────────────────
    // 1. DISTRIBUTION OF WORKS  →  Month + Year  →  exact same grid as the FO tab
    // ─────────────────────────────────────────────────────────────────────────
    const downloadDistribution = async () => {
        setLoading(true);
        try {
            const year = dowYear;
            const month = dowMonth + 1;         // back to 1-indexed
            const mm = String(month).padStart(2, '0');
            const daysInMonth = new Date(year, month, 0).getDate();
            const lastDay = String(daysInMonth).padStart(2, '0');

            const [taskRes, progRes, dailyWorkRes, attRes] = await Promise.all([
                axios.get(`/api/operations/task-types?tenantId=${tenantId}`, { headers: getHeaders() }),
                axios.get(`/api/work-program?tenantId=${tenantId}&year=${year}&month=${month}`, { headers: getHeaders() }),
                axios.get(`/api/operations/daily-work?tenantId=${tenantId}`, { headers: getHeaders() }),
                axios.get(`/api/operations/attendance?tenantId=${tenantId}&startDate=${year}-${mm}-01&endDate=${year}-${mm}-${lastDay}`, { headers: getHeaders() }),
            ]);

            const rawTasks = Array.isArray(taskRes.data) ? taskRes.data : [];
            const taskNames: string[] = rawTasks.length
                ? rawTasks.map((t: { name: string }) => t.name)
                : ['Plucking', 'Sundry', 'Other'];

            const progMap: Record<string, number> = {};
            (progRes.data as { taskName: string; workersNeeded?: number }[]).forEach(e => {
                progMap[e.taskName] = e.workersNeeded || 0;
            });

            // submitted daily-work IDs for this month
            const submittedIds = new Set<string>();
            (dailyWorkRes.data as { workDate: string; workId?: string; submittedAt?: string; bulkWeights?: string }[]).forEach(w => {
                const d = new Date(w.workDate);
                if (d.getFullYear() !== year || d.getMonth() + 1 !== month) return;
                const submitted = !!w.submittedAt || (typeof w.bulkWeights === 'string' && w.bulkWeights.trim() !== '' && w.bulkWeights !== '{}');
                if (submitted && w.workId) submittedIds.add(String(w.workId));
            });

            // build day grid: { taskName -> day -> count }
            const grid: Record<string, Record<number, number>> = {};
            taskNames.forEach(t => { grid[t] = {}; for (let d = 1; d <= daysInMonth; d++) grid[t][d] = 0; });

            (attRes.data as { workDate: string; workType?: string; status: string; dailyWorkId?: string; session?: string; workerId: string }[])
                .filter(r => r.status === 'PRESENT' || r.status === 'HALF_DAY')
                .filter(r => !!r.dailyWorkId && submittedIds.has(String(r.dailyWorkId)))
                .forEach(r => {
                    const day = parseInt(String(r.workDate).split('-')[2], 10);
                    const raw = String(r.workType || 'Other');
                    const task = taskNames.find(t => t.toLowerCase() === raw.toLowerCase()) || 'Other';
                    if (grid[task]) grid[task][day] = (grid[task][day] || 0) + 1;
                });

            // Build Excel rows: one row per task, columns = Work Item | Work Programme | Day 1... | Total | Balance
            const excelRows = taskNames.map(task => {
                const prog = progMap[task] || 0;
                let total = 0;
                const row: Record<string, string | number> = {
                    'Work Item': task,
                    'Work Programme': prog,
                };
                for (let d = 1; d <= daysInMonth; d++) {
                    row[`Day ${d}`] = grid[task][d] || 0;
                    total += grid[task][d] || 0;
                }
                row['Total'] = total;
                row['Balance'] = prog - total;
                return row;
            });

            writeExcel(excelRows, 'Distribution of Works',
                `Distribution_of_Works_${MONTHS[dowMonth]}_${year}`);
            notify(`Downloaded – ${excelRows.length} work items for ${MONTHS[dowMonth]} ${year}`);
        } catch {
            notify('Failed to generate Distribution of Works report', 'error');
        } finally { setLoading(false); }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 2. COST ANALYSIS  →  Single Date  →  Work Item | Day Amt | Day Cost/Kg | Todate Amt | Todate Cost/Kg | Last Month | YTD
    // ─────────────────────────────────────────────────────────────────────────
    const downloadCostAnalysis = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/daily-costs`, {
                params: { tenantId, date: costDate },
                headers: getHeaders(),
            });

            const rows: Record<string, string | number>[] = [];

            if (res.data?.costData) {
                const parsed = JSON.parse(res.data.costData) as { name: string; items: { name: string; dayAmount?: string; todateAmount?: string; lastMonthAmount?: string; ytdAmount?: string }[] }[];
                parsed.forEach(cat => {
                    (cat.items || []).forEach(item => {
                        rows.push({
                            'Category': cat.name,
                            'Work Item': item.name,
                            'Day Amount (Rs.)': parseFloat(item.dayAmount || '0') || 0,
                            'Todate Amount (Rs.)': parseFloat(item.todateAmount || '0') || 0,
                            'Last Month (Rs.)': parseFloat(item.lastMonthAmount || '0') || 0,
                            'YTD (Rs.)': parseFloat(item.ytdAmount || '0') || 0,
                        });
                    });
                });
            }

            if (!rows.length) {
                notify('No cost analysis data available for this date', 'error');
                return;
            }
            writeExcel(rows, 'Cost Analysis', `Cost_Analysis_${costDate}`);
            notify(`Downloaded Cost Analysis for ${costDate} – ${rows.length} items`);
        } catch {
            notify('Failed to generate Cost Analysis report', 'error');
        } finally { setLoading(false); }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 3. CROP BOOK  →  Month  →  Day | Factory Wt Day/Todate | Field Wt | Checkroll Wt | Yield/Acre | Pluckers | Over Kilos | Cash Kilos | Plucking Avg | Cost/Kg
    // ─────────────────────────────────────────────────────────────────────────
    const downloadCropBook = async () => {
        setLoading(true);
        try {
            const [year, month] = cropBookMonth.split('-');
            const mm = month.padStart(2, '0');
            const lastDay = new Date(Number(year), Number(month), 0).getDate();
            const startDate = `${year}-${mm}-01`;
            const endDate = `${year}-${mm}-${lastDay}`;

            const [workRes, attRes, fieldsRes, workersRes] = await Promise.all([
                axios.get(`/api/operations/daily-work?tenantId=${tenantId}&startDate=${startDate}&endDate=${endDate}`, { headers: getHeaders() }),
                axios.get(`/api/operations/attendance?tenantId=${tenantId}&startDate=${startDate}&endDate=${endDate}`, { headers: getHeaders() }),
                axios.get(`/api/fields?tenantId=${tenantId}`, { headers: getHeaders() }),
                axios.get(`/api/workers?tenantId=${tenantId}`, { headers: getHeaders() }),
            ]);

            const fieldsList = fieldsRes.data as { id: string; cropType?: string; acreage?: number; name: string }[];
            const firstCrop = fieldsList.find(f => f.cropType)?.cropType?.toLowerCase() || 'tea';

            const fieldCropMap = new Map<string, string>();
            fieldsList.forEach(f => { if (f.id && f.cropType) fieldCropMap.set(String(f.id), f.cropType.toLowerCase()); });

            const workerTypeMap = new Map<string, string>();
            (workersRes.data as { id: string; employmentType?: string }[]).forEach(w => {
                workerTypeMap.set(w.id, w.employmentType || '');
            });

            const workMap = new Map<string, { bulkWeights?: string }>();
            const dayGrid: Record<number, { facWt: number; fldWt: number; chkWt: number; pluckers: number; overKg: number; cashKg: number; permCasPluckers: number; permCasWt: number }> = {};
            for (let d = 1; d <= lastDay; d++) {
                dayGrid[d] = { facWt: 0, fldWt: 0, chkWt: 0, pluckers: 0, overKg: 0, cashKg: 0, permCasPluckers: 0, permCasWt: 0 };
            }

            (workRes.data as { workId?: string; id?: string; fieldId: string; workDate: string; bulkWeights?: string }[]).forEach(w => {
                const crop = fieldCropMap.get(String(w.fieldId));
                if (!crop || crop !== firstCrop) return;
                if (!String(w.workDate).startsWith(`${year}-${mm}`)) return;
                const d = parseInt(String(w.workDate).split('-')[2], 10);
                if (!dayGrid[d]) return;
                workMap.set(String(w.workId || w.id), w);
                if (w.bulkWeights) {
                    try {
                        const bw = JSON.parse(w.bulkWeights);
                        if (bw.__FACTORY__?.factoryWt) dayGrid[d].facWt += Number(bw.__FACTORY__.factoryWt);
                        for (const key in bw) {
                            if (key !== '__FACTORY__' && bw[key]?.fieldWt) dayGrid[d].fldWt += Number(bw[key].fieldWt);
                        }
                    } catch { /* ignore */ }
                }
            });

            (attRes.data as { workDate: string; workerId: string; dailyWorkId?: string; status: string; workType?: string; amWeight?: number; am?: number; pmWeight?: number; pm?: number; overKilos?: number; cashKilos?: number }[])
                .filter(a => (a.status === 'PRESENT' || a.status === 'HALF_DAY') && a.dailyWorkId && workMap.has(String(a.dailyWorkId)))
                .filter(a => {
                    const w = workMap.get(String(a.dailyWorkId));
                    if (!w?.bulkWeights) return false;
                    if (firstCrop === 'tea' && a.workType?.toLowerCase() !== 'plucking') return false;
                    if (firstCrop === 'rubber' && a.workType?.toLowerCase() !== 'tapping') return false;
                    return true;
                })
                .forEach(a => {
                    const d = parseInt(String(a.workDate).split('-')[2], 10);
                    if (!dayGrid[d]) return;
                    const wType = workerTypeMap.get(a.workerId);
                    dayGrid[d].pluckers++;
                    dayGrid[d].chkWt += (Number(a.amWeight || a.am || 0) + Number(a.pmWeight || a.pm || 0));
                    dayGrid[d].overKg += Number(a.overKilos || 0);
                    dayGrid[d].cashKg += Number(a.cashKilos || 0);
                    if (wType === 'PERMANENT' || wType === 'CASUAL') {
                        dayGrid[d].permCasPluckers++;
                        dayGrid[d].permCasWt += (Number(a.amWeight || a.am || 0) + Number(a.pmWeight || a.pm || 0));
                    }
                });

            const totalAcreage = fieldsList.filter(f => f.cropType?.toLowerCase() === firstCrop).reduce((s, f) => s + (f.acreage || 0), 0);

            const rows: Record<string, string | number>[] = [];
            let facTd = 0, fldTd = 0, chkTd = 0, plkTd = 0, oKTd = 0, cKTd = 0, permTd = 0, permWtTd = 0;
            const nowD = new Date();

            for (let d = 1; d <= lastDay; d++) {
                const isFuture = new Date(Number(year), Number(month) - 1, d) > nowD;
                if (!isFuture) {
                    facTd += dayGrid[d].facWt; fldTd += dayGrid[d].fldWt;
                    chkTd += dayGrid[d].chkWt; plkTd += dayGrid[d].pluckers;
                    oKTd += dayGrid[d].overKg; cKTd += dayGrid[d].cashKg;
                    permTd += dayGrid[d].permCasPluckers; permWtTd += dayGrid[d].permCasWt;
                }
                const pAvgDay = (!isFuture && dayGrid[d].permCasPluckers > 0) ? ((dayGrid[d].facWt - dayGrid[d].cashKg) / dayGrid[d].permCasPluckers) : 0;
                const pAvgTd = (!isFuture && permTd > 0) ? ((facTd - cKTd) / permTd) : 0;
                const yAcreDay = (!isFuture && totalAcreage > 0) ? (dayGrid[d].permCasWt / totalAcreage) : 0;
                const yAcreTd = (!isFuture && totalAcreage > 0) ? (permWtTd / totalAcreage) : 0;

                rows.push({
                    'Day': d,
                    'Factory Wt – Day (kg)': !isFuture ? Number(dayGrid[d].facWt.toFixed(1)) : '',
                    'Factory Wt – Todate (kg)': !isFuture ? Number(facTd.toFixed(1)) : '',
                    'Field Wt – Day (kg)': !isFuture ? Number(dayGrid[d].fldWt.toFixed(1)) : '',
                    'Field Wt – Todate (kg)': !isFuture ? Number(fldTd.toFixed(1)) : '',
                    'Checkroll Wt – Day (kg)': !isFuture ? Number(dayGrid[d].chkWt.toFixed(1)) : '',
                    'Checkroll Wt – Todate (kg)': !isFuture ? Number(chkTd.toFixed(1)) : '',
                    'Yield/Acre – Day': !isFuture ? Number(yAcreDay.toFixed(2)) : '',
                    'Yield/Acre – Todate': !isFuture ? Number(yAcreTd.toFixed(2)) : '',
                    'No. Pluckers – Day': !isFuture ? dayGrid[d].pluckers : '',
                    'No. Pluckers – Todate': !isFuture ? plkTd : '',
                    'Over Kilos – Day (kg)': !isFuture ? Number(dayGrid[d].overKg.toFixed(1)) : '',
                    'Over Kilos – Todate (kg)': !isFuture ? Number(oKTd.toFixed(1)) : '',
                    'Cash Kilos – Day (kg)': !isFuture ? Number(dayGrid[d].cashKg.toFixed(1)) : '',
                    'Cash Kilos – Todate (kg)': !isFuture ? Number(cKTd.toFixed(1)) : '',
                    'Plucking Average – Day': !isFuture ? Number(pAvgDay.toFixed(2)) : '',
                    'Plucking Average – Todate': !isFuture ? Number(pAvgTd.toFixed(2)) : '',
                });
            }

            writeExcel(rows, 'Crop Book', `Crop_Book_${cropBookMonth}`);
            notify(`Downloaded Crop Book for ${cropBookMonth} – ${rows.length} days`);
        } catch {
            notify('Failed to generate Crop Book report', 'error');
        } finally { setLoading(false); }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 4. FERTILIZER PROGRAMME  →  Plan Month + Division  →  Entry tab columns
    // ─────────────────────────────────────────────────────────────────────────
    const downloadFertilizer = async () => {
        setLoading(true);
        try {
            const [year, month] = fertMonth.split('-');
            const [masterRes, appsRes, fieldsRes] = await Promise.all([
                axios.get(`/api/fertilizer-master`, { params: { tenantId }, headers: getHeaders() }),
                axios.get(`/api/fertilizer-applications`, { params: { tenantId, divisionId: fertDivision || undefined }, headers: getHeaders() }),
                axios.get(`/api/fields?divisionId=${fertDivision || ''}&tenantId=${tenantId}`, { headers: getHeaders() }),
            ]);

            const masterMap = new Map<string, { name: string; nitrogenPercent: number }>(
                (masterRes.data as { id: string; name: string; nitrogenPercent: number }[]).map(m => [String(m.id), m])
            );
            const fieldMap = new Map<string, string>(
                (fieldsRes.data as { fieldId: string; name: string }[]).map(f => [String(f.fieldId), f.name])
            );
            const divName = divisions.find(d => d.divisionId === fertDivision)?.name || fertDivision;

            const apps = (appsRes.data as { fieldId: string; year: number; month: number; fertilizerId: string; qtyKg: number }[])
                .filter(a => a.year === Number(year) && a.month === Number(month));

            const rows: Record<string, string | number>[] = apps.map(a => {
                const fert = masterMap.get(String(a.fertilizerId));
                const qty = Number(a.qtyKg || 0);
                const nPct = Number(fert?.nitrogenPercent || 0);
                return {
                    'Division': divName,
                    'Field': fieldMap.get(String(a.fieldId)) || a.fieldId,
                    'Month': `${MONTHS[a.month - 1]} ${a.year}`,
                    'Fertilizer': fert?.name || a.fertilizerId,
                    'Qty (kg)': qty,
                    'Nitrogen %': nPct,
                    'Nitrogen (kg)': Number((qty * nPct / 100).toFixed(3)),
                };
            });

            if (!rows.length) {
                notify('No fertilizer applications found for this month/division', 'error');
                return;
            }
            writeExcel(rows, 'Fertilizer Programme', `Fertilizer_${fertMonth}_${divName}`);
            notify(`Downloaded Fertilizer Programme – ${rows.length} entries`);
        } catch {
            notify('Failed to generate Fertilizer Programme report', 'error');
        } finally { setLoading(false); }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 5. CURRENT STOCK  →  No filter  →  Inventory snapshot
    // ─────────────────────────────────────────────────────────────────────────
    const downloadStock = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/store/inventory?tenantId=${tenantId}`, { headers: getHeaders() });
            const rows = (res.data as { itemName?: string; name?: string; category?: string; quantity?: number; currentStock?: number; unit?: string; minimumLevel?: number; minStock?: number; updatedAt?: string }[])
                .map(r => ({
                    'Item Name': r.itemName || r.name || '—',
                    'Category': r.category || '—',
                    'Current Stock': r.quantity ?? r.currentStock ?? 0,
                    'Unit': r.unit || '—',
                    'Minimum Level': r.minimumLevel ?? r.minStock ?? 0,
                    'Last Updated': r.updatedAt ? new Date(r.updatedAt).toLocaleDateString('en-GB') : '—',
                }));
            if (!rows.length) { notify('No stock data available', 'error'); return; }
            writeExcel(rows, 'Current Stock', `Stock_Snapshot_${new Date().toISOString().slice(0, 10)}`);
            notify(`Downloaded Stock Snapshot – ${rows.length} items`);
        } catch {
            notify('Failed to generate Stock report', 'error');
        } finally { setLoading(false); }
    };

    // ─── report definitions ───────────────────────────────────────────────────

    const reports = [
        { label: 'Distribution of Works', color: '#1b5e20', shortDesc: 'Month + Year → full day-by-day grid', badge: 'Monthly' },
        { label: 'Cost Analysis', color: '#4a148c', shortDesc: 'Single date → amounts, cost/kg, YTD', badge: 'By Date' },
        { label: 'Crop Book', color: '#0d47a1', shortDesc: 'Month → factory/field weights, plucking stats', badge: 'Monthly' },
        { label: 'Fertilizer Programme', color: '#e65100', shortDesc: 'Plan month + division → application records', badge: 'Monthly' },
        { label: 'Current Stock', color: '#006064', shortDesc: 'No filter — live snapshot of store inventory', badge: 'Snapshot' },
    ];

    const handleDownload = [
        downloadDistribution, downloadCostAnalysis, downloadCropBook, downloadFertilizer, downloadStock,
    ];

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>

            {/* Header */}
            <Box display="flex" alignItems="center" gap={2} mb={1}>
                <AssessmentIcon sx={{ color: '#2e7d32', fontSize: 38 }} />
                <Box>
                    <Typography variant="h4" fontWeight="900" color="#1e293b" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
                        Reports
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Select a report, configure its filter, and download as Excel.
                    </Typography>
                </Box>
            </Box>
            <Divider sx={{ my: 3 }} />

            {/* Report Selector Tabs */}
            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', mb: 4 }}>
                <Tabs
                    value={activeReport}
                    onChange={(_, v) => setActiveReport(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        bgcolor: '#f1f5f9',
                        '& .MuiTab-root': { textTransform: 'none', fontWeight: 'bold', fontSize: '0.88rem', minHeight: 52 },
                        '& .Mui-selected': { color: `${reports[activeReport]?.color} !important` },
                        '& .MuiTabs-indicator': { backgroundColor: reports[activeReport]?.color, height: 3 },
                    }}
                >
                    {reports.map((r, i) => (
                        <Tab
                            key={i}
                            label={
                                <Box display="flex" alignItems="center" gap={1}>
                                    {r.label}
                                    <Chip label={r.badge} size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
                                </Box>
                            }
                        />
                    ))}
                </Tabs>

                {/* ── Panel per report ── */}
                <Box sx={{ p: { xs: 2, md: 4 } }}>

                    {/* 0: Distribution of Works */}
                    {activeReport === 0 && (
                        <Grid container spacing={3} alignItems="flex-end">
                            <Grid item xs={12}>
                                <Typography variant="body2" color="text.secondary">
                                    Exports the full monthly distribution grid — work items as rows, each day of the month as a column — identical to what the Field Officer sees, with Work Programme and Balance columns included.
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Month</InputLabel>
                                    <Select value={dowMonth} label="Month" onChange={e => setDowMonth(Number(e.target.value))}>
                                        {MONTHS.map((m, i) => <MenuItem key={i} value={i}>{m}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Year</InputLabel>
                                    <Select value={dowYear} label="Year" onChange={e => setDowYear(Number(e.target.value))}>
                                        {YEARS.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#e8f5e9', border: '1px solid #a5d6a7', display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CalendarMonthIcon sx={{ color: '#2e7d32', fontSize: 18 }} />
                                    <Typography variant="body2" fontWeight="bold" color="#2e7d32">
                                        {MONTHS[dowMonth]} {dowYear}
                                    </Typography>
                                </Box>
                            </Grid>
                        </Grid>
                    )}

                    {/* 1: Cost Analysis */}
                    {activeReport === 1 && (
                        <Grid container spacing={3} alignItems="flex-end">
                            <Grid item xs={12}>
                                <Typography variant="body2" color="text.secondary">
                                    Exports the cost analysis table for a specific date — Category, Work Item, Day Amount, Todate Amount, Last Month, and YTD columns.
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={5}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="date"
                                    label="Analysis Date"
                                    value={costDate}
                                    onChange={e => setCostDate(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </Grid>
                    )}

                    {/* 2: Crop Book */}
                    {activeReport === 2 && (
                        <Grid container spacing={3} alignItems="flex-end">
                            <Grid item xs={12}>
                                <Typography variant="body2" color="text.secondary">
                                    Exports the full monthly crop book grid — one row per day with Factory Weight, Field Weight, Checkroll Weight, Yield/Acre, No. of Pluckers, Over Kilos, Cash Kilos, and Plucking Average (Day & Todate for each).
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={5}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="month"
                                    label="Month"
                                    value={cropBookMonth}
                                    onChange={e => setCropBookMonth(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </Grid>
                    )}

                    {/* 3: Fertilizer Programme */}
                    {activeReport === 3 && (
                        <Grid container spacing={3} alignItems="flex-end">
                            <Grid item xs={12}>
                                <Typography variant="body2" color="text.secondary">
                                    Exports fertilizer application entries for the selected plan month and division — Division, Field, Month, Fertilizer name, Qty (kg), Nitrogen %, and Nitrogen (kg).
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="month"
                                    label="Plan Month"
                                    value={fertMonth}
                                    onChange={e => setFertMonth(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Division</InputLabel>
                                    <Select value={fertDivision} label="Division" onChange={e => setFertDivision(e.target.value)}>
                                        {divisions.map(d => <MenuItem key={d.divisionId} value={d.divisionId}>{d.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    )}

                    {/* 4: Current Stock */}
                    {activeReport === 4 && (
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <Typography variant="body2" color="text.secondary">
                                    Exports the live inventory snapshot — no date filter needed. Shows Item Name, Category, Current Stock, Unit, and Minimum Level as of the moment of download.
                                </Typography>
                            </Grid>
                        </Grid>
                    )}

                    {/* Download Button */}
                    <Box mt={4} display="flex" gap={2} alignItems="center">
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}
                            onClick={handleDownload[activeReport]}
                            disabled={loading}
                            sx={{
                                bgcolor: reports[activeReport]?.color,
                                '&:hover': { bgcolor: reports[activeReport]?.color, opacity: 0.88 },
                                borderRadius: 2,
                                px: 5,
                                py: 1.5,
                                fontWeight: 'bold',
                                textTransform: 'none',
                                fontSize: '1rem',
                                boxShadow: 'none',
                            }}
                        >
                            {loading ? 'Generating…' : `Download ${reports[activeReport]?.label}`}
                        </Button>
                        {!loading && (
                            <Typography variant="caption" color="text.secondary">
                                File will download as .xlsx
                            </Typography>
                        )}
                    </Box>
                </Box>
            </Paper>

            <Snackbar
                open={snack.open}
                autoHideDuration={5000}
                onClose={() => setSnack(s => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snack.sev} sx={{ borderRadius: 2 }}>{snack.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
