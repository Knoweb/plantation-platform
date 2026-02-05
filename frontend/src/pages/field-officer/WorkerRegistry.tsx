import { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, IconButton, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField,
    FormControl, InputLabel, Select, MenuItem, Chip, Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import Person2Icon from '@mui/icons-material/Person2'; // Female icon
import axios from 'axios';

// Enums matching backend
const WorkerGender = { MALE: 'MALE', FEMALE: 'FEMALE' } as const;
type WorkerGender = typeof WorkerGender[keyof typeof WorkerGender];

const JobRole = {
    PLUCKER: 'PLUCKER', KANGANI: 'KANGANI', SACKCOOLI: 'SACKCOOLI',
    TRANSPORT: 'TRANSPORT', FERTILIZER: 'FERTILIZER',
    CHEMICAL_WEEDER: 'CHEMICAL_WEEDER', MANUAL_WEEDER: 'MANUAL_WEEDER',
    WATCHER: 'WATCHER', SUNDRY: 'SUNDRY', OTHER: 'OTHER'
} as const;
type JobRole = typeof JobRole[keyof typeof JobRole];

const WorkerStatus = { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE', SUSPENDED: 'SUSPENDED' } as const;
type WorkerStatus = typeof WorkerStatus[keyof typeof WorkerStatus];

interface Worker {
    id?: string;
    registrationNumber: string;
    name: string;
    gender: WorkerGender;
    jobRole: JobRole;
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

    // Form State
    const [currentWorker, setCurrentWorker] = useState<Worker>({
        registrationNumber: '',
        name: '',
        gender: WorkerGender.MALE,
        jobRole: JobRole.PLUCKER,
        epfNumber: '',
        status: WorkerStatus.ACTIVE,
        divisionIds: [],
        tenantId: tenantId
    });
    const [isEdit, setIsEdit] = useState(false);

    // Fetch Workers
    useEffect(() => {
        fetchWorkers();
    }, [tenantId]);

    const fetchWorkers = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`http://localhost:8081/api/workers?tenantId=${tenantId}`);
            setWorkers(response.data);
        } catch (error) {
            console.error("Error fetching workers", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const payload = { ...currentWorker, tenantId };

            if (isEdit && currentWorker.id) {
                await axios.put(`http://localhost:8081/api/workers/${currentWorker.id}`, payload);
            } else {
                await axios.post(`http://localhost:8081/api/workers`, payload);
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
            jobRole: JobRole.PLUCKER,
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
            await axios.delete(`http://localhost:8081/api/workers/${id}`);
            fetchWorkers();
        } catch (error) {
            console.error("Error deleting worker", error);
        }
    };

    return (
        <Box sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1a5e20' }}>
                    Worker Registry
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddNew}
                    sx={{ backgroundColor: '#1a5e20', '&:hover': { backgroundColor: '#144a19' } }}
                >
                    Add New Worker
                </Button>
            </Box>

            <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 3 }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell><strong>Reg No</strong></TableCell>
                            <TableCell><strong>Name</strong></TableCell>
                            <TableCell><strong>Role</strong></TableCell>
                            <TableCell><strong>Gender</strong></TableCell>
                            <TableCell><strong>EPF No</strong></TableCell>
                            <TableCell><strong>Status</strong></TableCell>
                            <TableCell align="right"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {workers.map((worker) => (
                            <TableRow key={worker.id} hover>
                                <TableCell>
                                    <Chip label={worker.registrationNumber} size="small" variant="outlined" />
                                </TableCell>
                                <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {worker.gender === 'MALE' ? <PersonIcon color="primary" /> : <Person2Icon color="secondary" />}
                                    {worker.name}
                                </TableCell>
                                <TableCell>{worker.jobRole}</TableCell>
                                <TableCell>{worker.gender}</TableCell>
                                <TableCell>{worker.epfNumber || '-'}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={worker.status}
                                        color={worker.status === 'ACTIVE' ? 'success' : 'default'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton size="small" onClick={() => handleEdit(worker)}><EditIcon fontSize="small" /></IconButton>
                                    <IconButton size="small" color="error" onClick={() => worker.id && handleDelete(worker.id)}><DeleteIcon fontSize="small" /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {workers.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">No workers found. Add your first worker.</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Add/Edit Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{isEdit ? "Edit Worker" : "Register New Worker"}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid xs={6}>
                            <TextField
                                label="Registration Number (e.g. 101)"
                                fullWidth
                                value={currentWorker.registrationNumber}
                                onChange={(e) => setCurrentWorker({ ...currentWorker, registrationNumber: e.target.value })}
                            />
                        </Grid>
                        <Grid xs={6}>
                            <TextField
                                label="EPF Number"
                                fullWidth
                                value={currentWorker.epfNumber}
                                onChange={(e) => setCurrentWorker({ ...currentWorker, epfNumber: e.target.value })}
                            />
                        </Grid>
                        <Grid xs={12}>
                            <TextField
                                label="Full Name"
                                fullWidth
                                value={currentWorker.name}
                                onChange={(e) => setCurrentWorker({ ...currentWorker, name: e.target.value })}
                            />
                        </Grid>

                        <Grid xs={6}>
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
                        </Grid>
                        <Grid xs={6}>
                            <FormControl fullWidth>
                                <InputLabel>Job Role</InputLabel>
                                <Select
                                    value={currentWorker.jobRole}
                                    label="Job Role"
                                    onChange={(e) => setCurrentWorker({ ...currentWorker, jobRole: e.target.value as JobRole })}
                                >
                                    {Object.values(JobRole).map((role) => (
                                        <MenuItem key={role} value={role}>{role}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={currentWorker.status}
                                    label="Status"
                                    onChange={(e) => setCurrentWorker({ ...currentWorker, status: e.target.value as WorkerStatus })}
                                >
                                    <MenuItem value={WorkerStatus.ACTIVE}>Active</MenuItem>
                                    <MenuItem value={WorkerStatus.INACTIVE}>Inactive</MenuItem>
                                    <MenuItem value={WorkerStatus.SUSPENDED}>Suspended</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained" color="primary">Save Worker</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
