import { Box, Typography, Paper, TextField, Button, Grid, MenuItem, Alert, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Select, Tooltip, Autocomplete } from '@mui/material';
import { useState, useEffect } from 'react';
import axios from 'axios';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';

export default function TaskTypeSettings() {
    const [taskTypes, setTaskTypes] = useState<any[]>([]);
    const [newTaskName, setNewTaskName] = useState('');
    const [newTaskUnit, setNewTaskUnit] = useState<string>('Kg');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editUnit, setEditUnit] = useState<string>('');

    const unitOptions = ['Kg', 'Acres', 'SqFt', 'Taps', 'Liters', 'Days', 'Task', 'None'];

    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    useEffect(() => {
        fetchTaskTypes();
    }, [tenantId]);

    const fetchTaskTypes = async () => {
        try {
            const res = await axios.get(`/api/operations/task-types?tenantId=${tenantId}`);
            setTaskTypes(res.data);
        } catch (error) {
            console.error("Failed to fetch task types");
        }
    };

    const handleCreateTask = async () => {
        if (!newTaskName.trim()) return;
        try {
            await axios.post(`/api/operations/task-types?tenantId=${tenantId}`, {
                name: newTaskName.trim(),
                unit: newTaskUnit
            });
            setNewTaskName('');
            fetchTaskTypes();
        } catch (err) {
            console.error("Failed to create task");
        }
    };

    const handleDeleteTask = async (id: string) => {
        if (!window.confirm("Are you sure you want to completely remove this job role/task type?")) return;
        try {
            await axios.delete(`/api/operations/task-types/${id}`);
            fetchTaskTypes();
        } catch (err) {
            console.error("Failed to delete task");
        }
    };

    const handleUpdateUnit = async (id: string) => {
        try {
            await axios.put(`/api/operations/task-types/${id}/unit`, { unit: editUnit });
            setEditingId(null);
            fetchTaskTypes();
        } catch (err) {
            console.error("Failed to update unit");
        }
    };

    const handleEditClick = (task: any) => {
        setEditingId(task.id);
        setEditUnit(task.expectedUnit || 'Kg');
    };

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ color: '#1b5e20', mb: 2 }}>
                Job Roles & Task Types
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Manage the specific daily operational jobs available in your estate (e.g., Plucking, Tapping, Weeding). These will appear across the system for workers.
            </Typography>

            <Paper sx={{ p: 4, borderRadius: 3, mb: 4, maxWidth: 600 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Add New Job Role / Task</Typography>
                <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, md: 5 }}>
                        <TextField
                            fullWidth
                            variant="outlined"
                            label="Role/Task Name (e.g., Pineapple Harvester)"
                            value={newTaskName}
                            onChange={(e) => setNewTaskName(e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Autocomplete
                            freeSolo
                            options={unitOptions}
                            value={newTaskUnit}
                            onChange={(e, newValue) => setNewTaskUnit(newValue || '')}
                            onInputChange={(e, newInputValue) => setNewTaskUnit(newInputValue || '')}
                            renderInput={(params) => (
                                <TextField {...params} label="Measurement Unit" variant="outlined" fullWidth />
                            )}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                        <Button
                            variant="contained"
                            fullWidth
                            size="large"
                            onClick={handleCreateTask}
                            disabled={!newTaskName.trim()}
                            startIcon={<AddIcon />}
                            sx={{ height: 56, bgcolor: '#f57c00' }}
                        >
                            Add Role
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            <TableContainer component={Paper} elevation={2} sx={{ maxWidth: 800 }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell><strong>Task / Role Name</strong></TableCell>
                            <TableCell align="center"><strong>Unit (Edit)</strong></TableCell>
                            <TableCell align="right"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {taskTypes.length > 0 ? taskTypes.map((task) => (
                            <TableRow key={task.id} hover>
                                <TableCell sx={{ fontWeight: 500 }}>{task.name}</TableCell>
                                <TableCell align="center">
                                    {editingId === task.id ? (
                                        <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                                            <Autocomplete
                                                freeSolo
                                                size="small"
                                                options={unitOptions}
                                                value={editUnit}
                                                onChange={(e, newValue) => setEditUnit(newValue || '')}
                                                onInputChange={(e, newInputValue) => setEditUnit(newInputValue || '')}
                                                renderInput={(params) => (
                                                    <TextField {...params} variant="standard" InputProps={{ ...params.InputProps, disableUnderline: true }} sx={{ minWidth: 100, textAlign: 'center', bgcolor: '#eee', px: 1, borderRadius: 1 }} />
                                                )}
                                                sx={{ minWidth: 100 }}
                                            />
                                            <Tooltip title="Save Unit">
                                                <IconButton size="small" color="primary" onClick={() => handleUpdateUnit(task.id)}>
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
                                        <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                                            <Typography>{task.expectedUnit || '-'}</Typography>
                                            <Tooltip title="Edit Unit">
                                                <IconButton size="small" sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }} onClick={() => handleEditClick(task)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    )}
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton color="error" onClick={() => handleDeleteTask(task.id)}>
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={3} align="center">No Job Roles Configured.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
