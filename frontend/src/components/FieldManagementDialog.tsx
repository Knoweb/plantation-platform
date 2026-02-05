import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    TextField,
    Box,
    Typography,
    Divider,
    MenuItem,
    Alert,
    CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import axios from 'axios';

interface Field {
    id: string;
    name: string;
    acreage: number;
    cropType: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    divisionId: string | null;
    divisionName: string;
    tenantId: string;
}

export default function FieldManagementDialog({ open, onClose, divisionId, divisionName, tenantId }: Props) {
    const [fields, setFields] = useState<Field[]>([]);
    const [activeCrops, setActiveCrops] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // New Field Form
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldCrop, setNewFieldCrop] = useState('');

    useEffect(() => {
        if (open && tenantId) {
            fetchTenantDetails();
        }
    }, [open, tenantId]);

    useEffect(() => {
        if (open && divisionId) {
            fetchFields();
            // Reset form
            setNewFieldName('');
            setNewFieldCrop('');
            setError('');
        }
    }, [open, divisionId]);

    const fetchTenantDetails = async () => {
        try {
            const res = await axios.get(`http://localhost:8081/api/tenants/${tenantId}`);
            if (res.data.configJson) {
                // Filter keys where value is true
                const crops = Object.entries(res.data.configJson)
                    .filter(([_, value]) => value === true)
                    .map(([key]) => key.toUpperCase());

                setActiveCrops(crops);
                if (crops.length > 0) {
                    setNewFieldCrop(crops[0]);
                }
            }
        } catch (err) {
            console.error("Failed to fetch tenant details", err);
        }
    };

    const fetchFields = async () => {
        if (!divisionId) return;
        try {
            setLoading(true);
            const res = await axios.get(`http://localhost:8081/api/fields?divisionId=${divisionId}`);
            setFields(res.data);
        } catch (err) {
            console.error("Failed to fetch fields", err);
            setError("Failed to load fields.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddField = async () => {
        if (!newFieldName) {
            setError("Field name is required.");
            return;
        }

        try {
            await axios.post(`http://localhost:8081/api/fields`, {
                tenantId,
                divisionId,
                name: newFieldName,
                acreage: 0.0, // Defaulted as per request
                cropType: newFieldCrop
            });
            fetchFields();
            setNewFieldName('');
            setError('');
        } catch (err) {
            console.error("Failed to add field", err);
            setError("Failed to add field. Name might be duplicate.");
        }
    };

    const handleDeleteField = async (id: string) => {
        if (!window.confirm("Delete this field?")) return;
        try {
            await axios.delete(`http://localhost:8081/api/fields/${id}`);
            fetchFields();
        } catch (err) {
            alert("Failed to delete field.");
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                Manage Fields
                <Typography variant="subtitle2" color="text.secondary" component="div">
                    Division: {divisionName}
                </Typography>
            </DialogTitle>
            <DialogContent dividers>
                {/* Add New Field Section */}
                <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>Add New Field</Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            label="Field Name"
                            size="small"
                            value={newFieldName}
                            onChange={(e) => setNewFieldName(e.target.value)}
                            fullWidth
                            placeholder="e.g. Field No 1"
                        />
                        <TextField
                            select
                            label="Crop Type"
                            size="small"
                            value={newFieldCrop}
                            onChange={(e) => setNewFieldCrop(e.target.value)}
                            sx={{ minWidth: 120 }}
                        >
                            {activeCrops.map(crop => (
                                <MenuItem key={crop} value={crop}>{crop}</MenuItem>
                            ))}
                        </TextField>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleAddField}
                            sx={{ whiteSpace: 'nowrap' }}
                        >
                            Add
                        </Button>
                    </Box>
                    {error && <Alert severity="error" sx={{ mt: 1, py: 0 }}>{error}</Alert>}
                </Box>

                <Divider sx={{ mb: 2 }} />

                {/* Fields List */}
                <Typography variant="subtitle2" gutterBottom>Existing Fields ({fields.length})</Typography>

                {loading ? (
                    <Box display="flex" justifyContent="center" p={2}><CircularProgress size={24} /></Box>
                ) : (
                    <List dense>
                        {fields.length === 0 && (
                            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                                No fields added yet.
                            </Typography>
                        )}
                        {fields.map((field) => (
                            <ListItem key={field.id} divider>
                                <ListItemText
                                    primary={field.name}
                                    secondary={field.cropType}
                                />
                                <ListItemSecondaryAction>
                                    <IconButton edge="end" color="error" onClick={() => handleDeleteField(field.id)}>
                                        <DeleteIcon />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))}
                    </List>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
