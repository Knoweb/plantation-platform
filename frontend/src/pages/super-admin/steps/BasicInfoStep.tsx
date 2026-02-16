import { Box, TextField, Typography, Grid, InputAdornment, IconButton } from '@mui/material';
import { useState } from 'react';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

interface Props {
    data: any;
    updateData: (data: any) => void;
}

export default function BasicInfoStep({ data, updateData }: Props) {
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        updateData({ ...data, [field]: e.target.value });
    };

    return (
        <Box component="form" noValidate sx={{ mt: 1 }}>
            <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Estate Details
                    </Typography>
                    <TextField
                        required
                        fullWidth
                        size="small"
                        label="Estate / Company Name"
                        value={data.companyName || ''}
                        onChange={handleChange('companyName')}
                        placeholder="E.g. Dunwatta Estate"
                    />
                </Grid>

                <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Account Setup
                    </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                        required
                        fullWidth
                        size="small"
                        label="Admin Email"
                        type="email"
                        value={data.adminEmail || ''}
                        onChange={handleChange('adminEmail')}
                        helperText="Used for notifications"
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                        required
                        fullWidth
                        size="small"
                        label="Admin Username"
                        value={data.adminUsername || ''}
                        onChange={handleChange('adminUsername')}
                        helperText="Unique identifier"
                    />
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <TextField
                        required
                        fullWidth
                        size="small"
                        type={showPassword ? 'text' : 'password'}
                        label="Password"
                        value={data.adminPassword || ''}
                        onChange={handleChange('adminPassword')}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        <PasswordRequirement met={data.adminPassword?.length >= 8} text="8+ chars" />
                        <PasswordRequirement met={/[A-Z]/.test(data.adminPassword || '')} text="Uppercase" />
                        <PasswordRequirement met={/[a-z]/.test(data.adminPassword || '')} text="Lowercase" />
                        <PasswordRequirement met={/\d/.test(data.adminPassword || '')} text="Number" />
                        <PasswordRequirement met={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(data.adminPassword || '')} text="Symbol" />
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
}

function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
    return (
        <Typography variant="caption" sx={{ color: met ? 'success.main' : 'text.secondary', display: 'flex', alignItems: 'center', mr: 1, fontSize: '0.7rem' }}>
            <span style={{ marginRight: 4 }}>{met ? '✓' : '○'}</span> {text}
        </Typography>
    );
}
