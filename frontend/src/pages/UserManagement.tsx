import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    CircularProgress,
    IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

// Roles Enum
const ROLES = [
    { value: 'MANAGER', label: 'Manager' },
    { value: 'FIELD_OFFICER', label: 'Field Officer' },
    { value: 'STORE_KEEPER', label: 'Store Keeper' }
];

export default function UserManagement() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);

    // User Session
    const userSession = JSON.parse(localStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId; // Need this to create user

    // Form State
    const [formData, setFormData] = useState({
        fullName: '',
        username: '',
        password: '',
        role: 'FIELD_OFFICER'
    });

    useEffect(() => {
        if (tenantId) fetchUsers();
    }, [tenantId]);

    const fetchUsers = async () => {
        try {
            // Using the existing endpoint to get users by tenant ID
            const response = await axios.get(`http://localhost:8080/api/tenants/${tenantId}/users`);
            setUsers(response.data);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async () => {
        if (!formData.fullName || !formData.username || !formData.password) return;

        try {
            await axios.post('http://localhost:8080/api/tenants/users', {
                tenantId: tenantId,
                ...formData
            });
            setOpen(false);
            setFormData({ fullName: '', username: '', password: '', role: 'FIELD_OFFICER' });
            fetchUsers(); // Refresh list
        } catch (error) {
            alert("Failed to create user. Username might be taken.");
        }
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight="bold">
                    Staff Management
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpen(true)}
                    sx={{ px: 3 }}
                >
                    Add New User
                </Button>
            </Box>

            {loading ? (
                <CircularProgress />
            ) : (
                <TableContainer component={Paper} elevation={2}>
                    <Table>
                        <TableHead sx={{ bgcolor: 'grey.100' }}>
                            <TableRow>
                                <TableCell><strong>Name</strong></TableCell>
                                <TableCell><strong>Username</strong></TableCell>
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
                                        <Chip
                                            label={user.role.replace('_', ' ')}
                                            color={user.role === 'MANAGER' ? 'primary' : 'default'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton color="error" size="small">
                                            <DeleteIcon />
                                        </IconButton>
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
            )}

            {/* Create User Dialog */}
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add New Staff Member</DialogTitle>
                <DialogContent>
                    <Box component="form" sx={{ mt: 1 }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="Full Name"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="Username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="Password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                        <TextField
                            select
                            margin="normal"
                            required
                            fullWidth
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
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreateUser}>Create User</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
