import { Box, Typography, Button, Paper, Tabs, Tab, Table, TableBody, TableCell, TableHead, TableRow, Chip, IconButton, MenuItem, Select, FormControl, InputLabel, Avatar, Card, CardContent, CircularProgress, Alert, Snackbar, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Check as CheckIcon,
    Close as CloseIcon,
    Block as BlockIcon,
    Person as PersonIcon,
    History as HistoryIcon,
    EditCalendar as EditStartIcon
} from '@mui/icons-material';

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
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Dunwatta Estate • {today}</Typography>
                <Box display="flex" gap={2}>
                    <FormControl size="small" sx={{ minWidth: 200, bgcolor: 'white' }}>
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
                    <Box flex={1.2} minWidth={350}>
                        <Paper elevation={3} sx={{ overflow: 'hidden', borderRadius: 2 }}>
                            <Box bgcolor="#e0e0e0" p={1} borderBottom="1px solid #ccc">
                                <Typography variant="h6" align="center" fontWeight="bold">Muster Chit</Typography>
                            </Box>
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
                        </Paper>
                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            onClick={handleSubmit}
                            sx={{
                                mt: 3,
                                borderRadius: '30px',
                                background: 'linear-gradient(45deg, #d32f2f 30%, #c62828 90%)',
                                boxShadow: '0 3px 5px 2px rgba(211, 47, 47, .3)',
                                fontWeight: 'bold',
                                fontSize: '1.1rem',
                                '&:hover': {
                                    background: 'linear-gradient(45deg, #b71c1c 30%, #c62828 90%)',
                                    transform: 'scale(1.02)'
                                },
                                transition: 'all 0.3s ease-in-out'
                            }}
                        >
                            Submit Muster
                        </Button>
                    </Box>

                    {/* Detailed List */}
                    <Box flex={2}>
                        {Object.entries(grouped).map(([task, items]: any) => (
                            <TaskSection key={task} task={task} items={items} onUpdate={handleUpdate} />
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
                        minWidth: 350,
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
function TaskSection({ task, items, onUpdate }: { task: string, items: any[], onUpdate: any }) {
    const [fieldWeight, setFieldWeight] = useState('');
    const [factoryWeight, setFactoryWeight] = useState('');

    // Unique Fields for this task
    const uniqueFields = Array.from(new Set(items.map((i: any) => i.fieldName)));

    // Common Input Style
    const inputStyle = {
        width: 60,
        padding: '4px 8px',
        border: '1px solid #cfd8dc',
        borderRadius: 4,
        textAlign: 'center' as const,
        fontSize: '0.9rem',
        fontWeight: 'bold',
        outline: 'none',
        transition: 'border-color 0.2s',
    };

    return (
        <Paper elevation={0} variant="outlined" sx={{ mb: 3, borderRadius: 2, overflow: 'hidden', borderColor: '#e0e0e0' }}>
            {/* Header */}
            <Box bgcolor="#f9fbe7" borderBottom="1px solid #c5e1a5" p={2} display="flex" alignItems="center" gap={3} flexWrap="wrap">
                <Typography variant="h6" fontWeight="bold" color="#2e7d32" sx={{ minWidth: 150 }}>{task}</Typography>

                {/* Harvest Inputs in Header - Professional Outlined Look */}
                {['Plucking', 'Harvest'].some(t => task.includes(t)) && (
                    <Box display="flex" gap={2}>
                        <Box display="flex" alignItems="center" bgcolor="white" px={1.5} py={0.5} borderRadius={1} border="1px solid #b0bec5">
                            <Typography variant="body2" fontWeight="600" mr={1} color="#546e7a">Field Weight</Typography>
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
                            />
                        </Box>
                        <Box display="flex" alignItems="center" bgcolor="white" px={1.5} py={0.5} borderRadius={1} border="1px solid #b0bec5">
                            <Typography variant="body2" fontWeight="600" mr={1} color="#546e7a">Factory Weight</Typography>
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
                            />
                        </Box>
                    </Box>
                )}

                {/* Summary Card */}
                <Card elevation={0} sx={{ ml: 'auto', bgcolor: 'white', border: '1px solid #c5e1a5', px: 2, py: 1, minWidth: 180 }}>
                    {uniqueFields.map((f: any) => (
                        <Box key={f} mb={1}>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                                <Typography variant="caption" fontWeight="bold" color="#33691e">{f}</Typography>
                                <Box display="flex" alignItems="center" gap={0.5}>
                                    <input
                                        type="number"
                                        min="0"
                                        style={{ ...inputStyle, width: 45, height: 24, padding: '2px' }}
                                        onKeyDown={(e) => e.key === '-' && e.preventDefault()}
                                    />
                                    <Typography variant="caption" color="#33691e" fontWeight="bold">Ac</Typography>
                                </Box>
                            </Box>
                            {task.toLowerCase().includes('chemical') && (
                                <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                                    <Typography variant="caption" fontWeight="bold" color="#33691e">Chem. Qty</Typography>
                                    <input
                                        type="number"
                                        min="0"
                                        style={{ ...inputStyle, width: 45, height: 24, padding: '2px' }}
                                        onKeyDown={(e) => e.key === '-' && e.preventDefault()}
                                    />
                                </Box>
                            )}
                        </Box>
                    ))}
                </Card>
            </Box>

            <Box p={1} display="flex" flexDirection="column" gap={0.5}>
                {items.map((item: any, index: number) => (
                    <Box key={item.id}
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        p={0.75}
                        borderRadius={1}
                        sx={{
                            bgcolor: index % 2 === 0 ? '#fafafa' : 'white',
                            border: '1px solid #eee',
                            '&:hover': { bgcolor: '#f1f8e9', borderColor: '#c5e1a5' },
                            transition: 'all 0.2s'
                        }}
                    >
                        {/* Worker Info */}
                        <Box display="flex" alignItems="center" gap={1.5} flex={1} minWidth={0}>
                            <Avatar sx={{ bgcolor: '#333', width: 28, height: 28 }}><PersonIcon sx={{ fontSize: 18 }} /></Avatar>
                            <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                                <Typography variant="body2" fontWeight="600" noWrap lineHeight={1.2} color="#333">{item.workerName}</Typography>
                                <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ fontSize: '0.65rem' }}>{item.fieldName}</Typography>
                            </Box>
                        </Box>

                        {/* Right Side: Inputs & Actions */}
                        <Box display="flex" alignItems="center" gap={2}>
                            {['Plucking', 'Tapping'].some(t => item.workType.includes(t)) && (
                                <Box display="flex" alignItems="center" gap={1}>
                                    {/* AM Input */}
                                    <Box display="flex" flexDirection="column" alignItems="center">
                                        <Typography variant="caption" color="#546e7a" fontWeight="bold" fontSize="0.7rem">AM</Typography>
                                        <input
                                            type="number"
                                            min="0"
                                            onKeyDown={(e) => e.key === '-' && e.preventDefault()}
                                            style={{ ...inputStyle, width: 70, borderColor: '#a5d6a7' }}
                                            value={item.amWeight}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '' || Number(val) >= 0) onUpdate(item.id, 'amWeight', val);
                                            }}
                                        />
                                    </Box>
                                    {/* PM Input */}
                                    <Box display="flex" flexDirection="column" alignItems="center">
                                        <Typography variant="caption" color="#546e7a" fontWeight="bold" fontSize="0.7rem">PM</Typography>
                                        <input
                                            type="number"
                                            min="0"
                                            onKeyDown={(e) => e.key === '-' && e.preventDefault()}
                                            style={{ ...inputStyle, width: 70, borderColor: '#a5d6a7' }}
                                            value={item.pmWeight}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '' || Number(val) >= 0) onUpdate(item.id, 'pmWeight', val);
                                            }}
                                        />
                                    </Box>
                                    {/* Total Badge */}
                                    <Box display="flex" flexDirection="column" alignItems="center">
                                        <Typography variant="caption" color="#546e7a" fontWeight="bold" fontSize="0.7rem">Total</Typography>
                                        <Box bgcolor="#2e7d32" color="white" borderRadius={1} width={60} height={27} display="flex" alignItems="center" justifyContent="center">
                                            <Typography variant="body2" fontWeight="bold">
                                                {((Number(item.amWeight) || 0) + (Number(item.pmWeight) || 0)).toFixed(0)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            )}

                            {/* Actions - Blue Box */}
                            <Box display="flex" gap={1} bgcolor="#1565c0" p={0.75} borderRadius={3} boxShadow={3}>
                                <Tooltip title="Mark Half Day">
                                    <IconButton
                                        onClick={() => onUpdate(item.id, 'status', 'HALF_DAY')}
                                        size="small"
                                        sx={{
                                            bgcolor: item.status === 'HALF_DAY' ? '#ffd600' : 'white', // Bright Yellow
                                            border: item.status === 'HALF_DAY' ? '2px solid #ffea00' : '2px solid transparent',
                                            color: item.status === 'HALF_DAY' ? '#000' : '#cfd8dc',
                                            transition: 'all 0.2s',
                                            '&:hover': { bgcolor: '#ffea00', transform: 'scale(1.1)', color: '#000' }
                                        }}>
                                        <BlockIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Mark Present">
                                    <IconButton
                                        onClick={() => onUpdate(item.id, 'status', 'PRESENT')}
                                        size="small"
                                        sx={{
                                            bgcolor: item.status === 'PRESENT' ? '#00e676' : 'white', // Bright Green
                                            border: item.status === 'PRESENT' ? '2px solid #00c853' : '2px solid transparent',
                                            color: item.status === 'PRESENT' ? '#000' : '#cfd8dc',
                                            transition: 'all 0.2s',
                                            '&:hover': { bgcolor: '#00c853', transform: 'scale(1.1)', color: '#000' }
                                        }}>
                                        <CheckIcon fontSize="small" sx={{ fontWeight: 'bold' }} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Mark Absent">
                                    <IconButton
                                        onClick={() => onUpdate(item.id, 'status', 'ABSENT')}
                                        size="small"
                                        sx={{
                                            bgcolor: item.status === 'ABSENT' ? '#ff3d00' : 'white', // Bright Red/Orange
                                            border: item.status === 'ABSENT' ? '2px solid #dd2c00' : '2px solid transparent',
                                            color: item.status === 'ABSENT' ? '#fff' : '#cfd8dc',
                                            transition: 'all 0.2s',
                                            '&:hover': { bgcolor: '#ff3d00', transform: 'scale(1.1)', color: '#fff' }
                                        }}>
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Box>
                    </Box>
                ))}
            </Box>
        </Paper>
    );
}

