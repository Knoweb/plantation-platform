import { useState, useEffect, Fragment } from 'react';
import axios from 'axios';
import {
    Box,
    Typography,
    CircularProgress,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    TextField
} from '@mui/material';


interface CropStats {
    today: number;
    toDate: number;
    budgetToday: number;
    budgetToDate: number;
    workersToday: number;
    workersToDate: number;
    fertilizerToday: number; // New
    fertilizerToDate: number; // New
    transportToday: number; // New
    transportToDate: number; // New
}

export default function CropAchievements() {
    const [loading, setLoading] = useState(true);
    const [reportDate, setReportDate] = useState(new Date());
    const [activeCrops, setActiveCrops] = useState<string[]>([]);
    const [stats, setStats] = useState<Record<string, CropStats>>({});

    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    useEffect(() => {
        if (tenantId) {
            initReport();
        }
    }, [tenantId]);

    const initReport = async () => {
        setLoading(true);
        try {
            const today = new Date();
            setReportDate(today);

            // 1. Fetch Fields
            const fRes = await axios.get(`/api/fields?tenantId=${tenantId}`);

            // Build Field Name -> Crop Type Map
            const fieldCropMap = new Map<string, string>();
            const relevantFields: any[] = [];

            const access = userSession.divisionAccess;
            const myDivisions = Array.isArray(access) ? access : (access ? [access] : []);

            fRes.data.forEach((f: any) => {
                if (f.name && f.cropType) {
                    fieldCropMap.set(f.name.toLowerCase(), f.cropType.toUpperCase());
                }
                // Filter logic
                if (userSession.role === 'SUPER_ADMIN' || myDivisions.includes(f.divisionId)) {
                    relevantFields.push(f);
                }
            });

            // Extract Unique Crops
            const cropsFound = new Set<string>();
            relevantFields.forEach((f: any) => {
                if (f.cropType) cropsFound.add(f.cropType.toUpperCase());
            });

            let cropsList = Array.from(cropsFound).sort();
            if (cropsList.length === 0) cropsList = ['TEA', 'RUBBER', 'CINNAMON'];

            setActiveCrops(cropsList);

            // Initialize Stats
            const initialStats: Record<string, CropStats> = {};
            cropsList.forEach(c => {
                initialStats[c] = {
                    today: 0, toDate: 0,
                    budgetToday: 0, budgetToDate: 0,
                    workersToday: 0, workersToDate: 0,
                    fertilizerToday: 0, fertilizerToDate: 0,
                    transportToday: 0, transportToDate: 0
                };
            });

            // 2. Fetch Attendance
            const dates: string[] = [];
            const year = today.getFullYear();
            const month = today.getMonth();
            const day = today.getDate();
            const todayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            for (let d = 1; d <= day; d++) {
                dates.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
            }

            const responses = await Promise.all(dates.map(date =>
                axios.get(`/api/operations/attendance?tenantId=${tenantId}&date=${date}`)
                    .then(res => ({ date, data: res.data }))
                    .catch(() => ({ date, data: [] }))
            ));

            const newStats = JSON.parse(JSON.stringify(initialStats));
            const NORMS: Record<string, number> = { 'TEA': 25, 'RUBBER': 15, 'CINNAMON': 20, 'COCONUT': 50, 'DEFAULT': 25 };

            responses.forEach(({ date, data }) => {
                const isToday = date === todayStr;

                data.forEach((att: any) => {
                    const workType = (att.workType || '').toLowerCase();
                    const fieldName = (att.fieldName || '').toLowerCase();
                    const am = Number(att.amWeight) || 0;
                    const pm = Number(att.pmWeight) || 0;
                    const total = am + pm;
                    const isWorker = (att.status === 'PRESENT' || att.status === 'HALF_DAY');

                    // Determine Crop
                    let cropKey = '';
                    if (fieldName && fieldCropMap.has(fieldName)) {
                        cropKey = fieldCropMap.get(fieldName) || '';
                    } else {
                        // Fallback to work type guessing
                        if (workType.includes('tea') || workType.includes('plucking')) cropKey = 'TEA';
                        else if (workType.includes('rubber') || workType.includes('tapping')) cropKey = 'RUBBER';
                        else if (workType.includes('cinnamon')) cropKey = 'CINNAMON';
                    }

                    if (cropKey && newStats[cropKey]) {
                        // Check Activity Type
                        if (workType.includes('fertilizer')) {
                            // Fertilizer logic
                            newStats[cropKey].fertilizerToDate += total;
                            if (isToday) newStats[cropKey].fertilizerToday += total;
                        } else if (workType.includes('transport')) {
                            // Transport logic
                            newStats[cropKey].transportToDate += total;
                            if (isToday) newStats[cropKey].transportToday += total;
                        } else {
                            // Yield Logic: Filter strictly for Harvest activities
                            const isHarvest = workType.includes('pluck') ||
                                workType.includes('tap') ||
                                workType.includes('harvest') ||
                                workType.includes('peel');

                            if (isHarvest) {
                                newStats[cropKey].toDate += total;
                                if (isWorker) {
                                    newStats[cropKey].workersToDate += 1;
                                    newStats[cropKey].budgetToDate += (NORMS[cropKey] || NORMS.DEFAULT);
                                }

                                if (isToday) {
                                    newStats[cropKey].today += total;
                                    if (isWorker) {
                                        newStats[cropKey].workersToday += 1;
                                        newStats[cropKey].budgetToday += (NORMS[cropKey] || NORMS.DEFAULT);
                                    }
                                }
                            }
                        }
                    }
                });
            });

            setStats(newStats);

        } catch (e) {
            console.error("Error init crop report", e);
        } finally {
            setLoading(false);
        }
    };

    // Helper Styles
    const getCropColor = (crop: string) => {
        switch (crop) {
            case 'TEA': return { header: '#a5d6a7', text: '#1b5e20', subHeader: '#c8e6c9', cell: '#f1f8e9' }; // Green
            case 'RUBBER': return { header: '#ffcc80', text: '#e65100', subHeader: '#ffe0b2', cell: '#fff3e0' }; // Orange
            case 'CINNAMON': return { header: '#d7ccc8', text: '#5d4037', subHeader: '#dcedc8', cell: '#efebe9' }; // Brown
            default: return { header: '#cfd8dc', text: '#37474f', subHeader: '#eceff1', cell: '#f5f5f5' }; // Grey
        }
    };

    const fmt = (num: number) => num !== 0 ? num.toFixed(0) : '-';
    // Prevent division by zero
    const daysPassed = reportDate.getDate() > 0 ? reportDate.getDate() : 1;

    // Row Component
    const renderRow = (label: string, valueFn: (s: CropStats) => { today: string | number, toDate: string | number }, bold = false) => (
        <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: 'rgba(0, 0, 0, 0.02)' } }}>
            <TableCell component="th" scope="row" sx={{ fontWeight: bold ? 'bold' : 'normal', color: '#455a64', borderRight: '1px solid #e0e0e0', minWidth: 180 }}>
                {label}
            </TableCell>
            {activeCrops.map((crop, idx) => {
                const s = stats[crop] || {
                    today: 0, toDate: 0,
                    budgetToday: 0, budgetToDate: 0,
                    workersToday: 0, workersToDate: 0,
                    fertilizerToday: 0, fertilizerToDate: 0,
                    transportToday: 0, transportToDate: 0
                };
                const vals = valueFn(s);
                const colors = getCropColor(crop);
                const isLast = idx === activeCrops.length - 1;
                return (
                    // Using Fragment to key the group of cells
                    <Fragment key={crop}>
                        <TableCell align="right" sx={{ fontWeight: bold ? 'bold' : 'normal', borderRight: '1px solid #e0e0e0', bgcolor: colors.cell }}>
                            {vals.today}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: bold ? 'bold' : 'normal', borderRight: isLast ? 'none' : '2px solid #bdbdbd', bgcolor: colors.cell }}>
                            {vals.toDate}
                        </TableCell>
                    </Fragment>
                );
            })}
        </TableRow>
    );



    if (loading) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;

    return (
        <Box p={2}>
            {/* Title Header */}
            <Box mb={2}>
                <Typography variant="h4" fontWeight="bold" sx={{ color: '#1b5e20' }}>
                    Crop Achievements
                </Typography>
            </Box>

            {/* Header Section */}
            <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: '#dcedc8', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #aed581' }}>
                <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="body1" fontWeight="bold" color="#33691e">Select Date:</Typography>
                    <TextField
                        type="date"
                        variant="outlined"
                        size="small"
                        value={reportDate.toISOString().split('T')[0]}
                        onChange={(e) => {
                            const d = new Date(e.target.value);
                            if (!isNaN(d.getTime())) setReportDate(d);
                        }}
                        sx={{ bgcolor: 'white', borderRadius: 1 }}
                    />
                </Box>
                <Chip label="Daily Crop Report" color="success" sx={{ fontWeight: 'bold' }} />
            </Paper>

            {/* Table */}
            <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Table size="small" sx={{ minWidth: 650 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ bgcolor: '#e0e0e0', width: 200 }}></TableCell>
                            {activeCrops.map(crop => (
                                <TableCell key={crop} align="center" colSpan={2}
                                    sx={{
                                        bgcolor: getCropColor(crop).header,
                                        color: getCropColor(crop).text,
                                        fontWeight: 'bold',
                                        borderRight: '2px solid white',
                                        fontSize: '1.2rem',
                                        letterSpacing: '1px'
                                    }}>
                                    {crop}
                                </TableCell>
                            ))}
                        </TableRow>
                        <TableRow>
                            <TableCell sx={{ bgcolor: '#eeeeee', fontWeight: 'bold', color: '#616161', borderRight: '1px solid #bdbdbd', verticalAlign: 'bottom', pb: 1 }}>METRIC</TableCell>
                            {activeCrops.map((crop, idx) => {
                                const colors = getCropColor(crop);
                                const isLast = idx === activeCrops.length - 1;
                                return (
                                    <Fragment key={crop}>
                                        <TableCell align="center" sx={{ bgcolor: colors.subHeader, fontWeight: 'bold', width: 100, borderRight: '1px solid #fff' }}>Today</TableCell>
                                        <TableCell align="center" sx={{ bgcolor: colors.subHeader, fontWeight: 'bold', width: 100, borderRight: isLast ? 'none' : '2px solid #bdbdbd' }}>To Date</TableCell>
                                    </Fragment>
                                );
                            })}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {renderRow("Total Crop (Plucked/Tapped)", s => ({ today: fmt(s.today), toDate: fmt(s.toDate) }), true)}
                        {renderRow("Fertilizer Applied", s => ({ today: fmt(s.fertilizerToday), toDate: fmt(s.fertilizerToDate) }))}
                        {renderRow("Transported Qty", s => ({ today: fmt(s.transportToday), toDate: fmt(s.transportToDate) }))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
