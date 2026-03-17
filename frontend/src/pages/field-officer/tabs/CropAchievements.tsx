import { useEffect, useMemo, useState } from 'react';
import {
    Box,
    CircularProgress,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import axios from 'axios';

type CropKey = 'TEA' | 'RUBBER' | 'CINNAMON';
type PeriodKey = 'today' | 'toDate';

type MetricValues = Record<CropKey, Record<PeriodKey, string>>;

interface MetricRow {
    label: string;
    values: MetricValues;
    emphasis?: 'normal' | 'dark';
}

interface CropAchievementMetrics {
    pluckingAverage: MetricValues;
    checkrollWeight: MetricValues;
    pluckingCost: MetricValues;
    weedingCost: MetricValues;
    cropAcre: MetricValues;
}

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

const cropPalette: Record<CropKey, { header: string; subHeader: string; text: string }> = {
    TEA: {
        header: '#0f9d58',
        subHeader: '#31b86e',
        text: '#ffffff',
    },
    RUBBER: {
        header: '#1fa2ff',
        subHeader: '#52b9ff',
        text: '#ffffff',
    },
    CINNAMON: {
        header: '#ffca28',
        subHeader: '#ffd95f',
        text: '#4e342e',
    },
};

const defaultValues = (): MetricValues => ({
    TEA: { today: '-', toDate: '-' },
    RUBBER: { today: '-', toDate: '-' },
    CINNAMON: { today: '-', toDate: '-' },
});

const defaultAchievementMetrics = (): CropAchievementMetrics => ({
    pluckingAverage: defaultValues(),
    checkrollWeight: defaultValues(),
    pluckingCost: defaultValues(),
    weedingCost: defaultValues(),
    cropAcre: defaultValues(),
});

const DEFAULT_CATEGORY_STRUCTURE = [
    { name: 'Plucking', items: ['Pluckers', 'Kanganies', 'Sack Coolies', 'Staff OT for Plucking', 'Leaf Bags', 'Cash Kilos', 'Meals', 'Over Kilos'] },
    { name: 'Chemical Weeding', items: ['Chemical Weeding ManDays', 'Cost of Chemical', 'Tank Repair', 'Meals', 'Transport'] },
    { name: 'Manual Weeding', items: ['Manual Weeding ManDays', 'Tools'] },
    { name: 'Fertilizing', items: ['Fertilizer Cost'] },
];

const ITEM_TO_CATEGORY = new Map(
    DEFAULT_CATEGORY_STRUCTURE.flatMap((category) => category.items.map((item) => [item, category.name] as const)),
);
const KNOWN_CATEGORY_NAMES = new Set(DEFAULT_CATEGORY_STRUCTURE.map((category) => category.name));

const sanitizeCostPerKgOverride = (overrideText?: string, amountText?: string) => {
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

const normalizeCostCategories = (input: any): CostCategory[] => {
    if (!Array.isArray(input)) return [];

    const grouped = new Map<string, CostCategory>();
    const ensureCategory = (name: string) => {
        if (!grouped.has(name)) {
            grouped.set(name, { id: `${name}-${Math.random().toString(36).slice(2, 8)}`, name, items: [] });
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
            id: source?.id || `${workItemName}-${Math.random().toString(36).slice(2, 8)}`,
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
                id: rawItem?.id || `${itemName}-${Math.random().toString(36).slice(2, 8)}`,
                name: itemName,
                dayCostPerKgOverride: sanitizeCostPerKgOverride(rawItem?.dayCostPerKgOverride, rawItem?.dayAmount),
                todateCostPerKgOverride: sanitizeCostPerKgOverride(rawItem?.todateCostPerKgOverride, rawItem?.todateAmount),
            });
        }
    }

    return Array.from(grouped.values()).map((category) => ({
        ...category,
        items: category.items.filter((item, index, items) =>
            items.findIndex((candidate) => candidate.name.toLowerCase() === item.name.toLowerCase()) === index,
        ),
    }));
};

