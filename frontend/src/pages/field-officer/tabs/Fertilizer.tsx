import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tab, FormControl, Select, MenuItem, InputLabel, CircularProgress } from '@mui/material';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Fertilizer() {
    const [activeCrop, setActiveCrop] = useState('TEA');
    const [divisions, setDivisions] = useState<any[]>([]);
    const [selectedDivision, setSelectedDivision] = useState<string>('');
    const [fields, setFields] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    useEffect(() => {
        if (tenantId) fetchDivisions();
    }, [tenantId]);

    const fetchDivisions = async () => {
        try {
            const res = await axios.get(`/api/divisions?tenantId=${tenantId}`);
            let divs = res.data;
            const assigned = userSession.divisionAccess || [];
            if (userSession.role === 'FIELD_OFFICER' && assigned.length > 0) {
                divs = divs.filter((d: any) => assigned.includes(d.divisionId));
            }
            setDivisions(divs);
            if (divs.length > 0) {
                setSelectedDivision(divs[0].divisionId);
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error("Failed to fetch divisions", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedDivision) fetchFields();
    }, [selectedDivision]);

    const fetchFields = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/fields?divisionId=${selectedDivision}`);
            setFields(res.data);
        } catch (error) {
            console.error("Failed to fetch fields for division", error);
        } finally {
            setLoading(false);
        }
    };

    // Filter fields by active crop
    const displayFields = fields.filter((f: any) => activeCrop === 'ALL' || f.cropType === activeCrop);

    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const getMonthName = (offset: number) => {
        const d = new Date();
        d.setMonth(d.getMonth() - offset);
        return d.toLocaleString('default', { month: 'short' });
    };

    // Generate mock historical values based on field ID for consistent display
    const generateMockData = (fieldId: string, acreage: number) => {
        const seed = parseInt(fieldId.replace(/\D/g, '') || '1') % 10;
        const crop = 3000 + (seed * 200) + (acreage * 50); // mock crop
        const nitrogen = 100 + (seed * 10);
        const ratio = (crop / nitrogen).toFixed(2);
        const req = (nitrogen * 1.1).toFixed(0);

        // bush count typically around 4000-5000 per acre for tea
        const spa = 4000 + (seed * 100);
        const bushCount = Math.round(spa * (acreage || 1));

        return { crop, nitrogen, ratio, req, spa, bushCount };
    };

    return (
        <Box sx={{ p: 4, height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight="bold" sx={{ color: '#1b5e20' }}>
                    Fertilizer Programme
                </Typography>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Division</InputLabel>
                    <Select
                        value={selectedDivision}
                        label="Division"
                        onChange={(e) => setSelectedDivision(e.target.value)}
                    >
                        {divisions.map((div: any) => (
                            <MenuItem key={div.divisionId} value={div.divisionId}>
                                {div.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            <Typography variant="body1" color="text.secondary" mb={2}>
                Track fertilizer requirements and historical application across your division fields to ensure precise nutrient management based on yield ratios.
            </Typography>

            <Paper elevation={3} sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e0e0e0', borderRadius: 2 }}>

                <Tabs
                    value={activeCrop}
                    onChange={(_, v) => setActiveCrop(v)}
                    sx={{
                        minHeight: 40,
                        borderBottom: '1px solid #000',
                        bgcolor: '#fafafa',
                        '& .MuiTab-root': { minHeight: 40, py: 0.5, px: 3, fontWeight: 'bold', textTransform: 'none', color: '#000', borderRight: '1px solid #000' }
                    }}
                >
                    <Tab label="Tea" value="TEA" sx={{ bgcolor: activeCrop === 'TEA' ? '#4caf50' : '#c8e6c9', '&.Mui-selected': { bgcolor: '#4caf50', color: '#fff !important' } }} />
                    <Tab label="Rubber" value="RUBBER" sx={{ bgcolor: activeCrop === 'RUBBER' ? '#03a9f4' : '#b3e5fc', '&.Mui-selected': { bgcolor: '#03a9f4', color: '#fff !important' } }} />
                    <Tab label="Cinnamon" value="CINNAMON" sx={{ bgcolor: activeCrop === 'CINNAMON' ? '#ffc107' : '#ffecb3', '&.Mui-selected': { bgcolor: '#ffc107', color: '#000 !important' } }} />
                    <Tab label="General" value="ALL" sx={{ bgcolor: activeCrop === 'ALL' ? '#9e9e9e' : '#e0e0e0', '&.Mui-selected': { bgcolor: '#757575', color: '#fff !important' }, borderRight: 'none !important' }} />
                </Tabs>

                <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', bgcolor: '#fff' }}>
                    {loading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" width="100%">
                            <CircularProgress color="success" />
                        </Box>
                    ) : (
                        <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                            <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { borderRight: '1px solid #bdbdbd', borderBottom: '1px solid #bdbdbd', padding: '6px 12px', whiteSpace: 'nowrap', textAlign: 'center' } }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell colSpan={4} sx={{ bgcolor: '#81c784', fontWeight: 'bold', borderBottom: '2px solid #000' }}>Field Attributes</TableCell>
                                        <TableCell colSpan={3} sx={{ bgcolor: '#aed581', fontWeight: 'bold', borderBottom: '2px solid #000' }}>Previous 12 Months</TableCell>
                                        <TableCell sx={{ bgcolor: '#81c784', fontWeight: 'bold', borderBottom: '2px solid #000' }}>Requirement</TableCell>
                                        <TableCell colSpan={4} sx={{ bgcolor: '#aed581', fontWeight: 'bold', borderBottom: '2px solid #000' }}>History</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ bgcolor: '#e8f5e9', fontWeight: 'bold', minWidth: 80, position: 'sticky', left: 0, zIndex: 1, borderRight: '2px solid #000' }}>Field No</TableCell>
                                        <TableCell sx={{ bgcolor: '#e8f5e9', fontWeight: 'bold' }}>Extent (Ac)</TableCell>
                                        <TableCell sx={{ bgcolor: '#e8f5e9', fontWeight: 'bold' }}>Bush Count</TableCell>
                                        <TableCell sx={{ bgcolor: '#e8f5e9', fontWeight: 'bold', borderRight: '2px solid #000' }}>SPA</TableCell>

                                        <TableCell sx={{ bgcolor: '#f1f8e9', fontWeight: 'bold' }}>Crop</TableCell>
                                        <TableCell sx={{ bgcolor: '#f1f8e9', fontWeight: 'bold' }}>Nitrogen</TableCell>
                                        <TableCell sx={{ bgcolor: '#f1f8e9', fontWeight: 'bold', borderRight: '2px solid #000' }}>Ratio</TableCell>

                                        <TableCell sx={{ bgcolor: '#e8f5e9', fontWeight: 'bold', borderRight: '2px solid #000' }}>{currentMonth}</TableCell>

                                        <TableCell sx={{ bgcolor: '#f1f8e9', fontWeight: 'bold' }}>{getMonthName(3)}</TableCell>
                                        <TableCell sx={{ bgcolor: '#f1f8e9', fontWeight: 'bold' }}>{getMonthName(2)}</TableCell>
                                        <TableCell sx={{ bgcolor: '#f1f8e9', fontWeight: 'bold' }}>{getMonthName(1)}</TableCell>
                                        <TableCell sx={{ bgcolor: '#f1f8e9', fontWeight: 'bold' }}>{getMonthName(0)}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {displayFields.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={12} sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                                                No fields found for this crop in the selected division.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        displayFields.map((field) => {
                                            const mock = generateMockData(field.fieldId, field.acreage);
                                            return (
                                                <TableRow key={field.fieldId} sx={{ '&:hover': { bgcolor: '#f5f5f5' } }}>
                                                    <TableCell sx={{ position: 'sticky', left: 0, bgcolor: '#fff', borderRight: '2px solid #ccc', fontWeight: 'bold' }}>
                                                        {field.name}
                                                    </TableCell>
                                                    <TableCell>{field.acreage}</TableCell>
                                                    <TableCell>{mock.bushCount.toLocaleString()}</TableCell>
                                                    <TableCell sx={{ borderRight: '2px solid #ccc' }}>{mock.spa}</TableCell>

                                                    <TableCell>{mock.crop}</TableCell>
                                                    <TableCell>{mock.nitrogen}</TableCell>
                                                    <TableCell sx={{ borderRight: '2px solid #ccc', fontWeight: 'bold', color: '#d84315' }}>{mock.ratio}</TableCell>

                                                    <TableCell sx={{ borderRight: '2px solid #ccc', fontWeight: 'bold', bgcolor: '#fff8e1' }}>{mock.req}</TableCell>

                                                    {/* Mock history application amounts loosely based on req */}
                                                    <TableCell>{(parseInt(mock.req) * 0.9).toFixed(0)}</TableCell>
                                                    <TableCell>{(parseInt(mock.req) * 1.05).toFixed(0)}</TableCell>
                                                    <TableCell>0</TableCell>
                                                    <TableCell>-</TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                    {displayFields.length > 0 && (
                                        <TableRow sx={{ bgcolor: '#81c784' }}>
                                            <TableCell sx={{ position: 'sticky', left: 0, bgcolor: '#66bb6a', borderRight: '2px solid #000', fontWeight: 'bold', color: '#fff' }}>
                                                Division
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: '#fff' }}>
                                                {displayFields.reduce((sum, f) => sum + (f.acreage || 0), 0).toFixed(2)}
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: '#fff' }}>
                                                {displayFields.reduce((sum, f) => sum + generateMockData(f.fieldId, f.acreage).bushCount, 0).toLocaleString()}
                                            </TableCell>
                                            <TableCell sx={{ borderRight: '2px solid #000', fontWeight: 'bold', color: '#fff' }}>
                                                {displayFields.length > 0 ? Math.round(displayFields.reduce((sum, f) => sum + generateMockData(f.fieldId, f.acreage).spa, 0) / displayFields.length) : 0}
                                            </TableCell>

                                            <TableCell colSpan={8} sx={{ bgcolor: '#81c784' }} />
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Box>
            </Paper>
        </Box>
    );
}
