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
    TextField,
    Select,
    MenuItem,
    FormControl
} from '@mui/material';

export default function DistributionOfWorks() {
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(() => {
        const savedDate = localStorage.getItem('distribution_view_date');
        return savedDate ? new Date(savedDate) : new Date();
    });
    const [data, setData] = useState<Record<number, Record<string, number>>>({}); // [Day][WorkItem] -> count
    const [totalsByItem, setTotalsByItem] = useState<Record<string, number>>({});
    const [workItems, setWorkItems] = useState<string[]>([]);
    const [activeFilter, setActiveFilter] = useState<string | null>('General');

    const [workProgram, setWorkProgram] = useState<Record<string, string>>({});

    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();


    useEffect(() => {
        localStorage.setItem('distribution_view_date', currentDate.toISOString());
    }, [currentDate]);

    // Load Work Program from LocalStorage on month change
    useEffect(() => {
        if (tenantId) {
            const key = `work_program_${tenantId}_${currentYear}_${currentMonth}`;
            const saved = localStorage.getItem(key);
            if (saved) {
                try { setWorkProgram(JSON.parse(saved)); } catch (e) { setWorkProgram({}); }
            } else {
                setWorkProgram({});
            }
        }
    }, [tenantId, currentYear, currentMonth]);

    useEffect(() => {
        if (tenantId) {
            fetchInitialData();
        }
    }, [tenantId, currentDate]);

    const handleProgramUpdate = (item: string, val: string) => {
        const newP = { ...workProgram, [item]: val };
        setWorkProgram(newP);
        const key = `work_program_${tenantId}_${currentYear}_${currentMonth}`;
        localStorage.setItem(key, JSON.stringify(newP));
    };

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Task Types first
            const taskRes = await axios.get(`/api/operations/task-types?tenantId=${tenantId}`);
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
                axios.get(`/api/operations/attendance?tenantId=${tenantId}&date=${dateStr}`)
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



    if (loading) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;

    return (
        <Box display="flex" height="calc(100vh - 80px)">
            {/* Main Content */}
            <Box flex={1} p={2} sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    {/* Left: Tab Title */}
                    <Box>
                        <Typography variant="h4" fontWeight="bold" color="#1b5e20">
                            Distribution of Works
                        </Typography>
                    </Box>

                    {/* Right: Date Selectors */}
                    <Box display="flex" alignItems="center" gap={2}>
                        {/* Year Selector */}
                        <FormControl size="small" variant="standard" sx={{ minWidth: 80 }}>
                            <Select
                                value={currentYear}
                                onChange={(e) => setCurrentDate(new Date(Number(e.target.value), currentMonth, 1))}
                                disableUnderline
                                sx={{ fontWeight: 'bold', fontSize: '1.2rem' }}
                            >
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                    <MenuItem key={y} value={y}>{y}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Month Selector */}
                        <FormControl size="small" variant="standard" sx={{ minWidth: 120 }}>
                            <Select
                                value={currentMonth}
                                onChange={(e) => setCurrentDate(new Date(currentYear, Number(e.target.value), 1))}
                                disableUnderline
                                sx={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'primary.main' }}
                            >
                                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                                    <MenuItem key={m} value={i}>{m}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                </Box>

                <Box display="flex" mb={0} sx={{ borderBottom: '1px solid #ccc' }}>
                    <style>
                        {`
                        @keyframes pulse {
                            0% { box-shadow: 0 0 0 0px rgba(255, 82, 82, 0.7); }
                            100% { box-shadow: 0 0 0 10px rgba(255, 82, 82, 0); }
                        }
                        `}
                    </style>
                    {[
                        { name: 'Tea', color: '#00c853', text: 'white' },
                        { name: 'Rubber', color: '#00b0ff', text: 'white' },
                        { name: 'Cinnamon', color: '#ffb300', text: 'black' },
                        { name: 'General', color: '#e0e0e0', text: 'black' }
                    ].map(cat => (
                        <Box
                            key={cat.name}
                            onClick={() => setActiveFilter(prev => prev === cat.name ? null : cat.name)}
                            sx={{
                                bgcolor: cat.color,
                                color: cat.text,
                                px: 3,
                                py: 0.5,
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '0.85rem',
                                transition: 'all 0.3s ease',
                                position: 'relative',
                                ...(activeFilter === cat.name ? {
                                    opacity: 1,
                                    transform: 'scale(1.05)',
                                    zIndex: 1,
                                    borderRadius: '8px 8px 0 0',
                                    border: '2px solid #ffcdd2', // Light red border
                                    borderBottom: 'none',
                                    animation: 'pulse 1.5s infinite',
                                    boxShadow: '0 0 10px #ff5252' // Light red glow
                                } : {
                                    opacity: (activeFilter && activeFilter !== cat.name) ? 0.5 : 1,
                                    '&:hover': { opacity: 0.9 }
                                })
                            }}
                        >
                            {cat.name}
                        </Box>
                    ))}
                    {activeFilter && (
                        <Box
                            onClick={() => setActiveFilter(null)}
                            sx={{ px: 2, py: 0.5, cursor: 'pointer', fontSize: '0.8rem', color: 'text.secondary', display: 'flex', alignItems: 'center' }}
                        >
                            Clear Filter
                        </Box>
                    )}
                </Box>

                {/* Table */}
                <TableContainer component={Paper} elevation={3} sx={{ flex: 1, border: '2px solid #2e7d32', borderTop: 0, overflow: 'auto', borderRadius: '0 0 4px 4px' }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ bgcolor: '#eee', fontWeight: 'bold', borderRight: '1px solid #ccc', minWidth: 150, fontSize: '0.8rem', py: 1 }}>Work Items</TableCell>
                                <TableCell sx={{ bgcolor: '#eee', fontWeight: 'bold', borderRight: '1px solid #ccc', minWidth: 80, fontSize: '0.8rem', py: 1 }}>Work Prgm</TableCell>
                                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                                    <TableCell key={d} align="center" sx={{ bgcolor: '#fffde7', borderRight: '1px solid #eee', minWidth: 26, maxWidth: 26, px: 0, py: 1, fontSize: '0.75rem' }}>{d}</TableCell>
                                ))}
                                <TableCell align="center" sx={{ bgcolor: '#eee', fontWeight: 'bold', borderLeft: '2px solid #ccc', minWidth: 50, fontSize: '0.8rem', py: 1 }}>Total</TableCell>
                                <TableCell align="center" sx={{ bgcolor: '#e0f2f1', fontWeight: 'bold', minWidth: 60, fontSize: '0.8rem', py: 1, whiteSpace: 'nowrap' }}>Balance</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {workItems.filter(item => {
                                if (!activeFilter) return true;
                                const lower = item.toLowerCase();
                                let cat = 'General';
                                if (lower.includes('pluck') || lower.includes('tea') || lower.includes('pruning') || lower.includes('blister') || lower.includes('moss')) cat = 'Tea';
                                else if (lower.includes('rubber') || lower.includes('tap') || lower.includes('latex')) cat = 'Rubber';
                                else if (lower.includes('cinnamon')) cat = 'Cinnamon';

                                // Special case for Pruning/Weeding which might be ambiguous, usually assume Tea if not specified, or General.
                                // Logic: Pluck->Tea. Tap->Rubber. Cinnamon->Cinnamon. Rest->General?
                                // Refine:
                                if (cat === 'General' && (lower.includes('weed') || lower.includes('road') || lower.includes('drain'))) cat = 'General';

                                return cat === activeFilter;
                            }).map(item => {
                                const prog = Number(workProgram[item]) || 0;
                                const total = totalsByItem[item] || 0;
                                const balance = prog - total;

                                return (
                                    <TableRow key={item} hover sx={{ '& td': { py: 0.5, px: 0.5, fontSize: '0.8rem' } }}>
                                        <TableCell component="th" scope="row" sx={{ borderRight: '1px solid #eee', fontWeight: 500, fontSize: '0.8rem !important' }}>
                                            {item}
                                        </TableCell>

                                        {/* Work Program Input */}
                                        <TableCell sx={{ borderRight: '1px solid #eee', p: '2px !important' }}>
                                            <TextField
                                                variant="standard"
                                                fullWidth
                                                type="number"
                                                InputProps={{ disableUnderline: true, style: { fontSize: '0.8rem', textAlign: 'center', fontWeight: 'bold', color: '#1565c0' } }}
                                                placeholder="0"
                                                value={workProgram[item] || ''}
                                                onChange={(e) => handleProgramUpdate(item, e.target.value)}
                                            />
                                        </TableCell>

                                        {/* Days */}
                                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                                            <TableCell key={d} align="center" sx={{ borderRight: '1px solid #f5f5f5', color: data[d]?.[item] ? 'black' : '#e0e0e0', fontSize: '0.75rem !important', px: '0 !important' }}>
                                                {data[d]?.[item] || 0}
                                            </TableCell>
                                        ))}

                                        {/* Total */}
                                        <TableCell align="center" sx={{ borderLeft: '2px solid #ccc', fontWeight: 'bold' }}>
                                            {total}
                                        </TableCell>
                                        {/* Balance */}
                                        <TableCell align="center" sx={{ bgcolor: '#e0f2f1', fontWeight: 'bold', color: balance < 0 ? 'error.main' : 'inherit' }}>
                                            {balance}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Box>
    );
}
