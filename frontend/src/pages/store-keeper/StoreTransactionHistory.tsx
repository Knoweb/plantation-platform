import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, InputAdornment, Chip } from '@mui/material';
import { useState, useEffect } from 'react';
import axios from 'axios';
import SearchIcon from '@mui/icons-material/Search';

interface Transaction {
    id: number;
    itemName: string;
    type: string;
    quantity: number;
    date: string;
    issuedTo?: string;
    status?: string;
}

export default function StoreTransactionHistory() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filtered, setFiltered] = useState<Transaction[]>([]);
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    useEffect(() => {
        fetchTransactions();
    }, [tenantId]);

    useEffect(() => {
        let res = transactions;

        // Search Filter
        if (search) {
            res = res.filter(t => t.itemName.toLowerCase().includes(search.toLowerCase()) ||
                t.issuedTo?.toLowerCase().includes(search.toLowerCase()));
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

        setFiltered(res);
    }, [search, startDate, endDate, transactions]);

    const fetchTransactions = async () => {
        try {
            const res = await axios.get(`http://localhost:8080/api/inventory/transactions?tenantId=${tenantId}`);
            setTransactions(res.data);
            setFiltered(res.data);
        } catch (err) {
            console.error("Failed to fetch transactions");
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'ISSUE': return 'warning';
            case 'RECEIPT': return 'success';
            case 'RESTOCK_REQUEST': return 'info';
            default: return 'default';
        }
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
                    placeholder="Search Item or Receiver..."
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
                            <TableCell><strong>Issued To / Notes</strong></TableCell>
                            <TableCell align="center"><strong>Status</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filtered.length > 0 ? (
                            filtered.map((t) => (
                                <TableRow key={t.id} hover>
                                    <TableCell>{new Date(t.date).toLocaleString()}</TableCell>
                                    <TableCell>{t.itemName}</TableCell>
                                    <TableCell>
                                        <Chip label={t.type} color={getTypeColor(t.type) as any} size="small" />
                                    </TableCell>
                                    <TableCell align="right">{t.quantity}</TableCell>
                                    <TableCell>{t.issuedTo || '-'}</TableCell>
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
