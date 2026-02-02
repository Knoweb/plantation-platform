import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Grid, TextField, MenuItem, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
    Alert, Snackbar
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import axios from 'axios';

const WORK_TYPES = [
    { value: 'HARVEST', label: 'Harvest Collection (Plucking)' },
    { value: 'MUSTER', label: 'Morning Muster (Attendance)' },
    { value: 'MAINTENANCE', label: 'Field Maintenance (Weeding/Fertilizer)' },
    { value: 'OTHER', label: 'Other Work' }
];

export default function DailyEntry() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;
    // Get accessible divisions. If string array, use as is. If undefined, empty.
    const accessibleDivisions = userSession.divisionAccess || [];

    // If user is Admin/Manager (no restriction), they might need to fetch ALL divisions.
    // Ideally we fetch division names from backend because `divisionAccess` might just be IDs.
    // For now, let's assume we need to fetch Division Details to get Names.

    const [divisions, setDivisions] = useState<any[]>([]);
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    const [formData, setFormData] = useState({
        divisionId: '', // Selected Division ID
        workDate: new Date().toISOString().split('T')[0],
        workType: 'HARVEST',
        details: '',
        quantity: '',
        workerCount: ''
    });

    useEffect(() => {
        fetchDivisions();
        fetchRecords();
    }, [tenantId]);

    const fetchDivisions = async () => {
        try {
            const res = await axios.get(`http://localhost:8080/api/divisions?tenantId=${tenantId}`);
            setDivisions(res.data);

            // Auto-select if only one division available or assigned
            const available = res.data.filter((d: any) =>
                accessibleDivisions.length === 0 || accessibleDivisions.includes(d.divisionId)
            );

            if (available.length === 1) {
                setFormData(prev => ({ ...prev, divisionId: available[0].divisionId }));
            }
        } catch (error) {
            console.error("Failed to fetch divisions");
        }
    };

    const fetchRecords = async () => {
        try {
            // Fetch records for this tenant. 
            // In a real app, field officer might only see their own records.
            const res = await axios.get(`http://localhost:8080/api/tenants/daily-work?tenantId=${tenantId}`);
            setRecords(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.divisionId || !formData.workType) {
            setMessage("Please fill required fields.");
            return;
        }

        const payload = {
            tenantId,
            divisionId: formData.divisionId,
            workDate: formData.workDate,
            workType: formData.workType,
            details: formData.details,
            quantity: formData.quantity ? parseFloat(formData.quantity) : null,
            workerCount: formData.workerCount ? parseInt(formData.workerCount) : null
        };

        try {
            await axios.post('http://localhost:8080/api/tenants/daily-work', payload);
            setMessage("Entry Saved Successfully!");
            setFormData({ ...formData, details: '', quantity: '', workerCount: '' }); // Reset fields
            fetchRecords();
        } catch (error) {
            setMessage("Failed to save entry.");
        }
    };

    // Filter available divisions dropdown based on user access
    const availableDivisions = divisions.filter(d =>
        accessibleDivisions.length === 0 || accessibleDivisions.includes(d.divisionId)
    );

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                Daily Field Entry
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={3}>
                Record daily operational data for your division.
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} md={5}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>New Entry</Typography>

                        <TextField
                            select
                            fullWidth
                            label="Select Division"
                            margin="normal"
                            value={formData.divisionId}
                            onChange={(e) => setFormData({ ...formData, divisionId: e.target.value })}
                        >
                            {availableDivisions.map((div) => (
                                <MenuItem key={div.divisionId} value={div.divisionId}>{div.name}</MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            type="date"
                            fullWidth
                            label="Date"
                            margin="normal"
                            value={formData.workDate}
                            onChange={(e) => setFormData({ ...formData, workDate: e.target.value })}
                        />

                        <TextField
                            select
                            fullWidth
                            label="Work Type"
                            margin="normal"
                            value={formData.workType}
                            onChange={(e) => setFormData({ ...formData, workType: e.target.value })}
                        >
                            {WORK_TYPES.map(opt => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            fullWidth
                            label="Details / Notes"
                            margin="normal"
                            multiline
                            rows={2}
                            value={formData.details}
                            onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                        />

                        <Box display="flex" gap={2}>
                            <TextField
                                fullWidth
                                label="Quantity (kg/acres)"
                                type="number"
                                margin="normal"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            />
                            <TextField
                                fullWidth
                                label="Worker Count"
                                type="number"
                                margin="normal"
                                value={formData.workerCount}
                                onChange={(e) => setFormData({ ...formData, workerCount: e.target.value })}
                            />
                        </Box>

                        <Button
                            variant="contained"
                            fullWidth
                            size="large"
                            startIcon={<SaveIcon />}
                            sx={{ mt: 3 }}
                            onClick={handleSubmit}
                        >
                            Submit Record
                        </Button>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={7}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>Recent Entries</Typography>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Division</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Details</TableCell>
                                        <TableCell>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {records.slice(0, 10).map((row) => {
                                        const divName = divisions.find(d => d.divisionId === row.divisionId)?.name || 'Unknown';
                                        return (
                                            <TableRow key={row.workId}>
                                                <TableCell>{row.workDate}</TableCell>
                                                <TableCell>{divName}</TableCell>
                                                <TableCell><Chip label={row.workType} size="small" /></TableCell>
                                                <TableCell>{row.details} {row.quantity ? `(${row.quantity})` : ''}</TableCell>
                                                <TableCell>
                                                    {row.status === 'APPROVED' ?
                                                        <CheckCircleIcon color="success" fontSize="small" /> :
                                                        <Chip label="Pending" size="small" color="warning" variant="outlined" />
                                                    }
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {records.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center">No records found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>
            </Grid>

            <Snackbar
                open={!!message}
                autoHideDuration={4000}
                onClose={() => setMessage('')}
                message={message}
            />
        </Box>
    );
}
