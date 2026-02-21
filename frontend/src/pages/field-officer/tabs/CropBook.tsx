import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tab, TextField } from '@mui/material';
import React, { useState } from 'react';

export default function CropBook() {
    const [activeCrop, setActiveCrop] = useState('Tea');
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    // Generating 31 rows for daily tracking
    const dailyData = Array.from({ length: 31 }, (_, i) => ({
        day: i + 1,
        // Mock data for display purposes
        factoryWeightDay: i === 0 ? '250.0' : '',
        factoryWeightTodate: i === 0 ? '250.0' : '',
        fieldWeightDay: i === 0 ? '252.0' : '',
        fieldWeightTodate: i === 0 ? '252.0' : '',
        checkrollWeightDay: i === 0 ? '250.0' : '',
        checkrollWeightTodate: i === 0 ? '250.0' : '',
        yieldPerHectareDay: i === 0 ? '12.5' : '',
        yieldPerHectareTodate: i === 0 ? '12.5' : '',
        noOfPluckersDay: i === 0 ? '10' : '',
        noOfPluckersTodate: i === 0 ? '10' : '',
        overKilosDay: i === 0 ? '20' : '',
        overKilosTodate: i === 0 ? '20' : '',
        cashKilosDay: i === 0 ? '5' : '',
        cashKilosTodate: i === 0 ? '5' : '',
        pluckingAverageDay: i === 0 ? '25.0' : '',
        pluckingAverageTodate: i === 0 ? '25.0' : '',
        pluckingCostPerKgDay: i === 0 ? '45.00' : '',
        pluckingCostPerKgTodate: i === 0 ? '45.00' : ''
    }));

    // Data for the left sidebar KPI section based on the screenshot
    const kpiData = [
        { label: 'Budgeted crop for the Year 2024/25', value: '320,000 Kg', type: 'header', bgColor: '#e8f5e9' },
        { label: 'Achieved Crop Upto end June', value: '92,456 Kg', type: 'achieved', bgColor: '#c8e6c9' },
        { label: 'Achievement', value: '29 %', type: 'percentage', bgColor: '#a5d6a7' },
        { label: 'Budgeted crop up to June', value: '80,000 Kg', type: 'header', bgColor: '#66bb6a' },
        { label: 'Achievement up to June', value: '115.57 %', type: 'percentage', bgColor: '#81c784' },
        { label: 'Budgeted crop for the month', value: '30,000 Kg', type: 'header', bgColor: '#c8e6c9' },
        { label: 'Achieved Crop - Todate', value: '7,182 Kg', type: 'achieved', bgColor: '#e8f5e9' },
        { label: 'Budgeted Crop for todate', value: '5,806', type: 'achieved', bgColor: '#c8e6c9' },
        { label: 'Achievement For The month', value: '23.94 %', type: 'percentage', bgColor: '#a5d6a7' },
        { label: 'Achievement For To Date', value: '123.69 %', type: 'percentage', bgColor: '#66bb6a' },
    ];

    return (
        <Box sx={{ pb: 4, height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
                    <Typography variant="h4" fontWeight="bold" sx={{ color: '#1b5e20' }}>
                        Crop Book
                    </Typography>
                </Box>
                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <TextField
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        size="small"
                        sx={{ width: 220 }}
                    />
                </Box>
                <Box sx={{ flex: 1 }} /> {/* Filler block for centering */}
            </Box>

            <Paper elevation={3} sx={{ flex: 1, display: 'flex', overflow: 'hidden', border: '1px solid #e0e0e0', borderRadius: 2 }}>

                {/* Left Panel: Cost Analysis KPIs & Crop Tabs */}
                <Box sx={{ width: 380, borderRight: '1px solid #000', display: 'flex', flexDirection: 'column' }}>
                    <Tabs
                        value={activeCrop}
                        onChange={(_, v) => setActiveCrop(v)}
                        sx={{
                            minHeight: 36,
                            borderBottom: '1px solid #000',
                            '& .MuiTab-root': { minHeight: 36, py: 0.5, px: 2, fontWeight: 'bold', textTransform: 'none', color: '#000', borderRight: '1px solid #000' }
                        }}
                    >
                        <Tab label="Tea" value="Tea" sx={{ bgcolor: activeCrop === 'Tea' ? '#4caf50' : '#81c784', '&.Mui-selected': { bgcolor: '#4caf50', color: '#fff !important' } }} />
                        <Tab label="Rubber" value="Rubber" sx={{ bgcolor: activeCrop === 'Rubber' ? '#03a9f4' : '#81d4fa', '&.Mui-selected': { bgcolor: '#03a9f4', color: '#fff !important' } }} />
                        <Tab label="Cinnamon" value="Cinnamon" sx={{ bgcolor: activeCrop === 'Cinnamon' ? '#ffc107' : '#ffe082', '&.Mui-selected': { bgcolor: '#ffc107', color: '#000 !important' } }} />
                        <Tab label="General" value="General" sx={{ bgcolor: activeCrop === 'General' ? '#e0e0e0' : '#f5f5f5', '&.Mui-selected': { bgcolor: '#bdbdbd', color: '#000 !important' }, borderRight: 'none !important' }} />
                    </Tabs>

                    {/* KPI Rows */}
                    <Box sx={{ flex: 1, overflowY: 'auto' }}>
                        {kpiData.map((kpi, idx) => (
                            <Box
                                key={idx}
                                sx={{
                                    bgcolor: kpi.bgColor,
                                    borderBottom: '1px solid #bccac0',
                                    p: 1.5,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'flex-start'
                                }}
                            >
                                <Typography variant="caption" sx={{ fontWeight: 'normal', color: '#333' }}>
                                    {kpi.label}
                                </Typography>
                                <Typography variant="h6" sx={{ alignSelf: 'flex-end', fontWeight: 'bold', color: '#000', mt: 0.5 }}>
                                    {kpi.value}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>

                {/* Right Panel: Data Grid */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                        <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', padding: '4px 8px', whiteSpace: 'nowrap', textAlign: 'center' } }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell colSpan={2} sx={{ bgcolor: '#fafafa' }} />
                                    <TableCell colSpan={2} sx={{ bgcolor: '#fafafa', fontWeight: 'bold' }}>Factory Weight</TableCell>
                                    <TableCell colSpan={2} sx={{ bgcolor: '#fafafa', fontWeight: 'bold' }}>Field Weight</TableCell>
                                    <TableCell colSpan={2} sx={{ bgcolor: '#fafafa', fontWeight: 'bold' }}>Checkroll Weight</TableCell>
                                    <TableCell colSpan={2} sx={{ bgcolor: '#fafafa', fontWeight: 'bold' }}>Yield per Hectare</TableCell>
                                    <TableCell colSpan={2} sx={{ bgcolor: '#fafafa', fontWeight: 'bold' }}>No. Of Pluckers</TableCell>
                                    <TableCell colSpan={2} sx={{ bgcolor: '#fafafa', fontWeight: 'bold' }}>Over kilos</TableCell>
                                    <TableCell colSpan={2} sx={{ bgcolor: '#fafafa', fontWeight: 'bold' }}>Cash Kilos</TableCell>
                                    <TableCell colSpan={2} sx={{ bgcolor: '#fafafa', fontWeight: 'bold' }}>Plucking Average</TableCell>
                                    <TableCell colSpan={2} sx={{ bgcolor: '#fafafa', fontWeight: 'bold' }}>Plucking Cost per Kg</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ bgcolor: '#fafafa', fontWeight: 'bold', position: 'sticky', left: 0, zIndex: 1, minWidth: 40, borderRight: '2px solid #000' }}>Day</TableCell>
                                    <TableCell sx={{ bgcolor: '#fafafa' }} />
                                    {Array.from({ length: 9 }).map((_, i) => (
                                        <React.Fragment key={i}>
                                            <TableCell sx={{ bgcolor: '#fafafa', fontSize: '0.75rem' }}>Day</TableCell>
                                            <TableCell sx={{ bgcolor: '#fafafa', fontSize: '0.75rem' }}>Todate</TableCell>
                                        </React.Fragment>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {dailyData.map((row) => (
                                    <TableRow key={row.day} sx={{ '&:hover': { bgcolor: '#f5f5f5' } }}>
                                        <TableCell sx={{ position: 'sticky', left: 0, bgcolor: '#fff', borderRight: '2px solid #ccc', fontWeight: 'bold' }}>
                                            {row.day}
                                        </TableCell>
                                        <TableCell sx={{ p: 0 }} /> {/* Spacer */}
                                        <TableCell>{row.factoryWeightDay}</TableCell>
                                        <TableCell>{row.factoryWeightTodate}</TableCell>
                                        <TableCell>{row.fieldWeightDay}</TableCell>
                                        <TableCell>{row.fieldWeightTodate}</TableCell>
                                        <TableCell>{row.checkrollWeightDay}</TableCell>
                                        <TableCell>{row.checkrollWeightTodate}</TableCell>
                                        <TableCell>{row.yieldPerHectareDay}</TableCell>
                                        <TableCell>{row.yieldPerHectareTodate}</TableCell>
                                        <TableCell>{row.noOfPluckersDay}</TableCell>
                                        <TableCell>{row.noOfPluckersTodate}</TableCell>
                                        <TableCell>{row.overKilosDay}</TableCell>
                                        <TableCell>{row.overKilosTodate}</TableCell>
                                        <TableCell>{row.cashKilosDay}</TableCell>
                                        <TableCell>{row.cashKilosTodate}</TableCell>
                                        <TableCell>{row.pluckingAverageDay}</TableCell>
                                        <TableCell>{row.pluckingAverageTodate}</TableCell>
                                        <TableCell>{row.pluckingCostPerKgDay}</TableCell>
                                        <TableCell>{row.pluckingCostPerKgTodate}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            </Paper>
        </Box>
    );
}
