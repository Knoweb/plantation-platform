import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    InputAdornment,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import FolderIcon from '@mui/icons-material/Folder';
import SaveIcon from '@mui/icons-material/Save';
import UploadIcon from '@mui/icons-material/Upload';
import SettingsIcon from '@mui/icons-material/Settings';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import axios from 'axios';

interface CostItem {
    id: string;
    name: string;
    dayAmount?: string;
    todateAmount?: string;
    lastMonthAmount?: string;
    ytdAmount?: string;
    dayCostPerKgOverride?: string;
    todateCostPerKgOverride?: string;
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
        id: generateId(),
        name: 'Plucking',
        items: [
            { id: generateId(), name: 'Pluckers' },
            { id: generateId(), name: 'Kanganies' },
            { id: generateId(), name: 'Sack Coolies' },
            { id: generateId(), name: 'Staff OT for Plucking' },
            { id: generateId(), name: 'Leaf Bags' },
            { id: generateId(), name: 'Cash Kilos' },
            { id: generateId(), name: 'Meals' },
            { id: generateId(), name: 'Over Kilos' },
            { id: generateId(), name: 'OT Wages' },
        ],
    },
    {
        id: generateId(),
        name: 'Chemical Weeding',
        items: [
            { id: generateId(), name: 'Chemical Weeding ManDays' },
            { id: generateId(), name: 'Cost of Chemical' },
            { id: generateId(), name: 'Tank Repair' },
            { id: generateId(), name: 'Meals' },
            { id: generateId(), name: 'Transport' },
        ],
    },
    {
        id: generateId(),
        name: 'Manual Weeding',
        items: [
            { id: generateId(), name: 'Manual Weeding ManDays' },
            { id: generateId(), name: 'Tools' },
        ],
    },
    {
        id: generateId(),
        name: 'Fertilizing',
        items: [{ id: generateId(), name: 'Fertilizer Cost' }],
    },
];

const makeDefaults = () =>
    DEFAULT_CATEGORIES.map((category) => ({
        ...category,
        id: generateId(),
        items: category.items.map((item) => ({ ...item, id: generateId() })),
    }));

const ITEM_TO_CATEGORY = new Map(
    DEFAULT_CATEGORIES.flatMap((category) => category.items.map((item) => [item.name, category.name] as const)),
);
const HEADER_ROW_ONE_HEIGHT = 38;
const HEADER_ROW_TWO_HEIGHT = 44;
const HEADER_ROW_HEIGHT = 42;
const sanitizeCostPerKgOverride = (overrideText: string | undefined, amountText: string | undefined) => {
    const trimmed = String(overrideText || '').trim();
    if (!trimmed) return '';

    const overrideValue = Number.parseFloat(trimmed);
    const amountValue = Number.parseFloat(String(amountText || '0'));
    if (!Number.isFinite(overrideValue) || overrideValue <= 0 || !Number.isFinite(amountValue) || amountValue <= 0) {
        return '';
    }

    if (overrideValue >= 100 && amountValue >= 100) return '';
    if (overrideValue >= amountValue * 0.2) return '';
    return trimmed;
};

const getTodayLocalISO = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const normalizeCategories = (input: any): CostCategory[] => {
    if (!Array.isArray(input)) return makeDefaults();

    const grouped = new Map<string, CostCategory>();
    const ensureCategory = (name: string) => {
        if (!grouped.has(name)) {
            grouped.set(name, { id: generateId(), name, items: [] });
        }
        return grouped.get(name)!;
    };

    const repairMalformedItem = (workItemName: string, source: any): CostItem => {
        const sourceName = String(source?.name || '').trim();
        const sourceNameNumber = Number.parseFloat(sourceName);
        const todateFromSource = String(source?.todateAmount || '').trim();
        const ytdFromSource = String(source?.ytdAmount || '').trim();
        const ytdNumber = Number.parseFloat(ytdFromSource || '0');
        const todateNumber = Number.parseFloat(todateFromSource || '0');

        const repaired: CostItem = {
            id: source?.id || generateId(),
            name: workItemName,
            dayAmount: String(source?.dayAmount || '0'),
            lastMonthAmount: String(source?.lastMonthAmount || '0'),
            ytdAmount: ytdFromSource,
            dayCostPerKgOverride: sanitizeCostPerKgOverride(source?.dayCostPerKgOverride, source?.dayAmount),
            todateCostPerKgOverride: sanitizeCostPerKgOverride(source?.todateCostPerKgOverride, source?.todateAmount),
        };

        if (!Number.isNaN(sourceNameNumber) && sourceNameNumber > 0 && (Math.abs(ytdNumber - sourceNameNumber) < 0.001 || todateNumber === 0)) {
            repaired.todateAmount = sourceName;
            if (!repaired.todateCostPerKgOverride && todateNumber > 0) {
                repaired.todateCostPerKgOverride = todateFromSource;
            }
        } else {
            repaired.todateAmount = String(source?.todateAmount || '0');
        }

        return repaired;
    };

    for (const rawCategory of input) {
        const categoryName = String(rawCategory?.name || '').trim();
        const rawItems = Array.isArray(rawCategory?.items) ? rawCategory.items : [];
        if (!categoryName) continue;

        if (ITEM_TO_CATEGORY.has(categoryName) && !KNOWN_CATEGORY_NAMES.has(categoryName)) {
            const bucket = ensureCategory(ITEM_TO_CATEGORY.get(categoryName)!);
            bucket.items.push(repairMalformedItem(categoryName, rawItems[0] || {}));
            continue;
        }

        const bucket = ensureCategory(categoryName);
        for (const rawItem of rawItems) {
            const itemName = String(rawItem?.name || '').trim();
            if (!itemName) continue;
            bucket.items.push({
                ...rawItem,
                id: rawItem?.id || generateId(),
                name: itemName,
                dayCostPerKgOverride: sanitizeCostPerKgOverride(rawItem?.dayCostPerKgOverride, rawItem?.dayAmount),
                todateCostPerKgOverride: sanitizeCostPerKgOverride(rawItem?.todateCostPerKgOverride, rawItem?.todateAmount),
            });
        }
    }

    const normalized = Array.from(grouped.values()).map((category) => ({
        ...category,
        items: category.items.filter((item, index, items) =>
            items.findIndex((candidate) => candidate.name.toLowerCase() === item.name.toLowerCase()) === index,
        ),
    }));

    return normalized.length > 0 ? normalized : makeDefaults();
};

