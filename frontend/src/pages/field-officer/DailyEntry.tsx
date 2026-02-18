import { Box, Typography, Button, Paper, Tabs, Tab, Table, TableBody, TableContainer, TableCell, TableHead, TableRow, Chip, IconButton, MenuItem, Select, FormControl, InputLabel, Avatar, Card, CardContent, CircularProgress, Alert, Snackbar, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Grid } from '@mui/material';
import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Check as CheckIcon,
    Close as CloseIcon,
    Block as BlockIcon,
    Person as PersonIcon,
    History as HistoryIcon,
    EditCalendar as EditStartIcon,
    Visibility as VisibilityIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

// --- Interfaces ---
interface AttendanceRecord {
    id: string;
    workerId: string;
    workType: string;
    fieldName: string;
    amWeight?: number;
    pmWeight?: number;
    status: string;
    workerName?: string;
    divisionId?: string;
    workDate: string; // "YYYY-MM-DD"
}

// --- Main Component ---
export default function EveningMusterPage() {
    const [tabIndex, setTabIndex] = useState(0);

    return (
        <Box sx={{ width: '100%', bgcolor: '#f0f2f5', minHeight: '100vh' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'white', px: 3, pt: 2 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom color="primary.dark">
                    Evening Muster & Harvest
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
    const today = new Date().toISOString().split('T')[0];

    const [loading, setLoading] = useState(true);
    const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
    const [divisions, setDivisions] = useState<any[]>([]);
    const [fields, setFields] = useState<any[]>([]); // To store field mapping
    const [selectedDivision, setSelectedDivision] = useState<string>('ALL'); // Default to ALL or first available
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    useEffect(() => {
        if (tenantId) fetchInitialData();
    }, [tenantId]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // Fetch Workers
            const wRes = await axios.get(`/api/workers?tenantId=${tenantId}`);
            const wMap = new Map<string, string>();
            wRes.data.forEach((w: any) => {
                if (w.workerId) wMap.set(w.workerId, w.name);
                wMap.set(w.id, w.name);
            });

            // Fetch Fields
            const fRes = await axios.get(`/api/fields?tenantId=${tenantId}`);
            setFields(fRes.data);

            // Fetch All Divisions (for Name mapping)
            const allDivRes = await axios.get(`/api/divisions?tenantId=${tenantId}`);
            const divNameMap = new Map<string, string>();
            allDivRes.data.forEach((d: any) => divNameMap.set(d.divisionId, d.name));

            // Fetch Today's Daily Work (Mappings)
            const dwRes = await axios.get(`/api/tenants/daily-work?tenantId=${tenantId}&date=${today}`);
            const dwMap = new Map<string, string>();
            dwRes.data.forEach((dw: any) => dwMap.set(dw.workId, dw.divisionId));

            // Fetch Today's Attendance
            const attRes = await axios.get(`/api/tenants/attendance?tenantId=${tenantId}&date=${today}`);

            const enriched = attRes.data.map((rec: any) => ({
                ...rec,
                workerName: wMap.get(rec.workerId) || rec.workerId,
                status: rec.status || 'PRESENT',
                amWeight: rec.amWeight || '',
                pmWeight: rec.pmWeight || '',
                divisionId: dwMap.get(rec.dailyWorkId) || 'UNKNOWN'
            }));

            // Derive Available Divisions from Data
            const uniqueDivIds = Array.from(new Set(enriched.map((i: any) => i.divisionId as string).filter((id: string) => id !== 'UNKNOWN')));
            const activeDivs = uniqueDivIds.map(id => ({
                divisionId: id as string,
                name: divNameMap.get(id as string) || 'Unknown Division'
            }));

            setAttendanceData(enriched);
            setDivisions(activeDivs);

            // Default selection logic
            if (activeDivs.length > 0 && (selectedDivision === '' || !activeDivs.find(d => d.divisionId === selectedDivision))) {
                setSelectedDivision(activeDivs[0].divisionId as string);
            } else if (activeDivs.length === 0) {
                setSelectedDivision('');
            }

        } catch (e) {
            console.error("Failed", e);
            setNotification({ open: true, message: "Failed to load data.", severity: 'error' });
        }
        setLoading(false);
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
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Persistence Key Helper
    const getStorageKey = (divId: string) => `muster_submitted_${tenantId}_${today}_${divId}`;

    // Check submission status on division change
    useEffect(() => {
        if (selectedDivision) {
            const status = localStorage.getItem(getStorageKey(selectedDivision)) === 'true';
            setIsSubmitted(status);
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
                am: Number(item.amWeight) || null,
                pm: Number(item.pmWeight) || null,
                status: item.status
            }));
            await axios.post(`/api/tenants/attendance/bulk`, updates);
            setNotification({ open: true, message: "Saved Successfully!", severity: 'success' });

            // Persist Submission
            localStorage.setItem(getStorageKey(selectedDivision), 'true');
            setIsSubmitted(true); // Disable button
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
                categories[catKey][m.workType] = { count: 0, fields: {} };
            }

            if (m.status !== 'ABSENT') {
                categories[catKey][m.workType].count++;
                if (!categories[catKey][m.workType].fields[m.fieldName]) {
                    categories[catKey][m.workType].fields[m.fieldName] = 0;
                }
                categories[catKey][m.workType].fields[m.fieldName]++;
            }
        });
        return categories;
    };

    const categorizedSummary = getCategorizedSummary();
    const grandWorkerTotal = filteredData.filter(d => d.status !== 'ABSENT').length;

    if (loading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

    return (
        <Box>
            <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2} mb={3}>
                <Typography variant="h6">Dunwatta Estate • {today}</Typography>
                <Box display="flex" gap={2} width={{ xs: '100%', sm: 'auto' }}>
                    <FormControl size="small" sx={{ minWidth: 200, bgcolor: 'white', flex: 1 }}>
                        <InputLabel>Select Division</InputLabel>
                        <Select value={selectedDivision} label="Select Division" onChange={(e) => setSelectedDivision(e.target.value)}>
                            {divisions.map((d: any) => <MenuItem key={d.divisionId} value={d.divisionId}>{d.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <Button variant="contained" color="primary" onClick={() => fetchInitialData()}>Refresh</Button>
                </Box>
            </Box>

            {attendanceData.length === 0 ? (
                <Alert severity="info">No Morning Muster Approved for Today. Cannot verify Attendance.</Alert>
            ) : (
                <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={3}>
                    {/* Muster Chit */}
                    <Box flex={1.2} sx={{ width: '100%', overflowX: 'auto' }}>
                        <Paper elevation={3} sx={{ overflow: 'hidden', borderRadius: 2 }}>
                            <Box bgcolor="#e0e0e0" p={1} borderBottom="1px solid #ccc">
                                <Typography variant="h6" align="center" fontWeight="bold">Muster Chit</Typography>
                            </Box>
                            <Box sx={{ overflowX: 'auto' }}>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                                        <TableRow>
                                            <TableCell><strong>Work item</strong></TableCell>
                                            <TableCell><strong>Field No</strong></TableCell>
                                            <TableCell align="center"><strong>No of Workers</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {/* Tea Section */}
                                        {Object.entries(categorizedSummary.Tea).map(([task, data]: any) => (
                                            <div key={task} style={{ display: 'contents' }}>
                                                {Object.entries(data.fields).map(([field, count]: any, idx) => (
                                                    <TableRow key={`${task}-${field}`}>
                                                        {idx === 0 && (
                                                            <TableCell rowSpan={Object.keys(data.fields).length} sx={{ verticalAlign: 'top', fontWeight: 'bold' }}>{task}</TableCell>
                                                        )}
                                                        <TableCell>{field}</TableCell>
                                                        <TableCell align="center">{count}</TableCell>
                                                    </TableRow>
                                                ))}
                                                {task === 'Plucking' && (
                                                    <TableRow sx={{ bgcolor: '#a5d6a7' }}>
                                                        <TableCell colSpan={2}><strong>Total Pluckers</strong></TableCell>
                                                        <TableCell align="center"><strong>{data.count}</strong></TableCell>
                                                    </TableRow>
                                                )}
                                            </div>
                                        ))}
                                        {Object.keys(categorizedSummary.Tea).length > 0 && (
                                            <TableRow sx={{ bgcolor: '#81c784', borderTop: '2px solid #2e7d32' }}>
                                                <TableCell colSpan={2}><strong>Total Tea</strong></TableCell>
                                                <TableCell align="center"><strong>{Object.values(categorizedSummary.Tea).reduce((acc: number, curr: any) => acc + curr.count, 0)}</strong></TableCell>
                                            </TableRow>
                                        )}

                                        {/* Rubber Section */}
                                        {Object.entries(categorizedSummary.Rubber).map(([task, data]: any) => (
                                            <div key={task} style={{ display: 'contents' }}>
                                                {Object.entries(data.fields).map(([field, count]: any, idx) => (
                                                    <TableRow key={`${task}-${field}`}>
                                                        {idx === 0 && (
                                                            <TableCell rowSpan={Object.keys(data.fields).length} sx={{ verticalAlign: 'top', fontWeight: 'bold' }}>{task}</TableCell>
                                                        )}
                                                        <TableCell>{field}</TableCell>
                                                        <TableCell align="center">{count}</TableCell>
                                                    </TableRow>
                                                ))}
                                                {task === 'Tapping' && (
                                                    <TableRow sx={{ bgcolor: '#a5d6a7' }}>
                                                        <TableCell colSpan={2}><strong>Total Tappers</strong></TableCell>
                                                        <TableCell align="center"><strong>{data.count}</strong></TableCell>
                                                    </TableRow>
                                                )}
                                            </div>
                                        ))}
                                        {Object.keys(categorizedSummary.Rubber).length > 0 && (
                                            <TableRow sx={{ bgcolor: '#81c784', borderTop: '2px solid #2e7d32' }}>
                                                <TableCell colSpan={2}><strong>Total Rubber</strong></TableCell>
                                                <TableCell align="center"><strong>{Object.values(categorizedSummary.Rubber).reduce((acc: number, curr: any) => acc + curr.count, 0)}</strong></TableCell>
                                            </TableRow>
                                        )}

                                        {/* General Section */}
                                        {Object.entries(categorizedSummary.General).map(([task, data]: any) => (
                                            <div key={task} style={{ display: 'contents' }}>
                                                {Object.entries(data.fields).map(([field, count]: any, idx) => (
                                                    <TableRow key={`${task}-${field}`}>
                                                        {idx === 0 && (
                                                            <TableCell rowSpan={Object.keys(data.fields).length} sx={{ verticalAlign: 'top', fontWeight: 'bold' }}>{task}</TableCell>
                                                        )}
                                                        <TableCell>{field}</TableCell>
                                                        <TableCell align="center">{count}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </div>
                                        ))}
                                        {Object.keys(categorizedSummary.General).length > 0 && (
                                            <TableRow sx={{ bgcolor: '#81c784', borderTop: '2px solid #2e7d32' }}>
                                                <TableCell colSpan={2}><strong>Total General</strong></TableCell>
                                                <TableCell align="center"><strong>{Object.values(categorizedSummary.General).reduce((acc: number, curr: any) => acc + curr.count, 0)}</strong></TableCell>
                                            </TableRow>
                                        )}

                                        <TableRow sx={{ bgcolor: '#dcdcdc', borderTop: '3px double #000' }}>
                                            <TableCell colSpan={2}><strong>Grand Total of workers</strong></TableCell>
                                            <TableCell align="center"><strong>{grandWorkerTotal}</strong></TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </Box>
                        </Paper>
                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            onClick={handleSubmit}
                            disabled={isSubmitted}
                            sx={{
                                mt: 3,
                                borderRadius: '30px',
                                background: isSubmitted ? '#e0e0e0' : 'linear-gradient(45deg, #d32f2f 30%, #c62828 90%)',
                                boxShadow: isSubmitted ? 'none' : '0 3px 5px 2px rgba(211, 47, 47, .3)',
                                fontWeight: 'bold',
                                fontSize: '1.1rem',
                                '&:hover': {
                                    background: isSubmitted ? '#e0e0e0' : 'linear-gradient(45deg, #b71c1c 30%, #c62828 90%)',
                                    transform: isSubmitted ? 'none' : 'scale(1.02)'
                                },
                                transition: 'all 0.3s ease-in-out'
                            }}
                        >
                            {isSubmitted ? 'Submitted' : 'Submit Muster'}
                        </Button>
                    </Box>

                    {/* Detailed List */}
                    <Box flex={2}>
                        {Object.entries(grouped).map(([task, items]: any) => (
                            <TaskSection key={task} task={task} items={items} onUpdate={handleUpdate} isSubmitted={isSubmitted} />
                        ))}
                    </Box>
                </Box>
            )}
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
        </Box>
    );
}

// --- Task Section Component ---
function TaskSection({ task, items, onUpdate, isSubmitted, hideOutput = false }: { task: string, items: any[], onUpdate: any, isSubmitted: boolean, hideOutput?: boolean }) {
    const [fieldWeight, setFieldWeight] = useState('');
    const [factoryWeight, setFactoryWeight] = useState('');

    // Unique Fields for this task
    const uniqueFields = Array.from(new Set(items.map((i: any) => i.fieldName)));

    // Common Input Style
    const inputStyle = {
        width: 50, // Smaller width
        padding: '2px 4px',
        border: '1px solid #cfd8dc',
        borderRadius: 4,
        textAlign: 'center' as const,
        fontSize: '0.8rem', // Smaller font
        fontWeight: 'bold',
        outline: 'none',
        transition: 'border-color 0.2s',
        pointerEvents: isSubmitted ? 'none' as const : 'auto' as const,
    };

    return (
        <Paper elevation={0} variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', borderColor: '#e0e0e0' }}>
            {/* Header */}
            <Box bgcolor="#f9fbe7" borderBottom="1px solid #c5e1a5" p={1} display="flex" alignItems="center" gap={2} flexWrap="wrap">
                <Typography variant="subtitle2" fontWeight="bold" color="#2e7d32" sx={{ minWidth: 120 }}>{task}</Typography>

                {/* Harvest Inputs in Header - Hide if hideOutput is true */}
                {!hideOutput && ['Plucking', 'Harvest'].some(t => task.includes(t)) && (
                    <Box display="flex" gap={1}>
                        <Box display="flex" alignItems="center" bgcolor="white" px={1} py={0.5} borderRadius={1} border="1px solid #b0bec5">
                            <Typography variant="caption" fontWeight="600" mr={0.5} color="#546e7a">Field Wt</Typography>
                            <input
                                type="number"
                                min="0"
                                style={inputStyle}
                                placeholder="0"
                                value={fieldWeight}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || Number(val) >= 0) setFieldWeight(val);
                                }}
                                disabled={isSubmitted}
                            />
                        </Box>
                        <Box display="flex" alignItems="center" bgcolor="white" px={1} py={0.5} borderRadius={1} border="1px solid #b0bec5">
                            <Typography variant="caption" fontWeight="600" mr={0.5} color="#546e7a">Factory Wt</Typography>
                            <input
                                type="number"
                                min="0"
                                style={inputStyle}
                                placeholder="0"
                                value={factoryWeight}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || Number(val) >= 0) setFactoryWeight(val);
                                }}
                                disabled={isSubmitted}
                            />
                        </Box>
                    </Box>
                )}

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
            </Box>

            <Box p={0.5} display="flex" flexDirection="column" gap={0.5}>
                {items.map((item: any, index: number) => (
                    <Box key={item.id}
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        p={0.5}
                        borderRadius={1}
                        sx={{
                            bgcolor: index % 2 === 0 ? '#fafafa' : 'white',
                            border: '1px solid #eee',
                            '&:hover': { bgcolor: '#f1f8e9', borderColor: '#c5e1a5' },
                            transition: 'all 0.2s',
                        }}
                    >
                        {/* Worker Info */}
                        <Box display="flex" alignItems="center" gap={1} flex={1} minWidth={0}>
                            <Avatar sx={{ bgcolor: '#333', width: 24, height: 24 }}><PersonIcon sx={{ fontSize: 16 }} /></Avatar>
                            <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                                <Typography variant="caption" fontWeight="600" noWrap lineHeight={1.2} color="#333" display="block">{item.workerName}</Typography>
                                <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ fontSize: '0.65rem' }}>{item.fieldName}</Typography>
                            </Box>
                        </Box>

                        {/* Right Side: Inputs & Actions */}
                        <Box display="flex" alignItems="center" gap={1}>
                            {!hideOutput && ['Plucking', 'Tapping'].some(t => item.workType.includes(t)) && (
                                <Box display="flex" alignItems="center" gap={0.5}>
                                    {/* AM Input */}
                                    <Box display="flex" flexDirection="column" alignItems="center">
                                        <Typography variant="caption" color="#546e7a" fontWeight="bold" fontSize="0.6rem">AM</Typography>
                                        <input
                                            type="number"
                                            min="0"
                                            onKeyDown={(e) => e.key === '-' && e.preventDefault()}
                                            style={{ ...inputStyle, width: 50, borderColor: '#a5d6a7' }}
                                            value={item.amWeight}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '' || Number(val) >= 0) onUpdate(item.id, 'amWeight', val);
                                            }}
                                            disabled={isSubmitted}
                                        />
                                    </Box>
                                    {/* PM Input */}
                                    <Box display="flex" flexDirection="column" alignItems="center">
                                        <Typography variant="caption" color="#546e7a" fontWeight="bold" fontSize="0.6rem">PM</Typography>
                                        <input
                                            type="number"
                                            min="0"
                                            onKeyDown={(e) => e.key === '-' && e.preventDefault()}
                                            style={{ ...inputStyle, width: 50, borderColor: '#a5d6a7' }}
                                            value={item.pmWeight}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '' || Number(val) >= 0) onUpdate(item.id, 'pmWeight', val);
                                            }}
                                            disabled={isSubmitted}
                                        />
                                    </Box>
                                    {/* Total Badge */}
                                    <Box display="flex" flexDirection="column" alignItems="center">
                                        <Typography variant="caption" color="#546e7a" fontWeight="bold" fontSize="0.6rem">Tot</Typography>
                                        <Box bgcolor="#2e7d32" color="white" borderRadius={1} width={40} height={22} display="flex" alignItems="center" justifyContent="center">
                                            <Typography variant="caption" fontWeight="bold">
                                                {((Number(item.amWeight) || 0) + (Number(item.pmWeight) || 0)).toFixed(0)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            )}

                            {/* Actions - Blue Box (Attendance) - Should usually be visible in both, but if hideOutput means pure assignment plan, maybe keep? 
                                User wants Morning to reflect "Divisional View" (assignments). 
                                Attendance is part of the morning routine. Weights are evening.
                            {/* Status Display (Review Mode) or Actions (Entry Mode) */}
                            {isSubmitted ? (
                                <Box display="flex" alignItems="center" justifyContent="flex-end" minWidth={80}>
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
                                </Box>
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
            </Box>
        </Paper>
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
                        <div key={task} style={{ display: 'contents' }}>
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
                        </div>
                    ))}
                    {Object.keys(summary.Tea).length > 0 && (
                        <TableRow sx={{ bgcolor: '#81c784', borderTop: '2px solid #2e7d32' }}>
                            <TableCell colSpan={2}><strong>Total Tea</strong></TableCell>
                            <TableCell align="center"><strong>{Object.values(summary.Tea).reduce((acc: number, curr: any) => acc + curr.count, 0)}</strong></TableCell>
                        </TableRow>
                    )}

                    {/* Rubber Section */}
                    {Object.entries(summary.Rubber).map(([task, val]: any) => (
                        <div key={task} style={{ display: 'contents' }}>
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
                        </div>
                    ))}
                    {Object.keys(summary.Rubber).length > 0 && (
                        <TableRow sx={{ bgcolor: '#81c784', borderTop: '2px solid #2e7d32' }}>
                            <TableCell colSpan={2}><strong>Total Rubber</strong></TableCell>
                            <TableCell align="center"><strong>{Object.values(summary.Rubber).reduce((acc: number, curr: any) => acc + curr.count, 0)}</strong></TableCell>
                        </TableRow>
                    )}

                    {/* General Section */}
                    {Object.entries(summary.General).map(([task, val]: any) => (
                        <div key={task} style={{ display: 'contents' }}>
                            {Object.entries(val.fields).map(([field, count]: any, idx) => (
                                <TableRow key={`${task}-${field}`}>
                                    {idx === 0 && (
                                        <TableCell rowSpan={Object.keys(val.fields).length} sx={{ verticalAlign: 'top', fontWeight: 'bold' }}>{task}</TableCell>
                                    )}
                                    <TableCell>{field}</TableCell>
                                    <TableCell align="center">{count}</TableCell>
                                </TableRow>
                            ))}
                        </div>
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
                const dwRes = await axios.get(`/api/tenants/daily-work?tenantId=${tenantId}`);
                const morningMusters = dwRes.data.filter((dw: any) => dw.workType === 'Morning Muster');

                // Fetch Attendance
                const attRes = await axios.get(`/api/tenants/attendance?tenantId=${tenantId}`);

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
                        const f = fRes.data.find((field: any) => field.name === rec.fieldName);
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
                    musterAtt.forEach((item: any) => {
                        if (item.status === 'PRESENT' || item.status === 'HALF_DAY' || item.status === 'COMPLETED') {
                            attended++;
                            totalWeight += (Number(item.amWeight) || 0) + (Number(item.pmWeight) || 0);
                        }
                    });

                    return {
                        id: mm.workId, // Correct field from backend (DailyWork entity)
                        date: date,
                        divisionId: divId,
                        divisionName: divMap.get(divId) || 'Unknown',
                        submittedAt: mm.createdAt,
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
                                        {row.submittedAt ? new Date(row.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
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
                                    label="Evening Muster Chit"
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
                                        onUpdate={() => { }}
                                        isSubmitted={true}
                                        hideOutput={false}
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
