import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, TextField, Card, CardContent, CircularProgress, Chip } from '@mui/material';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function AttendanceReport() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    const [attendance, setAttendance] = useState<any[]>([]);
    const [workers, setWorkers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]); // Default to today

    const [divisions, setDivisions] = useState<any[]>([]);

    useEffect(() => {
        if (tenantId) {
            axios.get(`/api/divisions?tenantId=${tenantId}`)
                .then(res => setDivisions(res.data))
                .catch(err => console.error("Failed to fetch divisions", err));

            axios.get(`/api/workers?tenantId=${tenantId}`)
                .then(res => setWorkers(res.data))
                .catch(err => console.error("Failed to fetch workers", err));
        }
    }, [tenantId]);

    // Fetch Attendance & Daily Work
    useEffect(() => {
        if (tenantId) {
            fetchAttendance();
        }
    }, [tenantId, selectedDate]);



    const fetchAttendance = async () => {
        setLoading(true);
        try {
            // Fetch both Attendance and Daily Work for the selected date (or all if API supports)
            // Ideally we filter by date on server to avoid over-fetching
            const dateParam = selectedDate ? `&date=${selectedDate}` : '';

            const [attRes, dwRes] = await Promise.all([
                axios.get(`/api/operations/attendance?tenantId=${tenantId}${dateParam}`),
                axios.get(`/api/operations/daily-work?tenantId=${tenantId}${dateParam}`)
            ]);

            const dailyWorkMap = new Map();
            dwRes.data.forEach((dw: any) => dailyWorkMap.set(dw.workId, dw));

            // Join details
            const joinedData = attRes.data.map((att: any) => {
                const dw = dailyWorkMap.get(att.dailyWorkId);
                const rawDivisionId = att.divisionId || dw?.divisionId || '';
                return {
                    ...att,
                    workType: att.workType || dw?.workType || 'Unknown',
                    fieldName: att.fieldName || dw?.fieldName || 'Unknown',
                    divisionId: rawDivisionId,
                };
            });

            // If we need to show filtered results based on task type, we can filter here. 
            // Currently showing all gathered attendance.
            setAttendance(joinedData);
        } catch (e) {
            console.error("Failed to fetch attendance", e);
        }
        setLoading(false);
    };

    const getWorkerDetails = (id: string) => {
        const w = workers.find(worker => worker.id === id || worker.workerId === id);
        return w ? { name: w.name, regNo: w.registrationNumber } : { name: id, regNo: 'N/A' };
    };

    const getDivisionName = (id: string) => {
        if (!id) return '-';
        const div = divisions.find(d => d.divisionId === id);
        return div ? div.name : id;
    };

    return (
        <Box>
            {/* Header with Centered Date Filter */}
            <Box display="flex" alignItems="center" mb={3} position="relative" height={40}>
                <Typography variant="h5" color="primary" fontWeight="bold" sx={{ position: 'absolute', left: 0 }}>
                    Attendance Report
                </Typography>

                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <TextField
                        type="date"
                        size="small"
                        label="Filter by Date"
                        InputLabelProps={{ shrink: true }}
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        sx={{ width: 220, bgcolor: 'white' }}
                    />
                </Box>
            </Box>

            <Card>
                <CardContent>
                    {loading ? (
                        <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>
                    ) : (
                        <Table size="small">
                            <TableHead sx={{ bgcolor: '#eee' }}>
                                <TableRow>
                                    <TableCell><strong>Date</strong></TableCell>
                                    <TableCell><strong>Worker Name</strong></TableCell>
                                    <TableCell><strong>Workers RegNo</strong></TableCell>
                                    <TableCell><strong>Task</strong></TableCell>
                                    <TableCell><strong>Division</strong></TableCell>
                                    <TableCell><strong>Field</strong></TableCell>
                                    <TableCell><strong>Status</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {attendance.length > 0 ? (
                                    attendance.map((record: any) => {
                                        const workerInfo = getWorkerDetails(record.workerId);
                                        return (
                                            <TableRow key={record.id || record.workId} hover>
                                                <TableCell>{record.workDate}</TableCell>
                                                <TableCell><strong>{workerInfo.name}</strong></TableCell>
                                                <TableCell>{workerInfo.regNo}</TableCell>
                                                <TableCell><Chip label={record.workType} size="small" color="primary" variant="outlined" /></TableCell>
                                                <TableCell>{getDivisionName(record.divisionId)}</TableCell>
                                                <TableCell>{record.fieldName}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={record.status || 'PENDING'}
                                                        size="small"
                                                        color={
                                                            record.status === 'PRESENT' ? 'success' :
                                                                record.status === 'ABSENT' ? 'error' :
                                                                    record.status === 'HALF_DAY' ? 'warning' : 'default'
                                                        }
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                            <Typography color="text.secondary">No attendance records found for this date.</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
}
