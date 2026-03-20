import { Box, Typography, Card, Table, TableHead, TableRow, TableCell, TableBody, Button, CircularProgress, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Snackbar, Alert, IconButton, Chip, Avatar, Autocomplete, Checkbox } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import ManIcon from '@mui/icons-material/Man';
import WomanIcon from '@mui/icons-material/Woman';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function MusterReviewManager() {
    const [pendingItems, setPendingItems] = useState<any[]>([]);
    const [allMusterRecords, setAllMusterRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewStatus, setViewStatus] = useState<'PENDING' | 'HISTORY'>('PENDING');
    const [workerMap, setWorkerMap] = useState<Map<string, any>>(new Map());

    // Review Item State
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [localDetails, setLocalDetails] = useState<any[]>([]);
    const [remarks, setRemarks] = useState('');
    const [editingIdx, setEditingIdx] = useState<number | null>(null);

    useEffect(() => {
        if (selectedItem) {
            try {
                setLocalDetails(JSON.parse(selectedItem.detailsRaw));
            } catch (e) {
                setLocalDetails([]);
            }
            setRemarks(selectedItem.remarks || '');
            setEditingIdx(null);
        } else {
            setLocalDetails([]);
            setRemarks('');
            setEditingIdx(null);
        }
    }, [selectedItem]);

    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    const [notification, setNotification] = useState<{ open: boolean, message: string, severity: 'success' | 'error' | 'warning' | 'info' } | null>(null);

    useEffect(() => {
        if (tenantId) fetchPending();
    }, [tenantId, viewStatus]);

    const fetchPending = async () => {
        setLoading(true);
        try {
            const [workRes, divRes, workerRes] = await Promise.all([
                axios.get(`/api/operations/daily-work?tenantId=${tenantId}`), // Fetch ALL to track global assignments
                axios.get(`/api/divisions?tenantId=${tenantId}`),
                axios.get(`/api/workers?tenantId=${tenantId}`)
            ]);

            const divMap = new Map(divRes.data.map((d: any) => [d.divisionId, d.name]));

            // Build Worker Map
            const wMap = new Map<string, any>();
            workerRes.data.forEach((w: any) => {
                wMap.set(w.id, w);
                if (w.workerId) wMap.set(w.workerId, w);
            });
            setWorkerMap(wMap);

            // Filter ONLY 'Morning Muster' (and potentially 'Evening Muster' if backend supports status)
            // Filter Logic:
            // If PENDING view, backend returns PENDING (if endpoint supports it or we filter here).
            // If HISTORY view, backend returns ALL (if status!=PENDING param).
            // So we need to filter "non-Pending" for History view.

            const mappedAll = workRes.data.map((item: any) => ({
                id: item.workId,
                displayId: item.workId.substring(0, 8),
                type: item.workType,
                detailsRaw: item.details,
                date: item.workDate,
                createdAt: item.createdAt,
                actionAt: item.actionAt,
                quantity: item.workerCount,
                divisionName: divMap.get(item.divisionId) || 'Unknown Division',
                status: item.status,
                remarks: item.remarks
            }));
            setAllMusterRecords(mappedAll);

            const musters = mappedAll
                .filter((item: any) => {
                    // Filter Morning/Evening Muster
                    const isMuster = item.type === 'Morning Muster' || item.type === 'Evening Muster';
                    if (!isMuster) return false;

                    // Filter based on View Status
                    if (viewStatus === 'PENDING') {
                        return item.status === 'PENDING' || !item.status; // Default to pending if null
                    } else {
                        // History: Show Approved or Rejected
                        return item.status === 'APPROVED' || item.status === 'REJECTED';
                    }
                })
                .sort((a: any, b: any) => {
                    if (viewStatus === 'HISTORY') {
                        const timeA = new Date(a.actionAt || a.date).getTime();
                        const timeB = new Date(b.actionAt || b.date).getTime();
                        return timeB - timeA; // Newest first
                    } else {
                        const timeA = new Date(a.createdAt || a.date).getTime();
                        const timeB = new Date(b.createdAt || b.date).getTime();
                        return timeB - timeA; // Newest first
                    }
                });

            setPendingItems(musters);
        } catch (e) {
            console.error("Failed to fetch", e);
        }
        setLoading(false);
    };

    const handleApprove = async () => {
        if (!selectedItem) return;
        try {
            const currentQuantity = localDetails.reduce((sum, d) => sum + (d.assigned ? d.assigned.length : 0), 0);
            await axios.put(`/api/operations/daily-work/${selectedItem.id}/approve`, {
                details: JSON.stringify(localDetails),
                workerCount: currentQuantity,
                remarks: remarks
            });
            setNotification({ open: true, message: "Muster Approved Successfully", severity: 'success' });
            setSelectedItem(null);
            fetchPending();
        } catch (e) {
            setNotification({ open: true, message: "Failed to Approve", severity: 'error' });
        }
    };

    const handleReject = async () => {
        if (!selectedItem || (isEditMode && !window.confirm("Reject this muster?")) || (!isEditMode && !window.confirm("Delete this record permanently?"))) return;
        try {
            if (isEditMode) {
                await axios.put(`/api/operations/daily-work/${selectedItem.id}/reject`, {
                    remarks: remarks
                });
                setNotification({ open: true, message: "Muster Rejected", severity: 'warning' });
            } else {
                await axios.delete(`/api/operations/daily-work/${selectedItem.id}`);
                setNotification({ open: true, message: "Record Deleted", severity: 'success' });
            }
            setSelectedItem(null);
            fetchPending();
        } catch (e) {
            setNotification({ open: true, message: "Failed to Process", severity: 'error' });
        }
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" mb={3}>Muster Review</Typography>

            <Box display="flex" gap={2} mb={3}>
                <Button variant={viewStatus === 'PENDING' ? "contained" : "outlined"} onClick={() => setViewStatus('PENDING')}>Pending</Button>
                <Button variant={viewStatus === 'HISTORY' ? "contained" : "outlined"} onClick={() => setViewStatus('HISTORY')}>History</Button>
            </Box>

            {loading ? <CircularProgress /> : (
                <Card>
                    <Table>
                        <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Division</TableCell>
                                <TableCell>Date & Time</TableCell>
                                <TableCell align="center">Status</TableCell>
                                <TableCell align="right">Workers</TableCell>
                                <TableCell align="center">Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {pendingItems.length === 0 ? (
                                <TableRow><TableCell colSpan={6} align="center">No records found.</TableCell></TableRow>
                            ) : (
                                pendingItems.map((row) => (
                                    <TableRow key={row.id} hover>
                                        <TableCell>{row.displayId}</TableCell>
                                        <TableCell><Chip label={row.type} size="small" color="primary" variant="outlined" /></TableCell>
                                        <TableCell>{row.divisionName}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{row.date}</Typography>
                                            {/* Show Action Time if available (History), else Submission Time (Pending) */}
                                            {row.actionAt ? (
                                                <Typography variant="caption" color="primary" fontWeight="bold">
                                                    {row.status === 'APPROVED' ? 'Approved' : 'Rejected'}: {new Date(row.actionAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </Typography>
                                            ) : (
                                                row.createdAt && <Typography variant="caption" color="text.secondary">
                                                    Submitted: {new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={row.status || 'PENDING'}
                                                size="small"
                                                color={row.status === 'APPROVED' ? 'success' : row.status === 'REJECTED' ? 'error' : 'warning'}
                                                variant={row.status === 'PENDING' ? 'outlined' : 'filled'}
                                            />
                                        </TableCell>
                                        <TableCell align="right">{row.quantity}</TableCell>
                                        <TableCell align="center">
                                            <Button
                                                variant="contained"
                                                size="small"
                                                color="success"
                                                startIcon={<VisibilityIcon />}
                                                onClick={() => { setSelectedItem(row); setIsEditMode(viewStatus === 'PENDING'); }}
                                            >
                                                Review
                                            </Button>
                                            {viewStatus === 'HISTORY' && (
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    color="primary"
                                                    startIcon={<EditIcon />}
                                                    onClick={() => { setSelectedItem(row); setIsEditMode(true); }}
                                                    sx={{ ml: 1 }}
                                                >
                                                    Edit
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Card>
            )}

            {/* Review Dialog */}
            {(() => {
                const getFilteredWorkersForEdit = () => {
                    if (!selectedItem) return [];
                    const musterDate = selectedItem.date;
                    return Array.from(workerMap.values()).filter(w => {
                        if (w.status !== 'ACTIVE') return false;

                        if (w.employmentType === 'CONTRACT') {
                            return w.registeredDate === musterDate;
                        }

                        if (w.employmentType === 'CONTRACT_MEMBER') {
                            return false;
                        }

                        return true;
                    }).filter((v, i, a) => a.findIndex(t => t.id === v.id) === i).sort((a, b) => {
                        const typeOrders: Record<string, number> = { 'PERMANENT': 1, 'CASUAL': 2, 'CONTRACT': 3 };
                        const orderA = typeOrders[a.employmentType || ''] || 4;
                        const orderB = typeOrders[b.employmentType || ''] || 4;
                        if (orderA !== orderB) return orderA - orderB;
                        const nameA = a.name || a.workerName || '';
                        const nameB = b.name || b.workerName || '';
                        return nameA.localeCompare(nameB);
                    });
                };

                const getUnavailableWorkerIds = () => {
                    if (!selectedItem) return { globalUnavailableSet: new Set<string>(), morningWorkersSet: new Set<string>(), isEveningEditing: false };
                    const unavailable = new Set<string>();
                    const morningWorkers = new Set<string>();
                    const isEveningEditing = selectedItem.type === 'Evening Muster';

                    // Check against ALL musters for the day, not just the pending ones
                    allMusterRecords.forEach(item => {
                        // Only consider musters for the same date that are NOT rejected
                        if (item.date === selectedItem.date && item.status !== 'REJECTED') {
                            const isMorning = item.type === 'Morning Muster';
                            const isEvening = item.type === 'Evening Muster';
                            try {
                                const details = JSON.parse(item.detailsRaw);
                                details.forEach((dItem: any) => {
                                    if (dItem.assigned) {
                                        dItem.assigned.forEach((w: any) => {
                                            const wId = w.id || w.workerId;
                                            if (isMorning) morningWorkers.add(wId);

                                            // Block rules
                                            if (!isEveningEditing && isMorning && item.id !== selectedItem.id) {
                                                unavailable.add(wId); // Editing morning, block if in another morning
                                            }
                                            if (isEveningEditing && isEvening && item.id !== selectedItem.id) {
                                                unavailable.add(wId); // Editing evening, block if in another evening
                                            }
                                        });
                                    }
                                });
                            } catch (e) { }
                        }
                    });
                    return { globalUnavailableSet: unavailable, morningWorkersSet: morningWorkers, isEveningEditing };
                };

                const { globalUnavailableSet, morningWorkersSet, isEveningEditing } = getUnavailableWorkerIds();

                return (
                    <Dialog open={Boolean(selectedItem)} onClose={() => setSelectedItem(null)} maxWidth="lg" fullWidth>
                        <DialogTitle sx={{ bgcolor: '#e8f5e9', display: 'flex', justifyContent: 'space-between' }}>
                            <Typography component="div" variant="h6">Review Muster: {selectedItem?.divisionName} ({selectedItem?.date})</Typography>
                            <Chip label={viewStatus} color={viewStatus === 'HISTORY' ? 'success' : 'warning'} />
                        </DialogTitle>
                        <DialogContent sx={{ bgcolor: '#f1f8e9', p: 3 }}>
                            {selectedItem && (
                                <Box display="flex" gap={3} flexDirection={{ xs: 'column', md: 'row' }} mt={1} sx={{ height: '60vh' }}>
                                    {/* Left Pane: Muster Chit */}
                                    <Box flex={1} display="flex" flexDirection="column">
                                        <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32', fontWeight: 'bold' }}>Muster Chit</Typography>
                                        <Card variant="outlined" sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: '#ffffff', borderRadius: 2 }}>
                                            {localDetails.length === 0 ? (
                                                <Typography color="text.secondary" align="center">No details available.</Typography>
                                            ) : (
                                                localDetails.map((d: any, idx: number) => {
                                                    const wCount = d.assigned?.length || 0;
                                                    return (
                                                        <Box key={idx} mb={1.5} display="flex" justifyContent="space-between" borderBottom="1px dashed #e0e0e0" pb={1}>
                                                            <Box flex={1}>
                                                                <Typography variant="caption" color="text.secondary" display="block">Work item</Typography>
                                                                <Typography variant="body2" fontWeight="600" color="#424242">{d.task}</Typography>
                                                            </Box>
                                                            <Box flex={1}>
                                                                <Typography variant="caption" color="text.secondary" display="block">Field No</Typography>
                                                                <Typography variant="body2" color="#424242">{d.field}</Typography>
                                                            </Box>
                                                            <Box flex={0.5} textAlign="right">
                                                                <Typography variant="caption" color="text.secondary" display="block">Workers</Typography>
                                                                <Typography variant="body2" fontWeight="600" color="#2e7d32">{wCount}</Typography>
                                                            </Box>
                                                        </Box>
                                                    );
                                                })
                                            )}
                                            <Box mt={2} pt={2} borderTop="2px solid #edeff1" display="flex" justifyContent="space-between" bgcolor="#f9fbe7" p={1} borderRadius={1}>
                                                <Typography fontWeight="bold" color="#2e7d32">Total Workers</Typography>
                                                <Typography fontWeight="bold" color="#2e7d32">
                                                    {localDetails.reduce((sum, d) => sum + (d.assigned ? d.assigned.length : 0), 0)}
                                                </Typography>
                                            </Box>
                                        </Card>
                                    </Box>

                                    {/* Right Pane: Worker Assignments */}
                                    <Box flex={2} display="flex" flexDirection="column">
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                            <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>Worker Assignments</Typography>
                                            <Box display="flex" gap={1}>
                                                <Chip size="small" label="Permanent" sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 'bold' }} />
                                                <Chip size="small" label="Casual" sx={{ bgcolor: '#e1f5fe', color: '#0288d1', fontWeight: 'bold' }} />
                                                <Chip size="small" label="Contract" sx={{ bgcolor: '#f3e5f5', color: '#9c27b0', fontWeight: 'bold' }} />
                                            </Box>
                                        </Box>
                                        <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
                                            {Object.entries(localDetails.reduce((acc: any, d: any, originalIdx: number) => {
                                                if (!acc[d.task]) acc[d.task] = [];
                                                acc[d.task].push({ ...d, originalIdx });
                                                return acc;
                                            }, {})).map(([taskName, items]: [string, any], taskIdx: number) => (
                                                <Box key={taskIdx} mb={2} p={2} bgcolor="white" borderRadius={3} border="1px solid #e0e0e0" sx={{ '&:hover': { borderColor: '#a5d6a7', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' } }}>
                                                    <Typography variant="h6" fontWeight="bold" color="#37474f" mb={1.5} borderBottom="2px solid #e8f5e9" pb={0.5}>{taskName}</Typography>
                                                    {items.map((d: any, subIdx: number) => {
                                                        const idx = d.originalIdx;
                                                        return (
                                                            <Box key={idx} mb={subIdx === items.length - 1 ? 0 : 2} pb={subIdx === items.length - 1 ? 0 : 2} borderBottom={subIdx === items.length - 1 ? 'none' : '1px dashed #e0e0e0'}>
                                                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                                                                    <Chip label={d.field} size="small" variant="outlined" color="primary" sx={{ borderRadius: 1 }} />
                                                                    <Box display="flex" alignItems="center" gap={1}>
                                                                        {isEditMode && (
                                                                            <>
                                                                                {editingIdx === idx ? (
                                                                                    <Box display="flex" gap={0.5}>
                                                                                        <IconButton size="small" title="Discard Changes" onClick={() => {
                                                                                            if (selectedItem?.detailsRaw) {
                                                                                                try {
                                                                                                    const originalDetails = JSON.parse(selectedItem.detailsRaw);
                                                                                                    const copy = [...localDetails];
                                                                                                    copy[idx].assigned = originalDetails[idx]?.assigned || [];
                                                                                                    copy[idx].count = copy[idx].assigned.length;
                                                                                                    setLocalDetails(copy);
                                                                                                } catch (e) { }
                                                                                            }
                                                                                            setEditingIdx(null);
                                                                                        }}>
                                                                                            <CancelIcon color="error" fontSize="small" />
                                                                                        </IconButton>
                                                                                        <IconButton size="small" title="Save Changes" onClick={() => setEditingIdx(null)}>
                                                                                            <SaveIcon color="primary" fontSize="small" />
                                                                                        </IconButton>
                                                                                    </Box>
                                                                                ) : (
                                                                                    <IconButton size="small" onClick={() => setEditingIdx(idx)}>
                                                                                        <EditIcon fontSize="small" />
                                                                                    </IconButton>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                    </Box>
                                                                </Box>
                                                                <Box display="flex" gap={1} flexWrap="wrap">
                                                                    {editingIdx === idx ? (
                                                                        <Autocomplete
                                                                            multiple
                                                                            options={getFilteredWorkersForEdit()}
                                                                            getOptionLabel={(option) => option.name || option.workerName || ''}
                                                                            groupBy={(option) => {
                                                                                if (option.employmentType === 'PERMANENT') return '— PERMANENT —';
                                                                                if (option.employmentType === 'CASUAL') return '— CASUAL —';
                                                                                if (option.employmentType === 'CONTRACT' || option.employmentType === 'CONTRACT_MEMBER') return '— CONTRACT —';
                                                                                return '— OTHER —';
                                                                            }}
                                                                            disableCloseOnSelect
                                                                            value={(d.assigned || []).map((w: any) => workerMap.get(w.id) || workerMap.get(w.workerId) || w).filter(Boolean)}
                                                                            isOptionEqualToValue={(o, v) => o.id === v.id}
                                                                            getOptionDisabled={(option: any) => {
                                                                                const isUnavailableInOtherMusters = globalUnavailableSet.has(option.id);
                                                                                const isUnavailableInOtherTasks = localDetails.some((dItem: any, dIdx: number) =>
                                                                                    dIdx !== idx && dItem.assigned && dItem.assigned.some((w: any) => w.id === option.id || w.workerId === option.id)
                                                                                );
                                                                                const notInMorning = isEveningEditing && !morningWorkersSet.has(option.id);
                                                                                return isUnavailableInOtherMusters || isUnavailableInOtherTasks || notInMorning;
                                                                            }}
                                                                            onChange={(_, newVal) => {
                                                                                const copy = [...localDetails];
                                                                                copy[idx].assigned = newVal.map((w: any) => ({
                                                                                    id: w.id,
                                                                                    name: w.name || w.workerName,
                                                                                    workerId: w.workerId
                                                                                }));
                                                                                copy[idx].count = newVal.length;
                                                                                setLocalDetails(copy);
                                                                            }}
                                                                            renderInput={(params) => (
                                                                                <TextField
                                                                                    {...params}
                                                                                    variant="outlined"
                                                                                    size="small"
                                                                                    placeholder="Search by name..."
                                                                                    sx={{ width: '100%', minWidth: 300 }}
                                                                                    InputProps={{
                                                                                        ...params.InputProps,
                                                                                        startAdornment: (
                                                                                            <>
                                                                                                {params.InputProps.startAdornment}
                                                                                                <AddCircleOutlineIcon
                                                                                                    fontSize="small"
                                                                                                    sx={{ color: '#2e7d32', ml: 1, mr: 1, cursor: 'pointer' }}
                                                                                                    onMouseDown={(e) => {
                                                                                                        e.preventDefault(); // Prevents focus loss
                                                                                                        const inputElement = e.currentTarget.closest('.MuiInputBase-root')?.querySelector('input');
                                                                                                        if (inputElement) {
                                                                                                            inputElement.focus();
                                                                                                        }
                                                                                                    }}
                                                                                                />
                                                                                            </>
                                                                                        ),
                                                                                    }}
                                                                                />
                                                                            )}
                                                                            renderTags={(val, getTagProps) => val.map((w, i) => {
                                                                                let chipColor: any = "default";
                                                                                let borderC = "transparent";
                                                                                let txColor = "inherit";
                                                                                if (w.employmentType === 'PERMANENT') { chipColor = "success"; }
                                                                                else if (w.employmentType === 'CASUAL') { chipColor = "info"; }
                                                                                else if (w.employmentType === 'CONTRACT' || w.employmentType === 'CONTRACT_MEMBER') {
                                                                                    chipColor = undefined;
                                                                                    borderC = "#9c27b0";
                                                                                    txColor = "#9c27b0";
                                                                                }

                                                                                const { key, ...tagProps } = getTagProps({ index: i }) as any;

                                                                                return <Chip
                                                                                    key={w.id || key}
                                                                                    {...tagProps}
                                                                                    label={
                                                                                        <Box display="flex" alignItems="center" gap={1}>
                                                                                            <Typography variant="body2">{w.name}</Typography>
                                                                                            <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '10px', textTransform: 'capitalize' }}>
                                                                                                ({w.employmentType?.replace('_', ' ').toLowerCase() || 'unknown'})
                                                                                            </Typography>
                                                                                        </Box>
                                                                                    }
                                                                                    size="small"
                                                                                    color={chipColor}
                                                                                    variant="outlined"
                                                                                    sx={!chipColor ? { borderColor: borderC, color: txColor } : {}}
                                                                                />;
                                                                            })}
                                                                            renderOption={(props, option, { selected }) => {
                                                                                let typeColor = "inherit"; // default

                                                                                if (option.employmentType === 'PERMANENT') { typeColor = "success.main"; }
                                                                                if (option.employmentType === 'CASUAL') { typeColor = "info.main"; }
                                                                                if (option.employmentType === 'CONTRACT' || option.employmentType === 'CONTRACT_MEMBER') {
                                                                                    typeColor = "#9c27b0";
                                                                                }

                                                                                const isUnavailableInOtherMusters = globalUnavailableSet.has(option.id);
                                                                                const isUnavailableInOtherTasks = localDetails.some((dItem: any, dIdx: number) =>
                                                                                    dIdx !== idx && dItem.assigned && dItem.assigned.some((w: any) => w.id === option.id || w.workerId === option.id)
                                                                                );
                                                                                const notInMorning = isEveningEditing && !morningWorkersSet.has(option.id);
                                                                                const isUnavailable = isUnavailableInOtherMusters || isUnavailableInOtherTasks || notInMorning;

                                                                                const { key, ...otherProps } = props as any;

                                                                                return (
                                                                                    <li key={option.id || key} {...otherProps}>
                                                                                        <Checkbox
                                                                                            icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                                                                                            checkedIcon={<CheckBoxIcon fontSize="small" />}
                                                                                            style={{ marginRight: 8 }}
                                                                                            checked={selected}
                                                                                            disabled={isUnavailable}
                                                                                        />
                                                                                        <Box sx={{ opacity: isUnavailable ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                                                                            <Typography variant="body2" sx={{ color: typeColor, fontWeight: selected ? 'bold' : 'normal' }}>
                                                                                                {option.name} {isUnavailable ? '(Assigned)' : ''}
                                                                                            </Typography>
                                                                                        </Box>
                                                                                    </li>
                                                                                );
                                                                            }}
                                                                            fullWidth
                                                                        />
                                                                    ) : (
                                                                        <>
                                                                            {d.assigned && d.assigned.length > 0 ? d.assigned.map((w: any, i: number) => {
                                                                                const worker = workerMap.get(w.id);
                                                                                const isFemale = worker?.gender === 'FEMALE';
                                                                                const empType = worker?.employmentType;

                                                                                let avatarBg = '#e0e0e0';
                                                                                if (empType === 'PERMANENT') { avatarBg = '#2e7d32'; }
                                                                                else if (empType === 'CASUAL') { avatarBg = '#0288d1'; }
                                                                                else if (empType === 'CONTRACT' || empType === 'CONTRACT_MEMBER') { avatarBg = '#9c27b0'; }

                                                                                return (
                                                                                    <Chip
                                                                                        key={i}
                                                                                        avatar={
                                                                                            <Avatar sx={{ bgcolor: avatarBg, color: '#fff', width: 24, height: 24, border: '1px solid white' }}>
                                                                                                {isFemale ? <WomanIcon sx={{ fontSize: 16 }} /> : <ManIcon sx={{ fontSize: 16 }} />}
                                                                                            </Avatar>
                                                                                        }
                                                                                        label={w.name}
                                                                                        variant="outlined"
                                                                                        size="small"
                                                                                        sx={{ borderRadius: 4, bgcolor: '#fafafa', border: '1px solid #eeeeee' }}
                                                                                    />
                                                                                );
                                                                            }) : (
                                                                                <Typography variant="body2" color="text.secondary" fontStyle="italic">No specific workers assigned</Typography>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </Box>
                                                            </Box>
                                                        );
                                                    })}
                                                </Box>
                                            ))}
                                        </Box>
                                    </Box>
                                </Box>
                            )}
                        </DialogContent>
                        <DialogActions sx={{ p: 2, bgcolor: '#e8f5e9', display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'stretch' }}>
                            <TextField
                                fullWidth
                                variant="outlined"
                                size="small"
                                label="Manager Remarks (Optional)"
                                placeholder="Add reason for rejection, or notes for approval..."
                                value={remarks}
                                onChange={(e: any) => setRemarks(e.target.value)}
                                disabled={!isEditMode}
                                sx={{ bgcolor: 'white' }}
                            />
                            <Box display="flex" justifyContent="flex-end" width="100%">
                                <Box display="flex" gap={1}>
                                    <Button onClick={() => setSelectedItem(null)}>Close</Button>
                                    {isEditMode ? (
                                        <>
                                            <Button variant="outlined" color="error" startIcon={<CancelIcon />} onClick={handleReject}>Reject</Button>
                                            <Button variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={handleApprove}>{viewStatus === 'HISTORY' ? 'Update Details' : 'Approve & Sign'}</Button>
                                        </>
                                    ) : (
                                        <>
                                            {viewStatus === 'HISTORY' && <Button variant="outlined" color="error" startIcon={<CancelIcon />} onClick={handleReject}>Delete Record (Reset)</Button>}
                                        </>
                                    )}
                                </Box>
                            </Box>
                        </DialogActions>
                    </Dialog>
                );
            })()}

            <Snackbar open={!!notification} autoHideDuration={4000} onClose={() => setNotification(null)}>
                <Alert severity={notification?.severity || 'info'}>{notification?.message}</Alert>
            </Snackbar>
        </Box >
    );
}
