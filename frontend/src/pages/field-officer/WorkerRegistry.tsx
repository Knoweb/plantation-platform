import { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, IconButton, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField,
    FormControl, InputLabel, Select, MenuItem, Chip,
    Tabs, Tab, Snackbar, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import GroupsIcon from '@mui/icons-material/Groups';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import axios from 'axios';

// Enums matching backend
const WorkerGender = { MALE: 'MALE', FEMALE: 'FEMALE' } as const;
type WorkerGender = typeof WorkerGender[keyof typeof WorkerGender];

const WorkerStatus = { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE', SUSPENDED: 'SUSPENDED', PENDING_APPROVAL: 'PENDING_APPROVAL' } as const;
type WorkerStatus = typeof WorkerStatus[keyof typeof WorkerStatus];

interface Worker {
    id?: string;
    registrationNumber: string;
    name: string;
    gender: WorkerGender;
    epfNumber: string;
    employmentType: string; // PERMANENT, CASUAL, CONTRACT
    contractorName?: string;
    registeredDate?: string;
    nicNumber?: string;
    dateOfBirth?: string;
    status: WorkerStatus;
    divisionIds: string[];
    tenantId: string;
}

export default function WorkerRegistry() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;
    const userRole = userSession.role;

    const [workers, setWorkers] = useState<Worker[]>([]);
    const [, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const today = new Date();
    const defaultDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const [filterDate, setFilterDate] = useState<string>(defaultDate);

    const [openBulkDialog, setOpenBulkDialog] = useState(false);
    const [bulkContractorName, setBulkContractorName] = useState('');
    const [bulkWorkerNames, setBulkWorkerNames] = useState<string[]>(['']);

    const [currentWorker, setCurrentWorker] = useState<Worker>({
        registrationNumber: '',
        name: '',
        gender: WorkerGender.MALE,
        epfNumber: '',
        employmentType: 'PERMANENT',
        contractorName: '',
        nicNumber: '',
        dateOfBirth: '',
        status: WorkerStatus.ACTIVE,
        divisionIds: [],
        tenantId: tenantId
    });
    const [isEdit, setIsEdit] = useState(false);

    const [confirmDialog, setConfirmDialog] = useState<{ open: boolean, title: string, message: string, onConfirm: () => void }>({
        open: false, title: '', message: '', onConfirm: () => { }
    });
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' | 'warning' | 'info' }>({
        open: false, message: '', severity: 'info'
    });

    const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setSnackbar({ open: true, message, severity });
    };

    useEffect(() => {
        if (tenantId) {
            fetchWorkers();
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

    const handleSave = async () => {
        if (!currentWorker.registrationNumber?.trim()) {
            showSnackbar("Registration Number is required.", "warning");
            return;
        }

        const isDuplicate = workers.some(w =>
            w.registrationNumber?.toLowerCase() === currentWorker.registrationNumber.trim().toLowerCase() &&
            w.id !== currentWorker.id
        );

        if (isDuplicate) {
            showSnackbar(`A worker with Registration Number '${currentWorker.registrationNumber}' already exists!`, "error");
            return;
        }

        try {
            const payload = { ...currentWorker, tenantId };

            // Clean empty strings so Java Jackson parser doesn't crash on LocalDate
            if (!payload.dateOfBirth) delete payload.dateOfBirth;

            if (isEdit && currentWorker.id) {
                await axios.put(`/api/workers/${currentWorker.id}`, payload);
            } else {
                await axios.post(`/api/workers`, payload);
            }
            setOpenDialog(false);
            fetchWorkers();
            showSnackbar("Worker saved successfully!", "success");
        } catch (error: any) {
            console.error("Error saving worker", error);
            showSnackbar("Failed to save worker: " + (error.response?.data || error.message), "error");
        }
    };

    const handleEdit = (worker: Worker) => {
        setCurrentWorker(worker);
        setIsEdit(true);
        setOpenDialog(true);
    };

    const handleAddNew = () => {
        const currentDate = new Date();
        const yy = currentDate.getFullYear().toString().slice(-2);
        const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
        const prefix = `CN-${yy}${mm}`;
        const todayCount = workers.filter(w => w.registrationNumber?.startsWith(prefix)).length;
        const sequenceNumber = String(todayCount + 1).padStart(3, '0');

        setCurrentWorker({
            registrationNumber: activeTab === 1 ? `${prefix}${sequenceNumber}` : '',
            name: '',
            gender: WorkerGender.MALE,
            epfNumber: '',
            employmentType: activeTab === 0 ? 'PERMANENT' : 'CONTRACT',
            contractorName: '',
            nicNumber: '',
            dateOfBirth: '',
            status: userRole === 'CHIEF_CLERK' ? WorkerStatus.PENDING_APPROVAL : WorkerStatus.ACTIVE,
            divisionIds: [],
            tenantId: tenantId
        });
        setIsEdit(false);
        setOpenDialog(true);
    };

    const handleDelete = async (id: string) => {
        setConfirmDialog({
            open: true,
            title: 'Delete Worker',
            message: 'Are you sure you want to delete this worker?',
            onConfirm: async () => {
                setConfirmDialog({ ...confirmDialog, open: false });
                try {
                    await axios.delete(`/api/workers/${id}`);
                    fetchWorkers();
                    showSnackbar("Worker deleted successfully", "success");
                } catch (error) {
                    console.error("Error deleting worker", error);
                    showSnackbar("Failed to delete worker", "error");
                }
            }
        });
    };

    const handleApprove = async (worker: Worker) => {
        setConfirmDialog({
            open: true,
            title: 'Approve Worker',
            message: `Are you sure you want to approve worker ${worker.name}?`,
            onConfirm: async () => {
                setConfirmDialog({ ...confirmDialog, open: false });
                try {
                    await axios.put(`/api/workers/${worker.id}`, { ...worker, status: WorkerStatus.ACTIVE });
                    fetchWorkers();
                    showSnackbar(`Worker ${worker.name} fully approved!`, "success");
                } catch (error) {
                    console.error("Error approving worker", error);
                    showSnackbar("Failed to approve worker.", "error");
                }
            }
        });
    };

    const handleReject = async (worker: Worker) => {
        setConfirmDialog({
            open: true,
            title: 'Reject Worker',
            message: `Are you sure you want to REJECT worker ${worker.name}?\nThis cannot be undone.`,
            onConfirm: async () => {
                setConfirmDialog({ ...confirmDialog, open: false });
                try {
                    await axios.delete(`/api/workers/${worker.id}`);
                    fetchWorkers();
                    showSnackbar(`Worker ${worker.name} was rejected.`, "info");
                } catch (error) {
                    console.error("Error rejecting worker", error);
                    showSnackbar("Failed to reject worker.", "error");
                }
            }
        });
    };

    const handleBulkSubmit = async () => {
        const validNames = bulkWorkerNames.filter(name => name.trim() !== '');
        if (!bulkContractorName || validNames.length === 0) return;

        const currentDate = new Date();
        const yy = currentDate.getFullYear().toString().slice(-2);
        const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
        const prefix = `CN-${yy}${mm}`;
        const todayCount = workers.filter(w => w.registrationNumber?.startsWith(prefix)).length;

        const requests = [];
        for (let i = 0; i < validNames.length; i++) {
            const sequenceNumber = String(todayCount + 1 + i).padStart(3, '0');
            const newRegNo = `${prefix}${sequenceNumber}`;
            const payload = {
                registrationNumber: newRegNo,
                name: validNames[i],
                gender: WorkerGender.MALE,
                epfNumber: '',
                employmentType: 'CONTRACT',
                contractorName: bulkContractorName,
                nicNumber: '',
                status: userRole === 'CHIEF_CLERK' ? WorkerStatus.PENDING_APPROVAL : WorkerStatus.ACTIVE,
                divisionIds: [],
                tenantId: tenantId
            };
            // Note: Sending multiple POST requests directly. For robust scaling, a backend bulk API is recommended but this works perfectly for ~100 requests.
            requests.push(axios.post(`/api/workers`, payload));
        }

        try {
            setLoading(true);
            await Promise.all(requests);
            setOpenBulkDialog(false);
            setBulkContractorName('');
            setBulkWorkerNames(['']);
            fetchWorkers();
            showSnackbar(`${requests.length} bulk workers registered successfully!`, "success");
        } catch (error) {
            console.error("Error in bulk registration", error);
            showSnackbar("Failed to bulk register workers.", "error");
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1a5e20' }}>
                    Worker Registry
                </Typography>
                <Box display="flex" gap={2}>
                    {activeTab === 1 && (
                        <TextField
                            label="Filter by Date"
                            type="date"
                            size="small"
                            InputLabelProps={{ shrink: true }}
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                        />
                    )}
                    <Button
                        variant="contained"
                        startIcon={activeTab === 1 ? <GroupsIcon /> : <AddIcon />}
                        onClick={() => activeTab === 1 ? setOpenBulkDialog(true) : handleAddNew()}
                        sx={{ backgroundColor: '#1a5e20', '&:hover': { backgroundColor: '#144a19' } }}
                    >
                        Add workers
                    </Button>
                </Box>
            </Box>

            <Paper sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, val) => setActiveTab(val)}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="fullWidth"
                    sx={{
                        '& .MuiTab-root': {
                            py: 2,
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            textTransform: 'none',
                        },
                        '& .Mui-selected': {
                            backgroundColor: '#e8f5e9', // Light green background for selected
                            color: '#1b5e20',
                        }
                    }}
                >
                    <Tab icon={<GroupsIcon />} iconPosition="start" label="Estate Workers (Permanent / Casual)" />
                    <Tab icon={<Diversity3Icon />} iconPosition="start" label="Day Contract Workers" />
                </Tabs>
            </Paper>

            <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 3 }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell><strong>Reg No</strong></TableCell>
                            <TableCell><strong>Name</strong></TableCell>
                            {activeTab === 0 && <TableCell><strong>Emp. Type</strong></TableCell>}
                            {activeTab === 1 && <>
                                <TableCell><strong>Contractor Name</strong></TableCell>
                                <TableCell><strong>Registered Date</strong></TableCell>
                            </>}
                            {activeTab === 0 && <TableCell><strong>Gender</strong></TableCell>}
                            <TableCell><strong>Status</strong></TableCell>
                            <TableCell align="right"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {workers
                            .filter(w => activeTab === 0 ? w.employmentType !== 'CONTRACT' : w.employmentType === 'CONTRACT')
                            .filter(w => (activeTab === 1 && filterDate) ? w.registeredDate === filterDate : true)
                            .map((worker) => (
                                <TableRow key={worker.id}>
                                    <TableCell>{worker.registrationNumber}</TableCell>
                                    <TableCell>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <PersonIcon color={worker.gender === 'MALE' ? 'primary' : 'secondary'} />
                                            {worker.name}
                                        </Box>
                                    </TableCell>
                                    {activeTab === 0 && (
                                        <TableCell>
                                            <Chip
                                                label={worker.employmentType || 'PERMANENT'}
                                                size="small"
                                                color={
                                                    worker.employmentType === 'PERMANENT' ? 'primary' : 'warning'
                                                }
                                            />
                                        </TableCell>
                                    )}
                                    {activeTab === 1 && <>
                                        <TableCell>{worker.contractorName || 'N/A'}</TableCell>
                                        <TableCell>{worker.registeredDate || 'N/A'}</TableCell>
                                    </>}
                                    {activeTab === 0 && <TableCell>{worker.gender}</TableCell>}
                                    <TableCell>
                                        <Chip
                                            label={worker.status === 'PENDING_APPROVAL' ? 'PENDING' : worker.status}
                                            color={worker.status === 'ACTIVE' ? 'success' : worker.status === 'PENDING_APPROVAL' ? 'warning' : 'default'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        {userRole === 'MANAGER' && worker.status === 'PENDING_APPROVAL' && (
                                            <>
                                                <Button
                                                    variant="contained"
                                                    color="success"
                                                    size="small"
                                                    style={{ marginRight: 8 }}
                                                    onClick={() => handleApprove(worker)}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    variant="contained"
                                                    color="error"
                                                    size="small"
                                                    style={{ marginRight: 8 }}
                                                    onClick={() => handleReject(worker)}
                                                >
                                                    Reject
                                                </Button>
                                            </>
                                        )}
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
                        <FormControl fullWidth>
                            <InputLabel>Employment Tier</InputLabel>
                            <Select
                                value={currentWorker.employmentType}
                                label="Employment Tier"
                                onChange={(e) => setCurrentWorker({ ...currentWorker, employmentType: e.target.value })}
                            >
                                {activeTab === 0 ? [
                                    <MenuItem key="PERMANENT" value="PERMANENT">Permanent (EPF/ETF Applicable)</MenuItem>,
                                    <MenuItem key="CASUAL" value="CASUAL">Casual (6-Month Probation)</MenuItem>
                                ] : [
                                    <MenuItem key="CONTRACT" value="CONTRACT">Contract (Daily Wage / Contractor List)</MenuItem>
                                ]}
                            </Select>
                        </FormControl>

                        {activeTab === 0 && (
                            <TextField
                                label="Registration Number"
                                fullWidth
                                value={currentWorker.registrationNumber}
                                onChange={(e) => setCurrentWorker({ ...currentWorker, registrationNumber: e.target.value })}
                            />
                        )}
                        <TextField
                            label="Worker Name"
                            fullWidth
                            value={currentWorker.name}
                            onChange={(e) => setCurrentWorker({ ...currentWorker, name: e.target.value })}
                        />
                        {activeTab === 0 && (
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
                        )}

                        {currentWorker.employmentType === 'PERMANENT' && (
                            <TextField
                                label="EPF Number"
                                fullWidth
                                value={currentWorker.epfNumber}
                                onChange={(e) => setCurrentWorker({ ...currentWorker, epfNumber: e.target.value })}
                            />
                        )}

                        {(currentWorker.employmentType === 'CASUAL' || currentWorker.employmentType === 'PERMANENT') && (
                            <>
                                <TextField
                                    label="NIC Number"
                                    fullWidth
                                    value={currentWorker.nicNumber || ''}
                                    onChange={(e) => setCurrentWorker({ ...currentWorker, nicNumber: e.target.value })}
                                />
                                <TextField
                                    label="Date of Birth"
                                    type="date"
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    value={currentWorker.dateOfBirth || ''}
                                    onChange={(e) => setCurrentWorker({ ...currentWorker, dateOfBirth: e.target.value })}
                                />
                            </>
                        )}

                        {currentWorker.employmentType === 'CONTRACT' && (
                            <TextField
                                label="Contractor / Supplier Name"
                                fullWidth
                                value={currentWorker.contractorName}
                                onChange={(e) => setCurrentWorker({ ...currentWorker, contractorName: e.target.value })}
                            />
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained" disabled={!currentWorker.name || !currentWorker.registrationNumber}>Save</Button>
                </DialogActions>
            </Dialog>

            {/* Bulk Add Dialog */}
            <Dialog open={openBulkDialog} onClose={() => setOpenBulkDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Bulk Register Contract Workers</DialogTitle>
                <DialogContent dividers>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <TextField
                            label="Contractor Name"
                            fullWidth
                            value={bulkContractorName}
                            onChange={(e) => setBulkContractorName(e.target.value)}
                        />
                        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Worker Names</Typography>
                        {bulkWorkerNames.map((name, index) => (
                            <Box key={index} display="flex" gap={1}>
                                <TextField
                                    label={`Worker ${index + 1} Name`}
                                    fullWidth
                                    size="small"
                                    value={name}
                                    onChange={(e) => {
                                        const newNames = [...bulkWorkerNames];
                                        newNames[index] = e.target.value;
                                        setBulkWorkerNames(newNames);
                                    }}
                                />
                                <IconButton
                                    color="error"
                                    onClick={() => {
                                        const newNames = bulkWorkerNames.filter((_, i) => i !== index);
                                        setBulkWorkerNames(newNames.length ? newNames : ['']);
                                    }}
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </Box>
                        ))}
                        <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={() => setBulkWorkerNames([...bulkWorkerNames, ''])}
                            sx={{ alignSelf: 'flex-start', mt: 1 }}
                        >
                            Add Worker Name
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenBulkDialog(false)}>Cancel</Button>
                    <Button
                        onClick={handleBulkSubmit}
                        variant="contained"
                        disabled={!bulkContractorName || !bulkWorkerNames.some(n => n.trim() !== '')}
                    >
                        Save Workers
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Global Confirm Dialog */}
            <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}>
                <DialogTitle>{confirmDialog.title}</DialogTitle>
                <DialogContent>
                    <Typography>{confirmDialog.message}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>Cancel</Button>
                    <Button variant="contained" color="primary" onClick={confirmDialog.onConfirm}>Confirm</Button>
                </DialogActions>
            </Dialog>

            {/* Global Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
