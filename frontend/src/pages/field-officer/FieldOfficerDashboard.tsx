import { Box, Grid, Paper, Typography, Card, CardContent, Button, List, ListItem, ListItemText, Divider, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, FormControl, InputLabel, Chip, Autocomplete, Checkbox } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GroupIcon from '@mui/icons-material/Group';
import AddIcon from '@mui/icons-material/Add';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import ChatIcon from '@mui/icons-material/Chat';
import ForestIcon from '@mui/icons-material/Forest';
import InventoryIcon from '@mui/icons-material/Inventory';
import HistoryIcon from '@mui/icons-material/History';
import { useState, useEffect } from 'react';
import axios from 'axios';

interface Muster {
    id: number;
    date: string;
    fieldName: string;
    taskType: string;
    workerCount: number;
    workerIds: string[]; // Added workerIds
    status: string;
}

interface HarvestLog {
    id: number;
    date: string;
    fieldName: string;
    workerName: string;
    quantityKg: number;
    cropType: string;
}

interface Field {
    fieldId: string;
    name: string;
    divisionId: string;
}

interface Worker {
    id: string;
    name: string;
    jobRole: string;
}

import { useNavigate } from 'react-router-dom';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import EventNoteIcon from '@mui/icons-material/EventNote';

export default function FieldOfficerDashboard() {
    const navigate = useNavigate();
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    const [loading, setLoading] = useState(true);
    const [musters, setMusters] = useState<Muster[]>([]);
    const [harvestLogs, setHarvestLogs] = useState<HarvestLog[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [fields, setFields] = useState<Field[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]); // Added workers state

    // KPIs
    const [dailyYield, setDailyYield] = useState(0);
    const [workerTurnout, setWorkerTurnout] = useState(0);
    const [fertilizerStock, setFertilizerStock] = useState('Checking...');

    const [weeklyYieldData, setWeeklyYieldData] = useState<any[]>([]);
    const [groupedMuster, setGroupedMuster] = useState<any[]>([]);

    // Forms
    const [openMuster, setOpenMuster] = useState(false);
    const [openHarvest, setOpenHarvest] = useState(false);

    // New Muster State
    const [newMuster, setNewMuster] = useState<{ fieldName: string, taskType: string, workerIds: string[] }>({
        fieldName: '',
        taskType: 'Plucking',
        workerIds: []
    });
    // New Harvest State
    const [newHarvest, setNewHarvest] = useState({ fieldName: '', workerName: '', quantityKg: 0, cropType: 'Tea' });

    useEffect(() => {
        fetchData();
        fetchWorkers(); // Fetch workers on mount
    }, []);

    const fetchWorkers = async () => {
        try {
            const divisionAccess = userSession.divisionAccess || [];
            // Ideally fetch by division, but for now fetch all active workers for tenant if no specific division filter
            // Or if backend supports filtering by multiple divisions, we'd do that.
            // For now, let's just get all workers for the tenant to populate the dropdown.
            const res = await axios.get(`/api/workers?tenantId=${tenantId}`);
            setWorkers(res.data);
        } catch (err) {
            console.error("Failed to fetch workers", err);
        }
    }

    const fetchData = async () => {
        try {
            // Filter data based on User's Assigned Divisions
            const myDivisions = userSession.divisionAccess || [];
            const primaryDivisionId = myDivisions.length > 0 ? myDivisions[0] : '';

            const [musterRes, harvestRes, invRes, divRes, fieldRes] = await Promise.all([
                axios.get(`/api/operations/muster?tenantId=${tenantId}${primaryDivisionId ? `&divisionId=${primaryDivisionId}` : ''}`),
                axios.get(`/api/operations/harvest?tenantId=${tenantId}${primaryDivisionId ? `&divisionId=${primaryDivisionId}` : ''}`),
                axios.get(`/api/inventory?tenantId=${tenantId}`),
                axios.get(`/api/divisions?tenantId=${tenantId}`),
                axios.get(primaryDivisionId
                    ? `/api/fields?divisionId=${primaryDivisionId}`
                    : `/api/fields?tenantId=${tenantId}`)
            ]);

            setMusters(musterRes.data);
            setHarvestLogs(harvestRes.data);
            setInventory(invRes.data);
            setFields(fieldRes.data);

            // Calculate KPIs
            const today = new Date().toISOString().split('T')[0];

            const todayHarvest = harvestRes.data
                .filter((h: HarvestLog) => h.date === today)
                .reduce((sum: number, h: HarvestLog) => sum + h.quantityKg, 0);
            setDailyYield(todayHarvest);

            const todayMuster = musterRes.data
                .filter((m: Muster) => m.date === today)
                .reduce((sum: number, m: Muster) => sum + m.workerCount, 0);
            setWorkerTurnout(todayMuster);

            const fertStock = invRes.data
                .filter((i: any) => i.category === 'Fertilizer')
                .reduce((sum: number, i: any) => sum + i.currentQuantity, 0);
            setFertilizerStock(fertStock > 0 ? `${fertStock} kg` : 'Low Stock');

            // Calculate Weekly Yield (Last 7 Days)
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                return d.toISOString().split('T')[0];
            });

            const weeklyData = last7Days.map(date => {
                const dayYield = harvestRes.data
                    .filter((h: HarvestLog) => h.date === date)
                    .reduce((sum: number, h: HarvestLog) => sum + h.quantityKg, 0);
                return { date: date.slice(5), yield: dayYield }; // MM-DD
            });
            setWeeklyYieldData(weeklyData);

            // Group Muster by Field & Task
            const grouped = musterRes.data
                .filter((m: Muster) => m.date === today)
                .reduce((acc: any, m: Muster) => {
                    const key = `${m.fieldName}-${m.taskType}`;
                    if (!acc[key]) acc[key] = { ...m, workerCount: 0 };
                    acc[key].workerCount += m.workerCount;
                    return acc;
                }, {});
            setGroupedMuster(Object.values(grouped));

            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
            setLoading(false);
        }
    };

    const handleCreateMuster = async () => {
        try {
            const divisionId = (userSession.divisionAccess && userSession.divisionAccess.length > 0) ? userSession.divisionAccess[0] : null;
            await axios.post('/api/operations/muster', {
                ...newMuster,
                tenantId,
                divisionId,
                date: new Date().toISOString().split('T')[0],
                workerCount: newMuster.workerIds.length // Optimistically send count, backend recalculates anyway
            });
            setOpenMuster(false);
            setNewMuster({ fieldName: '', taskType: 'Plucking', workerIds: [] }); // Reset form
            fetchData();
        } catch (e) {
            alert("Failed to create Muster");
        }
    };

    const handleLogHarvest = async () => {
        try {
            const divisionId = (userSession.divisionAccess && userSession.divisionAccess.length > 0) ? userSession.divisionAccess[0] : null;
            await axios.post('/api/operations/harvest', { ...newHarvest, tenantId, divisionId, date: new Date().toISOString().split('T')[0] });
            setOpenHarvest(false);
            fetchData();
        } catch (e) {
            alert("Failed to log Harvest");
        }
    };

    // handleApproveMuster removed as per request (Manager Only)

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h4" fontWeight="bold" color="primary">
                    Field Operation Center
                </Typography>
                <Box>
                    {/* Buttons removed as per request */}
                </Box>
            </Box>

            {/* KPI Section */}
            <Grid container spacing={3} mb={4}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper elevation={2} sx={{ p: 2, borderLeft: '4px solid #4caf50' }}>
                        <Typography variant="subtitle2" color="text.secondary">Daily Yield (Today)</Typography>
                        <Typography variant="h4" fontWeight="bold">{dailyYield} kg</Typography>
                        <Typography variant="caption" color="success.main">Live Updates</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper elevation={2} sx={{ p: 2, borderLeft: '4px solid #2196f3' }}>
                        <Typography variant="subtitle2" color="text.secondary">Worker Turnout</Typography>
                        <Typography variant="h4" fontWeight="bold">{workerTurnout}</Typography>
                        <Typography variant="caption" color="text.secondary">Workers Present</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper elevation={2} sx={{ p: 2, borderLeft: '4px solid #ff9800' }}>
                        <Typography variant="subtitle2" color="text.secondary">Avg Productivity</Typography>
                        <Typography variant="h4" fontWeight="bold">{workerTurnout > 0 ? (dailyYield / workerTurnout).toFixed(1) : 0} kg/p</Typography>
                        <Typography variant="caption" color="text.secondary">Target: 25 kg/p</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper elevation={2} sx={{ p: 2, borderLeft: '4px solid #9c27b0' }}>
                        <Typography variant="subtitle2" color="text.secondary">Fertilizer Stock</Typography>
                        <Typography variant="h4" fontWeight="bold">{fertilizerStock}</Typography>
                        <Typography variant="caption" color="error.main">Store Level</Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Quick Actions */}
            <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 1, color: 'text.secondary' }}>Quick Actions</Typography>
            <Grid container spacing={3} mb={4}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card
                        sx={{
                            cursor: 'pointer',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                            borderLeft: '4px solid #1b5e20'
                        }}
                        onClick={() => navigate('/dashboard/distribution-works')}
                    >
                        <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#e8f5e9', mr: 2 }}>
                                <WorkHistoryIcon sx={{ color: '#1b5e20', fontSize: 30 }} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle1" fontWeight="bold">Distribution of Works</Typography>
                                <Typography variant="caption" color="text.secondary">Manage Monthly Plan</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card
                        sx={{
                            cursor: 'pointer',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                            borderLeft: '4px solid #fbc02d'
                        }}
                        onClick={() => navigate('/dashboard/leave-application')}
                    >
                        <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#fff9c4', mr: 2 }}>
                                <EventNoteIcon sx={{ color: '#f57f17', fontSize: 30 }} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle1" fontWeight="bold">Leave Application</Typography>
                                <Typography variant="caption" color="text.secondary">Apply & View Status</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }, borderLeft: '4px solid #1976d2' }} onClick={() => navigate('/dashboard/correspondence')}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#e3f2fd', mr: 2 }}><ChatIcon sx={{ color: '#1976d2', fontSize: 30 }} /></Box>
                            <Box><Typography variant="subtitle1" fontWeight="bold">Correspondence</Typography><Typography variant="caption" color="text.secondary">Team Messages</Typography></Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }, borderLeft: '4px solid #388e3c' }} onClick={() => navigate('/dashboard/crop-ages')}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#e8f5e9', mr: 2 }}><ForestIcon sx={{ color: '#388e3c', fontSize: 30 }} /></Box>
                            <Box><Typography variant="subtitle1" fontWeight="bold">Crop Ages</Typography><Typography variant="caption" color="text.secondary">Field Maturities</Typography></Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }, borderLeft: '4px solid #7b1fa2' }} onClick={() => navigate('/dashboard/order-request')}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f3e5f5', mr: 2 }}><InventoryIcon sx={{ color: '#7b1fa2', fontSize: 30 }} /></Box>
                            <Box><Typography variant="subtitle1" fontWeight="bold">Order Request</Typography><Typography variant="caption" color="text.secondary">Store Requisitions</Typography></Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }, borderLeft: '4px solid #d32f2f' }} onClick={() => navigate('/dashboard/pending-orders')}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#ffebee', mr: 2 }}><HistoryIcon sx={{ color: '#d32f2f', fontSize: 30 }} /></Box>
                            <Box><Typography variant="subtitle1" fontWeight="bold">Pending Orders</Typography><Typography variant="caption" color="text.secondary">Status History</Typography></Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                {/* Chart Section */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper elevation={2} sx={{ p: 3, height: 400 }}>
                        <Typography variant="h6" gutterBottom color="primary">Weekly Yield Performance</Typography>
                        <Box sx={{ width: '100%', height: 320 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={weeklyYieldData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <RechartsTooltip />
                                    <Legend />
                                    <Bar dataKey="yield" fill="#4caf50" name="Yield (Kg)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>

                {/* Divisional Assignments (Grouped Muster) */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ height: 400, overflow: 'auto' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2} justifyContent="space-between">
                                <Box display="flex" alignItems="center">
                                    <GroupIcon color="secondary" sx={{ mr: 1 }} />
                                    <Typography variant="h6">Today's Plan</Typography>
                                </Box>
                                <Chip label={`${workerTurnout} Workers`} size="small" color="success" variant="outlined" />
                            </Box>

                            <List dense>
                                {groupedMuster.map((m: any, index) => (
                                    <div key={index}>
                                        <ListItem
                                            sx={{
                                                bgcolor: '#f5f5f5',
                                                borderRadius: 2,
                                                mb: 1,
                                                borderLeft: `4px solid ${m.taskType === 'Plucking' ? '#4caf50' : '#ffa000'}`
                                            }}
                                        >
                                            <ListItemText
                                                primary={
                                                    <Typography variant="subtitle2" fontWeight="bold">
                                                        {m.fieldName}
                                                    </Typography>
                                                }
                                                secondary={m.taskType}
                                            />
                                            <Chip label={m.workerCount} size="small" sx={{ fontWeight: 'bold' }} />
                                        </ListItem>
                                    </div>
                                ))}
                                {groupedMuster.length === 0 && (
                                    <Box textAlign="center" py={4}>
                                        <Typography variant="body2" color="text.secondary">No Assignments Yet</Typography>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            sx={{ mt: 2 }}
                                            onClick={() => setOpenMuster(true)}
                                            startIcon={<AddIcon />}
                                        >
                                            Create Assignments
                                        </Button>
                                    </Box>
                                )}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Add Muster Dialog */}
            <Dialog open={openMuster} onClose={() => setOpenMuster(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Morning Muster</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Field Name</InputLabel>
                        <Select
                            value={newMuster.fieldName}
                            label="Field Name"
                            onChange={(e) => setNewMuster({ ...newMuster, fieldName: e.target.value })}
                        >
                            {fields.map((field) => (
                                <MenuItem key={field.fieldId} value={field.name}>
                                    {field.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Task Type</InputLabel>
                        <Select value={newMuster.taskType} label="Task Type" onChange={(e) => setNewMuster({ ...newMuster, taskType: e.target.value })}>
                            <MenuItem value="Plucking">Plucking</MenuItem>
                            <MenuItem value="Weeding">Weeding</MenuItem>
                            <MenuItem value="Fertilizing">Fertilizing</MenuItem>
                            <MenuItem value="Tapping">Tapping</MenuItem>
                        </Select>
                    </FormControl>

                    {/* Worker Multi-Select */}
                    {/* Worker Multi-Select with Autocomplete and Grouping */}
                    <Autocomplete
                        multiple
                        id="worker-select-grouped"
                        options={workers.sort((a, b) => a.jobRole.localeCompare(b.jobRole))}
                        groupBy={(option) => option.jobRole}
                        getOptionLabel={(option) => option.name}
                        value={workers.filter(w => newMuster.workerIds.includes(w.id))}
                        onChange={(event, newValue) => {
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
                        renderOption={(props, option, { selected }) => (
                            <li {...props} key={option.id}>
                                <Checkbox
                                    checked={selected}
                                    style={{ marginRight: 8 }}
                                />
                                <Box>
                                    <Typography variant="body2">{option.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Reg: {option.id ? '...' : '' /* Should use RegNo but interface defines name/jobRole only */}
                                        {/* Wait, Interface Worker only has id, name, jobRole. Need to add RegNo to interface? */}
                                        {option.jobRole}
                                    </Typography>
                                </Box>
                            </li>
                        )}
                        sx={{ mt: 2 }}
                    />

                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenMuster(false)}>Cancel</Button>
                    <Button onClick={handleCreateMuster} variant="contained" disabled={newMuster.workerIds.length === 0 || !newMuster.fieldName}>
                        Assign ({newMuster.workerIds.length})
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Log Harvest Dialog */}
            <Dialog open={openHarvest} onClose={() => setOpenHarvest(false)}>
                <DialogTitle>Log Daily Harvest</DialogTitle>
                <DialogContent>
                    <TextField autoFocus margin="dense" label="Worker Name / Gang ID" fullWidth value={newHarvest.workerName} onChange={(e) => setNewHarvest({ ...newHarvest, workerName: e.target.value })} />
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Field Name</InputLabel>
                        <Select
                            value={newHarvest.fieldName}
                            label="Field Name"
                            onChange={(e) => setNewHarvest({ ...newHarvest, fieldName: e.target.value })}
                        >
                            {fields.map((field) => (
                                <MenuItem key={field.fieldId} value={field.name}>
                                    {field.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField margin="dense" label="Quantity (kg)" type="number" fullWidth value={newHarvest.quantityKg} onChange={(e) => setNewHarvest({ ...newHarvest, quantityKg: Number(e.target.value) })} />
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Crop Type</InputLabel>
                        <Select value={newHarvest.cropType} label="Crop Type" onChange={(e) => setNewHarvest({ ...newHarvest, cropType: e.target.value })}>
                            {(userSession.config?.crops || ['Tea', 'Rubber', 'Cinnamon']).map((crop: string) => (
                                <MenuItem key={crop} value={crop}>{crop}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenHarvest(false)}>Cancel</Button>
                    <Button onClick={handleLogHarvest} variant="contained" color="secondary">Submit Log</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
