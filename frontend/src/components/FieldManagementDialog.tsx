import { useState, useEffect, useCallback } from 'react';
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
import EditIcon from '@mui/icons-material/Edit';
import axios from 'axios';
import { Snackbar } from '@mui/material';

interface Field {
    fieldId: string;
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
    openWithFieldId?: string | null;
    mode?: 'ADD' | 'EDIT' | 'MANAGE';
}

export default function FieldManagementDialog({ open, onClose, divisionId, divisionName, tenantId, openWithFieldId, mode = 'MANAGE' }: Props) {
    const [fields, setFields] = useState<Field[]>([]);
    const [activeCrops, setActiveCrops] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // New Field Form
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldCrop, setNewFieldCrop] = useState('');
    const [newFieldAcreage, setNewFieldAcreage] = useState<number | ''>('');

    // Edit Field Form
    const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
    const [editFieldName, setEditFieldName] = useState('');
    const [editFieldCrop, setEditFieldCrop] = useState('');
    const [editFieldAcreage, setEditFieldAcreage] = useState<number | ''>('');

    const fetchTenantDetails = useCallback(async () => {
        try {
            const res = await axios.get(`/api/tenants/${tenantId}`);
            if (res.data.configJson) {
                // Filter keys where value is true
                const crops = Object.entries(res.data.configJson)
                    .filter(([, value]) => value === true)
                    .map(([key]) => key.toUpperCase());

                setActiveCrops(crops);
                if (crops.length > 0) {
                    setNewFieldCrop(crops[0]);
                }
            }
        } catch (err) {
            console.error("Failed to fetch tenant details", err);
        }
    }, [tenantId]);

    const fetchFields = useCallback(async () => {
        if (!divisionId) return;
        try {
            setLoading(true);
            const res = await axios.get(`/api/fields?divisionId=${divisionId}`);
            setFields(res.data);

            if (openWithFieldId) {
                const target = res.data.find((f: Field) => f.fieldId === openWithFieldId);
                if (target) {
                    setEditingFieldId(target.fieldId);
                    setEditFieldName(target.name);
                    setEditFieldCrop(target.cropType);
                    setEditFieldAcreage(target.acreage);
                }
            }
        } catch (err) {
            console.error("Failed to fetch fields", err);
            setError("Failed to load fields.");
        } finally {
            setLoading(false);
        }
    }, [divisionId, openWithFieldId]);

    useEffect(() => {
        if (open && tenantId) {
            fetchTenantDetails();
        }
    }, [open, tenantId, fetchTenantDetails]);

    useEffect(() => {
        if (open && divisionId) {
            fetchFields();
            // Reset form
            setNewFieldName('');
            setNewFieldCrop('');
            setNewFieldAcreage('');
            setError('');
            setEditingFieldId(null);
        }
    }, [open, divisionId, fetchFields]);

    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({
        open: false, message: '', severity: 'success'
    });

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleAddField = async () => {
        if (!newFieldName) {
            setError("Field name is required.");
            return;
        }
        if (newFieldAcreage === '' || newFieldAcreage < 0) {
            setError("Valid acreage is required.");
            return;
        }

        try {
            await axios.post(`/api/fields`, {
                tenantId,
                divisionId,
                name: newFieldName,
                acreage: Number(newFieldAcreage),
                cropType: newFieldCrop
            });
            fetchFields();
            setNewFieldName('');
            setNewFieldAcreage('');
            setError('');
            showSnackbar("Field successfully added!", "success");
            setTimeout(() => {
                onClose();
                window.location.reload();
            }, 1000);
        } catch (err) {
            console.error("Failed to add field", err);
            setError("Failed to add field. Name might be duplicate.");
            showSnackbar("Failed to add field.", "error");
        }
    };

    const handleEditStart = (field: Field) => {
        setEditingFieldId(field.fieldId);
        setEditFieldName(field.name);
        setEditFieldCrop(field.cropType);
        setEditFieldAcreage(field.acreage);
    };

    const handleEditSave = async (id: string) => {
        if (!editFieldName) {
            showSnackbar("Field name is required.", "error");
            return;
        }
        try {
            await axios.put(`/api/fields/${id}`, {
                name: editFieldName,
                acreage: Number(editFieldAcreage),
                cropType: editFieldCrop
            });
            setEditingFieldId(null);
            showSnackbar("Field successfully updated!", "success");
            setTimeout(() => {
                onClose();
                window.location.reload();
            }, 1000);
        } catch (err) {
            console.error("Failed to update field", err);
            showSnackbar("Failed to update field.", "error");
        }
    };

    const handleDeleteField = async (id: string) => {
        if (!window.confirm("Delete this field?")) return;
        try {
            await axios.delete(`/api/fields/${id}`);
            fetchFields();
            showSnackbar("Field deleted.", "success");
        } catch (err) {
            showSnackbar("Failed to delete field.", "error");
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {mode === 'ADD' ? 'Add New Field' : mode === 'EDIT' ? 'Edit Field' : 'Manage Fields'}
                <Typography variant="subtitle2" color="text.secondary" component="div">
                    Division: {divisionName}
                </Typography>
            </DialogTitle>
            <DialogContent dividers>
                {/* Add New Field Section */}
                {(mode === 'ADD' || mode === 'MANAGE') && (
                    <Box sx={{ mb: mode === 'ADD' ? 0 : 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>Add New Field</Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                            <TextField
                                label="Field Name"
                                size="small"
                                value={newFieldName}
                                onChange={(e) => setNewFieldName(e.target.value)}
                                fullWidth
                                placeholder="e.g. Field No 1"
                            />
                            <TextField
                                label="Acres"
                                size="small"
                                type="number"
                                value={newFieldAcreage}
                                onChange={(e) => setNewFieldAcreage(e.target.value ? Number(e.target.value) : '')}
                                sx={{ width: { xs: '100%', sm: '150px' } }}
                                placeholder="0.0"
                                InputLabelProps={{ shrink: true }}
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
                                color="success"
                                onClick={handleAddField}
                                sx={{ whiteSpace: 'nowrap', mt: { xs: 1, sm: 0 } }}
                            >
                                Add Field
                            </Button>
                        </Box>
                        {error && <Alert severity="error" sx={{ mt: 1, py: 0 }}>{error}</Alert>}
                    </Box>
                )}

                {mode === 'MANAGE' && <Divider sx={{ mb: 2 }} />}

                {/* Fields List */}
                {(mode === 'EDIT' || mode === 'MANAGE') && (
                    <Box>
                        {mode === 'MANAGE' && (
                            <Typography variant="subtitle2" gutterBottom>Existing Fields ({fields.length})</Typography>
                        )}

                        {loading ? (
                            <Box display="flex" justifyContent="center" p={2}><CircularProgress size={24} /></Box>
                        ) : (
                            <List dense>
                                {fields.length === 0 && (
                                    <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                                        No fields added yet.
                                    </Typography>
                                )}
                                {fields.filter(f => mode === 'EDIT' ? f.fieldId === openWithFieldId : true).map((field) => (
                                    <ListItem key={field.fieldId} divider>
                                        {editingFieldId === field.fieldId ? (
                                            <Box display="flex" width="100%" gap={1} alignItems="center" pr={10}>
                                                <TextField
                                                    size="small"
                                                    value={editFieldName}
                                                    onChange={(e) => setEditFieldName(e.target.value)}
                                                    fullWidth
                                                    label="Name"
                                                    variant="standard"
                                                />
                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    value={editFieldAcreage}
                                                    onChange={(e) => setEditFieldAcreage(e.target.value ? Number(e.target.value) : '')}
                                                    sx={{ width: '130px' }}
                                                    label="Acres"
                                                    variant="standard"
                                                    InputLabelProps={{ shrink: true }}
                                                />
                                                <TextField
                                                    select
                                                    size="small"
                                                    value={editFieldCrop}
                                                    onChange={(e) => setEditFieldCrop(e.target.value)}
                                                    sx={{ width: '120px' }}
                                                    label="Crop"
                                                    variant="standard"
                                                >
                                                    {activeCrops.map(crop => (
                                                        <MenuItem key={crop} value={crop}>{crop}</MenuItem>
                                                    ))}
                                                </TextField>
                                            </Box>
                                        ) : (
                                            <ListItemText
                                                primary={
                                                    <Typography variant="body1" fontWeight="bold">
                                                        {field.name} <Typography component="span" variant="caption" color="text.secondary">({field.acreage} Acres)</Typography>
                                                    </Typography>
                                                }
                                                secondary={field.cropType}
                                            />
                                        )}

                                        <ListItemSecondaryAction>
                                            {editingFieldId === field.fieldId ? (
                                                <>
                                                    <Button variant="contained" color="success" size="small" onClick={() => handleEditSave(field.fieldId)} sx={{ mr: 1, textTransform: 'none' }}>
                                                        Save
                                                    </Button>
                                                    <Button variant="outlined" color="inherit" size="small" onClick={() => setEditingFieldId(null)} sx={{ textTransform: 'none' }}>
                                                        Cancel
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <IconButton edge="end" color="primary" onClick={() => handleEditStart(field)} sx={{ mr: 1 }}>
                                                        <EditIcon />
                                                    </IconButton>
                                                    <IconButton edge="end" color="error" onClick={() => handleDeleteField(field.fieldId)}>
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </>
                                            )}
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snackbar.severity} sx={{ width: '100%', boxShadow: 3 }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Dialog >
    );
}
