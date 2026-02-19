import { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, IconButton, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField,
    FormControl, InputLabel, Select, MenuItem, Chip, Grid,
    List, ListItem, ListItemText, ListItemSecondaryAction
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import Person2Icon from '@mui/icons-material/Person2'; // Female icon
import SettingsIcon from '@mui/icons-material/Settings'; // New Icon
import axios from 'axios';

// Enums matching backend
const WorkerGender = { MALE: 'MALE', FEMALE: 'FEMALE' } as const;
type WorkerGender = typeof WorkerGender[keyof typeof WorkerGender];

const WorkerStatus = { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE', SUSPENDED: 'SUSPENDED' } as const;
type WorkerStatus = typeof WorkerStatus[keyof typeof WorkerStatus];

interface Worker {
    id?: string;
    registrationNumber: string;
    name: string;
    gender: WorkerGender;
    jobRole: string; // Changed to string
    epfNumber: string;
    status: WorkerStatus;
    divisionIds: string[];
    tenantId: string;
}

export default function WorkerRegistry() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    const [workers, setWorkers] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);

    // Dynamic Roles
    const [jobRoles, setJobRoles] = useState<string[]>([]);
    const [openManageRoles, setOpenManageRoles] = useState(false);
    const [newRole, setNewRole] = useState('');
    const [roleLoading, setRoleLoading] = useState(false);

    // Form State
    const [currentWorker, setCurrentWorker] = useState<Worker>({
        registrationNumber: '',
        name: '',
        gender: WorkerGender.MALE,
        jobRole: 'Plucking', // Default fallback
        epfNumber: '',
        status: WorkerStatus.ACTIVE,
        divisionIds: [],
        tenantId: tenantId
    });
    const [isEdit, setIsEdit] = useState(false);

    // Fetch Workers and Roles
    useEffect(() => {
        if (tenantId) {
            fetchWorkers();
            fetchJobRoles();
        }
    }, [tenantId]);

    const fetchWorkers = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/workers?tenantId=${tenantId}`);
            setWorkers(response.data);
        } catch (error) {
            console.error("Error fetching workers", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchJobRoles = async () => {
        try {
            const taskRes = await axios.get(`/api/tenants/task-types?tenantId=${tenantId}`);
            let tasks = taskRes.data.map((t: any) => t.name);
            if (tasks.length === 0) tasks = ['Plucking', 'Sundry', 'Other'];
            setJobRoles(tasks);
        } catch (e) {
            console.error("Failed to fetch roles", e);
        }
    };

    const handleSave = async () => {
        try {
            const payload = { ...currentWorker, tenantId };

            if (isEdit && currentWorker.id) {
                await axios.put(`/api/workers/${currentWorker.id}`, payload);
            } else {
                await axios.post(`/api/workers`, payload);
            }
            setOpenDialog(false);
            fetchWorkers();
        } catch (error) {
            console.error("Error saving worker", error);
            alert("Failed to save worker. Check console.");
        }
    };

    const handleEdit = (worker: Worker) => {
        setCurrentWorker(worker);
        setIsEdit(true);
        setOpenDialog(true);
    };

    const handleAddNew = () => {
        setCurrentWorker({
            registrationNumber: '',
            name: '',
            gender: WorkerGender.MALE,
            jobRole: jobRoles.length > 0 ? jobRoles[0] : 'Plucking',
            epfNumber: '',
            status: WorkerStatus.ACTIVE,
            divisionIds: [],
            tenantId: tenantId
        });
        setIsEdit(false);
        setOpenDialog(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this worker?")) return;
        try {
            await axios.delete(`/api/workers/${id}`);
            fetchWorkers();
        } catch (error) {
            console.error("Error deleting worker", error);
        }
    };

    // Role Management
    const handleAddRole = async () => {
        if (!newRole.trim()) return;
        setRoleLoading(true);
        try {
            await axios.post(`/api/tenants/task-types?tenantId=${tenantId}`, newRole, {
                headers: { 'Content-Type': 'text/plain' }
            });
            setNewRole('');
            fetchJobRoles(); // Refresh
        } catch (e) {
            console.error("Failed to add role", e);
        }
        setRoleLoading(false);
    };

    const handleDeleteRole = async (roleName: string) => {
        try {
            const allRes = await axios.get(`/api/tenants/task-types?tenantId=${tenantId}`);
            const taskObj = allRes.data.find((t: any) => t.name === roleName);
            if (taskObj) {
                await axios.delete(`/api/tenants/task-types/${taskObj.id}`);
                fetchJobRoles();
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <Box sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1a5e20' }}>
                    Worker Registry
                </Typography>
                <Box display="flex" gap={2}>
                    <Button
                        variant="outlined"
                        startIcon={<SettingsIcon />}
                        onClick={() => setOpenManageRoles(true)}
                    >
                        Manage Roles
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleAddNew}
                        sx={{ backgroundColor: '#1a5e20', '&:hover': { backgroundColor: '#144a19' } }}
                    >
                        Add New Worker
                    </Button>
                </Box>
            </Box>

            <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 3 }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell><strong>Reg No</strong></TableCell>
                            <TableCell><strong>Name</strong></TableCell>
                            <TableCell><strong>Role</strong></TableCell>
                            <TableCell><strong>Gender</strong></TableCell>
                            <TableCell><strong>Status</strong></TableCell>
                            <TableCell align="right"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {workers.map((worker) => (
                            <TableRow key={worker.registrationNumber}>
                                <TableCell>{worker.registrationNumber}</TableCell>
                                <TableCell>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <PersonIcon color={worker.gender === 'MALE' ? 'primary' : 'secondary'} />
                                        {worker.name}
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Chip label={worker.jobRole} size="small" variant="outlined" />
                                </TableCell>
                                <TableCell>{worker.gender}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={worker.status}
                                        color={worker.status === 'ACTIVE' ? 'success' : 'default'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton size="small" onClick={() => handleEdit(worker)}><EditIcon /></IconButton>
                                    <IconButton size="small" color="error" onClick={() => worker.id && handleDelete(worker.id)}><DeleteIcon /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Worker Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{isEdit ? 'Edit Worker' : 'New Worker'}</DialogTitle>
                <DialogContent>
                    <Box display="grid" gap={2} mt={1}>
                        <TextField
                            label="Registration Number"
                            fullWidth
                            value={currentWorker.registrationNumber}
                            onChange={(e) => setCurrentWorker({ ...currentWorker, registrationNumber: e.target.value })}
                        />
                        <TextField
                            label="Full Name"
                            fullWidth
                            value={currentWorker.name}
                            onChange={(e) => setCurrentWorker({ ...currentWorker, name: e.target.value })}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Gender</InputLabel>
                            <Select
                                value={currentWorker.gender}
                                label="Gender"
                                onChange={(e) => setCurrentWorker({ ...currentWorker, gender: e.target.value as WorkerGender })}
                            >
                                <MenuItem value={WorkerGender.MALE}>Male</MenuItem>
                                <MenuItem value={WorkerGender.FEMALE}>Female</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Job Role</InputLabel>
                            <Select
                                value={currentWorker.jobRole}
                                label="Job Role"
                                onChange={(e) => setCurrentWorker({ ...currentWorker, jobRole: e.target.value })}
                            >
                                {jobRoles.map(role => (
                                    <MenuItem key={role} value={role}>{role}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="EPF Number"
                            fullWidth
                            value={currentWorker.epfNumber}
                            onChange={(e) => setCurrentWorker({ ...currentWorker, epfNumber: e.target.value })}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained" disabled={!currentWorker.name || !currentWorker.registrationNumber}>Save</Button>
                </DialogActions>
            </Dialog>

            {/* Manage Roles Dialog */}
            <Dialog open={openManageRoles} onClose={() => setOpenManageRoles(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Manage Job Roles / Tasks</DialogTitle>
                <DialogContent>
                    <Box display="flex" gap={1} mb={2} mt={1}>
                        <TextField
                            label="New Job Role"
                            fullWidth
                            size="small"
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                        />
                        <Button variant="contained" onClick={handleAddRole} disabled={roleLoading} startIcon={<AddIcon />}>
                            Add
                        </Button>
                    </Box>
                    <List dense sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid #eee', borderRadius: 1 }}>
                        {jobRoles.map(role => (
                            <ListItem key={role}>
                                <ListItemText primary={role} />
                                <ListItemSecondaryAction>
                                    <IconButton edge="end" size="small" onClick={() => handleDeleteRole(role)}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenManageRoles(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
