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
    IconButton,
    Alert,
    Tooltip,
    FormControl,
    InputLabel,
    Select,
    OutlinedInput
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import axios from 'axios';

// Roles Enum
const ROLES = [
    { value: 'MANAGER', label: 'Estate Manager' },
    { value: 'FIELD_OFFICER', label: 'Field Officer' },
    { value: 'STORE_KEEPER', label: 'Store Keeper' }
];

export default function UserManagement() {
    const [users, setUsers] = useState<any[]>([]);
    const [divisions, setDivisions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);

    // User Session
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    // Form State
    const [formData, setFormData] = useState({
        fullName: '',
        username: '',
        email: '',
        password: '',
        role: 'MANAGER',
        divisionAccess: [] as string[] // Store selected division IDs
    });

    useEffect(() => {
        if (tenantId) {
            fetchUsers();
            fetchDivisions();
        }
    }, [tenantId]);

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`http://localhost:8081/api/tenants/${tenantId}/users`);
            setUsers(response.data);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDivisions = async () => {
        try {
            const response = await axios.get(`http://localhost:8081/api/divisions?tenantId=${tenantId}`);
            setDivisions(response.data);
        } catch (error) {
            console.error("Failed to fetch divisions", error);
        }
    };

    const handleOpen = (user: any = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                fullName: user.fullName,
                username: user.username,
                email: user.email || '',
                password: '',
                role: user.role,
                divisionAccess: user.divisionAccess || []
            });
        } else {
            setEditingUser(null);
            setFormData({ fullName: '', username: '', email: '', password: '', role: 'MANAGER', divisionAccess: [] });
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setEditingUser(null);
        setFormData({ fullName: '', username: '', email: '', password: '', role: 'MANAGER', divisionAccess: [] });
    };

    const handleSave = async () => {
        if (!formData.fullName || !formData.username) return;
        if (!editingUser && !formData.password) return;

        // Prepare payload (convert single select to array if needed, but we use array in state)
        const payload = {
            tenantId: tenantId,
            ...formData
        };

        try {
            if (editingUser) {
                await axios.put(`http://localhost:8081/api/tenants/users/${editingUser.userId}`, payload);
            } else {
                await axios.post('http://localhost:8081/api/tenants/users', payload);
            }
            handleClose();
            fetchUsers();
        } catch (error) {
            alert("Failed to save user. Username might be taken.");
        }
    };

    const handleDelete = async (userId: string) => {
        if (window.confirm("Are you sure you want to delete this user?")) {
            try {
                await axios.delete(`http://localhost:8081/api/tenants/users/${userId}`);
                fetchUsers();
            } catch (error) {
                alert("Failed to delete user.");
            }
        }
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight="bold">
                    Staff & User Management
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()} sx={{ px: 3 }}>
                    Add Staff Member
                </Button>
            </Box>

            <Typography variant="body2" color="text.secondary" mb={2}>
                Manage your estate's operational staff. You are the <strong>Client Admin (Owner)</strong>.
            </Typography>

            {loading ? (
                <CircularProgress />
            ) : (
                <TableContainer component={Paper} elevation={2}>
                    <Table>
                        <TableHead sx={{ bgcolor: 'grey.100' }}>
                            <TableRow>
                                <TableCell><strong>Name</strong></TableCell>
                                <TableCell><strong>Username</strong></TableCell>
                                <TableCell><strong>Email</strong></TableCell>
                                <TableCell><strong>Role</strong></TableCell>
                                <TableCell><strong>Assigned Division</strong></TableCell>
                                <TableCell align="right"><strong>Actions</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.userId}>
                                    <TableCell>{user.fullName}</TableCell>
                                    <TableCell>{user.username}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={user.role.replace('_', ' ')}
                                            color={
                                                user.role === 'ESTATE_ADMIN' ? 'error' :
                                                    user.role === 'MANAGER' ? 'primary' : 'default'
                                            }
                                            variant={user.role === 'ESTATE_ADMIN' ? 'filled' : 'outlined'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {user.divisionAccess && user.divisionAccess.length > 0 ? (
                                            user.divisionAccess.map((divId: string) => {
                                                const div = divisions.find(d => d.divisionId === divId);
                                                return div ? <Chip key={divId} label={div.name} size="small" sx={{ mr: 0.5 }} /> : null;
                                            })
                                        ) : (
                                            <Typography variant="caption" color="text.secondary">All / None</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Edit Details">
                                            <IconButton color="primary" size="small" onClick={() => handleOpen(user)}>
                                                <EditIcon />
                                            </IconButton>
                                        </Tooltip>
                                        {user.role !== 'ESTATE_ADMIN' && (
                                            <Tooltip title="Delete User">
                                                <IconButton color="error" size="small" onClick={() => handleDelete(user.userId)}>
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <DialogTitle>{editingUser ? "Edit User Details" : "Add New Staff Member"}</DialogTitle>
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
                            label="Email Address"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                        <TextField
                            margin="normal"
                            required={!editingUser}
                            fullWidth
                            label="Password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            helperText={editingUser ? "Leave blank to keep current password" : ""}
                        />

                        {(formData.password || !editingUser) && (
                            <Box sx={{ mt: 1, pl: 1, mb: 2 }}>
                                <Typography variant="caption" display="block" color={formData.password.length >= 8 ? "success.main" : "text.secondary"}>
                                    {formData.password.length >= 8 ? "✓" : "○"} At least 8 characters
                                </Typography>
                                <Typography variant="caption" display="block" color={/[A-Z]/.test(formData.password) ? "success.main" : "text.secondary"}>
                                    {/[A-Z]/.test(formData.password) ? "✓" : "○"} At least one uppercase letter
                                </Typography>
                                <Typography variant="caption" display="block" color={/[a-z]/.test(formData.password) ? "success.main" : "text.secondary"}>
                                    {/[a-z]/.test(formData.password) ? "✓" : "○"} At least one lowercase letter
                                </Typography>
                                <Typography variant="caption" display="block" color={/\d/.test(formData.password) ? "success.main" : "text.secondary"}>
                                    {/\d/.test(formData.password) ? "✓" : "○"} At least one number
                                </Typography>
                                <Typography variant="caption" display="block" color={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(formData.password) ? "success.main" : "text.secondary"}>
                                    {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(formData.password) ? "✓" : "○"} At least one special character
                                </Typography>
                            </Box>
                        )}
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

                        {/* Division Assignment - Only if NOT Manager (Optional for manager, Mandatory for Field Officer) */}
                        {formData.role !== 'ESTATE_ADMIN' && (
                            <FormControl fullWidth margin="normal">
                                <InputLabel>Assigned Division(s)</InputLabel>
                                <Select
                                    multiple
                                    value={formData.divisionAccess}
                                    onChange={(e) => {
                                        const { value } = e.target;
                                        setFormData({
                                            ...formData,
                                            divisionAccess: typeof value === 'string' ? value.split(',') : value as string[]
                                        });
                                    }}
                                    input={<OutlinedInput label="Assigned Division(s)" />}
                                    renderValue={(selected) => (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {selected.map((value) => {
                                                const div = divisions.find(d => d.divisionId === value);
                                                return <Chip key={value} label={div ? div.name : value} size="small" />;
                                            })}
                                        </Box>
                                    )}
                                >
                                    {divisions.map((div) => (
                                        <MenuItem key={div.divisionId} value={div.divisionId}>
                                            {div.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave}>
                        {editingUser ? "Save Changes" : "Create User"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
