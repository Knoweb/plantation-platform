import { Box, Typography, Card, CardContent, Button, TextField, FormControl, Select, MenuItem, Alert, Snackbar, Grid, Table, TableHead, TableRow, TableCell, TableBody, Paper } from '@mui/material';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function OrderRequest() {
    const [items, setItems] = useState<any[]>([]);
    const [itemId, setItemId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [remarks, setRemarks] = useState('');
    const [divisions, setDivisions] = useState<any[]>([]);
    const [fields, setFields] = useState<any[]>([]);
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

    useEffect(() => {
        if (tenantId) {
            fetchInitialData();
        }
    }, [tenantId]);

    const fetchInitialData = async () => {
        try {
            const [itemRes, divRes] = await Promise.all([
                axios.get(`/api/inventory?tenantId=${tenantId}`),
                axios.get(`/api/divisions?tenantId=${tenantId}`)
            ]);
            setItems(itemRes.data);

            const myDivisions = userSession.divisionAccess || [];
            if (myDivisions.length > 0) {
                const userDivisions = divRes.data.filter((d: any) => myDivisions.includes(d.divisionId));
                setDivisions(userDivisions);
                if (userDivisions.length > 0) {
                    setSelectedDivision(userDivisions[0].divisionId);
                    fetchFields(userDivisions[0].divisionId);
                }
            } else {
                setDivisions(divRes.data);
            }
        } catch (error) {
            console.error("Error fetching data", error);
            showNotification("Failed to load initial data", "error");
        }
    };

    const fetchFields = async (divId: string) => {
        try {
            const res = await axios.get(`/api/fields?divisionId=${divId}`);
            setFields(res.data);
        } catch (error) {
            setFields([]);
        }
    };

    const handleDivisionChange = (e: any) => {
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

    const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
        setNotification({ open: true, message, severity });
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
                    <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid #ccc' }}>
                        <Box sx={{ bgcolor: '#a5a5a5', borderBottom: '2px solid #000', textAlign: 'center', py: 0.5, fontWeight: 'bold' }}>
                            Request Orders
                        </Box>



                        <Box sx={{ flex: 1, overflow: 'auto', maxHeight: '500px' }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ py: 0.5, fontWeight: 'bold' }}>Item</TableCell>
                                        <TableCell sx={{ py: 0.5, fontWeight: 'bold' }}>Unit</TableCell>
                                        <TableCell align="right" sx={{ py: 0.5, fontWeight: 'bold' }}>Qty</TableCell>
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
                    <Card elevation={3} sx={{ borderRadius: 0, height: '100%', border: '1px solid #ccc' }}>
                        <CardContent sx={{ p: 0, pb: '16px !important' }}>
                            <Box sx={{ bgcolor: '#e0e0e0', p: 1 }}>
                                <Typography variant="subtitle2" align="center">Request Form</Typography>
                            </Box>

                            <Box sx={{ p: 3 }}>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Box display="flex" alignItems="center" mb={2}>
                                            <Typography variant="body2" sx={{ width: 80 }}>Division</Typography>
                                            <FormControl size="small" sx={{ flex: 1 }}>
                                                <Select
                                                    value={selectedDivision}
                                                    displayEmpty
                                                    onChange={handleDivisionChange}
                                                    sx={{ borderRadius: 0 }}
                                                >
                                                    <MenuItem value="" disabled sx={{ display: 'none' }}>Select Division</MenuItem>
                                                    {divisions.map(d => (
                                                        <MenuItem key={d.divisionId} value={d.divisionId}>{d.name}</MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Box>

                                        <Box display="flex" alignItems="center" mb={2}>
                                            <Typography variant="body2" sx={{ width: 80 }}>Field No</Typography>
                                            <FormControl size="small" sx={{ flex: 1 }}>
                                                <Select
                                                    value={selectedField}
                                                    displayEmpty
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setSelectedField(val);
                                                        if (val) {
                                                            const f = fields.find((field: any) => field.fieldId === val);
                                                            if (f && f.cropType) setSelectedCrop(f.cropType);
                                                        } else {
                                                            setSelectedCrop('');
                                                        }
                                                    }}
                                                    sx={{ borderRadius: 0 }}
                                                >
                                                    <MenuItem value=""><em>None</em></MenuItem>
                                                    {fields.map(f => (
                                                        <MenuItem key={f.fieldId} value={f.fieldId}>{f.name}</MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Box>

                                        <Box display="flex" alignItems="center" mb={2}>
                                            <Typography variant="body2" sx={{ width: 80 }}>Crop</Typography>
                                            <FormControl size="small" sx={{ flex: 1 }}>
                                                <Select
                                                    value={selectedCrop}
                                                    displayEmpty
                                                    onChange={(e) => setSelectedCrop(e.target.value)}
                                                    sx={{ borderRadius: 0, bgcolor: '#a5d6a7' }}
                                                >
                                                    <MenuItem value="" disabled sx={{ display: 'none' }}>Select Crop</MenuItem>
                                                    {(() => {
                                                        let availableCrops: string[] = [];
                                                        if (selectedField) {
                                                            const field = fields.find((f: any) => f.fieldId === selectedField);
                                                            if (field && field.cropType) availableCrops = [field.cropType];
                                                        } else {
                                                            availableCrops = Array.from(new Set(fields.map((f: any) => f.cropType))).filter(Boolean) as string[];
                                                        }

                                                        return [
                                                            ...availableCrops.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>),
                                                            <MenuItem key="General" value="General">General</MenuItem>
                                                        ];
                                                    })()}
                                                </Select>
                                            </FormControl>
                                        </Box>

                                        <Box display="flex" alignItems="center" mb={2}>
                                            <Typography variant="body2" sx={{ width: 80 }}>Item</Typography>
                                            <FormControl size="small" sx={{ flex: 1 }}>
                                                <Select
                                                    value={itemId}
                                                    displayEmpty
                                                    onChange={(e) => setItemId(e.target.value)}
                                                    sx={{ borderRadius: 0 }}
                                                >
                                                    <MenuItem value="" disabled sx={{ display: 'none' }}>Select Item</MenuItem>
                                                    {items.map(i => (
                                                        <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Box>



                                        <Box display="flex" alignItems="center" mb={2}>

                                        </Box>

                                        <Box display="flex" alignItems="center" mb={2}>
                                            <Typography variant="body2" sx={{ width: 80 }}>Quantity</Typography>
                                            <TextField
                                                size="small"
                                                required
                                                type="number"
                                                sx={{ flex: 1, '& .MuiInputBase-root': { borderRadius: 0 } }}
                                                value={quantity}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    // Prevent typing/pasting negative numbers
                                                    if (Number(val) < 0) return;
                                                    setQuantity(val);
                                                }}
                                                inputProps={{ min: 1 }}
                                                InputProps={{
                                                    endAdornment: <Typography variant="body2">{selectedItemObj?.unit || ''}</Typography>
                                                }}
                                            />
                                        </Box>
                                    </Grid>

                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        {selectedItemObj && (
                                            <Box sx={{ pl: 2 }}>
                                                <Typography variant="body2" gutterBottom>{selectedItemObj.name}</Typography>
                                                <Typography variant="body2" color="text.secondary">Available Qty {selectedItemObj.currentQuantity} {selectedItemObj.unit}</Typography>
                                            </Box>
                                        )}
                                    </Grid>
                                </Grid>

                                <Box mt={3} p={1} sx={{ border: '2px solid #000', minHeight: '150px' }}>
                                    <Typography variant="body2" fontWeight="bold">Remarks:-</Typography>
                                    <TextField
                                        fullWidth
                                        variant="standard"
                                        multiline
                                        minRows={4}
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        InputProps={{ disableUnderline: true }}
                                    />
                                </Box>

                                <Box display="flex" justifyItems="center" mt={4} justifyContent="center" >
                                    <Button
                                        variant="contained"
                                        sx={{ bgcolor: '#ffff00', color: '#000', fontWeight: 'bold', textTransform: 'none', minWidth: 120, '&:hover': { bgcolor: '#ffea00' } }}
                                        onClick={handleSubmitRequest}
                                    >
                                        Submit
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
