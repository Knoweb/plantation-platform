import {
    Box, Typography, Paper, TextField, Button, Grid, TableContainer, Table, TableHead,
    TableRow, TableCell, TableBody, IconButton, Select, MenuItem, Tooltip, Autocomplete,
    FormControl, Chip, OutlinedInput, ListItemText, Checkbox, Collapse
} from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import SpaIcon from '@mui/icons-material/Spa';

const CROP_COLORS: Record<string, string> = {
    TEA: '#00c853',
    RUBBER: '#00b0ff',
    CINNAMON: '#ffb300',
    GENERAL: '#9e9e9e',
};
const getCropColor = (crop: string) => CROP_COLORS[crop?.toUpperCase()] || '#bdbdbd';

export default function TaskTypeSettings() {
    const [taskTypes, setTaskTypes] = useState<any[]>([]);
    const [newTaskName, setNewTaskName] = useState('');
    const [newTaskUnit, setNewTaskUnit] = useState<string>('Kg');
    const [newTaskCrops, setNewTaskCrops] = useState<string[]>(['GENERAL']);
    const [showAddForm, setShowAddForm] = useState(false);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editUnit, setEditUnit] = useState<string>('');
    const [editCrops, setEditCrops] = useState<string[]>([]);

    const [availableCrops, setAvailableCrops] = useState<string[]>([]);

    const unitOptions = ['Kg', 'Acres', 'SqFt', 'Taps', 'Liters', 'Days', 'Task', 'None'];

    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    const fetchTaskTypes = useCallback(async () => {
        try {
            const res = await axios.get(`/api/operations/task-types?tenantId=${tenantId}`);
            setTaskTypes(res.data);
        } catch (error) {
            console.error("Failed to fetch task types");
        }
    }, [tenantId]);

    const fetchCrops = useCallback(async () => {
        try {
            // 1. Get crops from session config (defined during onboarding)
            const config = userSession.config || {};
            const configCrops = Object.keys(config)
                .filter(key => typeof config[key] === 'boolean' && config[key] === true)
                .map(key => key.toUpperCase());

            // 2. Get crops from existing fields (as supplementary)
            const res = await axios.get(`/api/fields?tenantId=${tenantId}`);
            const fieldCrops: string[] = Array.from(
                new Set(
                    (res.data as any[])
                        .map((f: any) => f.cropType)
                        .filter(Boolean)
                        .map((c: string) => c.trim().toUpperCase())
                )
            ) as string[];
            
            // Combine both sets to ensure all options are available
            const combined = Array.from(new Set([...configCrops, ...fieldCrops]));
            if (combined.length > 0) {
                setAvailableCrops(combined);
            }
        } catch (e) {
            console.warn('Could not fetch crops from fields, falling back to config');
            const config = userSession.config || {};
            const configCrops = Object.keys(config)
                .filter(key => typeof config[key] === 'boolean' && config[key] === true)
                .map(key => key.toUpperCase());
            if (configCrops.length > 0) setAvailableCrops(configCrops);
        }
    }, [tenantId, userSession.config]);

    useEffect(() => {
        if (tenantId) {
            fetchTaskTypes();
            fetchCrops();
        }
    }, [tenantId, fetchTaskTypes, fetchCrops]);

    const parseCropTypes = (cropType: string | null | undefined): string[] => {
        if (!cropType) return ['GENERAL'];
        return cropType.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    };

    const handleCreateTask = async () => {
        if (!newTaskName.trim()) return;
        try {
            await axios.post(`/api/operations/task-types?tenantId=${tenantId}`, {
                name: newTaskName.trim(),
                unit: newTaskUnit,
                cropType: newTaskCrops.join(',')
            });
            setNewTaskName('');
            setNewTaskCrops(['GENERAL']);
            setShowAddForm(false);
            fetchTaskTypes();
        } catch (err) {
            console.error("Failed to create task");
        }
    };

    const handleDeleteTask = async (id: string) => {
        if (!window.confirm("Are you sure you want to remove this task?")) return;
        try {
            await axios.delete(`/api/operations/task-types/${id}`);
            fetchTaskTypes();
        } catch (err) {
            console.error("Failed to delete task");
        }
    };

    const handleEditClick = (task: any) => {
        setEditingId(task.id);
        setEditUnit(task.expectedUnit || 'Kg');
        setEditCrops(parseCropTypes(task.cropType));
    };

    const handleSaveEdit = async (id: string) => {
        try {
            await axios.put(`/api/operations/task-types/${id}/unit`, { unit: editUnit });
            await axios.put(`/api/operations/task-types/${id}/crop-type`, { cropType: editCrops.join(',') });
            setEditingId(null);
            fetchTaskTypes();
        } catch (err) {
            console.error("Failed to update task");
        }
    };

    const cropOptions = [...new Set([...availableCrops, 'GENERAL'])];

    const MultiCropSelect = ({
        value, onChange
    }: { value: string[], onChange: (val: string[]) => void }) => (
        <FormControl fullWidth size="small">
            <Select
                multiple
                value={value}
                onChange={(e) => onChange(e.target.value as string[])}
                input={<OutlinedInput />}
                renderValue={(selected) => (
                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {(selected as string[]).map(v => (
                            <Chip
                                key={v}
                                label={v}
                                size="small"
                                sx={{ bgcolor: getCropColor(v), color: 'white', fontWeight: 'bold', fontSize: '0.7rem' }}
                            />
                        ))}
                    </Box>
                )}
            >
                {cropOptions.map(c => (
                    <MenuItem key={c} value={c}>
                        <Checkbox checked={value.includes(c)} size="small" />
                        <SpaIcon fontSize="small" sx={{ color: getCropColor(c), mr: 1 }} />
                        <ListItemText primary={c} />
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ color: '#1b5e20', mb: 1 }}>
                Job Roles & Task Types
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Assign each task to one or more crop types — it will appear in all matching tabs in Distribution of Works.
            </Typography>

            <Box display="flex" justifyContent="flex-end" sx={{ mb: 2, maxWidth: 950 }}>
                <Button
                    variant="contained"
                    startIcon={showAddForm ? <CloseIcon /> : <AddIcon />}
                    onClick={() => setShowAddForm(!showAddForm)}
                    sx={{
                        bgcolor: showAddForm ? '#d32f2f' : '#2e7d32',
                        '&:hover': { bgcolor: showAddForm ? '#b71c1c' : '#1b5e20' },
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 'bold',
                        px: 3
                    }}
                >
                    {showAddForm ? 'Close Form' : 'Add New Task'}
                </Button>
            </Box>

            <Collapse in={showAddForm}>
                <Paper sx={{ p: 3, borderRadius: 3, mb: 4, maxWidth: 950, border: '1px solid #a5d6a7', bgcolor: '#f1f8e9' }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: '#2e7d32' }}>Create New Job Role</Typography>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth variant="outlined" size="small"
                                label="Role/Task Name"
                                value={newTaskName}
                                onChange={(e) => setNewTaskName(e.target.value)}
                                sx={{ bgcolor: 'white' }}
                            />
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <Autocomplete
                                freeSolo options={unitOptions} size="small"
                                value={newTaskUnit}
                                onChange={(_e, v) => setNewTaskUnit(v || '')}
                                onInputChange={(_e, v) => setNewTaskUnit(v || '')}
                                renderInput={(params) => (
                                    <TextField {...params} label="Unit" variant="outlined" size="small" sx={{ bgcolor: 'white' }} />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <MultiCropSelect value={newTaskCrops} onChange={setNewTaskCrops} />
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <Button
                                variant="contained" fullWidth size="medium"
                                onClick={handleCreateTask} disabled={!newTaskName.trim()}
                                startIcon={<AddIcon />}
                                sx={{ bgcolor: '#2e7d32', height: 40, textTransform: 'none', fontWeight: 'bold' }}>
                                Save Task
                            </Button>
                        </Grid>
                    </Grid>
                </Paper>
            </Collapse>

            <TableContainer component={Paper} elevation={2} sx={{ maxWidth: 950, borderRadius: 3, overflow: 'hidden' }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Task / Role Name</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 240 }}>Crop Types (multi-select)</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Unit</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {taskTypes.length > 0 ? taskTypes.map((task) => {
                            const crops = parseCropTypes(task.cropType);
                            return (
                                <TableRow key={task.id} hover>
                                    <TableCell sx={{ fontWeight: 500 }}>{task.name}</TableCell>
                                    <TableCell align="center">
                                        {editingId === task.id ? (
                                            <MultiCropSelect value={editCrops} onChange={setEditCrops} />
                                        ) : (
                                            <Box display="flex" flexWrap="wrap" gap={0.5} justifyContent="center">
                                                {crops.map(c => (
                                                    <Chip
                                                        key={c}
                                                        label={c}
                                                        size="small"
                                                        icon={<SpaIcon style={{ color: 'white', fontSize: 12 }} />}
                                                        sx={{
                                                            bgcolor: getCropColor(c),
                                                            color: 'white',
                                                            fontWeight: 'bold',
                                                            fontSize: '0.72rem'
                                                        }}
                                                    />
                                                ))}
                                            </Box>
                                        )}
                                    </TableCell>
                                    <TableCell align="center">
                                        {editingId === task.id ? (
                                            <Autocomplete
                                                freeSolo size="small" options={unitOptions}
                                                value={editUnit}
                                                onChange={(_e, v) => setEditUnit(v || '')}
                                                onInputChange={(_e, v) => setEditUnit(v || '')}
                                                renderInput={(params) => (
                                                    <TextField {...params} variant="standard"
                                                        sx={{ minWidth: 80 }} />
                                                )}
                                            />
                                        ) : (
                                            <Typography variant="body2">{task.expectedUnit || '-'}</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        {editingId === task.id ? (
                                            <Box display="flex" justifyContent="flex-end" gap={1}>
                                                <Tooltip title="Save">
                                                    <IconButton size="small" color="primary" onClick={() => handleSaveEdit(task.id)}>
                                                        <SaveIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Cancel">
                                                    <IconButton size="small" color="error" onClick={() => setEditingId(null)}>
                                                        <CloseIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        ) : (
                                            <Box display="flex" justifyContent="flex-end" gap={1}>
                                                <Tooltip title="Edit">
                                                    <IconButton size="small" onClick={() => handleEditClick(task)}>
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <IconButton color="error" size="small" onClick={() => handleDeleteTask(task.id)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        }) : (
                            <TableRow>
                                <TableCell colSpan={4} align="center">No Job Roles Configured.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
