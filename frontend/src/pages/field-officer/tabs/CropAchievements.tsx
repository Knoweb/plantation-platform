import { Box, Card, CardContent, Typography } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { BarChart } from '@mui/x-charts/BarChart';

export default function CropAchievements() {
    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                Crop Achievements
            </Typography>
            <Card sx={{ height: '100%' }}>
                <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                        <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6">Yield Analysis</Typography>
                    </Box>
                    <Box height={400} width="100%">
                        <BarChart
                            xAxis={[{ scaleType: 'band', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }]}
                            series={[
                                { data: [1200, 1350, 1100, 1400, 1250, 1300, 900], label: 'Green Leaf (kg)', color: '#4caf50' },
                                { data: [1100, 1200, 1050, 1300, 1200, 1250, 950], label: 'Target (kg)', color: '#bdbdbd' }
                            ]}
                            height={350}
                        />
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}
