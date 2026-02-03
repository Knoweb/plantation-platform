import { Box, Grid, Paper, Typography, Card, CardContent, Button, List, ListItem, ListItemText, Divider, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, FormControl, InputLabel, Chip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GroupIcon from '@mui/icons-material/Group';
import InventoryIcon from '@mui/icons-material/Inventory';
import AddIcon from '@mui/icons-material/Add';
import { BarChart } from '@mui/x-charts/BarChart';
import { useState, useEffect } from 'react';
import axios from 'axios';

interface Muster {
    id: number;
    date: string;
    fieldName: string;
    taskType: string;
    workerCount: number;
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

export default function FieldOfficerDashboard() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    const [loading, setLoading] = useState(true);
    const [musters, setMusters] = useState<Muster[]>([]);
    const [harvestLogs, setHarvestLogs] = useState<HarvestLog[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);

    // KPIs
    const [dailyYield, setDailyYield] = useState(0);
    const [workerTurnout, setWorkerTurnout] = useState(0);
    const [fertilizerStock, setFertilizerStock] = useState('Checking...');

    // Forms
    const [openMuster, setOpenMuster] = useState(false);
    const [openHarvest, setOpenHarvest] = useState(false);

    // New Muster State
    const [newMuster, setNewMuster] = useState({ fieldName: '', taskType: 'Plucking', workerCount: 0 });
    // New Harvest State
    const [newHarvest, setNewHarvest] = useState({ fieldName: '', workerName: '', quantityKg: 0, cropType: 'Tea' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [musterRes, harvestRes, invRes] = await Promise.all([
                axios.get(`http://localhost:8080/api/operations/muster?tenantId=${tenantId}`),
                axios.get(`http://localhost:8080/api/operations/harvest?tenantId=${tenantId}`),
                axios.get(`http://localhost:8080/api/inventory?tenantId=${tenantId}`)
            ]);

            setMusters(musterRes.data);
            setHarvestLogs(harvestRes.data);
            setInventory(invRes.data);

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

            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
            setLoading(false);
        }
    };

    const handleCreateMuster = async () => {
        try {
            await axios.post('http://localhost:8080/api/operations/muster', { ...newMuster, tenantId, date: new Date().toISOString().split('T')[0] });
            setOpenMuster(false);
            fetchData();
        } catch (e) {
            alert("Failed to create Muster");
        }
    };

    const handleLogHarvest = async () => {
        try {
            await axios.post('http://localhost:8080/api/operations/harvest', { ...newHarvest, tenantId, date: new Date().toISOString().split('T')[0] });
            setOpenHarvest(false);
            fetchData();
        } catch (e) {
            alert("Failed to log Harvest");
        }
    };

    const handleApproveMuster = async (id: number) => {
        try {
            await axios.put(`http://localhost:8080/api/operations/muster/${id}/approve`);
            fetchData();
        } catch (e) {
            alert("Approval Failed");
        }
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h4" fontWeight="bold" color="primary">
                    Field Operation Center
                </Typography>
                <Box>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenMuster(true)} sx={{ mr: 1 }}>
                        New Muster
                    </Button>
                    <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={() => setOpenHarvest(true)}>
                        Log Harvest
                    </Button>
                </Box>
            </Box>

            {/* KPI Section */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={2} sx={{ p: 2, borderLeft: '4px solid #4caf50' }}>
                        <Typography variant="subtitle2" color="text.secondary">Daily Yield (Today)</Typography>
                        <Typography variant="h4" fontWeight="bold">{dailyYield} kg</Typography>
                        <Typography variant="caption" color="success.main">Live Updates</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={2} sx={{ p: 2, borderLeft: '4px solid #2196f3' }}>
                        <Typography variant="subtitle2" color="text.secondary">Worker Turnout</Typography>
                        <Typography variant="h4" fontWeight="bold">{workerTurnout}</Typography>
                        <Typography variant="caption" color="text.secondary">Workers Present</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={2} sx={{ p: 2, borderLeft: '4px solid #ff9800' }}>
                        <Typography variant="subtitle2" color="text.secondary">Avg Productivity</Typography>
                        <Typography variant="h4" fontWeight="bold">{workerTurnout > 0 ? (dailyYield / workerTurnout).toFixed(1) : 0} kg/p</Typography>
                        <Typography variant="caption" color="text.secondary">Target: 25 kg/p</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={2} sx={{ p: 2, borderLeft: '4px solid #9c27b0' }}>
                        <Typography variant="subtitle2" color="text.secondary">Fertilizer Stock</Typography>
                        <Typography variant="h4" fontWeight="bold">{fertilizerStock}</Typography>
                        <Typography variant="caption" color="error.main">Store Level</Typography>
                    </Paper>
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                {/* Recent Harvests */}
                <Grid item xs={12} md={8}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                                <Typography variant="h6">Recent Harvest Logs</Typography>
                            </Box>
                            <List dense>
                                {harvestLogs.slice(0, 5).map((log) => (
                                    <div key={log.id}>
                                        <ListItem>
                                            <ListItemText
                                                primary={`${log.workerName} - ${log.quantityKg} kg (${log.cropType})`}
                                                secondary={`Field: ${log.fieldName} • ${log.date}`}
                                            />
                                        </ListItem>
                                        <Divider />
                                    </div>
                                ))}
                                {harvestLogs.length === 0 && <Typography variant="body2" color="text.secondary">No harvest recorded yet.</Typography>}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Muster List */}
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                <GroupIcon color="secondary" sx={{ mr: 1 }} />
                                <Typography variant="h6">Today's Muster</Typography>
                            </Box>
                            <List dense>
                                {musters.slice(0, 5).map((m) => (
                                    <div key={m.id}>
                                        <ListItem
                                            secondaryAction={
                                                m.status === 'PENDING' && (
                                                    <Button size="small" variant="contained" color="success" onClick={() => handleApproveMuster(m.id)}>
                                                        Approve
                                                    </Button>
                                                )
                                            }
                                        >
                                            <ListItemText
                                                primary={`${m.fieldName} - ${m.taskType}`}
                                                secondary={`${m.workerCount} Workers • ${m.status}`}
                                            />
                                        </ListItem>
                                        <Divider />
                                    </div>
                                ))}
                                {musters.length === 0 && <Typography variant="body2" color="text.secondary">No muster assignments.</Typography>}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Add Muster Dialog */}
            <Dialog open={openMuster} onClose={() => setOpenMuster(false)}>
                <DialogTitle>Add Morning Muster</DialogTitle>
                <DialogContent>
                    <TextField autoFocus margin="dense" label="Field Name (e.g., Field No. 4)" fullWidth value={newMuster.fieldName} onChange={(e) => setNewMuster({ ...newMuster, fieldName: e.target.value })} />
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Task Type</InputLabel>
                        <Select value={newMuster.taskType} label="Task Type" onChange={(e) => setNewMuster({ ...newMuster, taskType: e.target.value })}>
                            <MenuItem value="Plucking">Plucking</MenuItem>
                            <MenuItem value="Weeding">Weeding</MenuItem>
                            <MenuItem value="Fertilizing">Fertilizing</MenuItem>
                            <MenuItem value="Tapping">Tapping</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField margin="dense" label="Worker Count" type="number" fullWidth value={newMuster.workerCount} onChange={(e) => setNewMuster({ ...newMuster, workerCount: Number(e.target.value) })} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenMuster(false)}>Cancel</Button>
                    <Button onClick={handleCreateMuster} variant="contained">Assign</Button>
                </DialogActions>
            </Dialog>

            {/* Log Harvest Dialog */}
            <Dialog open={openHarvest} onClose={() => setOpenHarvest(false)}>
                <DialogTitle>Log Daily Harvest</DialogTitle>
                <DialogContent>
                    <TextField autoFocus margin="dense" label="Worker Name / Gang ID" fullWidth value={newHarvest.workerName} onChange={(e) => setNewHarvest({ ...newHarvest, workerName: e.target.value })} />
                    <TextField margin="dense" label="Field Name" fullWidth value={newHarvest.fieldName} onChange={(e) => setNewHarvest({ ...newHarvest, fieldName: e.target.value })} />
                    <TextField margin="dense" label="Quantity (kg)" type="number" fullWidth value={newHarvest.quantityKg} onChange={(e) => setNewHarvest({ ...newHarvest, quantityKg: Number(e.target.value) })} />
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Crop Type</InputLabel>
                        <Select value={newHarvest.cropType} label="Crop Type" onChange={(e) => setNewHarvest({ ...newHarvest, cropType: e.target.value })}>
                            <MenuItem value="Tea">Tea</MenuItem>
                            <MenuItem value="Rubber">Rubber</MenuItem>
                            <MenuItem value="Cinnamon">Cinnamon</MenuItem>
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