const catTotal = (items: CostItem[], field: keyof CostItem) =>
    items.reduce((sum, item) => sum + (Number.parseFloat(String(item[field] || '0')) || 0), 0);

const fmtPerKgValue = (amountTotal: number, weight?: number, overrideText?: string) => {
    const sanitizedOverride = sanitizeCostPerKgOverride(overrideText, String(amountTotal));
    if (sanitizedOverride && amountTotal > 0) return sanitizedOverride;
    if (amountTotal === 0 || !weight || weight === 0) return '-';
    return (amountTotal / weight).toFixed(2);
};

const metricRows: MetricRow[] = [
    { label: 'Budgeted Crop', values: defaultValues() },
    { label: 'Crop', values: defaultValues() },
    { label: 'Crop per day', values: defaultValues() },
    { label: 'Balance', values: defaultValues(), emphasis: 'dark' },
    { label: 'Per Day', values: defaultValues() },
    { label: 'Work Offered days', values: defaultValues() },
    { label: 'Plucking Average', values: defaultValues() },
    { label: 'Plucking Cost', values: defaultValues() },
    { label: 'Weeding Cost', values: defaultValues() },
    { label: 'RLO', values: defaultValues(), emphasis: 'dark' },
    { label: 'Crop/Acre', values: defaultValues() },
    { label: 'Checkroll Weight', values: defaultValues() },
];

