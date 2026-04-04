import React, { useState } from 'react';
import {
    Box, Typography, Button, Grid, Paper, CircularProgress,
    Snackbar, Alert, Divider, Chip
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import AssessmentIcon from '@mui/icons-material/Assessment';
import axios from 'axios';
import * as XLSX from 'xlsx';

// ─── helpers ────────────────────────────────────────────────────────────────

const exportToExcel = (rows: Record<string, any>[], fileName: string) => {
    if (!rows.length) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${fileName}.xlsx`);
};

const fmtDate = (d: string | Date) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// ─── main component ─────────────────────────────────────────────────────────

export default function EstateReports() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    // Default: current month range
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(lastDay);
    const [loading, setLoading] = useState<string | null>(null);
    const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
        open: false, msg: '', sev: 'success',
    });

    const notify = (msg: string, sev: 'success' | 'error' = 'success') =>
        setSnack({ open: true, msg, sev });

    // ── report generators ────────────────────────────────────────────────────

    const downloadDistributionOfWorks = async () => {
        setLoading('distribution');
        try {
            const [workRes, divRes, taskRes] = await Promise.all([
                axios.get(`/api/operations/attendance?tenantId=${tenantId}&startDate=${startDate}&endDate=${endDate}`),
                axios.get(`/api/divisions?tenantId=${tenantId}`),
                axios.get(`/api/operations/task-types?tenantId=${tenantId}`),
            ]);
            const divMap = new Map(divRes.data.map((d: any) => [d.divisionId, d.name]));
            const rows = (workRes.data || []).map((r: any) => ({
                'Date': fmtDate(r.workDate),
                'Division': divMap.get(r.divisionId) || r.divisionId || '—',
                'Worker ID': r.workerId,
                'Work Type / Task': r.workType || '—',
                'Session': r.session || '—',
                'Status': r.status || '—',
            }));
            exportToExcel(rows, `Distribution_of_Works_${startDate}_${endDate}`);
            notify(`Downloaded ${rows.length} records`);
        } catch {
            notify('Failed to fetch Distribution of Works data', 'error');
        } finally { setLoading(null); }
    };

    const downloadCostAnalysis = async () => {
        setLoading('cost');
        try {
            const [workRes, divRes] = await Promise.all([
                axios.get(`/api/operations/daily-work?tenantId=${tenantId}`),
                axios.get(`/api/divisions?tenantId=${tenantId}`),
            ]);
            const divMap = new Map(divRes.data.map((d: any) => [d.divisionId, d.name]));
            const start = new Date(startDate);
            const end = new Date(endDate);
            const rows = (workRes.data || [])
                .filter((r: any) => {
                    const d = new Date(r.workDate);
                    return d >= start && d <= end;
                })
                .map((r: any) => {
                    let fieldWt = 0, factoryWt = 0;
                    try {
                        const bw = JSON.parse(r.bulkWeights || '{}');
                        fieldWt = Number(bw['__FACTORY__']?.fieldWt || 0);
                        factoryWt = Number(bw['__FACTORY__']?.factoryWt || 0);
                    } catch { /* ignore */ }
                    return {
                        'Date': fmtDate(r.workDate),
                        'Division': divMap.get(r.divisionId) || '—',
                        'Work Type': r.workType || '—',
                        'Workers': r.workerCount || 0,
                        'Field Weight (kg)': fieldWt,
                        'Factory Weight (kg)': factoryWt,
                        'Status': r.status || '—',
                    };
                });
            exportToExcel(rows, `Cost_Analysis_${startDate}_${endDate}`);
            notify(`Downloaded ${rows.length} records`);
        } catch {
            notify('Failed to fetch Cost Analysis data', 'error');
        } finally { setLoading(null); }
    };

    const downloadCropBook = async () => {
        setLoading('cropbook');
        try {
            const [workRes, divRes] = await Promise.all([
                axios.get(`/api/operations/daily-work?tenantId=${tenantId}`),
                axios.get(`/api/divisions?tenantId=${tenantId}`),
            ]);
            const divMap = new Map(divRes.data.map((d: any) => [d.divisionId, d.name]));
            const start = new Date(startDate);
            const end = new Date(endDate);
            const rows = (workRes.data || [])
                .filter((r: any) => {
                    const d = new Date(r.workDate);
                    const hasWeight = r.bulkWeights && r.bulkWeights !== '' && r.bulkWeights !== '{}';
                    return d >= start && d <= end && hasWeight;
                })
                .map((r: any) => {
                    let fieldWt = 0, factoryWt = 0;
                    try {
                        const bw = JSON.parse(r.bulkWeights || '{}');
                        fieldWt = Number(bw['__FACTORY__']?.fieldWt || 0);
                        factoryWt = Number(bw['__FACTORY__']?.factoryWt || 0);
                    } catch { /* ignore */ }
                    return {
                        'Date': fmtDate(r.workDate),
                        'Division': divMap.get(r.divisionId) || '—',
                        'Field Weight (kg)': fieldWt,
                        'Factory Weight (kg)': factoryWt,
                        'Workers': r.workerCount || 0,
                        'Status': r.status || '—',
                    };
                });
            exportToExcel(rows, `Crop_Book_${startDate}_${endDate}`);
            notify(`Downloaded ${rows.length} records`);
        } catch {
            notify('Failed to fetch Crop Book data', 'error');
        } finally { setLoading(null); }
    };

    const downloadFertilizerProgram = async () => {
        setLoading('fertilizer');
        try {
            const res = await axios.get(`/api/operations/fertilizer-program?tenantId=${tenantId}`);
            const start = new Date(startDate);
            const end = new Date(endDate);
            const rows = (res.data || [])
                .filter((r: any) => {
                    const d = new Date(r.applicationDate || r.date || r.scheduledDate);
                    return d >= start && d <= end;
                })
                .map((r: any) => ({
                    'Date': fmtDate(r.applicationDate || r.date || r.scheduledDate),
                    'Division': r.divisionName || r.divisionId || '—',
                    'Field': r.fieldNo || r.fieldId || '—',
                    'Fertilizer Type': r.fertilizerType || r.type || '—',
                    'Quantity (kg)': r.quantity || 0,
                    'Status': r.status || '—',
                    'Notes': r.notes || r.remarks || '',
                }));
            exportToExcel(rows, `Fertilizer_Programme_${startDate}_${endDate}`);
            notify(`Downloaded ${rows.length} records`);
        } catch {
            notify('Failed to fetch Fertilizer Programme data', 'error');
        } finally { setLoading(null); }
    };

    const downloadCurrentStock = async () => {
        setLoading('stock');
        try {
            const res = await axios.get(`/api/store/inventory?tenantId=${tenantId}`);
            const rows = (res.data || []).map((r: any) => ({
                'Item Name': r.itemName || r.name || '—',
                'Category': r.category || '—',
                'Current Stock': r.quantity || r.currentStock || 0,
                'Unit': r.unit || '—',
                'Minimum Level': r.minimumLevel || r.minStock || 0,
                'Last Updated': r.updatedAt ? fmtDate(r.updatedAt) : '—',
            }));
            exportToExcel(rows, `Current_Stock_${new Date().toISOString().slice(0, 10)}`);
            notify(`Downloaded ${rows.length} stock items`);
        } catch {
            notify('Failed to fetch Stock data', 'error');
        } finally { setLoading(null); }
    };

    const downloadWorkerRegistry = async () => {
        setLoading('workers');
        try {
            const [workerRes, divRes] = await Promise.all([
                axios.get(`/api/workers?tenantId=${tenantId}`),
                axios.get(`/api/divisions?tenantId=${tenantId}`),
            ]);
            const divMap = new Map(divRes.data.map((d: any) => [d.divisionId, d.name]));
            const rows = (workerRes.data || []).map((w: any) => ({
                'Worker ID': w.workerId || w.id || '—',
                'Name': w.name || w.workerName || '—',
                'Gender': w.gender || '—',
                'Employment Type': w.employmentType || '—',
                'Division': divMap.get(w.divisionId) || w.divisionId || '—',
                'Status': w.status || '—',
                'Registered Date': w.registeredDate ? fmtDate(w.registeredDate) : '—',
            }));
            exportToExcel(rows, `Worker_Registry_${new Date().toISOString().slice(0, 10)}`);
            notify(`Downloaded ${rows.length} worker records`);
        } catch {
            notify('Failed to fetch Worker Registry data', 'error');
        } finally { setLoading(null); }
    };

    // ── report cards config ──────────────────────────────────────────────────

    const reports = [
        {
            id: 'distribution',
            title: 'Distribution of Works',
            desc: 'Monthly attendance and task assignment records per worker and division.',
            color: '#1b5e20',
            bg: '#f1f8e9',
            border: '#a5d6a7',
            onClick: downloadDistributionOfWorks,
            usesDateRange: true,
        },
        {
            id: 'cost',
            title: 'Cost Analysis',
            desc: 'Daily work records with field & factory weights for cost calculations.',
            color: '#4a148c',
            bg: '#f3e5f5',
            border: '#ce93d8',
            onClick: downloadCostAnalysis,
            usesDateRange: true,
        },
        {
            id: 'cropbook',
            title: 'Crop Book',
            desc: 'Yield records (field weight vs factory weight) filtered by date range.',
            color: '#0d47a1',
            bg: '#e3f2fd',
            border: '#90caf9',
            onClick: downloadCropBook,
            usesDateRange: true,
        },
        {
            id: 'fertilizer',
            title: 'Fertilizer Programme',
            desc: 'Fertilizer application schedule and completion records.',
            color: '#e65100',
            bg: '#fff3e0',
            border: '#ffcc80',
            onClick: downloadFertilizerProgram,
            usesDateRange: true,
        },
        {
            id: 'stock',
            title: 'Current Stock',
            desc: 'Live inventory snapshot of all store items (date filter not applicable).',
            color: '#006064',
            bg: '#e0f7fa',
            border: '#80deea',
            onClick: downloadCurrentStock,
            usesDateRange: false,
        },
        {
            id: 'workers',
            title: 'Worker Registry',
            desc: 'Complete list of all registered workers with type, division and status.',
            color: '#37474f',
            bg: '#eceff1',
            border: '#b0bec5',
            onClick: downloadWorkerRegistry,
            usesDateRange: false,
        },
    ];

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1100 }}>
            {/* Page Header */}
            <Box display="flex" alignItems="center" gap={2} mb={1}>
                <AssessmentIcon sx={{ color: '#2e7d32', fontSize: 36 }} />
                <Box>
                    <Typography variant="h4" fontWeight="bold" color="#1e293b">
                        Reports
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Download Excel reports for any date range. Click a report card to generate and download.
                    </Typography>
                </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Date Filter */}
            <Paper
                variant="outlined"
                sx={{ p: 3, borderRadius: 3, mb: 4, bgcolor: '#f8fafc', borderColor: '#e2e8f0' }}
            >
                <Typography variant="subtitle1" fontWeight="bold" color="#374151" mb={2}>
                    📅 Date Range Filter
                </Typography>
                <Box display="flex" gap={3} flexWrap="wrap" alignItems="center">
                    <Box>
                        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                            From
                        </Typography>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: 8,
                                border: '1.5px solid #cbd5e1',
                                fontSize: 14,
                                fontFamily: 'inherit',
                                outline: 'none',
                                cursor: 'pointer',
                            }}
                        />
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                            To
                        </Typography>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: 8,
                                border: '1.5px solid #cbd5e1',
                                fontSize: 14,
                                fontFamily: 'inherit',
                                outline: 'none',
                                cursor: 'pointer',
                            }}
                        />
                    </Box>
                    <Box mt={2.5}>
                        <Chip
                            label={`${fmtDate(startDate)} → ${fmtDate(endDate)}`}
                            sx={{ bgcolor: '#dbeafe', color: '#1d4ed8', fontWeight: 'bold' }}
                        />
                    </Box>
                </Box>
            </Paper>

            {/* Report Cards */}
            <Grid container spacing={3}>
                {reports.map(r => (
                    <Grid item xs={12} sm={6} md={4} key={r.id}>
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 3,
                                borderRadius: 3,
                                bgcolor: r.bg,
                                borderColor: r.border,
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'all 0.2s',
                                '&:hover': {
                                    boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                                    transform: 'translateY(-2px)',
                                },
                            }}
                        >
                            <Typography variant="h6" fontWeight="bold" color={r.color} mb={1}>
                                {r.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" mb={2} sx={{ flex: 1 }}>
                                {r.desc}
                            </Typography>
                            {!r.usesDateRange && (
                                <Chip label="No date filter" size="small" sx={{ mb: 1.5, width: 'fit-content', fontSize: '0.7rem', bgcolor: 'rgba(0,0,0,0.05)' }} />
                            )}
                            <Button
                                variant="contained"
                                startIcon={loading === r.id ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
                                onClick={r.onClick}
                                disabled={loading !== null}
                                sx={{
                                    bgcolor: r.color,
                                    '&:hover': { bgcolor: r.color, opacity: 0.88 },
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 'bold',
                                    boxShadow: 'none',
                                }}
                            >
                                {loading === r.id ? 'Generating...' : 'Download Excel'}
                            </Button>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            <Snackbar
                open={snack.open}
                autoHideDuration={4000}
                onClose={() => setSnack(s => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snack.sev} sx={{ borderRadius: 2 }}>{snack.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
