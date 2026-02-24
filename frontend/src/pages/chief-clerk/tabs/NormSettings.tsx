import { Box, Typography, Paper, TextField, Button, Grid, MenuItem, Alert } from '@mui/material';
import { useState } from 'react';

export default function NormSettings() {
    const [cropType, setCropType] = useState('TEA');
    const [normValue, setNormValue] = useState('');
    const [month, setMonth] = useState('next');
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        // Mock save logic for now
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ color: '#1b5e20', mb: 2 }}>
                Estate Norms & Aththama (25th Planning)
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Set the minimum biological yield (Norm) required for workers to achieve their daily wage (Aththama).
            </Typography>

            {saved && <Alert severity="success" sx={{ mb: 3 }}>Monthly Norm Successfully Updated!</Alert>}

            <Paper sx={{ p: 4, borderRadius: 3, maxWidth: 600 }}>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <TextField
                            select
                            fullWidth
                            label="Applying Month"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                        >
                            <MenuItem value="current">Current Month (Immediate Override)</MenuItem>
                            <MenuItem value="next">Next Month (Planned)</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            select
                            fullWidth
                            label="Crop Type"
                            value={cropType}
                            onChange={(e) => setCropType(e.target.value)}
                        >
                            <MenuItem value="TEA">Tea (Plucking)</MenuItem>
                            <MenuItem value="RUBBER">Rubber (Tapping)</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            type="number"
                            label={cropType === 'TEA' ? 'Norm Target (Kg)' : 'Norm Target (Taps/Liters)'}
                            value={normValue}
                            onChange={(e) => setNormValue(e.target.value)}
                            placeholder={cropType === 'TEA' ? 'e.g., 18' : 'e.g., 250'}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            size="large"
                            onClick={handleSave}
                            disabled={!normValue}
                        >
                            Lock in {cropType} Norm target
                        </Button>
                    </Grid>
                </Grid>
            </Paper>
        </Box>
    );
}
