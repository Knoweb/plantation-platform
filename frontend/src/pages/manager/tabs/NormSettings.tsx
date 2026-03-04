import { Box, Typography, Paper, TextField, Button, Grid, Alert, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Chip, MenuItem, InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useState, useEffect } from 'react';
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

    useEffect(() => {
        fetchTaskTypes();
        fetchNorms();
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [tenantId]);

    const fetchNorms = async () => {
        try {
            const res = await axios.get(`/api/operations/norms`, { headers: { 'X-Tenant-Id': tenantId } });
            setNormsList(res.data);
        } catch (error) {
            console.error("Failed to fetch norms");
        }
    };

    const fetchTaskTypes = async () => {
        try {
            const res = await axios.get(`/api/operations/task-types?tenantId=${tenantId}`);
            setTaskTypes(res.data);
        } catch (error) {
            console.error("Failed to fetch task types");
        }
    };

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
        } catch (error) {
            console.error("Failed to save norm targets");
        }
    };

    const handleDeleteNorm = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this norm?")) return;
        try {
            await axios.delete(`/api/operations/norms/${id}`, { headers: { 'X-Tenant-Id': tenantId } });
            fetchNorms();
        } catch (err) {
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
        } catch (error) {
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
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h4" fontWeight="bold" sx={{ color: '#1b5e20' }}>
                    Operational Targets & Norms
                </Typography>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#555', bgcolor: '#e8f5e9', px: 2, py: 1, borderRadius: 2 }}>
                    {currentTime.toLocaleString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Set the required daily targets (Plucking Norms, Fertilizer amounts, Weeding goals, Transport quotas) for Estate divisions.
            </Typography>

            {saved && <Alert severity="success" sx={{ mb: 3 }}>Monthly Norm Successfully Updated!</Alert>}

            <Paper sx={{ p: 4, borderRadius: 3, mb: 4, maxWidth: 900 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={isAddSectionOpen ? 3 : 0}>
                    <Typography variant="h6" fontWeight="bold">Add New Targets</Typography>
                    <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => setIsAddSectionOpen(!isAddSectionOpen)}
                        endIcon={isAddSectionOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        sx={{ borderRadius: 2 }}
                    >
                        {isAddSectionOpen ? 'Close Form' : 'Open Form'}
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
                                <Box key={entry.id} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography variant="body2" sx={{ width: 30, color: '#888' }}>{index + 1}.</Typography>
                                    <TextField
                                        select
                                        fullWidth
                                        label="Target/Task Mode"
                                        value={entry.jobRole}
                                        onChange={(e) => handleChangeEntry(entry.id, 'jobRole', e.target.value)}
                                        size="small"
                                        sx={{ flex: 1 }}
                                    >
                                        {taskTypes.map(task => (
                                            <MenuItem key={task.id || task.name} value={task.name}>{task.name}</MenuItem>
                                        ))}
                                    </TextField>

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
                                        onKeyDown={(e) => {
                                            if (e.key === '-' || e.key === 'e') {
                                                e.preventDefault();
                                            }
                                        }}
                                        size="small"
                                        sx={{ flex: 1 }}
                                        InputProps={{
                                            endAdornment: unitLabel ? <InputAdornment position="end">{selectedTask?.expectedUnit || 'Kg'}</InputAdornment> : null,
                                        }}
                                        inputProps={{ min: 0 }}
                                    />

                                    {entries.length > 1 ? (
                                        <IconButton color="error" onClick={() => handleRemoveEntry(entry.id)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    ) : (
                                        <Box sx={{ width: 40 }} /> // Spacer to align with rows having delete button
                                    )}
                                </Box>
                            );
                        })}

                        <Box display="flex" justifyContent="space-between" mt={4} alignItems="center">
                            <Button
                                startIcon={<AddIcon />}
                                variant="outlined"
                                onClick={handleAddEntry}
                                sx={{ borderRadius: 2, height: 42 }}
                            >
                                Add Another Job Target
                            </Button>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleSave}
                                disabled={entries.filter(e => e.jobRole && e.targetValue).length === 0 || !startDate || !!isDateInvalid}
                                sx={{ borderRadius: 2, height: 42, minWidth: 200 }}
                            >
                                Save All Entries
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

            <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 3 }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell><strong>Task / Role Name</strong></TableCell>
                            <TableCell align="center"><strong>Target</strong></TableCell>
                            <TableCell align="center"><strong>Effective From</strong></TableCell>
                            <TableCell align="center"><strong>Valid Until</strong></TableCell>
                            <TableCell align="right"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredNorms.length > 0 ? filteredNorms.map((n) => (
                            <TableRow key={n.id} hover>
                                <TableCell sx={{ fontWeight: 500 }}>{n.jobRole}</TableCell>
                                <TableCell align="center">
                                    <Chip label={`${n.targetValue} ${n.unit}`} color="primary" variant="outlined" size="small" sx={{ fontWeight: 'bold' }} />
                                </TableCell>
                                <TableCell align="center">{new Date(n.effectiveDate).toLocaleDateString()}</TableCell>
                                <TableCell align="center">{n.endDate ? new Date(n.endDate).toLocaleDateString() : 'Active Until Changed'}</TableCell>
                                <TableCell align="right">
                                    <IconButton color="primary" onClick={() => setEditingNorm(n)}>
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton color="error" onClick={() => handleDeleteNorm(n.id)}>
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5} align="center">No norms configured yet.</TableCell>
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
