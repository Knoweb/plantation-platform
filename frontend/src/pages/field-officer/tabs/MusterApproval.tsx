import { Box, Typography, Card, CardContent, List, ListItem, ListItemText, Button, Divider, Chip } from '@mui/material';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { useState, useEffect } from 'react';
import axios from 'axios';

interface Muster {
    id: number;
    date: string;
    fieldName: string;
    taskType: string;
    workerCount: number;
    status: string;
}

export default function MusterApproval() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;
    const [pendingMusters, setPendingMusters] = useState<Muster[]>([]);

    useEffect(() => {
        fetchMusters();
    }, [tenantId]);

    const fetchMusters = async () => {
        try {
            const res = await axios.get(`/api/operations/muster?tenantId=${tenantId}`);
            // Filter for PENDING status
            const pending = res.data.filter((m: Muster) => m.status === 'PENDING');
            setPendingMusters(pending);
        } catch (err) {
            console.error("Failed to fetch approvals", err);
        }
    };

    const handleApprove = async (id: number) => {
        try {
            await axios.put(`/api/operations/muster/${id}/approve`);
            fetchMusters(); // Refresh list
        } catch (err) {
            alert("Approval Failed");
        }
    };

    const handleReject = async (id: number) => {
        if (!confirm("Are you sure you want to reject this muster? It will be deleted.")) return;
        try {
            await axios.delete(`/api/operations/muster/${id}`);
            fetchMusters();
        } catch (err) {
            alert("Rejection Failed");
        }
    };

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                Muster Approval
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={4}>
                Approve daily attendance and activity records.
            </Typography>

            <Card>
                <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                        <DoneAllIcon color="secondary" sx={{ mr: 1 }} />
                        <Typography variant="h6">Pending Approvals ({pendingMusters.length})</Typography>
                    </Box>
                    <List>
                        {pendingMusters.map((muster) => (
                            <div key={muster.id}>
                                <ListItem disablePadding sx={{ mb: 2 }}>
                                    <ListItemText
                                        primary={`${muster.taskType} - ${muster.fieldName}`}
                                        secondary={
                                            <>
                                                <Typography variant="body2" component="span">
                                                    {muster.workerCount} Workers • {muster.date}
                                                </Typography>
                                                <br />
                                                <Chip label={muster.status} size="small" color="warning" sx={{ mt: 0.5 }} />
                                            </>
                                        }
                                    />
                                    <Box>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="error"
                                            sx={{ mr: 1 }}
                                            onClick={() => handleReject(muster.id)}
                                        >
                                            Reject
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            color="success"
                                            onClick={() => handleApprove(muster.id)}
                                        >
                                            Approve
                                        </Button>
                                    </Box>
                                </ListItem>
                                <Divider />
                            </div>
                        ))}
                        {pendingMusters.length === 0 && (
                            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                                No pending approvals.
                            </Typography>
                        )}
                    </List>
                </CardContent>
            </Card>
        </Box>
    );
}
