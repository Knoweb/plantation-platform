import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Box, Typography, CircularProgress, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Select, MenuItem, FormControl, Chip
} from '@mui/material';

const buildSocketUrl = (path: string) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${path}`;
};

// Helper: parse comma-separated cropType string -> string[]
const parseCropTypes = (cropType: string | null | undefined): string[] => {
    if (!cropType) return ['GENERAL'];
    return cropType.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
};

const getSessionRank = (session?: string) => {
    const normalized = String(session || '').toUpperCase();
    if (normalized === 'EVENING_SESSION') return 3;
    if (normalized === 'FULL_DAY') return 2;
    if (normalized === 'MORNING_SESSION') return 1;
    return 0;
};

export default function DistributionOfWorks() {
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    const [data, setData] = useState<Record<number, Record<string, number>>>({});
    const [totalsByItem, setTotalsByItem] = useState<Record<string, number>>({});
    // Tasks stored as objects – cropTypes is parsed array for multi-crop support
    const [tasks, setTasks] = useState<Array<{ name: string; cropTypes: string[] }>>([]);
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const [availableCrops, setAvailableCrops] = useState<string[]>([]);
    const [workProgram, setWorkProgram] = useState<Record<string, number>>({});
    const [realtimeEnabled, setRealtimeEnabled] = useState(false);

    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    useEffect(() => {
        localStorage.setItem('distribution_view_date', currentDate.toISOString());
    }, [currentDate]);

    const fetchData = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);
        try {
            // 1. Fetch available crops from fields to build TABS
            const cropRes = await axios.get(`/api/fields?tenantId=${tenantId}`);
            const fieldCrops: string[] = Array.from(
                new Set(
                    (cropRes.data as any[])
                        .map((f: any) => f.cropType)
                        .filter(Boolean)
                        .map((c: string) => c.trim().toUpperCase())
                )
            ) as string[];
            setAvailableCrops(fieldCrops);
            if (fieldCrops.length > 0) setActiveFilter(prev => prev ?? fieldCrops[0]);
            else setActiveFilter('GENERAL');

            // 2. Fetch Task Types — parse multi-crop
            const taskRes = await axios.get(`/api/operations/task-types?tenantId=${tenantId}`);
            const taskObjects: Array<{ name: string; cropTypes: string[] }> = taskRes.data.length > 0
                ? taskRes.data.map((t: any) => ({
                    name: t.name,
                    cropTypes: parseCropTypes(t.cropType)
                }))
                : [
                    { name: 'Plucking', cropTypes: ['TEA'] },
                    { name: 'Sundry', cropTypes: ['GENERAL'] },
                    { name: 'Other', cropTypes: ['GENERAL'] }
                ];
            setTasks(taskObjects);
            const taskNameList = taskObjects.map(t => t.name);

            // 3. Fetch Work Program set by Chief Clerk
            const progRes = await axios.get(
                `/api/work-program?tenantId=${tenantId}&year=${currentYear}&month=${currentMonth + 1}`
            );
            const progMap: Record<string, number> = {};
            (progRes.data as any[]).forEach(entry => {
                progMap[entry.taskName] = entry.workersNeeded || 0;
            });
            setWorkProgram(progMap);

            // 4. Fetch submitted daily-work records so actual counts come only from finalized evening muster.
            const dailyWorkRes = await axios.get(`/api/operations/daily-work?tenantId=${tenantId}`);
            const submittedDailyWorkIds = new Set<string>();
            (dailyWorkRes.data || []).forEach((work: any) => {
                const workDateStr = String(work.workDate || '');
                if (!workDateStr) return;

                // Robust date matching: parse and compare Year/Month
                const d = new Date(workDateStr);
                if (d.getFullYear() !== currentYear || d.getMonth() !== currentMonth) return;

                // A work is considered submitted if it has a submission timestamp OR bulk weights are filled
                const isSubmitted = Boolean(work.submittedAt) || (typeof work.bulkWeights === 'string' && work.bulkWeights.trim() !== '' && work.bulkWeights !== '{}');
                
                if (isSubmitted && work.workId) {
                    submittedDailyWorkIds.add(String(work.workId));
                }
            });

            // 5. Fetch attendance for whole month
            const mm = String(currentMonth + 1).padStart(2, '0');
            const lastDay = String(daysInMonth).padStart(2, '0');
            const attRes = await axios.get(
                `/api/operations/attendance?tenantId=${tenantId}&startDate=${currentYear}-${mm}-01&endDate=${currentYear}-${mm}-${lastDay}`
            );
            const attendanceRecords: any[] = attRes.data || [];

            // Initialize data grid
            const newData: Record<number, Record<string, number>> = {};
            const newTotals: Record<string, number> = {};
            taskNameList.forEach(t => { newTotals[t] = 0; });
            for (let d = 1; d <= daysInMonth; d++) {
                newData[d] = {};
                taskNameList.forEach(t => { newData[d][t] = 0; });
            }

            // Build the final submitted assignment per worker per day from evening muster.
            const finalAssignmentsByDay: Record<number, Map<string, any>> = {};
            for (let d = 1; d <= daysInMonth; d++) {
                finalAssignmentsByDay[d] = new Map();
            }

            attendanceRecords.forEach((rec: any) => {
                if (rec.status !== 'PRESENT' && rec.status !== 'HALF_DAY') return;
                // Only include attendance items that belong to an officially submitted muster
                if (!rec.dailyWorkId || !submittedDailyWorkIds.has(String(rec.dailyWorkId))) return;

                const wDateStr = rec.workDate;
                if (!wDateStr) return;
                if (!String(wDateStr).startsWith(`${currentYear}-${mm}-`)) return;
                const dayNum = parseInt(wDateStr.split('-')[2], 10);
                if (!dayNum || dayNum < 1 || dayNum > daysInMonth) return;

                const workerId = String(rec.workerId || '').trim();
                if (!workerId) return;

                const existing = finalAssignmentsByDay[dayNum].get(workerId);
                if (!existing || getSessionRank(rec.session) >= getSessionRank(existing.session)) {
                    finalAssignmentsByDay[dayNum].set(workerId, rec);
                }
            });

            // Count one final submitted task per worker per day.
            for (let d = 1; d <= daysInMonth; d++) {
                finalAssignmentsByDay[d].forEach((rec: any) => {
                    const rawType = rec.workType || 'Other';
                    let matchedItem: string;

                    if (taskNameList.includes(rawType)) {
                        matchedItem = rawType;
                    } else {
                        const found = taskNameList.find(t => t.toLowerCase() === String(rawType).toLowerCase());
                        matchedItem = found || mapWorkType(String(rawType), taskNameList);
                    }

                    if (newData[d][matchedItem] !== undefined) {
                        newData[d][matchedItem] += 1;
                    } else {
                        const other = taskNameList.find(t => t === 'Other');
                        if (other && newData[d][other] !== undefined) newData[d][other] += 1;
                    }
                });
            }

            // Totals
            taskNameList.forEach(item => {
                let sum = 0;
                for (let d = 1; d <= daysInMonth; d++) sum += newData[d][item] || 0;
                newTotals[item] = sum;
            });

            setData(newData);
            setTotalsByItem(newTotals);
            setRealtimeEnabled(true);
        } catch (e) {
            console.error('Error fetching distribution data', e);
            setRealtimeEnabled(false);
        } finally {
            setLoading(false);
        }
    }, [tenantId, currentYear, currentMonth, daysInMonth]);

    useEffect(() => { 
        fetchData(); 
        // Manually refresh when a muster is updated (saved/submitted) in the other tab
        window.addEventListener('muster-update', fetchData);
        return () => window.removeEventListener('muster-update', fetchData);
    }, [fetchData]);

    useEffect(() => {
        if (!tenantId || !realtimeEnabled) return undefined;

        let active = true;
        let manuallyClosed = false;
        let workProgramSocket: WebSocket | null = null;
        let distributionSocket: WebSocket | null = null;
        let workProgramReconnect: number | null = null;
        let distributionReconnect: number | null = null;

        const connectWorkProgram = () => {
            workProgramSocket = new WebSocket(buildSocketUrl('/ws/work-program'));
            workProgramSocket.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    if (
                        payload?.type === 'work-program-updated' &&
                        payload?.tenantId === tenantId &&
                        Number(payload?.year) === currentYear &&
                        Number(payload?.month) === currentMonth + 1
                    ) {
                        fetchData();
                    }
                } catch (error) {
                    console.error('Failed to parse work program websocket payload', error);
                }
            };
            workProgramSocket.onerror = () => {
                // Fetch errors already surface backend outages; keep websocket noise quiet.
            };
            workProgramSocket.onclose = () => {
                if (!active || manuallyClosed) return;
                workProgramReconnect = window.setTimeout(connectWorkProgram, 2000);
            };
        };

        const connectDistribution = () => {
            distributionSocket = new WebSocket(buildSocketUrl('/ws/distribution-works'));
            distributionSocket.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    if (
                        payload?.type === 'distribution-updated' &&
                        payload?.tenantId === tenantId &&
                        Number(payload?.year) === currentYear &&
                        Number(payload?.month) === currentMonth + 1
                    ) {
                        fetchData();
                    }
                } catch (error) {
                    console.error('Failed to parse distribution websocket payload', error);
                }
            };
            distributionSocket.onerror = () => {
                // Fetch errors already surface backend outages; keep websocket noise quiet.
            };
            distributionSocket.onclose = () => {
                if (!active || manuallyClosed) return;
                distributionReconnect = window.setTimeout(connectDistribution, 2000);
            };
        };

        connectWorkProgram();
        connectDistribution();

        return () => {
            active = false;
            manuallyClosed = true;
            if (workProgramReconnect !== null) window.clearTimeout(workProgramReconnect);
            if (distributionReconnect !== null) window.clearTimeout(distributionReconnect);
            if (workProgramSocket) {
                workProgramSocket.onclose = null;
                workProgramSocket.onerror = null;
                workProgramSocket.onmessage = null;
                if (workProgramSocket.readyState === WebSocket.OPEN) {
                    workProgramSocket.close();
                }
            }
            if (distributionSocket) {
                distributionSocket.onclose = null;
                distributionSocket.onerror = null;
                distributionSocket.onmessage = null;
                if (distributionSocket.readyState === WebSocket.OPEN) {
                    distributionSocket.close();
                }
            }
        };
    }, [tenantId, currentYear, currentMonth, realtimeEnabled, fetchData]);

    const mapWorkType = (type: string, taskList: string[]) => {
        const lower = type.toLowerCase();
        if (lower.includes('pluck')) return taskList.find(t => t.toLowerCase().includes('pluck')) || 'Other';
        if (lower.includes('weed')) return taskList.find(t => t.toLowerCase().includes('weed')) || 'Other';
        if (lower.includes('transport')) return taskList.find(t => t.toLowerCase().includes('transport')) || 'Other';
        return 'Other';
    };

    if (loading) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;

    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    const TAB_COLORS: Record<string, { bg: string; text: string }> = {
        TEA: { bg: '#00c853', text: 'white' },
        RUBBER: { bg: '#00b0ff', text: 'white' },
        CINNAMON: { bg: '#ffb300', text: 'black' },
        GENERAL: { bg: '#e0e0e0', text: 'black' },
    };
    const getTabColor = (name: string) => TAB_COLORS[name] || { bg: '#9e9e9e', text: 'white' };

    const tabList = [...availableCrops, 'GENERAL'];

    // Task appears in the active tab if:
    // 1. It has that crop type explicitly (e.g. TEA task shows in TEA tab), OR
    // 2. It is GENERAL (belongs to ALL crops — shows in every tab)
    const filteredTasks = tasks.filter(task => {
        if (!activeFilter) return true;
        if (activeFilter === 'GENERAL') return task.cropTypes.includes('GENERAL');
        return task.cropTypes.includes(activeFilter) || task.cropTypes.includes('GENERAL');
    });

    return (
        <Box display="flex" flexDirection="column" sx={{ minHeight: { xs: 'auto', sm: 'calc(100vh - 80px)' } }}>
            <Box flex={1} p={2} sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <Box display="flex" alignItems={{ xs: 'flex-start', sm: 'center' }}
                    flexDirection={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between" mb={2} gap={1}>
                    <Box>
                        <Typography variant="h5" fontWeight="bold" color="#1b5e20">
                            Distribution of Works
                        </Typography>
                        <Box mt={0.5} display="flex" gap={1} flexWrap="wrap">
                            <Chip size="small" label="Work Prgrm from Chief Clerk" sx={{ bgcolor: '#e8f5e9', color: '#1b5e20', fontWeight: 700 }} />
                            <Chip size="small" label="Daily counts from submitted evening muster" sx={{ bgcolor: '#fff3e0', color: '#e65100', fontWeight: 700 }} />
                        </Box>
                    </Box>

                    <Box display="flex" alignItems="center" gap={1}
                        sx={{ bgcolor: '#e8f5e9', border: '2px solid #a5d6a7', borderRadius: 3, px: 2, py: 0.5 }}>
                        <FormControl size="small" variant="standard" sx={{ minWidth: 70 }}>
                            <Select
                                value={currentYear}
                                onChange={(e) => setCurrentDate(new Date(Number(e.target.value), currentMonth, 1))}
                                disableUnderline
                                sx={{ fontWeight: 'bold', fontSize: '1rem', color: '#1b5e20' }}>
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                    <MenuItem key={y} value={y}>{y}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" variant="standard" sx={{ minWidth: 100 }}>
                            <Select
                                value={currentMonth}
                                onChange={(e) => setCurrentDate(new Date(currentYear, Number(e.target.value), 1))}
                                disableUnderline
                                sx={{ fontWeight: 'bold', fontSize: '1rem', color: '#1b5e20' }}>
                                {MONTH_NAMES.map((m, i) => (
                                    <MenuItem key={m} value={i}>{m}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                </Box>

                {/* Crop Filter Tabs */}
                <Box display="flex" mb={0} sx={{ borderBottom: '1px solid #ccc' }}>
                    {tabList.map(crop => {
                        const { bg, text } = getTabColor(crop);
                        const isActive = activeFilter === crop;
                        return (
                            <Box key={crop}
                                onClick={() => setActiveFilter(prev => prev === crop ? null : crop)}
                                sx={{
                                    bgcolor: bg, color: text,
                                    px: 3, py: 0.5, cursor: 'pointer',
                                    fontWeight: 'bold', fontSize: '0.85rem',
                                    transition: 'all 0.2s ease',
                                    opacity: (activeFilter && !isActive) ? 0.5 : 1,
                                    ...(isActive ? {
                                        borderRadius: '8px 8px 0 0',
                                        border: '2px solid #ffcdd2',
                                        borderBottom: 'none',
                                        transform: 'scale(1.05)',
                                        zIndex: 1,
                                    } : {})
                                }}>
                                {crop}
                            </Box>
                        );
                    })}
                    {activeFilter && (
                        <Box onClick={() => setActiveFilter(null)}
                            sx={{ px: 2, py: 0.5, cursor: 'pointer', fontSize: '0.8rem', color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
                            Clear Filter
                        </Box>
                    )}
                </Box>

                {/* Table */}
                <TableContainer component={Paper} elevation={3}
                    sx={{ flex: 1, border: '2px solid #2e7d32', borderTop: 0, overflow: 'auto', borderRadius: '0 0 4px 4px' }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ bgcolor: '#eee', fontWeight: 'bold', borderRight: '1px solid #ccc', minWidth: 150, fontSize: '0.8rem' }}>
                                    Work Items
                                </TableCell>
                                <TableCell sx={{ bgcolor: '#eee', fontWeight: 'bold', borderRight: '1px solid #ccc', minWidth: 80, fontSize: '0.8rem' }}>
                                    Work Prgm
                                </TableCell>
                                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                                    <TableCell key={d} align="center"
                                        sx={{ bgcolor: '#fffde7', borderRight: '1px solid #eee', minWidth: 26, maxWidth: 26, px: 0, fontSize: '0.75rem' }}>
                                        {d}
                                    </TableCell>
                                ))}
                                <TableCell align="center"
                                    sx={{ bgcolor: '#eee', fontWeight: 'bold', borderLeft: '2px solid #ccc', minWidth: 50, fontSize: '0.8rem' }}>
                                    Total
                                </TableCell>
                                <TableCell align="center"
                                    sx={{ bgcolor: '#e0f2f1', fontWeight: 'bold', minWidth: 60, fontSize: '0.8rem' }}>
                                    Balance
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredTasks.map(task => {
                                const item = task.name;
                                const prog = workProgram[item] || 0;
                                const total = totalsByItem[item] || 0;
                                const balance = prog - total;

                                return (
                                    <TableRow key={item} hover sx={{ '& td': { py: 0.5, px: 0.5, fontSize: '0.8rem' } }}>
                                        <TableCell sx={{ borderRight: '1px solid #eee', fontWeight: 500 }}>
                                            {item}
                                        </TableCell>
                                        <TableCell align="center"
                                            sx={{ borderRight: '1px solid #eee', fontWeight: 'bold', color: '#1565c0' }}>
                                            {prog > 0 ? prog : <span style={{ color: '#bbb' }}>0</span>}
                                        </TableCell>
                                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                                            <TableCell key={d} align="center"
                                                sx={{
                                                    borderRight: '1px solid #f5f5f5',
                                                    color: data[d]?.[item] ? 'black' : '#e0e0e0',
                                                    fontSize: '0.75rem', px: '0 !important'
                                                }}>
                                                {data[d]?.[item] || 0}
                                            </TableCell>
                                        ))}
                                        <TableCell align="center" sx={{ borderLeft: '2px solid #ccc', fontWeight: 'bold' }}>
                                            {total}
                                        </TableCell>
                                        <TableCell align="center"
                                            sx={{ bgcolor: '#e0f2f1', fontWeight: 'bold', color: balance < 0 ? 'error.main' : 'inherit' }}>
                                            {balance}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Box>
    );
}
