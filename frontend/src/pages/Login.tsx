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
            const response = await axios.post('/api/tenants/login', formData);
            const sessionData = {
                username: response.data.username,
                fullName: response.data.fullName,
                role: response.data.role,
                estateName: response.data.companyName,
                estateLogo: response.data.logoUrl,
                tenantId: response.data.tenantId,
                userId: response.data.userId,
                divisionAccess: response.data.divisionAccess,
                config: response.data.config
            };
            sessionStorage.setItem('user', JSON.stringify(sessionData));

            if (response.data.role === 'SUPER_ADMIN') {
                navigate('/super-admin');
            } else {
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Invalid credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Grid container component="main" sx={{ height: '100vh', overflow: 'hidden' }}>
            {/* Left Side - Form */}
            <Grid
                size={{ xs: 12, md: 5, lg: 4 }}
                sx={{
                    bgcolor: 'background.paper',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    px: { xs: 4, sm: 8, md: 6 },
                    position: 'relative',
                    zIndex: 1,
                    maxHeight: '100vh',
                    overflowY: 'auto'
                }}
            >
                <Box
                    sx={{
                        width: '100%',
                        maxWidth: 400,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                        mb: 4,
                        animation: 'fadeIn 0.8s ease-out',
                        '@keyframes fadeIn': {
                            '0%': { opacity: 0, transform: 'translateY(20px)' },
                            '100%': { opacity: 1, transform: 'translateY(0)' },
                        }
                    }}
                >
                    {/* Logo */}
                    {/* Logo - Styled Awesomely */}
                    <Box display="flex" alignItems="center" gap={2} mb={3} sx={{ alignSelf: { xs: 'center', md: 'flex-start' } }}>
                        <Box sx={{
                            p: 1.5,
                            borderRadius: '20px',
                            background: 'linear-gradient(135deg, #e8f5e9 0%, #ffffff 100%)',
                            boxShadow: '0 8px 20px rgba(46, 125, 50, 0.15)',
                            border: '1px solid rgba(200, 230, 201, 0.5)',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            color: '#2e7d32',
                            transition: 'transform 0.3s ease',
                            '&:hover': { transform: 'scale(1.05)' }
                        }}>
                            <SpaIcon sx={{ fontSize: 36 }} />
                        </Box>
                        <Box>
                            <Typography
                                variant="h3"
                                component="h1"
                                sx={{
                                    fontWeight: 900,
                                    lineHeight: 0.9,
                                    background: 'linear-gradient(to right, #1b5e20 0%, #43a047 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    fontFamily: '"Abhaya Libre", "Noto Serif Sinhala", serif',
                                    letterSpacing: '1px',
                                    mb: 0.5,
                                    filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.1))'
                                }}
                            >
                                වැවිලි
                            </Typography>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight="700"
                                letterSpacing="2px"
                                display="block"
                                sx={{ fontSize: '0.7rem', opacity: 0.8 }}
                            >
                                PLANTATION PLATFORM
                            </Typography>
                        </Box>
                    </Box>

                    {/* Header */}
                    <Box mt={2}>
                        <Typography variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
                            Welcome Back
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Enter your details to access your workspace.
                        </Typography>
                    </Box>

                    {error && <Alert severity="error" variant="outlined" sx={{ borderRadius: 2 }}>{error}</Alert>}

                    {/* Form */}
                    <Box component="form" onSubmit={handleLogin} noValidate width="100%">
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="username"
                            label="Email or Username"
                            name="username"
                            autoComplete="username"
                            autoFocus
                            value={formData.username}
                            onChange={handleChange}
                            variant="outlined"
                            sx={{
                                mb: 2,
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 3,
                                    bgcolor: 'grey.50',
                                    '&.Mui-focused': { bgcolor: 'background.paper' }
                                }
                            }}
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
                            variant="outlined"
                            sx={{
                                mb: 1,
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 3,
                                    bgcolor: 'grey.50',
                                    '&.Mui-focused': { bgcolor: 'background.paper' }
                                }
                            }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            onClick={() => setShowPassword(!showPassword)}
                                            onMouseDown={(e) => e.preventDefault()}
                                            edge="end"
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Box display="flex" justifyContent="flex-end" mb={2}>
                            <Link href="/forgot-password" underline="hover" color="primary" variant="body2" fontWeight="600">
                                Forgot Password?
                            </Link>
                        </Box>

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={loading}
                            sx={{
                                mt: 1,
                                mb: 3,
                                py: 1.8,
                                borderRadius: 3,
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                textTransform: 'none',
                                bgcolor: '#2e7d32',
                                '&:hover': { bgcolor: '#1b5e20' },
                                boxShadow: '0 8px 16px rgba(46, 125, 50, 0.24)'
                            }}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
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

                {/* Footer Copyright */}
                <Box sx={{ width: '100%', textAlign: 'center', mt: 4, pb: 2 }}>
                    <Typography variant="caption" color="text.disabled">
                        © 2026 Knoweb(PVT LTD). All rights reserved.
                    </Typography>
                </Box>
            </Grid>

            {/* Right Side - Image */}
            <Grid
                size={{ xs: 0, md: 7, lg: 8 }}
                sx={{
                    backgroundImage: `url(${loginBg})`,
                    backgroundRepeat: 'no-repeat',
                    backgroundColor: (t) => t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900],
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                    display: { xs: 'none', md: 'block' }
                }}
            >
                {/* Gradient Overlay */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.1) 100%)'
                    }}
                />

                {/* Hero Content Overlay (Bottom Left) */}
                <Box sx={{ position: 'absolute', bottom: 60, left: 60, maxWidth: 520, color: 'white', zIndex: 2 }}>
                    <Typography variant="h3" fontWeight="800" letterSpacing="-0.5px" gutterBottom sx={{ textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                        Cultivating Future Growth.
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9, textShadow: '0 2px 8px rgba(0,0,0,0.5)', fontWeight: 400 }}>
                        Smart management for modern tea and rubber estates. Monitor yields, manage field officers, and optimize production.
                    </Typography>
                </Box>
            </Grid>
        </Grid>
    );
}
