import { useState, useEffect, useRef } from 'react';
import {
    Box, Paper, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, IconButton, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField,
    FormControl, InputLabel, Select, MenuItem, Chip,
    Tabs, Tab, Snackbar, Alert, Checkbox, FormControlLabel, FormGroup
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import GroupsIcon from '@mui/icons-material/Groups';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import SpaIcon from '@mui/icons-material/Spa';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
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
    etfNumber?: string;
    employmentType: string; // PERMANENT, CASUAL, CONTRACT
    contractorName?: string;
    registeredDate?: string;
    joinedDate?: string;
    nicNumber?: string;
    dateOfBirth?: string;
    status: WorkerStatus;
    divisionIds: string[];
    tenantId: string;
}

const WheelColumn = ({ items, selected, onChangeItem, width, open }: any) => {
    const ref = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<any>(null);

    // Auto-scroll on mount if the dialog opens
    useEffect(() => {
        if (open && ref.current) {
            const idx = items.indexOf(selected);
            if (idx !== -1) {
                ref.current.scrollTop = idx * 50;
            }
        }
    }, [open]); // Note: only depends on open state to prevent resnapping while user is actively scrolling

    // Snap logic: User swiping/scrolling updates the state
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            const index = Math.round(target.scrollTop / 50);
            if (index >= 0 && index < items.length) {
                const newValue = items[index];
                if (newValue !== selected) {
                    onChangeItem(newValue);
                }
            }
        }, 100); // Throttles scroll to prevent fighting the user
    };

    const handleItemClick = (opt: any, index: number) => {
        onChangeItem(opt);
        if (ref.current) {
            ref.current.scrollTo({ top: index * 50, behavior: 'smooth' });
        }
    };

    return (
        <Box
            ref={ref}
            onScroll={handleScroll}
            sx={{
                height: 150, width, overflowY: 'auto',
                scrollSnapType: 'y mandatory', scrollBehavior: 'smooth',
                msOverflowStyle: 'none', scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' }
            }}>
            <Box sx={{ height: 50, scrollSnapAlign: 'start' }} /> {/* Padding to allow centering first item */}
            {items.map((opt: any, index: number) => (
                <Box key={opt}
                    onClick={() => handleItemClick(opt, index)}
                    sx={{
                        height: 50, scrollSnapAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: selected === opt ? 'bold' : 'normal',
                        fontSize: selected === opt ? '1.2rem' : '1rem',
                        color: selected === opt ? 'primary.main' : 'text.disabled',
                        cursor: 'pointer', transition: 'all 0.2s',
                        '&:hover': { color: 'primary.light' }
                    }}>
                    {opt}
                </Box>
            ))}
            <Box sx={{ height: 50, scrollSnapAlign: 'end' }} /> {/* Padding to allow centering last item */}
        </Box>
    )
}

