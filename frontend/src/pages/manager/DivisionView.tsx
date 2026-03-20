import { Box, Typography, Avatar, Chip, CircularProgress, Alert, Grow } from '@mui/material';
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



    // Group workers by Field and then by Task
    const groupedByField = workers.reduce((acc: any, worker: any) => {
        const field = worker.fieldName || 'Unknown Field';
        const task = worker.workType || 'Unknown Task';
        if (!acc[field]) {
            acc[field] = {};
        }
        if (!acc[field][task]) {
            acc[field][task] = [];
        }
        acc[field][task].push(worker);
        return acc;
    }, {});

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
                <Alert severity="info" sx={{ borderRadius: '16px', py: 0.5 }}>No workers are currently assigned to this division in today's muster.</Alert>
            ) : (
                /* The outer "Division" bubble */
                <Box
                    sx={{
                        bgcolor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '24px',
                        p: { xs: 2, md: 4 },
                        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.02)',
                        position: 'relative',
                        maxWidth: '1400px',
                        mx: 'auto'
                    }}
                >
                    <Box display="flex" flexWrap="wrap" gap={3} justifyContent="center" alignItems="flex-start">
                        {Object.entries(groupedByField).map(([fieldName, tasks]: any, fieldIndex: number) => (
                            /* "Field" bubble */
                            <Box
                                key={fieldName}
                                sx={{
                                    bgcolor: '#ffffff',
                                    borderRadius: '20px',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                                    border: '1px solid #f1f5f9',
                                    p: 3,
                                    flex: '0 1 auto',
                                    minWidth: { xs: '100%', sm: '400px' },
                                    maxWidth: '800px',
                                    position: 'relative',
                                    transition: 'all 0.2s ease',
                                    '&:hover': { boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }
                                }}
                            >
                                <Typography variant="subtitle2" fontWeight="800" color="#0f172a" mb={2} textAlign="center" display="flex" alignItems="center" justifyContent="center" gap={1} sx={{ letterSpacing: '0.2px', fontSize: '0.9rem' }}>
                                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                                    {fieldName}
                                </Typography>

                                <Box display="flex" flexWrap="wrap" gap={2} justifyContent="center">
                                    {Object.entries(tasks).map(([taskName, taskWorkers]: any, taskIndex: number) => (
                                        /* "Task" bubble */
                                        <Box
                                            key={taskName}
                                            sx={{
                                                bgcolor: '#f1f5f9',
                                                borderRadius: '16px',
                                                p: 1.5,
                                                flex: '1 1 auto',
                                                minWidth: '220px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <Chip
                                                label={`${taskName} (${taskWorkers.length})`}
                                                size="small"
                                                sx={{
                                                    fontWeight: '700',
                                                    bgcolor: '#ffffff',
                                                    color: '#334155',
                                                    mb: 2,
                                                    fontSize: '0.75rem',
                                                    height: 24,
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                                    border: '1px solid #e2e8f0'
                                                }}
                                            />

                                            <Box display="flex" flexWrap="wrap" gap={1.25} justifyContent="center" width="100%">
                                                {taskWorkers.map((worker: any, workerIndex: number) => (
                                                    <Grow in={true} key={worker.id} style={{ transformOrigin: '0 0 0' }} timeout={200 + (fieldIndex * 50) + (taskIndex * 30) + (workerIndex * 20)}>
                                                        {/* Worker Pill / dot bubble */}
                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 1.25,
                                                                bgcolor: '#ffffff',
                                                                borderRadius: '30px',
                                                                pr: 2,
                                                                pl: 0.5,
                                                                py: 0.5,
                                                                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                                                                border: '1px solid #e2e8f0',
                                                                transition: 'transform 0.1s',
                                                                '&:hover': { transform: 'scale(1.02)' },
                                                                width: 'fit-content'
                                                            }}
                                                        >
                                                            <Avatar sx={{
                                                                bgcolor: worker.workerType === 'PERMANENT' ? '#10b981' : worker.workerType === 'CASUAL' ? '#3b82f6' : worker.workerType?.includes('CONTRACT') ? '#8b5cf6' : '#94a3b8',
                                                                width: 32, height: 32,
                                                            }}>
                                                                <PersonIcon sx={{ fontSize: '1.2rem' }} />
                                                            </Avatar>
                                                            <Box display="flex" flexDirection="column" justifyContent="center">
                                                                <Typography variant="subtitle2" fontWeight="800" lineHeight={1.1} sx={{ color: '#0f172a', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                                                    {worker.workerName}
                                                                </Typography>
                                                                <Box display="flex" alignItems="center" gap={0.5} mt={0.25}>
                                                                    <Typography sx={{
                                                                        fontSize: '0.65rem',
                                                                        fontWeight: '800',
                                                                        color: worker.workerType === 'PERMANENT' ? '#10b981' : worker.workerType === 'CASUAL' ? '#3b82f6' : '#8b5cf6',
                                                                        textTransform: 'uppercase',
                                                                    }}>
                                                                        {worker.workerType?.includes('CONTRACT') ? 'CONTRACT' : worker.workerType}
                                                                    </Typography>
                                                                    {worker.workerType?.includes('CONTRACT') && worker.contractor && (
                                                                        <Typography sx={{ color: '#8b5cf6', fontSize: '0.55rem', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                                                                            ({worker.contractor})
                                                                        </Typography>
                                                                    )}
                                                                </Box>
                                                            </Box>
                                                        </Box>
                                                    </Grow>
                                                ))}
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        ))}
                    </Box>
                </Box>
            )}
        </Box>
    );
}
