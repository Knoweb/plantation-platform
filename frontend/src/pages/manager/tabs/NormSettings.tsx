import { Box, Typography, Paper, TextField, Button, Grid, Alert, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Chip, MenuItem, InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions, useTheme, useMediaQuery } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

export default function NormSettings() {
    const [taskTypes, setTaskTypes] = useState<any[]>([]);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState('');
    const [entries, setEntries] = useState([
        { id: crypto.randomUUID(), jobRole: '', targetValue: '' }
    ]);
    const [saved, setSaved] = useState(false);
    const [editingNorm, setEditingNorm] = useState<any>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [normsList, setNormsList] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);

    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const fetchNorms = useCallback(async () => {
        try {
            const res = await axios.get(`/api/operations/norms`, { headers: { 'X-Tenant-Id': tenantId } });
            setNormsList(res.data);
        } catch {
            console.error("Failed to fetch norms");
        }
    }, [tenantId]);

    const fetchTaskTypes = useCallback(async () => {
        try {
            const res = await axios.get(`/api/operations/task-types?tenantId=${tenantId}`);
            setTaskTypes(res.data);
        } catch {
            console.error("Failed to fetch task types");
        }
    }, [tenantId]);

    useEffect(() => {
        fetchTaskTypes();
        fetchNorms();
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [fetchTaskTypes, fetchNorms]);

    const handleAddEntry = () => {
        setEntries(prev => [...prev, { id: crypto.randomUUID(), jobRole: '', targetValue: '' }]);
    };

    const handleRemoveEntry = (id: string) => {
        setEntries(prev => prev.filter(e => e.id !== id));
    };

    const handleChangeEntry = (id: string, field: string, value: string) => {
        setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    };

    const handleSave = async () => {
        const validEntries = entries.filter(e => e.jobRole && e.targetValue);
        if (validEntries.length === 0 || !startDate) return;

        try {
            const promises = validEntries.map(entry => {
                const unit = taskTypes.find(t => t.name === entry.jobRole)?.expectedUnit || 'Kg';
                return axios.post(`/api/operations/norms`, {
                    jobRole: entry.jobRole,
                    targetValue: parseFloat(entry.targetValue),
                    unit: unit,
                    effectiveDate: startDate,
                    endDate: endDate || null
                }, {
                    headers: { 'X-Tenant-Id': tenantId }
                });
            });

            await Promise.all(promises);

            setSaved(true);
            setEntries([{ id: crypto.randomUUID(), jobRole: '', targetValue: '' }]);
            setEndDate('');
            fetchNorms();
            setTimeout(() => setSaved(false), 3000);
        } catch {
            console.error("Failed to save norm targets");
        }
    };

    const handleDeleteNorm = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this norm?")) return;
        try {
            await axios.delete(`/api/operations/norms/${id}`, { headers: { 'X-Tenant-Id': tenantId } });
            fetchNorms();
        } catch {
            console.error("Failed to delete norm");
        }
    };

    const handleEditSave = async () => {
        if (!editingNorm) return;

        // Date Check
        if (editingNorm.endDate && new Date(editingNorm.effectiveDate) > new Date(editingNorm.endDate)) {
            alert("End Date cannot be before Start Date.");
            return;
        }

        try {
            await axios.put(`/api/operations/norms/${editingNorm.id}`, editingNorm, {
                headers: { 'X-Tenant-Id': tenantId }
            });
            setEditingNorm(null);
            fetchNorms();
        } catch {
            console.error("Failed to update norm");
        }
    };

    // Derived States for Validation
    const isDateInvalid = startDate && endDate && new Date(startDate) > new Date(endDate);

    const overlapWarnings: string[] = [];
    if (startDate && !isDateInvalid) {
        const sA = new Date(startDate).getTime();
        const eA = endDate ? new Date(endDate).getTime() : 8640000000000000;

        entries.forEach(entry => {
            if (!entry.jobRole) return;
            const hasOverlap = normsList.some(n => {
                if (n.jobRole !== entry.jobRole) return false;
                const sB = new Date(n.effectiveDate).getTime();
                const eB = n.endDate ? new Date(n.endDate).getTime() : 8640000000000000;
                return sA <= eB && eA >= sB;
            });
            if (hasOverlap && !overlapWarnings.includes(entry.jobRole)) {
                overlapWarnings.push(entry.jobRole);
            }
        });
    }

    const filteredNorms = normsList.filter(n =>
        n.jobRole.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Box>
            <Box 
                display="flex" 
                justifyContent="space-between" 
                alignItems={isMobile ? 'flex-start' : 'center'} 
                mb={3}
                flexDirection={isMobile ? 'column' : 'row'}
                gap={2}
            >
                <Typography 
                    variant={isMobile ? 'h5' : 'h4'} 
                    fontWeight="bold" 
                    sx={{ color: '#1b5e20', lineHeight: 1.2 }}
                >
                    Operational Targets & Norms
                </Typography>
                <Paper 
                    elevation={0} 
                    sx={{ 
                        px: 2, 
                        py: 0.8, 
                        borderRadius: 3, 
                        bgcolor: '#f1f8e9',
                        border: '1px solid #c8e6c9',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <Typography variant="caption" fontWeight="bold" sx={{ color: '#2e7d32' }}>
                        {currentTime.toLocaleString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                </Paper>
            </Box>

            {saved && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>Monthly Norm Successfully Updated!</Alert>}

            <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, borderRadius: 4, mb: 4, border: '1px solid #e0e0e0', bgcolor: '#fafafa' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={isAddSectionOpen ? 1 : 0}>
                    <Typography variant="subtitle1" fontWeight="bold" color="text.primary">Configure New Norms</Typography>
                    <Button
                        variant={isAddSectionOpen ? "outlined" : "contained"}
                        size="small"
                        onClick={() => setIsAddSectionOpen(!isAddSectionOpen)}
                        endIcon={isAddSectionOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        sx={{ 
                            borderRadius: 2,
                            textTransform: 'none',
                            bgcolor: isAddSectionOpen ? 'transparent' : '#1b5e20',
                            '&:hover': { bgcolor: isAddSectionOpen ? 'rgba(27, 94, 32, 0.04)' : '#1b5e20' }
                        }}
                    >
                        {isAddSectionOpen ? 'Hide Form' : 'Add Target'}
                    </Button>
                </Box>

                {isAddSectionOpen && (
                    <Box sx={{ mt: 3, animation: 'fadeIn 0.3s ease-in-out' }}>
                        <Grid container spacing={4} sx={{ mb: 4 }}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    type="date"
                                    label="Start Date (Effective From)"
                                    InputLabelProps={{ shrink: true }}
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    error={!!isDateInvalid}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    type="date"
                                    label="End Date (Optional)"
                                    InputLabelProps={{ shrink: true }}
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    inputProps={{ min: startDate }}
                                    error={!!isDateInvalid}
                                    helperText={isDateInvalid ? "End Date must be after Start Date" : ""}
                                />
                            </Grid>
                        </Grid>

                        {overlapWarnings.length > 0 && (
                            <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 3 }}>
                                Warning: A target for <strong>{overlapWarnings.join(', ')}</strong> already exists in this date range. Saving this will override it.
                            </Alert>
                        )}

                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, color: '#333' }}>
                            Job Roles & Targets:
                        </Typography>

                        {entries.map((entry, index) => {
                            const selectedTask = taskTypes.find(t => t.name === entry.jobRole);
                            const unitLabel = selectedTask ? ` (${selectedTask.expectedUnit || 'Kg'})` : '';

                            return (
                                <Box key={entry.id} sx={{ mb: 2, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? 1 : 2 }}>
                                    {!isMobile && <Typography variant="body2" sx={{ width: 30, color: '#888' }}>{index + 1}.</Typography>}
                                    <TextField
                                        select
                                        fullWidth
                                        label="Target/Task Mode"
                                        value={entry.jobRole}
                                        onChange={(e) => handleChangeEntry(entry.id, 'jobRole', e.target.value)}
                                        size="small"
                                        sx={{ flex: 1.5 }}
                                    >
                                        {taskTypes.map(task => (
                                            <MenuItem key={task.id || task.name} value={task.name}>{task.name}</MenuItem>
                                        ))}
                                    </TextField>

                                    <Box display="flex" gap={1} sx={{ flex: 1 }}>
                                        <TextField
                                            fullWidth
                                            type="number"
                                            label="Target Value"
                                            value={entry.targetValue}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '' || Number(val) >= 0) {
                                                    handleChangeEntry(entry.id, 'targetValue', val);
                                                }
                                            }}
                                            size="small"
                                            InputProps={{
                                                endAdornment: unitLabel ? <InputAdornment position="end" sx={{ fontSize: '0.75rem' }}>{selectedTask?.expectedUnit || 'Kg'}</InputAdornment> : null,
                                            }}
                                            inputProps={{ min: 0 }}
                                        />

                                        {entries.length > 1 && (
                                            <IconButton size="small" color="error" onClick={() => handleRemoveEntry(entry.id)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        )}
                                    </Box>
                                </Box>
                            );
                        })}

                        <Box display="flex" justifyContent="space-between" mt={4} alignItems="center" flexDirection={isMobile ? 'column' : 'row'} gap={2}>
                            <Button
                                startIcon={<AddIcon />}
                                variant="outlined"
                                onClick={handleAddEntry}
                                fullWidth={isMobile}
                                sx={{ borderRadius: 2, height: 42, textTransform: 'none', color: '#1b5e20', borderColor: '#1b5e20' }}
                            >
                                Add Row
                            </Button>
                            <Button
                                variant="contained"
                                fullWidth={isMobile}
                                onClick={handleSave}
                                disabled={entries.filter(e => e.jobRole && e.targetValue).length === 0 || !startDate || !!isDateInvalid}
                                sx={{ 
                                    borderRadius: 2, 
                                    height: 42, 
                                    minWidth: 200, 
                                    textTransform: 'none',
                                    bgcolor: '#1b5e20',
                                    '&:hover': { bgcolor: '#1b5e20' }
                                }}
                            >
                                Save Targets
                            </Button>
                        </Box>
                    </Box>
                )}
            </Paper>

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" fontWeight="bold" sx={{ color: '#1b5e20' }}>
                    Active & Upcoming Norms
                </Typography>
                <TextField
                    size="small"
                    placeholder="Search by Task Role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment>,
                    }}
                    sx={{ width: { xs: '100%', md: 300 }, bgcolor: 'white' }}
                />
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 4, border: '1px solid #e0e0e0', overflowX: 'auto', width: '100%', mb: 4 }}>
                <Table size={isMobile ? "small" : "medium"}>
                    <TableHead sx={{ bgcolor: '#f1f8e9' }}>
                        <TableRow>
                            <TableCell sx={{ color: '#1b5e20', fontWeight: 'bold', fontSize: isMobile ? '0.75rem' : '0.85rem', px: isMobile ? 1 : 2 }}>
                                {isMobile ? 'Role' : 'Task / Role Name'}
                            </TableCell>
                            <TableCell align="center" sx={{ color: '#1b5e20', fontWeight: 'bold', fontSize: isMobile ? '0.75rem' : '0.85rem', px: isMobile ? 0.5 : 2 }}>
                                Target
                            </TableCell>
                            <TableCell align="center" sx={{ color: '#1b5e20', fontWeight: 'bold', fontSize: isMobile ? '0.75rem' : '0.85rem', px: isMobile ? 0.5 : 2 }}>
                                {isMobile ? 'From' : 'Effective From'}
                            </TableCell>
                            <TableCell align="center" sx={{ color: '#1b5e20', fontWeight: 'bold', fontSize: isMobile ? '0.75rem' : '0.85rem', px: isMobile ? 0.5 : 2 }}>
                                {isMobile ? 'Until' : 'Valid Until'}
                            </TableCell>
                            <TableCell align="right" sx={{ color: '#1b5e20', fontWeight: 'bold', fontSize: isMobile ? '0.75rem' : '0.85rem', px: isMobile ? 1 : 2 }}>
                                Actions
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredNorms.length > 0 ? filteredNorms.map((n) => (
                            <TableRow key={n.id} hover>
                                <TableCell sx={{ fontWeight: 500, fontSize: isMobile ? '0.75rem' : '0.85rem', px: isMobile ? 1 : 2, py: isMobile ? 1.5 : 2 }}>
                                    {n.jobRole}
                                </TableCell>
                                <TableCell align="center" sx={{ px: isMobile ? 0.5 : 2 }}>
                                    <Chip 
                                        label={`${n.targetValue} ${n.unit}`} 
                                        color="primary" 
                                        variant="outlined" 
                                        size={isMobile ? "small" : "medium"}
                                        sx={{ 
                                            fontWeight: 'bold', 
                                            fontSize: isMobile ? '0.65rem' : '0.75rem',
                                            height: isMobile ? 20 : 32
                                        }} 
                                    />
                                </TableCell>
                                <TableCell align="center" sx={{ fontSize: isMobile ? '0.7rem' : '0.8rem', px: isMobile ? 0.5 : 2 }}>
                                    {new Date(n.effectiveDate).toLocaleDateString()}
                                </TableCell>
                                <TableCell align="center" sx={{ fontSize: isMobile ? '0.7rem' : '0.8rem', px: isMobile ? 0.5 : 2, color: n.endDate ? 'inherit' : '#2e7d32' }}>
                                    {n.endDate 
                                        ? new Date(n.endDate).toLocaleDateString()
                                        : (isMobile ? '∞' : 'Active Until Changed')
                                    }
                                </TableCell>
                                <TableCell align="right" sx={{ px: isMobile ? 1 : 2 }}>
                                    <Box display="flex" justifyContent="flex-end" gap={isMobile ? 0.2 : 0.5}>
                                        <IconButton size="small" sx={{ color: '#1b5e20', p: isMobile ? 0.5 : 1 }} onClick={() => setEditingNorm(n)}>
                                            <EditIcon sx={{ fontSize: isMobile ? '1rem' : '1.25rem' }} />
                                        </IconButton>
                                        <IconButton size="small" color="error" sx={{ p: isMobile ? 0.5 : 1 }} onClick={() => handleDeleteNorm(n.id)}>
                                            <DeleteIcon sx={{ fontSize: isMobile ? '1rem' : '1.25rem' }} />
                                        </IconButton>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>No norms configured yet.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Edit Norm Dialog */}
            <Dialog open={!!editingNorm} onClose={() => setEditingNorm(null)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 'bold' }}>Edit Norm: {editingNorm?.jobRole}</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <TextField
                            fullWidth
                            type="number"
                            label={`Target Value (${editingNorm?.unit || 'Kg'})`}
                            value={editingNorm?.targetValue || ''}
                            onChange={(e) => setEditingNorm({ ...editingNorm, targetValue: parseFloat(e.target.value) || 0 })}
                        />
                        <TextField
                            fullWidth
                            type="date"
                            label="Effective From"
                            InputLabelProps={{ shrink: true }}
                            value={editingNorm?.effectiveDate || ''}
                            onChange={(e) => setEditingNorm({ ...editingNorm, effectiveDate: e.target.value })}
                        />
                        <TextField
                            fullWidth
                            type="date"
                            label="Valid Until (Optional)"
                            InputLabelProps={{ shrink: true }}
                            value={editingNorm?.endDate || ''}
                            onChange={(e) => setEditingNorm({ ...editingNorm, endDate: e.target.value })}
                            inputProps={{ min: editingNorm?.effectiveDate }}
                            error={editingNorm?.endDate && new Date(editingNorm?.effectiveDate) > new Date(editingNorm?.endDate)}
                            helperText={editingNorm?.endDate && new Date(editingNorm?.effectiveDate) > new Date(editingNorm?.endDate) ? "Invalid date" : ""}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setEditingNorm(null)}>Cancel</Button>
                    <Button variant="contained" color="primary" onClick={handleEditSave}>
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
