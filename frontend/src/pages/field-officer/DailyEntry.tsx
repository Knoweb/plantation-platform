import { Box, Typography, Button, Paper, Tabs, Tab, Table, TableBody, TableCell, TableHead, TableRow, Chip, IconButton, MenuItem, Select, FormControl, InputLabel, Avatar, Card, CardContent, CircularProgress, Alert, Snackbar, Tooltip } from '@mui/material';
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
            const wRes = await axios.get(`http://localhost:8080/api/workers?tenantId=${tenantId}`);
            const wMap = new Map<string, string>();
            wRes.data.forEach((w: any) => {
                if (w.workerId) wMap.set(w.workerId, w.name);
                wMap.set(w.id, w.name);
            });

            // Fetch Fields
            const fRes = await axios.get(`http://localhost:8080/api/fields?tenantId=${tenantId}`);
            setFields(fRes.data);

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
                        <Button fullWidth variant="contained" color="success" size="large" sx={{ mt: 3, borderRadius: 20 }} onClick={handleSubmit}>Submit Muster</Button>
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
        </Box>
    );
}

// --- Task Section Component ---
function TaskSection({ task, items, onUpdate }: { task: string, items: any[], onUpdate: any }) {
    const [fieldWeight, setFieldWeight] = useState('');
    const [factoryWeight, setFactoryWeight] = useState('');

    // Unique Fields for this task
    const uniqueFields = Array.from(new Set(items.map((i: any) => i.fieldName)));

    return (
        <Paper elevation={2} sx={{ mb: 3, overflow: 'visible', borderRadius: 2, position: 'relative' }}>
            {/* Header - Plantation Green Theme */}
            <Box bgcolor="#e8f5e9" borderBottom="2px solid #2e7d32" p={1.5} display="flex" alignItems="center" gap={2} flexWrap="wrap">
                <Typography variant="h6" fontWeight="bold" color="#1b5e20" sx={{ minWidth: 150 }}>{task}</Typography>
                {/* Harvest Inputs in Header */}
                {['Plucking', 'Harvest'].some(t => task.includes(t)) && (
                    <>
                        <Box display="flex" alignItems="center" bgcolor="#a5d6a7" px={1.5} py={0.5} borderRadius={1} border="1px solid #388e3c">
                            <Typography variant="body2" fontWeight="bold" mr={1} color="#1b5e20">Field Weight</Typography>
                            <input
                                style={{ width: 70, padding: 5, border: '1px solid #81c784', borderRadius: 4, textAlign: 'center' }}
                                placeholder="0"
                                value={fieldWeight}
                                onChange={(e) => setFieldWeight(e.target.value)}
                            />
                        </Box>
                        <Box display="flex" alignItems="center" bgcolor="#a5d6a7" px={1.5} py={0.5} borderRadius={1} border="1px solid #388e3c">
                            <Typography variant="body2" fontWeight="bold" mr={1} color="#1b5e20">Factory Weight</Typography>
                            <input
                                style={{ width: 70, padding: 5, border: '1px solid #81c784', borderRadius: 4, textAlign: 'center' }}
                                placeholder="0"
                                value={factoryWeight}
                                onChange={(e) => setFactoryWeight(e.target.value)}
                            />
                        </Box>
                    </>
                )}

                {/* Green Box Summary (Floating) */}
                <Card sx={{ ml: 'auto', bgcolor: '#c8e6c9', p: 1, minWidth: 160, border: '1px solid #388e3c', boxShadow: 3 }}>
                    {uniqueFields.map((f: any) => (
                        <Box key={f} display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                            <Typography variant="caption" fontWeight="bold" color="#1b5e20">{f} - </Typography>
                            <Box display="flex" alignItems="center">
                                <input style={{ width: 45, padding: 2, height: 22, border: '1px solid #81c784' }} />
                                <Typography variant="caption" ml={0.5} color="#1b5e20" fontWeight="bold">Ac</Typography>
                            </Box>
                        </Box>
                    ))}
                </Card>
            </Box>

            <Box p={2} display="flex" flexDirection="column" gap={2}>
                {items.map((item: any) => (
                    <Box key={item.id} display="flex" alignItems="center" justifyContent="space-between" p={1} borderBottom="1px solid #eee">
                        <Box display="flex" alignItems="center" gap={1} flex={1}>
                            <Avatar sx={{ bgcolor: 'black', width: 45, height: 45 }}><PersonIcon sx={{ fontSize: 28 }} /></Avatar>
                            <Box>
                                <Typography variant="subtitle1" fontWeight="bold" sx={{ fontSize: '1.25rem' }}>{item.workerName}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '1rem' }}>Field: {item.fieldName}</Typography>
                            </Box>
                        </Box>
                        {['Plucking', 'Tapping'].some(t => item.workType.includes(t)) && (
                            <Box display="flex" alignItems="center" gap={2} mr={3}>
                                {/* AM Box - Plantation Green */}
                                <Box bgcolor="#2e7d32" p={0.5} borderRadius={2} display="flex" alignItems="center" boxShadow={2} width={110} justifyContent="space-between" px={1}>
                                    <Typography variant="body2" color="white" fontWeight="bold" sx={{ fontSize: '1.1rem' }}>AM</Typography>
                                    <input
                                        type="number"
                                        style={{ width: 60, height: 35, borderRadius: 4, border: 'none', padding: '0 5px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}
                                        value={item.amWeight}
                                        onChange={(e) => onUpdate(item.id, 'amWeight', e.target.value)}
                                    />
                                </Box>
                                {/* PM Box - Plantation Green */}
                                <Box bgcolor="#2e7d32" p={0.5} borderRadius={2} display="flex" alignItems="center" boxShadow={2} width={110} justifyContent="space-between" px={1}>
                                    <Typography variant="body2" color="white" fontWeight="bold" sx={{ fontSize: '1.1rem' }}>PM</Typography>
                                    <input
                                        type="number"
                                        style={{ width: 60, height: 35, borderRadius: 4, border: 'none', padding: '0 5px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}
                                        value={item.pmWeight}
                                        onChange={(e) => onUpdate(item.id, 'pmWeight', e.target.value)}
                                    />
                                </Box>
                                {/* Total Box - Square Badge */}
                                <Box bgcolor="#1b5e20" color="white" borderRadius={2} width={50} height={45} display="flex" alignItems="center" justifyContent="center" boxShadow={2}>
                                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1.3rem' }}>
                                        {((Number(item.amWeight) || 0) + (Number(item.pmWeight) || 0)).toFixed(0)}
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                        <Box display="flex" gap={1} ml={1}>
                            <Tooltip title="Mark Half Day">
                                <IconButton size="small" onClick={() => onUpdate(item.id, 'status', 'HALF_DAY')}
                                    sx={{
                                        border: item.status === 'HALF_DAY' ? '2px solid #ffc107' : '1px solid #e0e0e0',
                                        bgcolor: item.status === 'HALF_DAY' ? '#fff8e1' : 'transparent',
                                        color: item.status === 'HALF_DAY' ? '#ffc107' : '#9e9e9e',
                                        p: 0.5,
                                        width: 32, height: 32,
                                        '&:hover': { bgcolor: '#fff8e1' }
                                    }}>
                                    <BlockIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Mark Present">
                                <IconButton size="small" onClick={() => onUpdate(item.id, 'status', 'PRESENT')}
                                    sx={{
                                        border: item.status === 'PRESENT' ? '2px solid #4caf50' : '1px solid #e0e0e0',
                                        bgcolor: item.status === 'PRESENT' ? '#e8f5e9' : 'transparent',
                                        color: item.status === 'PRESENT' ? '#4caf50' : '#9e9e9e',
                                        p: 0.5,
                                        width: 32, height: 32,
                                        '&:hover': { bgcolor: '#e8f5e9' }
                                    }}>
                                    <CheckIcon sx={{ fontWeight: 'bold' }} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Mark Absent">
                                <IconButton size="small" onClick={() => onUpdate(item.id, 'status', 'ABSENT')}
                                    sx={{
                                        border: item.status === 'ABSENT' ? '2px solid #f44336' : '1px solid #e0e0e0',
                                        bgcolor: item.status === 'ABSENT' ? '#ffebee' : 'transparent',
                                        color: item.status === 'ABSENT' ? '#f44336' : '#9e9e9e',
                                        p: 0.5,
                                        width: 32, height: 32,
                                        '&:hover': { bgcolor: '#ffebee' }
                                    }}>
                                    <CloseIcon />
                                </IconButton>
                            </Tooltip>
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
