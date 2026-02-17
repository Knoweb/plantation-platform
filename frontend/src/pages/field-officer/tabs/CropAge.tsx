import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, TextField, LinearProgress, CircularProgress, IconButton, Tooltip } from '@mui/material';
import SpaIcon from '@mui/icons-material/Spa';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import axios from 'axios';
import { keyframes } from '@mui/system';

const growAnimation = keyframes`
  0% { transform: scale(0.5); opacity: 0.5; }
  100% { transform: scale(1); opacity: 1; }
`;

export default function CropAge() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    const [fields, setFields] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDate, setEditDate] = useState<string>('');

    useEffect(() => {
        fetchFields();
    }, [tenantId]);

    const fetchFields = async () => {
        try {
            const res = await axios.get(`/api/fields?tenantId=${tenantId}`);
            setFields(res.data);
            setLoading(false);
        } catch (e) {
            console.error("Failed to fetch fields", e);
            setLoading(false);
        }
    };

    const calculateAge = (dateString: string) => {
        if (!dateString) return { years: 0, months: 0, days: 0 };
        const planted = new Date(dateString);
        const now = new Date();

        let years = now.getFullYear() - planted.getFullYear();
        let months = now.getMonth() - planted.getMonth();
        let days = now.getDate() - planted.getDate();

        if (days < 0) {
            months--;
            // approximate days in previous month
            days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
        }
        if (months < 0) {
            years--;
            months += 12;
        }
        return { years, months, days };
    };

    const handleEdit = (field: any) => {
        setEditingId(field.fieldId);
        setEditDate(field.plantedDate || '');
    };

    const handleSave = async (field: any) => {
        try {
            // Optimistic update
            const updatedFields = fields.map(f => f.fieldId === field.fieldId ? { ...f, plantedDate: editDate } : f);
            setFields(updatedFields);
            setEditingId(null);

            // API Call (Assuming PUT /api/fields/{id})
            await axios.put(`/api/fields/${field.fieldId}`, { ...field, plantedDate: editDate });
        } catch (e) {
            console.error("Failed to update field", e);
            alert("Failed to save date");
            fetchFields(); // Revert on error
        }
    };

    if (loading) return <CircularProgress />;

    return (
        <Box p={3}>
            <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                Crop Age Registry
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={4}>
                Track the age of crops in each field to optimize replanting and harvesting cycles.
            </Typography>

            <Grid container spacing={3}>
                {fields.map((field) => {
                    const age = calculateAge(field.plantedDate || new Date().toISOString());
                    const ageInYears = age.years + (age.months / 12);
                    // Animation scale: 0.5 (new) to 1.5 (mature, e.g. 30 years)
                    const scale = 0.5 + Math.min(ageInYears, 30) / 30;
                    const color = field.cropType === 'Tea' ? '#2e7d32' : (field.cropType === 'Rubber' ? '#f57f17' : '#757575');

                    return (
                        <Grid size={{ xs: 12, md: 6, lg: 4 }} key={field.fieldId}>
                            <Card sx={{
                                position: 'relative',
                                overflow: 'visible',
                                transition: 'transform 0.3s',
                                '&:hover': { transform: 'translateY(-5px)', boxShadow: 6 }
                            }}>
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                        <Box>
                                            <Typography variant="h6" fontWeight="bold">{field.name}</Typography>
                                            <Typography variant="subtitle2" color="text.secondary">{field.divisionName || 'Division'}</Typography>
                                            <Box mt={1} display="flex" alignItems="center" gap={1}>
                                                <Typography variant="caption" sx={{ bgcolor: color, color: 'white', px: 1, py: 0.5, borderRadius: 1 }}>
                                                    {field.cropType || 'Unknown'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {field.acreage} Acres
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {/* Animated Icon */}
                                        <Box sx={{
                                            position: 'relative',
                                            width: 60, height: 60,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <SpaIcon sx={{
                                                fontSize: 40 * scale,
                                                color: color,
                                                animation: `${growAnimation} 1s ease-out`,
                                                filter: 'drop-shadow(0px 4px 4px rgba(0,0,0,0.2))'
                                            }} />
                                        </Box>
                                    </Box>

                                    <Box mt={3} bgcolor="#f5f5f5" p={2} borderRadius={2}>
                                        <Typography variant="caption" fontWeight="bold" color="text.secondary" textTransform="uppercase">
                                            Current Age
                                        </Typography>
                                        <Typography variant="h5" color="primary.main" fontWeight="bold">
                                            {field.plantedDate ? `${age.years} Years, ${age.months} Months` : 'Not Set'}
                                        </Typography>

                                        {/* Age Progress Bar (0 to 30 years logic) */}
                                        <Box mt={1} display="flex" alignItems="center" gap={1}>
                                            <LinearProgress
                                                variant="determinate"
                                                value={Math.min((ageInYears / 30) * 100, 100)}
                                                sx={{ flexGrow: 1, height: 8, borderRadius: 4, bgcolor: '#e0e0e0', '& .MuiLinearProgress-bar': { bgcolor: color } }}
                                            />
                                            <Typography variant="caption">{Math.floor(ageInYears)}y</Typography>
                                        </Box>
                                    </Box>

                                    <Box mt={2}>
                                        {editingId === field.fieldId ? (
                                            <Box display="flex" gap={1} alignItems="center">
                                                <TextField
                                                    type="date"
                                                    size="small"
                                                    fullWidth
                                                    value={editDate}
                                                    onChange={(e) => setEditDate(e.target.value)}
                                                    InputLabelProps={{ shrink: true }}
                                                    label="Planted Date"
                                                />
                                                <IconButton color="primary" onClick={() => handleSave(field)}>
                                                    <SaveIcon />
                                                </IconButton>
                                            </Box>
                                        ) : (
                                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                                <Typography variant="body2" color="text.secondary">
                                                    Planted: {field.plantedDate || 'N/A'}
                                                </Typography>
                                                <Tooltip title="Edit Date">
                                                    <IconButton size="small" onClick={() => handleEdit(field)}>
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        )}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>
        </Box>
    );
}
