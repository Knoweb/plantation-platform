import { useState, useEffect } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, CircularProgress
} from '@mui/material';
import SpaIcon from '@mui/icons-material/Spa';
import LocalFloristIcon from '@mui/icons-material/LocalFlorist';
import ForestIcon from '@mui/icons-material/Forest';
import axios from 'axios';
import { keyframes } from '@mui/system';
import { useLanguage } from '../../../context/LanguageContext';

const swayAnimation = keyframes`
  0% { transform: rotate(0deg); }
  25% { transform: rotate(-5deg); }
  75% { transform: rotate(5deg); }
  100% { transform: rotate(0deg); }
`;

const floatUp = keyframes`
  0% { transform: translateY(0px) rotate(0deg); opacity: 0; }
  30% { opacity: 0.8; }
  100% { transform: translateY(-30px) rotate(20deg); opacity: 0; }
`;

const slideInUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const capitalize = (s: string) => {
    if (!s) return 'Tea';
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

export default function CropAge() {
    const { t } = useLanguage();
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
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <Box mb={{ xs: 1, sm: 3 }} px={{ xs: 0.5, sm: 0 }}>
                <Typography variant="h4" fontWeight="bold" color="primary" sx={{ fontSize: { xs: '1.25rem', sm: '2.125rem' } }}>
                    {t('Field Log')}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, mt: 0.5 }}>
                    {t('Detailed field tracking and lifecycle management by division.')}
                </Typography>
            </Box>

            {divisions.map((division, idx) => {
                const divisionFields = fieldsData.filter(f => f.divisionId === division.divisionId);

                return (
                    <Box 
                        key={division.divisionId} 
                        mb={{ xs: 3, sm: 6 }}
                        sx={{ 
                            animation: `${slideInUp} 0.6s ease-out forwards`,
                            animationDelay: `${idx * 0.15}s`,
                            opacity: 0,
                            bgcolor: '#fcfdfe',
                            borderRadius: 4,
                            border: '1px solid #e0e6ed',
                            p: { xs: 1.5, sm: 3 },
                            boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                            position: 'relative'
                        }}
                    >
                        {/* Division Header — Diagrammatic Label */}
                        <Box 
                            sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 1.5, 
                                mb: 2, 
                                position: 'absolute',
                                top: -12,
                                left: 24,
                                bgcolor: 'white',
                                px: 2,
                                py: 0.5,
                                borderRadius: 10,
                                border: '1px solid #e0e6ed',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                zIndex: 10
                            }}
                        >
                            <ForestIcon sx={{ color: '#2e7d32', fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                            <Typography variant="h6" fontWeight="800" sx={{ fontSize: { xs: '0.85rem', sm: '1.1rem' }, color: '#2c3e50', letterSpacing: 1 }}>
                                {division.name.toUpperCase()}
                            </Typography>
                            <Box sx={{ bgcolor: '#4caf50', color: 'white', px: 1, py: 0.2, borderRadius: 10, fontSize: '0.7rem', fontWeight: 900 }}>
                                {divisionFields.length}
                            </Box>
                        </Box>

                        {divisionFields.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" fontStyle="italic" sx={{ mt: 2 }}>
                                {t('No fields assigned to this division.')}
                            </Typography>
                        ) : (
                            <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mt: 1 }}>
                                {divisionFields.map((field) => {
                                    const age = calculateAge(field.plantedDate);
                                    const ageInYears = age.years + (age.months / 12);
                                    const scale = 0.5 + Math.min(ageInYears, 30) / 30;
                                    const cropType = capitalize(field.cropType);
                                    const color = cropType === 'Tea' ? '#2e7d32' : (cropType === 'Rubber' ? '#f57f17' : '#757575');

                                    return (
                                        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={field.fieldId}>
                                             <Card sx={{
                                                position: 'relative',
                                                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                                border: '1px solid #edf2f7',
                                                borderRadius: 3,
                                                overflow: 'hidden',
                                                bgcolor: 'white',
                                                '&:hover': { 
                                                    transform: 'translateY(-6px)', 
                                                    boxShadow: '0 12px 30px rgba(0,0,0,0.08)',
                                                    borderColor: color,
                                                    '& .tree-icon': {
                                                        filter: `drop-shadow(0px 8px 12px ${color}44)`,
                                                        animation: `${swayAnimation} 1s infinite ease-in-out`
                                                    }
                                                }
                                            }}>
                                                <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: 2 } }}>
                                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                                        <Box>
                                                            <Typography variant="subtitle1" fontWeight="800" sx={{ fontSize: '1rem', color: '#2d3748', lineHeight: 1.2 }}>
                                                                {field.name}
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ fontWeight: 900, color: color, letterSpacing: 0.5, textTransform: 'uppercase', opacity: 0.8 }}>
                                                                {cropType} {t('Plantation')}
                                                            </Typography>
                                                        </Box>
                                                        <Box sx={{ textAlign: 'right' }}>
                                                            <Typography sx={{ fontSize: '1.25rem', fontWeight: 900, color: '#1a202c', lineHeight: 1 }}>
                                                                {field.acreage}
                                                                <Box component="span" sx={{ fontSize: '0.65rem', color: 'text.secondary', ml: 0.2, verticalAlign: 'middle' }}>{t('ACRES')}</Box>
                                                            </Typography>
                                                        </Box>
                                                    </Box>

                                                    <Box display="flex" justifyContent="center" alignItems="center" height={70} mb={2} position="relative" sx={{ bgcolor: '#f1f5f9', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                                                        <SpaIcon 
                                                                className="tree-icon"
                                                                sx={{
                                                                    fontSize: { xs: 35 * scale, sm: 45 * scale },
                                                                    color,
                                                                    filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))',
                                                                    animation: `${swayAnimation} 3.5s infinite ease-in-out`,
                                                                    zIndex: 1
                                                                }} 
                                                            />
                                                            <LocalFloristIcon sx={{
                                                                position: 'absolute', top: '20%', right: '35%',
                                                                fontSize: 10, color, opacity: 0,
                                                                animation: `${floatUp} 4s infinite ease-in-out`
                                                            }} />
                                                    </Box>

                                                    <Box sx={{ bgcolor: '#f8fafc', p: 1, borderRadius: 1.5, border: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Box>
                                                            <Typography sx={{ fontSize: '0.5rem', color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase' }}>{t('Field Age')}</Typography>
                                                            <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: '#2d3748' }}>
                                                                {field.plantedDate ? `${age.years}y ${age.months}m` : 'N/A'}
                                                            </Typography>
                                                        </Box>
                                                        <Box sx={{ textAlign: 'right' }}>
                                                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color, display: 'inline-block', mr: 0.5, animation: 'pulse 2s infinite' }} />
                                                            <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary', fontWeight: 700 }}>{t('Active')}</Typography>
                                                        </Box>
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
                <Typography color="text.secondary" fontStyle="italic" sx={{ textAlign: 'center', py: 10 }}>
                    {t('No infrastructure data detected. Please register divisions.')}
                </Typography>
            )}
        </Box>
    );
}
