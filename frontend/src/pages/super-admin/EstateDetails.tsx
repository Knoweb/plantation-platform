import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Button,
    AppBar,
    Toolbar,
    CircularProgress,
    Avatar,
    Divider,
    List,
    ListItem,
    ListItemText,
    IconButton // <-- Added Import
} from '@mui/material';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function EstateDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [tenant, setTenant] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDetails();
    }, [id]);

    const fetchDetails = async () => {
        try {
            const [tenantRes, usersRes] = await Promise.all([
                axios.get(`http://localhost:8080/api/tenants/${id}`),
                axios.get(`http://localhost:8080/api/tenants/${id}/users`)
            ]);
            setTenant(tenantRes.data);
            setUsers(usersRes.data);
        } catch (error) {
            console.error('Failed to fetch details', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <Box display="flex" justifyContent="center" mt={5}><CircularProgress /></Box>;
    }

    if (!tenant) {
        return <Typography variant="h6" align="center" mt={5}>Estate not found.</Typography>;
    }

    return (
        <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
            <AppBar position="static" color="primary">
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={() => navigate('/super-admin')} sx={{ mr: 2 }}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Estate Details
                    </Typography>
                </Toolbar>
            </AppBar>

            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Grid container spacing={3}>
                    {/* LEFT COLUMN: Profile & Privileges */}
                    <Grid item xs={12} md={4}>
                        <Paper elevation={3} sx={{ p: 3, textAlign: 'center', height: '100%' }}>
                            <Avatar
                                sx={{ width: 120, height: 120, mx: 'auto', mb: 2, bgcolor: 'secondary.main', fontSize: 40 }}
                            >
                                {tenant.companyName.charAt(0)}
                            </Avatar>
                            <Typography variant="h5" fontWeight="bold" gutterBottom>
                                {tenant.companyName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                {tenant.subDomain}.estateiq.com
                            </Typography>

                            <Divider sx={{ my: 3 }} />

                            <Typography variant="h6" align="left" gutterBottom>Privileges (Crops)</Typography>
                            <List dense>
                                {tenant.configJson && Object.keys(tenant.configJson).filter(k => tenant.configJson[k]).map(crop => (
                                    <ListItem key={crop}>
                                        <CheckCircleIcon color="success" sx={{ mr: 1, fontSize: 20 }} />
                                        <ListItemText primary={crop.charAt(0).toUpperCase() + crop.slice(1)} />
                                    </ListItem>
                                ))}
                            </List>
                        </Paper>
                    </Grid>

                    {/* RIGHT COLUMN: Details & Admins */}
                    <Grid item xs={12} md={8}>
                        {/* Details Section */}
                        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                            <Typography variant="h6" gutterBottom color="primary">Estate Information</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" color="text.secondary">Company Name</Typography>
                                    <Typography variant="body1">{tenant.companyName}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                                    <Chip
                                        label={tenant.subscriptionStatus}
                                        color={tenant.subscriptionStatus === 'ACTIVE' ? "success" : "error"}
                                        size="small"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" color="text.secondary">Created At</Typography>
                                    <Typography variant="body1">{new Date(tenant.createdAt).toLocaleDateString()}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" color="text.secondary">Tenant ID</Typography>
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{tenant.tenantId}</Typography>
                                </Grid>
                            </Grid>
                        </Paper>

                        {/* Admins / Staff Section */}
                        <Paper elevation={3} sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom color="primary">Staff & Admins</Typography>
                            <TableContainer>
                                <Table aria-label="users table">
                                    <TableHead sx={{ bgcolor: 'grey.100' }}>
                                        <TableRow>
                                            <TableCell><strong>Name</strong></TableCell>
                                            <TableCell><strong>Username / Email</strong></TableCell>
                                            <TableCell><strong>Role</strong></TableCell>
                                            <TableCell align="right"><strong>Actions</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {users.map((user) => (
                                            <TableRow key={user.userId}>
                                                <TableCell>{user.fullName}</TableCell>
                                                <TableCell>{user.username}</TableCell>
                                                <TableCell>
                                                    <Chip label={user.role} size="small" variant="outlined" />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Button size="small" color="secondary">Edit</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {users.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} align="center">No staff members found.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
}
