import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, Chip, Grid, Paper, IconButton, FormControl, Select, MenuItem } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useLanguage } from '../../../context/LanguageContext';

interface DivisionalStock {
    itemId: string;
    itemName: string;
    quantity: number;
}

interface Order {
    id: number;
    itemName: string;
    divisionId: string;
    itemId: string;
    quantity: number;
    status: string;
    managerRemarks?: string;
    issuedTo?: string;
    type: string;
}

interface Division {
    divisionId: string;
    name: string;
}

interface InventoryItem {
    id: string;
    name: string;
    unit: string;
}

export default function PendingOrders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [divisionalStock, setDivisionalStock] = useState<DivisionalStock[]>([]);
    const [selectedDivision, setSelectedDivision] = useState<string>('');
    const [divisions, setDivisions] = useState<Division[]>([]);
    const [items, setItems] = useState<InventoryItem[]>([]);
    const { t } = useLanguage();

    const { tenantId, divisionAccess } = useMemo(() => {
        const session = JSON.parse(sessionStorage.getItem('user') || '{}');
        return { 
            tenantId: session.tenantId, 
            divisionAccess: session.divisionAccess || [] 
        };
    }, []);

    const fetchDivisionalStock = useCallback(async (divId: string) => {
        if (!tenantId || !divId) return;
        try {
            const res = await axios.get(`/api/inventory/divisional?tenantId=${tenantId}&divisionId=${divId}`);
            setDivisionalStock(res.data);
        } catch (error) {
            console.error(error);
        }
    }, [tenantId]);

    const fetchInitialData = useCallback(async () => {
        if (!tenantId) return;
        try {
            const [divRes, itemRes] = await Promise.all([
                axios.get(`/api/divisions?tenantId=${tenantId}`),
                axios.get(`/api/inventory?tenantId=${tenantId}`)
            ]);
            
            setItems(itemRes.data);

            let activeDivs: Division[] = divRes.data;
            if (divisionAccess.length > 0) {
                activeDivs = divRes.data.filter((d: Division) => divisionAccess.includes(d.divisionId));
            }

            setDivisions(activeDivs);
            
            // Only set a default if we don't already have a selection
            if (activeDivs.length > 0 && !selectedDivision) {
                setSelectedDivision(activeDivs[0].divisionId);
                fetchDivisionalStock(activeDivs[0].divisionId);
            }
        } catch (error) {
            console.error(error);
        }
    }, [tenantId, divisionAccess, fetchDivisionalStock, selectedDivision]);

    const fetchOrders = useCallback(async () => {
        if (!tenantId) return;
        try {
            const res = await axios.get(`/api/inventory/transactions?tenantId=${tenantId}`);
            const reqs = res.data.filter((t: Order) => {
                if (t.type !== 'FO_REQUISITION') return false;
                if (divisionAccess.length > 0 && !divisionAccess.includes(t.divisionId)) return false;
                return true;
            });
            setOrders(reqs);
        } catch (error) {
            console.error(error);
        }
    }, [tenantId, divisionAccess]);

    useEffect(() => {
        fetchInitialData();
        fetchOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tenantId]);

    const handleCancelOrder = async (id: number) => {
        if (!window.confirm("Are you sure you want to cancel this request?")) return;
        try {
            await axios.put(`/api/inventory/transactions/${id}/status?status=CANCELLED`);
            fetchOrders();
        } catch (error) {
            console.error("Failed to cancel order", error);
        }
    };

    const handleDivisionChange = (e: SelectChangeEvent<string>) => {
        const val = e.target.value;
        setSelectedDivision(val);
        fetchDivisionalStock(val);
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4" fontWeight="bold" sx={{ color: '#1b5e20' }}>
                    {t('Orders & Requisitions')}
                </Typography>
            </Box>

            <Grid container spacing={2}>
                {/* Left Panel: Available in Divisional Stock (Narrower) */}
                <Grid size={{ xs: 12, md: 3 }}>
                    <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #e0e0e0', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ bgcolor: '#455a64', color: 'white', py: 1, px: 1.5, fontWeight: 'bold', fontSize: '0.85rem' }}>
                            {t('Divisional Stock')}
                        </Box>
                        <Box sx={{ p: 1.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                                <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 'bold', color: 'text.secondary', fontSize: '0.7rem' }}>{t('Filter by Division')}</Typography>
                                <Select
                                    value={selectedDivision || ''}
                                    onChange={handleDivisionChange}
                                    sx={{ borderRadius: 1.5, fontSize: '0.85rem' }}
                                >
                                    {divisions.map((div: Division) => (
                                        <MenuItem key={div.divisionId} value={div.divisionId} sx={{ fontSize: '0.85rem' }}>
                                            {div.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <Box sx={{ flex: 1, overflow: 'auto' }}>
                                <Table size="small" stickyHeader sx={{ 
                                    borderCollapse: 'collapse',
                                    '& td, & th': { border: '1px solid #e0e0e0' }
                                }}>
                                    <TableHead>
                                        <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f1f5f9', py: 1, fontSize: '0.75rem', color: '#334155' }}>{t('Item')}</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f1f5f9', py: 1, fontSize: '0.75rem', color: '#334155' }}>{t('Unit')}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: '#f1f5f9', py: 1, fontSize: '0.75rem', color: '#334155' }}>{t('Quantity')}</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {divisionalStock.map((stock, i) => {
                                            const itemUnit = items.find(item => item.id === stock.itemId)?.unit || '-';
                                            return (
                                                <TableRow key={i} hover>
                                                    <TableCell sx={{ py: 0.75, fontSize: '0.8rem' }}>{stock.itemName}</TableCell>
                                                    <TableCell sx={{ py: 0.75, fontSize: '0.75rem', color: 'text.secondary' }}>{itemUnit}</TableCell>
                                                    <TableCell align="right" sx={{ py: 0.75, fontWeight: 'bold', color: 'primary.main', fontSize: '0.8rem' }}>{stock.quantity}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {divisionalStock.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary', fontSize: '0.8rem' }}>No stock</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </Box>
                        </Box>
                    </Paper>
                </Grid>

                {/* Right Panel: Pending Orders Table (Wider) */}
                <Grid size={{ xs: 12, md: 9 }}>
                    <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
                        <Box sx={{ bgcolor: '#2e7d32', color: 'white', py: 1, px: 2, fontWeight: 'bold', fontSize: '0.85rem' }}>
                            {t('My Order History')}
                        </Box>
                        <Box sx={{ overflowX: 'auto' }}>
                            <Table size="small" sx={{ 
                                minWidth: 800, 
                                borderCollapse: 'collapse',
                                '& td, & th': { border: '1px solid #e0e0e0' }
                            }}>
                                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                                    <TableRow>
                                        <TableCell rowSpan={2} sx={{ fontWeight: 'bold', py: 1.5, fontSize: '0.75rem', color: '#334155' }}>Item</TableCell>
                                        <TableCell rowSpan={2} sx={{ fontWeight: 'bold', fontSize: '0.75rem', color: '#334155' }}>Division</TableCell>
                                        <TableCell rowSpan={2} sx={{ fontWeight: 'bold', fontSize: '0.75rem', width: 60, color: '#334155' }}>Unit</TableCell>
                                        <TableCell rowSpan={2} align="center" sx={{ fontWeight: 'bold', fontSize: '0.75rem', width: 50, color: '#334155' }}>Qty</TableCell>
                                        <TableCell rowSpan={2} sx={{ fontWeight: 'bold', fontSize: '0.75rem', color: '#334155' }}>FO Remarks</TableCell>
                                        <TableCell colSpan={2} align="center" sx={{ fontWeight: 'bold', fontSize: '0.75rem', py: 0.5, color: '#334155' }}>Manager Review</TableCell>
                                        <TableCell rowSpan={2} align="center" sx={{ fontWeight: 'bold', fontSize: '0.75rem', width: 70, color: '#334155' }}>Actions</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.7rem', color: 'text.secondary', py: 0.5 }}>Status</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.7rem', color: 'text.secondary', py: 0.5 }}>Manager Notes</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {orders.map(order => {
                                        const itemUnit = items.find(item => item.id === order.itemId)?.unit || '-';
                                        const divName = divisions.find(d => d.divisionId === order.divisionId)?.name || '-';
                                        
                                        let statusChip;
                                        switch (order.status) {
                                            case 'APPROVED':
                                                statusChip = <Chip icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />} label={t('Approved')} size="small" sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 'bold', height: 20, fontSize: '0.65rem' }} />;
                                                break;
                                            case 'ISSUED':
                                                statusChip = <Chip label={t('Issued')} size="small" color="primary" sx={{ fontWeight: 'bold', height: 20, fontSize: '0.65rem' }} />;
                                                break;
                                            case 'DECLINED':
                                                statusChip = <Chip label={t('Declined')} size="small" color="error" variant="outlined" sx={{ fontWeight: 'bold', height: 20, fontSize: '0.65rem' }} />;
                                                break;
                                            case 'CANCELLED':
                                                statusChip = <Chip label={t('Cancelled')} size="small" variant="outlined" sx={{ fontWeight: 'bold', height: 20, fontSize: '0.65rem' }} />;
                                                break;
                                            default:
                                                statusChip = <Chip label={t('Pending')} size="small" sx={{ fontWeight: 'bold', bgcolor: '#fff3e0', color: '#ef6c00', height: 20, fontSize: '0.65rem' }} />;
                                        }

                                        return (
                                            <TableRow key={order.id} hover>
                                                <TableCell sx={{ fontWeight: 500, fontSize: '0.8rem' }}>{order.itemName}</TableCell>
                                                <TableCell sx={{ fontSize: '0.8rem' }}>{divName}</TableCell>
                                                <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{itemUnit}</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>{order.quantity}</TableCell>
                                                <TableCell sx={{ maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.8rem' }}>
                                                    {order.issuedTo?.split(' - ')[1] || '-'}
                                                </TableCell>
                                                <TableCell align="center">
                                                    {statusChip}
                                                </TableCell>
                                                <TableCell align="center" sx={{ maxWidth: 150, fontStyle: 'italic', fontSize: '0.75rem', color: 'text.secondary' }}>
                                                    {order.managerRemarks || '-'}
                                                </TableCell>
                                                <TableCell align="center">
                                                    {(order.status === 'PENDING' || order.status === 'APPROVED') && (
                                                        <IconButton 
                                                            size="small" 
                                                            sx={{ color: '#d32f2f', p: 0.5, '&:hover': { bgcolor: '#ffebee' } }} 
                                                            onClick={() => handleCancelOrder(order.id)}
                                                        >
                                                            <CancelIcon sx={{ fontSize: 18 }} />
                                                        </IconButton>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {orders.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary', fontSize: '0.8rem' }}>No recent orders found</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
