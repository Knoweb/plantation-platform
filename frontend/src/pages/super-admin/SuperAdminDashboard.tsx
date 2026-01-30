import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
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
    IconButton,
    Tooltip
} from '@mui/material';
import axios from 'axios';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNavigate } from 'react-router-dom';

export default function SuperAdminDashboard() {
    const navigate = useNavigate();
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTenants();
    }, []);

    const fetchTenants = async () => {
        try {
            const response = await axios.get('http://localhost:8080/api/tenants');
            setTenants(response.data);
        } catch (error) {
            console.error('Failed to fetch tenants', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) {
            try {
                await axios.delete(`http://localhost:8080/api/tenants/${id}`);
                setTenants(prev => prev.filter(t => t.tenantId !== id));
            } catch (error) {
                alert('Failed to delete tenant');
            }
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        try {
            await axios.put(`http://localhost:8080/api/tenants/${id}/status?status=${newStatus}`);
            setTenants(prev => prev.map(t => t.tenantId === id ? { ...t, subscriptionStatus: newStatus } : t));
        } catch (error) {
            alert('Failed to update status');
        }
    };

    return (
        <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
            <AppBar position="static" color="primary">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        EstateIQ - Super Admin Panel
                    </Typography>
                    <Button color="inherit" href="/login">Logout</Button>
                </Toolbar>
            </AppBar>

            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h4" gutterBottom>
                        Registered Estates
                    </Typography>
                    <Button variant="contained" color="secondary" onClick={fetchTenants}>
                        Refresh List
                    </Button>
                </Box>

                {loading ? (
                    <Box display="flex" justifyContent="center" mt={5}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <TableContainer component={Paper}>
                        <Table sx={{ minWidth: 650 }} aria-label="tenants table">
                            <TableHead sx={{ bgcolor: 'grey.200' }}>
                                <TableRow>
                                    <TableCell><strong>Company Name</strong></TableCell>
                                    <TableCell><strong>Subdomain</strong></TableCell>
                                    <TableCell><strong>Status</strong></TableCell>
                                    <TableCell><strong>Configured Crops</strong></TableCell>
                                    <TableCell><strong>Created At</strong></TableCell>
                                    <TableCell align="right"><strong>Actions</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {tenants.map((tenant) => (
                                    <TableRow
                                        key={tenant.tenantId}
                                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                    >
                                        <TableCell component="th" scope="row">
                                            {tenant.companyName}
                                        </TableCell>
                                        <TableCell>
                                            <a href={`http://${tenant.subDomain}.localhost:5173`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#1976d2' }}>
                                                {tenant.subDomain}.estateiq.com
                                            </a>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={tenant.subscriptionStatus === 'ACTIVE' ? <CheckCircleIcon /> : <CancelIcon />}
                                                label={tenant.subscriptionStatus}
                                                color={tenant.subscriptionStatus === 'ACTIVE' ? "success" : "error"}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {tenant.configJson && Object.keys(tenant.configJson)
                                                .filter(k => tenant.configJson[k])
                                                .map(crop => (
                                                    <Chip key={crop} label={crop} size="small" sx={{ mr: 0.5, textTransform: 'capitalize' }} />
                                                ))
                                            }
                                        </TableCell>
                                        <TableCell>{new Date(tenant.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell align="right">
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                startIcon={<SettingsIcon />}
                                                onClick={() => navigate(`/super-admin/estate/${tenant.tenantId}`)}
                                                sx={{ mr: 1 }}
                                            >
                                                Manage
                                            </Button>
                                            <Tooltip title={tenant.subscriptionStatus === 'ACTIVE' ? "Suspend" : "Activate"}>
                                                <IconButton
                                                    color={tenant.subscriptionStatus === 'ACTIVE' ? "warning" : "success"}
                                                    onClick={() => handleToggleStatus(tenant.tenantId, tenant.subscriptionStatus)}
                                                >
                                                    <PowerSettingsNewIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete Estate">
                                                <IconButton color="error" onClick={() => handleDelete(tenant.tenantId, tenant.companyName)}>
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {tenants.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">
                                            <Typography sx={{ py: 3, color: 'text.secondary' }}>
                                                No estates registered yet.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Container>
        </Box>
    );
}
