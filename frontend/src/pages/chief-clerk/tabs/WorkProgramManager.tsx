import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
    Box, Typography, CircularProgress, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Select, MenuItem,
    FormControl, Button, Snackbar, Alert, Chip, Tooltip, Tabs, Tab, Badge
} from '@mui/material';
import ChatIcon from '@mui/icons-material/ChatBubbleOutline';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';

const buildSocketUrl = (path: string) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${path}`;
};

const getSessionRank = (session?: string) => {
    const normalized = String(session || '').toUpperCase();
    if (normalized === 'EVENING_SESSION') return 3;
    if (normalized === 'FULL_DAY') return 2;
    if (normalized === 'MORNING_SESSION') return 1;
    return 0;
};

export default function WorkProgramManager() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditable, setIsEditable] = useState(false);
    const [realtimeEnabled, setRealtimeEnabled] = useState(false);
    const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' | 'info' }>({ open: false, msg: '', sev: 'success' });

    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth()); // 0-indexed

    // Tasks as full objects with parsed cropTypes array (multi-crop support)
    const [tasks, setTasks] = useState<Array<{ name: string; cropTypes: string[] }>>([]);
    const [program, setProgram] = useState<Record<string, string>>({});
    const [justifications, setJustifications] = useState<Record<string, string>>({});
    const [baselineProgram, setBaselineProgram] = useState<Record<string, string>>({});

    const [activeTab, setActiveTab] = useState(0); // 0: Entry, 1: Monthly Sheet
    const [totalsByTask, setTotalsByTask] = useState<Record<string, number>>({});

    // Crop tabs — built from task cropTypes
    const [availableCrops, setAvailableCrops] = useState<string[]>([]);
    const [activeFilter, setActiveFilter] = useState<string | null>(null);

    // Alert Dismissal State
    const [dismissedTasks, setDismissedTasks] = useState<string[]>([]);

    useEffect(() => {
        const key = `dismissed_wp_${tenantId}_${year}_${month + 1}`;
        const saved = JSON.parse(localStorage.getItem(key) || '[]');
        setDismissedTasks(saved);
    }, [tenantId, year, month]);

    const handleDismissAlerts = () => {
        const key = `dismissed_wp_${tenantId}_${year}_${month + 1}`;
        const newDismissed = Array.from(new Set([...dismissedTasks, ...unjustifiedTasks]));
        setDismissedTasks(newDismissed);
        localStorage.setItem(key, JSON.stringify(newDismissed));
        // Notify Sidebar to refresh its badge
        window.dispatchEvent(new Event('muster-update'));
        setSnack({ open: true, msg: 'Alerts dismissed for this session.', sev: 'info' });
    };

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    // Helper: parse comma-separated cropType string -> string[]
    const parseCropTypes = (cropType: string | null | undefined): string[] => {
        if (!cropType) return ['GENERAL'];
        return cropType.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    };

    // Calculate Unjustified Over-utilization (Alert Logic)
    const { unjustifiedCount, unjustifiedTasks } = useMemo(() => {
        const tasksWithIssues: string[] = [];
        tasks.forEach(task => {
            const prog = Number(program[task.name] || 0);
            const actual = totalsByTask[task.name] || 0;
            const balance = prog - actual;
            const hasJustification = !!justifications[task.name];
            const isDismissed = dismissedTasks.includes(task.name);
            if (balance < 0 && !hasJustification && !isDismissed) {
                tasksWithIssues.push(task.name);
            }
        });
        return { unjustifiedCount: tasksWithIssues.length, unjustifiedTasks: tasksWithIssues };
    }, [tasks, program, totalsByTask, justifications, dismissedTasks]);

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

            // 2. Fetch task types — parse multi-crop
            const taskRes = await axios.get(`/api/operations/task-types?tenantId=${tenantId}`);
            const taskObjects: Array<{ name: string; cropTypes: string[] }> = taskRes.data.length > 0
                ? taskRes.data.map((t: any) => ({ name: t.name, cropTypes: parseCropTypes(t.cropType) }))
                : [{ name: 'Plucking', cropTypes: ['TEA'] }, { name: 'Sundry', cropTypes: ['GENERAL'] }];
            setTasks(taskObjects);

            // 3. Fetch existing work program for this month
            const progRes = await axios.get(`/api/work-program?tenantId=${tenantId}&year=${year}&month=${month + 1}`);
            const progMap: Record<string, string> = {};
            const justMap: Record<string, string> = {};
            (progRes.data as any[]).forEach(entry => {
                progMap[entry.taskName] = String(entry.workersNeeded || '');
                justMap[entry.taskName] = entry.justification || '';
            });
            setProgram(progMap);
            setJustifications(justMap);
            setBaselineProgram(progMap);
            setRealtimeEnabled(true);

            // 4. Fetch Correct Attendance Data (Mirroring Field Officer Logic)
            // Fetch daily-work to find submitted musters
            const dwRes = await axios.get(`/api/operations/daily-work?tenantId=${tenantId}`);
            const submittedIds = new Set<string>();
            (dwRes.data || []).forEach((work: any) => {
                const workDateStr = String(work.workDate || '');
                if (!workDateStr) return;
                const d = new Date(workDateStr);
                if (d.getFullYear() !== year || d.getMonth() !== month) return;

                const isSubmitted = Boolean(work.submittedAt) || (typeof work.bulkWeights === 'string' && work.bulkWeights.trim() !== '' && work.bulkWeights !== '{}');
                if (isSubmitted && work.workId) submittedIds.add(String(work.workId));
            });

            // Fetch attendance for the month
            const mm = String(month + 1).padStart(2, '0');
            const daysInM = new Date(year, month + 1, 0).getDate();
            const lastDay = String(daysInM).padStart(2, '0');
            const attRes = await axios.get(
                `/api/operations/attendance?tenantId=${tenantId}&startDate=${year}-${mm}-01&endDate=${year}-${mm}-${lastDay}`
            );
            const attendanceRecords: any[] = attRes.data || [];

            // Aggregate by worker per day (highest rank wins)
            const finalAssignments: Map<string, any>[] = Array.from({ length: daysInM + 1 }, () => new Map());
            attendanceRecords.forEach((rec: any) => {
                if (rec.status !== 'PRESENT' && rec.status !== 'HALF_DAY') return;
                if (!rec.dailyWorkId || !submittedIds.has(String(rec.dailyWorkId))) return;

                const dayNum = parseInt(rec.workDate.split('-')[2], 10);
                if (dayNum > 0 && dayNum <= daysInM) {
                    const workerId = String(rec.workerId || '').trim();
                    const existing = finalAssignments[dayNum].get(workerId);
                    if (!existing || getSessionRank(rec.session) >= getSessionRank(existing.session)) {
                        finalAssignments[dayNum].set(workerId, rec);
                    }
                }
            });

            // Final Count by Task Name
            const usageMap: Record<string, number> = {};
            const taskNamesList = taskObjects.map(t => t.name);

            finalAssignments.forEach(dayMap => {
                dayMap.forEach(rec => {
                    const rawType = rec.workType || 'Other';
                    let matched: string | undefined;

                    if (taskNamesList.includes(rawType)) {
                        matched = rawType;
                    } else {
                        matched = taskNamesList.find(t => t.toLowerCase() === String(rawType).toLowerCase());
                        if (!matched) {
                            const lower = rawType.toLowerCase();
                            if (lower.includes('pluck')) matched = taskNamesList.find(t => t.toLowerCase().includes('pluck'));
                            else if (lower.includes('weed')) matched = taskNamesList.find(t => t.toLowerCase().includes('weed'));
                            else if (lower.includes('transport')) matched = taskNamesList.find(t => t.toLowerCase().includes('transport'));
                        }
                    }

                    const finalKey = matched || 'Other';
                    usageMap[finalKey] = (usageMap[finalKey] || 0) + 1;
                });
            });

            setTotalsByTask(usageMap);
        } catch (e) {
            console.error('Failed to load work program data', e);
            setRealtimeEnabled(false);
        } finally {
            setLoading(false);
        }
    }, [tenantId, year, month]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (!tenantId || !realtimeEnabled) return undefined;

        let active = true;
        let manuallyClosed = false;
        let socket: WebSocket | null = null;
        let reconnectTimer: number | null = null;

        const connect = () => {
            socket = new WebSocket(buildSocketUrl('/ws/work-program'));

            socket.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    if (
                        payload?.type === 'work-program-updated' &&
                        payload?.tenantId === tenantId &&
                        Number(payload?.year) === year &&
                        Number(payload?.month) === month + 1
                    ) {
                        if (isEditable) {
                            setSnack({
                                open: true,
                                msg: 'Another update arrived for this month. Save or cancel to sync cleanly.',
                                sev: 'info'
                            });
                            return;
                        }
                        fetchData();
                    }
                } catch (error) {
                    console.error('Failed to parse work program realtime update', error);
                }
            };

            socket.onerror = () => {
                // Fetch errors already surface backend outages; keep websocket noise quiet.
            };

            socket.onclose = () => {
                if (!active || manuallyClosed) return;
                reconnectTimer = window.setTimeout(connect, 2000);
            };
        };

        connect();

        return () => {
            active = false;
            manuallyClosed = true;
            if (reconnectTimer !== null) {
                window.clearTimeout(reconnectTimer);
            }
            if (socket) {
                socket.onclose = null;
                socket.onerror = null;
                socket.onmessage = null;
                if (socket.readyState === WebSocket.OPEN) {
                    socket.close();
                }
            }
        };
    }, [tenantId, year, month, isEditable, realtimeEnabled, fetchData]);

    const handleChange = (taskName: string, val: string) => {
        if (!isEditable) return;
        setProgram(prev => ({ ...prev, [taskName]: val }));
    };

    const handleEdit = () => {
        setBaselineProgram(program);
        setIsEditable(true);
    };

    const handleCancel = () => {
        setProgram(baselineProgram);
        setIsEditable(false);
        setSnack({ open: true, msg: 'Changes cancelled.', sev: 'success' });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const entries: Record<string, number> = {};
            tasks.forEach(t => {
                entries[t.name] = Number(program[t.name] || 0);
            });
            await axios.post('/api/work-program/bulk', {
                tenantId,
                year,
                month: month + 1,
                entries
            });
            setBaselineProgram(
                Object.fromEntries(tasks.map((t) => [t.name, String(entries[t.name] || 0)]))
            );
            setIsEditable(false);

            // Reset dismissals for this month because a new program is a "reset" of labor planning
            const key = `dismissed_wp_${tenantId}_${year}_${month + 1}`;
            localStorage.removeItem(key);
            setDismissedTasks([]);
            window.dispatchEvent(new Event('muster-update'));

            setSnack({ open: true, msg: 'Work program saved successfully!', sev: 'success' });
        } catch (e) {
            setSnack({ open: true, msg: 'Failed to save. Please try again.', sev: 'error' });
        } finally {
            setSaving(false);
        }
    };

    // Build tab list: non-GENERAL crops + always GENERAL at end
    const tabList = [...availableCrops, 'GENERAL'];

    // Task appears in the active tab if:
    // 1. It has that crop type explicitly (TEA task → TEA tab), OR
    // 2. It is GENERAL → belongs to ALL crops, shows in every tab
    const filteredTasks = tasks.filter(t => {
        if (!activeFilter) return true;
        if (activeFilter === 'GENERAL') return t.cropTypes.includes('GENERAL');
        return t.cropTypes.includes(activeFilter) || t.cropTypes.includes('GENERAL');
    });

    // Returns comma-joined crop types for display in the Category column
    const getTaskCropTypes = (taskName: string): string => {
        const t = tasks.find(tk => tk.name === taskName);
        return t?.cropTypes.join(', ') || 'GENERAL';
    };

    const TAB_COLORS: Record<string, { bg: string; text: string }> = {
        TEA: { bg: '#00c853', text: 'white' },
        RUBBER: { bg: '#00b0ff', text: 'white' },
        CINNAMON: { bg: '#ffb300', text: 'black' },
        GENERAL: { bg: '#e0e0e0', text: 'black' },
    };
    const getTabColor = (name: string) => TAB_COLORS[name] || { bg: '#9e9e9e', text: 'white' };

    if (loading) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;

    return (
        <Box display="flex" height="calc(100vh - 80px)" flexDirection="column">
            {/* Header */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} gap={2}>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h4" fontWeight="bold" color="#1b5e20">Distribution of Works</Typography>
                </Box>

                {/* Centre: Month/Year Selector */}
                <Box display="flex" alignItems="center" gap={2}
                    sx={{ bgcolor: '#e8f5e9', border: '2px solid #a5d6a7', borderRadius: 3, px: 3, py: 1 }}>
                    <FormControl size="small" variant="standard" sx={{ minWidth: 80 }}>
                        <Select value={year} onChange={e => setYear(Number(e.target.value))}
                            disableUnderline sx={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#1b5e20' }}>
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                <MenuItem key={y} value={y}>{y}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" variant="standard" sx={{ minWidth: 130 }}>
                        <Select value={month} onChange={e => setMonth(Number(e.target.value))}
                            disableUnderline sx={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#1b5e20' }}>
                            {monthNames.map((m, i) => (
                                <MenuItem key={m} value={i}>{m}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                <Box display="flex" alignItems="center" gap={1.5} sx={{ minWidth: 280, justifyContent: 'flex-end' }}>
                    {!isEditable ? (
                        <Button
                            variant="contained"
                            startIcon={<EditIcon />}
                            onClick={handleEdit}
                            sx={{ bgcolor: '#e65100', '&:hover': { bgcolor: '#bf360c' }, minWidth: 135 }}
                        >
                            Edit Entry
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="outlined"
                                onClick={handleCancel}
                                disabled={saving}
                                sx={{ borderColor: '#9e9e9e', color: '#616161', minWidth: 110 }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<SaveIcon />}
                                onClick={handleSave}
                                disabled={saving}
                                sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' }, minWidth: 120 }}
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </Button>
                        </>
                    )}
                </Box>
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={activeTab} onChange={(_e, v) => setActiveTab(v)} textColor="primary" indicatorColor="primary">
                    <Tab label="Work Program Entry" sx={{ fontWeight: 'bold' }} />
                    <Tab 
                        label={
                            <Badge badgeContent={unjustifiedCount} color="error" sx={{ '& .MuiBadge-badge': { right: -10, top: 0 } }}>
                                Monthly Distribution Sheet
                            </Badge>
                        } 
                        sx={{ fontWeight: 'bold' }} 
                    />
                </Tabs>
            </Box>

            {activeTab === 0 && (
                <>
                    <Paper elevation={0} sx={{ mb: 2, p: 1.5, bgcolor: '#f5fbf5', border: '1px solid #c8e6c9', borderRadius: 2 }}>
                        <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                            <Chip label={`Month: ${monthNames[month]} ${year}`} size="small" sx={{ bgcolor: '#e8f5e9', color: '#1b5e20', fontWeight: 700 }} />
                            {isEditable && <Chip label="Editing mode" color="warning" size="small" />}
                            <Typography variant="body2" color="text.secondary">
                                {isEditable
                                    ? 'Update workers needed, then save to publish the monthly work program to Field Officer.'
                                    : 'View mode. Click Edit Entry to update this month\'s work program.'}
                            </Typography>
                        </Box>
                    </Paper>

                    {/* Dynamic Crop Filter Tabs */}
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
                                        opacity: (activeFilter && !isActive) ? 0.5 : 1,
                                        ...(isActive ? {
                                            borderRadius: '8px 8px 0 0',
                                            border: '2px solid #ffcdd2',
                                            borderBottom: 'none',
                                        } : {})
                                    }}>
                                    {crop}
                                </Box>
                            );
                        })}
                        {activeFilter && (
                            <Box onClick={() => setActiveFilter(null)}
                                sx={{ px: 2, py: 0.5, cursor: 'pointer', fontSize: '0.8rem', color: 'text.secondary', alignSelf: 'center' }}>
                                Clear Filter
                            </Box>
                        )}
                    </Box>

                    {/* Table */}
                    <TableContainer component={Paper} elevation={3}
                        sx={{ flex: 1, border: '2px solid #2e7d32', borderTop: 0, overflow: 'auto', borderRadius: '0 0 8px 8px', boxShadow: '0 10px 26px rgba(46, 125, 50, 0.10)' }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ bgcolor: '#eee', fontWeight: 'bold', borderRight: '1px solid #ccc', minWidth: 200, fontSize: '0.85rem' }}>
                                        Work Item
                                    </TableCell>
                                    <TableCell align="center" sx={{ bgcolor: '#e8f5e9', fontWeight: 'bold', borderRight: '1px solid #ccc', minWidth: 160, fontSize: '0.85rem', color: '#1b5e20' }}>
                                        Workers Needed (Work Program)
                                    </TableCell>
                                    <TableCell align="center" sx={{ bgcolor: '#eee', fontWeight: 'bold', fontSize: '0.85rem', color: '#666' }}>
                                        Category
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                              {filteredTasks.map(task => (
                                <TableRow key={task.name} hover sx={{ '& td': { py: 0.8, px: 1, fontSize: '0.85rem' } }}>
                                    <TableCell sx={{ fontWeight: 500, borderRight: '1px solid #eee' }}>
                                        {task.name}
                                    </TableCell>
                                    <TableCell sx={{ borderRight: '1px solid #eee', p: '4px 12px !important' }}>
                                        <TextField
                                            variant="outlined" size="small" type="number" fullWidth
                                            disabled={!isEditable}
                                            inputProps={{ min: 0, style: { textAlign: 'center', fontWeight: 'bold', color: '#1565c0' } }}
                                            placeholder="0"
                                            value={program[task.name] || ''}
                                            onChange={e => handleChange(task.name, e.target.value)}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    '& fieldset': { borderColor: '#a5d6a7' },
                                                    '&:hover fieldset': { borderColor: '#2e7d32' },
                                                    '&.Mui-focused fieldset': { borderColor: '#1b5e20' },
                                                }
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell align="center" sx={{ color: '#888', fontSize: '0.78rem' }}>
                                        {getTaskCropTypes(task.name)}
                                    </TableCell>
                                </TableRow>
                            ))}
                                {filteredTasks.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} align="center" sx={{ color: '#bbb', py: 4 }}>
                                            No tasks in this category.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>
            )}

            {activeTab === 1 && (
                <>
                    {unjustifiedCount > 0 && (
                        <Alert 
                            severity="error" 
                            sx={{ mb: 2, fontWeight: 'bold', '& .MuiAlert-message': { display: 'flex', alignItems: 'center', gap: 2, width: '100%' } }}
                        >
                            <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                    Action Required: {unjustifiedCount} task(s) have worker over-utilization without justification 
                                    ({unjustifiedTasks.join(', ')}).
                                </Typography>
                                <Button 
                                    variant="outlined" 
                                    color="error" 
                                    size="small" 
                                    onClick={handleDismissAlerts}
                                    sx={{ 
                                        ml: 2, 
                                        fontWeight: 'bold', 
                                        borderWidth: 2, 
                                        '&:hover': { borderWidth: 2, bgcolor: 'rgba(211, 47, 47, 0.04)' },
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    OK, Dismiss
                                </Button>
                            </Box>
                        </Alert>
                    )}
                    <TableContainer component={Paper} elevation={3}
                    sx={{ flex: 1, border: '1px solid #ccc', overflow: 'auto', borderRadius: 2 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold', minWidth: 200 }}>Work Item</TableCell>
                                <TableCell align="center" sx={{ bgcolor: '#e3f2fd', fontWeight: 'bold', color: '#1565c0' }}>Work Program</TableCell>
                                <TableCell align="center" sx={{ bgcolor: '#fff3e0', fontWeight: 'bold', color: '#e65100' }}>Actual Workers</TableCell>
                                <TableCell align="center" sx={{ bgcolor: '#e8f5e9', fontWeight: 'bold', color: '#2e7d32' }}>Balance</TableCell>
                                <TableCell align="center" sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold', color: '#666' }}>Justification</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {tasks.map(task => {
                                const prog = Number(program[task.name] || 0);
                                const actual = totalsByTask[task.name] || 0;
                                const balance = prog - actual;
                                const justification = justifications[task.name];

                                // Skip tasks that have no prog and no usage to keep list clean
                                if (prog === 0 && actual === 0) return null;

                                return (
                                    <TableRow key={task.name} hover>
                                        <TableCell sx={{ fontWeight: 500 }}>{task.name}</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>{prog}</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>{actual}</TableCell>
                                        <TableCell align="center"
                                            sx={{ 
                                                bgcolor: balance < 0 ? '#ffebee' : '#f1f8e9', 
                                                fontWeight: 'bold', 
                                                color: balance < 0 ? 'error.main' : 'success.main' 
                                            }}>
                                            {balance}
                                        </TableCell>
                                        <TableCell align="center">
                                            {justification ? (
                                                <Tooltip title={justification} arrow placement="left">
                                                    <Chip 
                                                        label="View Reason" 
                                                        size="small" 
                                                        color="warning" 
                                                        variant="outlined"
                                                        icon={<ChatIcon fontSize="small" />}
                                                    />
                                                </Tooltip>
                                            ) : (
                                                balance < 0 ? (
                                                    <Chip label="Missing Reason" size="small" color="error" variant="filled" />
                                                ) : '-'
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
                </>
            )}

            <Snackbar open={snack.open} autoHideDuration={3000}
                onClose={() => setSnack(s => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity={snack.sev} onClose={() => setSnack(s => ({ ...s, open: false }))}>
                    {snack.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}
