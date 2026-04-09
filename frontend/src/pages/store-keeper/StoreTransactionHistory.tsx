import { 
    Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Paper, TextField, InputAdornment, Chip, useTheme, useMediaQuery, Card, CardContent, 
    Stack, Divider, Grid 
} from '@mui/material';
import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import SearchIcon from '@mui/icons-material/Search';
import HistoryIcon from '@mui/icons-material/History';

interface Transaction {
    id: number;
    itemName: string;
    type: string;
    quantity: number;
    date: string;
    approvedDate?: string;
    issuedTo?: string;
    managerRemarks?: string;
    status?: string;
    divisionName?: string;
    fieldName?: string;
}

const buildSocketUrl = (path: string) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${path}`;
};

export default function StoreTransactionHistory() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    const fetchTransactions = useCallback(async () => {
        try {
            const res = await axios.get(`/api/inventory/transactions?tenantId=${tenantId}`);
            setTransactions(res.data);
        } catch (err) {
            console.error("Failed to fetch transactions", err);
        }
    }, [tenantId]);

    useEffect(() => {
        const loadTransactions = async () => {
            await fetchTransactions();
        };
        void loadTransactions();
    }, [fetchTransactions]);

    useEffect(() => {
        if (!tenantId) return;

        let socket: WebSocket | null = null;
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

        const connect = () => {
            socket = new WebSocket(buildSocketUrl('/ws/inventory'));

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'inventory-updated' && data.tenantId === tenantId) {
                        fetchTransactions();
                    }
                } catch (e) {
                    console.error("Failed to parse transaction socket message", e);
                }
            };

            socket.onclose = () => {
                reconnectTimer = setTimeout(connect, 3000);
            };
        };

        connect();

        return () => {
            if (socket) {
                socket.onclose = null;
                socket.close();
            }
            if (reconnectTimer) clearTimeout(reconnectTimer);
        };
    }, [tenantId, fetchTransactions]);

    const filtered = useMemo(() => {
        let res = transactions;

        if (search) {
            const s = search.toLowerCase();
            res = res.filter(t =>
                t.itemName.toLowerCase().includes(s) ||
                t.issuedTo?.toLowerCase().includes(s) ||
                t.divisionName?.toLowerCase().includes(s) ||
                t.fieldName?.toLowerCase().includes(s)
            );
        }

        if (startDate) {
            res = res.filter(t => new Date(t.date) >= new Date(startDate));
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59);
            res = res.filter(t => new Date(t.date) <= end);
        }

        res = res.filter(t => !(t.type === 'RESTOCK_REQUEST' && t.status === 'PENDING'));

        return [...res];
    }, [search, startDate, endDate, transactions]);

    const getTypeColor = (type: string): "warning" | "success" | "info" | "default" => {
        switch (type) {
            case 'ISSUE':
            case 'FO_REQUISITION': return 'warning';
            case 'RECEIPT': return 'success';
            case 'RESTOCK_REQUEST': return 'info';
            default: return 'default';
        }
    };

    const parseTransactionDate = (dateText?: string) => {
        if (!dateText) return null;
        const base = dateText.includes('T') ? dateText : dateText.replace(' ', 'T');
        const normalized = /Z|[+-]\d{2}:?\d{2}$/.test(base) ? base : `${base}Z`;
        const parsed = new Date(normalized);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const formatTransactionDateTime = (dateText?: string) => {
        const parsed = parseTransactionDate(dateText);
        return parsed ? parsed.toLocaleString() : '-';
    };

    const splitIssuedTo = (issuedTo?: string) => {
        const value = String(issuedTo || '').trim();
        if (!value) return { left: '', right: '' };
        const parts = value.split(' - ');
        return {
            left: parts[0]?.trim() || '',
            right: parts.slice(1).join(' - ').trim(),
        };
    };

    const getRequesterSource = (issuedTo?: string) => {
        const text = String(issuedTo || '').toLowerCase();
        if (!text) return '-';
        if (text.includes('system')) return 'System';
        if (text.includes('(store keeper)')) return 'Store Keeper';
        if (text.includes('(chief clerk)')) return 'Chief Clerk';

        const { left } = splitIssuedTo(issuedTo);
        return left || issuedTo || '-';
    };

    const getRequesterRemarks = (t: Transaction) => {
        if (t.type === 'RESTOCK_REQUEST') {
            const { right } = splitIssuedTo(t.issuedTo);
            const source = getRequesterSource(t.issuedTo);
            return right ? `Requested by ${source} - ${right}` : `Requested by ${source}`;
        }

        if (t.type === 'FO_REQUISITION') {
            const { right } = splitIssuedTo(t.issuedTo);
            return right || '-';
        }

        return '-';
    };

    return (
        <Box sx={{ p: { xs: 1, sm: 2 } }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <HistoryIcon fontSize="large" />
                    Recent Transactions
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    View and filter recent stock movements, issuances, and restock requests.
                </Typography>
            </Box>

            {/* Advanced Filter Bar */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, border: '1px solid #e0e0e0', bgcolor: '#fcfcfc' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, lg: 6 }}>
                        <TextField
                            fullWidth
                            placeholder="Search by Item, Division, Field..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
                            }}
                            size="small"
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                        <TextField
                            label="Start Date"
                            type="date"
                            fullWidth
                            size="small"
                            InputLabelProps={{ shrink: true }}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                        <TextField
                            label="End Date"
                            type="date"
                            fullWidth
                            size="small"
                            InputLabelProps={{ shrink: true }}
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </Grid>
                </Grid>
            </Paper>

            {isMobile ? (
                /* Mobile Card View */
                <Stack spacing={2}>
                    {filtered.length > 0 ? (
                        filtered.map((t) => (
                            <Card key={t.id} elevation={1} sx={{ borderRadius: 2, border: '1px solid #f0f0f0' }}>
                                <CardContent sx={{ p: 2 }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight="bold">
                                                {t.itemName}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {formatTransactionDateTime(t.approvedDate || t.date)}
                                            </Typography>
                                        </Box>
                                        <Chip
                                            label={
                                                t.type === 'FO_REQUISITION' ? 'FIELD ISSUANCE' :
                                                    t.type === 'RESTOCK_REQUEST' ? 'RESTOCK' :
                                                        t.type.replace(/_/g, ' ')
                                            }
                                            color={getTypeColor(t.type)}
                                            size="small"
                                            sx={{ fontWeight: 'bold' }}
                                        />
                                    </Box>
                                    
                                    <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />
                                    
                                    <Grid container spacing={1}>
                                        <Grid size={6}>
                                            <Typography variant="caption" color="text.secondary" display="block">Quantity</Typography>
                                            <Typography variant="body2" fontWeight="medium">{t.quantity}</Typography>
                                        </Grid>
                                        <Grid size={6}>
                                            <Typography variant="caption" color="text.secondary" display="block">Division/Field</Typography>
                                            <Typography variant="body2">{t.divisionName || '-'}{t.fieldName ? ` / ${t.fieldName}` : ''}</Typography>
                                        </Grid>
                                        <Grid size={6}>
                                            <Typography variant="caption" color="text.secondary" display="block">Requested By</Typography>
                                            <Typography variant="body2" noWrap>
                                                {t.type === 'FO_REQUISITION'
                                                    ? (splitIssuedTo(t.issuedTo).left || '-')
                                                    : t.type === 'RESTOCK_REQUEST'
                                                        ? getRequesterSource(t.issuedTo)
                                                        : (t.issuedTo || '-')}
                                            </Typography>
                                        </Grid>
                                        <Grid size={6}>
                                            <Typography variant="caption" color="text.secondary" display="block">Status</Typography>
                                            <Chip 
                                                label={t.status || (t.type === 'RESTOCK_REQUEST' ? 'PENDING' : 'COMPLETED')} 
                                                color={t.status === 'APPROVED' ? 'success' : t.status === 'DECLINED' ? 'error' : (t.status === 'PENDING' || t.type === 'RESTOCK_REQUEST' ? 'warning' : 'default')} 
                                                size="small" 
                                                variant="outlined"
                                                sx={{ height: 20, fontSize: '0.65rem' }}
                                            />
                                        </Grid>
                                    </Grid>
                                    
                                    {(t.managerRemarks || getRequesterRemarks(t) !== '-') && (
                                        <Box mt={1.5} sx={{ pt: 1, borderTop: '1px solid #eee' }}>
                                            {getRequesterRemarks(t) !== '-' && (
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    <strong>Requester:</strong> {getRequesterRemarks(t)}
                                                </Typography>
                                            )}
                                            {t.managerRemarks && (
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    <strong>Manager:</strong> {t.managerRemarks}
                                                </Typography>
                                            )}
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <Box textAlign="center" py={4} color="text.secondary">No transactions found.</Box>
                    )}
                </Stack>
            ) : (
                /* Desktop Table View */
                <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid #e0e0e0' }}>
                    <Table>
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                            <TableRow>
                                <TableCell><strong>Date</strong></TableCell>
                                <TableCell><strong>Item</strong></TableCell>
                                <TableCell><strong>Type</strong></TableCell>
                                <TableCell align="right"><strong>Quantity</strong></TableCell>
                                <TableCell><strong>Division</strong></TableCell>
                                <TableCell><strong>Field</strong></TableCell>
                                <TableCell><strong>Requested By</strong></TableCell>
                                <TableCell><strong>Requester Remarks</strong></TableCell>
                                <TableCell><strong>Manager Remarks</strong></TableCell>
                                <TableCell align="center"><strong>Status</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filtered.length > 0 ? (
                                filtered.map((t) => (
                                    <TableRow key={t.id} hover>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                            {formatTransactionDateTime(t.approvedDate || t.date)}
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 'medium' }}>{t.itemName}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={
                                                    t.type === 'FO_REQUISITION' ? 'FIELD ISSUANCE' :
                                                        t.type === 'RESTOCK_REQUEST' ? 'Restock Request' :
                                                            t.type.replace(/_/g, ' ')
                                                }
                                                color={getTypeColor(t.type)}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell align="right">{t.quantity}</TableCell>
                                        <TableCell>{t.divisionName || '-'}</TableCell>
                                        <TableCell>{t.fieldName || '-'}</TableCell>
                                        <TableCell>
                                            {t.type === 'FO_REQUISITION'
                                                ? (splitIssuedTo(t.issuedTo).left || '-')
                                                : t.type === 'RESTOCK_REQUEST'
                                                    ? getRequesterSource(t.issuedTo)
                                                    : (t.issuedTo || '-')}
                                        </TableCell>
                                        <TableCell>
                                            {getRequesterRemarks(t)}
                                        </TableCell>
                                        <TableCell>{t.managerRemarks || '-'}</TableCell>
                                        <TableCell align="center">
                                            {t.status ? (
                                                <Chip label={t.status} color={t.status === 'APPROVED' ? 'success' : t.status === 'DECLINED' ? 'error' : 'warning'} size="small" variant="outlined" />
                                            ) : (
                                                t.type === 'RESTOCK_REQUEST' ? <Chip label="PENDING" color="warning" size="small" variant="outlined" /> : <Chip label="COMPLETED" size="small" variant="outlined" />
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={10} align="center" sx={{ py: 4 }}>No transactions found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
}

