import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Alert } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function GeneralStock() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Buffer Edit State
    const [editOpen, setEditOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [bufferInput, setBufferInput] = useState<string>('');

    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;
    const isManager = userSession.role === 'MANAGER';

    useEffect(() => {
        fetchInventory();
    }, [tenantId]);

    const fetchInventory = async () => {
        try {
            const res = await axios.get(`http://localhost:8080/api/inventory?tenantId=${tenantId}`);
            setItems(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setError("Failed to load inventory.");
            setLoading(false);
        }
    };

    const handleEditClick = (item: any) => {
        setSelectedItem(item);
        setBufferInput(String(item.bufferLevel));
        setEditOpen(true);
    };

    const handleSaveBuffer = async () => {
        if (!selectedItem) return;
        const newLevel = parseInt(bufferInput) || 0;
        try {
            await axios.put(`http://localhost:8080/api/inventory/${selectedItem.id}/buffer`, newLevel, {
                headers: { 'Content-Type': 'application/json' }
            });
            setEditOpen(false);
            fetchInventory();
        } catch (err) {
            alert("Failed to update buffer level");
        }
    };

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                General Stock & Inventory Level
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={4}>
                Overview of current stock levels. Managers can set buffer thresholds here.
            </Typography>

            {/* Manager Alert Summary */}
            {isManager && items.some(i => i.currentQuantity < i.bufferLevel) && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    Attention Manager: Some items are below their buffer level. Please review stock and authorize purchase requests.
                </Alert>
            )}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell><strong>Item Name</strong></TableCell>
                            <TableCell><strong>Category</strong></TableCell>
                            <TableCell align="center"><strong>Unit</strong></TableCell>
                            <TableCell align="center"><strong>Current Qty</strong></TableCell>
                            <TableCell align="center"><strong>Buffer Level</strong></TableCell>
                            <TableCell align="center"><strong>Status</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {items.map((item) => {
                            const isLow = item.currentQuantity < item.bufferLevel;
                            return (
                                <TableRow key={item.id} sx={{ bgcolor: isLow ? '#fff4f4' : 'inherit' }}>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell><Chip label={item.category} size="small" /></TableCell>
                                    <TableCell align="center">{item.unit}</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>{item.currentQuantity}</TableCell>
                                    <TableCell align="center">
                                        {item.bufferLevel}
                                        {isManager && (
                                            <IconButton size="small" onClick={() => handleEditClick(item)} sx={{ ml: 1 }}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                    <TableCell align="center">
                                        {isLow ? (
                                            <Chip icon={<WarningIcon />} label="Low Stock" color="error" size="small" />
                                        ) : (
                                            <Chip icon={<CheckCircleIcon />} label="Good" color="success" size="small" variant="outlined" />
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {items.length === 0 && !loading && (
                            <TableRow><TableCell colSpan={6} align="center">No inventory items found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Buffer Edit Dialog */}
            <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
                <DialogTitle>Update Buffer Level</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" mb={2}>
                        Set the minimum stock level for <strong>{selectedItem?.name}</strong>.
                    </Typography>
                    <TextField
                        type="number"
                        label="Buffer Level"
                        fullWidth
                        value={bufferInput}
                        onChange={(e) => setBufferInput(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveBuffer}>Update</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
