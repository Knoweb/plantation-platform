import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, Chip, Grid, Paper, IconButton, FormControl, InputLabel, Select, MenuItem, Divider } from '@mui/material';
import { useState, useEffect } from 'react';
import axios from 'axios';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function PendingOrders() {
    const [orders, setOrders] = useState<any[]>([]);
    const [divisionalStock, setDivisionalStock] = useState<any[]>([]);
    const [selectedDivision, setSelectedDivision] = useState<string>('');
    const [divisions, setDivisions] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);

    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    useEffect(() => {
        if (tenantId) {
            fetchInitialData();
            fetchOrders();
        }
    }, [tenantId]);

    const fetchInitialData = async () => {
        try {
            const divRes = await axios.get(`/api/divisions?tenantId=${tenantId}`);
            const itemRes = await axios.get(`/api/inventory?tenantId=${tenantId}`);
            setItems(itemRes.data);
            const myDivisions = userSession.divisionAccess || [];

            let activeDivs = divRes.data;
            if (myDivisions.length > 0) {
                activeDivs = divRes.data.filter((d: any) => myDivisions.includes(d.divisionId));
            }

            setDivisions(activeDivs);
            if (activeDivs.length > 0) {
                setSelectedDivision(activeDivs[0].divisionId);
                fetchDivisionalStock(activeDivs[0].divisionId);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchDivisionalStock = async (divId: string) => {
        try {
            const res = await axios.get(`/api/inventory/divisional?tenantId=${tenantId}&divisionId=${divId}`);
            setDivisionalStock(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchOrders = async () => {
        try {
            const res = await axios.get(`/api/inventory/transactions?tenantId=${tenantId}`);
            // Filter only FO Requisitions that belong to this user's divisions
            const myDivisions = userSession.divisionAccess || [];

            const reqs = res.data.filter((t: any) => {
                if (t.type !== 'FO_REQUISITION') return false;
                if (myDivisions.length > 0 && !myDivisions.includes(t.divisionId)) return false;
                return true;
            });
            setOrders(reqs);
        } catch (error) {
            console.error(error);
        }
    };

    const handleCancelOrder = async (id: number) => {
        if (!window.confirm("Are you sure you want to cancel this request?")) return;
        try {
            await axios.put(`/api/inventory/transactions/${id}/status?status=CANCELLED`);
            fetchOrders();
        } catch (error) {
            console.error("Failed to cancel order", error);
        }
    };

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" color="#1b5e20" mb={4}>
                Request / Pending Orders
            </Typography>

            <Grid container spacing={3}>
                {/* Left Panel: Available in Divisional Stock */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" color="primary" sx={{ mb: 1, fontWeight: 'bold' }}>
                            Divisional Stock
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                            <InputLabel id="division-select-label">Select Division</InputLabel>
                            <Select
                                labelId="division-select-label"
                                value={selectedDivision || ''}
                                label="Select Division"
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedDivision(val);
                                    fetchDivisionalStock(val);
                                }}
                            >
                                {divisions.map((div: any) => (
                                    <MenuItem key={div.divisionId} value={div.divisionId}>
                                        {div.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Item</strong></TableCell>
                                    <TableCell><strong>Unit</strong></TableCell>
                                    <TableCell align="right"><strong>Qty</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {divisionalStock.map((stock, i) => {
                                    const itemUnit = items.find(item => item.id === stock.itemId)?.unit || '-';
                                    return (
                                        <TableRow key={i}>
                                            <TableCell>{stock.itemName}</TableCell>
                                            <TableCell>{itemUnit}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>{stock.quantity}</TableCell>
                                        </TableRow>
                                    );
                                })}
                                {divisionalStock.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} align="center">No stock available</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Paper>
                </Grid>

                {/* Right Panel: Pending Orders Table */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper elevation={2} sx={{ p: 2 }}>
                        <Typography variant="h6" color="primary" gutterBottom>
                            My Orders
                        </Typography>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                                <TableRow>
                                    <TableCell rowSpan={2} sx={{ borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd' }}><strong>Item</strong></TableCell>
                                    <TableCell rowSpan={2} sx={{ borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd' }}><strong>Division</strong></TableCell>
                                    <TableCell rowSpan={2} sx={{ borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd' }}><strong>Unit</strong></TableCell>
                                    <TableCell rowSpan={2} align="center" sx={{ borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd' }}><strong>Qty</strong></TableCell>
                                    <TableCell rowSpan={2} sx={{ borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd' }}><strong>FO Remarks</strong></TableCell>
                                    <TableCell colSpan={2} align="center" sx={{ borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd' }}><strong>Manager</strong></TableCell>
                                    <TableCell rowSpan={2} align="center" sx={{ borderBottom: '1px solid #ddd' }}><strong>Order Cancel</strong></TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell align="center" sx={{ borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd' }}><strong>Approval</strong></TableCell>
                                    <TableCell align="center" sx={{ borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd' }}><strong>Remarks</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {orders.map(order => {
                                    const itemUnit = items.find(item => item.id === order.itemId)?.unit || '-';
                                    const divName = divisions.find(d => d.divisionId === order.divisionId)?.name || '-';
                                    return (
                                        <TableRow key={order.id} sx={{ bgcolor: order.status === 'APPROVED' ? '#e8f5e9' : (order.status === 'DECLINED' ? '#ffebee' : 'inherit') }}>
                                            <TableCell sx={{ borderRight: '1px solid #ddd' }}>{order.itemName}</TableCell>
                                            <TableCell sx={{ borderRight: '1px solid #ddd' }}>{divName}</TableCell>
                                            <TableCell sx={{ borderRight: '1px solid #ddd' }}>{itemUnit}</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold', borderRight: '1px solid #ddd' }}>{order.quantity}</TableCell>
                                            <TableCell sx={{ borderRight: '1px solid #ddd' }}>{order.issuedTo?.split(' - ')[1] || '-'}</TableCell>
                                            <TableCell align="center" sx={{ borderRight: '1px solid #ddd' }}>
                                                {order.status === 'APPROVED' ? (
                                                    <CheckCircleIcon color="success" fontSize="small" titleAccess="Approved by Manager" />
                                                ) : order.status === 'ISSUED' ? (
                                                    <Chip label="Issued" size="small" color="primary" />
                                                ) : order.status === 'DECLINED' ? (
                                                    <Chip label="Declined" size="small" color="error" variant="outlined" />
                                                ) : order.status === 'CANCELLED' ? (
                                                    <Chip label="Cancelled" size="small" color="default" />
                                                ) : (
                                                    <Typography variant="caption" color="text.secondary">Pending</Typography>
                                                )}
                                            </TableCell>
                                            <TableCell align="center" sx={{ borderRight: '1px solid #ddd' }}>
                                                {order.managerRemarks || '-'}
                                            </TableCell>
                                            <TableCell align="center">
                                                {(order.status === 'PENDING' || order.status === 'APPROVED') && (
                                                    <IconButton size="small" color="error" onClick={() => handleCancelOrder(order.id)}>
                                                        <CancelIcon fontSize="small" />
                                                    </IconButton>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {orders.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center">No recent orders</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