// --- Tab 2: History (Past Musters) ---
function HistoryTab() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            // In a real app, use a summary endpoint. 
            // Here, we fetch ALL attendance for the tenant and group by date client-side.
            // This works for small datasets but should be paginated in production.
            try {
                const res = await axios.get(`/api/tenants/attendance?tenantId=${tenantId}`);
                // Group by Date
                const grouped = res.data.reduce((acc: any, item: any) => {
                    const date = item.workDate;
                    if (!acc[date]) acc[date] = { date, count: 0, totalWeight: 0, types: new Set() };
                    acc[date].count++;
                    acc[date].totalWeight += (item.amWeight || 0) + (item.pmWeight || 0);
                    acc[date].types.add(item.workType);
                    return acc;
                }, {});

                setHistory(Object.values(grouped).sort((a: any, b: any) => b.date.localeCompare(a.date)));
            } catch (e) {
                console.error("History fetch failed", e);
            }
            setLoading(false);
        };
        fetchHistory();
    }, [tenantId]);

    if (loading) return <CircularProgress />;

    return (
        <Box>
            <Typography variant="h6" gutterBottom>Past Muster Log</Typography>
            <Table>
                <TableHead>
                    <TableRow sx={{ bgcolor: '#eee' }}>
                        <TableCell>Date</TableCell>
                        <TableCell>Tasks Performed</TableCell>
                        <TableCell align="right">Workers Attended</TableCell>
                        <TableCell align="right">Total Harvest (Kg)</TableCell>
                        <TableCell align="center">Status</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {history.map((row: any) => (
                        <TableRow key={row.date} hover>
                            <TableCell>{row.date}</TableCell>
                            <TableCell>{Array.from(row.types).join(', ')}</TableCell>
                            <TableCell align="right">{row.count}</TableCell>
                            <TableCell align="right">{row.totalWeight.toFixed(1)}</TableCell>
                            <TableCell align="center"><Chip label="Completed" color="success" size="small" /></TableCell>
                        </TableRow>
                    ))}
                    {history.length === 0 && <TableRow><TableCell colSpan={5} align="center">No History Found</TableCell></TableRow>}
                </TableBody>
            </Table>
        </Box>
    );
}
