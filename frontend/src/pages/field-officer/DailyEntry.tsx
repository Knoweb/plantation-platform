import { Box, Typography, Button, Paper, Tabs, Tab, Table, TableBody, TableContainer, TableCell, TableHead, TableRow, Chip, IconButton, MenuItem, Select, FormControl, InputLabel, Avatar, Card, CircularProgress, Alert, Snackbar, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Badge, TextField, Autocomplete, Checkbox } from '@mui/material';
import { useState, useEffect, useRef, Fragment } from 'react';
import axios from 'axios';
import {
    Check as CheckIcon,
    Close as CloseIcon,
    Block as BlockIcon,
    Person as PersonIcon,
    History as HistoryIcon,
    EditCalendar as EditStartIcon,
    Visibility as VisibilityIcon,
    Delete as DeleteIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

// --- Interfaces ---
interface AttendanceRecord {
    id: string;
    workerId: string;
    workType: string;
    fieldName: string;
    amWeight?: number | string;
    pmWeight?: number | string;
    overKilos?: number | string;
    otHours?: number | string;
    status: string;
    workerName?: string;
    divisionId?: string;
    workDate: string; // "YYYY-MM-DD"
    updatedAt?: string; // ISO DateTime
    session?: string;
    tenantId?: string;
    dailyWorkId?: string;
    workerType?: string;
}

// --- Main Component ---
export default function EveningMusterPage() {
    const [tabIndex, setTabIndex] = useState(0);

    return (
        <Box sx={{ width: '100%', bgcolor: '#f0f2f5', minHeight: '100vh' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'white', px: 3, pt: 2 }}>
                <Typography variant="h4" fontWeight="bold" color="primary.dark">
                    Evening Muster & Harvest
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </Typography>
                <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)}>
                    <Tab label="Daily Entry (Today)" icon={<EditStartIcon />} iconPosition="start" />
                    <Tab label="Muster History" icon={<HistoryIcon />} iconPosition="start" />
                </Tabs>
            </Box>

            <Box p={3}>
                {tabIndex === 0 && <DailyEntryTab />}
                {tabIndex === 1 && <HistoryTab />}
            </Box>
        </Box>
    );
}

