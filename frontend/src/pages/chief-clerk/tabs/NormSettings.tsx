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
                Operational Targets & Norms
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Set the required daily targets (Plucking Norms, Fertilizer amounts, Weeding goals, Transport quotas) for Estate divisions.
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
                            label="Target/Task Mode"
                            value={cropType}
                            onChange={(e) => setCropType(e.target.value)}
                        >
                            <MenuItem value="TEA">Tea (Plucking Norm)</MenuItem>
                            <MenuItem value="RUBBER">Rubber (Tapping Norm)</MenuItem>
                            <MenuItem value="FERTILIZER">Fertilizing (Kg per Day)</MenuItem>
                            <MenuItem value="WEEDING">Weeding (Acreage/SqFt per Day)</MenuItem>
                            <MenuItem value="TRANSPORT">Transport/Sundry</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            type="number"
                            label={cropType === 'TEA' ? 'Norm Target (Kg)' : cropType === 'RUBBER' ? 'Norm Target (Taps)' : 'Target Amount / Quota'}
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
                            Lock in {cropType.toLowerCase().replace('_', ' ')} target
                        </Button>
                    </Grid>
                </Grid>
            </Paper>
        </Box>
    );
}
