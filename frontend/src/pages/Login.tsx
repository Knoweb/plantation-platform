import { useState } from 'react';
import {
    Box,
    Grid,
    Typography,
    TextField,
    Button,
    InputAdornment,
    IconButton,
    Alert,
    Link,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import loginBg from '../assets/login-bg-hd.png';
import SpaIcon from '@mui/icons-material/Spa';

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
            const response = await axios.post('http://localhost:8081/api/tenants/login', formData);
            const sessionData = {
                username: response.data.username,
                role: response.data.role,
                estateName: response.data.companyName,
                estateLogo: response.data.logoUrl,
                tenantId: response.data.tenantId,
                userId: response.data.userId,
                divisionAccess: response.data.divisionAccess,
                config: response.data.config
            };
            sessionStorage.setItem('user', JSON.stringify(sessionData));
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || "Invalid credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Grid container component="main" sx={{ height: '100vh' }}>
            {/* Left Side - Login Form */}
            <Grid
                size={{ xs: 12, md: 6 }}
                sx={{
                    bgcolor: 'white', // White background
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    px: { xs: 4, md: 12 }
                }}
            >
                <Box
                    sx={{
                        width: '100%',
                        maxWidth: '450px',
                        p: 5, // More padding for "cute" look
                        borderRadius: '30px', // Soft, cute edges
                        // Premium Glass Look
                        background: 'linear-gradient(135deg, rgba(220, 255, 220, 0.7) 0%, rgba(100, 240, 100, 0.4) 100%)',
                        backdropFilter: 'blur(20px)',
                        border: '2px solid rgba(255, 255, 255, 0.8)', // Stronger glass rim

                        // "Blinking" / Pulse Animation
                        animation: 'pulse-green 4s infinite ease-in-out', // Slower, softer pulse
                        '@keyframes pulse-green': {
                            '0%': {
                                boxShadow: '0 0 0 0 rgba(76, 175, 80, 0.4)',
                            },
                            '70%': {
                                boxShadow: '0 0 25px 15px rgba(76, 175, 80, 0)',
                            },
                            '100%': {
                                boxShadow: '0 0 0 0 rgba(76, 175, 80, 0)',
                            },
                        },
                    }}
                >
                    <Box display="flex" flexDirection="column" alignItems="flex-start" width="100%">
                        {/* Logo / Brand */}
                        <Box display="flex" alignItems="center" mb={4}>
                            <SpaIcon sx={{ color: '#2ecc71', fontSize: 36, mr: 1 }} />
                            <Typography variant="h5" fontWeight="exrabold" color="#1b5e20" sx={{ letterSpacing: 1 }}>
                                EstateIQ
                            </Typography>
                        </Box>

                        <Typography variant="h5" fontWeight="bold" color="#2e7d32" gutterBottom>
                            Welcome Back!
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mb={4}>
                            Please sign-in to your account
                        </Typography>

                        {error && <Alert severity="error" sx={{ mb: 2, width: '100%' }}>{error}</Alert>}

                        <Box component="form" onSubmit={handleLogin} noValidate sx={{ width: '100%' }}>
                            <Typography variant="caption" fontWeight="bold" color="text.secondary" ml={0.5}>
                                EMAIL OR USERNAME
                            </Typography>
                            <TextField
                                margin="dense"
                                required
                                fullWidth
                                id="username"
                                placeholder="Enter your name"
                                name="username"
                                autoComplete="username"
                                autoFocus
                                value={formData.username}
                                onChange={handleChange}
                                sx={{
                                    mb: 3,
                                    '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.8)', '& fieldset': { border: 'none' } } // Semi-transparent white input
                                }}
                            />

                            <Typography variant="caption" fontWeight="bold" color="text.secondary" ml={0.5}>
                                PASSWORD
                            </Typography>
                            <TextField
                                margin="dense"
                                required
                                fullWidth
                                name="password"
                                placeholder="Enter password"
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                autoComplete="current-password"
                                value={formData.password}
                                onChange={handleChange}
                                sx={{
                                    mb: 1,
                                    '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.8)', '& fieldset': { border: 'none' } }
                                }}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <Box display="flex" justifyContent="flex-end" mb={2}>
                                <Link href="/forgot-password" underline="hover" color="primary" variant="body2" fontWeight="bold">
                                    Forgot Password?
                                </Link>
                            </Box>

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                sx={{
                                    mt: 2,
                                    mb: 3,
                                    py: 1.5,
                                    background: 'linear-gradient(45deg, #2e7d32 30%, #4caf50 90%)', // Gradient Button
                                    color: 'white',
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    textTransform: 'none',
                                    boxShadow: '0 3px 5px 2px rgba(46, 125, 50, .3)',
                                    '&:hover': { background: 'linear-gradient(45deg, #1b5e20 30%, #388e3c 90%)' }
                                }}
                                disabled={loading}
                            >
                                {loading ? 'Signing in...' : 'Sign in'}
                            </Button>

                            <Box display="flex" justifyContent="center">
                                <Typography variant="body2" color="text.secondary">
                                    New on our platform?{' '}
                                    <Link href="/register" underline="hover" color="primary" fontWeight="bold">
                                        Create an account
                                    </Link>
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Grid>

            {/* Right Side - Image */}
            <Grid
                size={{ xs: 12, md: 6 }}
                sx={{
                    backgroundImage: `url(${loginBg})`,
                    backgroundRepeat: 'no-repeat',
                    backgroundColor: (t) => t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900],
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: { xs: 'none', md: 'flex' },
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    p: 6
                }}
            />
        </Grid>
    );
}
