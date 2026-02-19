import { useState, useEffect } from 'react';
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
    IconButton
} from '@mui/material';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

export default function DistributionOfWorks() {
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [data, setData] = useState<Record<number, Record<string, number>>>({}); // [Day][WorkItem] -> count
    const [totalsByItem, setTotalsByItem] = useState<Record<string, number>>({});
    const [workItems, setWorkItems] = useState<string[]>([]);

    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    useEffect(() => {
        if (tenantId) {
            fetchInitialData();
        }
    }, [tenantId, currentDate]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Task Types first
            const taskRes = await axios.get(`/api/tenants/task-types?tenantId=${tenantId}`);
            let tasks = taskRes.data.map((t: any) => t.name);

            // Should usually be seeded by backend, but fallback just in case
            if (tasks.length === 0) tasks = ['Plucking', 'Sundry', 'Other'];

            setWorkItems(tasks);

            // 2. Fetch Attendance Data
            await fetchAttendanceData(tasks);

        } catch (e) {
            console.error("Error fetching data", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchAttendanceData = async (currentTasks: string[]) => {
        // Initialize empty structure for all days
        const newData: Record<number, Record<string, number>> = {};
        const newTotals: Record<string, number> = {};

        // Init items
        currentTasks.forEach(item => newTotals[item] = 0);

        for (let d = 1; d <= daysInMonth; d++) {
            newData[d] = {};
            currentTasks.forEach(item => newData[d][item] = 0);
        }

        const requests = [];
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            requests.push(
                axios.get(`/api/tenants/attendance?tenantId=${tenantId}&date=${dateStr}`)
                    .then(res => ({ day: d, records: res.data }))
                    .catch(() => ({ day: d, records: [] }))
            );
        }

        const results = await Promise.all(requests);

        results.forEach(({ day, records }) => {
            records.forEach((rec: any) => {
                if (rec.status === 'PRESENT' || rec.status === 'HALF_DAY') {
                    const rawType = rec.workType || 'Other';

                    // Match Logic: Check strict match first, then partial match
                    let matchedItem = 'Other';

                    // 1. Strict
                    if (currentTasks.includes(rawType)) {
                        matchedItem = rawType;
                    }
                    // 2. Case Insensitive
                    else {
                        const found = currentTasks.find(t => t.toLowerCase() === rawType.toLowerCase());
                        if (found) matchedItem = found;
                        else {
                            // 3. Heuristic Map (Legacy Support)
                            matchedItem = mapWorkType(rawType, currentTasks);
                        }
                    }

                    if (newData[day][matchedItem] !== undefined) {
                        newData[day][matchedItem] += 1;
                    } else if (newData[day]['Other'] !== undefined) {
                        newData[day]['Other'] += 1;
                    }
                }
            });
        });

        // Calculate Row Totals
        currentTasks.forEach(item => {
            let sum = 0;
            for (let d = 1; d <= daysInMonth; d++) {
                sum += newData[d][item] || 0;
            }
            newTotals[item] = sum;
        });

        setData(newData);
        setTotalsByItem(newTotals);
    };

    const mapWorkType = (type: string, availableTasks: string[]) => {
        const lower = type.toLowerCase();
        // Try to map known keywords to available tasks
        if (lower.includes('pluck')) return availableTasks.find(t => t.toLowerCase().includes('pluck')) || 'Other';
        if (lower.includes('weed')) return availableTasks.find(t => t.toLowerCase().includes('weed')) || 'Other';
        if (lower.includes('transport')) return availableTasks.find(t => t.toLowerCase().includes('transport')) || 'Other';
        return 'Other';
    };

    const handlePrevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));

    if (loading) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;

    return (
        <Box display="flex" height="calc(100vh - 80px)">
            {/* Main Content */}
            <Box flex={1} p={2} sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <Box display="flex" alignItems="center" justifyContent="center" mb={2} position="relative">
                    <Box position="absolute" left={0}>
                        <Typography variant="h6" fontWeight="bold" color="success.main">
                            {userSession.estateName || 'Estate Name'}
                        </Typography>
                        <Typography variant="caption" display="block">
                            Division: {userSession.divisionAccess || 'All'}
                        </Typography>
                    </Box>

                    <Box display="flex" alignItems="center" gap={2}>
                        <IconButton onClick={handlePrevMonth}><ArrowBackIosIcon /></IconButton>
                        <Box textAlign="center">
                            <Typography variant="h5" fontWeight="bold">Distribution of Works</Typography>
                            <Typography variant="subtitle1" color="text.secondary">{monthName}</Typography>
                        </Box>
                        <IconButton onClick={handleNextMonth}><ArrowForwardIosIcon /></IconButton>
                    </Box>
                </Box>

                {/* Table */}
                <TableContainer component={Paper} elevation={3} sx={{ flex: 1, border: '2px solid #2e7d32', overflow: 'auto' }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ bgcolor: '#eee', fontWeight: 'bold', borderRight: '1px solid #ccc', minWidth: 150, fontSize: '0.8rem', py: 1 }}>Work Items</TableCell>
                                <TableCell sx={{ bgcolor: '#eee', fontWeight: 'bold', borderRight: '1px solid #ccc', minWidth: 80, fontSize: '0.8rem', py: 1 }}>Work Prgm</TableCell>
                                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                                    <TableCell key={d} align="center" sx={{ bgcolor: '#fffde7', borderRight: '1px solid #eee', minWidth: 26, maxWidth: 26, px: 0, py: 1, fontSize: '0.75rem' }}>{d}</TableCell>
                                ))}
                                <TableCell align="center" sx={{ bgcolor: '#eee', fontWeight: 'bold', borderLeft: '2px solid #ccc', minWidth: 50, fontSize: '0.8rem', py: 1 }}>Total</TableCell>
                                <TableCell align="center" sx={{ bgcolor: '#e0f2f1', fontWeight: 'bold', minWidth: 60, fontSize: '0.8rem', py: 1 }}>To Date</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {workItems.map(item => (
                                <TableRow key={item} hover sx={{ '& td': { py: 0.5, px: 0.5, fontSize: '0.8rem' } }}>
                                    <TableCell component="th" scope="row" sx={{ borderRight: '1px solid #eee', fontWeight: 500, fontSize: '0.8rem !important' }}>
                                        {item}
                                    </TableCell>
                                    <TableCell sx={{ borderRight: '1px solid #eee' }}></TableCell>

                                    {/* Days */}
                                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                                        <TableCell key={d} align="center" sx={{ borderRight: '1px solid #f5f5f5', color: data[d]?.[item] ? 'black' : '#e0e0e0', fontSize: '0.75rem !important', px: '0 !important' }}>
                                            {data[d]?.[item] || 0}
                                        </TableCell>
                                    ))}

                                    {/* Total */}
                                    <TableCell align="center" sx={{ borderLeft: '2px solid #ccc', fontWeight: 'bold' }}>
                                        {totalsByItem[item]}
                                    </TableCell>
                                    <TableCell align="center" sx={{ bgcolor: '#e0f2f1', fontWeight: 'bold' }}>
                                        {totalsByItem[item]}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Box>
    );
}
