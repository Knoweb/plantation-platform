import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tab } from '@mui/material';
import { useState } from 'react';

// Define the data structure based on the mock
interface CostDataRow {
    item: string;
    dayAmount: string;
    dayCostPerKg: string;
    todateAmount: string;
    todateCostPerKg: string;
    isHeaderRow?: boolean;
    isTotalRow?: boolean;
}

const mockData: CostDataRow[] = [
    { item: 'Pluckers', dayAmount: '15,000.00', dayCostPerKg: '45.00', todateAmount: '450,000.00', todateCostPerKg: '42.50' },
    { item: 'Kanganies', dayAmount: '2,500.00', dayCostPerKg: '7.50', todateAmount: '75,000.00', todateCostPerKg: '7.00' },
    { item: 'Sack Coolies', dayAmount: '1,500.00', dayCostPerKg: '4.50', todateAmount: '45,000.00', todateCostPerKg: '4.20' },
    { item: 'Staff OT for Plucking', dayAmount: '800.00', dayCostPerKg: '2.40', todateAmount: '24,000.00', todateCostPerKg: '2.20' },
    { item: 'Leaf Bags', dayAmount: '-', dayCostPerKg: '-', todateAmount: '12,000.00', todateCostPerKg: '1.10' },
    { item: 'Cash Kilos', dayAmount: '4,000.00', dayCostPerKg: '12.00', todateAmount: '120,000.00', todateCostPerKg: '11.30' },
    { item: 'Meals', dayAmount: '3,000.00', dayCostPerKg: '9.00', todateAmount: '90,000.00', todateCostPerKg: '8.50' },
    { item: 'Over Kilos', dayAmount: '2,000.00', dayCostPerKg: '6.00', todateAmount: '60,000.00', todateCostPerKg: '5.60' },
    { item: 'Total Plucking Cost', dayAmount: '28,800.00', dayCostPerKg: '86.40', todateAmount: '876,000.00', todateCostPerKg: '82.40', isTotalRow: true },

    { item: 'Chemical Weeding ManDays', dayAmount: '5,000.00', dayCostPerKg: '15.00', todateAmount: '150,000.00', todateCostPerKg: '14.10' },
    { item: 'Cost of Chemical', dayAmount: '12,000.00', dayCostPerKg: '36.00', todateAmount: '360,000.00', todateCostPerKg: '33.90' },
    { item: 'Tank Repair', dayAmount: '-', dayCostPerKg: '-', todateAmount: '5,000.00', todateCostPerKg: '0.40' },
    { item: 'Meals', dayAmount: '800.00', dayCostPerKg: '2.40', todateAmount: '24,000.00', todateCostPerKg: '2.20' },
    { item: 'Transport', dayAmount: '1,500.00', dayCostPerKg: '4.50', todateAmount: '45,000.00', todateCostPerKg: '4.20' },
    { item: 'Total Cost for Chemical weeding', dayAmount: '19,300.00', dayCostPerKg: '57.90', todateAmount: '584,000.00', todateCostPerKg: '54.80', isTotalRow: true },

    { item: 'Manual Weeding ManDays', dayAmount: '3,000.00', dayCostPerKg: '9.00', todateAmount: '90,000.00', todateCostPerKg: '8.40' },
    { item: 'Tools', dayAmount: '-', dayCostPerKg: '-', todateAmount: '8,000.00', todateCostPerKg: '0.70' },
    { item: 'Total Cost for Manual weeding', dayAmount: '3,000.00', dayCostPerKg: '9.00', todateAmount: '98,000.00', todateCostPerKg: '9.10', isTotalRow: true },

    { item: 'Fertilizer Cost', dayAmount: '-', dayCostPerKg: '-', todateAmount: '850,000.00', todateCostPerKg: '80.10', isTotalRow: true },
];