export default function CostAnalysisManager() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const [activeCrop, setActiveCrop] = useState('Tea');
    const [availableCrops, setAvailableCrops] = useState<string[]>(['Tea']);
    const [categories, setCategories] = useState<CostCategory[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(true);
    const [isEditable, setIsEditable] = useState(false);
    const [msg, setMsg] = useState('');
    const [baselineCategories, setBaselineCategories] = useState<CostCategory[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [catDialog, setCatDialog] = useState<{ open: boolean; editId?: string; name: string }>({
        open: false,
        name: '',
    });
    const [itemDialog, setItemDialog] = useState<{
        open: boolean;
        catId: string;
        editId?: string;
        name: string;
    }>({ open: false, catId: '', name: '' });
    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean;
        type: 'cat' | 'item';
        catId: string;
        itemId?: string;
        label: string;
    } | null>(null);
    const [fieldCropMap, setFieldCropMap] = useState<Map<string, string>>(new Map());
    const [weights, setWeights] = useState({ day: 0, todate: 0 });

    // Rates Configuration State
    const [rates, setRates] = useState({
        aththamaWage: localStorage.getItem(`aththamaWage_${userSession.tenantId}`) || '1600',
        overKiloRate: localStorage.getItem(`overKiloRate_${userSession.tenantId}`) || '45',
        cashKiloRate: localStorage.getItem(`cashKiloRate_${userSession.tenantId}`) || '40',
        otHourRate: localStorage.getItem(`otHourRate_${userSession.tenantId}`) || '250',
    });
    const [ratesDialogOpen, setRatesDialogOpen] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const cropColor = CROP_COLORS[activeCrop] || '#2e7d32';
    const canEditSelectedDate = selectedDate === getTodayLocalISO();

    useEffect(() => {
        axios
            .get(`/api/fields?tenantId=${userSession.tenantId}`)
            .then((r) => {
                const crops = Array.from(new Set((r.data || []).map((f: any) => f.cropType).filter(Boolean))) as string[];
                if (crops.length > 0) {
                    setAvailableCrops(crops);
                    setActiveCrop(crops[0]);
                }
                const nextMap = new Map<string, string>();
                (r.data || []).forEach((field: any) => {
                    if (field.name && field.cropType) nextMap.set(String(field.name).toLowerCase(), String(field.cropType).toUpperCase());
                    if (field.id && field.cropType) nextMap.set(String(field.id), String(field.cropType).toUpperCase());
                });
                setFieldCropMap(nextMap);
            })
            .catch(() => setAvailableCrops(['Tea']));
    }, [userSession.tenantId]);

    useEffect(() => {
        setLoading(true);
        setSaved(true);
        axios
            .get('/api/daily-costs', {
                params: { tenantId: userSession.tenantId, cropType: activeCrop, date: selectedDate },
            })
            .then((r) => {
                if (r.status === 200 && r.data?.costData) {
                    const parsed = JSON.parse(r.data.costData);
                    const nextCategories = normalizeCategories(parsed);
                    setCategories(nextCategories);
                    setBaselineCategories(nextCategories);
                    return;
                }
                loadFromConfig();
            })
            .catch(loadFromConfig)
            .finally(() => setLoading(false));

        function loadFromConfig() {
            axios
                .get(`/api/crop-configs?tenantId=${userSession.tenantId}&cropType=${activeCrop}`)
                .then((res) => {
                    if (res.data?.costItems) {
                        const parsed = JSON.parse(res.data.costItems);
                        const nextCategories = normalizeCategories(parsed);
                        setCategories(nextCategories);
                        setBaselineCategories(nextCategories);
                    } else {
                        const nextCategories = makeDefaults();
                        setCategories(nextCategories);
                        setBaselineCategories(nextCategories);
                    }
                })
                .catch(() => {
                    const nextCategories = makeDefaults();
                    setCategories(nextCategories);
                    setBaselineCategories(nextCategories);
                });
        }
    }, [activeCrop, selectedDate, userSession.tenantId]);

    useEffect(() => {
        const reqDateForFetch = new Date(`${selectedDate}T00:00:00`);
        const fwYearBase = reqDateForFetch.getMonth() >= 3 ? reqDateForFetch.getFullYear() : reqDateForFetch.getFullYear() - 1;
        const startFetchStr = `${fwYearBase}-04-01`;

        axios
            .get(`/api/operations/daily-work?tenantId=${userSession.tenantId}&startDate=${startFetchStr}&endDate=${selectedDate}`)
            .then((r) => {
                let dWeight = 0;
                let tWeight = 0;
                const reqDate = new Date(`${selectedDate}T00:00:00`);
                const sYear = reqDate.getFullYear();
                const sMonth = reqDate.getMonth();
                const sDate = reqDate.getDate();

                const works = r.data || [];
                works.forEach((w: any) => {
                    if (!w.bulkWeights) return;
                    try {
                        const bw = JSON.parse(w.bulkWeights);
                        let factorySum = 0;
                        let belongsToCrop = false;

                        for (const key in bw) {
                            if (key !== '__FACTORY__' && fieldCropMap.has(key.toLowerCase())) {
                                if (fieldCropMap.get(key.toLowerCase())?.toUpperCase() === activeCrop.toUpperCase()) {
                                    belongsToCrop = true;
                                }
                            }
                        }

                        if (belongsToCrop && bw.__FACTORY__ && bw.__FACTORY__.factoryWt) {
                            factorySum = Number(bw.__FACTORY__.factoryWt) || 0;
                        }

                        if (factorySum > 0) {
                            const wDateStr = w.workDate;
                            if (!wDateStr) return;
                            const wDate = new Date(`${wDateStr}T00:00:00`);
                            if (wDateStr === selectedDate) dWeight += factorySum;
                            if (wDate.getFullYear() === sYear && wDate.getMonth() === sMonth && wDate.getDate() <= sDate) {
                                tWeight += factorySum;
                            }
                        }
                    } catch {
                        // Ignore malformed bulk weight payloads.
                    }
                });

                setWeights({ day: dWeight, todate: tWeight });
            })
            .catch(() => setWeights({ day: 0, todate: 0 }));
    }, [activeCrop, selectedDate, userSession.tenantId, fieldCropMap]);

    useEffect(() => {
        if (!canEditSelectedDate && isEditable) {
            setIsEditable(false);
            setSaved(true);
            setMsg('Past-day entries are locked. Chief Clerk can edit only the current day.');
        }
    }, [canEditSelectedDate, isEditable]);

    const markDirty = () => setSaved(false);

    const fmtPerKg = (amountText?: string, weight?: number, overrideText?: string) => {
        const amount = parseFloat(amountText || '0');
        const sanitizedOverride = sanitizeCostPerKgOverride(overrideText, amountText);
        if (sanitizedOverride && amount > 0) return sanitizedOverride;
        if (!amount || !weight) return '-';
        return (amount / weight).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const updateDayAmount = (catId: string, itemId: string, value: string) => {
        setCategories((prev) =>
            prev.map((category) =>
                category.id !== catId
                    ? category
                    : {
                          ...category,
                          items: category.items.map((item) =>
                              item.id !== itemId ? item : { ...item, dayAmount: value },
                          ),
                      },
            ),
        );
        markDirty();
    };

    const syncFromMuster = async () => {
        setSyncing(true);
        try {
            // 1. Fetch Attendance for the selected date
            const attRes = await axios.get(`/api/operations/attendance?tenantId=${userSession.tenantId}&date=${selectedDate}`);
            const allAttendance = attRes.data || [];

            // 2. Filter attendance for current active crop only
            // We use the fieldCropMap we built from /api/fields
            const cropAttendance = allAttendance.filter((att: any) => {
                const fieldNameLower = String(att.fieldName || '').toLowerCase();
                const crop = fieldCropMap.get(fieldNameLower);
                return crop && crop.toUpperCase() === activeCrop.toUpperCase();
            });

            // 3. Count Totals
            let workerCount = 0;
            let totalOverKilos = 0;
            let totalCashKilos = 0;
            let totalOtHours = 0;

            cropAttendance.forEach((att: any) => {
                if (att.status === 'ABSENT') return;

                // Total Workers (Permanent & Casual contribute to standard wage)
                if (att.workerType !== 'CONTRACT') {
                    workerCount += (att.status === 'HALF_DAY' ? 0.5 : 1);
                }

                totalOverKilos += (Number(att.overKilos) || 0);
                totalCashKilos += (Number(att.cashKilos) || 0);
                totalOtHours += (Number(att.otHours) || 0);
            });

            // 4. Update Categories with auto-calculated values
            const nextCategories = categories.map((cat) => {
                if (cat.name === 'Plucking') {
                    return {
                        ...cat,
                        items: cat.items.map((item) => {
                            if (item.name === 'Pluckers') return { ...item, dayAmount: String(workerCount * Number(rates.aththamaWage)) };
                            if (item.name === 'Over Kilos') return { ...item, dayAmount: String(totalOverKilos * Number(rates.overKiloRate)) };
                            if (item.name === 'Cash Kilos') return { ...item, dayAmount: String(totalCashKilos * Number(rates.cashKiloRate)) };
                            if (item.name === 'OT Wages') return { ...item, dayAmount: String(totalOtHours * Number(rates.otHourRate)) };
                            return item;
                        }),
                    };
                }
                return cat;
            });

            setCategories(nextCategories);
            markDirty();
            setMsg('Synchronized successfully from muster records.');
        } catch (error) {
            console.error('Sync failed:', error);
            setMsg('Automatic sync failed. Check if muster data is available.');
        } finally {
            setSyncing(false);
        }
    };

    const saveRates = () => {
        localStorage.setItem(`aththamaWage_${userSession.tenantId}`, rates.aththamaWage);
        localStorage.setItem(`overKiloRate_${userSession.tenantId}`, rates.overKiloRate);
        localStorage.setItem(`cashKiloRate_${userSession.tenantId}`, rates.cashKiloRate);
        localStorage.setItem(`otHourRate_${userSession.tenantId}`, rates.otHourRate);
        setRatesDialogOpen(false);
        setMsg('Wage rates updated.');
    };

    const saveCategory = () => {
        const name = catDialog.name.trim();
        if (!name) return;

        if (catDialog.editId) {
            setCategories((prev) => prev.map((category) => (category.id === catDialog.editId ? { ...category, name } : category)));
        } else {
            setCategories((prev) => [...prev, { id: generateId(), name, items: [] }]);
        }

        markDirty();
        setCatDialog({ open: false, name: '' });
    };

    const saveItem = () => {
        const name = itemDialog.name.trim();
        if (!name) return;

        setCategories((prev) =>
            prev.map((category) => {
                if (category.id !== itemDialog.catId) return category;

                if (itemDialog.editId) {
                    return {
                        ...category,
                        items: category.items.map((item) => (item.id === itemDialog.editId ? { ...item, name } : item)),
                    };
                }

                return {
                    ...category,
                    items: [...category.items, { id: generateId(), name }],
                };
            }),
        );

        markDirty();
        setItemDialog({ open: false, catId: '', name: '' });
    };

    const deleteCategory = (catId: string) => {
        setCategories((prev) => prev.filter((category) => category.id !== catId));
        markDirty();
        setDeleteDialog(null);
    };

    const deleteItem = (catId: string, itemId: string) => {
        setCategories((prev) =>
            prev.map((category) =>
                category.id === catId
                    ? { ...category, items: category.items.filter((item) => item.id !== itemId) }
                    : category,
            ),
        );
        markDirty();
        setDeleteDialog(null);
    };

    const handleSave = async () => {
        if (!canEditSelectedDate) {
            setIsEditable(false);
            setMsg('Past-day entries are locked. Chief Clerk can edit only the current day.');
            return;
        }
        try {
            const structureOnly = categories.map((category) => ({
                ...category,
                items: category.items.map((item) => ({ id: item.id, name: item.name })),
            }));

            const manualEntryPayload = categories.map((category) => ({
                id: category.id,
                name: category.name,
                items: category.items.map((item) => ({
                    id: item.id,
                    name: item.name,
                    dayAmount: item.dayAmount || '0',
                })),
            }));

            await axios.post('/api/crop-configs', {
                tenantId: userSession.tenantId,
                cropType: activeCrop,
                costItems: JSON.stringify(structureOnly),
            });

            const saveResponse = await axios.post('/api/daily-costs', {
                tenantId: userSession.tenantId,
                cropType: activeCrop,
                date: selectedDate,
                costData: JSON.stringify(manualEntryPayload),
            });

            if (saveResponse.data?.costData) {
                const parsed = JSON.parse(saveResponse.data.costData);
                const nextCategories = normalizeCategories(parsed);
                setCategories(nextCategories);
                setBaselineCategories(nextCategories);
            }

            setSaved(true);
            setIsEditable(false);
            setMsg('Saved successfully.');
        } catch {
            setMsg('Save failed.');
        }
    };

    const downloadExcel = async (downloadName: string, successMessage: string, emptyMessage: string) => {
        try {
            const response = await axios.get('/api/daily-costs/report-excel', {
                params: { tenantId: userSession.tenantId, cropType: activeCrop, date: selectedDate },
                responseType: 'blob',
                validateStatus: (status) => status >= 200 && status < 300,
            });

            const contentType = String(response.headers['content-type'] || '').toLowerCase();
            const blob: Blob = response.data;

            if (response.status === 204 || !blob || blob.size === 0) {
                setMsg(emptyMessage);
                return;
            }

            if (!contentType.includes('spreadsheetml')) {
                const text = await blob.text();
                let errorMessage = 'Download failed.';

                try {
                    const parsed = JSON.parse(text);
                    errorMessage = parsed.message || errorMessage;
                } catch {
                    if (text.trim()) {
                        errorMessage = text.slice(0, 160);
                    }
                }

                setMsg(errorMessage);
                return;
            }

            const downloadBlob = new Blob([blob], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            const url = URL.createObjectURL(downloadBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = downloadName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            setMsg(successMessage);
        } catch (error: any) {
            const blob: Blob | undefined = error?.response?.data;
            if (blob instanceof Blob) {
                try {
                    const text = await blob.text();
                    const parsed = JSON.parse(text);
                    setMsg(parsed.message || 'Download failed.');
                    return;
                } catch {
                    // Fall back to the generic message below.
                }
            }
            setMsg('Download failed.');
        }
    };

    const handleDownloadSnapshot = async () => {
        await downloadExcel(
            `Cost_Snapshot_${activeCrop}_${selectedDate}.xlsx`,
            'Snapshot downloaded.',
            'No daily snapshot is available for that date yet.',
        );
    };

    const handleDownloadTemplate = async () => {
        await downloadExcel(
            `Cost_Editing_Template_${activeCrop}_${selectedDate}.xlsx`,
            'Excel template downloaded.',
            'No Excel template is available for that date yet.',
        );
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!canEditSelectedDate) {
            setMsg('Past-day entries are locked. Excel upload is allowed only for the current day.');
            e.target.value = '';
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('tenantId', userSession.tenantId);
            formData.append('cropType', activeCrop);
            formData.append('date', selectedDate);

            const response = await axios.post('/api/daily-costs/report-excel', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (response.data?.costData) {
                const parsed = JSON.parse(response.data.costData);
                const nextCategories = normalizeCategories(parsed);
                setCategories(nextCategories);
                setBaselineCategories(nextCategories);
            }

            setSaved(true);
            setIsEditable(false);
            setMsg('Excel uploaded successfully. Field Officer can now view the same report.');
        } catch {
            setMsg('Upload failed. Please use the downloaded template.');
        } finally {
            e.target.value = '';
        }
    };

    const handleCancelEdit = () => {
        setCategories(baselineCategories);
        setSaved(true);
        setIsEditable(false);
        setMsg('Edit cancelled.');
    };

    const catDayTotal = (category: CostCategory) =>
        category.items.reduce((sum, item) => sum + (parseFloat(item.dayAmount || '0') || 0), 0);

    const catFieldTotal = (category: CostCategory, field: keyof CostItem) =>
        category.items.reduce((sum, item) => sum + (parseFloat((item[field] as string) || '0') || 0), 0);

    const fmtAmount = (amountText?: string) => {
        const parsed = parseFloat(String(amountText ?? '').trim());
        if (!Number.isFinite(parsed)) return '-';
        return parsed.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const fmtTotal = (amount: number) =>
        amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <Box sx={{ height: 'calc(100vh - 120px)', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', maxWidth: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} mb={2}>
                <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
                    <Typography variant="h4" fontWeight="bold" sx={{ color: '#1b5e20' }}>
                        Cost Analysis Manager
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Chief Clerk can either use the web system manually or upload/download a simple Excel report.
                    </Typography>
                </Box>
                <Box
                    display="flex"
                    gap={1}
                    alignItems="center"
                    flexWrap="nowrap"
                    sx={{ flex: '0 0 auto', whiteSpace: 'nowrap' }}
                >
                    <TextField
                        type="date"
                        size="small"
                        value={selectedDate}
                        onChange={(e) => {
                            setSelectedDate(e.target.value);
                            setMsg('');
                        }}
                        sx={{ bgcolor: '#fff', borderRadius: 1 }}
                    />
                    {!isEditable ? (
                        <>
                            <Button
                                variant="outlined"
                                startIcon={<SettingsIcon />}
                                onClick={() => setRatesDialogOpen(true)}
                                sx={{ borderColor: '#2e7d32', color: '#2e7d32' }}
                            >
                                Rates Config
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<EditIcon />}
                                onClick={() => setIsEditable(true)}
                                disabled={!canEditSelectedDate}
                                sx={{ bgcolor: '#e65100' }}
                            >
                                Edit Entry
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="contained"
                                startIcon={syncing ? <CircularProgress size={16} color="inherit" /> : <AutorenewIcon />}
                                onClick={syncFromMuster}
                                disabled={syncing}
                                sx={{ bgcolor: '#0277bd', mr: 1 }}
                            >
                                {syncing ? 'Syncing...' : 'Sync from Muster'}
                            </Button>
                            <Button variant="outlined" onClick={handleCancelEdit} sx={{ borderColor: '#9e9e9e', color: '#616161' }}>
                                Cancel
                            </Button>
                            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} sx={{ bgcolor: '#2e7d32' }}>
                                Save
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<DownloadIcon />}
                                onClick={handleDownloadTemplate}
                                sx={{ borderColor: cropColor, color: cropColor }}
                            >
                                Download Excel Sheet
                            </Button>
                        </>
                    )}
                    {isEditable && canEditSelectedDate && (
                        <>
                            <Divider orientation="vertical" flexItem />
                            <Button
                                variant="outlined"
                                startIcon={<UploadIcon />}
                                onClick={() => fileInputRef.current?.click()}
                                sx={{ borderColor: '#f57c00', color: '#f57c00' }}
                            >
                                Upload Excel
                            </Button>
                            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleUpload} />
                        </>
                    )}
                </Box>
            </Box>

            {msg && (
                <Alert severity={msg.includes('failed') ? 'error' : 'info'} sx={{ mb: 2 }}>
                    {msg}
                </Alert>
            )}
            {!canEditSelectedDate && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    This date is locked. Chief Clerk can edit entries only on the current day.
                </Alert>
            )}
            {!saved && isEditable && <Chip label="Unsaved changes" color="warning" size="small" sx={{ mb: 1 }} />}

            <Box sx={{ mt: 5, position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {!isEditable && (
                    <Tooltip title="Download Daily Snapshot">
                        <IconButton
                            onClick={handleDownloadSnapshot}
                            sx={{
                                position: 'absolute',
                                top: -48,
                                right: 10,
                                zIndex: 3,
                                width: 40,
                                height: 40,
                                color: '#fff',
                                bgcolor: '#2e7d32',
                                borderRadius: 1,
                                border: '1px solid #1b5e20',
                                boxShadow: '0 4px 10px rgba(46, 125, 50, 0.22)',
                                '&:hover': { bgcolor: '#1b5e20' },
                            }}
                            aria-label="Download Daily Snapshot"
                        >
                            <DownloadIcon />
                        </IconButton>
                    </Tooltip>
                )}
                <Paper elevation={3} sx={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 2, border: '1px solid #e0e0e0', minHeight: 0, maxWidth: '100%' }}>
                <Box sx={{ borderBottom: '1px solid #e0e0e0', bgcolor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 2 }}>
                    <Tabs
                        value={activeCrop}
                        onChange={(_, v) => setActiveCrop(v)}
                        sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, fontWeight: 'bold', textTransform: 'none' } }}
                    >
                        {availableCrops.map((crop) => (
                            <Tab
                                key={crop}
                                label={crop}
                                value={crop}
                                sx={{
                                    bgcolor: activeCrop === crop ? CROP_COLORS[crop] || '#4caf50' : '#e8e8e8',
                                    color: activeCrop === crop ? '#fff !important' : '#555',
                                }}
                            />
                        ))}
                    </Tabs>
                    <Box display="flex" alignItems="center" gap={0.5}>
                        {isEditable && (
                            <Button
                                variant="text"
                                startIcon={<AddIcon />}
                                onClick={() => setCatDialog({ open: true, name: '' })}
                                sx={{ color: cropColor, fontWeight: 600 }}
                            >
                                Add Category
                            </Button>
                        )}
                    </Box>
                </Box>

                {loading ? (
                    <Box display="flex" justifyContent="center" py={6}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <TableContainer sx={{ flex: 1, minHeight: 0, maxHeight: 'calc(100vh - 320px)', overflowY: 'auto', overflowX: 'hidden' }}>
                        <Table
                            size="small"
                            stickyHeader
                            sx={{
                                width: '100%',
                                tableLayout: 'fixed',
                                '& .MuiTableCell-root': { borderRight: '1px solid #f0f0f0', padding: '4px 10px' },
                                '& .MuiTableHead-root .MuiTableRow-root:first-of-type .MuiTableCell-root': {
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 4,
                                    height: `${HEADER_ROW_ONE_HEIGHT}px`,
                                    backgroundColor: '#fff',
                                    backgroundImage: 'none',
                                    boxShadow: 'inset 0 -1px 0 #e6e6e6',
                                },
                                '& .MuiTableHead-root .MuiTableRow-root:nth-of-type(2) .MuiTableCell-root': {
                                    position: 'sticky',
                                    top: HEADER_ROW_ONE_HEIGHT,
                                    zIndex: 4,
                                    height: `${HEADER_ROW_TWO_HEIGHT}px`,
                                    backgroundColor: '#fff',
                                    backgroundImage: 'none',
                                    boxShadow: 'inset 0 -1px 0 #e6e6e6',
                                },
                                '& .MuiTableHead-root .MuiTableCell-root[rowspan="2"]': {
                                    top: 0,
                                    zIndex: 5,
                                    height: `${HEADER_ROW_ONE_HEIGHT + HEADER_ROW_TWO_HEIGHT}px`,
                                    backgroundColor: '#fff',
                                    backgroundImage: 'none',
                                },
                            }}
                        >
                            <TableHead>
                                <TableRow>
                                    <TableCell rowSpan={2} sx={{ fontWeight: 'bold', width: '24%' }}>Work Item</TableCell>
                                    <TableCell colSpan={2} align="center" sx={{ fontWeight: 'bold', width: '20%', color: '#1b5e20' }}>Day</TableCell>
                                    <TableCell colSpan={2} align="center" sx={{ fontWeight: 'bold', width: '20%', color: '#1b5e20' }}>Todate</TableCell>
                                    <TableCell colSpan={2} align="center" sx={{ fontWeight: 'bold', width: '20%', color: '#555' }}>History</TableCell>
                                    <TableCell rowSpan={2} sx={{ fontWeight: 'bold', textAlign: 'center', width: '12%' }}>Actions</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Amount (Rs.)</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Cost/Kg</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Amount (Rs.)</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Cost/Kg</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Last Month</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>YTD</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {categories.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#888' }}>
                                            <FolderIcon sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
                                            <Typography>No categories yet. Click Add Category to start.</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}

                                {categories.flatMap((category) => {
                                    const rows: React.ReactNode[] = [];

                                    rows.push(
                                        <TableRow key={`${category.id}-header`}>
                                            <TableCell colSpan={8} sx={{ bgcolor: `${cropColor}18`, borderLeft: `4px solid ${cropColor}` }}>
                                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <FolderIcon sx={{ color: cropColor, fontSize: 17 }} />
                                                        <Typography fontWeight="bold" sx={{ color: cropColor }}>
                                                            {category.name}
                                                        </Typography>
                                                        <Chip
                                                            label={`${category.items.length} items`}
                                                            size="small"
                                                            sx={{ height: 18, fontSize: '0.68rem', bgcolor: `${cropColor}33`, color: cropColor }}
                                                        />
                                                    </Box>
                                                    {isEditable && (
                                                        <Box display="flex" alignItems="center" gap={0.5}>
                                                            <Button
                                                                size="small"
                                                                startIcon={<AddIcon />}
                                                                onClick={() => setItemDialog({ open: true, catId: category.id, name: '' })}
                                                                sx={{ color: cropColor, textTransform: 'none' }}
                                                            >
                                                                Add Item
                                                            </Button>
                                                            <Tooltip title="Rename category">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => setCatDialog({ open: true, editId: category.id, name: category.name })}
                                                                    sx={{ color: '#1976d2' }}
                                                                >
                                                                    <EditIcon sx={{ fontSize: 16 }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Delete category">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() =>
                                                                        setDeleteDialog({
                                                                            open: true,
                                                                            type: 'cat',
                                                                            catId: category.id,
                                                                            label: category.name,
                                                                        })
                                                                    }
                                                                    sx={{ color: '#c62828' }}
                                                                >
                                                                    <DeleteIcon sx={{ fontSize: 16 }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    )}
                                                </Box>
                                            </TableCell>
                                        </TableRow>,
                                    );

                                    category.items.forEach((item) => {
                                        rows.push(
                                            <TableRow key={`${category.id}-${item.id}`} sx={{ '&:hover': { bgcolor: '#fafafa' } }}>
                                                <TableCell sx={{ pl: 4 }}>{item.name}</TableCell>
                                                <TableCell align="right">
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        disabled={!isEditable}
                                                        value={item.dayAmount || ''}
                                                        onChange={(e) => updateDayAmount(category.id, item.id, e.target.value)}
                                                        placeholder="0.00"
                                                        sx={{ width: 150 }}
                                                        InputProps={{
                                                            startAdornment: (
                                                                <InputAdornment position="start">
                                                                    <Typography variant="caption">Rs.</Typography>
                                                                </InputAdornment>
                                                            ),
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell align="right" sx={{ color: '#888' }}>
                                                    {fmtPerKg(item.dayAmount, weights.day, item.dayCostPerKgOverride)}
                                                </TableCell>
                                                <TableCell align="right">{fmtAmount(item.todateAmount)}</TableCell>
                                                <TableCell align="right" sx={{ color: '#888' }}>
                                                    {fmtPerKg(item.todateAmount, weights.todate, item.todateCostPerKgOverride)}
                                                </TableCell>
                                                <TableCell align="right">{fmtAmount(item.lastMonthAmount)}</TableCell>
                                                <TableCell align="right">{fmtAmount(item.ytdAmount)}</TableCell>
                                                <TableCell align="center">
                                                    {isEditable && (
                                                        <>
                                                            <Tooltip title="Rename item">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() =>
                                                                        setItemDialog({
                                                                            open: true,
                                                                            catId: category.id,
                                                                            editId: item.id,
                                                                            name: item.name,
                                                                        })
                                                                    }
                                                                    sx={{ color: '#1976d2' }}
                                                                >
                                                                    <EditIcon sx={{ fontSize: 16 }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Delete item">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() =>
                                                                        setDeleteDialog({
                                                                            open: true,
                                                                            type: 'item',
                                                                            catId: category.id,
                                                                            itemId: item.id,
                                                                            label: item.name,
                                                                        })
                                                                    }
                                                                    sx={{ color: '#c62828' }}
                                                                >
                                                                    <DeleteIcon sx={{ fontSize: 16 }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </>
                                                    )}
                                                </TableCell>
                                            </TableRow>,
                                        );
                                    });

                                    if (category.items.length === 0) {
                                        rows.push(
                                            <TableRow key={`${category.id}-empty`}>
                                                <TableCell colSpan={8} sx={{ pl: 6, py: 1.5, color: '#999', fontStyle: 'italic' }}>
                                                    No items yet. Use Add Item to create one.
                                                </TableCell>
                                            </TableRow>,
                                        );
                                    }

                                    rows.push(
                                        <TableRow key={`${category.id}-sum`} sx={{ bgcolor: '#eeeeee' }}>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Total Cost for {category.name}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                                {fmtTotal(catDayTotal(category))}
                                            </TableCell>
                                            <TableCell align="right" sx={{ color: '#888' }}>
                                                {fmtPerKg(String(catDayTotal(category)), weights.day)}
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                                {fmtTotal(catFieldTotal(category, 'todateAmount'))}
                                            </TableCell>
                                            <TableCell align="right" sx={{ color: '#888' }}>
                                                {fmtPerKg(String(catFieldTotal(category, 'todateAmount')), weights.todate)}
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold', color: '#555' }}>
                                                {fmtTotal(catFieldTotal(category, 'lastMonthAmount'))}
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold', color: '#555' }}>
                                                {fmtTotal(catFieldTotal(category, 'ytdAmount'))}
                                            </TableCell>
                                            <TableCell />
                                        </TableRow>,
                                    );

                                    return rows;
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
                </Paper>
            </Box>

            <Dialog open={ratesDialogOpen} onClose={() => setRatesDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ color: '#2e7d32', fontWeight: 'bold' }}>Wage Rates Configuration</DialogTitle>
                <DialogContent dividers>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <TextField
                            label="Standard Daily Wage (Rs.)"
                            value={rates.aththamaWage}
                            onChange={(e) => setRates({ ...rates, aththamaWage: e.target.value })}
                            type="number"
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="Over Kilo Rate (Rs.)"
                            value={rates.overKiloRate}
                            onChange={(e) => setRates({ ...rates, overKiloRate: e.target.value })}
                            type="number"
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="Cash Kilo Rate (Rs.)"
                            value={rates.cashKiloRate}
                            onChange={(e) => setRates({ ...rates, cashKiloRate: e.target.value })}
                            type="number"
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="OT Hour Rate (Rs.)"
                            value={rates.otHourRate}
                            onChange={(e) => setRates({ ...rates, otHourRate: e.target.value })}
                            type="number"
                            fullWidth
                            size="small"
                        />
                        <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
                            These rates are used to automatically calculate costs from the daily muster records.
                        </Alert>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRatesDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={saveRates} sx={{ bgcolor: '#2e7d32' }}>
                        Save Rates
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={catDialog.open} onClose={() => setCatDialog({ open: false, name: '' })} maxWidth="xs" fullWidth>
                <DialogTitle>{catDialog.editId ? 'Rename Category' : 'Add Category'}</DialogTitle>
                <DialogContent dividers>
                    <TextField
                        fullWidth
                        autoFocus
                        label="Category Name"
                        value={catDialog.name}
                        onChange={(e) => setCatDialog((prev) => ({ ...prev, name: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && saveCategory()}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCatDialog({ open: false, name: '' })}>Cancel</Button>
                    <Button variant="contained" onClick={saveCategory} sx={{ bgcolor: '#2e7d32' }}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={itemDialog.open} onClose={() => setItemDialog({ open: false, catId: '', name: '' })} maxWidth="xs" fullWidth>
                <DialogTitle>{itemDialog.editId ? 'Rename Item' : 'Add Item'}</DialogTitle>
                <DialogContent dividers>
                    <TextField
                        fullWidth
                        autoFocus
                        label="Work Item Name"
                        value={itemDialog.name}
                        onChange={(e) => setItemDialog((prev) => ({ ...prev, name: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && saveItem()}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setItemDialog({ open: false, catId: '', name: '' })}>Cancel</Button>
                    <Button variant="contained" onClick={saveItem} sx={{ bgcolor: '#2e7d32' }}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={Boolean(deleteDialog)} onClose={() => setDeleteDialog(null)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ color: '#d32f2f' }}>Confirm Delete</DialogTitle>
                <DialogContent dividers>
                    <Typography>
                        Are you sure you want to delete {deleteDialog?.type === 'cat' ? 'category' : 'item'} <strong>{deleteDialog?.label}</strong>?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialog(null)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={() =>
                            deleteDialog?.type === 'cat'
                                ? deleteCategory(deleteDialog.catId)
                                : deleteItem(deleteDialog!.catId, deleteDialog!.itemId!)
                        }
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