// --- Tab 1: Daily Entry (Today) ---
function DailyEntryTab() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;

    const [loading, setLoading] = useState(true);
    const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
    const [divisions, setDivisions] = useState<any[]>([]);
    const [fields, setFields] = useState<any[]>([]); // To store field mapping
    const [selectedDivision, setSelectedDivision] = useState<string>('ALL'); // Default to ALL or first available
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const [norms, setNorms] = useState<any[]>([]);
    const [dailyWorks, setDailyWorks] = useState<any[]>([]);
    const [isEditMode, setIsEditMode] = useState(false);
    const isEditModeRef = useRef(false);
    const [confirmSaveDraftOpen, setConfirmSaveDraftOpen] = useState(false);
    const [viewTargetsOpen, setViewTargetsOpen] = useState(false);

    // For assigning an evening worker
    const [allWorkers, setAllWorkers] = useState<any[]>([]);
    const [availableTasks, setAvailableTasks] = useState<string[]>([]);
    const [addWorkerOpen, setAddWorkerOpen] = useState(false);
    const [addWorkerTask, setAddWorkerTask] = useState<string>('');
    const [addWorkerField, setAddWorkerField] = useState<string>('');

    useEffect(() => {
        isEditModeRef.current = isEditMode;
    }, [isEditMode]);

    useEffect(() => {
        let interval: any;
        if (tenantId) {
            fetchInitialData();
            // Automatically poll for remarks and updates every 10 seconds
            interval = setInterval(() => {
                fetchInitialData(true); // silent fetch
            }, 10000);
        }
        return () => clearInterval(interval);
    }, [tenantId]);

    const fetchInitialData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            // Fetch Workers
            const wRes = await axios.get(`/api/workers?tenantId=${tenantId}`);
            const wMap = new Map<string, string>();
            const wTypeMap = new Map<string, string>();
            wRes.data.forEach((w: any) => {
                if (w.workerId) {
                    wMap.set(w.workerId, w.name);
                    wTypeMap.set(w.workerId, w.employmentType || 'PERMANENT');
                }
                wMap.set(w.id, w.name);
                wTypeMap.set(w.id, w.employmentType || 'PERMANENT');
            });
            if (!isEditModeRef.current) setAllWorkers(wRes.data);

            // Fetch Fields
            const fRes = await axios.get(`/api/fields?tenantId=${tenantId}`);
            setFields(fRes.data);

            // Fetch All Divisions (for Name mapping)
            const allDivRes = await axios.get(`/api/divisions?tenantId=${tenantId}`);
            const divNameMap = new Map<string, string>();
            allDivRes.data.forEach((d: any) => divNameMap.set(d.divisionId, d.name));

            // Fetch Today's Daily Work (Mappings)
            const dwRes = await axios.get(`/api/operations/daily-work?tenantId=${tenantId}`);
            const dwMap = new Map<string, string>();
            // Since backend returns all works, let's keep all in dailyWorks
            setDailyWorks(dwRes.data);

            // Only map divisions for today's data to avoid leaking old stuff into active today UI
            const todayWorks = dwRes.data.filter((dw: any) => dw.workDate === today);
            todayWorks.forEach((dw: any) => dwMap.set(dw.workId, dw.divisionId));

            // Fetch Today's Attendance
            const attRes = await axios.get(`/api/operations/attendance?tenantId=${tenantId}&date=${today}`);

            const enriched = attRes.data.map((rec: any) => ({
                ...rec,
                workerName: wMap.get(rec.workerId) || rec.workerId,
                workerType: wTypeMap.get(rec.workerId) || 'PERMANENT',
                status: rec.status || 'PRESENT',
                amWeight: rec.amWeight ?? '',
                pmWeight: rec.pmWeight ?? '',
                overKilos: rec.overKilos ?? '',
                otHours: rec.otHours ?? '',
                session: rec.session || 'FULL_DAY',
                divisionId: dwMap.get(rec.dailyWorkId) || 'UNKNOWN',
                tenantId: tenantId
            }));

            // Fetch Norms
            const normsRes = await axios.get(`/api/operations/norms`, { headers: { 'X-Tenant-Id': tenantId } });
            setNorms(normsRes.data);

            // Fetch task types
            const taskRes = await axios.get(`/api/operations/task-types?tenantId=${tenantId}`);
            setAvailableTasks(taskRes.data.map((t: any) => t.name));

            // Derive Available Divisions from Data
            const uniqueDivIds = Array.from(new Set(enriched.map((i: any) => i.divisionId as string).filter((id: string) => id !== 'UNKNOWN')));
            const activeDivs = uniqueDivIds.map(id => ({
                divisionId: id as string,
                name: divNameMap.get(id as string) || 'Unknown Division'
            }));

            // Only overwrite UI state if not actively editing
            if (!isEditModeRef.current) {
                setAttendanceData(enriched);
                setDivisions(activeDivs);
            }

            // Default selection logic (only update if not set to prevent UX jumping)
            if (activeDivs.length > 0 && (selectedDivision === '' || !activeDivs.find(d => d.divisionId === selectedDivision))) {
                setSelectedDivision(activeDivs[0].divisionId as string);
            } else if (activeDivs.length === 0) {
                setSelectedDivision('');
            }

        } catch (e) {
            console.error("Failed", e);
            if (!silent) setNotification({ open: true, message: "Failed to load data.", severity: 'error' });
        }
        if (!silent) setLoading(false);
    };

    const handleUpdate = (id: string, field: keyof AttendanceRecord, value: any) => {
        setAttendanceData(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [dailyWeights, setDailyWeights] = useState<any>({}); // { [divId]: { [field]: { fieldWt, factoryWt } } }

    const handleSaveDraft = async () => {
        setConfirmSaveDraftOpen(false);
        try {
            const updates = attendanceData.filter(item => item.divisionId === selectedDivision).map(item => ({
                id: item.id,
                tenantId: item.tenantId,
                workerId: item.workerId,
                workDate: item.workDate,
                dailyWorkId: item.dailyWorkId,
                workType: item.workType,
                fieldName: item.fieldName,
                am: item.amWeight !== '' ? Number(item.amWeight) : null,
                pm: item.pmWeight !== '' ? Number(item.pmWeight) : null,
                overKilos: item.overKilos !== '' ? Number(item.overKilos) : null,
                otHours: item.otHours !== '' ? Number(item.otHours) : null,
                status: item.status,
                session: item.session
            }));
            await axios.post(`/api/operations/attendance/bulk`, updates);
            setNotification({ open: true, message: "Saved Successfully!", severity: 'success' });
            setIsEditMode(false);
            isEditModeRef.current = false; // Force immediate ref update before fetch
            window.dispatchEvent(new Event('muster-update'));
        } catch (e) {
            setNotification({ open: true, message: "Failed to save.", severity: 'error' });
        }
    };

    const handleCancelEdit = () => {
        setIsEditMode(false);
        fetchInitialData(false); // Reset to last saved state
    };

    // Persist dailyWeights
    useEffect(() => {
        if (tenantId && today) {
            const key = `dailyWeights_${tenantId}_${today}`;
            const saved = localStorage.getItem(key);
            if (saved) {
                try { setDailyWeights(JSON.parse(saved)); } catch (e) { }
            }
        }
    }, [tenantId, today]);

    useEffect(() => {
        if (tenantId && today) {
            const key = `dailyWeights_${tenantId}_${today}`;
            localStorage.setItem(key, JSON.stringify(dailyWeights));
        }
    }, [dailyWeights, tenantId, today]);
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Persistence Key Helper
    const getStorageKey = (divId: string) => `muster_submitted_${tenantId}_${today}_${divId}`;

    // Check submission status on division change
    useEffect(() => {
        if (selectedDivision) {
            const status = localStorage.getItem(getStorageKey(selectedDivision)) === 'true';
            setIsSubmitted(status);
            if (status) setIsEditMode(false); // Force read-only if submitted
        }
    }, [selectedDivision, tenantId, today]);

    const handleSubmit = async () => {
        setConfirmOpen(true);
    };

    const handleConfirmSubmit = async () => {
        setConfirmOpen(false);
        try {
            const updates = attendanceData.filter(item => item.divisionId === selectedDivision).map(item => ({
                id: item.id,
                tenantId: item.tenantId,
                workerId: item.workerId,
                workDate: item.workDate,
                dailyWorkId: item.dailyWorkId,
                workType: item.workType,
                fieldName: item.fieldName,
                am: Number(item.amWeight) || null,
                pm: Number(item.pmWeight) || null,
                status: item.status,
                session: item.session
            }));
            await axios.post(`/api/operations/attendance/bulk`, updates);
            setNotification({ open: true, message: "Saved Successfully!", severity: 'success' });

            // Persist Submission
            localStorage.setItem(getStorageKey(selectedDivision), 'true');
            setIsSubmitted(true); // Disable button

            // Trigger Sidebar Update
            window.dispatchEvent(new Event('muster-update'));
        } catch (e) {
            setNotification({ open: true, message: "Failed to save.", severity: 'error' });
        }
    };

    // Filter Logic
    const filteredData = attendanceData.filter(item => item.divisionId === selectedDivision);

    // Grouping
    const grouped = filteredData.reduce((acc: any, item) => {
        const key = item.workType;
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});

    // Categorized Summary Calculation for Muster Chit
    const getCategorizedSummary = () => {
        const categories: any = { Tea: {}, Rubber: {}, General: {} };

        filteredData.forEach(m => {
            const field = fields.find(f => f.name === m.fieldName);
            const crop = field?.cropType || 'General';

            let catKey = 'General';
            if (crop === 'Tea') catKey = 'Tea';
            if (crop === 'Rubber') catKey = 'Rubber';

            if (!categories[catKey][m.workType]) {
                categories[catKey][m.workType] = { countMorning: 0, countEvening: 0, fields: {} };
            }

            if (m.status !== 'ABSENT') {
                const addMorning = m.session === 'MORNING_SESSION' || m.session === 'FULL_DAY';
                const addEvening = m.session === 'EVENING_SESSION' || m.session === 'FULL_DAY';

                if (addMorning) categories[catKey][m.workType].countMorning++;
                if (addEvening) categories[catKey][m.workType].countEvening++;

                if (!categories[catKey][m.workType].fields[m.fieldName]) {
                    categories[catKey][m.workType].fields[m.fieldName] = { countMorning: 0, countEvening: 0 };
                }
                if (addMorning) categories[catKey][m.workType].fields[m.fieldName].countMorning++;
                if (addEvening) categories[catKey][m.workType].fields[m.fieldName].countEvening++;
            }
        });
        return categories;
    };

    const categorizedSummary = getCategorizedSummary();
    const grandMorningTotal = filteredData.filter(d => d.status !== 'ABSENT' && (d.session === 'MORNING_SESSION' || d.session === 'FULL_DAY')).length;
    const grandEveningTotal = filteredData.filter(d => d.status !== 'ABSENT' && (d.session === 'EVENING_SESSION' || d.session === 'FULL_DAY')).length;

    if (loading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

    // Calculate Pending Count
    const pendingCount = divisions.filter((d: any) => localStorage.getItem(getStorageKey(d.divisionId)) !== 'true').length;

    return (
        <Box>
            <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2} mb={3}>
                <Box display="flex" alignItems="center">
                    {isSubmitted && <Chip label="Read-Only Mode" color="info" />}
                </Box>
                <Box display="flex" gap={2} width={{ xs: '100%', sm: 'auto' }}>
                    <Badge
                        badgeContent={pendingCount}
                        color="error"
                        invisible={pendingCount === 0}
                        sx={{
                            flex: 1,
                            '& .MuiBadge-badge': {
                                animation: 'blink 1.5s infinite',
                                right: 10,
                                top: 5,
                                '@keyframes blink': {
                                    '0%': { opacity: 1 },
                                    '50%': { opacity: 0.5 },
                                    '100%': { opacity: 1 }
                                }
                            }
                        }}
                    >
                        <FormControl size="small" sx={{ minWidth: 200, bgcolor: 'white', width: '100%' }}>
                            <InputLabel>Select Division</InputLabel>
                            <Select value={selectedDivision} label="Select Division" onChange={(e) => setSelectedDivision(e.target.value)}>
                                {divisions.map((d: any) => {
                                    const isPending = localStorage.getItem(getStorageKey(d.divisionId)) !== 'true';
                                    return (
                                        <MenuItem key={d.divisionId} value={d.divisionId} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            {d.name}
                                            {isPending && <Chip label="Pending" color="error" size="small" sx={{ height: 20, fontSize: '0.65rem' }} />}
                                        </MenuItem>
                                    );
                                })}
                            </Select>
                        </FormControl>
                    </Badge>
                    {attendanceData.length > 0 && selectedDivision && (
                        <Box display="flex" gap={1}>
                            {isSubmitted ? (
                                <Button variant="contained" disabled sx={{ bgcolor: '#e0e0e0', fontWeight: 'bold' }}>Finalized</Button>
                            ) : !isEditMode ? (
                                <>
                                    <Button variant="contained" color="secondary" onClick={() => setViewTargetsOpen(true)} startIcon={<VisibilityIcon />} sx={{ fontWeight: 'bold' }}>View Targets</Button>
                                    <Button variant="contained" color="primary" onClick={() => setIsEditMode(true)} sx={{ fontWeight: 'bold' }}>Edit Entry</Button>
                                    <Button variant="outlined" color="error" onClick={handleSubmit} sx={{ fontWeight: 'bold', borderWidth: 2, '&:hover': { borderWidth: 2 } }}>Submit Muster</Button>
                                </>
                            ) : (
                                <>
                                    <Button variant="contained" color="secondary" onClick={() => setAddWorkerOpen(true)} startIcon={<PersonIcon />} sx={{ fontWeight: 'bold' }}>Assign Evening Worker</Button>
                                    <Button variant="outlined" color="inherit" onClick={handleCancelEdit} sx={{ fontWeight: 'bold', bgcolor: 'white' }}>Cancel</Button>
                                    <Button variant="contained" color="success" onClick={() => setConfirmSaveDraftOpen(true)} sx={{ fontWeight: 'bold' }}>Save</Button>
                                </>
                            )}
                        </Box>
                    )}
                    <Button variant="contained" color="inherit" onClick={() => fetchInitialData()}><RefreshIcon /></Button>
                </Box>
            </Box>



            <Box display="flex" flexDirection="column" gap={3}>

                {/* Main Content Area */}
                <Box flex={1} minWidth={0}>
                    {attendanceData.length === 0 ? (
                        <Alert severity="info" sx={{ fontSize: '1.1rem', py: 2 }}>No Morning Muster Approved for Today. Cannot verify Attendance.</Alert>
                    ) : (
                        <Box display="flex" flexDirection={{ xs: 'column', lg: 'row' }} gap={3}>
                            {/* Left Column: Muster Chit + Submit */}
                            <Box flex={1.2} sx={{ width: '100%', overflowX: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>


                                {/* Muster Chit */}
                                <Paper elevation={3} sx={{ overflow: 'hidden', borderRadius: 2 }}>
                                    <Box bgcolor="#e0e0e0" p={1} borderBottom="1px solid #ccc">
                                        <Typography variant="h6" align="center" fontWeight="bold">Muster Chit</Typography>
                                    </Box>
                                    <Box sx={{ overflowX: 'auto' }}>
                                        <Table size="small">
                                            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                                                <TableRow>
                                                    <TableCell rowSpan={2}><strong>Work item</strong></TableCell>
                                                    <TableCell rowSpan={2}><strong>Field No</strong></TableCell>
                                                    <TableCell align="center" colSpan={2}><strong>No of Workers</strong></TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell align="center"><strong>Morning</strong></TableCell>
                                                    <TableCell align="center"><strong>Evening</strong></TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {/* Tea Section */}
                                                {Object.entries(categorizedSummary.Tea).map(([task, data]: any) => (
                                                    <Fragment key={task}>
                                                        {Object.entries(data.fields).map(([field, counts]: any, idx) => (
                                                            <TableRow key={`${task}-${field}`}>
                                                                {idx === 0 && (
                                                                    <TableCell rowSpan={Object.keys(data.fields).length} sx={{ verticalAlign: 'top', fontWeight: 'bold' }}>{task}</TableCell>
                                                                )}
                                                                <TableCell>{field}</TableCell>
                                                                <TableCell align="center">{counts.countMorning}</TableCell>
                                                                <TableCell align="center">{counts.countEvening}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {task === 'Plucking' && (
                                                            <TableRow sx={{ bgcolor: '#a5d6a7' }}>
                                                                <TableCell colSpan={2}><strong>Total Pluckers</strong></TableCell>
                                                                <TableCell align="center"><strong>{data.countMorning}</strong></TableCell>
                                                                <TableCell align="center"><strong>{data.countEvening}</strong></TableCell>
                                                            </TableRow>
                                                        )}
                                                    </Fragment>
                                                ))}
                                                {Object.keys(categorizedSummary.Tea).length > 0 && (
                                                    <TableRow sx={{ bgcolor: '#81c784', borderTop: '2px solid #2e7d32' }}>
                                                        <TableCell colSpan={2}><strong>Total Tea</strong></TableCell>
                                                        <TableCell align="center"><strong>{Object.values(categorizedSummary.Tea).reduce((acc: number, curr: any) => acc + curr.countMorning, 0)}</strong></TableCell>
                                                        <TableCell align="center"><strong>{Object.values(categorizedSummary.Tea).reduce((acc: number, curr: any) => acc + curr.countEvening, 0)}</strong></TableCell>
                                                    </TableRow>
                                                )}

                                                {/* Rubber Section */}
                                                {Object.entries(categorizedSummary.Rubber).map(([task, data]: any) => (
                                                    <Fragment key={task}>
                                                        {Object.entries(data.fields).map(([field, counts]: any, idx) => (
                                                            <TableRow key={`${task}-${field}`}>
                                                                {idx === 0 && (
                                                                    <TableCell rowSpan={Object.keys(data.fields).length} sx={{ verticalAlign: 'top', fontWeight: 'bold' }}>{task}</TableCell>
                                                                )}
                                                                <TableCell>{field}</TableCell>
                                                                <TableCell align="center">{counts.countMorning}</TableCell>
                                                                <TableCell align="center">{counts.countEvening}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {task === 'Tapping' && (
                                                            <TableRow sx={{ bgcolor: '#a5d6a7' }}>
                                                                <TableCell colSpan={2}><strong>Total Tappers</strong></TableCell>
                                                                <TableCell align="center"><strong>{data.countMorning}</strong></TableCell>
                                                                <TableCell align="center"><strong>{data.countEvening}</strong></TableCell>
                                                            </TableRow>
                                                        )}
                                                    </Fragment>
                                                ))}
                                                {Object.keys(categorizedSummary.Rubber).length > 0 && (
                                                    <TableRow sx={{ bgcolor: '#81c784', borderTop: '2px solid #2e7d32' }}>
                                                        <TableCell colSpan={2}><strong>Total Rubber</strong></TableCell>
                                                        <TableCell align="center"><strong>{Object.values(categorizedSummary.Rubber).reduce((acc: number, curr: any) => acc + curr.countMorning, 0)}</strong></TableCell>
                                                        <TableCell align="center"><strong>{Object.values(categorizedSummary.Rubber).reduce((acc: number, curr: any) => acc + curr.countEvening, 0)}</strong></TableCell>
                                                    </TableRow>
                                                )}

                                                {/* General Section */}
                                                {Object.entries(categorizedSummary.General).map(([task, data]: any) => (
                                                    <Fragment key={task}>
                                                        {Object.entries(data.fields).map(([field, counts]: any, idx) => (
                                                            <TableRow key={`${task}-${field}`}>
                                                                {idx === 0 && (
                                                                    <TableCell rowSpan={Object.keys(data.fields).length} sx={{ verticalAlign: 'top', fontWeight: 'bold' }}>{task}</TableCell>
                                                                )}
                                                                <TableCell>{field}</TableCell>
                                                                <TableCell align="center">{counts.countMorning}</TableCell>
                                                                <TableCell align="center">{counts.countEvening}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </Fragment>
                                                ))}
                                                {Object.keys(categorizedSummary.General).length > 0 && (
                                                    <TableRow sx={{ bgcolor: '#81c784', borderTop: '2px solid #2e7d32' }}>
                                                        <TableCell colSpan={2}><strong>Total General</strong></TableCell>
                                                        <TableCell align="center"><strong>{Object.values(categorizedSummary.General).reduce((acc: number, curr: any) => acc + curr.countMorning, 0)}</strong></TableCell>
                                                        <TableCell align="center"><strong>{Object.values(categorizedSummary.General).reduce((acc: number, curr: any) => acc + curr.countEvening, 0)}</strong></TableCell>
                                                    </TableRow>
                                                )}

                                                <TableRow sx={{ bgcolor: '#dcdcdc', borderTop: '3px double #000' }}>
                                                    <TableCell colSpan={2}><strong>Grand Total of workers</strong></TableCell>
                                                    <TableCell align="center"><strong>{grandMorningTotal}</strong></TableCell>
                                                    <TableCell align="center"><strong>{grandEveningTotal}</strong></TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </Box>
                                </Paper>

                                {/* Manager Remarks Section */}
                                {dailyWorks.filter(dw => dw.workDate === today && dw.divisionId === selectedDivision && dw.remarks && dw.remarks.trim() !== '').map((dw, i) => (
                                    <Alert
                                        key={i}
                                        severity={dw.status === 'REJECTED' ? 'error' : 'info'}
                                        sx={{ borderRadius: 2 }}
                                    >
                                        <Typography variant="subtitle2" fontWeight="bold">
                                            Manager Remarks {dw.status === 'REJECTED' ? '(Rejected)' : ''}:
                                        </Typography>
                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{dw.remarks}</Typography>
                                    </Alert>
                                ))}

                            </Box>

                            {/* Detailed List */}
                            <Box flex={2} sx={{
                                opacity: isSubmitted || !isEditMode ? 0.6 : 1,
                                filter: isSubmitted || !isEditMode ? 'grayscale(40%)' : 'none',
                                pointerEvents: isSubmitted || !isEditMode ? 'none' : 'auto',
                                transition: 'all 0.3s ease-in-out'
                            }}>
                                {/* Daily Harvest Summary Component - Top Right */}
                                {(() => {
                                    // Identify Harvest Fields
                                    const harvestFields = { Tea: [] as string[], Rubber: [] as string[] };
                                    Object.entries(grouped).forEach(([task, items]: any) => {
                                        const lower = task.toLowerCase();
                                        if (lower.includes('pluck') || lower.includes('harvest') || lower.includes('tap')) {
                                            const firstItem = items[0];
                                            const fName = firstItem?.fieldName;
                                            const fieldObj = fields.find((f: any) => f.name === fName);
                                            // Use same logic as TaskSection
                                            const crop = (fieldObj?.cropType || 'General').toLowerCase();

                                            const uniqueF = Array.from(new Set(items.map((i: any) => i.fieldName)));
                                            if (crop === 'tea') harvestFields.Tea.push(...uniqueF as string[]);
                                            if (crop === 'rubber') harvestFields.Rubber.push(...uniqueF as string[]);
                                        }
                                    });
                                    // De-duplicate
                                    harvestFields.Tea = Array.from(new Set(harvestFields.Tea));
                                    harvestFields.Rubber = Array.from(new Set(harvestFields.Rubber));

                                    if (harvestFields.Tea.length === 0 && harvestFields.Rubber.length === 0) return null;

                                    // Simplified Green Theme Layout
                                    return (
                                        <Paper elevation={0} sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: '#f1f8e9', border: '1px solid #c5e1a5' }}>
                                            <Box display="flex" flexWrap="wrap" gap={3} alignItems="center">
                                                <Typography variant="subtitle2" fontWeight="bold" color="#2e7d32" sx={{ mr: 1 }}>
                                                    Yield:
                                                </Typography>

                                                {/* Tea Section */}
                                                {harvestFields.Tea.length > 0 && (
                                                    <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
                                                        {harvestFields.Tea.map(field => (
                                                            <Box key={field} display="flex" alignItems="center" bgcolor="white" px={1} py={0.5} borderRadius={1} border="1px solid #cfd8dc">
                                                                <Typography variant="caption" fontWeight="bold" mr={1} color="#455a64">{field}</Typography>
                                                                <TextField
                                                                    variant="standard"
                                                                    InputProps={{ disableUnderline: true, style: { fontSize: '0.9rem', fontWeight: 'bold', textAlign: 'center' } }}
                                                                    placeholder="0"
                                                                    type="number"
                                                                    disabled={isSubmitted || !isEditMode}
                                                                    sx={{ width: 50 }}
                                                                    value={dailyWeights[selectedDivision]?.[field]?.fieldWt || ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        if (val === '' || Number(val) >= 0) {
                                                                            setDailyWeights((prev: any) => ({
                                                                                ...prev,
                                                                                [selectedDivision]: {
                                                                                    ...prev[selectedDivision],
                                                                                    [field]: { ...prev[selectedDivision]?.[field], fieldWt: val }
                                                                                }
                                                                            }));
                                                                        }
                                                                    }}
                                                                />
                                                                <Typography variant="caption" color="text.secondary">kg</Typography>
                                                            </Box>
                                                        ))}
                                                        {/* Single Factory Weight for Tea */}
                                                        <Box display="flex" alignItems="center" bgcolor="white" px={1} py={0.5} borderRadius={1} border="1px solid #cfd8dc">
                                                            <Typography variant="caption" fontWeight="bold" mr={1} color="#ef6c00">Factory Wt</Typography>
                                                            <TextField
                                                                variant="standard"
                                                                InputProps={{ disableUnderline: true, style: { fontSize: '0.9rem', fontWeight: 'bold', textAlign: 'center' } }}
                                                                placeholder="0"
                                                                type="number"
                                                                disabled={isSubmitted || !isEditMode}
                                                                sx={{ width: 50 }}
                                                                value={dailyWeights[selectedDivision]?.['Tea_Factory']?.factoryWt || ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val === '' || Number(val) >= 0) {
                                                                        setDailyWeights((prev: any) => ({
                                                                            ...prev,
                                                                            [selectedDivision]: {
                                                                                ...prev[selectedDivision],
                                                                                ['Tea_Factory']: { ...prev[selectedDivision]?.['Tea_Factory'], factoryWt: val }
                                                                            }
                                                                        }));
                                                                    }
                                                                }}
                                                            />
                                                            <Typography variant="caption" color="text.secondary">kg</Typography>
                                                        </Box>
                                                    </Box>
                                                )}

                                                {/* Rubber Section */}
                                                {harvestFields.Rubber.length > 0 && (
                                                    <Box display="flex" flexWrap="wrap" gap={2} alignItems="center" sx={{ borderLeft: harvestFields.Tea.length > 0 ? '1px solid #bdbdbd' : 'none', pl: harvestFields.Tea.length > 0 ? 2 : 0 }}>
                                                        {harvestFields.Rubber.map(field => (
                                                            <Box key={field} display="flex" alignItems="center" bgcolor="white" px={1} py={0.5} borderRadius={1} border="1px solid #cfd8dc">
                                                                <Typography variant="caption" fontWeight="bold" mr={1} color="#455a64">{field}</Typography>
                                                                <TextField
                                                                    variant="standard"
                                                                    InputProps={{ disableUnderline: true, style: { fontSize: '0.9rem', fontWeight: 'bold', textAlign: 'center' } }}
                                                                    placeholder="0"
                                                                    type="number"
                                                                    disabled={isSubmitted || !isEditMode}
                                                                    sx={{ width: 50 }}
                                                                    value={dailyWeights[selectedDivision]?.[field]?.fieldWt || ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        if (val === '' || Number(val) >= 0) {
                                                                            setDailyWeights((prev: any) => ({
                                                                                ...prev,
                                                                                [selectedDivision]: {
                                                                                    ...prev[selectedDivision],
                                                                                    [field]: { ...prev[selectedDivision]?.[field], fieldWt: val }
                                                                                }
                                                                            }));
                                                                        }
                                                                    }}
                                                                />
                                                                <Typography variant="caption" color="text.secondary">L</Typography>
                                                            </Box>
                                                        ))}
                                                        {/* Single Factory Weight for Rubber */}
                                                        <Box display="flex" alignItems="center" bgcolor="white" px={1} py={0.5} borderRadius={1} border="1px solid #cfd8dc">
                                                            <Typography variant="caption" fontWeight="bold" mr={1} color="#ef6c00">Factory Wt</Typography>
                                                            <TextField
                                                                variant="standard"
                                                                InputProps={{ disableUnderline: true, style: { fontSize: '0.9rem', fontWeight: 'bold', textAlign: 'center' } }}
                                                                placeholder="0"
                                                                type="number"
                                                                disabled={isSubmitted || !isEditMode}
                                                                sx={{ width: 50 }}
                                                                value={dailyWeights[selectedDivision]?.['Rubber_Factory']?.factoryWt || ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val === '' || Number(val) >= 0) {
                                                                        setDailyWeights((prev: any) => ({
                                                                            ...prev,
                                                                            [selectedDivision]: {
                                                                                ...prev[selectedDivision],
                                                                                ['Rubber_Factory']: { ...prev[selectedDivision]?.['Rubber_Factory'], factoryWt: val }
                                                                            }
                                                                        }));
                                                                    }
                                                                }}
                                                            />
                                                            <Typography variant="caption" color="text.secondary">L</Typography>
                                                        </Box>
                                                    </Box>
                                                )}
                                            </Box>
                                        </Paper>
                                    );
                                })()}
                                {Object.entries(grouped).map(([task, items]: any) => (
                                    <TaskSection key={task} task={task} items={items} onUpdate={handleUpdate} isSubmitted={isSubmitted || !isEditMode} isFinalized={isSubmitted} fields={fields} />
                                ))}
                            </Box>
                        </Box>
                    )}
                </Box>
            </Box>

            {/* Add Evening Worker Dialog */}
            <Dialog open={addWorkerOpen} onClose={() => setAddWorkerOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ color: '#2e7d32', fontWeight: 'bold' }}>Assign Evening Worker</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
                        <InputLabel>Task Type</InputLabel>
                        <Select
                            value={addWorkerTask}
                            label="Task Type"
                            onChange={(e) => setAddWorkerTask(e.target.value)}
                        >
                            {availableTasks.length > 0 ? availableTasks.map((t: string) => (
                                <MenuItem key={t} value={t}>{t}</MenuItem>
                            )) : (
                                ['Plucking', 'Sundry', 'Other'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)
                            )}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
                        <InputLabel>Field Name</InputLabel>
                        <Select
                            value={addWorkerField}
                            label="Field Name"
                            onChange={(e) => setAddWorkerField(e.target.value)}
                        >
                            {fields.filter((f: any) => f.divisionId === selectedDivision).map((f: any) => (
                                <MenuItem key={f.name} value={f.name}>{f.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Autocomplete
                        id="evening-worker-select"
                        options={allWorkers.filter((w: any) => {
                            if (w.status !== 'ACTIVE') return false;
                            if (w.employmentType === 'CONTRACT') return w.registeredDate === today;
                            if (w.employmentType === 'CONTRACT_MEMBER') return false;
                            return true;
                        }).sort((a: any, b: any) => {
                            const typeOrders: Record<string, number> = { 'PERMANENT': 1, 'CASUAL': 2, 'CONTRACT': 3, 'CONTRACT_MEMBER': 3 };
                            const orderA = typeOrders[a.employmentType || ''] || 4;
                            const orderB = typeOrders[b.employmentType || ''] || 4;
                            if (orderA !== orderB) return orderA - orderB;
                            return a.name.localeCompare(b.name);
                        })}
                        groupBy={(option: any) => {
                            if (option.employmentType === 'PERMANENT') return '— PERMANENT —';
                            if (option.employmentType === 'CASUAL') return '— CASUAL —';
                            if (option.employmentType === 'CONTRACT' || option.employmentType === 'CONTRACT_MEMBER') return '— CONTRACT —';
                            return '— OTHER —';
                        }}
                        getOptionLabel={(option: any) => option.name}
                        isOptionEqualToValue={(option: any, value: any) => option.id === value?.id}
                        value={null} // Keep unselected by default since selecting adds immediately
                        onChange={(_event, newValue: any) => {
                            if (!newValue) return;
                            const worker = newValue;
                            if (worker && addWorkerTask && addWorkerField) {
                                const itemsForTaskField = attendanceData.filter(item => item.workType === addWorkerTask && item.fieldName === addWorkerField && item.divisionId === selectedDivision);
                                let defaultDailyWorkId = itemsForTaskField.length > 0 ? itemsForTaskField[0].dailyWorkId : '';
                                if (!defaultDailyWorkId) {
                                    defaultDailyWorkId = '00000000-0000-0000-0000-000000000000';
                                }

                                const newRecord: AttendanceRecord = {
                                    id: `temp-${Date.now()}`,
                                    workerId: worker.workerId || worker.id,
                                    workerName: worker.name,
                                    workerType: worker.employmentType || 'PERMANENT',
                                    workType: addWorkerTask,
                                    fieldName: addWorkerField,
                                    status: 'PRESENT',
                                    session: 'EVENING_SESSION',
                                    divisionId: selectedDivision,
                                    workDate: today,
                                    tenantId: tenantId,
                                    dailyWorkId: defaultDailyWorkId
                                };
                                setAttendanceData(prev => [...prev, newRecord]);
                                setAddWorkerOpen(false);
                                setAddWorkerTask('');
                                setAddWorkerField('');
                            } else if (!addWorkerTask || !addWorkerField) {
                                setNotification({ open: true, message: 'Please select both Task and Field first', severity: 'error' });
                            }
                        }}
                        getOptionDisabled={(option: any) => attendanceData.some(a => a.workerId === (option.workerId || option.id) && (a.session === 'EVENING_SESSION' || a.session === 'FULL_DAY'))}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Assign Worker"
                                placeholder="Search by name or role"
                                margin="dense"
                            />
                        )}
                        renderOption={(props, option: any) => {
                            let color = "#757575";
                            let isAssigned = false;

                            // Visual check if they are already assigned to SOMETHING for the evening based on backend data (simplified visual check)
                            const hasEveningAssigned = attendanceData.some(a => a.workerId === (option.workerId || option.id) && (a.session === 'EVENING_SESSION' || a.session === 'FULL_DAY'));
                            if (hasEveningAssigned) isAssigned = true;

                            if (option.employmentType === 'PERMANENT') color = "#2e7d32";
                            else if (option.employmentType === 'CASUAL') color = "#0288d1";
                            else if (option.employmentType === 'CONTRACT' || option.employmentType === 'CONTRACT_MEMBER') color = "#9c27b0";

                            const { key, ...optionProps } = props as any;

                            return (
                                <li key={key || option.id} {...optionProps} style={{ color, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px' }}>
                                    <Checkbox checked={isAssigned} size="small" sx={{ p: 0 }} disabled />
                                    <span>{option.name} {isAssigned ? '(Assigned)' : ''}</span>
                                </li>
                            );
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={() => setAddWorkerOpen(false)} color="inherit">Cancel</Button>
                </DialogActions>
            </Dialog>
            <Snackbar open={notification.open} autoHideDuration={4000} onClose={() => setNotification({ ...notification, open: false })}>
                <Alert severity={notification.severity}>{notification.message}</Alert>
            </Snackbar>

            {/* Confirmation Dialog - Plantation Vibe */}
            <Dialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        bgcolor: '#f1f8e9', // Lighter green bg
                        width: '100%',
                        maxWidth: 350,
                        border: '2px solid #4caf50'
                    }
                }}
            >
                <DialogTitle sx={{ color: '#2e7d32', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckIcon sx={{ color: '#4caf50' }} /> Confirm Submission
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" color="text.secondary">
                        Are you sure you want to finalize the Evening Muster and Harvest data? This action will save all entries.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button
                        onClick={() => setConfirmOpen(false)}
                        variant="outlined" color="inherit"
                        sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#757575', color: '#757575' }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmSubmit}
                        variant="contained"
                        autoFocus
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            bgcolor: '#2e7d32',
                            '&:hover': { bgcolor: '#1b5e20' }
                        }}>
                        Yes, Submit Data
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Save Draft Dialog */}
            <Dialog
                open={confirmSaveDraftOpen}
                onClose={() => setConfirmSaveDraftOpen(false)}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        bgcolor: '#e8f5e9', // Lighter green bg
                        width: '100%',
                        maxWidth: 350,
                        border: '2px solid #66bb6a'
                    }
                }}
            >
                <DialogTitle sx={{ color: '#2e7d32', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckIcon sx={{ color: '#66bb6a' }} /> Save Work Progress
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" color="text.secondary">
                        Save current entries? You can continue editing later before final submission.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={() => setConfirmSaveDraftOpen(false)} variant="outlined" color="inherit">Cancel</Button>
                    <Button onClick={handleSaveDraft} variant="contained" color="success">Save</Button>
                </DialogActions>
            </Dialog>

            {/* View Targets Dialog */}
            <Dialog
                open={viewTargetsOpen}
                onClose={() => setViewTargetsOpen(false)}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        bgcolor: '#e8f5e9',
                        width: '100%',
                        maxWidth: 350,
                        border: '2px solid #66bb6a'
                    }
                }}
            >
                <DialogTitle sx={{ color: '#2e7d32', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #c5e1a5', pb: 2 }}>
                    <VisibilityIcon sx={{ color: '#66bb6a' }} /> Active Targets / Norms
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    {norms.length === 0 ? (
                        <Box p={3} textAlign="center">
                            <Typography variant="body2" color="text.secondary">No active targets found.</Typography>
                        </Box>
                    ) : (
                        <Box>
                            {norms.map((n: any, index: number) => (
                                <Box key={n.id} display="flex" justifyContent="space-between" alignItems="center" px={3} py={2} sx={{
                                    borderBottom: index < norms.length - 1 ? '1px solid #c5e1a5' : 'none',
                                    '&:hover': { bgcolor: '#f1f8e9' }
                                }}>
                                    <Typography variant="body1" fontWeight="bold" color="text.secondary">{n.jobRole}</Typography>
                                    <Chip label={`${n.targetValue} ${n.unit}`} color="success" size="small" variant="outlined" sx={{ fontWeight: 'bold', bgcolor: 'white' }} />
                                </Box>
                            ))}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #c5e1a5' }}>
                    <Button onClick={() => setViewTargetsOpen(false)} variant="contained" color="inherit" fullWidth sx={{ fontWeight: 'bold', color: '#2e7d32', bgcolor: '#c8e6c9', '&:hover': { bgcolor: '#a5d6a7' } }}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// --- Task Section Component ---
function TaskSection({ task, items, onUpdate, isSubmitted, hideOutput = false, fields, isFinalized = false }: { task: string, items: any[], onUpdate: any, isSubmitted: boolean, hideOutput?: boolean, fields: any[], isFinalized?: boolean }) {
    // State for weights managed in parent now (or TBD)

    // Task Configuration Logic
    // Task Configuration Logic
    const getTaskConfig = (taskName: string) => {
        const lower = taskName.toLowerCase();

        // Find crop type from first item's field
        const firstItem = items[0];
        const fieldName = firstItem?.fieldName;
        const field = fields?.find((f: any) => f.name === fieldName);
        const cropType = (field?.cropType || 'General'); // Keep original casing for now to match UI, but check lower

        const cropLower = String(cropType).toLowerCase();

        if (lower.includes('pluck') || (lower.includes('harvest') && cropLower === 'tea')) return { label: 'Green Leaf', unit: 'kg', type: 'input' };
        if (lower.includes('tap') || (lower.includes('harvest') && cropLower === 'rubber')) return { label: 'Latex', unit: 'L', type: 'input' };

        // Fallback or explicit mapping if task name implies crop but field might be missing (unlikely)
        if (lower.includes('pluck')) return { label: 'Green Leaf', unit: 'kg', type: 'input' };
        if (lower.includes('tap')) return { label: 'Latex', unit: 'L', type: 'input' };

        if (lower.includes('sack')) return { label: 'Sacks', unit: 'Count', type: 'input' };
        if (lower.includes('transport')) return { label: 'Weight', unit: 'kg', type: 'input' };
        if (lower.includes('fertilizer')) return { label: 'Area', unit: 'Ha', type: 'input' };
        if (lower.includes('chemical')) return { label: 'Area', unit: 'Ac', type: 'input' };
        if (lower.includes('manual')) return { label: 'Area', unit: 'Ac', type: 'input' };

        if (lower.includes('pruning') || lower.includes('prun')) {
            if (cropLower === 'tea') return { label: 'Bushes', unit: 'Count', type: 'input' };
            if (cropLower === 'rubber') return { label: 'Trees', unit: 'Count', type: 'input' };
            return { label: 'Plants', unit: 'Count', type: 'input' }; // Default
        }

        // Attendance Only roles
        if (lower.includes('kangani') || lower.includes('watch') || lower.includes('sundry') || lower.includes('other')) return { label: 'Attendance', unit: '', type: 'none' };

        // Default
        return { label: 'Amount', unit: '', type: 'none' }; // Default to attendance only for unknown
    };

    const taskConfig = getTaskConfig(task);
    const showInputs = !hideOutput && taskConfig.type === 'input';

    // Unique Fields for this task
    const uniqueFields = Array.from(new Set(items.map((i: any) => i.fieldName)));

    // Common Input Style
    const inputStyle = {
        width: 55,
        padding: '2px',
        height: 30,
        border: '1px solid #b0bec5',
        borderRadius: 4,
        textAlign: 'center' as const,
        fontSize: '0.9rem',
        fontWeight: 'bold',
        outline: 'none',
        transition: 'all 0.2s',
        pointerEvents: isSubmitted ? 'none' as const : 'auto' as const,
    };

    return (
        <Paper elevation={0} variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', borderColor: '#e0e0e0' }} >
            {/* Header */}
            < Box bgcolor="#f9fbe7" borderBottom="1px solid #c5e1a5" p={1} display="flex" alignItems="center" gap={2} flexWrap="wrap" >
                <Typography variant="subtitle2" fontWeight="bold" color="#2e7d32" sx={{ minWidth: 120 }}>{task}</Typography>

                {/* Summary Card */}
                <Card elevation={0} sx={{ ml: 'auto', bgcolor: 'white', border: '1px solid #c5e1a5', px: 1, py: 0.5, minWidth: 150 }}>
                    {uniqueFields.map((f: any) => (
                        <Box key={f} mb={0.5}>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Typography variant="caption" fontWeight="bold" color="#33691e" sx={{ fontSize: '0.7rem' }}>{f}</Typography>
                                {!hideOutput && (
                                    <Box display="flex" alignItems="center" gap={0.5}>
                                        <input
                                            type="number"
                                            min="0"
                                            style={{ ...inputStyle, width: 40, height: 20, padding: '1px' }}
                                            onKeyDown={(e) => e.key === '-' && e.preventDefault()}
                                            disabled={isSubmitted}
                                        />
                                        <Typography variant="caption" color="#33691e" fontWeight="bold" sx={{ fontSize: '0.7rem' }}>Ac</Typography>
                                    </Box>
                                )}
                            </Box>
                            {!hideOutput && task.toLowerCase().includes('chemical') && (
                                <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                                    <Typography variant="caption" fontWeight="bold" color="#33691e" sx={{ fontSize: '0.7rem' }}>Chem. Qty</Typography>
                                    <input
                                        type="number"
                                        min="0"
                                        style={{ ...inputStyle, width: 40, height: 20, padding: '1px' }}
                                        onKeyDown={(e) => e.key === '-' && e.preventDefault()}
                                        disabled={isSubmitted}
                                    />
                                </Box>
                            )}
                        </Box>
                    ))}
                </Card>
            </Box >

            {/* Column Headers */}
            {showInputs && (
                <Box display="flex" alignItems="center" px={2} py={1} bgcolor="#f1f8e9" borderBottom="1px solid #e0e0e0">
                    <Box flex={1} minWidth={0}>
                        <Typography variant="caption" fontWeight="bold" color="#546e7a">WORKER</Typography>
                    </Box>
                    <Box display="flex" alignItems="center">
                        <Typography variant="caption" fontWeight="bold" color="#546e7a" align="center" sx={{ width: 65 }}>{taskConfig.label} AM</Typography>
                        <Typography variant="caption" fontWeight="bold" color="#546e7a" align="center" sx={{ width: 65 }}>{taskConfig.label} PM</Typography>
                        <Typography variant="caption" fontWeight="bold" color="#546e7a" align="center" sx={{ width: 55 }}>TOTAL</Typography>
                        <Typography variant="caption" fontWeight="bold" color="#546e7a" align="center" sx={{ width: 65 }}>OVER KGS</Typography>
                        <Typography variant="caption" fontWeight="bold" color="#546e7a" align="center" sx={{ width: 65 }}>OT HRS</Typography>
                        <Typography variant="caption" fontWeight="bold" color="#546e7a" align="center" sx={{ width: 100 }}>SESSION</Typography>
                        <Box sx={{ width: 110 }} /> {/* Spacer for Actions */}
                    </Box>
                </Box>
            )}

            <Box p={1} display="flex" flexDirection="column" gap={0.5}>
                {items.map((item: any, index: number) => (
                    <Box key={item.id}
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        p={1} // Reduced padding
                        borderRadius={2}
                        sx={{
                            bgcolor: index % 2 === 0 ? '#fafafa' : 'white',
                            border: '1px solid #eee',
                            '&:hover': { bgcolor: '#f1f8e9', borderColor: '#c5e1a5' },
                            transition: 'all 0.2s',
                        }}
                    >
                        {/* Worker Info */}
                        <Box display="flex" alignItems="center" gap={1.5} flex={1} minWidth={0}>
                            <Avatar sx={{
                                bgcolor: item.workerType === 'PERMANENT' ? '#2e7d32' : item.workerType === 'CASUAL' ? '#0288d1' : item.workerType?.includes('CONTRACT') ? '#9c27b0' : '#333',
                                width: 32, height: 32
                            }}><PersonIcon sx={{ fontSize: 18, color: 'white' }} /></Avatar>
                            <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Typography variant="body2" fontWeight="600" noWrap lineHeight={1.2} color="#333">{item.workerName}</Typography>
                                    <Chip
                                        label={item.workerType?.includes('CONTRACT') ? 'CONTRACT' : item.workerType}
                                        size="small"
                                        sx={{
                                            height: 16,
                                            fontSize: '0.6rem',
                                            fontWeight: 'bold',
                                            bgcolor: item.workerType === 'PERMANENT' ? '#e8f5e9' : item.workerType === 'CASUAL' ? '#e1f5fe' : '#f3e5f5',
                                            color: item.workerType === 'PERMANENT' ? '#2e7d32' : item.workerType === 'CASUAL' ? '#0288d1' : '#9c27b0',
                                            border: '1px solid',
                                            borderColor: item.workerType === 'PERMANENT' ? '#a5d6a7' : item.workerType === 'CASUAL' ? '#81d4fa' : '#ce93d8',
                                        }}
                                    />
                                </Box>
                                <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ fontSize: '0.75rem', mt: 0.5 }}>{item.fieldName}</Typography>
                            </Box>
                        </Box>

                        {/* Right Side: Inputs */}
                        {showInputs && (
                            <Box display="flex" alignItems="center">
                                {/* AM Input */}
                                <Box width={65} display="flex" justifyContent="center">
                                    <input
                                        type="number"
                                        min="0"
                                        onKeyDown={(e) => e.key === '-' && e.preventDefault()}
                                        style={{ ...inputStyle, borderColor: '#81c784' }}
                                        value={item.amWeight ?? ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '' || Number(val) >= 0) onUpdate(item.id, 'amWeight', val);
                                        }}
                                        disabled={isSubmitted}
                                        placeholder="AM"
                                    />
                                </Box>
                                {/* PM Input */}
                                <Box width={65} display="flex" justifyContent="center">
                                    <input
                                        type="number"
                                        min="0"
                                        onKeyDown={(e) => e.key === '-' && e.preventDefault()}
                                        style={{ ...inputStyle, borderColor: '#81c784' }}
                                        value={item.pmWeight ?? ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '' || Number(val) >= 0) onUpdate(item.id, 'pmWeight', val);
                                        }}
                                        disabled={isSubmitted}
                                        placeholder="PM"
                                    />
                                </Box>
                                {/* Total Badge */}
                                <Box width={55} display="flex" justifyContent="center">
                                    <Box
                                        bgcolor="#2e7d32"
                                        color="white"
                                        borderRadius={1}
                                        width={45}
                                        height={30}
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="center"
                                        border="1px solid #1b5e20"
                                        sx={{ boxShadow: 1 }}
                                    >
                                        <Typography variant="body2" fontWeight="bold" fontSize="0.9rem">
                                            {((Number(item.amWeight) || 0) + (Number(item.pmWeight) || 0)).toFixed(0)}
                                        </Typography>
                                    </Box>
                                </Box>
                                {/* Over Kilos Input */}
                                <Box width={65} display="flex" justifyContent="center">
                                    <input
                                        type="number"
                                        min="0"
                                        onKeyDown={(e) => e.key === '-' && e.preventDefault()}
                                        style={{ ...inputStyle, borderColor: '#fbc02d' }} // Highlight differently
                                        value={item.overKilos ?? ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '' || Number(val) >= 0) onUpdate(item.id, 'overKilos', val);
                                        }}
                                        disabled={isSubmitted}
                                        placeholder="Over"
                                    />
                                </Box>
                                {/* OT Hours Input */}
                                <Box width={65} display="flex" justifyContent="center">
                                    <input
                                        type="number"
                                        min="0"
                                        onKeyDown={(e) => e.key === '-' && e.preventDefault()}
                                        style={{ ...inputStyle, borderColor: '#0288d1' }} // Highlight differently
                                        value={item.otHours ?? ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '' || Number(val) >= 0) onUpdate(item.id, 'otHours', val);
                                        }}
                                        disabled={isSubmitted}
                                        placeholder="OT"
                                    />
                                </Box>
                                {/* Session Dropdown */}
                                <Box width={100} display="flex" justifyContent="center">
                                    <FormControl variant="standard" size="small" sx={{ width: '90%' }}>
                                        <Select
                                            value={item.session || 'FULL_DAY'}
                                            onChange={(e) => onUpdate(item.id, 'session', e.target.value)}
                                            disableUnderline
                                            disabled={isSubmitted}
                                            sx={{
                                                fontSize: '0.7rem',
                                                fontWeight: 'bold',
                                                color: item.session === 'FULL_DAY' ? '#1976d2' : '#ed6c02',
                                                bgcolor: item.session === 'FULL_DAY' ? '#f5f5f5' : '#fff3e0',
                                                border: item.session === 'FULL_DAY' ? '1px solid #e0e0e0' : '1px solid #ffcc80',
                                                borderRadius: 1,
                                                px: 0.5,
                                                height: 30
                                            }}
                                        >
                                            <MenuItem value="FULL_DAY" sx={{ fontSize: '0.75rem' }}>Full Day</MenuItem>
                                            <MenuItem value="MORNING_SESSION" sx={{ fontSize: '0.75rem' }}>Morning</MenuItem>
                                            <MenuItem value="EVENING_SESSION" sx={{ fontSize: '0.75rem' }}>Evening</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Box>
                            </Box>
                        )}

                        {/* Actions */}
                        <Box width={110} display="flex" justifyContent="flex-end" alignItems="center">
                            {isFinalized ? (
                                <>
                                    {item.status === 'PRESENT' && (
                                        <Chip
                                            label="Present"
                                            size="small"
                                            sx={{ bgcolor: '#00e676', color: '#000', fontWeight: 'bold', height: 24 }}
                                            icon={<CheckIcon sx={{ fontSize: '1rem !important' }} />}
                                        />
                                    )}
                                    {item.status === 'ABSENT' && (
                                        <Chip
                                            label="Absent"
                                            size="small"
                                            sx={{ bgcolor: '#ff3d00', color: 'white', fontWeight: 'bold', height: 24 }}
                                        />
                                    )}
                                    {item.status === 'HALF_DAY' && (
                                        <Chip
                                            label="Half Day"
                                            size="small"
                                            sx={{ bgcolor: '#ffd600', color: '#000', fontWeight: 'bold', height: 24 }}
                                        />
                                    )}
                                    {(!item.status || item.status === 'PENDING') && (
                                        <Chip label="-" size="small" variant="outlined" sx={{ height: 24 }} />
                                    )}
                                </>
                            ) : (
                                <Box display="flex" gap={0.5} bgcolor="#1565c0" p={0.5} borderRadius={2} boxShadow={1}>
                                    <Tooltip title="Mark Half Day">
                                        <span style={{ display: 'inline-block' }}>
                                            <IconButton
                                                onClick={() => onUpdate(item.id, 'status', 'HALF_DAY')}
                                                size="small"
                                                disabled={isSubmitted}
                                                sx={{
                                                    padding: 0.5,
                                                    bgcolor: item.status === 'HALF_DAY' ? '#ffd600' : 'white',
                                                    color: item.status === 'HALF_DAY' ? '#000' : '#cfd8dc',
                                                    '&:hover': { bgcolor: '#ffea00', color: '#000' }
                                                }}>
                                                <BlockIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                    <Tooltip title="Mark Present">
                                        <span style={{ display: 'inline-block' }}>
                                            <IconButton
                                                onClick={() => onUpdate(item.id, 'status', 'PRESENT')}
                                                size="small"
                                                disabled={isSubmitted}
                                                sx={{
                                                    padding: 0.5,
                                                    bgcolor: item.status === 'PRESENT' ? '#00e676' : 'white',
                                                    color: item.status === 'PRESENT' ? '#000' : '#cfd8dc',
                                                    '&:hover': { bgcolor: '#00c853', color: '#000' }
                                                }}>
                                                <CheckIcon sx={{ fontSize: 16, fontWeight: 'bold' }} />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                    <Tooltip title="Mark Absent">
                                        <span style={{ display: 'inline-block' }}>
                                            <IconButton
                                                onClick={() => onUpdate(item.id, 'status', 'ABSENT')}
                                                size="small"
                                                disabled={isSubmitted}
                                                sx={{
                                                    padding: 0.5,
                                                    bgcolor: item.status === 'ABSENT' ? '#ff3d00' : 'white',
                                                    color: item.status === 'ABSENT' ? '#000' : '#cfd8dc',
                                                    '&:hover': { bgcolor: '#ff3d00', color: '#000' }
                                                }}>
                                                <CloseIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                </Box>
                            )}
                        </Box>
                    </Box>
                ))}
            </Box >
        </Paper >
    );
}


