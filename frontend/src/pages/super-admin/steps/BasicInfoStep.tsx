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
            <Typography variant="h6" gutterBottom>
                Account Setup
            </Typography>
            <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                    <TextField
                        required
                        fullWidth
                        label="Admin Email"
                        type="email"
                        value={data.adminEmail || ''}
                        onChange={handleChange('adminEmail')}
                        helperText="Used for password reset and notifications"
                    />
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <TextField
                        required
                        fullWidth
                        label="Admin Username"
                        value={data.adminUsername || ''}
                        onChange={handleChange('adminUsername')}
                        helperText="Unique login identifier"
                    />
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <TextField
                        required
                        fullWidth
                        type={showPassword ? 'text' : 'password'}
                        label="Password"
                        value={data.adminPassword || ''}
                        onChange={handleChange('adminPassword')}
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
                    <Box sx={{ mt: 1, pl: 1 }}>
                        <Typography variant="caption" display="block" color={data.adminPassword?.length >= 8 ? "success.main" : "text.secondary"}>
                            {data.adminPassword?.length >= 8 ? "✓" : "○"} At least 8 characters
                        </Typography>
                        <Typography variant="caption" display="block" color={/[A-Z]/.test(data.adminPassword || '') ? "success.main" : "text.secondary"}>
                            {/[A-Z]/.test(data.adminPassword || '') ? "✓" : "○"} At least one uppercase letter
                        </Typography>
                        <Typography variant="caption" display="block" color={/[a-z]/.test(data.adminPassword || '') ? "success.main" : "text.secondary"}>
                            {/[a-z]/.test(data.adminPassword || '') ? "✓" : "○"} At least one lowercase letter
                        </Typography>
                        <Typography variant="caption" display="block" color={/\d/.test(data.adminPassword || '') ? "success.main" : "text.secondary"}>
                            {/\d/.test(data.adminPassword || '') ? "✓" : "○"} At least one number
                        </Typography>
                        <Typography variant="caption" display="block" color={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(data.adminPassword || '') ? "success.main" : "text.secondary"}>
                            {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(data.adminPassword || '') ? "✓" : "○"} At least one special character
                        </Typography>
                    </Box>
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                        Estate Details
                    </Typography>
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <TextField
                        required
                        fullWidth
                        label="Estate / Company Name"
                        value={data.companyName || ''}
                        onChange={handleChange('companyName')}
                        helperText="E.g. Dunwatta Estate"
                    />
                </Grid>
                {/* Subdomain excluded as discussed - will be auto-generated */}
            </Grid>
        </Box>
    );
}