export default function CostAnalysis() {
    const [activeCrop, setActiveCrop] = useState('Tea');

    return (
        <Box sx={{ pb: 4 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4" fontWeight="bold" sx={{ color: '#1b5e20' }}>
                    Cost Analysis
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }).replace(/ /g, '-')}
                </Typography>
            </Box>

            <Paper elevation={3} sx={{ overflow: 'hidden', border: '1px solid #e0e0e0', borderRadius: 2 }}>

                {/* Crop Tabs (mimicking the colored cells in the mock) */}
                <Box sx={{ borderBottom: '1px solid #e0e0e0', bgcolor: '#f5f5f5' }}>
                    <Tabs
                        value={activeCrop}
                        onChange={(_, v) => setActiveCrop(v)}
                        sx={{
                            minHeight: 36,
                            '& .MuiTab-root': {
                                minHeight: 36,
                                py: 0.5,
                                px: 3,
                                fontWeight: 'bold',
                                textTransform: 'none',
                                color: '#000',
                                borderRight: '1px solid #ccc'
                            }
                        }}
                    >
                        <Tab label="Tea" value="Tea" sx={{ bgcolor: activeCrop === 'Tea' ? '#4caf50' : '#81c784', '&.Mui-selected': { bgcolor: '#4caf50', color: '#fff !important' } }} />
                        <Tab label="Rubber" value="Rubber" sx={{ bgcolor: activeCrop === 'Rubber' ? '#03a9f4' : '#81d4fa', '&.Mui-selected': { bgcolor: '#03a9f4', color: '#fff !important' } }} />
                        <Tab label="Cinnamon" value="Cinnamon" sx={{ bgcolor: activeCrop === 'Cinnamon' ? '#ffc107' : '#ffe082', '&.Mui-selected': { bgcolor: '#ffc107', color: '#000 !important' } }} />
                        <Tab label="General" value="General" sx={{ bgcolor: activeCrop === 'General' ? '#e0e0e0' : '#f5f5f5', '&.Mui-selected': { bgcolor: '#bdbdbd', color: '#000 !important' }, borderRight: 'none !important' }} />
                    </Tabs>
                </Box>

                {/* Complex Data Table */}
                <TableContainer sx={{ maxHeight: 'calc(100vh - 250px)' }}>
                    <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { borderRight: '1px solid #e0e0e0', padding: '6px 16px' } }}>

                        {/* Two-Tier Table Header */}
                        <TableHead>
                            <TableRow sx={{ '& th': { bgcolor: '#fafafa', color: '#1b5e20', fontWeight: 'bold', borderBottom: '1px solid #e0e0e0' } }}>
                                <TableCell rowSpan={2} sx={{ width: '30%', minWidth: 250 }}>Work Item</TableCell>
                                <TableCell colSpan={2} align="center" sx={{ borderBottom: '1px solid #e0e0e0 !important' }}>Day</TableCell>
                                <TableCell colSpan={2} align="center" sx={{ borderBottom: '1px solid #e0e0e0 !important' }}>Todate</TableCell>
                                <TableCell colSpan={2} align="center" sx={{ borderBottom: '1px solid #e0e0e0 !important' }}>History</TableCell>
                            </TableRow>
                            <TableRow sx={{ '& th': { bgcolor: '#fafafa', fontWeight: 'bold' } }}>
                                {/* Day */}
                                <TableCell align="right">Amount</TableCell>
                                <TableCell align="right">Cost/Kg</TableCell>
                                {/* Todate */}
                                <TableCell align="right">Amount</TableCell>
                                <TableCell align="right">Cost/Kg</TableCell>
                                {/* History */}
                                <TableCell align="right">Last Mth</TableCell>
                                <TableCell align="right">YTD</TableCell>
                            </TableRow>
                        </TableHead>

                        {/* Table Body */}
                        <TableBody>
                            {mockData.map((row, index) => (
                                <TableRow
                                    key={index}
                                    sx={{
                                        bgcolor: row.isTotalRow ? '#e0e0e0' : 'inherit',
                                        '&:hover': { bgcolor: row.isTotalRow ? '#d5d5d5' : '#f5f5f5' }
                                    }}
                                >
                                    <TableCell sx={{ fontWeight: row.isTotalRow ? 'bold' : 'normal' }}>
                                        {row.item}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: row.isTotalRow ? 'bold' : 'normal' }}>{row.dayAmount}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: row.isTotalRow ? 'bold' : 'normal' }}>{row.dayCostPerKg}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: row.isTotalRow ? 'bold' : 'normal' }}>{row.todateAmount}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: row.isTotalRow ? 'bold' : 'normal' }}>{row.todateCostPerKg}</TableCell>
                                    {/* History Placeholders */}
                                    <TableCell align="right" sx={{ color: 'text.secondary' }}>-</TableCell>
                                    <TableCell align="right" sx={{ color: 'text.secondary' }}>-</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
}