// --- Shared Component: Muster Chit Summary ---
const MusterChitSummary = ({ data = [], fields = [], label, includeAbsent = false }: any) => {
    // Categorization Logic
    const getSummary = () => {
        const categories: any = { Tea: {}, Rubber: {}, General: {} };
        if (!data || !Array.isArray(data)) return categories;
        data.forEach((m: any) => {
            const field = fields.find((f: any) => f.name === m.fieldName || f.fieldId === m.fieldId);
            const crop = field?.cropType || 'General';
            let catKey = 'General';
            if (crop === 'Tea') catKey = 'Tea';
            if (crop === 'Rubber') catKey = 'Rubber';

            if (!categories[catKey][m.workType]) categories[catKey][m.workType] = { count: 0, fields: {} };

            if (includeAbsent || m.status !== 'ABSENT') {
                categories[catKey][m.workType].count++;
                if (!categories[catKey][m.workType].fields[m.fieldName]) categories[catKey][m.workType].fields[m.fieldName] = 0;
                categories[catKey][m.workType].fields[m.fieldName]++;
            }
        });
        return categories;
    };
    const summary = getSummary();
    const grandTotal = (data || []).filter((d: any) => includeAbsent || d.status !== 'ABSENT').length;

    return (
        <Paper elevation={3} sx={{ overflow: 'hidden', borderRadius: 2, mb: 2, maxWidth: 350, mx: 'auto' }}>
            <Box bgcolor="#e0e0e0" p={0.5} borderBottom="1px solid #ccc">
                <Typography variant="subtitle2" align="center" fontWeight="bold">{label}</Typography>
            </Box>
            <Table size="small" sx={{ '& .MuiTableCell-root': { padding: '4px 8px', fontSize: '0.8rem' } }}>
                <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                    <TableRow>
                        <TableCell><strong>Work item</strong></TableCell>
                        <TableCell><strong>Field No</strong></TableCell>
                        <TableCell align="center"><strong>No of Workers</strong></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {/* Tea Section */}
                    {Object.entries(summary.Tea).map(([task, val]: any) => (
                        <Fragment key={task}>
                            {Object.entries(val.fields).map(([field, count]: any, idx) => (
                                <TableRow key={`${task}-${field}`}>
                                    {idx === 0 && (
                                        <TableCell rowSpan={Object.keys(val.fields).length} sx={{ verticalAlign: 'top', fontWeight: 'bold' }}>{task}</TableCell>
                                    )}
                                    <TableCell>{field}</TableCell>
                                    <TableCell align="center">{count}</TableCell>
                                </TableRow>
                            ))}
                            {task === 'Plucking' && (
                                <TableRow sx={{ bgcolor: '#a5d6a7' }}>
                                    <TableCell colSpan={2}><strong>Total Pluckers</strong></TableCell>
                                    <TableCell align="center"><strong>{val.count}</strong></TableCell>
                                </TableRow>
                            )}
                        </Fragment>
                    ))}
                    {Object.keys(summary.Tea).length > 0 && (
                        <TableRow sx={{ bgcolor: '#81c784', borderTop: '2px solid #2e7d32' }}>
                            <TableCell colSpan={2}><strong>Total Tea</strong></TableCell>
                            <TableCell align="center"><strong>{Object.values(summary.Tea).reduce((acc: number, curr: any) => acc + curr.count, 0)}</strong></TableCell>
                        </TableRow>
                    )}

                    {/* Rubber Section */}
                    {Object.entries(summary.Rubber).map(([task, val]: any) => (
                        <Fragment key={task}>
                            {Object.entries(val.fields).map(([field, count]: any, idx) => (
                                <TableRow key={`${task}-${field}`}>
                                    {idx === 0 && (
                                        <TableCell rowSpan={Object.keys(val.fields).length} sx={{ verticalAlign: 'top', fontWeight: 'bold' }}>{task}</TableCell>
                                    )}
                                    <TableCell>{field}</TableCell>
                                    <TableCell align="center">{count}</TableCell>
                                </TableRow>
                            ))}
                            {task === 'Tapping' && (
                                <TableRow sx={{ bgcolor: '#a5d6a7' }}>
                                    <TableCell colSpan={2}><strong>Total Tappers</strong></TableCell>
                                    <TableCell align="center"><strong>{val.count}</strong></TableCell>
                                </TableRow>
                            )}
                        </Fragment>
                    ))}
                    {Object.keys(summary.Rubber).length > 0 && (
                        <TableRow sx={{ bgcolor: '#81c784', borderTop: '2px solid #2e7d32' }}>
                            <TableCell colSpan={2}><strong>Total Rubber</strong></TableCell>
                            <TableCell align="center"><strong>{Object.values(summary.Rubber).reduce((acc: number, curr: any) => acc + curr.count, 0)}</strong></TableCell>
                        </TableRow>
                    )}

                    {/* General Section */}
                    {Object.entries(summary.General).map(([task, val]: any) => (
                        <Fragment key={task}>
                            {Object.entries(val.fields).map(([field, count]: any, idx) => (
                                <TableRow key={`${task}-${field}`}>
                                    {idx === 0 && (
                                        <TableCell rowSpan={Object.keys(val.fields).length} sx={{ verticalAlign: 'top', fontWeight: 'bold' }}>{task}</TableCell>
                                    )}
                                    <TableCell>{field}</TableCell>
                                    <TableCell align="center">{count}</TableCell>
                                </TableRow>
                            ))}
                        </Fragment>
                    ))}
                    {Object.keys(summary.General).length > 0 && (
                        <TableRow sx={{ bgcolor: '#81c784', borderTop: '2px solid #2e7d32' }}>
                            <TableCell colSpan={2}><strong>Total General</strong></TableCell>
                            <TableCell align="center"><strong>{Object.values(summary.General).reduce((acc: number, curr: any) => acc + curr.count, 0)}</strong></TableCell>
                        </TableRow>
                    )}

                    <TableRow sx={{ bgcolor: '#dcdcdc', borderTop: '3px double #000' }}>
                        <TableCell colSpan={2}><strong>Grand Total of workers</strong></TableCell>
                        <TableCell align="center"><strong>{grandTotal}</strong></TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </Paper>
    );
};

