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
    CircularProgress,
    Avatar,
    Divider,
    List,
    ListItem,
    ListItemText,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem
} from '@mui/material';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';

// Roles Enum
const ROLES = [
    { value: 'MANAGER', label: 'Estate Manager' },
    { value: 'FIELD_OFFICER', label: 'Field Officer' },
    { value: 'STORE_KEEPER', label: 'Store Keeper' }
];

export default function EstateDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [tenant, setTenant] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Add User Dialog State
    const [openDialog, setOpenDialog] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        username: '',
        password: '',
        role: 'MANAGER'
    });

    useEffect(() => {
        if (id) fetchDetails();
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

    const handleCreateUser = async () => {
        if (!formData.fullName || !formData.username || !formData.password) return;
        try {
            await axios.post('http://localhost:8080/api/tenants/users', {
                tenantId: id, // Use ID from URL
                ...formData
            });
            setOpenDialog(false);
            setFormData({ fullName: '', username: '', password: '', role: 'MANAGER' });
            fetchDetails(); // Refresh list
        } catch (error) {
            alert("Failed to create user. Username might be taken.");
        }
    };

    const handleToggleStatus = async () => {
        const newStatus = tenant.subscriptionStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        if (window.confirm(`Are you sure you want to change the status to ${newStatus}?`)) {
            try {
                // Backend expects @RequestParam, so we pass it in the URL query string
                await axios.put(`http://localhost:8080/api/tenants/${id}/status?status=${newStatus}`);
                fetchDetails(); // Refresh details
            } catch (error) {
                alert('Failed to update status');
            }
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
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate('/super-admin')}
                    sx={{ mb: 2 }}
                >
                    Back to Dashboard
                </Button>

                <Grid container spacing={3}>
                    {/* LEFT COLUMN: Profile & Privileges */}
                    <Grid item xs={12} md={4}>
                        <Paper elevation={3} sx={{ p: 3, textAlign: 'center', height: '100%' }}>
                            <Avatar sx={{ width: 120, height: 120, mx: 'auto', mb: 2, bgcolor: 'secondary.main', fontSize: 40 }}>
                                {tenant.companyName.charAt(0)}
                            </Avatar>
                            <Typography variant="h5" fontWeight="bold" gutterBottom>{tenant.companyName}</Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>{tenant.subDomain}.estateiq.com</Typography>
                            <Divider sx={{ my: 3 }} />
                            <Typography variant="h6" align="left" gutterBottom>Privileges</Typography>
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
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Chip label={tenant.subscriptionStatus} color={tenant.subscriptionStatus === 'ACTIVE' ? "success" : "error"} size="small" />
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color={tenant.subscriptionStatus === 'ACTIVE' ? "error" : "success"}
                                            onClick={handleToggleStatus}
                                            sx={{ fontSize: '0.7rem', padding: '1px 5px', textTransform: 'none' }}
                                        >
                                            {tenant.subscriptionStatus === 'ACTIVE' ? "Suspend" : "Activate"}
                                        </Button>
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" color="text.secondary">Created At</Typography>
                                    <Typography variant="body1">{new Date(tenant.createdAt).toLocaleDateString()}</Typography>
                                </Grid>
                            </Grid>
                        </Paper>

                        {/* Admins / Staff Section */}
                        <Paper elevation={3} sx={{ p: 3 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6" color="primary">Staff & Admins</Typography>
                                <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={() => setOpenDialog(true)}
                                >
                                    Add User
                                </Button>
                            </Box>
                            <TableContainer>
                                <Table aria-label="users table">
                                    <TableHead sx={{ bgcolor: 'grey.100' }}>
                                        <TableRow>
                                            <TableCell><strong>Name</strong></TableCell>
                                            <TableCell><strong>Username</strong></TableCell>
                                            <TableCell><strong>Role</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {users.map((user) => (
                                            <TableRow key={user.userId}>
                                                <TableCell>{user.fullName}</TableCell>
                                                <TableCell>{user.username}</TableCell>
                                                <TableCell><Chip label={user.role} size="small" variant="outlined" /></TableCell>
                                            </TableRow>
                                        ))}
                                        {users.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} align="center">No staff members found.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Grid>
                </Grid>

                {/* Create User Dialog */}
                <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>Add User to {tenant.companyName}</DialogTitle>
                    <DialogContent>
                        <Box component="form" sx={{ mt: 1 }}>
                            <TextField
                                margin="normal"
                                required fullWidth
                                label="Full Name"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            />
                            <TextField
                                margin="normal"
                                required fullWidth
                                label="Username"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            />
                            <TextField
                                margin="normal"
                                required fullWidth
                                label="Password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                            <TextField
                                select
                                margin="normal"
                                required fullWidth
                                label="Role"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                {ROLES.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                        <Button variant="contained" onClick={handleCreateUser}>Create User</Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </Box>
    );
}
