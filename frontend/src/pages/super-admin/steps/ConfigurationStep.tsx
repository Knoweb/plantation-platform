import { Box, Typography, FormGroup, FormControlLabel, Switch, Card, CardContent, Grid } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';

interface Props {
    data: any;
    updateData: (data: any) => void;
}

export default function ConfigurationStep({ data, updateData }: Props) {
    const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateData({
            ...data,
            configJson: {
                ...data.configJson,
                samajika: e.target.checked
            }
        });
    };

    return (
        <Box sx={{ mt: 1 }}>
            <Typography variant="h6" gutterBottom>
                Samajika
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
                Enable or disable Samajika (Society) membership for this estate.
            </Typography>

            <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                    <Card variant="outlined" sx={{ p: 0 }}>
                        <CardContent sx={{ p: 2 }}>
                            <FormGroup row>
                                <FormControlLabel
                                    control={<Switch size="medium" checked={!!data.configJson.samajika} onChange={handleToggle} />}
                                    label={
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <GroupsIcon color="primary" /> <Typography variant="body1">Enable Samajika</Typography>
                                        </Box>
                                    }
                                />
                            </FormGroup>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
