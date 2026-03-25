import {
    Box,
    Button,
    CircularProgress,
    Fab,
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
    Tooltip,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    InputAdornment,
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

    const [planMonth, setPlanMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const planYear = useMemo(() => ymToYearMonth(planMonth).year, [planMonth]);
    const [entryYear, setEntryYear] = useState<number>(planYear);
    const [selectedFieldId, setSelectedFieldId] = useState<string>('ALL');

    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    useEffect(() => {
        if (tenantId) fetchDivisions();
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

        // "Crop (12M)" for this module is derived from Monthly Fertilizer Detail totals (Entry tab),
        // per your final flow: Programme reads from Entry, not from harvest logs.
        // Here we treat "Crop (12M)" as the total fertilizer quantity applied in the last 12 months (Kg).
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
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
            <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2} mb={3}>
                <Typography variant="h5" fontWeight="bold" sx={{ color: '#1b5e20' }}>
                    Fertilizer Programme
                </Typography>
                <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" justifyContent={{ xs: 'flex-start', sm: 'flex-end' }} sx={{ width: { xs: '100%', sm: 'auto' } }}>
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
                {/* Top tabs (Entry / Fertilizer Programme) in the same visual style as other dashboard tabs */}
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
                        spacing={1}
                        alignItems="center"
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
                                    fontWeight: 'bold',
                                    fontSize: '1.05rem',
                                    minHeight: 48,
                                    mr: 3,
                                    px: 3,
                                    color: 'text.secondary',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '8px',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    zIndex: 1,
                                    transition: 'all 0.3s ease',
                                    '@keyframes borderSpin': {
                                        '0%': { transform: 'rotate(0deg)' },
                                        '100%': { transform: 'rotate(360deg)' },
                                    },
                                    '&.Mui-selected': {
                                        color: '#1b5e20',
                                        border: '1px solid transparent',
                                    },
                                    '&.Mui-selected::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: '-50%', left: '-50%', width: '200%', height: '200%',
                                        background: 'conic-gradient(transparent, transparent, transparent, #4caf50)',
                                        animation: 'borderSpin 2s linear infinite',
                                        zIndex: -2,
                                    },
                                    '&.Mui-selected::after': {
                                        content: '""',
                                        position: 'absolute',
                                        inset: '2px',
                                        bgcolor: '#f1f8e9',
                                        borderRadius: '6px',
                                        zIndex: -1,
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
                                    fontWeight: 'bold',
                                    fontSize: '1.05rem',
                                    minHeight: 48,
                                    ml: 1,
                                    px: 3,
                                    color: 'text.secondary',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '8px',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    zIndex: 1,
                                    transition: 'all 0.3s ease',
                                    '@keyframes borderSpin': {
                                        '0%': { transform: 'rotate(0deg)' },
                                        '100%': { transform: 'rotate(360deg)' },
                                    },
                                    '&.Mui-selected': {
                                        color: '#1b5e20',
                                        border: '1px solid transparent',
                                    },
                                    '&.Mui-selected::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: '-50%', left: '-50%', width: '200%', height: '200%',
                                        background: 'conic-gradient(transparent, transparent, transparent, #4caf50)',
                                        animation: 'borderSpin 2s linear infinite',
                                        zIndex: -2,
                                    },
                                    '&.Mui-selected::after': {
                                        content: '""',
                                        position: 'absolute',
                                        inset: '2px',
                                        bgcolor: '#f1f8e9',
                                        borderRadius: '6px',
                                        zIndex: -1,
                                    },
                                }}
                            />
                        </Tabs>

                        {/* Crop selector (compact, avoids horizontal scrolling) */}
                        <FormControl size="small" sx={{ minWidth: 180 }}>
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
                        {/* ── LEFT COLUMN: Monthly Fertilizer Detail ── */}
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
                            {/* Green accent band */}
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
                                {/* Left: Year + Field filters */}
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
                                                return (
                                                    <MenuItem key={y} value={y}>
                                                        {y}
                                                    </MenuItem>
                                                );
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
                                            {fields.map((f) => (
                                                <MenuItem key={f.fieldId} value={String(f.fieldId)}>
                                                    {f.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Stack>

                                {/* Right: action buttons */}
                                <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
                                    {!entryMode ? (
                                        <Button
                                            onClick={enterEditMode}
                                            variant="contained"
                                            color="success"
                                            fullWidth={true}
                                            sx={{ fontWeight: 800, px: 2.5, width: { xs: '100%', sm: 'auto' } }}
                                        >
                                            Edit Entry
                                        </Button>
                                    ) : (
                                        <>
                                            <Button
                                                onClick={saveEntry}
                                                variant="contained"
                                                color="success"
                                                disabled={savingEntry}
                                                sx={{ fontWeight: 800, flex: { xs: 1, sm: 'none' } }}
                                            >
                                                {savingEntry ? 'Saving…' : 'Save'}
                                            </Button>
                                            <Button
                                                onClick={cancelEdit}
                                                variant="outlined"
                                                color="error"
                                                sx={{ fontWeight: 800, flex: { xs: 1, sm: 'none' } }}
                                                disabled={savingEntry}
                                            >
                                                Cancel
                                            </Button>
                                        </>
                                    )}
                                </Stack>
                            </Stack>

                            {/* Multi-fertilizer grouped table */}
                            <Box sx={{ flex: 1, minHeight: 0, overflowX: 'auto' }}>
                                <Table size="small" stickyHeader sx={{ minWidth: 800 }}>
                                    <TableHead>
                                        <TableRow>
                                            {['Field','Month','Fertilizer','Qty (kg)','Nitrogen (kg)','Total Qty (kg)','Total Nitrogen (kg)'].map((h, i) => (
                                                <TableCell key={h} sx={{ fontWeight: 800, bgcolor: '#e8f5e9', borderBottom: '2px solid rgba(46,125,50,0.35)', py: 0.75, fontSize: '0.82rem', textAlign: i >= 3 ? 'right' : 'left' }}>{h}</TableCell>
                                            ))}
                                            {entryMode && <TableCell sx={{ bgcolor: '#e8f5e9', borderBottom: '2px solid rgba(46,125,50,0.35)', width: 72 }} />}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {entryGroups.flatMap((group) => {
                                            const totalFieldRows = group.months.reduce((acc, m) => acc + Math.max(1, m.rows.length), 0);
                                            return group.months.flatMap((mg, mi) => {
                                                const isFirstMonth = mi === 0;
                                                const gKey = `${group.field.fieldId}-${mg.month}`;
                                                const td = { fontSize: '0.82rem', py: 0.55, borderBottom: '1px solid rgba(0,0,0,0.05)' };
                                                const rowCount = Math.max(1, mg.rows.length);

                                                const renderMonthAndTotals = () => (
                                                    <TableCell rowSpan={rowCount} sx={{ ...td, fontWeight: 700, verticalAlign: 'top', pt: 1.5 }}>
                                                        <Stack direction="row" alignItems="center" spacing={1}>
                                                            <span>{monthLabel(mg.month)}</span>
                                                            {entryMode && (
                                                                <Tooltip title="Add Fertilizer">
                                                                    <IconButton size="small" color="success" sx={{ p: 0.1, bgcolor: '#e8f5e9' }} onClick={() => addFertToMonth(String(group.field.fieldId), mg.month)}>
                                                                        <AddIcon sx={{ fontSize: 13 }} />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            )}
                                                        </Stack>
                                                    </TableCell>
                                                );

                                                const renderTotalsCells = () => (
                                                    <>
                                                        <TableCell rowSpan={rowCount} sx={{ ...td, textAlign: 'right', fontWeight: 800, color: mg.totalQty > 0 ? '#2e7d32' : 'inherit', verticalAlign: 'top', pt: 1.5 }}>
                                                            {mg.totalQty > 0 ? mg.totalQty.toFixed(1) : '—'}
                                                        </TableCell>
                                                        <TableCell rowSpan={rowCount} sx={{ ...td, textAlign: 'right', fontWeight: 800, color: mg.totalN > 0 ? '#2e7d32' : 'inherit', verticalAlign: 'top', pt: 1.5 }}>
                                                            {mg.totalN > 0 ? mg.totalN.toFixed(2) : '—'}
                                                        </TableCell>
                                                    </>
                                                );

                                                if (mg.rows.length === 0) {
                                                    return (
                                                        <TableRow key={`empty-${gKey}`} hover>
                                                            {isFirstMonth && <TableCell rowSpan={totalFieldRows} sx={{ ...td, color: 'text.secondary', verticalAlign: 'top', pt: 1.5 }}>{group.field.name}</TableCell>}
                                                            {renderMonthAndTotals()}
                                                            <TableCell sx={{ ...td, color: 'text.disabled', fontStyle: 'italic' }}>No fertilizer applied</TableCell>
                                                            <TableCell sx={{ ...td, textAlign: 'right', color: 'text.disabled' }}>—</TableCell>
                                                            <TableCell sx={{ ...td, textAlign: 'right', color: 'text.disabled' }}>—</TableCell>
                                                            {renderTotalsCells()}
                                                            {entryMode && <TableCell sx={{ py: 0.3 }} />}
                                                        </TableRow>
                                                    );
                                                }

                                                return mg.rows.map((row, ri) => {
                                                    const isEditing = editingRowId === row.rowId;
                                                    const nKg = row.qtyKg * (Number(fertById.get(row.fertilizerId)?.nitrogenPercent || 0) / 100);
                                                    const liveN = (Number(editValues.qtyKg) * (Number(fertById.get(editValues.fertilizerId)?.nitrogenPercent || 0) / 100)).toFixed(2);
                                                    return (
                                                        <TableRow key={row.rowId} hover sx={{ bgcolor: isEditing ? '#f1f8e9' : undefined }}>
                                                            {isFirstMonth && ri === 0 && <TableCell rowSpan={totalFieldRows} sx={{ ...td, color: 'text.secondary', verticalAlign: 'top', pt: 1.5 }}>{group.field.name}</TableCell>}
                                                            {ri === 0 && renderMonthAndTotals()}
                                                            <TableCell sx={td}>
                                                                {isEditing ? (
                                                                    <Select size="small" value={editValues.fertilizerId} onChange={(e) => setEditValues((v) => ({ ...v, fertilizerId: e.target.value }))} sx={{ fontSize: '0.8rem', minWidth: 100 }}>
                                                                        {masters.map((m) => <MenuItem key={String(m.id)} value={String(m.id)} sx={{ fontSize: '0.82rem' }}>{m.name}</MenuItem>)}
                                                                    </Select>
                                                                ) : fertById.get(row.fertilizerId)?.name || '—'}
                                                            </TableCell>
                                                            <TableCell sx={{ ...td, textAlign: 'right' }}>
                                                                {isEditing ? (
                                                                    <TextField size="small" type="number" value={editValues.qtyKg} onChange={(e) => setEditValues((v) => ({ ...v, qtyKg: e.target.value }))} inputProps={{ min: 0, step: 0.1, style: { textAlign: 'right', fontSize: '0.8rem', padding: '4px 6px' } }} sx={{ width: 80 }} />
                                                                ) : row.qtyKg.toFixed(1)}
                                                            </TableCell>
                                                            <TableCell sx={{ ...td, textAlign: 'right', color: 'text.secondary' }}>{isEditing ? liveN : nKg.toFixed(2)}</TableCell>
                                                            {ri === 0 && renderTotalsCells()}
                                                            {entryMode && (
                                                                <TableCell sx={{ py: 0.3 }}>
                                                                    {isEditing ? (
                                                                        <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                                                                            <Tooltip title="Save"><IconButton size="small" color="success" sx={{ p: 0.3 }} onClick={() => saveRowEdit(row.rowId)}><CheckIcon sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                                                                            <Tooltip title="Cancel"><IconButton size="small" sx={{ p: 0.3 }} onClick={() => setEditingRowId(null)}><CloseIcon sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                                                                        </Stack>
                                                                    ) : (
                                                                        <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                                                                            <Tooltip title="Edit"><IconButton size="small" color="success" sx={{ p: 0.3 }} onClick={() => startEditRow(row)}><EditIcon sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                                                                            <Tooltip title="Remove"><IconButton size="small" color="error" sx={{ p: 0.3 }} onClick={() => deleteAppRow(row.rowId, row.appId)}><CloseIcon sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                                                                        </Stack>
                                                                    )}
                                                                </TableCell>
                                                            )}
                                                        </TableRow>
                                                    );
                                                });
                                            });
                                        })}
                                    </TableBody>
                                </Table>
                            </Box>
                        </Paper>

                        {/* ── RIGHT COLUMN: Fertilizer Master ── */}
                        <Paper
                            elevation={2}
                            sx={{
                                width: { xs: '100%', lg: 320 },
                                flexShrink: 0,
                                alignSelf: { xs: 'center', lg: 'flex-start' },
                                border: '1.5px solid rgba(46,125,50,0.3)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                borderRadius: 2,
                            }}
                        >
                                {/* Accent header band */}
                                <Box sx={{ bgcolor: '#388e3c', px: 2, py: 1 }}>
                                    <Typography sx={{ fontWeight: 900, color: '#fff', fontSize: '0.95rem', letterSpacing: 0.3 }}>
                                        Fertilizer Master
                                    </Typography>
                                </Box>

                            {/* Compact auto-scaling MUI Table */}
                            <Box sx={{ overflowY: 'auto', flex: 1 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 800, fontSize: '0.78rem', bgcolor: '#e8f5e9', borderBottom: '2px solid rgba(46,125,50,0.35)', py: 0.75 }}>Fertilizer</TableCell>
                                            <TableCell sx={{ fontWeight: 800, fontSize: '0.78rem', bgcolor: '#e8f5e9', borderBottom: '2px solid rgba(46,125,50,0.35)', py: 0.75, width: 60 }}>Nitrogen</TableCell>
                                            <TableCell sx={{ bgcolor: '#e8f5e9', borderBottom: '2px solid rgba(46,125,50,0.35)', py: 0.75, width: 48 }} />
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {masters.map((m) => (
                                            <TableRow key={String(m.id)} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                                                <TableCell sx={{ fontSize: '0.82rem', py: 0.6 }}>{m.name}</TableCell>
                                                <TableCell sx={{ fontSize: '0.82rem', py: 0.6 }}>{m.nitrogenPercent}%</TableCell>
                                                <TableCell sx={{ py: 0.4 }}>
                                                    <Tooltip title="Remove">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => void deleteMaster(String(m.id))}
                                                            sx={{ p: 0.4 }}
                                                        >
                                                            <CloseIcon sx={{ fontSize: 15 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}

                                        {/* Inline new-row form, shown only when + is clicked */}
                                        {newMasterRow && (
                                            <TableRow sx={{ bgcolor: '#f1f8e9' }}>
                                                <TableCell sx={{ py: 0.4 }}>
                                                    <TextField
                                                        size="small"
                                                        autoFocus
                                                        placeholder="Name"
                                                        value={newMasterRow.name}
                                                        onChange={(e) => setNewMasterRow({ ...newMasterRow, name: e.target.value })}
                                                        sx={{ '& .MuiInputBase-input': { py: 0.4, fontSize: '0.8rem' } }}
                                                        fullWidth
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ py: 0.4 }}>
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        placeholder="N%"
                                                        value={newMasterRow.nitrogenPercent}
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/^0+(?=\d)/, '');
                                                            setNewMasterRow({ ...newMasterRow, nitrogenPercent: val });
                                                        }}
                                                        onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                                        sx={{ width: 85, '& .MuiInputBase-input': { py: 0.4, fontSize: '0.8rem' } }}
                                                        InputProps={{ 
                                                            endAdornment: <InputAdornment position="end" sx={{ ml: 0 }}><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>%</Typography></InputAdornment> 
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ py: 0.4 }}>
                                                    <Stack direction="row" spacing={0.25}>
                                                        <Tooltip title="Save">
                                                            <IconButton
                                                                size="small"
                                                                color="success"
                                                                sx={{ p: 0.4 }}
                                                                onClick={() => {
                                                                    const nm = newMasterRow.name.trim();
                                                                    if (!nm) return;
                                                                    void addMaster(nm, Number(newMasterRow.nitrogenPercent) || 0);
                                                                    setNewMasterRow(null);
                                                                }}
                                                            >
                                                                <CheckIcon sx={{ fontSize: 15 }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Cancel">
                                                            <IconButton size="small" sx={{ p: 0.4 }} onClick={() => setNewMasterRow(null)}>
                                                                <CloseIcon sx={{ fontSize: 15 }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </Box>

                            {/* Plantation-green + FAB */}
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 1, borderTop: '1px solid rgba(46,125,50,0.12)', bgcolor: '#f7fbf7' }}>
                                <Fab
                                    size="small"
                                    disabled={!!newMasterRow}
                                    onClick={() => setNewMasterRow({ id: `new-${Date.now()}`, name: '', nitrogenPercent: 0 })}
                                    sx={{
                                        bgcolor: '#2e7d32',
                                        color: '#fff',
                                        '&:hover': { bgcolor: '#1b5e20' },
                                        '&.Mui-disabled': { bgcolor: 'rgba(46,125,50,0.3)', color: '#fff' },
                                        boxShadow: '0 2px 8px rgba(46,125,50,0.4)',
                                    }}
                                >
                                    <AddIcon />
                                </Fab>
                            </Box>
                        </Paper>

                    </Box>
                ) : (
                    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.25} flexWrap="wrap" gap={1}>
                            <Box>
                                <Typography sx={{ fontWeight: 900, color: '#1b5e20' }}>Fertilizer Programme</Typography>
                            </Box>
                        </Stack>

                        <Box
                            sx={{
                                flex: 1,
                                minHeight: 0,
                                borderRadius: 1,
                                border: '1px solid rgba(46,125,50,0.2)',
                                bgcolor: '#ffffff',
                                overflowX: 'auto',
                            }}
                        >
                            <Table
                                size="small"
                                sx={{
                                    minWidth: 1000,
                                    tableLayout: 'auto',
                                    '& th, & td': {
                                        borderColor: 'rgba(46,125,50,0.25)',
                                        fontSize: '0.82rem',
                                    },
                                }}
                            >
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                                        <TableCell rowSpan={2} sx={{ width: '10%', borderBottom: '2px solid rgba(46,125,50,0.25)' }}>Field No</TableCell>
                                        <TableCell rowSpan={2} sx={{ width: '7%', borderBottom: '2px solid rgba(46,125,50,0.25)', borderLeft: '1px solid rgba(46,125,50,0.1)' }} align="right">Extent (ac)</TableCell>
                                        <TableCell rowSpan={2} sx={{ width: '10%', borderBottom: '2px solid rgba(46,125,50,0.25)', borderLeft: '1px solid rgba(46,125,50,0.1)' }} align="right">Bush Count</TableCell>
                                        <TableCell rowSpan={2} sx={{ width: '7%', borderBottom: '2px solid rgba(46,125,50,0.25)', borderLeft: '1px solid rgba(46,125,50,0.1)' }} align="right">SPA</TableCell>
                                        <TableCell colSpan={4} align="center" sx={{ borderBottom: '1px solid rgba(46,125,50,0.25)', borderLeft: '1px solid rgba(46,125,50,0.1)' }}>Previous 12 Months</TableCell>
                                        <TableCell rowSpan={2} sx={{ width: '10%', borderBottom: '2px solid rgba(46,125,50,0.25)', borderLeft: '1px solid rgba(46,125,50,0.1)' }} align="right">Target Ratio %</TableCell>
                                        <TableCell rowSpan={2} sx={{ width: '10%', borderBottom: '2px solid rgba(46,125,50,0.25)', borderLeft: '1px solid rgba(46,125,50,0.1)' }} align="right">Requirement {fullMonthLabel(ymToYearMonth(planMonth).month)} (kg)</TableCell>
                                        <TableCell colSpan={3} align="center" sx={{ borderBottom: '1px solid rgba(46,125,50,0.25)', borderLeft: '1px solid rgba(46,125,50,0.1)' }}>Fertalizer History (kg)</TableCell>
                                    </TableRow>
                                    <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                                        <TableCell sx={{ width: '9%', borderTop: 'none', borderBottom: '2px solid rgba(46,125,50,0.25)', borderLeft: '1px solid rgba(46,125,50,0.1)' }} align="right">Crop (kg)</TableCell>
                                        <TableCell sx={{ width: '9%', borderTop: 'none', borderBottom: '2px solid rgba(46,125,50,0.25)', borderLeft: '1px solid rgba(46,125,50,0.1)' }} align="right">Fert. (kg)</TableCell>
                                        <TableCell sx={{ width: '9%', borderTop: 'none', borderBottom: '2px solid rgba(46,125,50,0.25)', borderLeft: '1px solid rgba(46,125,50,0.1)' }} align="right">Nitrogen (kg)</TableCell>
                                        <TableCell sx={{ width: '7%', borderTop: 'none', borderBottom: '2px solid rgba(46,125,50,0.25)', borderLeft: '1px solid rgba(46,125,50,0.1)' }} align="right">Ratio %</TableCell>
                                        <TableCell sx={{ width: '5%', borderTop: 'none', borderBottom: '2px solid rgba(46,125,50,0.25)', borderLeft: '1px solid rgba(46,125,50,0.1)' }} align="right">{historyMonths[2].label}</TableCell>
                                        <TableCell sx={{ width: '5%', borderTop: 'none', borderBottom: '2px solid rgba(46,125,50,0.25)', borderLeft: '1px solid rgba(46,125,50,0.1)' }} align="right">{historyMonths[1].label}</TableCell>
                                        <TableCell sx={{ width: '5%', borderTop: 'none', borderBottom: '2px solid rgba(46,125,50,0.25)', borderLeft: '1px solid rgba(46,125,50,0.1)' }} align="right">{historyMonths[0].label}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {programmeRows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={12} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                                No data. Enter fertilizer details in the Entry tab.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        programmeRows.map((row) => (
                                            <TableRow key={row.id} hover>
                                                <TableCell>{row.fieldNo}</TableCell>
                                                <TableCell align="right">{row.extentAc.toFixed(1)} ac</TableCell>
                                                <TableCell align="right">
                                                    {editingBushCountId === row.id ? (
                                                        <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="flex-end">
                                                            <TextField
                                                                size="small"
                                                                type="number"
                                                                value={editBushCountValue}
                                                                onChange={(e) => setEditBushCountValue(e.target.value.replace(/^0+(?=\d)/, ''))}
                                                                onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                                                sx={{ width: 100 }}
                                                                inputProps={{ style: { textAlign: 'right', padding: '4px 6px' }, min: 0 }}
                                                            />
                                                            <Tooltip title="Save"><IconButton size="small" color="success" sx={{ p: 0.3 }} disabled={savingTargets} onClick={() => saveSingleBushCount(row)}><CheckIcon sx={{ fontSize: 13 }} /></IconButton></Tooltip>
                                                            <Tooltip title="Cancel"><IconButton size="small" sx={{ p: 0.3 }} onClick={() => setEditingBushCountId(null)}><CloseIcon sx={{ fontSize: 13 }} /></IconButton></Tooltip>
                                                        </Stack>
                                                    ) : (
                                                        <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="flex-end">
                                                            <span>{row.bushCount.toLocaleString()}</span>
                                                            <Tooltip title="Edit"><IconButton size="small" color="success" sx={{ p: 0.3 }} onClick={() => { setEditingBushCountId(row.id); setEditBushCountValue(row.bushCount); }}><EditIcon sx={{ fontSize: 13 }} /></IconButton></Tooltip>
                                                        </Stack>
                                                    )}
                                                </TableCell>
                                                <TableCell align="right">{row.spa}</TableCell>
                                                <TableCell align="right">
                                                    {editingCropId === row.id ? (
                                                        <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="flex-end">
                                                            <TextField
                                                                size="small"
                                                                type="number"
                                                                value={editCropValue}
                                                                onChange={(e) => setEditCropValue(e.target.value.replace(/^0+(?=\d)/, ''))}
                                                                onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                                                sx={{ width: 100 }}
                                                                InputProps={{ endAdornment: <InputAdornment position="end" sx={{ml: 0}}><Typography variant="caption">kg</Typography></InputAdornment> }}
                                                                inputProps={{ style: { textAlign: 'right', padding: '4px 6px' }, min: 0 }}
                                                            />
                                                            <Tooltip title="Save"><IconButton size="small" color="success" sx={{ p: 0.3 }} disabled={savingTargets} onClick={() => saveSingleCrop(row)}><CheckIcon sx={{ fontSize: 13 }} /></IconButton></Tooltip>
                                                            <Tooltip title="Cancel"><IconButton size="small" sx={{ p: 0.3 }} onClick={() => setEditingCropId(null)}><CloseIcon sx={{ fontSize: 13 }} /></IconButton></Tooltip>
                                                        </Stack>
                                                    ) : (
                                                        <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="flex-end">
                                                            <span>{row.crop12m.toLocaleString()} kg</span>
                                                            <Tooltip title="Edit"><IconButton size="small" color="success" sx={{ p: 0.3 }} onClick={() => { setEditingCropId(row.id); setEditCropValue(row.crop12m); }}><EditIcon sx={{ fontSize: 13 }} /></IconButton></Tooltip>
                                                        </Stack>
                                                    )}
                                                </TableCell>
                                                <TableCell align="right">{row.fert12m.toFixed(0)} kg</TableCell>
                                                <TableCell align="right">{row.nitrogen12m.toFixed(1)} kg</TableCell>
                                                <TableCell align="right">
                                                    {row.ratioPercent == null ? '-' : `${row.ratioPercent.toFixed(2)}%`}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {editingTargetId === row.id ? (
                                                        <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="flex-end">
                                                            <TextField
                                                                size="small"
                                                                type="number"
                                                                value={editTargetValue}
                                                                onChange={(e) => {
                                                                    let val = e.target.value.replace(/^0+(?=\d)/, '');
                                                                    if (Number(val) > 100) val = '100';
                                                                    setEditTargetValue(val);
                                                                }}
                                                                onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                                                sx={{ width: 100 }}
                                                                InputProps={{ endAdornment: <InputAdornment position="end" sx={{ml: 0}}><Typography variant="caption">%</Typography></InputAdornment> }}
                                                                inputProps={{ style: { textAlign: 'right', padding: '4px 6px' }, min: 0, max: 100 }}
                                                            />
                                                            <Tooltip title="Save"><IconButton size="small" color="success" sx={{ p: 0.3 }} disabled={savingTargets} onClick={() => saveSingleTarget(row)}><CheckIcon sx={{ fontSize: 13 }} /></IconButton></Tooltip>
                                                            <Tooltip title="Cancel"><IconButton size="small" sx={{ p: 0.3 }} onClick={() => setEditingTargetId(null)}><CloseIcon sx={{ fontSize: 13 }} /></IconButton></Tooltip>
                                                        </Stack>
                                                    ) : (
                                                        <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="flex-end">
                                                            <span>{row.targetRatioPercent}%</span>
                                                            <Tooltip title="Edit"><IconButton size="small" color="success" sx={{ p: 0.3 }} onClick={() => { setEditingTargetId(row.id); setEditTargetValue(row.targetRatioPercent); }}><EditIcon sx={{ fontSize: 13 }} /></IconButton></Tooltip>
                                                        </Stack>
                                                    )}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {row.requirementN == null ? '-' : `${row.requirementN.toFixed(1)} kg`}
                                                </TableCell>
                                                <TableCell align="right">{row.prev3.toFixed(0)} kg</TableCell>
                                                <TableCell align="right">{row.prev2.toFixed(0)} kg</TableCell>
                                                <TableCell align="right">{row.prev1.toFixed(0)} kg</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </Box>
                    </Box>
                )}
            </Paper>
        </Box>
    );
}