const WheelDatePicker = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => {
    const [open, setOpen] = useState(false);

    const dateObj = value ? new Date(value) : new Date();
    const [year, setYear] = useState(dateObj.getFullYear());
    const [month, setMonth] = useState(dateObj.getMonth() + 1); // 1-12
    const [day, setDay] = useState(dateObj.getDate());

    // reset to initial when dialog opens
    useEffect(() => {
        if (open) {
            const d = value ? new Date(value) : new Date();
            setYear(d.getFullYear());
            setMonth(d.getMonth() + 1);
            setDay(d.getDate());
        }
    }, [open, value]);

    const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - 80 + i);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    // Recalculate days directly based on current selected month/year
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const handleConfirm = () => {
        const mm = month.toString().padStart(2, '0');

        // Ensure day is valid for the newly selected month
        const validDay = day > daysInMonth ? daysInMonth : day;
        const dd = validDay.toString().padStart(2, '0');

        onChange(`${year}-${mm}-${dd}`);
        setOpen(false);
    }

    return (
        <Box width="100%">
            <TextField
                label={label}
                value={value || ''}
                onClick={() => setOpen(true)}
                InputProps={{
                    readOnly: true,
                    endAdornment: <CalendarMonthIcon color="action" />
                }}
                fullWidth
            />
            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                PaperProps={{ sx: { borderRadius: 3, minWidth: 320, overflow: 'hidden' } }}
            >
                {/* MUI Style Header */}
                <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', p: 3 }}>
                    <Typography variant="overline" sx={{ opacity: 0.8, fontWeight: 'bold' }}>SELECT {label.toUpperCase()}</Typography>
                    <Typography variant="h4" fontWeight="bold">
                        {new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </Typography>
                </Box>

                <DialogContent sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'center', mb: 1, color: 'text.secondary', fontWeight: 'bold' }}>
                        <Typography sx={{ width: 80, textAlign: 'center', fontSize: '0.8rem' }}>YYYY</Typography>
                        <Typography sx={{ width: 60, textAlign: 'center', fontSize: '0.8rem' }}>MM</Typography>
                        <Typography sx={{ width: 60, textAlign: 'center', fontSize: '0.8rem' }}>DD</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, position: 'relative', height: 150, width: '100%', justifyContent: 'center' }}>
                        {/* Render active row highlight spanning all 3 columns */}
                        <Box sx={{ position: 'absolute', top: 50, left: '10%', right: '10%', height: 50, bgcolor: 'rgba(25, 118, 210, 0.1)', pointerEvents: 'none', borderRadius: 2 }} />

                        {/* Year Wheel */}
                        <Box display="flex" flexDirection="column" alignItems="center">
                            <WheelColumn open={open} items={years} selected={year} onChangeItem={setYear} width={80} />
                        </Box>

                        {/* Month Wheel */}
                        <Box display="flex" flexDirection="column" alignItems="center">
                            <WheelColumn open={open} items={months} selected={month} onChangeItem={setMonth} width={60} />
                        </Box>

                        {/* Day Wheel */}
                        <Box display="flex" flexDirection="column" alignItems="center">
                            <WheelColumn open={open} items={days} selected={day} onChangeItem={setDay} width={60} />
                        </Box>
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setOpen(false)} sx={{ fontWeight: 'bold' }}>Cancel</Button>
                    <Button variant="contained" onClick={handleConfirm} sx={{ fontWeight: 'bold', borderRadius: 2 }}>Confirm</Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
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

    const [openAddTeamDialog, setOpenAddTeamDialog] = useState(false);
    const [bulkContractorName, setBulkContractorName] = useState('');
    const [bulkWorkerNames, setBulkWorkerNames] = useState<string[]>(['']);

    const [openDailyDialog, setOpenDailyDialog] = useState(false);
    const [dailyContractor, setDailyContractor] = useState('');
    const [dailySelectedWorkers, setDailySelectedWorkers] = useState<any[]>([]);
    const [dailyNewWorkers, setDailyNewWorkers] = useState<string[]>(['']);

    const [currentWorker, setCurrentWorker] = useState<Worker>({
        registrationNumber: '',
        name: '',
        gender: WorkerGender.MALE,
        epfNumber: '',
        etfNumber: '',
        employmentType: 'PERMANENT',
        contractorName: '',
        nicNumber: '',
        dateOfBirth: '',
        joinedDate: '',
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
            etfNumber: '',
            employmentType: activeTab === 0 ? 'PERMANENT' : 'CONTRACT',
            contractorName: '',
            nicNumber: '',
            dateOfBirth: '',
            joinedDate: '',
            status: activeTab === 1 || userRole !== 'CHIEF_CLERK' ? WorkerStatus.ACTIVE : WorkerStatus.PENDING_APPROVAL,
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

    const handleAddTeamSubmit = async () => {
        const validNames = bulkWorkerNames.filter(name => name.trim() !== '');
        if (!bulkContractorName || validNames.length === 0) return;

        const currentDate = new Date();
        const yy = currentDate.getFullYear().toString().slice(-2);
        const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
        const prefix = `CTM-${yy}${mm}`;
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
                employmentType: 'CONTRACT_MEMBER',
                contractorName: bulkContractorName,
                nicNumber: '',
                status: WorkerStatus.ACTIVE,
                divisionIds: [],
                tenantId: tenantId
            };
            requests.push(axios.post(`/api/workers`, payload));
        }

        try {
            setLoading(true);
            await Promise.all(requests);
            setOpenAddTeamDialog(false);
            setBulkContractorName('');
            setBulkWorkerNames(['']);
            fetchWorkers();
            showSnackbar(`${requests.length} contractor workers saved to system!`, "success");
        } catch (error) {
            console.error("Error in bulk registration", error);
            showSnackbar("Failed to bulk register workers.", "error");
            setLoading(false);
        }
    };

    const handleDailySubmit = async () => {
        const validNewNames = dailyNewWorkers.filter(name => name.trim() !== '');
        if (!dailyContractor || (dailySelectedWorkers.length === 0 && validNewNames.length === 0)) return;

        const currentDate = new Date();
        const yy = currentDate.getFullYear().toString().slice(-2);
        const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
        const prefix = `CN-${yy}${mm}`;
        const prefixTmpl = `CTM-${yy}${mm}`;
        const todayCount = workers.filter(w => w.registrationNumber?.startsWith(prefix)).length;
        const tmplCount = workers.filter(w => w.registrationNumber?.startsWith(prefixTmpl)).length;

        const requests = [];

        // Save existing selected members for today
        for (let i = 0; i < dailySelectedWorkers.length; i++) {
            const worker = dailySelectedWorkers[i];
            const sequenceNumber = String(todayCount + 1 + i).padStart(3, '0');
            const newRegNo = `${prefix}${sequenceNumber}`;
            const payload = {
                registrationNumber: newRegNo,
                name: worker.name,
                gender: worker.gender,
                epfNumber: '',
                employmentType: 'CONTRACT',
                contractorName: worker.contractorName,
                nicNumber: worker.nicNumber,
                status: WorkerStatus.ACTIVE,
                divisionIds: [],
                tenantId: tenantId
            };
            requests.push(axios.post(`/api/workers`, payload));
        }

        // Save newly typed workers BOTH as a template AND as a daily log
        for (let i = 0; i < validNewNames.length; i++) {
            const sequenceNumLog = String(todayCount + 1 + dailySelectedWorkers.length + i).padStart(3, '0');
            const sequenceNumTmpl = String(tmplCount + 1 + i).padStart(3, '0');

            // 1. Save to System as Template
            requests.push(axios.post(`/api/workers`, {
                registrationNumber: `${prefixTmpl}${sequenceNumTmpl}`,
                name: validNewNames[i],
                gender: WorkerGender.MALE,
                epfNumber: '',
                employmentType: 'CONTRACT_MEMBER',
                contractorName: dailyContractor,
                nicNumber: '',
                status: WorkerStatus.ACTIVE,
                divisionIds: [],
                tenantId: tenantId
            }));

            // 2. Save Daily Log Record
            requests.push(axios.post(`/api/workers`, {
                registrationNumber: `${prefix}${sequenceNumLog}`,
                name: validNewNames[i],
                gender: WorkerGender.MALE,
                epfNumber: '',
                employmentType: 'CONTRACT',
                contractorName: dailyContractor,
                nicNumber: '',
                status: WorkerStatus.ACTIVE,
                divisionIds: [],
                tenantId: tenantId
            }));
        }

        try {
            setLoading(true);
            await Promise.all(requests);
            setOpenDailyDialog(false);
            setDailyContractor('');
            setDailySelectedWorkers([]);
            setDailyNewWorkers(['']);
            fetchWorkers();
            showSnackbar(`Successfully logged ${dailySelectedWorkers.length + validNewNames.length} workers!`, "success");
        } catch (error) {
            console.error("Error logging daily workers", error);
            showSnackbar("Failed to log daily workers.", "error");
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
                    {userRole === 'CHIEF_CLERK' && (
                        <>
                            {activeTab === 1 && (
                                <Button
                                    variant="outlined"
                                    startIcon={<Diversity3Icon />}
                                    onClick={() => setOpenAddTeamDialog(true)}
                                    sx={{ color: '#1a5e20', borderColor: '#1a5e20', '&:hover': { backgroundColor: '#e8f5e9', borderColor: '#144a19' } }}
                                >
                                    Add Contractor
                                </Button>
                            )}
                            <Button
                                variant="contained"
                                startIcon={activeTab === 1 ? <GroupsIcon /> : <AddIcon />}
                                onClick={() => activeTab === 1 ? setOpenDailyDialog(true) : handleAddNew()}
                                sx={{ backgroundColor: '#1a5e20', '&:hover': { backgroundColor: '#144a19' } }}
                            >
                                {activeTab === 1 ? "Log Daily Attendance" : "Add workers"}
                            </Button>
                        </>
                    )}
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
                            .filter(w => {
                                const isPending = w.status === 'PENDING_APPROVAL' && w.employmentType !== 'CONTRACT_MEMBER';
                                const userCanApprove = userRole === 'MANAGER' || userRole === 'MANAGER_CLERK';

                                if (activeTab === 0) {
                                    if (w.employmentType === 'PERMANENT' || w.employmentType === 'CASUAL') return true;
                                    if (userCanApprove && isPending && w.employmentType !== 'CONTRACT') return true;
                                    return false;
                                }
                                if (activeTab === 1) {
                                    if (w.employmentType === 'CONTRACT') return true;
                                    if (userCanApprove && isPending && w.employmentType === 'CONTRACT') return true;
                                    return false;
                                }
                                return false;
                            })
                            .filter(w => {
                                const isPending = w.status === 'PENDING_APPROVAL';
                                const userCanApprove = userRole === 'MANAGER' || userRole === 'MANAGER_CLERK';

                                if (activeTab === 1) {
                                    if (userCanApprove && isPending) return true; // Always show pending contract workers
                                    if (filterDate) return w.registeredDate === filterDate; // Otherwise rely on the date filter
                                    return true; // If no active filterDate, show everything
                                }
                                return true;
                            })
                            .sort((a, b) => {
                                // Put PERMANENT workers at the top for tab 0
                                if (activeTab === 0) {
                                    if (a.employmentType === 'PERMANENT' && b.employmentType !== 'PERMANENT') return -1;
                                    if (a.employmentType !== 'PERMANENT' && b.employmentType === 'PERMANENT') return 1;

                                    // Secondary sort by registration number ascending if both are the same type
                                    return (a.registrationNumber || '').localeCompare(b.registrationNumber || '');
                                }
                                return 0;
                            })
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
                                                    worker.employmentType === 'PERMANENT' ? 'success' : (worker.employmentType === 'CASUAL' ? 'info' : 'secondary')
                                                }
                                                sx={{ mr: 1 }}
                                            />
                                            {worker.employmentType === 'PERMANENT' && worker.joinedDate && (
                                                (new Date().getTime() - new Date(worker.joinedDate).getTime()) / (1000 * 60 * 60 * 24 * 365) >= 5
                                            ) && (
                                                    <Chip
                                                        label="Gratuity Eligible"
                                                        size="small"
                                                        color="success"
                                                        variant="outlined"
                                                        icon={<SpaIcon />}
                                                    />
                                                )}
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

                        {(currentWorker.employmentType === 'PERMANENT' || currentWorker.employmentType === 'CASUAL') && (
                            <TextField
                                label={currentWorker.employmentType === 'CASUAL' ? "EPF Number (Optional)" : "EPF Number"}
                                fullWidth
                                value={currentWorker.epfNumber}
                                onChange={(e) => setCurrentWorker({ ...currentWorker, epfNumber: e.target.value })}
                            />
                        )}

                        {currentWorker.employmentType === 'PERMANENT' && (
                            <TextField
                                label="ETF Number"
                                fullWidth
                                value={currentWorker.etfNumber || ''}
                                onChange={(e) => setCurrentWorker({ ...currentWorker, etfNumber: e.target.value })}
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
                                <WheelDatePicker
                                    label="Date of Birth"
                                    value={currentWorker.dateOfBirth || ''}
                                    onChange={(newValue) => setCurrentWorker({ ...currentWorker, dateOfBirth: newValue })}
                                />
                                {currentWorker.employmentType === 'PERMANENT' && (
                                    <WheelDatePicker
                                        label="Joined Date"
                                        value={currentWorker.joinedDate || ''}
                                        onChange={(newValue) => setCurrentWorker({ ...currentWorker, joinedDate: newValue })}
                                    />
                                )}
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

            {/* Add Team Modal */}
            <Dialog open={openAddTeamDialog} onClose={() => setOpenAddTeamDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Register Contractor & Team</DialogTitle>
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
                    <Button onClick={() => setOpenAddTeamDialog(false)}>Cancel</Button>
                    <Button
                        onClick={handleAddTeamSubmit}
                        variant="contained"
                        disabled={!bulkContractorName || !bulkWorkerNames.some(n => n.trim() !== '')}
                    >
                        Save Team to System
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Daily Log Modal */}
            <Dialog open={openDailyDialog} onClose={() => setOpenDailyDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ bgcolor: '#f5f5f5', color: '#1b5e20', fontWeight: 'bold' }}>
                    Log Daily Contract Workers
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <FormControl fullWidth sx={{ mb: 3, mt: 1 }}>
                        <InputLabel>Select Contractor</InputLabel>
                        <Select
                            value={dailyContractor}
                            label="Select Contractor"
                            onChange={(e) => {
                                setDailyContractor(e.target.value as string);
                                setDailySelectedWorkers([]); // Reset selections on contractor change
                            }}
                        >
                            {Array.from(new Set(workers.filter(w => w.employmentType === 'CONTRACT_MEMBER').map(w => w.contractorName))).map(name => (
                                <MenuItem key={name || 'Unknown'} value={name || 'Unknown'}>{name || 'Unknown'}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {dailyContractor && (
                        <Box sx={{ bgcolor: '#fafafa', p: 2, borderRadius: 1 }}>
                            <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>Select Workers present today:</Typography>
                            <FormGroup>
                                {workers.filter(w => w.employmentType === 'CONTRACT_MEMBER' && w.contractorName === dailyContractor).map((w: any) => {
                                    const isAlreadyLogged = workers.some(loggedWorker =>
                                        loggedWorker.employmentType === 'CONTRACT' &&
                                        loggedWorker.registeredDate === defaultDate &&
                                        loggedWorker.contractorName === dailyContractor &&
                                        loggedWorker.name === w.name
                                    );
                                    return (
                                        <FormControlLabel
                                            key={w.id}
                                            control={
                                                <Checkbox
                                                    checked={isAlreadyLogged || dailySelectedWorkers.some(sel => sel.id === w.id)}
                                                    disabled={isAlreadyLogged}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setDailySelectedWorkers([...dailySelectedWorkers, w]);
                                                        else setDailySelectedWorkers(dailySelectedWorkers.filter(sel => sel.id !== w.id));
                                                    }}
                                                />
                                            }
                                            label={
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Typography sx={{ color: isAlreadyLogged ? 'text.disabled' : 'text.primary' }}>{w.name}</Typography>
                                                    {isAlreadyLogged && <Chip label="Logged Today" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />}
                                                </Box>
                                            }
                                        />
                                    );
                                })}
                            </FormGroup>

                            <Typography variant="subtitle2" sx={{ mt: 3, mb: 1, color: 'text.secondary' }}>Add New Workers to Team (will save to system):</Typography>
                            {dailyNewWorkers.map((name, index) => (
                                <Box key={index} display="flex" gap={1} mb={1}>
                                    <TextField
                                        label={`New Worker Name`}
                                        fullWidth
                                        size="small"
                                        value={name}
                                        onChange={(e) => {
                                            const newNames = [...dailyNewWorkers];
                                            newNames[index] = e.target.value;
                                            setDailyNewWorkers(newNames);
                                        }}
                                    />
                                    <IconButton
                                        color="error"
                                        onClick={() => {
                                            const newNames = dailyNewWorkers.filter((_, i) => i !== index);
                                            setDailyNewWorkers(newNames.length ? newNames : ['']);
                                        }}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </Box>
                            ))}
                            <Button
                                variant="outlined"
                                startIcon={<AddIcon />}
                                size="small"
                                onClick={() => setDailyNewWorkers([...dailyNewWorkers, ''])}
                                sx={{ alignSelf: 'flex-start', mt: 1 }}
                            >
                                Add Worker
                            </Button>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                    <Button onClick={() => setOpenDailyDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleDailySubmit} sx={{ bgcolor: '#1a5e20' }} disabled={dailySelectedWorkers.length === 0 && !dailyNewWorkers.some(n => n.trim() !== '')}>
                        Log Attendance
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
