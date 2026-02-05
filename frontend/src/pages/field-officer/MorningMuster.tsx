import { Box, Paper, Typography, Card, CardContent, Avatar, Chip, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, FormControl, InputLabel, Select, MenuItem, OutlinedInput, DialogActions } from '@mui/material';
import { useState, useEffect, Fragment } from 'react';
import axios from 'axios';
import EditIcon from '@mui/icons-material/Edit';
import PersonIcon from '@mui/icons-material/Person';
import SpaIcon from '@mui/icons-material/Spa';
import AddIcon from '@mui/icons-material/Add';

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
    jobRole: string;
    gender: string;
    divisionIds?: string[]; // Worker assigned divisions
}

interface Field {
    fieldId: string;
    name: string;
    divisionId: string;
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
    const [confirmAction, setConfirmAction] = useState<() => Promise<void>>(() => async () => { });
    const [newMuster, setNewMuster] = useState<{ fieldName: string, taskType: string, workerIds: string[] }>({
        fieldName: '',
        taskType: 'Plucking',
        workerIds: []
    });

    useEffect(() => {
        fetchData();
    }, [tenantId]);

    const fetchData = async () => {
        try {
            const [musterRes, workerRes, fieldRes, divisionRes] = await Promise.all([
                axios.get(`http://localhost:8084/api/operations/muster?tenantId=${tenantId}`),
                axios.get(`http://localhost:8081/api/workers?tenantId=${tenantId}`),
                axios.get(`http://localhost:8081/api/fields?tenantId=${tenantId}`),
                axios.get(`http://localhost:8081/api/divisions?tenantId=${tenantId}`)
            ]);

            setMusters(musterRes.data);
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
                alert("Please select a division first.");
                return;
            }

            const payload = {
                ...newMuster,
                tenantId,
                divisionId: selectedDivisionId,
                date: new Date().toISOString().split('T')[0],
                workerCount: newMuster.workerIds.length
            };

            if (editingMusterId) {
                await axios.put(`http://localhost:8084/api/operations/muster/${editingMusterId}`, payload);
            } else {
                await axios.post('http://localhost:8084/api/operations/muster', payload);
            }

            setOpenMuster(false);
            setNewMuster({ fieldName: '', taskType: 'Plucking', workerIds: [] }); // Reset form
            setEditingMusterId(null);
            fetchData();
        } catch (e) {
            alert("Failed to save Muster");
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

    const filteredWorkers = workers.filter(w => {
        // If worker has no specific assignments, maybe show all? Or hide?
        // Usually workers are assigned to divisions.
        if (!w.divisionIds || w.divisionIds.length === 0) return true;
        return w.divisionIds.includes(activeDivId);
    });

    const filteredFields = fields.filter(f => f.divisionId === activeDivId);


    // Group Musters by Task Type for the Right Panel
    const groupedMusters = filteredMusters.reduce((acc, muster) => {
        if (!acc[muster.taskType]) acc[muster.taskType] = [];
        acc[muster.taskType].push(muster);
        return acc;
    }, {} as Record<string, Muster[]>);

    // Calculate Summary for Left Panel (Muster Chit)
    const summary = filteredMusters.reduce((acc, muster) => {
        if (!acc[muster.taskType]) {
            acc[muster.taskType] = { count: 0, fields: {} };
        }
        acc[muster.taskType].count += muster.workerCount;
        if (!acc[muster.taskType].fields[muster.fieldName]) {
            acc[muster.taskType].fields[muster.fieldName] = 0;
        }
        acc[muster.taskType].fields[muster.fieldName] += muster.workerCount;
        return acc;
    }, {} as Record<string, { count: number, fields: Record<string, number> }>);

    const getWorkerDetails = (id: string) => workers.find(w => w.id === id);

    const handleClearAll = () => {
        setConfirmAction(() => async () => {
            try {
                // Delete all filtered musters one by one
                // DIRECT CALL TO OPERATION SERVICE (Bypassing Gateway 8080 due to persistent 405)
                await Promise.all(filteredMusters.map(m =>
                    axios.delete(`http://localhost:8084/api/operations/muster/${m.id}`)
                ));
                fetchData();
            } catch (e) {
                console.error("Failed to clear assignments", e);
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
                    <Typography variant="h4" fontWeight="bold" color="primary.dark">Morning Muster</Typography>
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
                    }} disabled={!selectedDivisionId}>
                        Assign Workers
                    </Button>
                    <Button
                        variant="contained"
                        color="success"
                        size="large"
                        sx={{ px: 4, fontWeight: 'bold', fontSize: '1rem', boxShadow: 3 }}
                    >
                        Finalize Muster
                    </Button>
                    <Button variant="outlined" color="error" onClick={handleClearAll} disabled={filteredMusters.length === 0}>Clear All</Button>
                </Box>
            </Box>

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
                                            <TableCell><strong>Work Item</strong></TableCell>
                                            <TableCell><strong>Field No</strong></TableCell>
                                            <TableCell align="right"><strong>Workers</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {Object.entries(summary).map(([task, data]) => (
                                            <Fragment key={task}>
                                                {Object.entries(data.fields).map(([field, count], idx) => (
                                                    <TableRow key={`${task}-${field}`}>
                                                        {idx === 0 && (
                                                            <TableCell rowSpan={Object.keys(data.fields).length} sx={{ verticalAlign: 'top', fontWeight: 'bold' }}>
                                                                {task}
                                                            </TableCell>
                                                        )}
                                                        <TableCell>{field}</TableCell>
                                                        <TableCell align="right">{count}</TableCell>
                                                    </TableRow>
                                                ))}
                                                <TableRow sx={{ bgcolor: '#f1f8e9' }}>
                                                    <TableCell colSpan={2}><strong>Total {task}</strong></TableCell>
                                                    <TableCell align="right"><strong>{data.count}</strong></TableCell>
                                                </TableRow>
                                            </Fragment>
                                        ))}
                                        {Object.keys(summary).length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} align="center">No assignments today</TableCell>
                                            </TableRow>
                                        )}
                                        <TableRow sx={{ bgcolor: '#81c784' }}>
                                            <TableCell colSpan={2}><strong>Grand Total</strong></TableCell>
                                            <TableCell align="right"><strong>{filteredMusters.reduce((sum, m) => sum + m.workerCount, 0)}</strong></TableCell>
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
                                }} disabled={!selectedDivisionId}>Quick Add</Button>
                            </Box>

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
                                                <IconButton size="small" onClick={() => handleEditMuster(muster)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Box>

                                            <Box display="flex" flexWrap="wrap" gap={1}>
                                                {muster.workerIds && muster.workerIds.length > 0 ? (
                                                    muster.workerIds.map(wId => {
                                                        const w = getWorkerDetails(wId);
                                                        return (
                                                            <Chip
                                                                key={wId}
                                                                avatar={<Avatar sx={{ bgcolor: w?.gender === 'MALE' ? 'primary.main' : 'secondary.main' }}><PersonIcon /></Avatar>}
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
                                    }} disabled={!selectedDivisionId}>Start Allocation</Button>
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
                            <MenuItem value="Plucking">Plucking</MenuItem>
                            <MenuItem value="Weeding">Weeding</MenuItem>
                            <MenuItem value="Fertilizing">Fertilizing</MenuItem>
                            <MenuItem value="Tapping">Tapping</MenuItem>
                            <MenuItem value="Welding">Welding</MenuItem>
                        </Select>
                    </FormControl>

                    {/* Worker Multi-Select */}
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Assign Workers</InputLabel>
                        <Select
                            multiple
                            value={newMuster.workerIds}
                            onChange={(e) => {
                                const value = e.target.value;
                                setNewMuster({ ...newMuster, workerIds: typeof value === 'string' ? value.split(',') : value as string[] });
                            }}
                            input={<OutlinedInput label="Assign Workers" />}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((value) => {
                                        const worker = workers.find(w => w.id === value);
                                        return (
                                            <Chip key={value} label={worker ? worker.name : value} size="small" />
                                        );
                                    })}
                                </Box>
                            )}
                        >
                            {filteredWorkers.length === 0 && <MenuItem disabled>No workers available in division</MenuItem>}
                            {filteredWorkers.map((worker) => {
                                // Check if worker is already assigned to another muster in this division
                                const isUnavailable = filteredMusters.some(m =>
                                    m.id !== editingMusterId && // Don't count current muster if editing
                                    m.workerIds?.includes(worker.id)
                                );

                                return (
                                    <MenuItem key={worker.id} value={worker.id} disabled={isUnavailable}>
                                        {worker.name} ({worker.jobRole}) {isUnavailable ? '(Assigned)' : ''}
                                    </MenuItem>
                                );
                            })}
                        </Select>
                    </FormControl>

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
                    <Typography>Are you sure you want to clear ALL assignments for this division?</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleConfirmClose} color="primary">Cancel</Button>
                    <Button onClick={handleConfirmProceed} color="error" variant="contained">Clear All</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
