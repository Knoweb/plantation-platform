import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, InputAdornment, Chip } from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import SearchIcon from '@mui/icons-material/Search';

interface Transaction {
    id: number;
    itemName: string;
    type: string;
    quantity: number;
    date: string;
    approvedDate?: string; // Add approvedDate
    issuedTo?: string;
    managerRemarks?: string; // We map this to "Approver Remarks" in UI
    status?: string;
    divisionName?: string;
    fieldName?: string;
}

const buildSocketUrl = (path: string) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${path}`;
};

export default function StoreTransactionHistory() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filtered, setFiltered] = useState<Transaction[]>([]);
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    const fetchTransactions = useCallback(async () => {
        try {
            const res = await axios.get(`/api/inventory/transactions?tenantId=${tenantId}`);
            setTransactions(res.data);
            setFiltered(res.data);
        } catch (err) {
            console.error("Failed to fetch transactions");
        }
    }, [tenantId]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    // WebSocket for Real-time Transaction History Updates
    useEffect(() => {
        if (!tenantId) return;

        let socket: WebSocket | null = null;
        let reconnectTimer: any = null;

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
    }, [tenantId]);

    useEffect(() => {
        let res = transactions;

        // Search Filter
        if (search) {
            const s = search.toLowerCase();
            res = res.filter(t =>
                t.itemName.toLowerCase().includes(s) ||
                t.issuedTo?.toLowerCase().includes(s) ||
                t.divisionName?.toLowerCase().includes(s) ||
                t.fieldName?.toLowerCase().includes(s)
            );
        }

        // Date Filter
        if (startDate) {
            res = res.filter(t => new Date(t.date) >= new Date(startDate));
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59); // End of day
            res = res.filter(t => new Date(t.date) <= end);
        }

        // Filter out PENDING requests (Only show history of completed actions)
        res = res.filter(t => !(t.type === 'RESTOCK_REQUEST' && t.status === 'PENDING'));

        setFiltered(res);
    }, [search, startDate, endDate, transactions]);

    const getTypeColor = (type: string) => {
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
        // Backend often serializes LocalDateTime without zone; in production it is UTC.
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
        <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                Recent Transactions
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={4}>
                View recent stock movements and requests.
            </Typography>

            {/* Filters */}
            <Box display="flex" gap={2} mb={3} flexWrap="wrap">
                <TextField
                    placeholder="Search Item, Division, Field..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                    }}
                    sx={{ width: 300, bgcolor: 'white' }}
                />
                <TextField
                    label="Start Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    sx={{ bgcolor: 'white' }}
                />
                <TextField
                    label="End Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    sx={{ bgcolor: 'white' }}
                />
            </Box>

            {/* Table */}
            <TableContainer component={Paper} elevation={2}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
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
                                    <TableCell>
                                        {t.approvedDate ? (
                                            <span title={`Requested: ${formatTransactionDateTime(t.date)}`}>
                                                {formatTransactionDateTime(t.approvedDate)}
                                            </span>
                                        ) : (
                                            formatTransactionDateTime(t.date)
                                        )}
                                    </TableCell>
                                    <TableCell>{t.itemName}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={
                                                t.type === 'FO_REQUISITION' ? 'FIELD ISSUANCE' :
                                                    t.type === 'RESTOCK_REQUEST' ? 'Restock Request' :
                                                        t.type.replace(/_/g, ' ')
                                            }
                                            color={getTypeColor(t.type) as any}
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
                                <TableCell colSpan={5} align="center">No transactions found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
