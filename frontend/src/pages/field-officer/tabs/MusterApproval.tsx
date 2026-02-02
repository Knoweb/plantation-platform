import { Box, Typography, Card, CardContent, List, ListItem, ListItemText, Button, Divider } from '@mui/material';
import DoneAllIcon from '@mui/icons-material/DoneAll';

export default function MusterApproval() {
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
                        <Typography variant="h6">Pending Approvals</Typography>
                    </Box>
                    <List>
                        <ListItem disablePadding sx={{ mb: 2 }}>
                            <ListItemText
                                primary="Gang #1 (Plucking) - Division A"
                                secondary="22 Workers • 07:30 AM • 450kg Target"
                            />
                            <Box>
                                <Button size="small" variant="outlined" color="error" sx={{ mr: 1 }}>Reject</Button>
                                <Button size="small" variant="contained" color="success">Approve</Button>
                            </Box>
                        </ListItem>
                        <Divider />
                        <ListItem disablePadding sx={{ mt: 2, mb: 2 }}>
                            <ListItemText
                                primary="Gang #2 (Weeding) - Division B"
                                secondary="12 Workers • 07:45 AM"
                            />
                            <Box>
                                <Button size="small" variant="outlined" color="error" sx={{ mr: 1 }}>Reject</Button>
                                <Button size="small" variant="contained" color="success">Approve</Button>
                            </Box>
                        </ListItem>
                        <Divider />
                        <ListItem disablePadding sx={{ mt: 2 }}>
                            <ListItemText
                                primary="Gang #3 (Pruning) - Lower Division"
                                secondary="08 Workers • 08:00 AM"
                            />
                            <Box>
                                <Button size="small" variant="outlined" color="error" sx={{ mr: 1 }}>Reject</Button>
                                <Button size="small" variant="contained" color="success">Approve</Button>
                            </Box>
                        </ListItem>
                    </List>
                </CardContent>
            </Card>
        </Box>
    );
}
