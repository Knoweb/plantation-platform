import { Box, Typography, FormGroup, FormControlLabel, Switch, Card, CardContent, Grid, TextField, IconButton } from '@mui/material';
import GrassIcon from '@mui/icons-material/Grass';
import ForestIcon from '@mui/icons-material/Forest';
import SpaIcon from '@mui/icons-material/Spa';
import AgricultureIcon from '@mui/icons-material/Agriculture'; // Generic icon
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useState } from 'react';

interface Props {
    data: any;
    updateData: (data: any) => void;
}

export default function ConfigurationStep({ data, updateData }: Props) {
    const [customCrop, setCustomCrop] = useState('');

    const handleToggle = (crop: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        updateData({
            ...data,
            configJson: {
                ...data.configJson,
                [crop]: e.target.checked
            }
        });
    };

    const handleAddCustom = () => {
        if (customCrop) {
            // Add new crop as true (enabled)
            updateData({
                ...data,
                configJson: {
                    ...data.configJson,
                    [customCrop]: true
                }
            });
            setCustomCrop('');
        }
    };

    const handleDeleteCustom = (crop: string) => {
        const newConfig = { ...data.configJson };
        delete newConfig[crop];
        updateData({ ...data, configJson: newConfig });
    };

    const getCustomCrops = () => {
        const defaultCrops = ['tea', 'rubber', 'cinnamon'];
        return Object.keys(data.configJson).filter(k => !defaultCrops.includes(k));
    };

    return (
        <Box sx={{ mt: 1 }}>
            <Typography variant="h6" gutterBottom>
                Select Crops
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
                Enable the crops grown on this estate. You can also add custom crops specific to your plantation.
            </Typography>

            <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                    <Card variant="outlined" sx={{ p: 0 }}>
                        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                            <FormGroup row>
                                {/* Standard Crops */}
                                <FormControlLabel
                                    control={<Switch size="small" checked={!!data.configJson.tea} onChange={handleToggle('tea')} />}
                                    label={
                                        <Box display="flex" alignItems="center" gap={0.5}>
                                            <GrassIcon fontSize="small" color="primary" /> <Typography variant="body2">Tea</Typography>
                                        </Box>
                                    }
                                    sx={{ mr: 2 }}
                                />
                                <FormControlLabel
                                    control={<Switch size="small" checked={!!data.configJson.rubber} onChange={handleToggle('rubber')} />}
                                    label={
                                        <Box display="flex" alignItems="center" gap={0.5}>
                                            <ForestIcon fontSize="small" color="primary" /> <Typography variant="body2">Rubber</Typography>
                                        </Box>
                                    }
                                    sx={{ mr: 2 }}
                                />
                                <FormControlLabel
                                    control={<Switch size="small" checked={!!data.configJson.cinnamon} onChange={handleToggle('cinnamon')} />}
                                    label={
                                        <Box display="flex" alignItems="center" gap={0.5}>
                                            <SpaIcon fontSize="small" color="error" /> <Typography variant="body2">Cinnamon</Typography>
                                        </Box>
                                    }
                                    sx={{ mr: 2 }}
                                />

                                {/* Custom Crops */}
                                {getCustomCrops().map(crop => (
                                    <Box key={crop} display="flex" alignItems="center" mr={2}>
                                        <FormControlLabel
                                            control={<Switch size="small" checked={data.configJson[crop]} onChange={handleToggle(crop)} />}
                                            label={
                                                <Box display="flex" alignItems="center" gap={0.5} textTransform="capitalize">
                                                    <AgricultureIcon fontSize="small" color="action" /> <Typography variant="body2">{crop}</Typography>
                                                </Box>
                                            }
                                            sx={{ mr: 0 }}
                                        />
                                        <IconButton size="small" onClick={() => handleDeleteCustom(crop)} sx={{ p: 0.5 }}>
                                            <DeleteIcon fontSize="inherit" />
                                        </IconButton>
                                    </Box>
                                ))}
                            </FormGroup>

                            {/* Add Custom Crop Input */}
                            <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 1, pt: 2, borderTop: '1px dashed #e0e0e0' }}>
                                <TextField
                                    size="small"
                                    placeholder="Add Crop (e.g. Coconut)..."
                                    value={customCrop}
                                    onChange={(e) => setCustomCrop(e.target.value)}
                                    sx={{ flexGrow: 1 }}
                                />
                                <IconButton onClick={handleAddCustom} color="primary" disabled={!customCrop} sx={{ bgcolor: 'primary.light', color: 'white', '&:hover': { bgcolor: 'primary.main' } }}>
                                    <AddIcon />
                                </IconButton>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
