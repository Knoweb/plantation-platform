import { Box, Paper, Typography, Card, CardContent, Avatar, Chip, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, FormControl, InputLabel, Select, MenuItem, DialogActions, Autocomplete, Checkbox, TextField, Alert, Snackbar } from '@mui/material';
import { useState, useEffect, Fragment } from 'react';
import axios from 'axios';
import EditIcon from '@mui/icons-material/Edit';
import PersonIcon from '@mui/icons-material/Person';
import SpaIcon from '@mui/icons-material/Spa';
import AddIcon from '@mui/icons-material/Add';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import DoneAllIcon from '@mui/icons-material/DoneAll';

interface Muster {
    id: number;
    date: string;
    fieldName: string;
    taskType: string;
    workerCount: number;
    workerIds: string[];
    status: string;
    divisionId?: string; // Backend might send this
}

interface Worker {
    id: string;
    name: string;
    gender: string;
    status?: string;
    divisionIds?: string[]; // Worker assigned divisions
    employmentType?: string;
    registeredDate?: string;
}

interface Field {
    fieldId: string;
    name: string;
    divisionId: string;
    cropType?: string; // e.g. 'Tea', 'Rubber'
}

interface Division {
    divisionId: string;
    name: string;
}

export default function MorningMuster() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    const [musters, setMusters] = useState<Muster[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [fields, setFields] = useState<Field[]>([]);
    const [divisions, setDivisions] = useState<Division[]>([]);

    const [selectedDivisionId, setSelectedDivisionId] = useState<string>('');
    const [editingMusterId, setEditingMusterId] = useState<number | null>(null);

    // Dialog State
    const [openMuster, setOpenMuster] = useState(false);

    // Confirmation Dialog State
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState("");
    const [confirmButtonText, setConfirmButtonText] = useState("Confirm");
    const [confirmButtonColor, setConfirmButtonColor] = useState<"primary" | "secondary" | "error" | "info" | "success" | "warning">("primary");
    const [confirmAction, setConfirmAction] = useState<() => Promise<void>>(() => async () => { });
    const [newMuster, setNewMuster] = useState<{ fieldName: string, taskType: string, workerIds: string[] }>({
        fieldName: '',
        taskType: 'Plucking',
        workerIds: []
    });

    // Read-Only State
    const [isReadOnly, setIsReadOnly] = useState(false);

    // Snackbar State
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'info' });
    const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

    const [availableTasks, setAvailableTasks] = useState<string[]>([]);

    useEffect(() => {
        let isMounted = true;

        const refreshData = async () => {
            if (!isMounted) return;
            await fetchData();
            if (tenantId && selectedDivisionId) {
                await checkApprovalStatus();
            }
        };

        // Initial fetch
        refreshData();

        // Real-time sync polling every 5 seconds
        const intervalId = setInterval(refreshData, 5000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [tenantId, selectedDivisionId]);

    const checkApprovalStatus = async () => {
        try {
            // Use local date for consistency
            const d = new Date();
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const today = `${year}-${month}-${day}`;
            const res = await axios.get(`/api/operations/daily-work?tenantId=${tenantId}&divisionId=${selectedDivisionId}`);
            // Check if TODAY'S work for this division is SUBMITTED (Pending or Approved)
            const submittedWork = res.data.find((w: any) => w.workDate === today && (w.status === 'APPROVED' || w.status === 'PENDING'));
            setIsReadOnly(!!submittedWork);
        } catch (e) {
            console.error("Failed to check approval status", e);
        }
    };

    const fetchData = async () => {
        try {
            const [musterRes, workerRes, fieldRes, divisionRes, taskRes] = await Promise.all([
                axios.get(`/api/operations/muster?tenantId=${tenantId}`),
                axios.get(`/api/workers?tenantId=${tenantId}`),
                axios.get(`/api/fields?tenantId=${tenantId}`),
                axios.get(`/api/divisions?tenantId=${tenantId}`),
                axios.get(`/api/operations/task-types?tenantId=${tenantId}`)
            ]);

            // Use local date to avoid UTC mismatches in early morning
            const d = new Date();
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const today = `${year}-${month}-${day}`;

            const todaysMusters = musterRes.data.filter((m: Muster) => m.date === today);

            // Set Available Tasks
            const tasks = taskRes.data.map((t: any) => t.name);
            setAvailableTasks(tasks.length > 0 ? tasks : ['Plucking', 'Sundry', 'Other']);

            setMusters(todaysMusters);
            setWorkers(workerRes.data);
            setFields(fieldRes.data);
            setDivisions(divisionRes.data);

            // Set default division if available
            if (divisionRes.data.length > 0 && !selectedDivisionId) {
                // Ideally default to user's first assigned division, if any
                const userDivisions = userSession.divisionAccess || [];
                // Check if user's preferred division exists in fetched data
                const preferredDiv = userDivisions.length > 0 ? userDivisions[0] : null;
                const exists = divisionRes.data.find((d: Division) => d.divisionId === preferredDiv);

                if (exists) {
                    setSelectedDivisionId(preferredDiv);
                } else {
                    setSelectedDivisionId(divisionRes.data[0].divisionId);
                }
            } else if (divisionRes.data.length > 0 && selectedDivisionId) {
                // Verify current selection still exists (e.g. after deletion)
                const exists = divisionRes.data.find((d: Division) => d.divisionId === selectedDivisionId);
                if (!exists) setSelectedDivisionId(divisionRes.data[0].divisionId);
            }
        } catch (err) {
            console.error("Failed to fetch muster data", err);
        }
    };

    const handleCreateMuster = async () => {
        try {
            if (!selectedDivisionId) {
                setSnackbar({ open: true, message: "Please select a division first.", severity: "warning" });
                return;
            }

            const d = new Date();
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const todayLocal = `${year}-${month}-${day}`;

            const payload = {
                ...newMuster,
                tenantId,
                divisionId: selectedDivisionId,
                date: todayLocal,
                workerCount: newMuster.workerIds.length
            };

            if (editingMusterId) {
                await axios.put(`/api/operations/muster/${editingMusterId}`, payload);
            } else {
                await axios.post('/api/operations/muster', payload);
            }

            setOpenMuster(false);
            setNewMuster({ fieldName: '', taskType: 'Plucking', workerIds: [] }); // Reset form
            setEditingMusterId(null);
            fetchData();
        } catch (e) {
            setSnackbar({ open: true, message: "Failed to save Muster", severity: "error" });
        }
    };

    const handleEditMuster = (muster: Muster) => {
        setNewMuster({
            fieldName: muster.fieldName,
            taskType: muster.taskType,
            workerIds: muster.workerIds || []
        });
        setEditingMusterId(muster.id);
        setOpenMuster(true);
    };

    // --- Filtering Logic ---
    const activeDivId = selectedDivisionId;

    // Filter Musters (assuming backend has divisionId, otherwise we might see all. 
    // Ideally update backend to return divisionId or filter by field's division)
    // For now, let's assume we filter by field ownership since muster has fieldName but maybe not ID.
    // Actually, fields have divisionId. We can map muster.fieldName -> field -> divisionId
    const filteredMusters = musters.filter(m => {
        // If muster has divisionId, use it. If not, try to find field.
        if (m.divisionId) return m.divisionId === activeDivId;
        const relatedField = fields.find(f => f.name === m.fieldName);
        return relatedField ? relatedField.divisionId === activeDivId : true; // Show if unknown
    });

    const todayStr = (() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    })();

    // Workers are available across all divisions (Floating Pool) and must be ACTIVE to be assigned
    const filteredWorkers = workers.filter(w => {
        if (w.status !== 'ACTIVE') return false;

        // Day Contract Workers are strictly for the current day based on when Chief Clerk logged them
        if (w.employmentType === 'CONTRACT') {
            return w.registeredDate === todayStr;
        }

        // Contract templates should never appear directly
        if (w.employmentType === 'CONTRACT_MEMBER') {
            return false;
        }

        return true;
    });

    const filteredFields = fields.filter(f => f.divisionId === activeDivId);


    // Group Musters by Task Type for the Right Panel
    const groupedMusters = filteredMusters.reduce((acc, muster) => {
        if (!acc[muster.taskType]) acc[muster.taskType] = [];
        acc[muster.taskType].push(muster);
        return acc;
    }, {} as Record<string, Muster[]>);

    // Calculate Summary for Left Panel (Muster Chit)
    // Categorized Summary Calculation for Muster Chit
    const getCategorizedSummary = () => {
        const categories: any = { Tea: {}, Rubber: {}, General: {} };

        const activeMusters = musters.filter(m => {
            if (m.divisionId) return m.divisionId === activeDivId;
            const relatedField = fields.find(f => f.name === m.fieldName);
            return relatedField ? relatedField.divisionId === activeDivId : true;
        });

        activeMusters.forEach(m => {
            const field = fields.find(f => f.name === m.fieldName);
            const crop = field?.cropType || 'General';

            let catKey = 'General';
            if (crop === 'Tea') catKey = 'Tea';
            if (crop === 'Rubber') catKey = 'Rubber';

            if (!categories[catKey][m.taskType]) {
                categories[catKey][m.taskType] = { count: 0, fields: {} };
            }

            categories[catKey][m.taskType].count += m.workerCount;

            if (!categories[catKey][m.taskType].fields[m.fieldName]) {
                categories[catKey][m.taskType].fields[m.fieldName] = 0;
            }
            categories[catKey][m.taskType].fields[m.fieldName] += m.workerCount;
        });
        return categories;
    };

    const categorizedSummary = getCategorizedSummary();
    const grandWorkerTotal = Object.values(categorizedSummary).reduce((acc: number, cat: any) =>
        acc + Object.values(cat).reduce((cAcc: number, curr: any) => cAcc + curr.count, 0), 0);

    const getWorkerDetails = (id: string) => workers.find(w => w.id === id);

    const handleClearAll = () => {
        setConfirmMessage("Are you sure you want to clear ALL assignments for this division? This cannot be undone.");
        setConfirmButtonText("Clear All");
        setConfirmButtonColor("error");
        setConfirmAction(() => async () => {
            try {
                // Delete all filtered musters one by one
                // DIRECT CALL TO OPERATION SERVICE (Bypassing Gateway 8080 due to persistent 405)
                await Promise.all(filteredMusters.map(m =>
                    axios.delete(`/api/operations/muster/${m.id}`)
                ));
                fetchData();
            } catch (e) {
                console.error("Failed to clear assignments", e);
            }
        });
        setConfirmOpen(true);
    };

    const handleFinalize = () => {
        setConfirmMessage("Are you sure you want to finalize the muster? This will submit the assignments for Manager Approval.");
        setConfirmButtonText("Confirm Submission");
        setConfirmButtonColor("success");
        setConfirmAction(() => async () => {
            try {
                // Aggregate all into ONE submission with detailed worker info
                const allAssignments: { task: string, field: string, count: number, assigned: { id: string, name: string }[] }[] = [];
                let totalCount = 0;

                // Iterate filtered musters directly to preserve all details
                filteredMusters.forEach(m => {
                    const assignedWorkers = m.workerIds?.map(wid => {
                        const w = workers.find(work => work.id === wid);
                        return { id: wid, name: w ? w.name : 'Unknown' };
                    }) || [];

                    totalCount += m.workerCount;
                    allAssignments.push({
                        task: m.taskType,
                        field: m.fieldName,
                        count: m.workerCount,
                        assigned: assignedWorkers
                    });
                });

                // Use local date for consistency
                const d = new Date();
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const todayVal = `${year}-${month}-${day}`;

                const payload = {
                    tenantId: tenantId,
                    divisionId: selectedDivisionId,
                    workDate: todayVal,
                    workType: "Morning Muster",
                    workerCount: totalCount,
                    // Store structured data containing Task Type + Field + Workers + NAMES
                    details: JSON.stringify(allAssignments),
                    quantity: 0
                };

                await axios.post('/api/operations/daily-work', payload);

                setIsReadOnly(true);
                checkApprovalStatus();

                // Trigger Sidebar Update
                window.dispatchEvent(new Event('muster-update'));

                setSnackbar({ open: true, message: "Muster Submitted for Manager Approval!", severity: "success" });
                // Optionally disable editing here?
            } catch (error) {
                console.error("Submission failed", error);
                setSnackbar({ open: true, message: "Failed to submit muster. Please check backend connection.", severity: "error" });
            }
        });
        setConfirmOpen(true);
    };

    const handleConfirmClose = () => {
        setConfirmOpen(false);
    };

    const handleConfirmProceed = async () => {
        setConfirmOpen(false);
        await confirmAction();
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="h4" fontWeight="bold" color="primary.dark">
                            {isReadOnly ? "Muster Review" : "Morning Muster"}
                        </Typography>
                        {isReadOnly && <Chip label="Read-Only Mode" color="info" size="small" />}
                    </Box>
                    <Typography variant="subtitle1" color="text.secondary">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </Typography>
                </Box>

                {/* Division Selector */}
                <FormControl sx={{ minWidth: 200 }} size="small">
                    <InputLabel>Division</InputLabel>
                    <Select
                        value={selectedDivisionId}
                        label="Division"
                        onChange={(e) => setSelectedDivisionId(e.target.value)}
                    >
                        {divisions.map((div) => (
                            <MenuItem key={div.divisionId} value={div.divisionId}>
                                {div.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Box display="flex" gap={2}>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                        setEditingMusterId(null);
                        setNewMuster({ fieldName: '', taskType: 'Plucking', workerIds: [] });
                        setOpenMuster(true);
                    }} disabled={!selectedDivisionId || isReadOnly}>
                        Assign Workers
                    </Button>
                    <Button
                        variant="contained"
                        // Removed color="success" to use custom gradient
                        size="large"
                        startIcon={<DoneAllIcon />}
                        onClick={handleFinalize}
                        disabled={filteredMusters.length === 0 || isReadOnly}
                        sx={{
                            px: 4,
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            boxShadow: 3,
                            background: filteredMusters.length === 0 ? undefined : 'linear-gradient(45deg, #d32f2f 30%, #ef5350 90%)',
                            color: 'white'
                        }}
                    >
                        Submit Muster
                    </Button>
                    <Button variant="outlined" color="error" onClick={handleClearAll} disabled={filteredMusters.length === 0 || isReadOnly}>Clear All</Button>
                </Box>
            </Box>

            {isReadOnly && (
                <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography fontWeight="bold">Muster Submitted</Typography>
                    This muster has been submitted and is currently in <strong>Read-Only Review Mode</strong>.
                    Changes cannot be made until it is processed by the Manager.
                </Alert>
            )}

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {/* Left Panel: Muster Chit Summary */}
                <Box sx={{ width: { xs: '100%', md: '32%' } }}>
                    <Card elevation={3} sx={{ bgcolor: '#e8f5e9' }}>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6" fontWeight="bold">Muster Chit</Typography>
                                <Chip label="Draft" color="warning" size="small" />
                            </Box>

                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: '#c8e6c9' }}>
                                        <TableRow>
                                            <TableCell><strong>Work item</strong></TableCell>
                                            <TableCell><strong>Field No</strong></TableCell>
                                            <TableCell align="right"><strong>No of Workers</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {/* Tea Section */}
                                        {Object.entries(categorizedSummary.Tea).map(([task, data]: any) => (
                                            <Fragment key={task}>
                                                {Object.entries(data.fields).map(([field, count]: any, idx) => (
                                                    <TableRow key={`${task}-${field}`}>
                                                        {idx === 0 && (
                                                            <TableCell rowSpan={Object.keys(data.fields).length} sx={{ verticalAlign: 'top', fontWeight: 'bold' }}>{task}</TableCell>
                                                        )}
                                                        <TableCell>{field}</TableCell>
                                                        <TableCell align="right">{count}</TableCell>
                                                    </TableRow>
                                                ))}
                                                {task === 'Plucking' && (
                                                    <TableRow sx={{ bgcolor: '#a5d6a7' }}>
                                                        <TableCell colSpan={2}><strong>Total Pluckers</strong></TableCell>
                                                        <TableCell align="right"><strong>{data.count}</strong></TableCell>
                                                    </TableRow>
                                                )}
                                            </Fragment>
                                        ))}
                                        {Object.keys(categorizedSummary.Tea).length > 0 && (
                                            <TableRow sx={{ bgcolor: '#81c784', borderTop: '2px solid #2e7d32' }}>
                                                <TableCell colSpan={2}><strong>Total Tea</strong></TableCell>
                                                <TableCell align="right"><strong>{Object.values(categorizedSummary.Tea).reduce((acc: number, curr: any) => acc + curr.count, 0)}</strong></TableCell>
                                            </TableRow>
                                        )}

                                        {/* Rubber Section */}
                                        {Object.entries(categorizedSummary.Rubber).map(([task, data]: any) => (
                                            <Fragment key={task}>
                                                {Object.entries(data.fields).map(([field, count]: any, idx) => (
                                                    <TableRow key={`${task}-${field}`}>
                                                        {idx === 0 && (
                                                            <TableCell rowSpan={Object.keys(data.fields).length} sx={{ verticalAlign: 'top', fontWeight: 'bold' }}>{task}</TableCell>
                                                        )}
                                                        <TableCell>{field}</TableCell>
                                                        <TableCell align="right">{count}</TableCell>
                                                    </TableRow>
                                                ))}
                                                {task === 'Tapping' && (
                                                    <TableRow sx={{ bgcolor: '#a5d6a7' }}>
                                                        <TableCell colSpan={2}><strong>Total Tappers</strong></TableCell>
                                                        <TableCell align="right"><strong>{data.count}</strong></TableCell>
                                                    </TableRow>
                                                )}
                                            </Fragment>
                                        ))}
                                        {Object.keys(categorizedSummary.Rubber).length > 0 && (
                                            <TableRow sx={{ bgcolor: '#81c784', borderTop: '2px solid #2e7d32' }}>
                                                <TableCell colSpan={2}><strong>Total Rubber</strong></TableCell>
                                                <TableCell align="right"><strong>{Object.values(categorizedSummary.Rubber).reduce((acc: number, curr: any) => acc + curr.count, 0)}</strong></TableCell>
                                            </TableRow>
                                        )}

                                        {/* General Section */}
                                        {Object.entries(categorizedSummary.General).map(([task, data]: any) => (
                                            <Fragment key={task}>
                                                {Object.entries(data.fields).map(([field, count]: any, idx) => (
                                                    <TableRow key={`${task}-${field}`}>
                                                        {idx === 0 && (
                                                            <TableCell rowSpan={Object.keys(data.fields).length} sx={{ verticalAlign: 'top', fontWeight: 'bold' }}>{task}</TableCell>
                                                        )}
                                                        <TableCell>{field}</TableCell>
                                                        <TableCell align="right">{count}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </Fragment>
                                        ))}
                                        {Object.keys(categorizedSummary.General).length > 0 && (
                                            <TableRow sx={{ bgcolor: '#81c784', borderTop: '2px solid #2e7d32' }}>
                                                <TableCell colSpan={2}><strong>Total General</strong></TableCell>
                                                <TableCell align="right"><strong>{Object.values(categorizedSummary.General).reduce((acc: number, curr: any) => acc + curr.count, 0)}</strong></TableCell>
                                            </TableRow>
                                        )}

                                        {grandWorkerTotal === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} align="center">No assignments today</TableCell>
                                            </TableRow>
                                        )}
                                        <TableRow sx={{ bgcolor: '#66bb6a', borderTop: '3px double #1b5e20' }}>
                                            <TableCell colSpan={2}><strong>Grand Total of workers</strong></TableCell>
                                            <TableCell align="right"><strong>{grandWorkerTotal}</strong></TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Box>

                {/* Right Panel: Visual Worker Assignment */}
                <Box sx={{ width: { xs: '100%', md: '65%' }, flexGrow: 1 }}>
                    <Card elevation={3} sx={{ bgcolor: '#fafafa', height: '100%' }}>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6" fontWeight="bold" gutterBottom>Field Assignments (Division View)</Typography>
                                <Button size="small" startIcon={<AddIcon />} onClick={() => {
                                    setEditingMusterId(null);
                                    setNewMuster({ fieldName: '', taskType: 'Plucking', workerIds: [] });
                                    setOpenMuster(true);
                                }} disabled={!selectedDivisionId || isReadOnly}>Quick Add</Button>
                            </Box>

                            {isReadOnly && (
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    This muster has been <strong>SUBMITTED</strong> regarding manager approval and is now Read-Only.
                                </Alert>
                            )}

                            {Object.entries(groupedMusters).map(([task, typeMusters]) => (
                                <Box key={task} mb={3} p={2} sx={{ bgcolor: 'white', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                        <Typography variant="subtitle1" fontWeight="bold" color="primary.main">{task}</Typography>
                                        {/* Removed EditIcon from Header */}
                                    </Box>

                                    {typeMusters.map(muster => (
                                        <Box key={muster.id} mb={2}>
                                            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                                    Field: <strong>{muster.fieldName}</strong> • ({muster.workerCount} workers)
                                                </Typography>
                                                <IconButton size="small" onClick={() => handleEditMuster(muster)} disabled={isReadOnly}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Box>

                                            <Box display="flex" flexWrap="wrap" gap={1}>
                                                {muster.workerIds && muster.workerIds.length > 0 ? (
                                                    muster.workerIds.map(wId => {
                                                        const w = getWorkerDetails(wId);

                                                        let avatarColor = "#9e9e9e"; // default
                                                        if (w?.employmentType === 'PERMANENT') { avatarColor = "#2e7d32"; } // success.main
                                                        if (w?.employmentType === 'CASUAL') { avatarColor = "#0288d1"; } // info.main
                                                        if (w?.employmentType === 'CONTRACT' || w?.employmentType === 'CONTRACT_MEMBER') { avatarColor = "#9c27b0"; } // secondary.main

                                                        return (
                                                            <Chip
                                                                key={wId}
                                                                avatar={<Avatar sx={{ bgcolor: avatarColor }}><PersonIcon sx={{ color: 'white' }} /></Avatar>}
                                                                label={w ? w.name : 'Unknown'}
                                                                variant="outlined"
                                                                size="small"
                                                            />
                                                        );
                                                    })
                                                ) : (
                                                    // Fallback visuals if no IDs (legacy data)
                                                    Array.from({ length: muster.workerCount }).map((_, i) => (
                                                        <Avatar key={i} sx={{ width: 24, height: 24, bgcolor: '#bdbdbd' }}><PersonIcon sx={{ fontSize: 16 }} /></Avatar>
                                                    ))
                                                )}
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            ))}

                            {filteredMusters.length === 0 && (
                                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height={200}>
                                    <SpaIcon color="disabled" sx={{ fontSize: 60, opacity: 0.3 }} />
                                    <Typography color="text.secondary" mt={1}>No active musters for {divisions.find(d => d.divisionId === selectedDivisionId)?.name || 'selected division'}</Typography>
                                    <Button variant="contained" sx={{ mt: 2 }} onClick={() => {
                                        setEditingMusterId(null);
                                        setNewMuster({ fieldName: '', taskType: 'Plucking', workerIds: [] });
                                        setOpenMuster(true);
                                    }} disabled={!selectedDivisionId || isReadOnly}>Start Allocation</Button>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Box>
            </Box>

            {/* Add Muster Dialog */}
            <Dialog open={openMuster} onClose={() => setOpenMuster(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editingMusterId ? 'Edit Assignment' : 'Assign Workers'} - {divisions.find(d => d.divisionId === selectedDivisionId)?.name}</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Field Name</InputLabel>
                        <Select
                            value={newMuster.fieldName}
                            label="Field Name"
                            onChange={(e) => setNewMuster({ ...newMuster, fieldName: e.target.value })}
                        >
                            {filteredFields.map((field) => (
                                <MenuItem key={field.fieldId} value={field.name}>
                                    {field.name}
                                </MenuItem>
                            ))}
                            {filteredFields.length === 0 && <MenuItem disabled>No fields in this division</MenuItem>}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Task Type</InputLabel>
                        <Select value={newMuster.taskType} label="Task Type" onChange={(e) => setNewMuster({ ...newMuster, taskType: e.target.value })}>
                            {availableTasks.map((task) => (
                                <MenuItem key={task} value={task}>{task}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Worker Multi-Select */}
                    {/* Worker Multi-Select with Autocomplete */}
                    <Autocomplete
                        multiple
                        id="worker-select-grouped-muster"
                        options={filteredWorkers.sort((a, b) => {
                            const typeOrders: Record<string, number> = { 'PERMANENT': 1, 'CASUAL': 2, 'CONTRACT': 3, 'CONTRACT_MEMBER': 3 };
                            const orderA = typeOrders[a.employmentType || ''] || 4;
                            const orderB = typeOrders[b.employmentType || ''] || 4;
                            if (orderA !== orderB) return orderA - orderB;
                            return a.name.localeCompare(b.name);
                        })}
                        groupBy={(option) => {
                            if (option.employmentType === 'PERMANENT') return '— PERMANENT —';
                            if (option.employmentType === 'CASUAL') return '— CASUAL —';
                            if (option.employmentType === 'CONTRACT' || option.employmentType === 'CONTRACT_MEMBER') return '— CONTRACT —';
                            return '— OTHER —';
                        }}
                        getOptionLabel={(option) => option.name}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        value={filteredWorkers.filter(w => newMuster.workerIds.includes(w.id))}
                        onChange={(_event, newValue) => {
                            setNewMuster({ ...newMuster, workerIds: newValue.map(w => w.id) });
                        }}
                        disableCloseOnSelect
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Assign Workers"
                                placeholder="Search by name or role"
                                margin="dense"
                            />
                        )}
                        renderTags={(value: readonly Worker[], getTagProps) =>
                            value.map((option: Worker, index: number) => {
                                let color: "success" | "info" | "default" = "default";
                                let sxProps: any = {};
                                if (option.employmentType === 'PERMANENT') color = "success";
                                else if (option.employmentType === 'CASUAL') color = "info";
                                else if (option.employmentType === 'CONTRACT' || option.employmentType === 'CONTRACT_MEMBER') {
                                    sxProps = { color: '#9c27b0', borderColor: '#ce93d8' };
                                }

                                const { key, ...chipProps } = getTagProps({ index }) as any;

                                return (
                                    <Chip
                                        key={option.id || key}
                                        {...chipProps}
                                        variant="outlined"
                                        label={
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Typography variant="body2">{option.name}</Typography>
                                                <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '10px', textTransform: 'capitalize' }}>
                                                    ({option.employmentType?.replace('_', ' ').toLowerCase() || 'unknown'})
                                                </Typography>
                                            </Box>
                                        }
                                        size="small"
                                        color={color}
                                        sx={sxProps}
                                    />
                                );
                            })
                        }
                        renderOption={(props, option, { selected }) => {
                            // Check unavailable against ALL musters (Global Tenant Availability)
                            const isUnavailable = musters.some(m =>
                                m.id !== editingMusterId &&
                                m.workerIds?.includes(option.id)
                            );

                            let typeColor = "inherit"; // default

                            if (option.employmentType === 'PERMANENT') { typeColor = "success.main"; }
                            if (option.employmentType === 'CASUAL') { typeColor = "info.main"; }
                            if (option.employmentType === 'CONTRACT' || option.employmentType === 'CONTRACT_MEMBER') {
                                typeColor = "#9c27b0";
                            }

                            // Important: Mui passes a key in props, so we shouldn't pass it again using {...props} and key={} together inconsistently in React 18
                            // However, Mui handles this internally usually. Let's destructure key if we need.
                            const { key, ...otherProps } = props as any;

                            return (
                                <li key={option.id || key} {...otherProps}>
                                    <Checkbox
                                        icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                                        checkedIcon={<CheckBoxIcon fontSize="small" />}
                                        style={{ marginRight: 8 }}
                                        checked={selected}
                                        disabled={isUnavailable}
                                    />
                                    <Box sx={{ opacity: isUnavailable ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                        <Typography variant="body2" sx={{ color: typeColor, fontWeight: selected ? 'bold' : 'normal' }}>
                                            {option.name} {isUnavailable ? '(Assigned)' : ''}
                                        </Typography>
                                    </Box>
                                </li>
                            );
                        }}
                        sx={{ mt: 2 }}
                    />

                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenMuster(false)}>Cancel</Button>
                    <Button onClick={handleCreateMuster} variant="contained" disabled={newMuster.workerIds.length === 0 || !newMuster.fieldName}>
                        {editingMusterId ? 'Update Assignment' : `Assign (${newMuster.workerIds.length})`}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirmation Dialog */}
            <Dialog open={confirmOpen} onClose={handleConfirmClose}>
                <DialogTitle>Confirm Action</DialogTitle>
                <DialogContent>
                    <Typography>{confirmMessage}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleConfirmClose} color="primary">Cancel</Button>
                    <Button onClick={handleConfirmProceed} color={confirmButtonColor} variant="contained">{confirmButtonText}</Button>
                </DialogActions>
            </Dialog>

            {/* Global Snackbar */}
            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box >
    );
}
