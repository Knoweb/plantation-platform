import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, TextField, Card, CardContent, CircularProgress, Chip } from '@mui/material';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function AttendanceReport() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    const [attendance, setAttendance] = useState<any[]>([]);
    const [workers, setWorkers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string>(''); // YYYY-MM-DD

    // Fetch Workers (for name mapping)
    useEffect(() => {
        if (tenantId) {
            axios.get(`http://localhost:8080/api/workers?tenantId=${tenantId}`)
                .then(res => setWorkers(res.data))
                .catch(err => console.error("Failed to fetch workers", err));
        }
    }, [tenantId]);

    // Fetch Attendance
    useEffect(() => {
        if (tenantId) {
            fetchAttendance();
        }
    }, [tenantId, selectedDate]);

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            let url = `http://localhost:8080/api/tenants/attendance?tenantId=${tenantId}`;
            if (selectedDate) {
                url += `&date=${selectedDate}`;
            }
            const res = await axios.get(url);
            setAttendance(res.data);
        } catch (e) {
            console.error("Failed to fetch attendance", e);
        }
        setLoading(false);
    };

    const getWorkerName = (id: string) => {
        const w = workers.find(worker => worker.id === id || worker.workerId === id);
        return w ? w.name : id;
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" color="primary" fontWeight="bold">Worker Attendance History</Typography>
                <TextField
                    type="date"
                    size="small"
                    label="Filter by Date"
                    InputLabelProps={{ shrink: true }}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    sx={{ width: 220 }}
                />
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
                                    <TableCell><strong>Worker ID</strong></TableCell>
                                    <TableCell><strong>Task</strong></TableCell>
                                    <TableCell><strong>Field</strong></TableCell>
                                    <TableCell><strong>Status</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {attendance.length > 0 ? (
                                    attendance.map((record: any) => (
                                        <TableRow key={record.id} hover>
                                            <TableCell>{record.workDate}</TableCell>
                                            <TableCell><strong>{getWorkerName(record.workerId)}</strong></TableCell>
                                            <TableCell>{record.workerId}</TableCell>
                                            <TableCell><Chip label={record.workType} size="small" color="primary" variant="outlined" /></TableCell>
                                            <TableCell>{record.fieldName}</TableCell>
                                            <TableCell><Chip label="Present" size="small" color="success" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                            <Typography color="text.secondary">No attendance records found for this selection.</Typography>
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
