import { Box, TextField, Typography, Grid } from '@mui/material';

interface Props {
    data: any;
    updateData: (data: any) => void;
}

export default function BasicInfoStep({ data, updateData }: Props) {
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
                        type="password"
                        label="Password"
                        value={data.adminPassword || ''}
                        onChange={handleChange('adminPassword')}
                    />
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
