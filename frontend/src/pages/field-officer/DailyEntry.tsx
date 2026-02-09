import { Box, Typography, Button, Paper, Tabs, Tab, Table, TableBody, TableCell, TableHead, TableRow, Chip, IconButton, MenuItem, Select, FormControl, InputLabel, Avatar, Card, CardContent, CircularProgress, Alert, Snackbar } from '@mui/material';
import { useState, useEffect } from 'react';
import axios from 'axios';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import PersonIcon from '@mui/icons-material/Person';
import HistoryIcon from '@mui/icons-material/History';
import EditStartIcon from '@mui/icons-material/Editcalendar';

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
                <Typography variant="h5" fontWeight="bold" gutterBottom color="primary">
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
    const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    useEffect(() => {
        if (tenantId) fetchInitialData();
    }, [tenantId]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // Fetch Workers
            const wRes = await axios.get(`http://localhost:8080/api/workers?tenantId=${tenantId}`);
            const wMap = new Map<string, string>();
            wRes.data.forEach((w: any) => {
                if (w.workerId) wMap.set(w.workerId, w.name);
                wMap.set(w.id, w.name);
            });

            // Fetch All Divisions (for Name mapping)
            const allDivRes = await axios.get(`http://localhost:8080/api/divisions?tenantId=${tenantId}`);
            const divNameMap = new Map<string, string>();
            allDivRes.data.forEach((d: any) => divNameMap.set(d.divisionId, d.name));

            // Fetch Today's Daily Work (Mappings)
            const dwRes = await axios.get(`http://localhost:8080/api/tenants/daily-work?tenantId=${tenantId}&date=${today}`);
            const dwMap = new Map<string, string>();
            dwRes.data.forEach((dw: any) => dwMap.set(dw.workId, dw.divisionId));

            // Fetch Today's Attendance
            const attRes = await axios.get(`http://localhost:8080/api/tenants/attendance?tenantId=${tenantId}&date=${today}`);

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

    const handleSubmit = async () => {
        if (!window.confirm("Confirm submission?")) return;
        try {
            const updates = attendanceData.filter(item => item.divisionId === selectedDivision).map(item => ({
                id: item.id,
                am: Number(item.amWeight) || null,
                pm: Number(item.pmWeight) || null,
                status: item.status
            }));
            await axios.post(`http://localhost:8080/api/tenants/attendance/bulk`, updates);
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
                                        <TableCell><strong>Work Item</strong></TableCell>
                                        <TableCell><strong>Field</strong></TableCell>
                                        <TableCell align="center"><strong>Cnt</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {Object.entries(grouped).map(([task, items]: any) => (
                                        <>
                                            <TableRow key={task} sx={{ bgcolor: '#ecf0f1' }}><TableCell colSpan={3}><strong>{task}</strong></TableCell></TableRow>
                                            {Object.entries(items.reduce((acc: any, i: any) => { if (!acc[i.fieldName]) acc[i.fieldName] = 0; acc[i.fieldName]++; return acc; }, {})).map(([field, count]: any) => (
                                                <TableRow key={`${task}-${field}`}>
                                                    <TableCell sx={{ pl: 4 }}>{task}</TableCell>
                                                    <TableCell>{field}</TableCell>
                                                    <TableCell align="center">{count}</TableCell>
                                                </TableRow>
                                            ))}
                                        </>
                                    ))}
                                    <TableRow sx={{ bgcolor: '#dcdcdc' }}>
                                        <TableCell colSpan={2}><strong>Total</strong></TableCell>
                                        <TableCell align="center"><strong>{filteredData.length}</strong></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </Paper>
                        <Button fullWidth variant="contained" color="success" size="large" sx={{ mt: 3, borderRadius: 20 }} onClick={handleSubmit}>Submit Muster</Button>
                    </Box>

                    {/* Detailed List */}
                    <Box flex={2}>
                        {Object.entries(grouped).map(([task, items]: any) => (
                            <Paper key={task} elevation={2} sx={{ mb: 3, overflow: 'hidden', borderRadius: 2 }}>
                                <Box bgcolor="#cfd8dc" p={1.5} display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="h6" fontWeight="bold">{task}</Typography>
                                    <Chip label={items.length} color="error" size="small" />
                                </Box>
                                <Box p={2} display="flex" flexDirection="column" gap={2}>
                                    {items.map((item: AttendanceRecord) => (
                                        <Box key={item.id} display="flex" alignItems="center" justifyContent="space-between" p={0.5} borderBottom="1px solid #eee">
                                            <Box display="flex" alignItems="center" gap={1} flex={1}>
                                                <Avatar sx={{ bgcolor: 'black', width: 28, height: 28 }}><PersonIcon sx={{ fontSize: 18 }} /></Avatar>
                                                <Box>
                                                    <Typography variant="body2" fontWeight="bold">{item.workerName}</Typography>
                                                    <Typography variant="caption" color="text.secondary" fontSize="0.7rem">Field: {item.fieldName}</Typography>
                                                </Box>
                                            </Box>
                                            {['Plucking', 'Tapping'].some(t => item.workType.includes(t)) && (
                                                <Box display="flex" alignItems="center" gap={1} bgcolor="#ebebeb" px={1} py={0.5} borderRadius={4}>
                                                    <Typography variant="caption" fontSize="0.7rem">AM</Typography>
                                                    <input type="number" style={{ width: 35, borderRadius: 8, border: '1px solid #ccc', padding: '2px', textAlign: 'center', fontSize: '0.8rem' }} value={item.amWeight} onChange={(e) => handleUpdate(item.id, 'amWeight', e.target.value)} />
                                                    <Typography variant="caption" fontSize="0.7rem">PM</Typography>
                                                    <input type="number" style={{ width: 35, borderRadius: 8, border: '1px solid #ccc', padding: '2px', textAlign: 'center', fontSize: '0.8rem' }} value={item.pmWeight} onChange={(e) => handleUpdate(item.id, 'pmWeight', e.target.value)} />
                                                    <Avatar sx={{ bgcolor: '#b0bec5', width: 22, height: 22, fontSize: '0.65rem' }}>{((Number(item.amWeight) || 0) + (Number(item.pmWeight) || 0)).toFixed(0)}</Avatar>
                                                </Box>
                                            )}
                                            <Box display="flex" gap={0.5} ml={1}>
                                                <IconButton size="small" onClick={() => handleUpdate(item.id, 'status', 'HALF_DAY')} sx={{ color: item.status === 'HALF_DAY' ? '#ff9800' : '#e0e0e0', p: 0.5 }}><RemoveCircleIcon fontSize="small" /></IconButton>
                                                <IconButton size="small" onClick={() => handleUpdate(item.id, 'status', 'PRESENT')} sx={{ color: item.status === 'PRESENT' ? '#4caf50' : '#e0e0e0', p: 0.5 }}><CheckCircleIcon fontSize="small" /></IconButton>
                                                <IconButton size="small" onClick={() => handleUpdate(item.id, 'status', 'ABSENT')} sx={{ color: item.status === 'ABSENT' ? '#f44336' : '#e0e0e0', p: 0.5 }}><CancelIcon fontSize="small" /></IconButton>
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            </Paper>
                        ))}
                    </Box>
                </Box>
            )}
            <Snackbar open={notification.open} autoHideDuration={4000} onClose={() => setNotification({ ...notification, open: false })}>
                <Alert severity={notification.severity}>{notification.message}</Alert>
            </Snackbar>
        </Box>
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
                const res = await axios.get(`http://localhost:8080/api/tenants/attendance?tenantId=${tenantId}`);
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
