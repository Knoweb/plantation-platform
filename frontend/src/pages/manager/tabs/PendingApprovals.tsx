import { Box, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Button, CircularProgress } from '@mui/material';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function PendingApprovals() {
    const [pendingItems, setPendingItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    useEffect(() => {
        fetchPending();
    }, [tenantId]);

    const fetchPending = async () => {
        try {
            const res = await axios.get(`http://localhost:8080/api/tenants/daily-work?tenantId=${tenantId}&status=PENDING`);
            setPendingItems(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await axios.put(`http://localhost:8080/api/tenants/daily-work/${id}/approve`);
            fetchPending(); // Refresh
        } catch (err) {
            alert("Failed to approve.");
        }
    };

    if (loading) {
        return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;
    }

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                Pending Approvals
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={4}>
                Review and approve stock requests, musters, and other pending actions.
            </Typography>

            <Card>
                <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                        <PendingActionsIcon color="warning" sx={{ mr: 1, fontSize: 32 }} />
                        <Typography variant="h6">Items Waiting for Action</Typography>
                    </Box>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Division</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell>Details</TableCell>
                                <TableCell align="right">Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {pendingItems.map(item => (
                                <TableRow key={item.workId}>
                                    <TableCell>{item.workId.substring(0, 8)}</TableCell>
                                    <TableCell>{item.workType}</TableCell>
                                    <TableCell>{item.divisionId}</TableCell>
                                    <TableCell>{item.workDate}</TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{item.details || '-'}</Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="error"
                                            sx={{ mr: 1 }}
                                            onClick={() => alert('Reject not implemented')}
                                        >
                                            Reject
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            color="primary"
                                            onClick={() => handleApprove(item.workId)}
                                        >
                                            Approve
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {pendingItems.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">No pending approvals found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </Box>
    );
}
