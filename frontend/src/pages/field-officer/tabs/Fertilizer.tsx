import {
    Box,
    Button,
    CircularProgress,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    useTheme,
    useMediaQuery,
    Grid,
    Divider as MuiDivider,
    Card,
} from '@mui/material';
import { Assignment as AssignmentIcon, TableChart as TableChartIcon, Add as AddIcon, Close as CloseIcon, Check as CheckIcon, Edit as EditIcon } from '@mui/icons-material';
import { useMemo, useState, useEffect } from 'react';
import axios from 'axios';

type CropKey = string | 'ALL';

type FieldRow = {
    fieldId: string;
    divisionId: string;
    name: string;
    acreage?: number;
    cropType?: string;
    spa?: number;
    bushCount?: number;
};

type FertilizerMaster = {
    id: string;
    tenantId: string;
    name: string;
    nitrogenPercent: number;
};

type FertilizerApplication = {
    id?: string;
    tenantId: string;
    divisionId: string;
    fieldId: string;
    year: number;
    month: number; // 1..12
    fertilizerId: string;
    qtyKg: number;
};

type TargetRatio = {
    id?: string;
    tenantId: string;
    divisionId: string;
    cropType: string;
    fieldId: string;
    planMonth: string; // YYYY-MM
    targetRatioPercent: number;
    crop12m?: number;
};

type AppDisplayRow = {
    rowId: string;       // unique UI key (real app id or temp)
    appId?: string;      // real DB id if persisted
    fieldId: string;
    month: number;
    fertilizerId: string;
    qtyKg: number;
};

type ProgrammeRow = {
    id: string;
    fieldId: string;
    fieldNo: string;
    extentAc: number;
    bushCount: number;
    spa: number;
    crop12m: number;
    fert12m: number;
    nitrogen12m: number;
    ratioPercent: number | null;
    targetRatioPercent: number;
    requirementN: number | null;
    prev1: number;
    prev2: number;
    prev3: number;
};

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const monthLabel = (m: number) => monthNames[Math.max(1, Math.min(12, m)) - 1];

const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;
const fullMonthLabel = (m: number) => fullMonthNames[Math.max(1, Math.min(12, m)) - 1];
const toYm = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const parseYm = (ym: string) => {
    const [y, m] = ym.split('-').map((x) => Number(x));
    return { y: y || new Date().getFullYear(), m: m || new Date().getMonth() + 1 };
};
const addMonths = (ym: string, delta: number) => {
    const { y, m } = parseYm(ym);
    const d = new Date(y, m - 1, 1);
    d.setMonth(d.getMonth() + delta);
    return toYm(d);
};
const ymToYearMonth = (ym: string) => {
    const { y, m } = parseYm(ym);
    return { year: y, month: m };
};

