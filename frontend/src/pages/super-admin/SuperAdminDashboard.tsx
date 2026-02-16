import { useState, useEffect } from 'react';
import {
    Box,
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
    Grid,
    Card,
    CardContent,
    IconButton,
    Avatar
} from '@mui/material';
import axios from 'axios';
import DeleteIcon from '@mui/icons-material/Delete';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import BusinessIcon from '@mui/icons-material/Business';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import { useNavigate } from 'react-router-dom';

function KPICard({ title, value, color, icon }: any) {
    return (
        <Card sx={{ height: '100%', borderLeft: `5px solid ${color}`, boxShadow: 2 }}>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Typography variant="overline" color={color} fontWeight="bold">
                            {title}
                        </Typography>
                        <Typography variant="h5" fontWeight="bold">
                            {value}
                        </Typography>
                    </Box>
                    <Box sx={{ color: '#e0e0e0' }}>
                        {icon}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
}

export default function SuperAdminDashboard() {
    const navigate = useNavigate();
    const [tenants, setTenants] = useState<any[]>([]);

    useEffect(() => {
        fetchTenants();
    }, []);

    const fetchTenants = async () => {
        try {
            const response = await axios.get('/api/tenants');
            setTenants(response.data);
        } catch (error) {
            console.error('Failed to fetch tenants', error);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) {
            try {
                await axios.delete(`/api/tenants/${id}`);
                setTenants(prev => prev.filter(t => t.tenantId !== id));
            } catch (error) {
                alert('Failed to delete tenant');
            }
        }
    };

    // handleToggleStatus removed (moved to EstateDetails)

    // Derived Metrics
    const totalEstates = tenants.length;
    const activeEstates = tenants.filter(t => t.subscriptionStatus === 'ACTIVE').length;
    const suspendedEstates = tenants.filter(t => t.subscriptionStatus !== 'ACTIVE').length;

    return (
        <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: '#f8f9fc', p: 3 }}>

            {/* Branding Header & Profile - Kept Same */}
            <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                    <Typography variant="h4" fontWeight="bold" color="primary" sx={{ fontFamily: '"Abhaya Libre", serif' }}>වැවිලි</Typography>
                    <Typography variant="subtitle1" color="text.secondary">Super Admin Dashboard</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                    <Box textAlign="right" sx={{ display: { xs: 'none', sm: 'block' } }}>
                        <Typography variant="subtitle2" fontWeight="bold" color="text.primary">Super Admin</Typography>
                        <Typography variant="caption" color="text.secondary">{new Date().toLocaleDateString()}</Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 45, height: 45 }}>SA</Avatar>
                </Box>
            </Box>

            {/* KPI Cards Row */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} sm={6} md={3}>
                    <KPICard title="Total Estates" value={totalEstates} color="#4e73df" icon={<BusinessIcon fontSize="large" />} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <KPICard title="Active Subscriptions" value={activeEstates} color="#1cc88a" icon={<MonetizationOnIcon fontSize="large" />} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <KPICard title="Suspended / Inactive" value={suspendedEstates} color="#e74a3b" icon={<AssignmentIcon fontSize="large" />} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <KPICard title="Total Active Staff" value="--" color="#f6c23e" icon={<PeopleIcon fontSize="large" />} />
                </Grid>
            </Grid>

            {/* Bottom Section: Estates Table */}
            <Paper sx={{ width: '100%', overflow: 'hidden', boxShadow: 2, borderRadius: 2 }}>
                <Box p={3} borderBottom="1px solid #e3e6f0">
                    <Typography variant="h6" fontWeight="bold" color="primary">Registered Estates</Typography>
                </Box>
                <TableContainer sx={{ maxHeight: 440 }}>
                    <Table stickyHeader aria-label="sticky table">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Logo</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Company Name</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Subdomain</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {tenants.map((tenant) => (
                                <TableRow hover role="checkbox" tabIndex={-1} key={tenant.tenantId}>
                                    <TableCell>
                                        {tenant.logoUrl ? (
                                            <Avatar src={tenant.logoUrl} variant="rounded" sx={{ width: 40, height: 40 }} />
                                        ) : (
                                            <Avatar variant="rounded" sx={{ width: 40, height: 40, bgcolor: 'secondary.main' }}>
                                                {tenant.companyName.charAt(0)}
                                            </Avatar>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Typography fontWeight="bold">{tenant.companyName}</Typography>
                                    </TableCell>
                                    <TableCell>{tenant.subDomain}.wevili.com</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={tenant.subscriptionStatus}
                                            color={tenant.subscriptionStatus === 'ACTIVE' ? "success" : "error"}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Button
                                            variant="contained"
                                            size="small"
                                            onClick={() => navigate(`/super-admin/estate/${tenant.tenantId}`)}
                                            sx={{ mr: 1, textTransform: 'none', bgcolor: '#4e73df' }}
                                        >
                                            Manage
                                        </Button>
                                        <IconButton color="error" size="small" onClick={() => handleDelete(tenant.tenantId, tenant.companyName)}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
}
