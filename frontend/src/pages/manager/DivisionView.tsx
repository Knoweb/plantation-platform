import { Box, Typography, Card, CardContent, Avatar, Chip, Grid, CircularProgress, Alert, Grow } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import PersonIcon from '@mui/icons-material/Person';
import TerrainIcon from '@mui/icons-material/Terrain';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

export default function DivisionView() {
    const { divisionId } = useParams();
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    const [loading, setLoading] = useState(true);
    const [divisionName, setDivisionName] = useState('Division');
    const [workers, setWorkers] = useState<any[]>([]);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (tenantId && divisionId) {
            fetchData();
        }
    }, [tenantId, divisionId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const d = new Date();
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const today = `${year}-${month}-${day}`;

            // Fetch Division Details
            const divRes = await axios.get(`/api/divisions?tenantId=${tenantId}`);
            const div = divRes.data.find((d: any) => d.divisionId === divisionId);
            if (div) setDivisionName(div.name);

            // Fetch Daily Work
            const dwRes = await axios.get(`/api/operations/daily-work?tenantId=${tenantId}`);

            // Fetch Workers to resolve types/names if needed
            const wRes = await axios.get(`/api/workers?tenantId=${tenantId}`);
            const wMap = new Map();
            const wTypeMap = new Map();
            const wContractorMap = new Map();
            wRes.data.forEach((w: any) => {
                wMap.set(w.workerId || w.id, `${w.firstName || ''} ${w.lastName || ''}`.trim() || w.name);
                wTypeMap.set(w.workerId || w.id, w.employmentType);
                wContractorMap.set(w.workerId || w.id, w.contractorName || '');
            });

            const divisionWorkers: any[] = [];

            // Find today's morning muster for this division
            const musters = dwRes.data.filter((dw: any) =>
                dw.divisionId === divisionId &&
                dw.workDate === today &&
                dw.workType === 'Morning Muster'
            );

            // Collect workers from JSON details
            for (const muster of musters) {
                if (muster.details) {
                    try {
                        const parsed = JSON.parse(muster.details);
                        // parsed is an array of tasks
                        for (const task of parsed) {
                            if (task.assigned && Array.isArray(task.assigned)) {
                                for (const worker of task.assigned) {
                                    const wid = worker.id || worker.workerId;
                                    divisionWorkers.push({
                                        id: wid,
                                        workerName: worker.name || wMap.get(wid) || "Unknown Worker",
                                        workerType: wTypeMap.get(wid) || 'PERMANENT',
                                        contractor: wContractorMap.get(wid),
                                        workType: task.task || muster.workType,
                                        fieldName: task.field || "Unknown Field"
                                    });
                                }
                            }
                        }
                    } catch (e) {
                        console.error("Failed to parse", e);
                    }
                }
            }

            setWorkers(divisionWorkers);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;
    }



    // Group workers by Field only, but sort by task inside
    const groupedByField = workers.reduce((acc: any, worker: any) => {
        const field = worker.fieldName || 'Unknown Field';
        if (!acc[field]) {
            acc[field] = [];
        }
        acc[field].push(worker);
        return acc;
    }, {});

    // Sort workers inside each field by task
    Object.values(groupedByField).forEach((fieldWorkers: any) => {
        fieldWorkers.sort((a: any, b: any) => a.workType.localeCompare(b.workType));
    });

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box display="flex" alignItems="center" gap={2}>
                    <TerrainIcon sx={{ fontSize: 40, color: '#2e7d32' }} />
                    <Typography variant="h4" fontWeight="bold" color="primary">
                        {divisionName} - Active Workforce
                    </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1} bgcolor="#e8f5e9" px={2} py={1} borderRadius={2} border="1px solid #c8e6c9">
                    <AccessTimeIcon sx={{ color: '#2e7d32' }} />
                    <Typography variant="h6" fontWeight="bold" color="#2e7d32" component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </Typography>
                </Box>
            </Box>

            <Typography variant="body1" color="text.secondary" mb={4}>
                Real-time view of workers assigned to this division today. Use this for field verification.
            </Typography>

            {workers.length === 0 ? (
                <Alert severity="info">No workers are currently assigned to this division in today's muster.</Alert>
            ) : (
                <Box>
                    {Object.entries(groupedByField).map(([fieldName, fieldWorkers]: any, fieldIndex: number) => (
                        <Box key={fieldName} mb={5}>
                            <Box bgcolor="#e8f5e9" p={1.5} borderRadius={2} mb={3} borderLeft="4px solid #2e7d32" width="100%">
                                <Typography variant="h6" fontWeight="bold" color="#1b5e20">
                                    Field: {fieldName}
                                </Typography>
                            </Box>

                            <Grid container spacing={2}>
                                {fieldWorkers.map((worker: any, workerIndex: number) => (
                                    <Grow in={true} key={worker.id} style={{ transformOrigin: '0 0 0' }} timeout={500 + (fieldIndex * 100) + (workerIndex * 50)}>
                                        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                                            <Card sx={{
                                                borderRadius: 3,
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                                border: '1px solid #f0f0f0',
                                                transition: 'all 0.2s',
                                                bgcolor: '#ffffff',
                                                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(0,0,0,0.1)', borderColor: '#e0e0e0' }
                                            }}>
                                                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                                    <Box display="flex" alignItems="flex-start" gap={1.5}>
                                                        <Avatar sx={{
                                                            bgcolor: worker.workerType === 'PERMANENT' ? '#2e7d32' : worker.workerType === 'CASUAL' ? '#0288d1' : worker.workerType?.includes('CONTRACT') ? '#9c27b0' : '#757575',
                                                            width: 40, height: 40
                                                        }}>
                                                            <PersonIcon fontSize="small" />
                                                        </Avatar>
                                                        <Box display="flex" flexDirection="column" gap={0.25}>
                                                            <Typography variant="subtitle2" fontWeight="bold" lineHeight={1.2} sx={{ color: '#212121', fontSize: '0.85rem' }}>
                                                                {worker.workerName}
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ color: '#757575', lineHeight: 1.2, fontSize: '0.75rem' }}>
                                                                {worker.workType}
                                                            </Typography>
                                                            <Box mt={0.5} display="flex" flexWrap="wrap" alignItems="center" gap={0.5}>
                                                                <Chip
                                                                    label={worker.workerType?.includes('CONTRACT') ? 'CONTRACT' : worker.workerType}
                                                                    size="small"
                                                                    sx={{
                                                                        fontSize: '0.6rem',
                                                                        fontWeight: 'bold',
                                                                        height: 18,
                                                                        bgcolor: worker.workerType === 'PERMANENT' ? '#e8f5e9' : worker.workerType === 'CASUAL' ? '#e1f5fe' : '#f3e5f5',
                                                                        color: worker.workerType === 'PERMANENT' ? '#2e7d32' : worker.workerType === 'CASUAL' ? '#0288d1' : '#9c27b0',
                                                                        border: '1px solid',
                                                                        borderColor: worker.workerType === 'PERMANENT' ? '#c8e6c9' : worker.workerType === 'CASUAL' ? '#b3e5fc' : '#e1bee7',
                                                                    }}
                                                                />
                                                                {worker.workerType?.includes('CONTRACT') && worker.contractor && (
                                                                    <Typography variant="caption" sx={{ color: '#9c27b0', fontSize: '0.6rem', display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                                                                        ({worker.contractor})
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        </Box>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    </Grow>
                                ))}
                            </Grid>
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
}
