import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    Grid,
    Card,
    CardContent,
    CardActions,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Container,
    Alert,
    CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

export default function Divisions() {
    const [divisions, setDivisions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [editingDivision, setEditingDivision] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '' });

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const tenantId = user?.tenantId;

    useEffect(() => {
        if (tenantId) fetchDivisions();
        else setError("No tenant ID found. Please login again.");
    }, [tenantId]);

    const fetchDivisions = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`http://localhost:8080/api/divisions?tenantId=${tenantId}`);
            setDivisions(response.data);
        } catch (err) {
            console.error("Failed to fetch divisions", err);
            setError("Failed to load divisions.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name.trim()) return;

        try {
            if (editingDivision) {
                // Update
                await axios.put(`http://localhost:8080/api/divisions/${editingDivision.divisionId}`, {
                    name: formData.name
                });
            } else {
                // Create
                await axios.post(`http://localhost:8080/api/divisions`, {
                    tenantId,
                    name: formData.name
                });
            }
            fetchDivisions();
            handleClose();
        } catch (err) {
            alert("Failed to save division. Name might be duplicate.");
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this division?")) {
            try {
                await axios.delete(`http://localhost:8080/api/divisions/${id}`);
                fetchDivisions();
            } catch (err) {
                alert("Failed to delete division.");
            }
        }
    };

    const handleOpen = (division: any = null) => {
        setEditingDivision(division);
        setFormData({ name: division ? division.name : '' });
        setOpenDialog(true);
    };

    const handleClose = () => {
        setOpenDialog(false);
        setEditingDivision(null);
        setFormData({ name: '' });
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" color="primary" fontWeight="bold">
                    Divisions
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpen()}
                >
                    Add Division
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box display="flex" justifyContent="center"><CircularProgress /></Box>
            ) : (
                <Grid container spacing={3}>
                    {divisions.map((div) => (
                        <Grid item xs={12} sm={6} md={4} key={div.divisionId}>
                            <Card elevation={3}>
                                <CardContent>
                                    <Typography variant="h6" fontWeight="bold">
                                        {div.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        ID: {div.divisionId.substring(0, 8)}...
                                    </Typography>
                                </CardContent>
                                <CardActions sx={{ justifyContent: 'flex-end' }}>
                                    <IconButton color="primary" onClick={() => handleOpen(div)}>
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton color="error" onClick={() => handleDelete(div.divisionId)}>
                                        <DeleteIcon />
                                    </IconButton>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                    {divisions.length === 0 && (
                        <Grid item xs={12}>
                            <Paper sx={{ p: 4, textAlign: 'center' }}>
                                <Typography color="text.secondary">
                                    No divisions found. Create your first division to get started.
                                </Typography>
                            </Paper>
                        </Grid>
                    )}
                </Grid>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={openDialog} onClose={handleClose} maxWidth="xs" fullWidth>
                <DialogTitle>{editingDivision ? "Edit Division" : "New Division"}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Division Name"
                        fullWidth
                        variant="outlined"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Upper Division"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained">Save</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
