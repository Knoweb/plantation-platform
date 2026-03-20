import { useEffect, useMemo, useState } from 'react';
import {
    Box,
    CircularProgress,
    Paper,
    Stack,
    TextField,
    Typography,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import axios from 'axios';
import {
    countWorkingDaysUpTo,
    getWorkingDaysCountForMonth,
    isWorkingDay,
    parseWorkingDayCalendar,
} from '../../../utils/workingDayCalendar';

type CropKey = 'TEA' | 'RUBBER' | 'CINNAMON';
type PeriodKey = 'today' | 'toDate';

type MetricValues = Record<CropKey, Record<PeriodKey, string>>;

interface MetricRow {
    label: string;
    unit?: string;
    values: MetricValues;
    emphasis?: 'normal' | 'dark';
}

interface CropAchievementMetrics {
    budgetedCrop: MetricValues;
    crop: MetricValues;
    cropPerDay: MetricValues;
    balance: MetricValues;
    perDay: MetricValues;
    rlo: MetricValues;
    workOfferedDays: MetricValues;
    pluckingAverage: MetricValues;
    checkrollWeight: MetricValues;
    pluckingCost: MetricValues;
    weedingCost: MetricValues;
    cropAcre: MetricValues;
}

interface CropBudgetConfig {
    budgetJan?: string | number;
    budgetFeb?: string | number;
    budgetMar?: string | number;
    budgetApr?: string | number;
    budgetMay?: string | number;
    budgetJun?: string | number;
    budgetJul?: string | number;
    budgetAug?: string | number;
    budgetSep?: string | number;
    budgetOct?: string | number;
    budgetNov?: string | number;
    budgetDec?: string | number;
    workingDayCalendar?: string;
    workingDaysJan?: string | number;
    workingDaysFeb?: string | number;
    workingDaysMar?: string | number;
    workingDaysApr?: string | number;
    workingDaysMay?: string | number;
    workingDaysJun?: string | number;
    workingDaysJul?: string | number;
    workingDaysAug?: string | number;
    workingDaysSep?: string | number;
    workingDaysOct?: string | number;
    workingDaysNov?: string | number;
    workingDaysDec?: string | number;
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
    budgetedCrop: defaultValues(),
    crop: defaultValues(),
    cropPerDay: defaultValues(),
    balance: defaultValues(),
    perDay: defaultValues(),
    rlo: defaultValues(),
    workOfferedDays: defaultValues(),
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

const budgetMonthPropertyMap: Record<string, keyof CropBudgetConfig> = {
    '01': 'budgetJan',
    '02': 'budgetFeb',
    '03': 'budgetMar',
    '04': 'budgetApr',
    '05': 'budgetMay',
    '06': 'budgetJun',
    '07': 'budgetJul',
    '08': 'budgetAug',
    '09': 'budgetSep',
    '10': 'budgetOct',
    '11': 'budgetNov',
    '12': 'budgetDec',
};

const calculateBudgetedCropToDate = (config: CropBudgetConfig | null | undefined, selectedDate: string) => {
    const [year, month, day] = selectedDate.split('-');
    const monthBudget = Number(config?.[budgetMonthPropertyMap[month] || 'budgetJan'] || 0);
    const monthKey = `${year}-${month}`;
    const workingDayCalendar = parseWorkingDayCalendar(config?.workingDayCalendar);
    const totalWorkingDays = getWorkingDaysCountForMonth(workingDayCalendar, monthKey);
    const elapsedWorkingDays = countWorkingDaysUpTo(workingDayCalendar, monthKey, Number(day) || 0);

    if (monthBudget <= 0 || totalWorkingDays <= 0 || elapsedWorkingDays <= 0) {
        return 0;
    }

    return (monthBudget / totalWorkingDays) * elapsedWorkingDays;
};

const calculateBudgetedCropForToday = (config: CropBudgetConfig | null | undefined, selectedDate: string) => {
    const [year, month, day] = selectedDate.split('-');
    const monthBudget = Number(config?.[budgetMonthPropertyMap[month] || 'budgetJan'] || 0);
    const monthKey = `${year}-${month}`;
    const workingDayCalendar = parseWorkingDayCalendar(config?.workingDayCalendar);
    const totalWorkingDays = getWorkingDaysCountForMonth(workingDayCalendar, monthKey);

    if (monthBudget <= 0 || totalWorkingDays <= 0 || !isWorkingDay(workingDayCalendar, monthKey, Number(day) || 0)) {
        return 0;
    }

    return monthBudget / totalWorkingDays;
};

const fmtWithUnit = (raw: string, unit?: string) => {
    const value = String(raw ?? '').trim();
    if (!value || value === '-') return '-';
    const u = String(unit ?? '').trim();
    if (!u) return value;
    if (u.toLowerCase() === 'rs.' || u.toLowerCase() === 'rs') return `Rs. ${value}`;
    return `${value} ${u}`;
};

const fmtMaybeZero = (n: number, digits: number) => (Number.isFinite(n) ? n.toFixed(digits) : '-');

type DisplayRow = {
    id: string;
    label: string;
    today: string;
    toDate: string;
    emphasis?: 'normal' | 'dark';
};

const metricRows: MetricRow[] = [
    { label: 'Budgeted Crop',     unit: 'Kg',     values: defaultValues() },
    { label: 'Crop',              unit: 'Kg',     values: defaultValues() },
    { label: 'Crop per day',      unit: 'Kg',     values: defaultValues() },
    { label: 'Balance',           unit: 'Kg',     values: defaultValues(), emphasis: 'dark' },
    { label: 'Per Day',           unit: 'Kg',     values: defaultValues() },
    { label: 'Work Offered days', unit: 'Days',   values: defaultValues() },
    { label: 'Plucking Average',  unit: 'Kg',     values: defaultValues() },
    { label: 'Plucking Cost',     unit: 'Rs.',    values: defaultValues() },
    { label: 'Weeding Cost',      unit: 'Rs.',    values: defaultValues() },
    { label: 'RLO',               unit: 'Kg/LD',  values: defaultValues(), emphasis: 'dark' },
    { label: 'Crop/Acre',         unit: 'Kg/Ac', values: defaultValues() },
    { label: 'Checkroll Weight',  unit: 'Kg',     values: defaultValues() },
];

export default function CropAchievements() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;
    const divisionAccess: string[] = Array.isArray(userSession?.divisionAccess) ? userSession.divisionAccess : [];
    const [reportDate, setReportDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const [loading, setLoading] = useState(true);
    const [activeCrops, setActiveCrops] = useState<CropKey[]>(['TEA']);
    const [selectedCrop, setSelectedCrop] = useState<CropKey>('TEA');
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

                const allFieldsList = fieldsRes.data || [];
                const fieldsList =
                    divisionAccess.length > 0
                        ? allFieldsList.filter((field: any) => divisionAccess.includes(String(field?.divisionId || '')))
                        : allFieldsList;
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
                setSelectedCrop((prev) => (cropsToShow.includes(prev) ? prev : cropsToShow[0]));

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

                const cropConfigResponses = await Promise.all(
                    cropsToShow.map(async (crop) => {
                        try {
                            const response = await axios.get('/api/crop-configs', {
                                params: { tenantId, cropType: crop },
                            });
                            return [crop, (response.data || null) as CropBudgetConfig | null] as const;
                        } catch {
                            return [crop, null] as const;
                        }
                    })
                );
                const cropConfigMap = new Map<CropKey, CropBudgetConfig | null>(cropConfigResponses);

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
                        labourDaysDay: number;
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
                            labourDaysDay: 0,
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

                        if (isPresent) {
                            // Labour days = worker-days (count each present/half-day worker once per day).
                            dayData.labourDaysDay += 1;
                        }

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
                    let labourDaysToDate = 0;

                    for (let day = 1; day <= selectedDay; day++) {
                        const dayData = dayMap.get(day);
                        if (!dayData) continue;

                        factoryToDate += dayData.factoryWeightDay;
                        cashKilosToDate += dayData.cashKilosDay;
                        permCasualPluckersToDate += dayData.permAndCasualPluckersDay;
                        checkrollToDate += dayData.checkrollWeightDay;
                        permCasualWeightToDate += dayData.permAndCasualWeightDay;
                        labourDaysToDate += dayData.labourDaysDay;
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
                    const budgetedCropToDate = calculateBudgetedCropToDate(cropConfigMap.get(crop), reportDate);
                    const budgetedCropToday = calculateBudgetedCropForToday(cropConfigMap.get(crop), reportDate);
                    const cropWorkingDayCalendar = parseWorkingDayCalendar(cropConfigMap.get(crop)?.workingDayCalendar);
                    const reportMonthKey = `${year}-${month}`;
                    const elapsedWorkingDays = countWorkingDaysUpTo(cropWorkingDayCalendar, reportMonthKey, selectedDay);
                    const totalWorkingDaysInMonth = getWorkingDaysCountForMonth(cropWorkingDayCalendar, reportMonthKey);
                    const remainingWorkingDays = Math.max(0, totalWorkingDaysInMonth - elapsedWorkingDays);
                    const monthBudgetTotal = Number(
                        cropConfigMap.get(crop)?.[budgetMonthPropertyMap[month] || 'budgetJan'] || 0
                    );

                    nextMetrics.budgetedCrop[crop].today =
                        budgetedCropToday > 0 ? budgetedCropToday.toFixed(1) : '-';
                    nextMetrics.budgetedCrop[crop].toDate =
                        budgetedCropToDate > 0 ? budgetedCropToDate.toFixed(1) : '-';

                    // Crop (Actual)
                    nextMetrics.crop[crop].today =
                        todayData && todayData.factoryWeightDay > 0 ? todayData.factoryWeightDay.toFixed(1) : '-';
                    nextMetrics.crop[crop].toDate = factoryToDate > 0 ? factoryToDate.toFixed(1) : '-';

                    // Crop per day (Actual per working day)
                    nextMetrics.cropPerDay[crop].today =
                        todayData && todayData.factoryWeightDay > 0 ? todayData.factoryWeightDay.toFixed(1) : '-';
                    nextMetrics.cropPerDay[crop].toDate =
                        factoryToDate > 0 && elapsedWorkingDays > 0
                            ? (factoryToDate / elapsedWorkingDays).toFixed(2)
                            : '-';

                    // Balance = Budget - Actual
                    nextMetrics.balance[crop].today =
                        budgetedCropToday > 0 && todayData
                            ? (budgetedCropToday - todayData.factoryWeightDay).toFixed(1)
                            : '-';
                    nextMetrics.balance[crop].toDate =
                        budgetedCropToDate > 0
                            ? (budgetedCropToDate - factoryToDate).toFixed(1)
                            : '-';

                    // Per Day = required per remaining working day to meet monthly budget
                    const remainingBudget = monthBudgetTotal > 0 ? monthBudgetTotal - factoryToDate : 0;
                    const requiredPerDay =
                        monthBudgetTotal > 0 && remainingWorkingDays > 0
                            ? remainingBudget / remainingWorkingDays
                            : null;
                    nextMetrics.perDay[crop].today =
                        requiredPerDay && Number.isFinite(requiredPerDay) ? requiredPerDay.toFixed(2) : '-';
                    nextMetrics.perDay[crop].toDate =
                        requiredPerDay && Number.isFinite(requiredPerDay) ? requiredPerDay.toFixed(2) : '-';

                    nextMetrics.workOfferedDays[crop].today =
                        isWorkingDay(cropWorkingDayCalendar, reportMonthKey, selectedDay) ? '1' : '0';
                    nextMetrics.workOfferedDays[crop].toDate = String(elapsedWorkingDays);

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

                    // RLO (Revenue Labour Output / Rate of Labour Output)
                    // = Output (kg) per labour day (worker-day).
                    // Using factory weight as the "total output" measure.
                    nextMetrics.rlo[crop].today =
                        todayData && todayData.labourDaysDay > 0
                            ? (todayData.factoryWeightDay / todayData.labourDaysDay).toFixed(2)
                            : '-';
                    nextMetrics.rlo[crop].toDate =
                        labourDaysToDate > 0 ? (factoryToDate / labourDaysToDate).toFixed(2) : '-';

                    // Plucking Cost — total Rs. from Cost Analysis
                    nextMetrics.pluckingCost[crop].today =
                        pluckingDayAmount > 0 ? pluckingDayAmount.toFixed(2) : '-';
                    nextMetrics.pluckingCost[crop].toDate =
                        pluckingTodateAmount > 0 ? pluckingTodateAmount.toFixed(2) : '-';

                    // Weeding Cost — Chemical Weeding + Manual Weeding totals in Rs.
                    nextMetrics.weedingCost[crop].today =
                        weedingDayAmount > 0 ? weedingDayAmount.toFixed(2) : '-';
                    nextMetrics.weedingCost[crop].toDate =
                        weedingTodateAmount > 0 ? weedingTodateAmount.toFixed(2) : '-';

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
                if (row.label === 'Budgeted Crop') {
                    return { ...row, values: achievementMetrics.budgetedCrop };
                }
                if (row.label === 'Crop') {
                    return { ...row, values: achievementMetrics.crop };
                }
                if (row.label === 'Crop per day') {
                    return { ...row, values: achievementMetrics.cropPerDay };
                }
                if (row.label === 'Balance') {
                    return { ...row, values: achievementMetrics.balance };
                }
                if (row.label === 'Per Day') {
                    return { ...row, values: achievementMetrics.perDay };
                }
                if (row.label === 'Work Offered days') {
                    return { ...row, values: achievementMetrics.workOfferedDays };
                }
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
                if (row.label === 'RLO') {
                    return { ...row, values: achievementMetrics.rlo };
                }
                if (row.label === 'Crop/Acre') {
                    return { ...row, values: achievementMetrics.cropAcre };
                }
                return row;
            }),
        [achievementMetrics]
    );

    const gridRows: DisplayRow[] = useMemo(
        () =>
            displayedRows.map((row) => ({
                id: row.label,
                label: row.label,
                today: fmtWithUnit(row.values[selectedCrop].today, row.unit),
                toDate: fmtWithUnit(row.values[selectedCrop].toDate, row.unit),
                emphasis: row.emphasis,
            })),
        [displayedRows, selectedCrop]
    );

    const gridColumns: GridColDef<DisplayRow>[] = useMemo(
        () => [
            {
                field: 'label',
                headerName: 'Metric',
                flex: 1.2,
                minWidth: 240,
            },
            {
                field: 'today',
                headerName: 'Today',
                flex: 0.7,
                minWidth: 160,
                align: 'right',
                headerAlign: 'center',
            },
            {
                field: 'toDate',
                headerName: 'To Date',
                flex: 0.7,
                minWidth: 160,
                align: 'right',
                headerAlign: 'center',
            },
        ],
        []
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
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1.5}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        justifyContent="space-between"
                        sx={{
                            px: 1.25,
                            py: 1,
                            borderRadius: 2,
                            border: '1px solid rgba(53,91,43,0.35)',
                            bgcolor: '#f7fbf3',
                        }}
                    >
                        <Box>
                            <Typography sx={{ fontWeight: 800, color: '#1e2f18', lineHeight: 1.1 }}>
                                {formattedReportDate}
                            </Typography>
                            <Typography sx={{ color: '#476a34', fontVariantNumeric: 'tabular-nums' }}>
                                {reportTime}
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" justifyContent="flex-end">
                            <Stack direction="row" spacing={0.75} alignItems="center">
                                <Typography sx={{ fontWeight: 800, color: '#355b2b', fontSize: '0.88rem' }}>
                                    Crop
                                </Typography>
                                <ToggleButtonGroup
                                    size="small"
                                    exclusive
                                    value={selectedCrop}
                                    onChange={(_, value) => {
                                        if (value) setSelectedCrop(value);
                                    }}
                                    disabled={activeCrops.length <= 1}
                                    sx={{
                                        bgcolor: '#ffffff',
                                        borderRadius: 2,
                                        '& .MuiToggleButton-root': {
                                            textTransform: 'none',
                                            fontWeight: 800,
                                            px: 1.25,
                                            py: 0.35,
                                            borderColor: 'rgba(53,91,43,0.35)',
                                            color: '#355b2b',
                                            minWidth: 72,
                                        },
                                        '& .MuiToggleButton-root.Mui-selected': {
                                            bgcolor: '#2e7d32',
                                            color: '#fff',
                                        },
                                        '& .MuiToggleButton-root.Mui-selected:hover': {
                                            bgcolor: '#1b5e20',
                                        },
                                    }}
                                >
                                    {(activeCrops.length > 0 ? activeCrops : (['TEA'] as CropKey[])).map((crop) => (
                                        <ToggleButton key={crop} value={crop}>
                                            {crop}
                                        </ToggleButton>
                                    ))}
                                </ToggleButtonGroup>
                            </Stack>
                            <TextField
                                type="date"
                                size="small"
                                value={reportDate}
                                onChange={(e) => setReportDate(e.target.value)}
                                sx={{
                                    bgcolor: '#fff',
                                    maxWidth: 190,
                                    '& .MuiOutlinedInput-root': { borderRadius: 2 },
                                }}
                            />
                        </Stack>
                    </Stack>
                </Box>

                <Box
                    sx={{
                        border: '1px solid #355b2b',
                        bgcolor: '#f7fbf3',
                    }}
                >
                    <DataGrid
                        rows={gridRows}
                        columns={gridColumns}
                        hideFooter
                        disableColumnMenu
                        disableRowSelectionOnClick
                        columnHeaderHeight={44}
                        getRowHeight={() => 36}
                        sx={{
                            border: 0,
                            '& .MuiDataGrid-columnHeaders, & .MuiDataGrid-columnHeader': {
                                bgcolor: '#e8f5e9',
                                color: '#1e2f18',
                                borderBottom: '2px solid #355b2b',
                            },
                            '& .MuiDataGrid-columnHeaderTitle': {
                                fontWeight: 900,
                                letterSpacing: 0.2,
                            },
                            '& .MuiDataGrid-cell': {
                                borderBottom: '1px solid rgba(53,91,43,0.45)',
                                py: 0.25,
                                fontSize: '0.92rem',
                                color: '#20361b',
                            },
                            '& .row-dark .MuiDataGrid-cell': {
                                background: '#6ea14a',
                                fontWeight: 800,
                            },
                            '& .row-dark:hover .MuiDataGrid-cell': {
                                background: '#6ea14a',
                            },
                            '& .MuiDataGrid-row:hover': {
                                bgcolor: 'rgba(46,125,50,0.06)',
                            },
                            '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus': {
                                outline: 'none',
                            },
                        }}
                        getRowClassName={(params) => (params.row.emphasis === 'dark' ? 'row-dark' : '')}
                    />
                </Box>
            </Paper>
        </Box>
    );
}
