import { useState } from 'react';
import { Box, TextField, Button, Typography, Alert, Link, Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import loginBg from '../assets/login-bg-hd.png';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            await axios.post('/api/tenants/forgot-password', { email });
            setMessage('If an account exists with this email, a reset link (token) has been sent.');
            // In a real app, the user checks their email. Here we might show the token in console for dev.
        } catch (err: any) {
            setError(err.response?.data?.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Grid container component="main" sx={{ height: '100vh' }}>
            {/* Left Side - Form */}
            <Grid
                size={{ xs: 12, md: 6 }}
                sx={{
                    bgcolor: 'background.default',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    px: { xs: 4, md: 12 }
                }}
            >
                <Box maxWidth="sm" width="100%">
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Forgot Password? 🔒
                    </Typography>
                    <Typography variant="body1" color="text.secondary" mb={4}>
                        Enter your email and we'll send you instructions to reset your password
                    </Typography>

                    {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    <Box component="form" onSubmit={handleSubmit} noValidate>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="Email"
                            name="email"
                            autoComplete="email"
                            autoFocus
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            sx={{ mb: 3 }}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={loading}
                            sx={{
                                py: 1.5,
                                bgcolor: '#00c853',
                                '&:hover': { bgcolor: '#00b248' }
                            }}
                        >
                            {loading ? 'Sending Link...' : 'Send Reset Link'}
                        </Button>
                        <Box display="flex" justifyContent="center" mt={3}>
                            <Link href="/login" underline="hover" color="primary" fontWeight="bold">
                                Back to Login
                            </Link>
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
                    display: { xs: 'none', md: 'flex' }
                }}
            />
        </Grid>
    );
}
