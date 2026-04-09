import { Box, Typography, Card, CardContent, Button, TextField, FormControl, Select, MenuItem, Alert, Snackbar, Grid, Table, TableHead, TableRow, TableCell, TableBody, Paper } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface InventoryItem {
    id: string;
    name: string;
    unit: string;
    currentQuantity: number;
}

interface Division {
    divisionId: string;
    name: string;
}

interface Field {
    fieldId: string;
    name: string;
    cropType: string;
}

export default function OrderRequest() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [itemId, setItemId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [remarks, setRemarks] = useState('');
    const [divisions, setDivisions] = useState<Division[]>([]);
    const [fields, setFields] = useState<Field[]>([]);
    const [selectedDivision, setSelectedDivision] = useState('');
    const [selectedField, setSelectedField] = useState('');
    const [selectedCrop, setSelectedCrop] = useState('');

    const [notification, setNotification] = useState<{ open: boolean, message: string, severity: 'success' | 'error' | 'info' | 'warning' }>({
        open: false,
        message: '',
        severity: 'info'
    });

    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    const showNotification = useCallback((message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
        setNotification({ open: true, message, severity });
    }, []);

    const fetchFields = useCallback(async (divId: string) => {
        try {
            const res = await axios.get(`/api/fields?divisionId=${divId}`);
            setFields(res.data);
        } catch {
            setFields([]);
        }
    }, []);

    const fetchInitialData = useCallback(async () => {
        if (!tenantId) return;
        try {
            const [itemRes, divRes] = await Promise.all([
                axios.get(`/api/inventory?tenantId=${tenantId}`),
                axios.get(`/api/divisions?tenantId=${tenantId}`)
            ]);
            setItems(itemRes.data);

            const myDivisions = userSession.divisionAccess || [];
            if (myDivisions.length > 0) {
                const userDivisions = divRes.data.filter((d: Division) => myDivisions.includes(d.divisionId));
                setDivisions(userDivisions);
                if (userDivisions.length > 0) {
                    setSelectedDivision(userDivisions[0].divisionId);
                    fetchFields(userDivisions[0].divisionId);
                }
            } else {
                setDivisions(divRes.data);
            }
        } catch (err) {
            console.error("Error fetching data", err);
            showNotification("Failed to load initial data", "error");
        }
    }, [tenantId, userSession.divisionAccess, fetchFields, showNotification]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const handleDivisionChange = (e: SelectChangeEvent<string>) => {
        const divId = e.target.value;
        setSelectedDivision(divId);
        setSelectedField('');
        fetchFields(divId);
    };

    const handleSubmitRequest = async () => {
        if (!itemId || !quantity) {
            showNotification("Please fill all required fields", "warning");
            return;
        }

        if (!selectedCrop) {
            showNotification("Please select a target crop or General.", "warning");
            return;
        }

        const divName = divisions.find(d => d.divisionId === selectedDivision)?.name || '';
        const fieldName = fields.find(f => f.fieldId === selectedField)?.name || '';
        const userFullName = userSession.fullName || userSession.username || 'Field Officer';

        try {
            await axios.post('/api/inventory/transaction', {
                itemId: itemId,
                quantity: Number(quantity),
                type: 'FO_REQUISITION',
                tenantId: tenantId,
                divisionId: selectedDivision,
                divisionName: divName,
                fieldId: selectedField,
                fieldName: fieldName,
                issuedTo: `${userFullName} (Field Officer) - ${remarks}`
            });

            showNotification("Order Request Submitted Successfully", "success");
            setItemId('');
            setQuantity('');
            setRemarks('');
            setSelectedCrop('');
        } catch (error) {
            showNotification("Failed to submit request", "error");
            console.error(error);
        }
    };

    const selectedItemObj = items.find(i => i.id === itemId);

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4" fontWeight="bold" sx={{ color: '#1b5e20' }}>
                    Order Request
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {/* Left Panel: General Stock List */}
                <Grid size={{ xs: 12, md: 5 }}>
                    <Paper elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
                        <Box sx={{ bgcolor: '#455a64', color: 'white', py: 1.25, textAlign: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
                            Current Inventory
                        </Box>

                        <Box sx={{ flex: 1, overflow: 'auto', maxHeight: { xs: '200px', md: '500px' } }}>
                            <Table size="small" stickyHeader>
                                <TableHead sx={{ bgcolor: '#f5f7f9' }}>
                                    <TableRow>
                                        <TableCell sx={{ py: 1, fontWeight: 'bold', borderBottom: '2px solid #edf2f7' }}>Item</TableCell>
                                        <TableCell sx={{ py: 1, fontWeight: 'bold', borderBottom: '2px solid #edf2f7' }}>Unit</TableCell>
                                        <TableCell align="right" sx={{ py: 1, fontWeight: 'bold', borderBottom: '2px solid #edf2f7' }}>Stock</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {items.map(item => (
                                        <TableRow
                                            key={item.id}
                                            hover
                                            onClick={() => setItemId(item.id)}
                                            sx={{ cursor: 'pointer', ...(itemId === item.id ? { bgcolor: '#e8f5e9' } : {}) }}
                                        >
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell>{item.unit}</TableCell>
                                            <TableCell align="right">{item.currentQuantity}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    </Paper>
                </Grid>

                {/* Right Panel: Request Form */}
                <Grid size={{ xs: 12, md: 7 }}>
                    <Card elevation={2} sx={{ borderRadius: 2, height: '100%', border: '1px solid #e0e0e0' }}>
                        <CardContent sx={{ p: 0, pb: '0 !important' }}>
                            <Box sx={{ bgcolor: '#2e7d32', p: 1.25, color: 'white' }}>
                                <Typography variant="subtitle2" align="center" fontWeight="bold">Request Details</Typography>
                            </Box>

                            <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
                                <Grid container spacing={2}>
                                    {/* Line 1: Division & Field */}
                                    <Grid size={{ xs: 6 }}>
                                        <FormControl fullWidth size="small">
                                            <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 'bold', color: 'text.secondary' }}>Division</Typography>
                                            <Select
                                                value={selectedDivision}
                                                displayEmpty
                                                onChange={handleDivisionChange}
                                                sx={{ borderRadius: 2 }}
                                            >
                                                <MenuItem value="" disabled>Select</MenuItem>
                                                {divisions.map(d => (
                                                    <MenuItem key={d.divisionId} value={d.divisionId}>{d.name}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <FormControl fullWidth size="small">
                                            <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 'bold', color: 'text.secondary' }}>Field No</Typography>
                                            <Select
                                                value={selectedField}
                                                displayEmpty
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setSelectedField(val);
                                                    if (val) {
                                                        const f = fields.find((field: Field) => field.fieldId === val);
                                                        if (f && f.cropType) setSelectedCrop(f.cropType);
                                                    } else {
                                                        setSelectedCrop('');
                                                    }
                                                }}
                                                sx={{ borderRadius: 2 }}
                                            >
                                                <MenuItem value=""><em>None</em></MenuItem>
                                                {fields.map(f => (
                                                    <MenuItem key={f.fieldId} value={f.fieldId}>{f.name}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>

                                    {/* Line 2: Crop & Item */}
                                    <Grid size={{ xs: 6 }}>
                                        <FormControl fullWidth size="small">
                                            <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 'bold', color: 'text.secondary' }}>Crop</Typography>
                                            <Select
                                                value={selectedCrop}
                                                displayEmpty
                                                onChange={(e) => setSelectedCrop(e.target.value)}
                                                sx={{ borderRadius: 2, bgcolor: '#f1f8e9' }}
                                            >
                                                <MenuItem value="" disabled>Select</MenuItem>
                                                {(() => {
                                                    let availableCrops: string[] = [];
                                                    if (selectedField) {
                                                        const field = fields.find((f: Field) => f.fieldId === selectedField);
                                                        if (field && field.cropType) availableCrops = [field.cropType];
                                                    } else {
                                                        availableCrops = Array.from(new Set(fields.map((f: Field) => f.cropType))).filter(Boolean) as string[];
                                                    }

                                                    return [
                                                        ...availableCrops.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>),
                                                        <MenuItem key="General" value="General">General</MenuItem>
                                                    ];
                                                })()}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <FormControl fullWidth size="small">
                                            <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 'bold', color: 'text.secondary' }}>Item</Typography>
                                            <Select
                                                value={itemId}
                                                displayEmpty
                                                onChange={(e) => setItemId(e.target.value)}
                                                sx={{ borderRadius: 2 }}
                                            >
                                                <MenuItem value="" disabled>Select</MenuItem>
                                                {items.map(i => (
                                                    <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>

                                    {/* Line 3: Quantity */}
                                    <Grid size={{ xs: 12 }}>
                                        <Box>
                                            <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 'bold', color: 'text.secondary', display: 'block' }}>Quantity Needed</Typography>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                required
                                                type="number"
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                                value={quantity}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (Number(val) < 0) return;
                                                    setQuantity(val);
                                                }}
                                                inputProps={{ min: 1 }}
                                                InputProps={{
                                                    endAdornment: <Typography variant="caption" sx={{ ml: 1, fontWeight: 'bold', color: 'primary.main' }}>{selectedItemObj?.unit || ''}</Typography>
                                                }}
                                            />
                                        </Box>
                                    </Grid>

                                    {/* Line 4: Item Details & Remarks (Stacked below on mobile) */}
                                    <Grid size={{ xs: 12 }}>
                                        {selectedItemObj && (
                                            <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', mt: 1 }}>
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Typography variant="body2" fontWeight="bold" color="primary.main">{selectedItemObj.name}</Typography>
                                                    <Typography variant="caption" sx={{ bgcolor: '#e3f2fd', px: 1, py: 0.5, borderRadius: 1, color: '#1976d2', fontWeight: 'bold' }}>
                                                        Stock: {selectedItemObj.currentQuantity} {selectedItemObj.unit}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        )}
                                        
                                        <Box sx={{ p: 1.5, bgcolor: '#fffde7', borderRadius: 2, border: '1px solid #fff9c4', mt: 2 }}>
                                            <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#fbc02d', display: 'block', mb: 0.5 }}>Remarks / Note</Typography>
                                            <TextField
                                                fullWidth
                                                variant="standard"
                                                multiline
                                                minRows={2}
                                                placeholder="Add details about your request here..."
                                                value={remarks}
                                                onChange={(e) => setRemarks(e.target.value)}
                                                InputProps={{ disableUnderline: true, sx: { fontSize: '0.85rem' } }}
                                            />
                                        </Box>
                                    </Grid>
                                </Grid>

                                <Box display="flex" mt={3} justifyContent="center" >
                                    <Button
                                        variant="contained"
                                        fullWidth
                                        sx={{ 
                                            bgcolor: '#2e7d32', 
                                            color: 'white', 
                                            fontWeight: 'bold', 
                                            textTransform: 'none', 
                                            py: 1.25,
                                            borderRadius: 2,
                                            boxShadow: '0 4px 12px rgba(46, 125, 50, 0.2)',
                                            '&:hover': { bgcolor: '#1b5e20' } 
                                        }}
                                        onClick={handleSubmitRequest}
                                    >
                                        Submit Request
                                    </Button>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Snackbar
                open={notification.open}
                autoHideDuration={6000}
                onClose={() => setNotification({ ...notification, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert severity={notification.severity} onClose={() => setNotification({ ...notification, open: false })}>
                    {notification.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