export default function Fertilizer() {
    const [tab, setTab] = useState<'ENTRY' | 'PROGRAMME'>('PROGRAMME');
    const [activeCrop, setActiveCrop] = useState<CropKey>('TEA');
    const [divisions, setDivisions] = useState<any[]>([]);
    const [selectedDivision, setSelectedDivision] = useState<string>('');
    const [fields, setFields] = useState<FieldRow[]>([]);
    const [masters, setMasters] = useState<FertilizerMaster[]>([]);
    const [apps, setApps] = useState<FertilizerApplication[]>([]);
    const [targets, setTargets] = useState<TargetRatio[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingEntry, setSavingEntry] = useState(false);
    const [savingTargets, setSavingTargets] = useState(false);
    const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
    const [editTargetValue, setEditTargetValue] = useState<string | number>('');
    const [editingBushCountId, setEditingBushCountId] = useState<string | null>(null);
    const [editBushCountValue, setEditBushCountValue] = useState<string | number>('');
    const [editingCropId, setEditingCropId] = useState<string | null>(null);
    const [editCropValue, setEditCropValue] = useState<string | number>('');
    const [entryMode, setEntryMode] = useState<boolean>(false);
    const [originalApps, setOriginalApps] = useState<FertilizerApplication[]>([]);
    const [newMasterRow, setNewMasterRow] = useState<{ id: string; name: string; nitrogenPercent: string | number } | null>(null);
    const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);
    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<{ fertilizerId: string; qtyKg: string }>({ fertilizerId: '', qtyKg: '0' });
    
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [planMonth, setPlanMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const planYear = useMemo(() => ymToYearMonth(planMonth).year, [planMonth]);
    const [entryYear, setEntryYear] = useState<number>(planYear);
    const [selectedFieldId, setSelectedFieldId] = useState<string>('ALL');

    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;
    const isReadOnly = userSession.role === 'ESTATE_ADMIN';

    useEffect(() => {
        if (tenantId) void fetchDivisions();
    }, [tenantId]);

    const fetchDivisions = async () => {
        try {
            const res = await axios.get(`/api/divisions?tenantId=${tenantId}`);
            let divs = res.data;
            const assigned = userSession.divisionAccess || [];
            if (userSession.role === 'FIELD_OFFICER' && assigned.length > 0) {
                divs = divs.filter((d: any) => assigned.includes(d.divisionId));
            }
            setDivisions(divs);
            if (divs.length > 0) {
                setSelectedDivision(divs[0].divisionId);
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error("Failed to fetch divisions", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedDivision && tenantId) {
            void loadAll();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDivision, tenantId, entryYear, planMonth, activeCrop]);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [fieldsRes, masterRes, appsRes, targetRes] = await Promise.all([
                axios.get(`/api/fields?divisionId=${selectedDivision}`),
                axios.get(`/api/fertilizer-master`, { params: { tenantId } }),
                axios.get(`/api/fertilizer-applications`, { params: { tenantId, divisionId: selectedDivision } }),
                axios.get(`/api/fertilizer-target-ratio`, {
                    params: {
                        tenantId,
                        divisionId: selectedDivision,
                        cropType: activeCrop === 'ALL' ? 'TEA' : activeCrop,
                        planMonth,
                    },
                }),
            ]);
            const fieldData: FieldRow[] = (fieldsRes.data || []).map((f: any) => ({
                ...f,
                cropType: f.cropType ? String(f.cropType).trim().toUpperCase() : '',
            }));
            setFields(fieldData);
            setMasters(masterRes.data || []);
            setApps(appsRes.data || []);
            setTargets(targetRes.data || []);
        } catch (e) {
            console.error('Failed to load fertilizer module data', e);
        } finally {
            setLoading(false);
        }
    };

    const fertById = useMemo(() => new Map(masters.map((m) => [String(m.id), m])), [masters]);

    const entryGroups = useMemo(() => {
        const relevantApps = apps.filter(
            (a) => a.year === entryYear && (selectedFieldId === 'ALL' || String(a.fieldId) === selectedFieldId),
        );
        const fieldsForGrid =
            selectedFieldId === 'ALL' ? fields : fields.filter((f) => String(f.fieldId) === selectedFieldId);

        return fieldsForGrid.map((field) => ({
            field,
            months: Array.from({ length: 12 }, (_, idx) => {
                const m = idx + 1;
                const monthApps = relevantApps.filter(
                    (a) => String(a.fieldId) === String(field.fieldId) && a.month === m,
                );
                const rows: AppDisplayRow[] = monthApps.map((a) => ({
                    rowId: String(a.id || `tmp-${field.fieldId}-${m}`),
                    appId: a.id,
                    fieldId: String(field.fieldId),
                    month: m,
                    fertilizerId: String(a.fertilizerId),
                    qtyKg: Number(a.qtyKg),
                }));
                const totalQty = rows.reduce((s, r) => s + r.qtyKg, 0);
                const totalN = rows.reduce((s, r) => {
                    const fert = fertById.get(r.fertilizerId);
                    return s + r.qtyKg * (Number(fert?.nitrogenPercent || 0) / 100);
                }, 0);
                return { month: m, rows, totalQty, totalN };
            }),
        }));
    }, [apps, entryYear, selectedFieldId, fields, fertById]);

    const availableCrops: CropKey[] = useMemo(() => {
        const set = new Set<string>();
        fields.forEach((f) => {
            if (f.cropType) set.add(String(f.cropType).trim().toUpperCase());
        });
        const list = Array.from(set);
        return (list.length ? list : ['TEA']) as CropKey[];
    }, [fields]);

    useEffect(() => {
        if (activeCrop === 'ALL') return;
        if (!availableCrops.includes(activeCrop as CropKey)) {
            setActiveCrop(availableCrops[0] as CropKey);
        }
    }, [availableCrops, activeCrop]);

    const addFertToMonth = (fieldId: string, month: number) => {
        const tmpId = `tmp-${fieldId}-${month}-${Date.now()}`;
        const defaultFert = masters[0] ? String(masters[0].id) : '';
        setApps((prev) => [
            ...prev,
            { id: tmpId, tenantId, divisionId: selectedDivision, fieldId, year: entryYear, month, fertilizerId: defaultFert, qtyKg: 0 },
        ]);
        setEditingRowId(tmpId);
        setEditValues({ fertilizerId: defaultFert, qtyKg: '' });
    };

    const deleteAppRow = (rowId: string, appId?: string) => {
        setApps((prev) => prev.filter((a) => String(a.id) !== rowId));
        if (appId && !String(appId).startsWith('tmp-')) setPendingDeletes((p) => [...p, appId]);
        if (editingRowId === rowId) setEditingRowId(null);
    };

    const startEditRow = (row: AppDisplayRow) => {
        setEditingRowId(row.rowId);
        setEditValues({ fertilizerId: row.fertilizerId, qtyKg: String(row.qtyKg) });
    };

    const saveRowEdit = (rowId: string) => {
        setApps((prev) =>
            prev.map((a) =>
                String(a.id) === rowId ? { ...a, fertilizerId: editValues.fertilizerId, qtyKg: Number(editValues.qtyKg) || 0 } : a,
            ),
        );
        setEditingRowId(null);
    };


    const saveEntry = async () => {
        setSavingEntry(true);
        try {
            for (const id of pendingDeletes) await axios.delete(`/api/fertilizer-applications/${id}`);
            setPendingDeletes([]);
            const appsToSave = apps
                .filter((a) => a.year === entryYear && a.fertilizerId && String(a.fertilizerId).trim() !== '')
                .map((a) => (String(a.id || '').startsWith('tmp-') ? { ...a, id: undefined } : a));
            if (appsToSave.length > 0) await axios.put('/api/fertilizer-applications', appsToSave);
            await loadAll();
            setEntryMode(false);
            setEditingRowId(null);
        } catch (e) {
            console.error('Failed to save fertilizer entries', e);
            alert('Failed to save. Please try again.');
        } finally {
            setSavingEntry(false);
        }
    };

    const enterEditMode = () => {
        setOriginalApps([...apps]);
        setEntryMode(true);
    };

    const cancelEdit = () => {
        setApps(originalApps);
        setPendingDeletes([]);
        setEditingRowId(null);
        setEntryMode(false);
    };

    const addMaster = async (name: string, nitrogenPercent: number) => {
        await axios.post('/api/fertilizer-master', { tenantId, name, nitrogenPercent });
        await loadAll();
    };

    const deleteMaster = async (id: string) => {
        await axios.delete(`/api/fertilizer-master/${id}`);
        await loadAll();
    };

    const historyMonths = useMemo(() => {
        // Prev month 1/2/3 are months before planMonth.
        return [1, 2, 3].map((n) => {
            const ym = addMonths(planMonth, -n);
            const { month } = ymToYearMonth(ym);
            return { ym, label: monthLabel(month) };
        });
    }, [planMonth]);



    const programmeRows: ProgrammeRow[] = useMemo(() => {
        const cropFilter = (activeCrop === 'ALL' ? null : activeCrop);
        const relevantFields = fields.filter((f) => !cropFilter || String(f.cropType || '').toUpperCase() === cropFilter);

        const fert12mByFieldId = new Map<string, number>();
        const nitrogen12mByFieldId = new Map<string, number>();
        const prevMonthTotalsByFieldId = new Map<string, Record<string, number>>();

        const endYm = addMonths(planMonth, -1);
        const startYm = addMonths(planMonth, -12);

        const inYmRange = (year: number, month: number) => {
            const ym = `${year}-${String(month).padStart(2, '0')}`;
            return ym >= startYm && ym <= endYm;
        };

        apps.forEach((a) => {
            if (!inYmRange(a.year, a.month)) return;
            const fieldId = String(a.fieldId);
            const qty = Number(a.qtyKg || 0);
            const master = fertById.get(String(a.fertilizerId));
            const nPct = master?.nitrogenPercent ?? 0;
            fert12mByFieldId.set(fieldId, (fert12mByFieldId.get(fieldId) || 0) + qty);
            nitrogen12mByFieldId.set(fieldId, (nitrogen12mByFieldId.get(fieldId) || 0) + qty * (nPct / 100));

            // Prev 1/2/3 totals
            for (const hm of historyMonths) {
                const { year, month } = ymToYearMonth(hm.ym);
                if (a.year === year && a.month === month) {
                    const bucket = prevMonthTotalsByFieldId.get(fieldId) || {};
                    bucket[hm.ym] = (bucket[hm.ym] || 0) + qty;
                    prevMonthTotalsByFieldId.set(fieldId, bucket);
                }
            }
        });

        const targetMap = new Map<string, TargetRatio>();
        targets.forEach((t) => targetMap.set(String(t.fieldId), t));

        return relevantFields.map((f) => {
            const extent = Number(f.acreage || 0);
            const bushCount = Number(f.bushCount || (f.spa && extent ? Math.round(f.spa * extent) : 0));
            const spa = Number(f.spa || (extent > 0 && bushCount > 0 ? Math.round(bushCount / extent) : 0));
            const fert12m = fert12mByFieldId.get(String(f.fieldId)) || 0;
            const nitrogen12m = nitrogen12mByFieldId.get(String(f.fieldId)) || 0;
            const existingTarget = targetMap.get(String(f.fieldId));
            const crop12m = existingTarget?.crop12m ?? 0;
            const ratioPercent = crop12m > 0 && nitrogen12m > 0 ? (nitrogen12m / crop12m) * 100 : null;
            const targetRatioPercent = existingTarget?.targetRatioPercent ?? 12;
            const requirementN = crop12m > 0 ? (crop12m / 12) * (targetRatioPercent / 100) : null;

            const prevBucket = prevMonthTotalsByFieldId.get(String(f.fieldId)) || {};
            const prev1 = prevBucket[historyMonths[0].ym] || 0;
            const prev2 = prevBucket[historyMonths[1].ym] || 0;
            const prev3 = prevBucket[historyMonths[2].ym] || 0;

            return {
                id: String(f.fieldId),
                fieldId: String(f.fieldId),
                fieldNo: f.name,
                extentAc: extent,
                bushCount,
                spa,
                crop12m,
                fert12m,
                nitrogen12m,
                ratioPercent,
                targetRatioPercent,
                requirementN,
                prev1,
                prev2,
                prev3,
            };
        });
    }, [activeCrop, apps, fertById, fields, historyMonths, planMonth, targets]);

    const saveSingleTarget = async (row: ProgrammeRow) => {
        setSavingTargets(true);
        try {
            const cropType = activeCrop === 'ALL' ? 'TEA' : activeCrop;
            const existingTarget = targets.find(t => String(t.fieldId) === row.fieldId);
            const payload: TargetRatio[] = [{
                tenantId,
                divisionId: selectedDivision,
                cropType,
                fieldId: row.fieldId,
                planMonth,
                targetRatioPercent: Number(editTargetValue) || 0,
                crop12m: existingTarget?.crop12m ?? 0,
            }];
            await axios.put('/api/fertilizer-target-ratio', payload);
            await loadAll();
            setEditingTargetId(null);
        } catch (e) {
            console.error('Failed to save target ratio', e);
            alert('Failed to save target ratio');
        } finally {
            setSavingTargets(false);
        }
    };

    const saveSingleCrop = async (row: ProgrammeRow) => {
        setSavingTargets(true);
        try {
            const cropType = activeCrop === 'ALL' ? 'TEA' : activeCrop;
            const existingTarget = targets.find(t => String(t.fieldId) === row.fieldId);
            const payload: TargetRatio[] = [{
                tenantId,
                divisionId: selectedDivision,
                cropType,
                fieldId: row.fieldId,
                planMonth,
                targetRatioPercent: existingTarget?.targetRatioPercent ?? 12,
                crop12m: Math.max(0, Number(editCropValue) || 0),
            }];
            await axios.put('/api/fertilizer-target-ratio', payload);
            await loadAll();
            setEditingCropId(null);
        } catch (e) {
            console.error('Failed to save manual crop', e);
            alert('Failed to save manual crop');
        } finally {
            setSavingTargets(false);
        }
    };

    const saveSingleBushCount = async (row: ProgrammeRow) => {
        setSavingTargets(true);
        try {
            const originalField = fields.find(f => String(f.fieldId) === row.fieldId);
            if (!originalField) return;
            
            const updatedField = {
                ...originalField,
                bushCount: Math.round(Number(editBushCountValue) || 0)
            };
            
            await axios.put(`/api/fields/${row.fieldId}`, updatedField);
            await loadAll();
            setEditingBushCountId(null);
        } catch (e) {
            console.error('Failed to save bush count', e);
            alert('Failed to save bush count');
        } finally {
            setSavingTargets(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 1, sm: 1.5, md: 2 }, height: isMobile ? 'auto' : 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={isMobile ? 'stretch' : 'center'} gap={1.5}>
                <Typography variant={isMobile ? "h6" : "h5"} fontWeight="900" sx={{ color: '#1b5e20', letterSpacing: -0.5 }}>
                    Fertilizer Programme
                </Typography>
                <Stack direction={isMobile ? "column" : "row"} spacing={1} alignItems="center" sx={{ width: { xs: '100%', sm: 'auto' } }}>
                    <TextField
                        type="month"
                        size="small"
                        label="Plan Month"
                        value={planMonth}
                        onChange={(e) => setPlanMonth(e.target.value)}
                        sx={{ minWidth: { xs: '100%', sm: 170 } }}
                        InputLabelProps={{ shrink: true }}
                    />
                    <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }}>
                        <InputLabel>Division</InputLabel>
                        <Select
                            value={selectedDivision}
                            label="Division"
                            onChange={(e) => setSelectedDivision(e.target.value)}
                        >
                            {divisions.map((div: any) => (
                                <MenuItem key={div.divisionId} value={div.divisionId}>
                                    {div.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Stack>
            </Box>

            <Paper
                elevation={3}
                sx={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    border: '1px solid #e0e0e0',
                    borderRadius: 2,
                }}
            >
                <Box
                    sx={{
                        px: 2,
                        pt: 1.25,
                        pb: 1,
                        bgcolor: '#ffffff',
                        borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
                    }}
                >
                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={1.5}
                        alignItems={isMobile ? "stretch" : "center"}
                        justifyContent="space-between"
                    >
                        <Tabs
                            value={tab}
                            onChange={(_, v) => setTab(v)}
                            TabIndicatorProps={{ style: { display: 'none' } }}
                            sx={{ minHeight: 48 }}
                        >
                            <Tab
                                value="ENTRY"
                                label="Entry"
                                icon={<AssignmentIcon />}
                                iconPosition="start"
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 900,
                                    fontSize: isMobile ? '0.85rem' : '1.05rem',
                                    minHeight: isMobile ? 40 : 48,
                                    mr: isMobile ? 0 : 3,
                                    px: isMobile ? 1.5 : 3,
                                    color: 'text.secondary',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '8px',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    zIndex: 1,
                                    transition: 'all 0.3s ease',
                                    '&.Mui-selected': {
                                        color: '#1b5e20',
                                        bgcolor: '#f1f8e9',
                                        borderColor: '#4caf50',
                                    },
                                }}
                            />
                            <Tab
                                value="PROGRAMME"
                                label="Fertilizer Programme"
                                icon={<TableChartIcon />}
                                iconPosition="start"
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 900,
                                    fontSize: isMobile ? '0.85rem' : '1.05rem',
                                    minHeight: isMobile ? 40 : 48,
                                    ml: isMobile ? 0 : 1,
                                    px: isMobile ? 1.5 : 3,
                                    color: 'text.secondary',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '8px',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    zIndex: 1,
                                    transition: 'all 0.3s ease',
                                    '&.Mui-selected': {
                                        color: '#1b5e20',
                                        bgcolor: '#f1f8e9',
                                        borderColor: '#4caf50',
                                    },
                                }}
                            />
                        </Tabs>

                        <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 180, mt: isMobile ? 1 : 0 }}>
                            <InputLabel>Crop</InputLabel>
                            <Select
                                value={activeCrop}
                                label="Crop"
                                onChange={(e) => setActiveCrop(e.target.value as CropKey)}
                            >
                                {availableCrops.map((c) => (
                                    <MenuItem key={c} value={c}>
                                        {c.charAt(0) + c.slice(1).toLowerCase()}
                                    </MenuItem>
                                ))}
                                <MenuItem value="ALL">General</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </Box>

                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" width="100%" sx={{ flex: 1 }}>
                        <CircularProgress color="success" />
                    </Box>
                ) : tab === 'ENTRY' ? (
                    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, p: { xs: 1, sm: 1.5 }, gap: 2.5, overflow: 'auto' }}>
                        <Paper
                            elevation={2}
                            sx={{
                                flex: 1,
                                minWidth: 0,
                                border: '1.5px solid rgba(46,125,50,0.3)',
                                borderRadius: 2,
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <Box sx={{ bgcolor: '#2e7d32', px: 2, py: 1 }}>
                                <Typography sx={{ fontWeight: 900, color: '#fff', fontSize: '0.95rem', letterSpacing: 0.3 }}>
                                    Monthly Fertilizer Detail
                                </Typography>
                            </Box>
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={1.25}
                                alignItems={{ xs: 'stretch', sm: 'center' }}
                                justifyContent="space-between"
                                sx={{ px: 2, py: 1.25 }}
                                flexWrap="wrap"
                            >
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap="wrap">
                                    <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 110 } }}>
                                        <InputLabel>Year</InputLabel>
                                        <Select
                                            value={entryYear}
                                            label="Year"
                                            onChange={(e) => setEntryYear(Number(e.target.value))}
                                        >
                                            {Array.from({ length: 4 }).map((_, idx) => {
                                                const y = planYear - 1 + idx;
                                                return (<MenuItem key={y} value={y}>{y}</MenuItem>);
                                            })}
                                        </Select>
                                    </FormControl>
                                    <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 160 } }}>
                                        <InputLabel>Field</InputLabel>
                                        <Select
                                            value={selectedFieldId}
                                            label="Field"
                                            onChange={(e) => setSelectedFieldId(String(e.target.value))}
                                        >
                                            <MenuItem value="ALL">All Fields</MenuItem>
                                            {fields.map((f) => (<MenuItem key={f.fieldId} value={String(f.fieldId)}>{f.name}</MenuItem>))}
                                        </Select>
                                    </FormControl>
                                </Stack>

                                <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
                                    {!isReadOnly && (
                                        !entryMode ? (
                                            <Button onClick={enterEditMode} variant="contained" color="success" fullWidth sx={{ fontWeight: 800, px: 2.5, width: { xs: '100%', sm: 'auto' } }}>
                                                Edit Entry
                                            </Button>
                                        ) : (
                                            <>
                                                <Button onClick={saveEntry} variant="contained" color="success" disabled={savingEntry} sx={{ fontWeight: 800, flex: { xs: 1, sm: 'none' } }}>
                                                    {savingEntry ? 'Saving…' : 'Save'}
                                                </Button>
                                                <Button onClick={cancelEdit} variant="outlined" color="error" sx={{ fontWeight: 800, flex: { xs: 1, sm: 'none' } }} disabled={savingEntry}>
                                                    Cancel
                                                </Button>
                                            </>
                                        )
                                    )}
                                </Stack>
                            </Stack>

                            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: isMobile ? 1 : 0 }}>
                                {isMobile ? (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {entryGroups.map((group) => (
                                            <Card key={group.field.fieldId} variant="outlined" sx={{ borderRadius: 2, border: '1px solid rgba(46,125,50,0.15)' }}>
                                                <Box sx={{ bgcolor: '#f1f8e9', p: 1.5, borderBottom: '1px solid rgba(46,125,50,0.1)' }}>
                                                    <Typography variant="subtitle2" fontWeight="900" color="#1b5e20">{group.field.name}</Typography>
                                                </Box>
                                                <Box sx={{ p: 1 }}>
                                                    {group.months.map((mInfo) => (
                                                        <Box key={mInfo.month} sx={{ mb: mInfo.rows.length > 0 || entryMode ? 1.5 : 0 }}>
                                                            {(mInfo.rows.length > 0 || entryMode) && (
                                                                <Typography variant="caption" fontWeight="900" sx={{ color: '#4caf50', textTransform: 'uppercase', px: 1 }}>
                                                                    {monthLabel(mInfo.month)}
                                                                </Typography>
                                                            )}
                                                            <Stack spacing={1} sx={{ mt: 0.5 }}>
                                                                {mInfo.rows.map((row) => (
                                                                    <Box key={row.rowId} sx={{ p: 1, bgcolor: '#ffffff', border: '1px solid #eee', borderRadius: 1.5 }}>
                                                                        {editingRowId === row.rowId ? (
                                                                            <Stack spacing={1.5}>
                                                                                <FormControl fullWidth size="small">
                                                                                    <Select
                                                                                        value={editValues.fertilizerId}
                                                                                        onChange={(e) => setEditValues({ ...editValues, fertilizerId: e.target.value })}
                                                                                    >
                                                                                        {masters.map((m) => (
                                                                                            <MenuItem key={m.id} value={String(m.id)}>{m.name}</MenuItem>
                                                                                        ))}
                                                                                    </Select>
                                                                                </FormControl>
                                                                                <TextField fullWidth size="small" label="Qty (kg)" type="number" value={editValues.qtyKg} onChange={(e) => setEditValues({ ...editValues, qtyKg: e.target.value })} />
                                                                                <Stack direction="row" spacing={1}>
                                                                                    <Button fullWidth variant="contained" color="success" size="small" onClick={() => saveRowEdit(row.rowId)}>Save</Button>
                                                                                    <Button fullWidth variant="outlined" color="error" size="small" onClick={() => setEditingRowId(null)}>Cancel</Button>
                                                                                </Stack>
                                                                            </Stack>
                                                                        ) : (
                                                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                                                <Box>
                                                                                    <Typography variant="body2" fontWeight="700">{masters.find(m => String(m.id) === row.fertilizerId)?.name || 'Unknown'}</Typography>
                                                                                    <Typography variant="caption" color="text.secondary">{row.qtyKg} kg | N: {(row.qtyKg * (Number(masters.find(m => String(m.id) === row.fertilizerId)?.nitrogenPercent || 0) / 100)).toFixed(1)} kg</Typography>
                                                                                </Box>
                                                                                {entryMode && (
                                                                                    <Stack direction="row" spacing={0.5}>
                                                                                        <IconButton size="small" color="primary" onClick={() => startEditRow(row)}><EditIcon fontSize="small" /></IconButton>
                                                                                        <IconButton size="small" color="error" onClick={() => deleteAppRow(row.rowId, row.appId)}><CloseIcon fontSize="small" /></IconButton>
                                                                                    </Stack>
                                                                                )}
                                                                            </Stack>
                                                                        )}
                                                                    </Box>
                                                                ))}
                                                                {entryMode && (
                                                                    <Button startIcon={<AddIcon />} size="small" fullWidth variant="outlined" onClick={() => addFertToMonth(group.field.fieldId, mInfo.month)}>
                                                                        Add {monthLabel(mInfo.month)} record
                                                                    </Button>
                                                                )}
                                                            </Stack>
                                                        </Box>
                                                    ))}
                                                </Box>
                                            </Card>
                                        ))}
                                    </Box>
                                ) : (
                                    <Table size="small" stickyHeader sx={{ minWidth: 800 }}>
                                        <TableHead>
                                            <TableRow>
                                                {['Field','Month','Fertilizer','Qty','N (kg)','Total Qty','Total N'].map((h, i) => (
                                                    <TableCell key={h} sx={{ fontWeight: 800, bgcolor: '#e8f5e9', fontSize: '0.82rem', textAlign: i >= 3 ? 'right' : 'left' }}>{h}</TableCell>
                                                ))}
                                                {!isReadOnly && entryMode && <TableCell sx={{ bgcolor: '#e8f5e9', width: 72 }} />}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {entryGroups.map((group) => {
                                                const totalRows = group.months.reduce((acc, m) => acc + Math.max(1, m.rows.length), 0);
                                                let fieldRowRendered = false;
                                                return group.months.map((mInfo, mIdx) => {
                                                    const innerRows = mInfo.rows.length || 1;
                                                    let monthRowRendered = false;
                                                    if (mInfo.rows.length === 0) {
                                                        return (
                                                            <TableRow key={`empty-${group.field.fieldId}-${mIdx}`}>
                                                                {!fieldRowRendered && <TableCell rowSpan={totalRows} sx={{ fontWeight: 900 }}>{group.field.name}</TableCell>}
                                                                <TableCell sx={{ fontWeight: 700 }}>{monthLabel(mInfo.month)}</TableCell>
                                                                <TableCell colSpan={3} sx={{ fontStyle: 'italic', color: 'text.disabled' }}>-</TableCell>
                                                                <TableCell align="right">-</TableCell>
                                                                <TableCell align="right">-</TableCell>
                                                                {!isReadOnly && entryMode && (
                                                                    <TableCell align="center">
                                                                        <IconButton size="small" color="success" onClick={() => addFertToMonth(group.field.fieldId, mInfo.month)}><AddIcon /></IconButton>
                                                                    </TableCell>
                                                                )}
                                                                {(() => { fieldRowRendered = true; return null; })()}
                                                            </TableRow>
                                                        );
                                                    }
                                                    return mInfo.rows.map((row, rIdx) => {
                                                        const isEditing = editingRowId === row.rowId;
                                                        const nKg = (row.qtyKg * (Number(masters.find(m => String(m.id) === row.fertilizerId)?.nitrogenPercent || 0) / 100)).toFixed(1);
                                                        return (
                                                            <TableRow key={row.rowId}>
                                                                {!fieldRowRendered && <TableCell rowSpan={totalRows} sx={{ fontWeight: 900 }}>{group.field.name}</TableCell>}
                                                                {!monthRowRendered && <TableCell rowSpan={innerRows} sx={{ fontWeight: 700 }}>{monthLabel(mInfo.month)}</TableCell>}
                                                                <TableCell>
                                                                    {isEditing ? (
                                                                        <Select size="small" fullWidth value={editValues.fertilizerId} onChange={(e) => setEditValues({...editValues, fertilizerId: e.target.value})}>
                                                                            {masters.map(m => <MenuItem key={m.id} value={String(m.id)}>{m.name}</MenuItem>)}
                                                                        </Select>
                                                                    ) : masters.find(m => String(m.id) === row.fertilizerId)?.name || '-'}
                                                                </TableCell>
                                                                <TableCell align="right">
                                                                    {isEditing ? <TextField size="small" type="number" value={editValues.qtyKg} onChange={(e) => setEditValues({...editValues, qtyKg: e.target.value})} /> : row.qtyKg}
                                                                </TableCell>
                                                                <TableCell align="right">{nKg}</TableCell>
                                                                {!monthRowRendered && (
                                                                    <>
                                                                        <TableCell align="right" rowSpan={innerRows} sx={{ fontWeight: 800, bgcolor: 'rgba(0,0,0,0.02)' }}>{mInfo.totalQty}</TableCell>
                                                                        <TableCell align="right" rowSpan={innerRows} sx={{ fontWeight: 800, bgcolor: 'rgba(0,0,0,0.02)' }}>{mInfo.totalN.toFixed(1)}</TableCell>
                                                                    </>
                                                                )}
                                                                {!isReadOnly && entryMode && (
                                                                    <TableCell align="center">
                                                                        <Stack direction="row" spacing={0.5} justifyContent="center">
                                                                            {isEditing ? (
                                                                                <>
                                                                                    <IconButton size="small" color="success" onClick={() => saveRowEdit(row.rowId)}><CheckIcon /></IconButton>
                                                                                    <IconButton size="small" color="error" onClick={() => setEditingRowId(null)}><CloseIcon /></IconButton>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <IconButton size="small" color="primary" onClick={() => startEditRow(row)}><EditIcon /></IconButton>
                                                                                    <IconButton size="small" color="error" onClick={() => deleteAppRow(row.rowId, row.appId)}><CloseIcon /></IconButton>
                                                                                    {rIdx === 0 && <IconButton size="small" color="success" onClick={() => addFertToMonth(group.field.fieldId, mInfo.month)}><AddIcon /></IconButton>}
                                                                                </>
                                                                            )}
                                                                        </Stack>
                                                                    </TableCell>
                                                                )}
                                                                {(() => { fieldRowRendered = true; monthRowRendered = true; return null; })()}
                                                            </TableRow>
                                                        );
                                                    });
                                                }).flat();
                                            })}
                                        </TableBody>
                                    </Table>
                                )}
                            </Box>
                        </Paper>

                        <Paper elevation={2} sx={{ width: { xs: '100%', lg: 320 }, flexShrink: 0, alignSelf: 'flex-start', border: '1.5px solid rgba(46,125,50,0.3)', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
                            <Box sx={{ bgcolor: '#388e3c', px: 2, py: 1 }}>
                                <Typography sx={{ fontWeight: 900, color: '#fff', fontSize: '0.95rem' }}>Fertilizer Master</Typography>
                            </Box>
                            <Box sx={{ overflowY: 'auto', flex: 1 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 800, bgcolor: '#e8f5e9' }}>Fertilizer</TableCell>
                                            <TableCell sx={{ fontWeight: 800, bgcolor: '#e8f5e9' }}>N%</TableCell>
                                            {!isReadOnly && <TableCell sx={{ bgcolor: '#e8f5e9' }} />}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {masters.map((m) => (
                                            <TableRow key={String(m.id)}>
                                                <TableCell>{m.name}</TableCell>
                                                <TableCell>{m.nitrogenPercent}%</TableCell>
                                                {!isReadOnly && (
                                                    <TableCell>
                                                        <IconButton size="small" color="error" onClick={() => deleteMaster(String(m.id))}><CloseIcon fontSize="small" /></IconButton>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                        {newMasterRow && (
                                            <TableRow sx={{ bgcolor: '#f1f8e9' }}>
                                                <TableCell sx={{ py: 0.5 }}>
                                                    <TextField fullWidth size="small" value={newMasterRow.name} onChange={(e) => setNewMasterRow({...newMasterRow, name: e.target.value})} />
                                                </TableCell>
                                                <TableCell sx={{ py: 0.5 }}>
                                                    <TextField size="small" value={newMasterRow.nitrogenPercent} onChange={(e) => setNewMasterRow({...newMasterRow, nitrogenPercent: e.target.value})} />
                                                </TableCell>
                                                <TableCell sx={{ py: 0.5 }}>
                                                    <Stack direction="row" spacing={0.5}>
                                                        <IconButton size="small" color="success" onClick={() => { addMaster(newMasterRow.name, Number(newMasterRow.nitrogenPercent) || 0); setNewMasterRow(null); }}><CheckIcon /></IconButton>
                                                        <IconButton size="small" onClick={() => setNewMasterRow(null)}><CloseIcon /></IconButton>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                                {!isReadOnly && (
                                    <Box sx={{ p: 1, textAlign: 'center' }}>
                                        <Button startIcon={<AddIcon />} size="small" onClick={() => setNewMasterRow({ id: 'new', name: '', nitrogenPercent: 0 })}>Add Fertilizer</Button>
                                    </Box>
                                )}
                            </Box>
                        </Paper>
                    </Box>
                ) : (
                    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.25} flexWrap="wrap" gap={1}>
                            <Typography sx={{ fontWeight: 900, color: '#1b5e20' }}>Fertilizer Programme</Typography>
                        </Stack>

                         {isMobile ? (
                            <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
                                {programmeRows.length === 0 ? (
                                    <Typography align="center" sx={{ py: 4, color: 'text.secondary' }}>No data available.</Typography>
                                ) : (
                                    programmeRows.map((row) => (
                                        <Card key={row.id} sx={{ border: '1px solid rgba(46,125,50,0.2)', borderRadius: 2, overflow: 'hidden' }}>
                                            <Box sx={{ bgcolor: '#e8f5e9', p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="subtitle1" fontWeight="900" color="#1b5e20">{row.fieldNo}</Typography>
                                                <Typography variant="body2" fontWeight="700" sx={{ bgcolor: '#fff', px: 1, py: 0.25, borderRadius: 1, border: '1px solid rgba(46,125,50,0.2)' }}>
                                                    {row.extentAc} ac
                                                </Typography>
                                            </Box>
                                            <Box sx={{ p: 2 }}>
                                                <Grid container spacing={2}>
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary">Bush Count</Typography>
                                                        <Typography variant="body2" fontWeight="800">{row.bushCount.toLocaleString()}</Typography>
                                                    </Grid>
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary">SPA</Typography>
                                                        <Typography variant="body2" fontWeight="800">{row.spa}</Typography>
                                                    </Grid>
                                                    <Grid item xs={12}><MuiDivider sx={{ my: 0.5 }} /></Grid>
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary">12M Crop</Typography>
                                                        <Typography variant="body2" fontWeight="800" color="primary">{row.crop12m.toLocaleString()} kg</Typography>
                                                    </Grid>
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary">12M Nitrogen</Typography>
                                                        <Typography variant="body2" fontWeight="800">{row.nitrogen12m.toFixed(1)} kg</Typography>
                                                    </Grid>
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary">Target Ratio</Typography>
                                                        <Typography variant="body2" fontWeight="800" sx={{ color: '#2e7d32' }}>{row.targetRatioPercent}%</Typography>
                                                    </Grid>
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary">Required (N)</Typography>
                                                        <Typography variant="body2" fontWeight="900" sx={{ color: '#d32f2f' }}>{row.requirementN ? `${row.requirementN.toFixed(1)} kg` : '-'}</Typography>
                                                    </Grid>
                                                </Grid>
                                                <Box sx={{ mt: 2, p: 1, bgcolor: '#f1f8e9', borderRadius: 1 }}>
                                                    <Typography variant="caption" fontWeight="800" color="#355b2b" sx={{ display: 'block', mb: 1 }}>FERTILIZER HISTORY (Last 3 Months)</Typography>
                                                    <Stack direction="row" justifyContent="space-between">
                                                        <Box textAlign="center">
                                                            <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>{historyMonths[2].label}</Typography>
                                                            <Typography variant="body2" fontWeight="700">{row.prev3.toFixed(0)}</Typography>
                                                        </Box>
                                                        <Box textAlign="center">
                                                            <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>{historyMonths[1].label}</Typography>
                                                            <Typography variant="body2" fontWeight="700">{row.prev2.toFixed(0)}</Typography>
                                                        </Box>
                                                        <Box textAlign="center">
                                                            <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>{historyMonths[0].label}</Typography>
                                                            <Typography variant="body2" fontWeight="700">{row.prev1.toFixed(0)}</Typography>
                                                        </Box>
                                                    </Stack>
                                                </Box>
                                            </Box>
                                        </Card>
                                    ))
                                )}
                            </Box>
                        ) : (
                            <Box sx={{ overflowX: 'auto' }}>
                                <Table size="small" sx={{ minWidth: 1000 }}>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                                            <TableCell rowSpan={2}>Field No</TableCell>
                                            <TableCell rowSpan={2} align="right">Extent (ac)</TableCell>
                                            <TableCell rowSpan={2} align="right">Bush Count</TableCell>
                                            <TableCell rowSpan={2} align="right">SPA</TableCell>
                                            <TableCell colSpan={4} align="center">Previous 12 Months</TableCell>
                                            <TableCell rowSpan={2} align="right">Target Ratio %</TableCell>
                                            <TableCell rowSpan={2} align="right">Requirement {fullMonthLabel(ymToYearMonth(planMonth).month)} (kg)</TableCell>
                                            <TableCell colSpan={3} align="center">Fertalizer History (kg)</TableCell>
                                        </TableRow>
                                        <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                                            <TableCell align="right">Crop (kg)</TableCell>
                                            <TableCell align="right">Fert. (kg)</TableCell>
                                            <TableCell align="right">Nitrogen (kg)</TableCell>
                                            <TableCell align="right">Ratio %</TableCell>
                                            <TableCell align="right">{historyMonths[2].label}</TableCell>
                                            <TableCell align="right">{historyMonths[1].label}</TableCell>
                                            <TableCell align="right">{historyMonths[0].label}</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {programmeRows.map((row) => (
                                            <TableRow key={row.id} hover>
                                                <TableCell>{row.fieldNo}</TableCell>
                                                <TableCell align="right">{row.extentAc.toFixed(1)} ac</TableCell>
                                                <TableCell align="right">
                                                    {editingBushCountId === row.id ? (
                                                        <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="flex-end">
                                                            <TextField size="small" type="number" value={editBushCountValue} onChange={(e) => setEditBushCountValue(e.target.value)} />
                                                            <IconButton size="small" color="success" onClick={() => saveSingleBushCount(row)}><CheckIcon fontSize="small" /></IconButton>
                                                            <IconButton size="small" onClick={() => setEditingBushCountId(null)}><CloseIcon fontSize="small" /></IconButton>
                                                        </Stack>
                                                    ) : (
                                                        <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="flex-end">
                                                            <span>{row.bushCount.toLocaleString()}</span>
                                                            {!isReadOnly && <IconButton size="small" onClick={() => { setEditingBushCountId(row.id); setEditBushCountValue(row.bushCount); }}><EditIcon fontSize="small" /></IconButton>}
                                                        </Stack>
                                                    )}
                                                </TableCell>
                                                <TableCell align="right">{row.spa}</TableCell>
                                                <TableCell align="right">
                                                    {editingCropId === row.id ? (
                                                        <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="flex-end">
                                                            <TextField size="small" type="number" value={editCropValue} onChange={(e) => setEditCropValue(e.target.value)} />
                                                            <IconButton size="small" color="success" onClick={() => saveSingleCrop(row)}><CheckIcon fontSize="small" /></IconButton>
                                                            <IconButton size="small" onClick={() => setEditingCropId(null)}><CloseIcon fontSize="small" /></IconButton>
                                                        </Stack>
                                                    ) : (
                                                        <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="flex-end">
                                                            <span>{row.crop12m.toLocaleString()}</span>
                                                            {!isReadOnly && <IconButton size="small" onClick={() => { setEditingCropId(row.id); setEditCropValue(row.crop12m); }}><EditIcon fontSize="small" /></IconButton>}
                                                        </Stack>
                                                    )}
                                                </TableCell>
                                                <TableCell align="right">{row.fert12m.toFixed(0)}</TableCell>
                                                <TableCell align="right">{row.nitrogen12m.toFixed(1)}</TableCell>
                                                <TableCell align="right">{row.ratioPercent == null ? '-' : `${row.ratioPercent.toFixed(2)}%`}</TableCell>
                                                <TableCell align="right">
                                                    {editingTargetId === row.id ? (
                                                        <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="flex-end">
                                                            <TextField size="small" type="number" value={editTargetValue} onChange={(e) => setEditTargetValue(e.target.value)} />
                                                            <IconButton size="small" color="success" onClick={() => saveSingleTarget(row)}><CheckIcon fontSize="small" /></IconButton>
                                                            <IconButton size="small" onClick={() => setEditingTargetId(null)}><CloseIcon fontSize="small" /></IconButton>
                                                        </Stack>
                                                    ) : (
                                                        <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="flex-end">
                                                            <span>{row.targetRatioPercent}%</span>
                                                            {!isReadOnly && <IconButton size="small" onClick={() => { setEditingTargetId(row.id); setEditTargetValue(row.targetRatioPercent); }}><EditIcon fontSize="small" /></IconButton>}
                                                        </Stack>
                                                    )}
                                                </TableCell>
                                                <TableCell align="right">{row.requirementN == null ? '-' : `${row.requirementN.toFixed(1)} kg`}</TableCell>
                                                <TableCell align="right">{row.prev3.toFixed(0)}</TableCell>
                                                <TableCell align="right">{row.prev2.toFixed(0)}</TableCell>
                                                <TableCell align="right">{row.prev1.toFixed(0)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        )}
                    </Box>
                )}
            </Paper>
        </Box>
    );
}
