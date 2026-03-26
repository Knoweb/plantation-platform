import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    FormGroup,
    FormControlLabel,
    Switch,
    Button,
    TextField,
    IconButton,
    Snackbar,
    Alert,
    CircularProgress,
    Paper,
    Divider,
    Fade,
} from '@mui/material';
import GrassIcon from '@mui/icons-material/Grass';
import ForestIcon from '@mui/icons-material/Forest';
import SpaIcon from '@mui/icons-material/Spa';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import axios from 'axios';

const DEFAULT_CROPS = ['tea', 'rubber', 'cinnamon'];

export default function EstateSettings() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;
    const token = userSession.token;

    const [isEditing, setIsEditing] = useState(false);
    const [config, setConfig] = useState<Record<string, boolean>>(userSession.config || {
        tea: true,
        rubber: false,
        cinnamon: false
    });
    
    const [customCrop, setCustomCrop] = useState('');
    const [saving, setSaving] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    // Synchronization logic with token-based authentication
    useEffect(() => {
        if (tenantId && token) {
            axios.get(`/api/tenants/${tenantId}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then(res => {
                if (res.data.configJson) {
                    setConfig(res.data.configJson);
                    // Update session to keep in sync
                    const updatedUser = { ...userSession, config: res.data.configJson };
                    sessionStorage.setItem('user', JSON.stringify(updatedUser));
                }
            })
            .catch(err => {
                console.warn("Could not refresh configuration from server, using session data.", err);
            });
        }
    }, [tenantId, token]);

    const handleToggle = (crop: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isEditing) return;
        setConfig(prev => ({
            ...prev,
            [crop]: e.target.checked
        }));
    };

    const handleAddCustom = () => {
        if (customCrop.trim()) {
            const cropKey = customCrop.trim().toLowerCase();
            setConfig(prev => ({
                ...prev,
                [cropKey]: true
            }));
            setCustomCrop('');
        }
    };

    const handleDeleteCustom = (crop: string) => {
        if (!isEditing) return;
        const newConfig = { ...config };
        delete newConfig[crop];
        setConfig(newConfig);
    };

    const getCustomCrops = () => {
        return Object.keys(config).filter(k => !DEFAULT_CROPS.includes(k));
    };

    const handleSave = async () => {
        if (!token) {
            setSnackbar({ open: true, message: 'Authentication required. Please re-login.', severity: 'error' });
            return;
        }

        setSaving(true);
        try {
            await axios.put(`/api/tenants/${tenantId}/config`, config, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Success - update local session
            const updatedUser = { ...userSession, config };
            sessionStorage.setItem('user', JSON.stringify(updatedUser));

            setSnackbar({ open: true, message: 'Configuration saved successfully!', severity: 'success' });
            setIsEditing(false);
            window.dispatchEvent(new Event('config-updated'));
        } catch (err: any) {
            console.error("Failed to update config:", err);
            const status = err.response?.status;
            let msg = 'Failed to save changes. Please ensure the backend services are running.';
            
            if (status === 503) {
                msg = 'Backend service is currently unavailable. Please try again in 30 seconds.';
            } else if (status === 401 || status === 403) {
                msg = 'Session expired. Please log in again.';
            }

            setSnackbar({ open: true, message: msg, severity: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleEditClick = () => {
        setIsEditing(true);
    };

    const handleCancel = () => {
        setConfig(userSession.config || {});
        setIsEditing(false);
    };

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 900 }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" color="primary" gutterBottom>
                        Configuration
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Manage supported crop types and plantation-level settings.
                    </Typography>
                </Box>
                
                {!isEditing && (
                    <Button 
                        variant="contained" 
                        startIcon={<EditIcon />} 
                        onClick={handleEditClick}
                        sx={{ borderRadius: 2, px: 3 }}
                    > 
                        Edit Settings 
                    </Button>
                )}
            </Box>

            <Paper variant="outlined" sx={{ 
                p: 4, 
                borderRadius: 4, 
                bgcolor: isEditing ? '#fcfdfc' : 'rgba(0,0,0,0.01)',
                borderStyle: isEditing ? 'solid' : 'dashed',
                borderColor: isEditing ? 'primary.main' : 'divider',
                transition: 'all 0.3s ease'
            }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                    Cultivated Crops
                </Typography>
                
                <FormGroup row sx={{ gap: 3, mb: 1 }}>
                    {/* Standard Crops */}
                    <Box display="flex" alignItems="center" sx={{ 
                        p: 1.5, 
                        px: 2, 
                        borderRadius: 3, 
                        bgcolor: config.tea ? 'rgba(46, 125, 50, 0.08)' : 'transparent',
                        border: '1px solid',
                        borderColor: config.tea ? 'primary.light' : 'transparent',
                        opacity: !isEditing && !config.tea ? 0.4 : 1
                    }}>
                        <FormControlLabel
                            control={<Switch size="small" checked={!!config.tea} onChange={handleToggle('tea')} disabled={!isEditing} color="primary" />}
                            label={
                                <Box display="flex" alignItems="center" gap={1}>
                                    <GrassIcon color={config.tea ? 'primary' : 'disabled'} fontSize="small" />
                                    <Typography fontWeight="600">Tea</Typography>
                                </Box>
                            }
                        />
                    </Box>

                    <Box display="flex" alignItems="center" sx={{ 
                        p: 1.5, 
                        px: 2, 
                        borderRadius: 3, 
                        bgcolor: config.rubber ? 'rgba(46, 125, 50, 0.08)' : 'transparent',
                        border: '1px solid',
                        borderColor: config.rubber ? 'primary.light' : 'transparent',
                        opacity: !isEditing && !config.rubber ? 0.4 : 1
                    }}>
                        <FormControlLabel
                            control={<Switch size="small" checked={!!config.rubber} onChange={handleToggle('rubber')} disabled={!isEditing} color="primary" />}
                            label={
                                <Box display="flex" alignItems="center" gap={1}>
                                    <ForestIcon color={config.rubber ? 'primary' : 'disabled'} fontSize="small" />
                                    <Typography fontWeight="600">Rubber</Typography>
                                </Box>
                            }
                        />
                    </Box>

                    <Box display="flex" alignItems="center" sx={{ 
                        p: 1.5, 
                        px: 2, 
                        borderRadius: 3, 
                        bgcolor: config.cinnamon ? 'rgba(46, 125, 50, 0.08)' : 'transparent',
                        border: '1px solid',
                        borderColor: config.cinnamon ? 'primary.light' : 'transparent',
                        opacity: !isEditing && !config.cinnamon ? 0.4 : 1
                    }}>
                        <FormControlLabel
                            control={<Switch size="small" checked={!!config.cinnamon} onChange={handleToggle('cinnamon')} disabled={!isEditing} color="primary" />}
                            label={
                                <Box display="flex" alignItems="center" gap={1}>
                                    <SpaIcon color={config.cinnamon ? 'error' : 'disabled'} fontSize="small" />
                                    <Typography fontWeight="600">Cinnamon</Typography>
                                </Box>
                            }
                        />
                    </Box>

                    {/* Custom Crops */}
                    {getCustomCrops().map(crop => (
                        <Box key={crop} display="flex" alignItems="center" sx={{ 
                            p: 1.5, 
                            px: 2, 
                            borderRadius: 3, 
                            bgcolor: config[crop] ? 'rgba(46, 125, 50, 0.08)' : 'transparent',
                            border: '1px solid',
                            borderColor: config[crop] ? 'primary.light' : 'transparent',
                            opacity: !isEditing && !config[crop] ? 0.4 : 1
                        }}>
                            <FormControlLabel
                                control={<Switch size="small" checked={!!config[crop]} onChange={handleToggle(crop)} disabled={!isEditing} color="primary" />}
                                sx={{ mr: 0 }}
                                label={
                                    <Box display="flex" alignItems="center" gap={1} sx={{ textTransform: 'capitalize' }}>
                                        <AgricultureIcon color={config[crop] ? 'action' : 'disabled'} fontSize="small" />
                                        <Typography fontWeight="600">{crop}</Typography>
                                    </Box>
                                }
                            />
                            {isEditing && (
                                <IconButton size="small" onClick={() => handleDeleteCustom(crop)} sx={{ ml: 1, color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                                    <DeleteIcon fontSize="inherit" />
                                </IconButton>
                            )}
                        </Box>
                    ))}
                </FormGroup>

                <Fade in={isEditing}>
                    <Box sx={{ mt: 4 }}>
                        <Typography variant="body2" color="text.secondary" mb={2}> Add more crops to your estate if needed: </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, maxWidth: 450 }}>
                            <TextField
                                size="small"
                                placeholder="New Crop (e.g. Coconut)..."
                                value={customCrop}
                                onChange={(e) => setCustomCrop(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddCustom()}
                                sx={{ flexGrow: 1, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                            />
                            <Button 
                                variant="outlined" 
                                startIcon={<AddIcon />}
                                onClick={handleAddCustom}
                                disabled={!customCrop.trim()}
                                sx={{ borderRadius: 3, height: 40 }}
                            >
                                Add
                            </Button>
                        </Box>

                        <Divider sx={{ my: 4, borderStyle: 'dashed' }} />

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                            <Button variant="text" onClick={handleCancel} disabled={saving} sx={{ borderRadius: 2, px: 3 }}>
                                Cancel
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                                onClick={handleSave}
                                disabled={saving}
                                sx={{ 
                                    borderRadius: 2, 
                                    px: 5, 
                                    py: 1.2,
                                    fontWeight: 'bold',
                                    boxShadow: '0 4px 14px 0 rgba(46, 125, 50, 0.3)'
                                }}
                            >
                                {saving ? 'Saving...' : 'Save Configuration'}
                            </Button>
                        </Box>
                    </Box>
                </Fade>
            </Paper>

            <Snackbar 
                open={snackbar.open} 
                autoHideDuration={6000} 
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2 }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
