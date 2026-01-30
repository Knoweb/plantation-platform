import { useState } from 'react';
import {
    Box,
    Container,
    Paper,
    Typography,
    TextField,
    Button,
    InputAdornment,
    IconButton,
    Alert,
    Link
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LoginIcon from '@mui/icons-material/Login';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login() {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post('http://localhost:8080/api/tenants/login', formData);

            console.log("Login Success:", response.data);

            // Save real session data from backend
            const sessionData = {
                username: response.data.username,
                role: response.data.role,
                estateName: response.data.companyName,
                estateLogo: response.data.logoUrl,
                tenantId: response.data.tenantId, // Important for future API calls
                userId: response.data.userId
            };

            localStorage.setItem('user', JSON.stringify(sessionData));

            navigate('/dashboard');
        } catch (err: any) {
            console.error("Login Failed", err);
            setError(err.response?.data?.message || "Invalid credentials. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                height: '100vh',
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #1B5E20 30%, #4CAF50 90%)'
            }}
        >
            <Container maxWidth="xs">
                <Paper elevation={6} sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight="bold" color="primary" gutterBottom>
                        EstateIQ
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={3}>
                        Sign in to manage your plantation
                    </Typography>

                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    <Box component="form" onSubmit={handleLogin} noValidate>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="username"
                            label="Username or Email"
                            name="username"
                            autoComplete="username"
                            autoFocus
                            value={formData.username}
                            onChange={handleChange}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            autoComplete="current-password"
                            value={formData.password}
                            onChange={handleChange}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            sx={{ mt: 3, mb: 2, py: 1.5, fontWeight: 'bold' }}
                            disabled={loading}
                            startIcon={!loading && <LoginIcon />}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </Button>

                        <Box display="flex" justifyContent="space-between" mt={2}>
                            <Link href="#" variant="body2" underline="hover">
                                Forgot password?
                            </Link>
                            <Link href="/register" variant="body2" underline="hover">
                                Register new estate
                            </Link>
                        </Box>
                    </Box>
                </Paper>
                <Typography variant="caption" color="white" display="block" align="center" mt={4}>
                    &copy; 2026 EstateIQ Platform. All rights reserved.
                </Typography>
            </Container>
        </Box>
    );
}
