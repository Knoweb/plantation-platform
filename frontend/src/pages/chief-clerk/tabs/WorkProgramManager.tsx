import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Box, Typography, CircularProgress, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Select, MenuItem,
    FormControl, Button, Snackbar, Alert
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';

export default function WorkProgramManager() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({ open: false, msg: '', sev: 'success' });

    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth()); // 0-indexed

    // Tasks as full objects with parsed cropTypes array (multi-crop support)
    const [tasks, setTasks] = useState<Array<{ name: string; cropTypes: string[] }>>([]);
    const [program, setProgram] = useState<Record<string, string>>({});

    // Crop tabs — built from task cropTypes
    const [availableCrops, setAvailableCrops] = useState<string[]>([]);
    const [activeFilter, setActiveFilter] = useState<string | null>(null);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    // Helper: parse comma-separated cropType string -> string[]
    const parseCropTypes = (cropType: string | null | undefined): string[] => {
        if (!cropType) return ['GENERAL'];
        return cropType.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    };

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
            (progRes.data as any[]).forEach(entry => {
                progMap[entry.taskName] = String(entry.workersNeeded || '');
            });
            setProgram(progMap);
        } catch (e) {
            console.error('Failed to load work program data', e);
        } finally {
            setLoading(false);
        }
    }, [tenantId, year, month]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleChange = (taskName: string, val: string) => {
        setProgram(prev => ({ ...prev, [taskName]: val }));
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
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h4" fontWeight="bold" color="#1b5e20">Distribution of Works</Typography>

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

                {/* Save Button */}
                <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}
                    sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' }, minWidth: 120 }}>
                    {saving ? 'Saving...' : 'Save'}
                </Button>
            </Box>

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
                sx={{ flex: 1, border: '2px solid #2e7d32', borderTop: 0, overflow: 'auto', borderRadius: '0 0 4px 4px' }}>
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
