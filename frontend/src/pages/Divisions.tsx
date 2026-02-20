import AgricultureIcon from '@mui/icons-material/Agriculture';
import FieldManagementDialog from '../components/FieldManagementDialog';
import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Container,
    Alert,
    CircularProgress,
    Tooltip,
    Grow
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SpaIcon from '@mui/icons-material/Spa';
import ForestIcon from '@mui/icons-material/Forest';
import TerrainIcon from '@mui/icons-material/Terrain';
import axios from 'axios';

export default function Divisions() {
    const [divisions, setDivisions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [editingDivision, setEditingDivision] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '' });

    // Field Management State
    const [openFieldDialog, setOpenFieldDialog] = useState(false);
    const [selectedDivisionForFields, setSelectedDivisionForFields] = useState<any>(null);

    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = user?.tenantId;
    const isManager = user.role === 'MANAGER';
    const assignedDivisions = user.divisionAccess || [];

    useEffect(() => {
        if (tenantId) fetchDivisions();
        else setError("No tenant ID found. Please login again.");
    }, [tenantId]);

    const fetchDivisions = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/divisions?tenantId=${tenantId}`);
            let data = response.data;

            // Filter for Manager
            if (isManager && assignedDivisions.length > 0) {
                data = data.filter((d: any) => assignedDivisions.includes(d.divisionId));
            } else if (isManager) {
                // If manager has no assigned divisions, show empty
                data = [];
            }

            setDivisions(data);
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
                await axios.put(`/api/divisions/${editingDivision.divisionId}`, {
                    name: formData.name
                });
            } else {
                // Create
                await axios.post(`/api/divisions`, {
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
                await axios.delete(`/api/divisions/${id}`);
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

    const handleOpenFields = (division: any) => {
        setSelectedDivisionForFields(division);
        setOpenFieldDialog(true);
    }

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
                    disabled={isManager}
                    sx={{ visibility: isManager ? 'hidden' : 'visible' }}
                >
                    Add Division
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box display="flex" justifyContent="center" height="50vh" alignItems="center">
                    <CircularProgress size={60} thickness={4} />
                </Box>
            ) : (
                <Box display="flex" flexWrap="wrap" gap={3}>
                    {divisions.map((div, index) => (
                        <Grow in={true} timeout={(index + 1) * 300} key={div.divisionId}>
                            <Box width={{ xs: '100%', md: '48%', lg: '32%' }} display="flex">
                                <DivisionMapTile
                                    division={div}
                                    onEdit={() => handleOpen(div)}
                                    onDelete={() => handleDelete(div.divisionId)}
                                    onManageFields={() => handleOpenFields(div)}
                                    readOnly={isManager}
                                />
                            </Box>
                        </Grow>
                    ))}
                    {divisions.length === 0 && (
                        <Paper sx={{ p: 6, textAlign: 'center', width: '100%', borderRadius: 4, bgcolor: '#f5f5f5' }}>
                            <Box mb={2}><AgricultureIcon sx={{ fontSize: 60, color: '#bdbdbd' }} /></Box>
                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                No Divisions Found
                            </Typography>
                            <Typography variant="body2" color="text.secondary" mb={3}>
                                Start mapping your estate by adding a division.
                            </Typography>
                            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => handleOpen()}>
                                Create Division
                            </Button>
                        </Paper>
                    )}
                </Box>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={openDialog} onClose={handleClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 'bold' }}>{editingDivision ? "Edit Division" : "New Division"}</DialogTitle>
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
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={handleClose} color="inherit">Cancel</Button>
                    <Button onClick={handleSave} variant="contained" sx={{ px: 4, borderRadius: 2 }}>Save</Button>
                </DialogActions>
            </Dialog>

            {/* Field Management Dialog */}
            <FieldManagementDialog
                open={openFieldDialog}
                onClose={() => setOpenFieldDialog(false)}
                divisionId={selectedDivisionForFields?.divisionId}
                divisionName={selectedDivisionForFields?.name || ''}
                tenantId={tenantId}
            />
        </Container>
    );
}

interface DivisionMapTileProps {
    division: any;
    onEdit: () => void;
    onDelete: () => void;
    onManageFields: () => void;
    readOnly?: boolean;
}



function DivisionMapTile({ division, onEdit, onDelete, onManageFields, readOnly = false }: DivisionMapTileProps) {
    const [fields, setFields] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFields();
    }, [division.divisionId]);

    const fetchFields = async () => {
        try {
            const response = await axios.get(`/api/fields?divisionId=${division.divisionId}`);
            setFields(response.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Calculate crop distribution
    const teaCount = fields.filter(f => f.cropType === 'TEA').length;
    const rubberCount = fields.filter(f => f.cropType === 'RUBBER').length;
    const otherCount = fields.length - teaCount - rubberCount;

    return (
        <Paper
            elevation={4}
            sx={{
                p: 0,
                borderRadius: 3,
                overflow: 'hidden',
                position: 'relative',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
                    '& .manage-overlay': { opacity: 1 }
                },
                bgcolor: 'white',
                display: 'flex',
                flexDirection: 'column',
                width: '100%'
            }}
        >
            {/* Header / Map Title */}
            <Box
                sx={{
                    p: 2,
                    background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #a5d6a7'
                }}
            >
                <Box>
                    <Typography variant="h6" fontWeight="800" color="#1b5e20" sx={{ letterSpacing: 0.5 }}>
                        {division.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <TerrainIcon fontSize="inherit" /> {fields.length} Fields
                    </Typography>
                </Box>
                <IconButton
                    size="small"
                    onClick={onEdit}
                    disabled={readOnly}
                    sx={{ bgcolor: 'white', '&:hover': { bgcolor: '#f1f8e9' }, visibility: readOnly ? 'hidden' : 'visible' }}
                >
                    <EditIcon fontSize="small" color="success" />
                </IconButton>
            </Box>

            {/* Visual Field Map */}
            <Box sx={{ p: 2, minHeight: 140, bgcolor: '#f9fbe7', flex: 1 }}>
                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                        <CircularProgress size={24} color="success" />
                    </Box>
                ) : fields.length === 0 ? (
                    <Box
                        display="flex"
                        flexDirection="column"
                        justifyContent="center"
                        alignItems="center"
                        height="100%"
                        color="text.secondary"
                        sx={{ opacity: 0.6 }}
                    >
                        <AgricultureIcon sx={{ fontSize: 40, mb: 1, color: '#dcedc8' }} />
                        <Typography variant="caption">Uncultivated Land</Typography>
                    </Box>
                ) : (
                    <Box display="flex" flexWrap="wrap" gap={1.5}>
                        {fields.map((field) => (
                            <Paper
                                key={field.fieldId}
                                elevation={0}
                                sx={{
                                    width: { xs: '100%', sm: '47%' }, // 2 columns
                                    p: 1,
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: field.cropType === 'TEA' ? '#c8e6c9' : field.cropType === 'RUBBER' ? '#ffe0b2' : '#e0e0e0',
                                    bgcolor: field.cropType === 'TEA' ? '#f1f8e9' : field.cropType === 'RUBBER' ? '#fff3e0' : '#f5f5f5',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    cursor: readOnly ? 'default' : 'pointer',
                                    transition: 'all 0.2s',
                                    height: '100%', // Equal height
                                    '&:hover': { transform: readOnly ? 'none' : 'translateY(-2px)', boxShadow: readOnly ? 0 : 1, borderColor: 'transparent' }
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: '50%',
                                        bgcolor: field.cropType === 'TEA' ? '#4caf50' : field.cropType === 'RUBBER' ? '#ff9800' : '#9e9e9e',
                                        color: 'white',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        flexShrink: 0
                                    }}
                                >
                                    {field.cropType === 'TEA' ? <SpaIcon fontSize="small" /> :
                                        field.cropType === 'RUBBER' ? <ForestIcon fontSize="small" /> :
                                            <TerrainIcon fontSize="small" />}
                                </Box>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="subtitle2" fontWeight="bold" noWrap title={field.name}>
                                        {field.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        {field.cropType} • {field.acreage} Ac
                                    </Typography>
                                </Box>
                            </Paper>
                        ))}
                        {!readOnly && (
                            <Box
                                sx={{
                                    width: { xs: '100%', sm: '47%' },
                                    minHeight: 54, // Match approx height of field tile
                                    borderRadius: 2,
                                    border: '2px dashed #c5e1a5',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    color: '#558b2f',
                                    gap: 1,
                                    '&:hover': { bgcolor: '#e8f5e9' }
                                }}
                                onClick={onManageFields}
                            >
                                <AddIcon fontSize="small" />
                                <Typography variant="button" fontSize="0.75rem">Add Field</Typography>
                            </Box>
                        )}
                    </Box>
                )}
            </Box>

            {/* Summary Footer */}
            <Box sx={{ px: 2, py: 1.5, bgcolor: 'white', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box display="flex" gap={2}>
                    {teaCount > 0 && (
                        <Box display="flex" alignItems="center" gap={0.5}>
                            <SpaIcon sx={{ fontSize: 16, color: '#4caf50' }} />
                            <Typography variant="caption" fontWeight="bold">{teaCount}</Typography>
                        </Box>
                    )}
                    {rubberCount > 0 && (
                        <Box display="flex" alignItems="center" gap={0.5}>
                            <ForestIcon sx={{ fontSize: 16, color: '#ff9800' }} />
                            <Typography variant="caption" fontWeight="bold">{rubberCount}</Typography>
                        </Box>
                    )}
                    {otherCount > 0 && (
                        <Box display="flex" alignItems="center" gap={0.5}>
                            <TerrainIcon sx={{ fontSize: 16, color: '#9e9e9e' }} />
                            <Typography variant="caption" fontWeight="bold">{otherCount}</Typography>
                        </Box>
                    )}
                </Box>

                {!readOnly && (
                    <Button
                        size="small"
                        onClick={onManageFields}
                        endIcon={<EditIcon sx={{ fontSize: 14 }} />}
                        sx={{
                            textTransform: 'none',
                            fontSize: '0.75rem',
                            color: 'text.secondary',
                            '&:hover': { color: 'primary.main', bgcolor: 'transparent' }
                        }}
                    >
                        Manage Map
                    </Button>
                )}
            </Box>

            {/* Delete Action (Top Right absolute) */}
            {!readOnly && (
                <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        color: '#e57373',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        bgcolor: 'white',
                        boxShadow: 1,
                        '&:hover': { bgcolor: '#ffebee' }
                    }}
                    className="manage-overlay"
                >
                    <DeleteIcon fontSize="small" />
                </IconButton>
            )}

        </Paper>
    );
}
