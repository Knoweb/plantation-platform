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
                <Grid item xs={12}>
                    <TextField
                        required
                        fullWidth
                        label="Admin Username"
                        value={data.adminUsername || ''}
                        onChange={handleChange('adminUsername')}
                        helperText="This will be your login email/username"
                    />
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        required
                        fullWidth
                        type="password"
                        label="Password"
                        value={data.adminPassword || ''}
                        onChange={handleChange('adminPassword')}
                    />
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                        Estate Details
                    </Typography>
                </Grid>

                <Grid item xs={12}>
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