// --- Morning Plan Display (Uses Submitted JSON Snapshot) ---
function MorningPlanDisplay({ plans }: { plans: any[] }) {
    // Group by Task

    const groupedByTask = plans.reduce((acc: any, plan: any) => {
        if (!acc[plan.task]) acc[plan.task] = [];
        acc[plan.task].push(plan);
        return acc;
    }, {});

    return (
        <Box>
            {Object.entries(groupedByTask).map(([task, fieldPlans]: any) => (
                <Paper key={task} elevation={0} variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', borderColor: '#c5e1a5' }}>
                    {/* Header - Green Theme for Morning (User Preferred) */}
                    <Box bgcolor="#f1f8e9" borderBottom="1px solid #c5e1a5" p={1} display="flex" alignItems="center">
                        <Typography variant="subtitle2" fontWeight="bold" color="#33691e" sx={{ minWidth: 120 }}>{task}</Typography>
                    </Box>

                    <Box p={1}>
                        {fieldPlans.map((plan: any, idx: number) => (
                            <Box key={`${task}-${plan.field}-${idx}`} mb={1} last-child={{ mb: 0 }}>
                                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'white', border: '1px solid #eee' }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                        <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                            Field: <span style={{ color: '#333' }}>{plan.field}</span>
                                        </Typography>
                                        <Typography variant="caption" color="primary" fontWeight="bold" sx={{ bgcolor: '#e3f2fd', px: 1, borderRadius: 1 }}>
                                            {plan.count} Assigned
                                        </Typography>
                                    </Box>

                                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                                        {plan.assigned && plan.assigned.map((w: any) => (
                                            <Chip
                                                key={w.id}
                                                avatar={<Avatar sx={{ bgcolor: '#66bb6a', width: 24, height: 24 }}><PersonIcon sx={{ fontSize: 16 }} /></Avatar>}
                                                label={w.name}
                                                variant="outlined"
                                                size="small"
                                                sx={{
                                                    fontSize: '0.75rem',
                                                    height: 28,
                                                    bgcolor: '#f9fbe7',
                                                    borderColor: '#c5e1a5',
                                                    '& .MuiChip-label': { color: '#33691e', fontWeight: 500 }
                                                }}
                                            />
                                        ))}
                                    </Box>
                                </Paper>
                            </Box>
                        ))}
                    </Box>
                </Paper>
            ))}
            {plans.length === 0 && (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4, fontStyle: 'italic' }}>
                    No Morning Plan Found
                </Typography>
            )}
        </Box>
    );
}

