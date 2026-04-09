import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Alert, Snackbar, useTheme, useMediaQuery } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info'; // For notification
import DownloadIcon from '@mui/icons-material/Download';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export default function GeneralStock() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Buffer Edit State
    const [editOpen, setEditOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [bufferInput, setBufferInput] = useState<string>('');
    const [minimumInput, setMinimumInput] = useState<string>('');

    // Restock State (Manager Only)
    const [restockRequests, setRestockRequests] = useState<any[]>([]); // New state
    // Approval Dialog State
    const [approveOpen, setApproveOpen] = useState(false);
    const [approveReq, setApproveReq] = useState<any>(null);
    const [approveQty, setApproveQty] = useState('');
    const [approveRemarks, setApproveRemarks] = useState('');

    // Notification State
    const [notification, setNotification] = useState<{ open: boolean, message: string, severity: 'success' | 'error' | 'info' | 'warning' }>({
        open: false,
        message: '',
        severity: 'info'
    });

    const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
        setNotification({ open: true, message, severity });
    };

    const handleCloseNotification = () => {
        setNotification({ ...notification, open: false });
    };

    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;
    const isManager = userSession.role === 'MANAGER' || userSession.role === 'ESTATE_ADMIN';

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const getRequestSourceLabel = (issuedTo?: string) => {
        const text = String(issuedTo || '').toLowerCase();
        if (text.includes('(store keeper)')) return 'Store Keeper';
        if (text.includes('(chief clerk)')) return 'Chief Clerk';
        return 'Staff';
    };

    const getManagerNoteText = (issuedTo?: string) => {
        if (!issuedTo) return '-';
        const source = getRequestSourceLabel(issuedTo);
        const notePart = issuedTo.includes(' - ') ? issuedTo.split(' - ').slice(1).join(' - ').trim() : '';
        return notePart ? `Requested by ${source} - ${notePart}` : `Requested by ${source}`;
    };
    const fetchInventory = useCallback(async () => {
        try {
            const res = await axios.get(`/api/inventory?tenantId=${tenantId}`);
            setItems(res.data);

            if (isManager) {
                const transRes = await axios.get(`/api/inventory/transactions?tenantId=${tenantId}`);
                setRestockRequests(transRes.data.filter((t: any) =>
                    t.type === 'RESTOCK_REQUEST' &&
                    (t.status === 'PENDING' || t.status === null) &&
                    !(t.issuedTo && t.issuedTo.includes('SYSTEM')) // Hide auto-refills from Manager
                ));
            }

            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    }, [tenantId, isManager]);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    const handleRequestAction = async (req: any) => {
        const isAuto = req.issuedTo && (req.issuedTo.includes('Auto-Refill') || req.issuedTo.includes('SYSTEM'));
        setApproveReq({ ...req, isAuto });
        setApproveQty(req.quantity ? String(req.quantity) : '');
        setApproveRemarks('');
        setApproveOpen(true);
    };

    const handleConfirmApprove = async (status: 'APPROVED' | 'DECLINED') => {
        if (!approveReq) return;
        if (status === 'APPROVED' && !approveQty) {
            showNotification("Quantity is required for approval.", 'error');
            return;
        }
        try {
            await axios.put(`/api/inventory/transactions/${approveReq.id}/status?status=${status}&quantity=${approveQty || approveReq.quantity}&remarks=${encodeURIComponent(approveRemarks || (status === 'APPROVED' ? "Manager approved." : "Manager declined."))}`);
            setApproveOpen(false);
            fetchInventory();
            showNotification(status === 'APPROVED' ? "Restock Approved and Stock Updated" : "Restock Request Declined", 'success');
        } catch (e: any) {
            showNotification("Action Failed: " + (e.response?.data || e.message), 'error');
        }
    };

    const handleEditClick = (item: any) => {
        setSelectedItem(item);
        setBufferInput(String(item.bufferLevel));
        setMinimumInput(String(item.minimumLevel || 0));
        setEditOpen(true);
    };

    const handleSaveBuffer = async () => {
        if (!selectedItem) return;
        const newBuffer = parseInt(bufferInput) || 0;
        const newMin = parseInt(minimumInput) || 0;

        try {
            // Update Buffer Level
            await axios.put(`/api/inventory/${selectedItem.id}/buffer`, newBuffer, {
                headers: { 'Content-Type': 'application/json' }
            });

            // Update Minimum Level (via updateItem)
            await axios.put(`/api/inventory/${selectedItem.id}`, {
                ...selectedItem,
                minimumLevel: newMin
            });

            setEditOpen(false);
            fetchInventory();
            showNotification("Stock levels updated successfully", 'success');
        } catch (err) {
            console.error(err);
            showNotification("Failed to update stock levels", 'error');
        }
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={isMobile ? 1 : 2} gap={1}>
                <Typography 
                    variant={isMobile ? 'h6' : 'h4'} 
                    fontWeight="bold" 
                    sx={{ color: '#1b5e20', lineHeight: 1.2, flex: 1, fontSize: isMobile ? '1.1rem' : 'inherit' }}
                >
                    General Stock & Inventory Level
                </Typography>
                {isManager && (
                    isMobile ? (
                        <IconButton
                            onClick={() => {
                                // existing snapshot logic
                                const headerRows = `
                                    <tr>
                                        <th style="border: 1px solid #ddd; background: #f4f7f4; padding: 10px; height: 35px; text-align: left; font-family: 'Segoe UI', Arial; font-weight: bold; color: #1b5e20;">Item Name</th>
                                        <th style="border: 1px solid #ddd; background: #f4f7f4; text-align: center; font-family: 'Segoe UI', Arial; font-weight: bold; color: #1b5e20;">Category</th>
                                        <th style="border: 1px solid #ddd; background: #f4f7f4; text-align: center; font-family: 'Segoe UI', Arial; font-weight: bold; color: #1b5e20;">Unit</th>
                                        <th style="border: 1px solid #ddd; background: #f4f7f4; text-align: center; font-family: 'Segoe UI', Arial; font-weight: bold; color: #1b5e20;">Current Qty</th>
                                        <th style="border: 1px solid #ddd; background: #f4f7f4; text-align: center; font-family: 'Segoe UI', Arial; font-weight: bold; color: #1b5e20;">Buffer Level</th>
                                        <th style="border: 1px solid #ddd; background: #f4f7f4; text-align: center; font-family: 'Segoe UI', Arial; font-weight: bold; color: #1b5e20;">Min. Level</th>
                                        <th style="border: 1px solid #ddd; background: #f4f7f4; text-align: center; font-family: 'Segoe UI', Arial; font-weight: bold; color: #1b5e20;">Status</th>
                                    </tr>
                                `;

                                const bodyRows = items.map((i, idx) => {
                                    const rowStyle = idx % 2 === 1 ? 'background: #f9fdf9;' : 'background: #ffffff;';
                                    const cellStyle = `border: 1px solid #eee; text-align: center; font-family: 'Segoe UI', Arial; padding: 6px; font-size: 11px; mso-number-format: "#,##0.00";`;
                                    const leftStyle = cellStyle + ' text-align: left; font-weight: bold;';
                                    const status = i.bufferLevel === 0 ? 'CONFIGURE' : i.currentQuantity < i.bufferLevel ? 'LOW STOCK' : 'GOOD';
                                    const statusColor = status === 'GOOD' ? '#2e7d32' : status === 'CONFIGURE' ? '#0288d1' : '#c62828';

                                    return `
                                        <tr style="${rowStyle}">
                                            <td style="${leftStyle}">${i.name}</td>
                                            <td style="${cellStyle}">${i.category}</td>
                                            <td style="${cellStyle}">${i.unit}</td>
                                            <td style="${cellStyle}">${i.currentQuantity}</td>
                                            <td style="${cellStyle}">${i.bufferLevel}</td>
                                            <td style="${cellStyle}">${i.minimumLevel || 0}</td>
                                            <td style="${cellStyle}; font-weight: bold; color: ${statusColor};">${status}</td>
                                        </tr>
                                    `;
                                }).join('');

                                const tableHtml = `
                                    <html>
                                        <head><meta charset="utf-8"/><style>table { border-collapse: collapse; } th, td { border: 1px solid #ddd; }</style></head>
                                        <body>
                                            <h3 style="font-family: 'Segoe UI', Arial; color: #1b5e20;">Estate Inventory Status Snapshot — ${new Date().toLocaleDateString()}</h3>
                                            <table>
                                                ${headerRows}
                                                ${bodyRows}
                                            </table>
                                        </body>
                                    </html>
                                `;

                                const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
                                const url = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `Estate_General_Stock_Snapshot_${new Date().toISOString().split('T')[0]}.xls`;
                                link.click();
                            }}
                            sx={{ bgcolor: '#2e7d32', color: 'white', '&:hover': { bgcolor: '#1b5e20' } }}
                        >
                            <DownloadIcon />
                        </IconButton>
                    ) : (
                        <Button
                            variant="contained"
                            startIcon={<DownloadIcon />}
                            onClick={() => {
                                // existing snapshot logic
                                const headerRows = `
                                    <tr>
                                        <th style="border: 1px solid #ddd; background: #f4f7f4; padding: 10px; height: 35px; text-align: left; font-family: 'Segoe UI', Arial; font-weight: bold; color: #1b5e20;">Item Name</th>
                                        <th style="border: 1px solid #ddd; background: #f4f7f4; text-align: center; font-family: 'Segoe UI', Arial; font-weight: bold; color: #1b5e20;">Category</th>
                                        <th style="border: 1px solid #ddd; background: #f4f7f4; text-align: center; font-family: 'Segoe UI', Arial; font-weight: bold; color: #1b5e20;">Unit</th>
                                        <th style="border: 1px solid #ddd; background: #f4f7f4; text-align: center; font-family: 'Segoe UI', Arial; font-weight: bold; color: #1b5e20;">Current Qty</th>
                                        <th style="border: 1px solid #ddd; background: #f4f7f4; text-align: center; font-family: 'Segoe UI', Arial; font-weight: bold; color: #1b5e20;">Buffer Level</th>
                                        <th style="border: 1px solid #ddd; background: #f4f7f4; text-align: center; font-family: 'Segoe UI', Arial; font-weight: bold; color: #1b5e20;">Min. Level</th>
                                        <th style="border: 1px solid #ddd; background: #f4f7f4; text-align: center; font-family: 'Segoe UI', Arial; font-weight: bold; color: #1b5e20;">Status</th>
                                    </tr>
                                `;

                                const bodyRows = items.map((i, idx) => {
                                    const rowStyle = idx % 2 === 1 ? 'background: #f9fdf9;' : 'background: #ffffff;';
                                    const cellStyle = `border: 1px solid #eee; text-align: center; font-family: 'Segoe UI', Arial; padding: 6px; font-size: 11px; mso-number-format: "#,##0.00";`;
                                    const leftStyle = cellStyle + ' text-align: left; font-weight: bold;';
                                    const status = i.bufferLevel === 0 ? 'CONFIGURE' : i.currentQuantity < i.bufferLevel ? 'LOW STOCK' : 'GOOD';
                                    const statusColor = status === 'GOOD' ? '#2e7d32' : status === 'CONFIGURE' ? '#0288d1' : '#c62828';

                                    return `
                                        <tr style="${rowStyle}">
                                            <td style="${leftStyle}">${i.name}</td>
                                            <td style="${cellStyle}">${i.category}</td>
                                            <td style="${cellStyle}">${i.unit}</td>
                                            <td style="${cellStyle}">${i.currentQuantity}</td>
                                            <td style="${cellStyle}">${i.bufferLevel}</td>
                                            <td style="${cellStyle}">${i.minimumLevel || 0}</td>
                                            <td style="${cellStyle}; font-weight: bold; color: ${statusColor};">${status}</td>
                                        </tr>
                                    `;
                                }).join('');

                                const tableHtml = `
                                    <html>
                                        <head><meta charset="utf-8"/><style>table { border-collapse: collapse; } th, td { border: 1px solid #ddd; }</style></head>
                                        <body>
                                            <h3 style="font-family: 'Segoe UI', Arial; color: #1b5e20;">Estate Inventory Status Snapshot — ${new Date().toLocaleDateString()}</h3>
                                            <table>
                                                ${headerRows}
                                                ${bodyRows}
                                            </table>
                                        </body>
                                    </html>
                                `;

                                const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
                                const url = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `Estate_General_Stock_Snapshot_${new Date().toISOString().split('T')[0]}.xls`;
                                link.click();
                            }}
                            sx={{ 
                                bgcolor: '#2e7d32', 
                                '&:hover': { bgcolor: '#1b5e20' }
                            }}
                        >
                            Download Snapshot
                        </Button>
                    )
                )}
            </Box>
            <Box mb={isMobile ? 1 : 2} />

            {/* Manager Alert Summary */}
            {isManager && items.some(i => i.bufferLevel === 0) && (
                <Alert 
                    severity="info" 
                    icon={<InfoIcon />} 
                    sx={{ 
                        mb: 2, 
                        borderRadius: 2, 
                        border: '1px solid #b3e5fc',
                        bgcolor: '#e1f5fe'
                    }}
                >
                    <Typography variant="subtitle2" fontWeight="bold">Action Required</Typography>
                    <Typography variant="body2">New items detected. Please configure buffer levels for unconfigured items.</Typography>
                </Alert>
            )}

            {isManager && items.some(i => i.currentQuantity < i.bufferLevel && i.bufferLevel > 0) && (
                <Alert 
                    severity="warning" 
                    sx={{ 
                        mb: 3,
                        borderRadius: 2,
                        border: '1px solid #ffe082',
                        bgcolor: '#fff8e1'
                    }}
                    icon={<WarningIcon fontSize="inherit" />}
                >
                    <Box>
                        <Typography variant="subtitle2" fontWeight="bold">Attention Manager: Inventory Shortfall Detected</Typography>
                        <Typography variant="body2">
                            The following items have dropped below their buffer levels: 
                            <strong> {items.filter(i => i.currentQuantity < i.bufferLevel && i.bufferLevel > 0).map(i => i.name).join(', ')}</strong>. 
                        </Typography>
                    </Box>
                </Alert>
            )}

            {/* Restock Requests Display */}
            {isManager && restockRequests.length > 0 && (
                <Paper elevation={0} sx={{ mb: 4, p: isMobile ? 1.5 : 2, border: '1px solid #ffcc80', bgcolor: '#fffbf0', borderRadius: 3 }}>
                    <Box display="flex" alignItems="center" mb={1.5}>
                        <InfoIcon color="warning" sx={{ mr: 1 }} />
                        <Typography variant="subtitle1" color="warning.dark" fontWeight="bold">
                            Pending Restock Requests
                        </Typography>
                    </Box>
                    <TableContainer sx={{ overflowX: 'auto' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ color: '#888', fontWeight: 600, fontSize: isMobile ? '0.7rem' : '0.75rem' }}>Date</TableCell>
                                    <TableCell sx={{ color: '#888', fontWeight: 600, fontSize: isMobile ? '0.7rem' : '0.75rem' }}>Item</TableCell>
                                    <TableCell sx={{ color: '#888', fontWeight: 600, fontSize: isMobile ? '0.7rem' : '0.75rem' }}>Qty</TableCell>
                                    <TableCell sx={{ color: '#888', fontWeight: 600, fontSize: isMobile ? '0.7rem' : '0.75rem' }}>Note</TableCell>
                                    <TableCell align="center" sx={{ color: '#888', fontWeight: 600, fontSize: isMobile ? '0.7rem' : '0.75rem' }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {restockRequests.map(req => (
                                    <TableRow key={req.id}>
                                        <TableCell sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>{new Date(req.date + (req.date.includes('Z') ? '' : 'Z')).toLocaleDateString()}</TableCell>
                                        <TableCell sx={{ fontWeight: 600, fontSize: isMobile ? '0.75rem' : 'inherit' }}>{req.itemName}</TableCell>
                                        <TableCell sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>{req.quantity || '-'}</TableCell>
                                        <TableCell sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem', opacity: 0.8 }}>{getManagerNoteText(req.issuedTo)}</TableCell>
                                        <TableCell align="center">
                                            <Button
                                                size="small"
                                                variant="contained"
                                                sx={{ 
                                                    textTransform: 'none', 
                                                    bgcolor: '#f57c00', 
                                                    '&:hover': { bgcolor: '#ef6c00' },
                                                    fontSize: '0.7rem'
                                                }}
                                                onClick={() => handleRequestAction(req)}
                                            >
                                                Review
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid #e0e0e0', overflowX: 'auto' }}>
                <Table size={isMobile ? "small" : "medium"}>
                    <TableHead sx={{ bgcolor: '#f1f8e9' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', color: '#1b5e20', fontSize: isMobile ? '0.75rem' : '0.85rem' }}>Item Name</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: '#1b5e20', fontSize: isMobile ? '0.75rem' : '0.85rem' }}>Category</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', color: '#1b5e20', fontSize: isMobile ? '0.75rem' : '0.85rem' }}>Unit</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', color: '#1b5e20', fontSize: isMobile ? '0.75rem' : '0.85rem' }}>Current Qty</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', color: '#1b5e20', fontSize: isMobile ? '0.75rem' : '0.85rem' }}>Buffer</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', color: '#1b5e20', fontSize: isMobile ? '0.75rem' : '0.85rem' }}>Minimum</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', color: '#1b5e20', fontSize: isMobile ? '0.75rem' : '0.85rem' }}>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {items.map((item) => {
                            const isLow = item.currentQuantity < item.bufferLevel;
                            return (
                                <TableRow key={item.id} hover sx={{ bgcolor: isLow ? '#fff4f4' : 'inherit' }}>
                                    <TableCell sx={{ fontWeight: 600, fontSize: isMobile ? '0.75rem' : '0.85rem' }}>{item.name}</TableCell>
                                    <TableCell sx={{ fontSize: isMobile ? '0.75rem' : '0.85rem' }}><Chip label={item.category} size="small" sx={{ fontSize: isMobile ? '0.65rem' : '0.7rem' }} /></TableCell>
                                    <TableCell align="center" sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>{item.unit}</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: isMobile ? '0.75rem' : '0.85rem' }}>{item.currentQuantity}</TableCell>
                                    <TableCell align="center" sx={{ fontSize: isMobile ? '0.75rem' : '0.85rem' }}>
                                        <Box display="flex" alignItems="center" justifyContent="center">
                                            {item.bufferLevel}
                                            {isManager && (
                                                <IconButton size="small" onClick={() => handleEditClick(item)} sx={{ ml: 0.5, color: '#1b5e20' }}>
                                                    <EditIcon sx={{ fontSize: isMobile ? 12 : 14 }} />
                                                </IconButton>
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', color: 'error.main', fontSize: isMobile ? '0.75rem' : '0.85rem' }}>
                                        <Box display="flex" alignItems="center" justifyContent="center">
                                            {item.minimumLevel || 0}
                                            {isManager && (
                                                <IconButton size="small" onClick={() => handleEditClick(item)} sx={{ ml: 0.5, color: 'error.main' }}>
                                                    <EditIcon sx={{ fontSize: isMobile ? 12 : 14 }} />
                                                </IconButton>
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center">
                                        {item.bufferLevel === 0 ? (
                                            <Chip label="Setup" color="info" size="small" variant="outlined" />
                                        ) : item.currentQuantity < item.bufferLevel ? (
                                            <Chip label="Low" color="error" size="small" />
                                        ) : (
                                            <Chip label="Good" color="success" size="small" variant="outlined" />
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {items.length === 0 && !loading && (
                            <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}>No inventory items found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Buffer Edit Dialog */}
            <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
                <DialogTitle>Update Stock Levels</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" mb={2}>
                        Set stock thresholds for <strong>{selectedItem?.name}</strong>.
                    </Typography>
                    <TextField
                        type="number"
                        label="Buffer Level (Reorder Point)"
                        fullWidth
                        margin="normal"
                        value={bufferInput}
                        onChange={(e) => setBufferInput(e.target.value)}
                        helperText="Stock level to trigger restock alerts"
                    />
                    <TextField
                        type="number"
                        label="Minimum Level (Blocking Point)"
                        fullWidth
                        margin="normal"
                        value={minimumInput}
                        onChange={(e) => setMinimumInput(e.target.value)}
                        helperText="Absolute minimum. Issues below this are blocked."
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveBuffer}>Update</Button>
                </DialogActions>
            </Dialog>

            {/* Approval Confirmation Dialog */}
            <Dialog open={approveOpen} onClose={() => setApproveOpen(false)}>
                <DialogTitle>Review Refill Request</DialogTitle>
                <DialogContent sx={{ minWidth: 350, pt: 2 }}>
                    <Typography variant="body1" gutterBottom>
                        Refilling for: <strong>{approveReq?.itemName}</strong>
                    </Typography>
                    {(() => {
                        const item = items.find(i => i.id === approveReq?.itemId);
                        return item ? (
                            <Box sx={{ mb: 2, p: 1, bgcolor: '#f0faff', borderRadius: 1 }}>
                                <Typography variant="caption" display="block">Buffer Level: <strong>{item.bufferLevel} {item.unit}</strong></Typography>
                                <Typography variant="caption" display="block">Current Stock: <strong>{item.currentQuantity} {item.unit}</strong></Typography>
                            </Box>
                        ) : null;
                    })()}



                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                        {approveReq?.isAuto
                            ? "System Auto-Request: Please verify the quantity before adding to stock."
                            : `Requested Amount: ${approveReq?.quantity || '-'} ${items.find(i => i.id === approveReq?.itemId)?.unit || ''}. You can adjust this below.`}
                    </Typography>

                    <TextField
                        autoFocus
                        fullWidth
                        label="Quantity to Refill"
                        type="number"
                        value={approveQty}
                        onChange={(e) => setApproveQty(e.target.value)}
                        variant="outlined"
                        margin="normal"
                        sx={{ mb: 2 }}
                    />

                    <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="Manager Remarks (Optional)"
                        value={approveRemarks}
                        onChange={(e) => setApproveRemarks(e.target.value)}
                        variant="outlined"
                        placeholder="Add reason or notes..."
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <Button onClick={() => setApproveOpen(false)}>Cancel</Button>
                    <Box gap={1} display="flex">
                        <Button
                            variant="contained"
                            color="error"
                            onClick={() => handleConfirmApprove('DECLINED')}
                        >
                            Reject Request
                        </Button>
                        <Button
                            variant="contained"
                            color="success"
                            onClick={() => handleConfirmApprove('APPROVED')}
                        >
                            Final Approve & Refill
                        </Button>
                    </Box>
                </DialogActions>
            </Dialog>

            {/* Notification Snackbar */}
            <Snackbar open={notification.open} autoHideDuration={6000} onClose={handleCloseNotification} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
                    {notification.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
