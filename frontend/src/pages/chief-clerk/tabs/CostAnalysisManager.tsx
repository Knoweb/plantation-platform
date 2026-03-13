import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Tabs, Tab, TextField, Button, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, Chip, Tooltip,
    Alert, Divider, InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import FolderIcon from '@mui/icons-material/Folder';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

// ─── Data Model ───────────────────────────────────────────────────────────────
interface CostItem {
    id: string;
    name: string;
    dayAmount?: string;
    todateAmount?: string;
    lastMonthAmount?: string;
    ytdAmount?: string;
}

interface CostCategory {
    id: string;
    name: string;
    items: CostItem[];
}

const CROP_COLORS: Record<string, string> = {
    Tea: '#2e7d32',
    Rubber: '#0277bd',
    Cinnamon: '#e65100',
};

const generateId = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_CATEGORIES: CostCategory[] = [
    {
        id: generateId(), name: 'Plucking', items: [
            { id: generateId(), name: 'Pluckers' },
            { id: generateId(), name: 'Kanganies' },
            { id: generateId(), name: 'Sack Coolies' },
            { id: generateId(), name: 'Staff OT for Plucking' },
            { id: generateId(), name: 'Leaf Bags' },
            { id: generateId(), name: 'Cash Kilos' },
            { id: generateId(), name: 'Meals' },
            { id: generateId(), name: 'Over Kilos' },
        ]
    },
    {
        id: generateId(), name: 'Chemical Weeding', items: [
            { id: generateId(), name: 'Chemical Weeding ManDays' },
            { id: generateId(), name: 'Cost of Chemical' },
            { id: generateId(), name: 'Tank Repair' },
            { id: generateId(), name: 'Meals' },
            { id: generateId(), name: 'Transport' },
        ]
    },
    {
        id: generateId(), name: 'Manual Weeding', items: [
            { id: generateId(), name: 'Manual Weeding ManDays' },
            { id: generateId(), name: 'Tools' },
        ]
    },
    {
        id: generateId(), name: 'Fertilizing', items: [
            { id: generateId(), name: 'Fertilizer Cost' },
        ]
    },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function CostAnalysisManager() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const [activeCrop, setActiveCrop] = useState('Tea');
    const [availableCrops, setAvailableCrops] = useState<string[]>(['Tea']);
    const [categories, setCategories] = useState<CostCategory[]>([]);

    // Default to today
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );

    const [saved, setSaved] = useState(true);
    const [isEditable, setIsEditable] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');
    const [uploadMsg, setUploadMsg] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [catDialog, setCatDialog] = useState<{ open: boolean; editId?: string; name: string }>({ open: false, name: '' });
    const [itemDialog, setItemDialog] = useState<{ open: boolean; catId: string; editId?: string; name: string }>({ open: false, catId: '', name: '' });
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: 'cat' | 'item'; catId: string; itemId?: string; label: string } | null>(null);

    useEffect(() => {
        axios.get(`/api/fields?tenantId=${userSession.tenantId}`)
            .then(r => {
                const crops = Array.from(new Set((r.data || []).map((f: any) => f.cropType).filter(Boolean))) as string[];
                if (crops.length > 0) { setAvailableCrops(crops); setActiveCrop(crops[0]); }
            }).catch(() => { });
    }, [userSession.tenantId]);

    useEffect(() => {
        setSaved(true);
        axios.get(`/api/daily-costs`, {
            params: { tenantId: userSession.tenantId, cropType: activeCrop, date: selectedDate }
        })
            .then(r => {
                if (r.status === 200 && r.data?.costData) {
                    try {
                        const parsed = JSON.parse(r.data.costData);
                        setCategories(Array.isArray(parsed) ? parsed : makeDefaults());
                        return; // exit early if daily record found
                    } catch { }
                }
                fetchConfigFallback();
            })
            .catch(() => fetchConfigFallback());

        function fetchConfigFallback() {
            axios.get(`/api/crop-configs?tenantId=${userSession.tenantId}&cropType=${activeCrop}`)
                .then(res => {
                    if (res.data?.costItems) {
                        try {
                            const parsed = JSON.parse(res.data.costItems);
                            setCategories(Array.isArray(parsed) ? parsed : makeDefaults());
                        } catch { setCategories(makeDefaults()); }
                    } else {
                        setCategories(makeDefaults());
                    }
                }).catch(() => setCategories(makeDefaults()));
        }
    }, [activeCrop, selectedDate, userSession.tenantId]);

    const makeDefaults = () => DEFAULT_CATEGORIES.map(c => ({
        ...c, id: generateId(), items: c.items.map(i => ({ ...i, id: generateId() }))
    }));

    const markDirty = () => setSaved(false);

    // ── Save to backend ───────────────────────────────────────────────────────
    const handleSave = async () => {
        try {
            // Strip amounts before saving bare structure to CropConfig
            const structureOnlyCategories = categories.map(cat => ({
                ...cat,
                items: cat.items.map(item => ({
                    id: item.id,
                    name: item.name
                }))
            }));

            // Save empty structure to CropConfig
            await axios.post(`/api/crop-configs`, {
                tenantId: userSession.tenantId,
                cropType: activeCrop,
                costItems: JSON.stringify(structureOnlyCategories),
            });
            // Save actual daily amounts with auto-calculation
            await axios.post(`/api/daily-costs`, {
                tenantId: userSession.tenantId,
                cropType: activeCrop,
                date: selectedDate,
                costData: JSON.stringify(categories),
            });

            setSaved(true);
            setIsEditable(false);
            setSaveMsg('Saved successfully!');
            setTimeout(() => setSaveMsg(''), 3000);
            
            // Refresh data to show calculated values
            const response = await axios.get(`/api/daily-costs`, {
                params: { tenantId: userSession.tenantId, cropType: activeCrop, date: selectedDate }
            });
            if (response.status === 200 && response.data?.costData) {
                try {
                    const parsed = JSON.parse(response.data.costData);
                    setCategories(Array.isArray(parsed) ? parsed : categories);
                } catch { }
            }
        } catch { setSaveMsg('Save failed. Please try again.'); }
    };

    // ── Amount editing ────────────────────────────────────────────────────────
    const updateItemField = (catId: string, itemId: string, field: keyof CostItem, value: string) => {
        setCategories(prev => prev.map(c => c.id !== catId ? c : {
            ...c, items: c.items.map(i => i.id !== itemId ? i : { ...i, [field]: value })
        }));
        markDirty();
    };

    // Total for a category
    const catTotal = (cat: CostCategory, field: keyof CostItem) =>
        cat.items.reduce((s, i) => s + (parseFloat((i[field] as string) || '0') || 0), 0);

    // ── Excel Download — HTML approach (renders real colors in Excel) ──────────
    const handleDownload = () => {
        const cropColor = CROP_COLORS[activeCrop] || '#2e7d32';
        const lightBg = activeCrop === 'Tea' ? '#e8f5e9' : activeCrop === 'Rubber' ? '#e1f5fe' : '#fff3e0';
        const selected = new Date(selectedDate);
        const dateStr = selected.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }).replace(/ /g, '-');
        const timeStr = selected.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const tdBase = `border:1px solid #ccc; padding:5px 8px; font-size:11pt; font-family:Calibri,Arial,sans-serif;`;
        const tdR = `${tdBase} text-align:right;`;
        const tdL = `${tdBase} text-align:left;`;

        const rows: string[] = [];

        // 1) Ribbon header
        rows.push(`
            <tr>
                <td colspan="6" style="border-top:3px solid #1b5e20; border-left:1px solid #ccc; border-right:1px solid #ccc; font-weight:bold; font-size:16pt; font-family:Calibri,Arial,sans-serif; text-align:center; padding:10px 0; background-color:#ffffff;">
                    Cost Analysis
                </td>
            </tr>
            <tr>
                <td style="border-bottom:1px solid #ccc; border-left:1px solid #ccc;"></td>
                <td colspan="3" style="border-bottom:1px solid #ccc; text-align:center; font-size:11pt; font-family:Calibri,Arial,sans-serif;">
                    ${dateStr}
                </td>
                <td colspan="2" style="border-bottom:1px solid #ccc; border-right:1px solid #ccc; text-align:right; padding-right:15px; font-size:11pt; font-family:Calibri,Arial,sans-serif;">
                    ${timeStr}
                </td>
            </tr>
        `);

        // 2) Column headers
        rows.push(`
            <tr>
                <td style="font-weight:bold; background-color:#fafafa; ${tdL}">Work Item</td>
                <td style="font-weight:bold; background-color:#fafafa; color:${cropColor}; ${tdR}">Day Amount (Rs.)</td>
                <td style="font-weight:bold; background-color:#fafafa; color:${cropColor}; ${tdR}">Todate Amount (Rs.)</td>
                <td style="font-weight:bold; background-color:#fafafa; color:#888; ${tdR}">Last Month (Rs.)</td>
                <td style="font-weight:bold; background-color:#fafafa; color:#888; ${tdR}">YTD (Rs.)</td>
            </tr>
        `);

        categories.forEach(cat => {
            rows.push(`
                <tr>
                    <td colspan="6" style="background-color:${lightBg}; color:${cropColor}; font-weight:bold; text-transform:uppercase; ${tdL}">
                        ${cat.name}
                    </td>
                </tr>
            `);

            cat.items.forEach(item => {
                rows.push(`
                    <tr>
                        <td style="${tdL} padding-left:20px;">${item.name}</td>
                        <td style="${tdR}">${item.dayAmount || ''}</td>
                        <td style="${tdR}">${item.todateAmount || ''}</td>
                        <td style="${tdR} color:#555;">${item.lastMonthAmount || ''}</td>
                        <td style="${tdR} color:#555;">${item.ytdAmount || ''}</td>
                    </tr>
                `);
            });

            if (cat.items.length > 0) {
                const dayTotal = catTotal(cat, 'dayAmount');
                const todateTotal = catTotal(cat, 'todateAmount');
                const lastMthTotal = catTotal(cat, 'lastMonthAmount');
                const ytdTotal = catTotal(cat, 'ytdAmount');
                rows.push(`
                    <tr>
                        <td style="background-color:#eeeeee; font-weight:bold; ${tdL}">Σ Total Cost for ${cat.name}</td>
                        <td style="background-color:#eeeeee; font-weight:bold; color:${cropColor}; ${tdR}">${dayTotal || ''}</td>
                        <td style="background-color:#eeeeee; font-weight:bold; color:${cropColor}; ${tdR}">${todateTotal || ''}</td>
                        <td style="background-color:#eeeeee; font-weight:bold; color:#555; ${tdR}">${lastMthTotal || ''}</td>
                        <td style="background-color:#eeeeee; font-weight:bold; color:#555; ${tdR}">${ytdTotal || ''}</td>
                    </tr>
                `);
            }
        });

        const html = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta charset="utf-8">
            <style> table { border-collapse: collapse; width: 100%; } </style>
          </head>
          <body>
            <table>
              <colgroup>
                  <col width="300" />
                  <col width="150" />
                  <col width="150" />
                  <col width="150" />
                  <col width="150" />
                  <col width="10" />
              </colgroup>
              ${rows.join('\n')}
            </table>
          </body>
          </html>`;

        const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=UTF-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Cost_Analysis_${activeCrop}_${selected.toISOString().slice(0, 10)}.xls`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── Excel Upload ──────────────────────────────────────────────────────────
    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target!.result as ArrayBuffer);
                const wb = XLSX.read(data, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

                const amountMap: Record<string, { dayAmount?: string; todateAmount?: string; lastMonthAmount?: string; ytdAmount?: string }> = {};
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || row.length < 2) continue;
                    const catOrName = String(row[0] || '').trim();
                    const item = String(row[1] || '').trim();
                    // Basic parsing since HTML to excel loses strict columns sometimes, robust logic:
                    if (!catOrName || catOrName.startsWith('Σ')) continue;

                    // The old upload logic used Category in row 0 and item in row 1, but HTML approach put Item in row 0
                    // We map by Item name
                    amountMap[catOrName] = {
                        dayAmount: row[1] != null ? String(row[1]) : undefined,
                        todateAmount: row[2] != null ? String(row[2]) : undefined,
                        lastMonthAmount: row[3] != null ? String(row[3]) : undefined,
                        ytdAmount: row[4] != null ? String(row[4]) : undefined,
                    };
                }

                // Apply to current categories
                setCategories(prev => prev.map(cat => ({
                    ...cat,
                    items: cat.items.map(item => {
                        const amounts = amountMap[item.name];
                        return amounts ? { ...item, ...amounts } : item;
                    })
                })));
                markDirty();
                setUploadMsg('Excel loaded! Review the amounts below, then click Save.');
                setTimeout(() => setUploadMsg(''), 5000);
            } catch {
                setUploadMsg('Failed to read Excel. Please use the downloaded template.');
                setTimeout(() => setUploadMsg(''), 5000);
            }
        };
        reader.readAsArrayBuffer(file);
        e.target.value = '';
    };

    // ── Category CRUD ─────────────────────────────────────────────────────────
    const saveCat = () => {
        const name = catDialog.name.trim();
        if (!name) return;
        if (catDialog.editId) {
            setCategories(prev => prev.map(c => c.id === catDialog.editId ? { ...c, name } : c));
        } else {
            setCategories(prev => [...prev, { id: generateId(), name, items: [] }]);
        }
        markDirty();
        setCatDialog({ open: false, name: '' });
    };

    const deleteCat = (catId: string) => {
        setCategories(prev => prev.filter(c => c.id !== catId));
        markDirty(); setDeleteDialog(null);
    };

    // ── Item CRUD ─────────────────────────────────────────────────────────────
    const saveItem = () => {
        const name = itemDialog.name.trim();
        if (!name) return;
        setCategories(prev => prev.map(c => {
            if (c.id !== itemDialog.catId) return c;
            if (itemDialog.editId) return { ...c, items: c.items.map(i => i.id === itemDialog.editId ? { ...i, name } : i) };
            return { ...c, items: [...c.items, { id: generateId(), name }] };
        }));
        markDirty();
        setItemDialog({ open: false, catId: '', name: '' });
    };

    const deleteItem = (catId: string, itemId: string) => {
        setCategories(prev => prev.map(c => c.id === catId ? { ...c, items: c.items.filter(i => i.id !== itemId) } : c));
        markDirty(); setDeleteDialog(null);
    };

    const cropColor = CROP_COLORS[activeCrop] || '#2e7d32';

    return (
        <Box sx={{ pb: 4 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" sx={{ color: '#1b5e20' }}>
                        Cost Analysis Manager
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Enter Daily Amount for each work item. All calculations are done automatically.
                    </Typography>
                </Box>
                <Box display="flex" gap={1} alignItems="center" flexWrap="wrap" justifyContent="flex-end">
                    <TextField
                        type="date"
                        size="small"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        sx={{ bgcolor: '#fff', borderRadius: 1 }}
                    />
                    {saveMsg && <Alert severity={saveMsg.includes('fail') ? 'error' : 'success'} sx={{ py: 0, px: 1 }}>{saveMsg}</Alert>}
                    {!saved && isEditable && <Chip label="Unsaved changes" color="warning" size="small" />}
                    
                    {!isEditable ? (
                        <Button variant="contained" startIcon={<EditIcon />} onClick={() => setIsEditable(true)}
                            sx={{ bgcolor: '#e65100', '&:hover': { bgcolor: '#ef6c00' } }}>
                            Edit Entry
                        </Button>
                    ) : (
                        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}
                            sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}>
                            Save
                        </Button>
                    )}

                    <Divider orientation="vertical" flexItem />
                    <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownload}
                        sx={{ borderColor: cropColor, color: cropColor }}>
                        Download Report
                    </Button>
                    {isEditable && (
                        <>
                            <Button variant="outlined" startIcon={<UploadIcon />}
                                onClick={() => fileInputRef.current?.click()}
                                sx={{ borderColor: '#f57c00', color: '#f57c00', borderWidth: 2 }}>
                                Upload Excel
                            </Button>
                            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleUpload} />
                            <Button variant="text" startIcon={<AddIcon />}
                                onClick={() => setCatDialog({ open: true, name: '' })}
                                sx={{ color: cropColor }}>
                                Add Category
                            </Button>
                        </>
                    )}
                </Box>
            </Box>

            {uploadMsg && (
                <Alert severity="info" sx={{ mb: 2 }}>{uploadMsg}</Alert>
            )}

            <Paper elevation={3} sx={{ overflow: 'hidden', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                {/* Crop Tabs */}
                <Box sx={{ borderBottom: '1px solid #e0e0e0', bgcolor: '#f5f5f5' }}>
                    <Tabs value={activeCrop} onChange={(_, v) => setActiveCrop(v)}
                        sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, fontWeight: 'bold', textTransform: 'none', borderRight: '1px solid #ccc' } }}>
                        {availableCrops.map(crop => (
                            <Tab key={crop} label={crop} value={crop} sx={{
                                bgcolor: activeCrop === crop ? (CROP_COLORS[crop] || '#4caf50') : '#e8e8e8',
                                color: activeCrop === crop ? '#fff !important' : '#555',
                            }} />
                        ))}
                    </Tabs>
                </Box>

                {/* Table */}
                <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
                    <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { borderRight: '1px solid #f0f0f0', padding: '4px 10px' } }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#fafafa', minWidth: 300 }}>Work Item</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#fafafa', color: cropColor, textAlign: 'right', minWidth: 180 }}>
                                    Day Amount (Rs.)
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#fafafa', minWidth: 100, textAlign: 'center' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {categories.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} align="center" sx={{ py: 6, color: '#aaa' }}>
                                        <FolderIcon sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
                                        <Typography>No categories. Click "Add Category" to start.</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                            {categories.flatMap(cat => {
                                const rows: React.ReactNode[] = [];

                                // Category header row
                                rows.push(
                                    <TableRow key={`${cat.id}-header`}>
                                        <TableCell colSpan={3} sx={{
                                            bgcolor: cropColor + '18',
                                            borderLeft: `4px solid ${cropColor}`,
                                            py: 0.6,
                                        }}>
                                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <FolderIcon sx={{ color: cropColor, fontSize: 17 }} />
                                                    <Typography fontWeight="bold" sx={{ color: cropColor, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                                                        {cat.name}
                                                    </Typography>
                                                    <Chip label={`${cat.items.length} items`} size="small"
                                                        sx={{ height: 17, fontSize: '0.63rem', bgcolor: cropColor + '33', color: cropColor }} />
                                                </Box>
                                                <Box display="flex" gap={0.5}>
                                                    {isEditable && (
                                                        <>
                                                            <Button size="small" startIcon={<AddIcon />}
                                                                onClick={() => setItemDialog({ open: true, catId: cat.id, name: '' })}
                                                                sx={{ fontSize: '0.68rem', color: cropColor, textTransform: 'none', py: 0.1, minWidth: 0 }}>
                                                                Add Item
                                                            </Button>
                                                            <Tooltip title="Rename category">
                                                                <IconButton size="small" onClick={() => setCatDialog({ open: true, editId: cat.id, name: cat.name })} sx={{ color: '#1976d2' }}>
                                                                    <EditIcon sx={{ fontSize: 15 }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Delete category">
                                                                <IconButton size="small"
                                                                    onClick={() => setDeleteDialog({ open: true, type: 'cat', catId: cat.id, label: cat.name })}
                                                                    sx={{ color: '#c62828' }}>
                                                                    <DeleteIcon sx={{ fontSize: 15 }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </>
                                                    )}
                                                </Box>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                );

                                // Item rows
                                cat.items.forEach(item => {
                                    rows.push(
                                        <TableRow key={`${cat.id}-item-${item.id}`} sx={{ '&:hover': { bgcolor: '#fafafa' } }}>
                                            <TableCell sx={{ pl: 4, color: '#333' }}>{item.name}</TableCell>
                                            {/* Editable Day Amount */}
                                            <TableCell align="right" sx={{ py: 0.3 }}>
                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    disabled={!isEditable}
                                                    value={(item.dayAmount as string) || ''}
                                                    onChange={e => updateItemField(cat.id, item.id, 'dayAmount', e.target.value)}
                                                    placeholder="0.00"
                                                    sx={{
                                                        width: 150,
                                                        '& .MuiOutlinedInput-root': {
                                                            '& fieldset': { borderColor: '#e0e0e0' },
                                                            '&:hover fieldset': { borderColor: isEditable ? cropColor : '#e0e0e0' },
                                                            '&.Mui-focused fieldset': { borderColor: cropColor },
                                                        },
                                                        '& input': { textAlign: 'right', fontSize: '0.9rem', p: '6px 10px', WebkitTextFillColor: isEditable ? 'inherit' : '#555' }
                                                    }}
                                                    InputProps={{ startAdornment: <InputAdornment position="start" sx={{ '& p': { fontSize: '0.8rem', color: '#aaa' } }}>Rs.</InputAdornment> }}
                                                />
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 0.3 }}>
                                                {isEditable && (
                                                    <>
                                                        <Tooltip title="Rename">
                                                            <IconButton size="small" onClick={() => setItemDialog({ open: true, catId: cat.id, editId: item.id, name: item.name })} sx={{ color: '#1976d2' }}>
                                                                <EditIcon sx={{ fontSize: 16 }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Remove">
                                                            <IconButton size="small"
                                                                onClick={() => setDeleteDialog({ open: true, type: 'item', catId: cat.id, itemId: item.id, label: item.name })}
                                                                sx={{ color: '#c62828' }}>
                                                                <DeleteIcon sx={{ fontSize: 16 }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                });

                                // Empty placeholder
                                if (cat.items.length === 0) {
                                    rows.push(
                                        <TableRow key={`${cat.id}-empty`}>
                                            <TableCell colSpan={3} sx={{ pl: 6, py: 1, color: '#bbb', fontStyle: 'italic', fontSize: '0.8rem' }}>
                                                No items yet — click "Add Item" above
                                            </TableCell>
                                        </TableRow>
                                    );
                                }

                                // Auto-total row
                                if (cat.items.length > 0) {
                                    const dayTotal = catTotal(cat, 'dayAmount');
                                    rows.push(
                                        <TableRow key={`${cat.id}-total`} sx={{ bgcolor: '#eeeeee', borderTop: '2px solid #ccc' }}>
                                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#333', pl: 4 }}>
                                                ∑ &nbsp; Total Cost for {cat.name}
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold', color: cropColor }}>
                                                {dayTotal > 0 ? `Rs. ${dayTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}` : '-'}
                                            </TableCell>
                                            <TableCell />
                                        </TableRow>
                                    );
                                }

                                return rows;
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Add / Edit Category */}
            <Dialog open={catDialog.open} onClose={() => setCatDialog({ open: false, name: '' })} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ bgcolor: '#e8f5e9', color: '#1b5e20', fontWeight: 'bold' }}>
                    {catDialog.editId ? 'Rename Category' : 'Add New Category'}
                </DialogTitle>
                <DialogContent dividers>
                    <TextField label="Category Name" value={catDialog.name}
                        onChange={e => setCatDialog(d => ({ ...d, name: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && saveCat()}
                        fullWidth autoFocus sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setCatDialog({ open: false, name: '' })}>Cancel</Button>
                    <Button variant="contained" onClick={saveCat} sx={{ bgcolor: '#2e7d32' }}>Save Category</Button>
                </DialogActions>
            </Dialog>

            {/* Add / Edit Item */}
            <Dialog open={itemDialog.open} onClose={() => setItemDialog({ open: false, catId: '', name: '' })} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ bgcolor: '#e8f5e9', color: '#1b5e20', fontWeight: 'bold' }}>
                    {itemDialog.editId ? 'Rename Item' : 'Add New Item'}
                </DialogTitle>
                <DialogContent dividers>
                    <TextField label="Work Item Name" value={itemDialog.name}
                        onChange={e => setItemDialog(d => ({ ...d, name: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && saveItem()}
                        fullWidth autoFocus sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setItemDialog({ open: false, catId: '', name: '' })}>Cancel</Button>
                    <Button variant="contained" onClick={saveItem} sx={{ bgcolor: '#2e7d32' }}>Save Item</Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ color: '#d32f2f', fontWeight: 'bold' }}>Confirm Deletion</DialogTitle>
                <DialogContent dividers>
                    <Typography>
                        Are you sure you want to delete the {deleteDialog?.type === 'cat' ? 'category' : 'item'} <strong>{deleteDialog?.label}</strong>?
                    </Typography>
                    {deleteDialog?.type === 'cat' && (
                        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                            This will also delete all items within this category!
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDeleteDialog(null)}>Cancel</Button>
                    <Button variant="contained" color="error"
                        onClick={() => deleteDialog?.type === 'cat' ? deleteCat(deleteDialog.catId) : deleteItem(deleteDialog!.catId, deleteDialog!.itemId!)}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
}