// --- Tab 2: History (Past Musters) ---
function HistoryTab() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;
    const [history, setHistory] = useState<any[]>([]);
    const [rawData, setRawData] = useState<any[]>([]);
    const [fields, setFields] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Review Modal State
    const [reviewOpen, setReviewOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedRecords, setSelectedRecords] = useState<any[]>([]);
    const [morningPlan, setMorningPlan] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Metadata
                const [fRes, wRes, divRes] = await Promise.all([
                    axios.get(`/api/fields?tenantId=${tenantId}`),
                    axios.get(`/api/workers?tenantId=${tenantId}`),
                    axios.get(`/api/divisions?tenantId=${tenantId}`)
                ]);
                setFields(fRes.data);

                const divMap = new Map<string, string>();
                divRes.data.forEach((d: any) => divMap.set(d.divisionId, d.name));

                const wMap = new Map<string, any>();
                wRes.data.forEach((w: any) => {
                    if (w.workerId) wMap.set(w.workerId, w);
                    wMap.set(w.id, w);
                });

                // Fetch WORK History (The source of truth for Musters)
                const dwRes = await axios.get(`/api/operations/daily-work?tenantId=${tenantId}`);
                const morningMusters = dwRes.data.filter((dw: any) => dw.workType === 'Morning Muster');

                // Fetch Attendance
                const attRes = await axios.get(`/api/operations/attendance?tenantId=${tenantId}`);

                // Map Attendance to Divisions via DailyWork ID (or infer)
                // We build a helper map: DailyWorkID -> DivisionID
                const dwDivMap = new Map<string, string>();
                dwRes.data.forEach((dw: any) => dwDivMap.set(dw.id, dw.divisionId)); // Assuming dw.id is the link

                const enrichedAttendance = attRes.data.map((rec: any) => {
                    // Try to resolve division from dailyWork link or field
                    let divId = 'UNKNOWN';
                    if (rec.dailyWorkId) divId = dwDivMap.get(rec.dailyWorkId) || 'UNKNOWN';
                    if (divId === 'UNKNOWN') {
                        // Fallback: try field mapping
                        const f = fRes.data.find((field: any) => field.name && rec.fieldName && field.name.toLowerCase() === rec.fieldName.toLowerCase());
                        if (f) divId = f.divisionId;
                    }

                    return {
                        ...rec,
                        workerName: wMap.get(rec.workerId)?.name || rec.workerName || 'Unknown',
                        gender: wMap.get(rec.workerId)?.gender || 'MALE',
                        divisionId: divId
                    };
                });

                setRawData(enrichedAttendance); // Global store of attendance

                // Construct History Rows from Morning Muster DailyWorks
                const historyRows = morningMusters.map((mm: any) => {
                    const date = mm.workDate;
                    const divId = mm.divisionId;

                    // Filter attendance for this specific muster (Date + Division)
                    const musterAtt = enrichedAttendance.filter((a: any) =>
                        a.workDate === date && a.divisionId === divId
                    );

                    let attended = 0;
                    let totalWeight = 0;
                    let latestUpdate: string | null = null;

                    musterAtt.forEach((item: any) => {
                        if (item.status === 'PRESENT' || item.status === 'HALF_DAY' || item.status === 'COMPLETED') {
                            attended++;
                            totalWeight += (Number(item.amWeight) || 0) + (Number(item.pmWeight) || 0);
                        }
                        // Track latest update time
                        if (item.updatedAt) {
                            if (!latestUpdate || new Date(item.updatedAt) > new Date(latestUpdate)) {
                                latestUpdate = item.updatedAt;
                            }
                        }
                    });

                    return {
                        id: mm.workId, // Correct field from backend (DailyWork entity)
                        date: date,
                        divisionId: divId,
                        divisionName: divMap.get(divId) || 'Unknown',
                        submittedAt: latestUpdate || mm.createdAt,
                        assigned: mm.workerCount,
                        attended: attended,
                        totalWeight: totalWeight,
                        types: ['Morning Muster'],
                        details: mm.details // Store the snapshot JSON here!
                    };
                });

                setHistory(historyRows.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));

            } catch (e) {
                console.error("History fetch failed", e);
            }
            setLoading(false);
        };
        fetchData();
    }, [tenantId]);

    const handleReview = async (row: any) => {
        setSelectedDate(`${row.date} - ${row.divisionName}`);

        // Filter attendance for this specific Division + Date
        const records = rawData.filter((r: any) => r.workDate === row.date && r.divisionId === row.divisionId);
        setSelectedRecords(records);

        // Use the snapshot directly from the row
        if (row.details) {
            try {
                setMorningPlan(JSON.parse(row.details));
            } catch (e) { setMorningPlan([]); }
        } else {
            setMorningPlan([]);
        }

        setReviewOpen(true);
    };

    const handleDelete = async (row: any) => {
        if (!row.id) {
            console.error("Cannot delete: Row ID is missing", row);
            alert(`Error: Row ID is missing. Available fields: ${Object.keys(row).join(", ")}`);
            return;
        }
        if (window.confirm(`Are you sure you want to delete the report for ${row.date} - ${row.divisionName}?`)) {
            try {
                await axios.delete(`/api/tenants/daily-work/${row.id}?tenantId=${tenantId}`);
                setHistory(prev => prev.filter(h => h.id !== row.id));
            } catch (e) {
                console.error("Delete failed", e);
                alert("Failed to delete report");
            }
        }
    };

    const groupedRecords = selectedRecords.reduce((acc: any, item) => {
        const key = item.workType;
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});

    if (loading) return <Box display="flex" justifyItems="center" p={3}><CircularProgress /></Box>;

    return (
        <Box sx={{ maxWidth: 1000, mx: 'auto', mt: 4 }}>
            <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                    <Box display="flex" alignItems="center" gap={2}>
                        <HistoryIcon color="primary" sx={{ fontSize: 30 }} />
                        <Typography variant="h5" fontWeight="bold" color="text.primary">
                            Muster History
                        </Typography>
                    </Box>
                    <Chip label={`${history.length} Records`} color="primary" variant="outlined" size="small" />
                </Box>

                <TableContainer sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Division</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Submitted At</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {history.map((row: any) => (
                                <TableRow key={`${row.date}-${row.divisionId}`} hover>
                                    <TableCell sx={{ fontWeight: 500 }}>{row.date}</TableCell>
                                    <TableCell>
                                        <Chip label={row.divisionName} size="small" sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 'bold' }} />
                                    </TableCell>
                                    <TableCell align="center" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                                        {row.submittedAt ? new Date(row.submittedAt.endsWith('Z') ? row.submittedAt : row.submittedAt + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            color="primary"
                                            startIcon={<VisibilityIcon />}
                                            onClick={() => handleReview(row)}
                                            sx={{ textTransform: 'none', borderRadius: 2, mr: 1 }}
                                        >
                                            View
                                        </Button>
                                        <Tooltip title="Delete Report">
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleDelete(row)}
                                                sx={{ bgcolor: '#ffebee', '&:hover': { bgcolor: '#ffcdd2' } }}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {history.length === 0 && (
                                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6, color: 'text.secondary', fontStyle: 'italic' }}>No muster records found.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* FULL REVIEW MODAL */}
            <Dialog open={reviewOpen} onClose={() => setReviewOpen(false)} maxWidth="lg" fullWidth>
                <DialogTitle sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 'bold' }}>
                    Muster Review: {selectedDate}
                </DialogTitle>
                <DialogContent sx={{ mt: 1, bgcolor: '#f5f5f5', p: 1 }}>
                    <Grid container spacing={3}>
                        {/* LEFT: MORNING PLAN (Strict 6 columns) */}
                        <Grid size={{ xs: 12, md: 6 }} sx={{ borderRight: { md: '2px dashed #bdbdbd' } }}>
                            <Box mb={3}>
                                <Box display="flex" alignItems="center" gap={1} mb={2} justifyContent="center">
                                    <Avatar sx={{ bgcolor: 'orange', width: 24, height: 24 }}>🌞</Avatar>
                                    <Typography variant="h6" color="primary.main" fontWeight="bold">Morning Assignments (Plan)</Typography>
                                </Box>
                                <MusterChitSummary
                                    data={selectedRecords}
                                    fields={fields}
                                    label="Muster Chit"
                                    includeAbsent={true}
                                />
                            </Box>

                            <Box>
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Field Assignments</Typography>
                                <MorningPlanDisplay plans={morningPlan} />
                            </Box>
                        </Grid>

                        {/* RIGHT: EVENING ACTUAL (Strict 6 columns) */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Box mb={3}>
                                <Box display="flex" alignItems="center" gap={1} mb={2} justifyContent="center">
                                    <Avatar sx={{ bgcolor: '#bdbdbd', width: 24, height: 24 }}>🌙</Avatar>
                                    <Typography variant="h6" color="success.main" fontWeight="bold">Evening Results (Actual)</Typography>
                                </Box>
                                <MusterChitSummary
                                    data={selectedRecords}
                                    fields={fields}
                                    label="Muster Chit"
                                    includeAbsent={false}
                                />
                            </Box>

                            <Box>
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Harvest & Output</Typography>
                                {Object.entries(groupedRecords).map(([task, items]: any) => (
                                    <TaskSection
                                        key={`evening-${task}`}
                                        task={task}
                                        items={items}
                                        onUpdate={() => { }} // Read-only
                                        isSubmitted={true}
                                        hideOutput={false} // Show outputs
                                        fields={fields} // Pass fields
                                    />
                                ))}
                            </Box>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2, bgcolor: '#fff' }}>
                    <Button onClick={() => setReviewOpen(false)} variant="contained" color="primary" size="large">Close Review</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
