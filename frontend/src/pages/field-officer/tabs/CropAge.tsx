import { useState, useEffect } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, CircularProgress,
    Chip, Divider
} from '@mui/material';
import SpaIcon from '@mui/icons-material/Spa';
import LocalFloristIcon from '@mui/icons-material/LocalFlorist';
import ForestIcon from '@mui/icons-material/Forest';
import axios from 'axios';
import { keyframes } from '@mui/system';

const swayAnimation = keyframes`
  0% { transform: rotate(0deg); }
  25% { transform: rotate(-5deg); }
  75% { transform: rotate(5deg); }
  100% { transform: rotate(0deg); }
`;

const floatUp = keyframes`
  0% { transform: translateY(0px) scale(0.5) rotate(0deg); opacity: 0; }
  30% { opacity: 0.8; }
  100% { transform: translateY(-30px) scale(1) rotate(20deg); opacity: 0; }
`;

const capitalize = (s: string) => {
    if (!s) return 'Tea';
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

export default function CropAge() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    const [fieldsData, setFieldsData] = useState<any[]>([]);
    const [divisions, setDivisions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [fRes, dRes] = await Promise.all([
                    axios.get(`/api/fields?tenantId=${tenantId}`),
                    axios.get(`/api/divisions?tenantId=${tenantId}`)
                ]);
                setFieldsData(fRes.data);
                setDivisions(dRes.data);
            } catch (e) {
                console.error('Fetch Data Failed', e);
            } finally {
                setLoading(false);
            }
        };
        if (tenantId) fetchData();
    }, [tenantId]);

    const calculateAge = (dateString: string) => {
        if (!dateString) return { years: 0, months: 0, days: 0 };
        const planted = new Date(dateString);
        const now = new Date();

        let years = now.getFullYear() - planted.getFullYear();
        let months = now.getMonth() - planted.getMonth();
        let days = now.getDate() - planted.getDate();

        if (days < 0) {
            months--;
            days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
        }
        if (months < 0) {
            years--;
            months += 12;
        }
        return { years, months, days };
    };

    if (loading) return (
        <Box sx={{ p: { xs: 2, sm: 4 } }} display="flex" justifyContent="center">
            <CircularProgress />
        </Box>
    );

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
            <Box mb={3}>
                <Typography variant="h4" fontWeight="bold" color="primary" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
                    Field Log
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                    Detailed field tracking and lifecycle management by division.
                </Typography>
            </Box>

            {divisions.map(division => {
                const divisionFields = fieldsData.filter(f => f.divisionId === division.divisionId);

                return (
                    <Box key={division.divisionId} mb={5}>
                        {/* Division Header — read-only, no add button */}
                        <Box display="flex" alignItems="center" gap={1} mb={2} flexWrap="wrap">
                            <ForestIcon color="action" />
                            <Typography variant="h5" fontWeight="500" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                                {division.name}
                            </Typography>
                            <Chip label={`${divisionFields.length} Field${divisionFields.length !== 1 ? 's' : ''}`} size="small" sx={{ ml: { xs: 0, sm: 1 } }} />
                        </Box>
                        <Divider sx={{ mb: 2 }} />

                        {divisionFields.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                No fields in this division.
                            </Typography>
                        ) : (
                            <Grid container spacing={3}>
                                {divisionFields.map((field: any) => {
                                    const age = calculateAge(field.plantedDate);
                                    const ageInYears = age.years + (age.months / 12);
                                    const scale = 0.5 + Math.min(ageInYears, 30) / 30;
                                    const cropType = capitalize(field.cropType);
                                    const color = cropType === 'Tea' ? '#2e7d32' : (cropType === 'Rubber' ? '#f57f17' : '#757575');

                                    return (
                                        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={field.fieldId}>
                                            <Card sx={{
                                                position: 'relative',
                                                transition: 'transform 0.2s, box-shadow 0.2s',
                                                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }
                                            }}>
                                                <CardContent>
                                                    <Box>
                                                        <Typography variant="h6" fontWeight="bold">{field.name}</Typography>
                                                        <Box display="flex" gap={1} mt={0.5}>
                                                            <Chip label={cropType} size="small" sx={{ bgcolor: color, color: 'white', fontWeight: 'bold' }} />
                                                            <Chip label={`${field.acreage} Ac`} size="small" variant="outlined" />
                                                        </Box>
                                                    </Box>

                                                    <Box display="flex" justifyContent="center" my={2} height={80} position="relative">
                                                        <SpaIcon sx={{
                                                            fontSize: 50 * scale,
                                                            color,
                                                            filter: 'drop-shadow(0px 3px 3px rgba(0,0,0,0.2))',
                                                            animation: `${swayAnimation} 3s infinite ease-in-out`,
                                                            zIndex: 1
                                                        }} />
                                                        <LocalFloristIcon sx={{
                                                            position: 'absolute', top: '50%', right: '35%',
                                                            fontSize: 16, color, opacity: 0,
                                                            animation: `${floatUp} 4s infinite ease-in-out`,
                                                            animationDelay: '0s'
                                                        }} />
                                                        <LocalFloristIcon sx={{
                                                            position: 'absolute', top: '60%', left: '35%',
                                                            fontSize: 12, color, opacity: 0,
                                                            animation: `${floatUp} 4s infinite ease-in-out`,
                                                            animationDelay: '2s'
                                                        }} />
                                                    </Box>

                                                    <Box bgcolor="#f5f5f5" p={1.5} borderRadius={2}>
                                                        <Box display="flex" justifyContent="space-between" mb={0.5}>
                                                            <Typography variant="caption" fontWeight="bold" color="text.secondary">AGE</Typography>
                                                            <Typography variant="body2" fontWeight="bold" color={color} sx={{
                                                                animation: 'pulse 3s infinite ease-in-out',
                                                                '@keyframes pulse': {
                                                                    '0%': { opacity: 1 },
                                                                    '50%': { opacity: 0.5 },
                                                                    '100%': { opacity: 1 }
                                                                }
                                                            }}>
                                                                {field.plantedDate ? `${age.years}y ${age.months}m ${age.days}d` : 'Not Set'}
                                                            </Typography>
                                                        </Box>
                                                        <Typography variant="caption" color="text.secondary" display="block" mt={0.5} textAlign="right">
                                                            Planted: {field.plantedDate || 'N/A'}
                                                        </Typography>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        )}
                    </Box>
                );
            })}

            {divisions.length === 0 && (
                <Typography color="text.secondary" fontStyle="italic">
                    No divisions found for this estate.
                </Typography>
            )}
        </Box>
    );
}
