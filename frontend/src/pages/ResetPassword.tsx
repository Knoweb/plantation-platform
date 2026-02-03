import { useState } from 'react';
import { Box, TextField, Button, Typography, Alert, Grid } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import loginBg from '../assets/login-bg-hd.png';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Client-side Password Validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            setError("Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');

        try {
            await axios.post('http://localhost:8080/api/tenants/reset-password', {
                token: token,
                newPassword: newPassword
            });
            setMessage('Password reset successfully! Redirecting to login...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to reset password.');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
                <Alert severity="error">Invalid link. No token found.</Alert>
            </Box>
        );
    }

    return (
        <Grid container component="main" sx={{ height: '100vh' }}>
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
                        Reset Password 🔒
                    </Typography>
                    <Typography variant="body1" color="text.secondary" mb={4}>
                        Enter your new password below.
                    </Typography>

                    {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    <Box component="form" onSubmit={handleSubmit} noValidate>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="newPassword"
                            label="New Password"
                            type="password"
                            id="newPassword"
                            autoFocus
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            helperText="Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char"
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="confirmPassword"
                            label="Confirm New Password"
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
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
                            {loading ? 'Reseting...' : 'Set New Password'}
                        </Button>
                    </Box>
                </Box>
            </Grid>

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