export default function CropAchievements() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;
    const [reportDate, setReportDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const [loading, setLoading] = useState(true);
    const [activeCrops, setActiveCrops] = useState<CropKey[]>(['TEA']);
    const [achievementMetrics, setAchievementMetrics] = useState<CropAchievementMetrics>(defaultAchievementMetrics());

    const reportTime = useMemo(() => {
        const d = new Date();
        return d.toLocaleTimeString('en-US');
    }, []);

    const formattedReportDate = useMemo(() => {
        const d = new Date(reportDate);
        return d.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: '2-digit',
        });
    }, [reportDate]);

    useEffect(() => {
        const loadCropAchievements = async () => {
            if (!tenantId) {
                setActiveCrops(['TEA']);
                setAchievementMetrics(defaultAchievementMetrics());
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const [year, month] = reportDate.split('-');
                const startDate = `${year}-${month}-01`;
                const lastDay = new Date(Number(year), Number(month), 0).getDate();
                const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
                const selectedDay = Number(reportDate.split('-')[2]);

                const [fieldsRes, workRes, attRes, workersRes] = await Promise.all([
                    axios.get(`/api/fields?tenantId=${tenantId}`),
                    axios.get(`/api/operations/daily-work?tenantId=${tenantId}&startDate=${startDate}&endDate=${endDate}`),
                    axios.get(`/api/operations/attendance?tenantId=${tenantId}&startDate=${startDate}&endDate=${endDate}`),
                    axios.get(`/api/workers?tenantId=${tenantId}`),
                ]);

                const fieldsList = fieldsRes.data || [];
                const workList = workRes.data || [];
                const attList = attRes.data || [];
                const workersList = workersRes.data || [];

                const cropSet = new Set<CropKey>();
                const fieldListMap = new Map<string, any>();
                const fieldNameMap = new Map<string, any>();

                fieldsList.forEach((field: any) => {
                    if (field?.id) {
                        fieldListMap.set(String(field.id), field);
                    }
                    if (field?.name) {
                        fieldNameMap.set(String(field.name), field);
                    }

                    const crop = String(field?.cropType || '').trim().toUpperCase();
                    if (crop === 'TEA' || crop === 'RUBBER' || crop === 'CINNAMON') {
                        cropSet.add(crop as CropKey);
                    }
                });

                const orderedCrops = (['TEA', 'RUBBER', 'CINNAMON'] as CropKey[]).filter((crop) => cropSet.has(crop));
                const cropsToShow = orderedCrops.length > 0 ? orderedCrops : (['TEA'] as CropKey[]);
                setActiveCrops(cropsToShow);

                const costResponses = await Promise.all(
                    cropsToShow.map(async (crop) => {
                        try {
                            const response = await axios.get('/api/daily-costs', {
                                params: { tenantId, cropType: crop, date: reportDate },
                            });
                            const parsed = response.data?.costData ? JSON.parse(response.data.costData) : [];
                            return [crop, normalizeCostCategories(parsed)] as const;
                        } catch {
                            return [crop, [] as CostCategory[]] as const;
                        }
                    })
                );
                const costCategoryMap = new Map<CropKey, CostCategory[]>(costResponses);

                const workerTypeMap = new Map<string, string>();
                workersList.forEach((worker: any) => {
                    if (worker?.id) {
                        workerTypeMap.set(String(worker.id), String(worker.employmentType || ''));
                    }
                });

                const nextMetrics = defaultAchievementMetrics();

                cropsToShow.forEach((crop) => {
                    const cropLower = crop.toLowerCase();
                    const dayMap = new Map<number, {
                        factoryWeightDay: number;
                        checkrollWeightDay: number;
                        permAndCasualPluckersDay: number;
                        cashKilosDay: number;
                        permAndCasualWeightDay: number;
                    }>();
                    const workMap = new Map<string, any>();
                    const totalAcreage = fieldsList
                        .filter(
                            (field: any) =>
                                field?.cropType &&
                                String(field.cropType).trim().toLowerCase() === cropLower
                        )
                        .reduce((sum: number, field: any) => sum + Number(field?.acreage || 0), 0);
                    const dayActiveAcreage = new Map<number, number>();
                    const daySeenFields = new Map<number, Set<string>>();

                    for (let day = 1; day <= lastDay; day++) {
                        dayMap.set(day, {
                            factoryWeightDay: 0,
                            checkrollWeightDay: 0,
                            permAndCasualPluckersDay: 0,
                            cashKilosDay: 0,
                            permAndCasualWeightDay: 0,
                        });
                        dayActiveAcreage.set(day, 0);
                        daySeenFields.set(day, new Set());
                    }

                    workList.forEach((work: any) => {
                        const workDate = String(work?.workDate || '');
                        if (!workDate.startsWith(`${year}-${month}`)) return;

                        const workId = String(work?.workId || work?.id || '');
                        if (!workId) return;

                        const fieldById = fieldListMap.get(String(work?.fieldId || ''));
                        let cropMatch =
                            fieldById?.cropType &&
                            String(fieldById.cropType).trim().toLowerCase() === cropLower;

                        if (!cropMatch && work?.bulkWeights) {
                            try {
                                const bulkWeights = JSON.parse(work.bulkWeights);
                                cropMatch = Object.keys(bulkWeights).some((key) => {
                                    if (key === '__FACTORY__') return false;
                                    const field = fieldNameMap.get(key);
                                    return (
                                        field?.cropType &&
                                        String(field.cropType).trim().toLowerCase() === cropLower
                                    );
                                });
                            } catch {
                                cropMatch = false;
                            }
                        }

                        if (!cropMatch) return;

                        const day = Number(workDate.split('-')[2]);
                        const dayData = dayMap.get(day);
                        if (!dayData) return;

                        workMap.set(workId, work);

                        if (work?.bulkWeights) {
                            try {
                                const bulkWeights = JSON.parse(work.bulkWeights);
                                const factoryWeight = Number(bulkWeights?.__FACTORY__?.factoryWt || 0);
                                dayData.factoryWeightDay += factoryWeight;
                                const seenToday = daySeenFields.get(day);

                                Object.keys(bulkWeights).forEach((key) => {
                                    if (key === '__FACTORY__') return;
                                    const field = fieldNameMap.get(key);
                                    if (
                                        seenToday &&
                                        field &&
                                        field?.cropType &&
                                        String(field.cropType).trim().toLowerCase() === cropLower &&
                                        !seenToday.has(key)
                                    ) {
                                        seenToday.add(key);
                                        dayActiveAcreage.set(
                                            day,
                                            (dayActiveAcreage.get(day) || 0) + Number(field?.acreage || 0)
                                        );
                                    }
                                });
                            } catch {
                                // Ignore malformed weight payloads and keep the row stable.
                            }
                        }
                    });

                    attList.forEach((attendance: any) => {
                        const work = workMap.get(String(attendance?.dailyWorkId || ''));
                        if (!work || !work.bulkWeights) return;

                        const workType = String(attendance?.workType || '').toLowerCase();
                        if (cropLower === 'tea' && workType !== 'plucking') return;
                        if (cropLower === 'rubber' && workType !== 'tapping') return;

                        const attendanceDate = String(attendance?.workDate || '');
                        if (!attendanceDate.startsWith(`${year}-${month}`)) return;

                        const day = Number(attendanceDate.split('-')[2]);
                        const dayData = dayMap.get(day);
                        if (!dayData) return;

                        const employmentType = workerTypeMap.get(String(attendance?.workerId || ''));
                        const isPresent = attendance?.status === 'PRESENT' || attendance?.status === 'HALF_DAY';

                        if (isPresent && (employmentType === 'PERMANENT' || employmentType === 'CASUAL')) {
                            dayData.permAndCasualPluckersDay += 1;
                            dayData.permAndCasualWeightDay += Number(attendance?.amWeight || attendance?.am || 0);
                            dayData.permAndCasualWeightDay += Number(attendance?.pmWeight || attendance?.pm || 0);
                        }

                        dayData.checkrollWeightDay += Number(attendance?.amWeight || attendance?.am || 0);
                        dayData.checkrollWeightDay += Number(attendance?.pmWeight || attendance?.pm || 0);
                        dayData.cashKilosDay += Number(attendance?.cashKilos || 0);
                    });

                    let factoryToDate = 0;
                    let cashKilosToDate = 0;
                    let permCasualPluckersToDate = 0;
                    let checkrollToDate = 0;
                    let permCasualWeightToDate = 0;

                    for (let day = 1; day <= selectedDay; day++) {
                        const dayData = dayMap.get(day);
                        if (!dayData) continue;

                        factoryToDate += dayData.factoryWeightDay;
                        cashKilosToDate += dayData.cashKilosDay;
                        permCasualPluckersToDate += dayData.permAndCasualPluckersDay;
                        checkrollToDate += dayData.checkrollWeightDay;
                        permCasualWeightToDate += dayData.permAndCasualWeightDay;
                    }

                    const todayData = dayMap.get(selectedDay);
                    const pluckingAverageToday =
                        todayData && todayData.permAndCasualPluckersDay > 0
                            ? (todayData.factoryWeightDay - todayData.cashKilosDay) / todayData.permAndCasualPluckersDay
                            : null;
                    const pluckingAverageToDate =
                        permCasualPluckersToDate > 0
                            ? (factoryToDate - cashKilosToDate) / permCasualPluckersToDate
                            : null;
                    const cropAcreToday =
                        todayData && (dayActiveAcreage.get(selectedDay) || 0) > 0
                            ? todayData.permAndCasualWeightDay / (dayActiveAcreage.get(selectedDay) || 1)
                            : null;
                    const cropAcreToDate =
                        totalAcreage > 0 ? permCasualWeightToDate / totalAcreage : null;
                    const cropCostCategories = costCategoryMap.get(crop) || [];
                    const pluckingCategory = cropCostCategories.find(
                        (category) => category.name.trim().toLowerCase() === 'plucking'
                    );
                    const weedingCategories = cropCostCategories.filter((category) =>
                        category.name.trim().toLowerCase().includes('weeding')
                    );

                    const pluckingDayAmount = pluckingCategory ? catTotal(pluckingCategory.items, 'dayAmount') : 0;
                    const pluckingTodateAmount = pluckingCategory ? catTotal(pluckingCategory.items, 'todateAmount') : 0;
                    const weedingDayAmount = weedingCategories.reduce(
                        (sum, category) => sum + catTotal(category.items, 'dayAmount'),
                        0
                    );
                    const weedingTodateAmount = weedingCategories.reduce(
                        (sum, category) => sum + catTotal(category.items, 'todateAmount'),
                        0
                    );

                    nextMetrics.pluckingAverage[crop].today =
                        pluckingAverageToday && Number.isFinite(pluckingAverageToday)
                            ? pluckingAverageToday.toFixed(2)
                            : '-';
                    nextMetrics.pluckingAverage[crop].toDate =
                        pluckingAverageToDate && Number.isFinite(pluckingAverageToDate)
                            ? pluckingAverageToDate.toFixed(2)
                            : '-';

                    nextMetrics.checkrollWeight[crop].today =
                        todayData && todayData.checkrollWeightDay > 0
                            ? todayData.checkrollWeightDay.toFixed(1)
                            : '-';
                    nextMetrics.checkrollWeight[crop].toDate =
                        checkrollToDate > 0 ? checkrollToDate.toFixed(1) : '-';

                    nextMetrics.pluckingCost[crop].today = fmtPerKgValue(
                        pluckingDayAmount,
                        todayData?.factoryWeightDay
                    );
                    nextMetrics.pluckingCost[crop].toDate = fmtPerKgValue(
                        pluckingTodateAmount,
                        factoryToDate
                    );

                    nextMetrics.weedingCost[crop].today = fmtPerKgValue(
                        weedingDayAmount,
                        todayData?.factoryWeightDay
                    );
                    nextMetrics.weedingCost[crop].toDate = fmtPerKgValue(
                        weedingTodateAmount,
                        factoryToDate
                    );

                    nextMetrics.cropAcre[crop].today =
                        cropAcreToday && Number.isFinite(cropAcreToday)
                            ? cropAcreToday.toFixed(2)
                            : '-';
                    nextMetrics.cropAcre[crop].toDate =
                        cropAcreToDate && Number.isFinite(cropAcreToDate) && cropAcreToDate > 0
                            ? cropAcreToDate.toFixed(2)
                            : '-';
                });

                setAchievementMetrics(nextMetrics);
            } catch (error) {
                console.error('Failed to load crop achievement metrics', error);
                setActiveCrops(['TEA']);
                setAchievementMetrics(defaultAchievementMetrics());
            } finally {
                setLoading(false);
            }
        };

        loadCropAchievements();
    }, [tenantId, reportDate]);

    const displayedRows = useMemo(
        () =>
            metricRows.map((row) => {
                if (row.label === 'Plucking Average') {
                    return { ...row, values: achievementMetrics.pluckingAverage };
                }
                if (row.label === 'Checkroll Weight') {
                    return { ...row, values: achievementMetrics.checkrollWeight };
                }
                if (row.label === 'Plucking Cost') {
                    return { ...row, values: achievementMetrics.pluckingCost };
                }
                if (row.label === 'Weeding Cost') {
                    return { ...row, values: achievementMetrics.weedingCost };
                }
                if (row.label === 'Crop/Acre') {
                    return { ...row, values: achievementMetrics.cropAcre };
                }
                return row;
            }),
        [achievementMetrics]
    );

    if (loading) {
        return (
            <Box p={4} display="flex" justifyContent="center">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box p={{ xs: 1.5, md: 3 }}>
            <Box mb={2}>
                <Typography variant="h4" fontWeight="bold" sx={{ color: '#1b5e20' }}>
                    Crop Achievements
                </Typography>
            </Box>

            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2, md: 3.5 },
                    borderRadius: 0,
                    border: '2px solid #2f2f2f',
                    background: '#ffffff',
                }}
            >
                <Box mb={2.5}>
                    <Stack spacing={1.25} alignItems="center">
                        <Stack direction="row" spacing={4} alignItems="center" justifyContent="center" flexWrap="wrap">
                            <Typography sx={{ fontWeight: 700 }}>{formattedReportDate}</Typography>
                            <Typography>{reportTime}</Typography>
                        </Stack>
                        <TextField
                            type="date"
                            size="small"
                            value={reportDate}
                            onChange={(e) => setReportDate(e.target.value)}
                            sx={{ mt: 0.5, bgcolor: '#fff', maxWidth: 180 }}
                        />
                    </Stack>
                </Box>

                <TableContainer
                    component={Paper}
                    elevation={0}
                    sx={{
                        borderRadius: 0,
                        border: '1px solid #355b2b',
                        overflowX: 'auto',
                        background: '#f7fbf3',
                    }}
                >
                    <Table
                        size="small"
                        sx={{
                            minWidth: 840,
                            '& .MuiTableCell-root': {
                                borderColor: '#355b2b',
                                py: 0.45,
                                px: 0.85,
                                fontSize: '0.92rem',
                            },
                        }}
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell
                                    rowSpan={2}
                                    sx={{
                                        width: 210,
                                        bgcolor: '#f0f7e8',
                                        borderRight: '2px solid #355b2b',
                                    }}
                                />
                                {activeCrops.map((crop) => (
                                    <TableCell
                                        key={crop}
                                        align="center"
                                        colSpan={2}
                                        sx={{
                                            bgcolor: cropPalette[crop].header,
                                            color: cropPalette[crop].text,
                                            fontWeight: 800,
                                            letterSpacing: 0.6,
                                        }}
                                    >
                                        {crop}
                                    </TableCell>
                                ))}
                            </TableRow>
                            <TableRow>
                                {activeCrops.flatMap((crop) => [
                                    <TableCell
                                        key={`${crop}-today`}
                                        align="center"
                                        sx={{
                                            bgcolor: cropPalette[crop].subHeader,
                                            color: cropPalette[crop].text,
                                            fontWeight: 700,
                                        }}
                                    >
                                        Today
                                    </TableCell>,
                                    <TableCell
                                        key={`${crop}-todate`}
                                        align="center"
                                        sx={{
                                            bgcolor: cropPalette[crop].subHeader,
                                            color: cropPalette[crop].text,
                                            fontWeight: 700,
                                        }}
                                    >
                                        To Date
                                    </TableCell>,
                                ])}
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {displayedRows.map((row) => (
                                <TableRow key={row.label}>
                                    <TableCell
                                        sx={{
                                            fontWeight: row.emphasis === 'dark' ? 700 : 500,
                                            color: '#1e2f18',
                                            bgcolor: row.emphasis === 'dark' ? '#5f8f3f' : '#d7ebc7',
                                        }}
                                    >
                                        {row.label}
                                    </TableCell>

                                    {activeCrops.flatMap((crop) => [
                                        <TableCell
                                            key={`${row.label}-${crop}-today`}
                                            align="right"
                                            sx={{
                                                bgcolor: row.emphasis === 'dark' ? '#6ea14a' : '#e7f2dc',
                                                color: '#20361b',
                                                fontWeight: row.emphasis === 'dark' ? 700 : 500,
                                            }}
                                        >
                                            {row.values[crop].today}
                                        </TableCell>,
                                        <TableCell
                                            key={`${row.label}-${crop}-todate`}
                                            align="right"
                                            sx={{
                                                bgcolor: row.emphasis === 'dark' ? '#6ea14a' : '#e7f2dc',
                                                color: '#20361b',
                                                fontWeight: row.emphasis === 'dark' ? 700 : 500,
                                            }}
                                        >
                                            {row.values[crop].toDate}
                                        </TableCell>,
                                    ])}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
}
