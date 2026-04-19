import { 
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Tabs, Tab, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, 
    InputAdornment, Stack, Card, useTheme, useMediaQuery
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import * as XLSX from 'xlsx';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    countWorkingDaysUpTo,
    getWorkingDaysCountForMonth,
    getWorkingDaysForMonth,
    isWorkingDay,
    parseWorkingDayCalendar,
    serializeWorkingDayCalendar,
    toggleWorkingDay,
} from '../../../utils/workingDayCalendar';

export default function CropBook() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const userRole = userSession.role;

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isManagerOrChief = userRole === 'MANAGER' || userRole === 'MANAGER_CLERK' || userRole === 'CHIEF_CLERK' || userRole === 'ESTATE_ADMIN';
    const isChiefClerk = userRole === 'CHIEF_CLERK';

    const [activeCrop, setActiveCrop] = useState('Tea');
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    const [realData, setRealData] = useState<any[]>([]);
    const [availableCrops, setAvailableCrops] = useState<string[]>(['Tea']); // Default
    const [config, setConfig] = useState<any>({
        budgetYear: '',
        budgetApr: '', budgetMay: '', budgetJun: '',
        budgetJul: '', budgetAug: '', budgetSep: '',
        budgetOct: '', budgetNov: '', budgetDec: '',
        budgetJan: '', budgetFeb: '', budgetMar: '',
        workingDaysApr: '', workingDaysMay: '', workingDaysJun: '',
        workingDaysJul: '', workingDaysAug: '', workingDaysSep: '',
        workingDaysOct: '', workingDaysNov: '', workingDaysDec: '',
        workingDaysJan: '', workingDaysFeb: '', workingDaysMar: '',
        workingDayCalendar: '',
        aththamaWage: '',
        overKiloRate: '',
        cashKiloRate: '',
        otHourRate: ''
    });
    const [achievedLastMonthAuto, setAchievedLastMonthAuto] = useState<number>(0);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [openConfig, setOpenConfig] = useState(false);
    const [openWages, setOpenWages] = useState(false);

    const loadConfig = async (cropType: string) => {
        try {
            const res = await axios.get(`/api/crop-configs?tenantId=${userSession.tenantId}&cropType=${cropType}`);
            if (res.data) {
                setConfig({
                    budgetYear: res.data.budgetYear || '',
                    budgetApr: res.data.budgetApr || '', budgetMay: res.data.budgetMay || '', budgetJun: res.data.budgetJun || '',
                    budgetJul: res.data.budgetJul || '', budgetAug: res.data.budgetAug || '', budgetSep: res.data.budgetSep || '',
                    budgetOct: res.data.budgetOct || '', budgetNov: res.data.budgetNov || '', budgetDec: res.data.budgetDec || '',
                    budgetJan: res.data.budgetJan || '', budgetFeb: res.data.budgetFeb || '', budgetMar: res.data.budgetMar || '',
                    workingDaysApr: res.data.workingDaysApr || '', workingDaysMay: res.data.workingDaysMay || '', workingDaysJun: res.data.workingDaysJun || '',
                    workingDaysJul: res.data.workingDaysJul || '', workingDaysAug: res.data.workingDaysAug || '', workingDaysSep: res.data.workingDaysSep || '',
                    workingDaysOct: res.data.workingDaysOct || '', workingDaysNov: res.data.workingDaysNov || '', workingDaysDec: res.data.workingDaysDec || '',
                    workingDaysJan: res.data.workingDaysJan || '', workingDaysFeb: res.data.workingDaysFeb || '', workingDaysMar: res.data.workingDaysMar || '',
                    workingDayCalendar: res.data.workingDayCalendar || '',
                    aththamaWage: res.data.aththamaWage || '',
                    overKiloRate: res.data.overKiloRate || '',
                    cashKiloRate: res.data.cashKiloRate || '',
                    otHourRate: res.data.otHourRate || ''
                });
            }
        } catch (e) {
            console.error("Failed to load crop configs");
        }
    };

    useEffect(() => {
        loadConfig(activeCrop);
    }, [activeCrop]);

    // Live clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Auto-calculate Achieved Crop up to Last Month from system data
    // Calendar-year logic: sum factory weights from Jan 1 up to end of the previous month.
    useEffect(() => {
        const fetchAchievedLastMonth = async () => {
            try {
                const [selYearStr, selMonthStr] = selectedMonth.split('-');
                const selYear = Number(selYearStr);
                const selMonth = Number(selMonthStr);

                const startMonth = { year: selYear, month: 1 }; // January

                // "Last month" = month before selected month
                const lastMonthDate = new Date(selYear, selMonth - 2, 1);
                const lastMonthYear = lastMonthDate.getFullYear();
                const lastMonth = lastMonthDate.getMonth() + 1;

                // January has no previous month in the same calendar year
                if (selMonth === 1) {
                    setAchievedLastMonthAuto(0);
                    return;
                }

                // Fetch fields to build a fieldId -> cropType map for crop filtering
                const fieldsRes = await axios.get(`/api/fields?tenantId=${userSession.tenantId}`);
                const fieldCropMap = new Map<string, string>();
                (fieldsRes.data || []).forEach((f: any) => {
                    if (f.id && f.cropType) fieldCropMap.set(String(f.id), f.cropType.toLowerCase());
                    if (f.name && f.cropType) fieldCropMap.set(String(f.name).toLowerCase(), f.cropType.toLowerCase());
                });

                // Fetch month-by-month (Jan -> previous month) to avoid all-or-nothing failures.
                let total = 0;
                const seenWorkIds = new Set<string>();
                const months: { year: number; month: number }[] = [];
                let y = startMonth.year;
                let m = startMonth.month;
                while (y < lastMonthYear || (y === lastMonthYear && m <= lastMonth)) {
                    months.push({ year: y, month: m });
                    m++;
                    if (m > 12) {
                        m = 1;
                        y++;
                    }
                }

                for (const { year, month } of months) {
                    try {
                        const mm = String(month).padStart(2, '0');
                        const lastDay = new Date(year, month, 0).getDate();
                        const res = await axios.get(
                            `/api/operations/daily-work?tenantId=${userSession.tenantId}&startDate=${year}-${mm}-01&endDate=${year}-${mm}-${String(lastDay).padStart(2, '0')}`
                        );
                        const ops = res.data || [];

                        ops.forEach((op: any) => {
                            // Defensive filter: only accept records that truly belong to this month.
                            if (!op.workDate || !String(op.workDate).startsWith(`${year}-${mm}`)) return;

                            // Prevent duplicate counting if API returns duplicated rows.
                            const opKey = String(op.workId || op.id || `${op.workDate}-${op.fieldId || ''}`);
                            if (seenWorkIds.has(opKey)) return;
                            seenWorkIds.add(opKey);

                            if (op.bulkWeights) {
                                try {
                                    const bw = JSON.parse(op.bulkWeights);

                                    // Match by fieldId first; fallback to bulkWeights field keys.
                                    let cropMatches = fieldCropMap.get(String(op.fieldId)) === activeCrop.toLowerCase();
                                    if (!cropMatches) {
                                        for (const key in bw) {
                                            if (key === '__FACTORY__') continue;
                                            if (fieldCropMap.get(String(key).toLowerCase()) === activeCrop.toLowerCase()) {
                                                cropMatches = true;
                                                break;
                                            }
                                        }
                                    }
                                    if (!cropMatches) return;

                                    // Factory weight is inside bulkWeights JSON under __FACTORY__ key
                                    if (bw.__FACTORY__?.factoryWt) {
                                        total += Number(bw.__FACTORY__.factoryWt);
                                    }
                                } catch (e) { /* ignore malformed JSON */ }
                            }
                        });
                    } catch (monthError) {
                        // Continue with remaining months even if one month request fails.
                        console.warn(`Failed to load achieved data for ${year}-${String(month).padStart(2, '0')}`, monthError);
                    }
                }

                setAchievedLastMonthAuto(Math.round(total * 10) / 10);
            } catch (e) {
                console.error('Failed to auto-calculate achieved last month', e);
                setAchievedLastMonthAuto(0);
            }
        };
        fetchAchievedLastMonth();
    }, [selectedMonth, activeCrop]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
                const tenantId = userSession.tenantId;

                const [year, month] = selectedMonth.split('-');
                const startDate = `${year}-${month}-01`;
                const lastDay = new Date(Number(year), Number(month), 0).getDate();
                const endDate = `${year}-${month}-${lastDay}`;

                const [workRes, attRes, fieldsRes, workersRes] = await Promise.all([
                    axios.get(`/api/operations/daily-work?tenantId=${tenantId}&startDate=${startDate}&endDate=${endDate}`),
                    axios.get(`/api/operations/attendance?tenantId=${tenantId}&startDate=${startDate}&endDate=${endDate}`),
                    axios.get(`/api/fields?tenantId=${tenantId}`),
                    axios.get(`/api/workers?tenantId=${tenantId}`)
                ]);

                const workList = workRes.data || [];
                const attList = attRes.data || [];
                const fieldsList = fieldsRes.data || [];
                const workersList = workersRes.data || [];

                // Determine active crops dynamically based on fields the tenant has
                const cropsSet = new Set<string>();
                fieldsList.forEach((f: any) => {
                    if (f.cropType && f.cropType.trim() !== '') {
                        cropsSet.add(f.cropType.trim());
                    }
                });

                let detectedCrops = Array.from(cropsSet);
                if (detectedCrops.length === 0) detectedCrops = ['Tea']; // Fallback

                // If the active crop isn't in the newly fetched available crops (eg on first load), switch it
                if (!detectedCrops.map(c => c.toLowerCase()).includes(activeCrop.toLowerCase()) && detectedCrops.length > 0) {
                    setActiveCrop(detectedCrops[0]);
                    loadConfig(detectedCrops[0]); // Load config for the *actual* matched crop
                }

                setAvailableCrops(detectedCrops);

                const workerTypeMap = new Map();
                workersList.forEach((w: any) => {
                    workerTypeMap.set(w.id, w.employmentType);
                });

                // Calculate total acreage for the active crop
                const totalAcreage = fieldsList
                    .filter((f: any) => f.cropType && f.cropType.toLowerCase() === activeCrop.toLowerCase())
                    .reduce((sum: number, f: any) => sum + (f.acreage || 0), 0);

                // If totalAcreage is 0 or less, avoid division by zero
                const acreageDivisor = totalAcreage > 0 ? totalAcreage : 1;

                const dayMap = new Map();
                // Track acreage of fields actually worked each day (for accurate yield per acre)
                const dayActiveAcreage = new Map<number, number>(); // day -> total active acreage
                const daySeenFields = new Map<number, Set<string>>(); // day -> Set of fieldIds already counted
                for (let i = 1; i <= lastDay; i++) {
                    dayMap.set(i, {
                        day: i, factoryWeightDay: 0, fieldWeightDay: 0, checkrollWeightDay: 0,
                        noOfPluckersDay: 0, permAndCasualPluckersDay: 0, permAndCasualWeightDay: 0,
                        overKilosDay: 0, cashKilosDay: 0,
                        fullAththamaCount: 0,   // PERM/CASUAL workers on FULL DAY
                        halfAththamaCount: 0,   // PERM/CASUAL workers on HALF DAY
                        permCasualOverKilosDay: 0, // Over kilos for PERM/CASUAL workers only
                        otHoursDay: 0            // Total OT hours for the day
                    });
                    dayActiveAcreage.set(i, 0);
                    daySeenFields.set(i, new Set());
                }

                const workMap = new Map();
                const fieldListMap = new Map();
                const fieldNameMap = new Map(); // field name -> field object (for bulkWeights lookup)
                fieldsList.forEach((f: any) => {
                    fieldListMap.set(f.id, f);
                    if (f.name) fieldNameMap.set(f.name, f);
                });

                // Process Daily Works (Bulk Weights for Factory/Field sum)
                workList.forEach((w: any) => {
                    const field = fieldListMap.get(w.fieldId) || {};
                    const cropMatch = field.cropType && field.cropType.toLowerCase() === activeCrop.toLowerCase();

                    if (!cropMatch) return; // Ignore works that aren't for the active crop

                    // Validate this work record belongs to the selected year-month
                    if (!w.workDate || !w.workDate.startsWith(`${year}-${month}`)) return;

                    const d = parseInt(w.workDate.split('-')[2], 10);
                    if (!dayMap.has(d)) return;
                    const dayData = dayMap.get(d);

                    workMap.set(w.workId || w.id, w);

                    if (w.bulkWeights) {
                        try {
                            const bw = JSON.parse(w.bulkWeights);
                            let dailyFieldSum = 0;
                            let dailyFacSum = 0;
                            const seenToday = daySeenFields.get(d);

                            for (const key in bw) {
                                if (key === '__FACTORY__' && bw[key].factoryWt) {
                                    dailyFacSum += Number(bw[key].factoryWt);
                                } else if (bw[key].fieldWt) {
                                    dailyFieldSum += Number(bw[key].fieldWt);
                                    // Track acreage per harvested field (by field name in bulkWeights)
                                    if (seenToday && !seenToday.has(key)) {
                                        seenToday.add(key);
                                        const harvestedField = fieldNameMap.get(key);
                                        if (harvestedField) {
                                            dayActiveAcreage.set(d, (dayActiveAcreage.get(d) || 0) + Number(harvestedField.acreage || 0));
                                        }
                                    }
                                }
                            }
                            dayData.fieldWeightDay += dailyFieldSum;
                            dayData.factoryWeightDay += dailyFacSum;
                        } catch (e) { }
                    }
                });

                // Process Attendance (Checkroll, Over Kilos, Cash Kilos, Pluckers count)
                attList.forEach((a: any) => {
                    const work = workMap.get(a.dailyWorkId);
                    // ONLY count this attendance record towards Crop Book metrics IF 
                    // the corresponding DailyWork has had its Evening Muster (bulkWeights) submitted.
                    // And it must exist in `workMap`, which already filters by `activeCrop`.
                    if (!work || !work.bulkWeights) return;

                    // Filter out non-harvesting tasks so they don't corrupt the checkroll & headcounts
                    if (activeCrop.toLowerCase() === 'tea' && a.workType?.toLowerCase() !== 'plucking') return;
                    if (activeCrop.toLowerCase() === 'rubber' && a.workType?.toLowerCase() !== 'tapping') return;

                    // Validate this attendance record belongs to the selected year-month
                    if (!a.workDate || !a.workDate.startsWith(`${year}-${month}`)) return;

                    const d = parseInt(a.workDate.split('-')[2], 10);
                    if (!dayMap.has(d)) return;
                    const dayData = dayMap.get(d);

                    const wType = workerTypeMap.get(a.workerId);

                    if (a.status === 'PRESENT' || a.status === 'HALF_DAY') {
                        dayData.noOfPluckersDay++;
                        if (wType === 'PERMANENT' || wType === 'CASUAL') {
                            dayData.permAndCasualPluckersDay++;
                            const am = Number(a.amWeight || a.am || 0);
                            const pm = Number(a.pmWeight || a.pm || 0);
                            const over = Number(a.overKilos || 0);
                            // Yield per Acre uses only actual AM+PM plucking weight, NOT Over/Cash (those are bonuses)
                            dayData.permAndCasualWeightDay += (am + pm);
                            // Track full vs half athtama for accurate cost calculation
                            if (a.status === 'PRESENT') {
                                dayData.fullAththamaCount++;
                            } else { // HALF_DAY
                                dayData.halfAththamaCount++;
                            }
                            // Track over kilos for perm/casual separately
                            dayData.permCasualOverKilosDay += over;
                        }
                    }
                    if (a.amWeight || a.am) dayData.checkrollWeightDay += Number(a.amWeight || a.am);
                    if (a.pmWeight || a.pm) dayData.checkrollWeightDay += Number(a.pmWeight || a.pm);
                    if (a.overKilos) dayData.overKilosDay += Number(a.overKilos);
                    if (a.cashKilos) dayData.cashKilosDay += Number(a.cashKilos);
                    // Accumulate OT hours for cost calculation
                    if (a.otHours) dayData.otHoursDay += Number(a.otHours);
                });

                const finalData = [];
                let facToDate = 0, fldToDate = 0, chkToDate = 0, plkToDate = 0, oKToDate = 0, cKToDate = 0, permCasPlkToDate = 0, permCasWtToDate = 0;

                const now = new Date();
                const currentY = now.getFullYear();
                const currentM = now.getMonth() + 1;
                const currentD = now.getDate();
                const selY = Number(year);
                const selM = Number(month);

                for (let i = 1; i <= lastDay; i++) {
                    const d = dayMap.get(i);

                    const isFuture = (selY > currentY) ||
                        (selY === currentY && selM > currentM) ||
                        (selY === currentY && selM === currentM && i > currentD);

                    if (!isFuture) {
                        facToDate += d.factoryWeightDay;
                        fldToDate += d.fieldWeightDay;
                        chkToDate += d.checkrollWeightDay;
                        plkToDate += d.noOfPluckersDay;
                        oKToDate += d.overKilosDay;
                        cKToDate += d.cashKilosDay;
                        permCasPlkToDate += d.permAndCasualPluckersDay;
                        permCasWtToDate += d.permAndCasualWeightDay;
                    }

                    // Plucking Average: (Factory Weight - Cash Kilos) / Permanent+Casual Workers
                    const pAvgDay = (!isFuture && d.permAndCasualPluckersDay > 0) ? ((d.factoryWeightDay - d.cashKilosDay) / d.permAndCasualPluckersDay) : 0;
                    const pAvgToDate = (!isFuture && permCasPlkToDate > 0) ? ((facToDate - cKToDate) / permCasPlkToDate) : 0;

                    // Yield per Acre Day: only acreage of fields actually worked that day
                    const activeAcreageDay = dayActiveAcreage.get(i) || 0;
                    const yPerAcreDay = (!isFuture && activeAcreageDay > 0) ? (d.permAndCasualWeightDay / activeAcreageDay) : 0;
                    const yPerAcreToDate = (!isFuture && totalAcreage > 0) ? (permCasWtToDate / acreageDivisor) : 0;

                    // Plucking Cost Per Kg:
                    // = (full athtama workers × wage) + (half athtama workers × wage/2) + (perm/casual over kilos × rate) + (OT hours × OT hour rate)
                    // Divided by total perm/casual weight (not factory weight)
                    const aththamaWage = Number(config.aththamaWage || 0);
                    const overKiloRate = Number(config.overKiloRate || 0);
                    const otHourRate = Number(config.otHourRate || 0);

                    const costDay =
                        (d.fullAththamaCount * aththamaWage) +
                        (d.halfAththamaCount * (aththamaWage / 2)) +
                        (d.permCasualOverKilosDay * overKiloRate) +
                        (d.otHoursDay * otHourRate);
                    const costDayPerKg = (!isFuture && d.permAndCasualWeightDay > 0) ? (costDay / d.permAndCasualWeightDay) : 0;

                    // Todate accumulators for cost
                    let fullAththamaTD = 0, halfAththamaTD = 0, permCasOverKgTD = 0, otHoursTD = 0;
                    for (let j = 1; j <= i; j++) {
                        const dj = dayMap.get(j);
                        const isFutureJ = (selY > currentY) ||
                            (selY === currentY && selM > currentM) ||
                            (selY === currentY && selM === currentM && j > currentD);
                        if (!isFutureJ) {
                            fullAththamaTD += dj.fullAththamaCount;
                            halfAththamaTD += dj.halfAththamaCount;
                            permCasOverKgTD += dj.permCasualOverKilosDay;
                            otHoursTD += dj.otHoursDay;
                        }
                    }
                    const costToDate =
                        (fullAththamaTD * aththamaWage) +
                        (halfAththamaTD * (aththamaWage / 2)) +
                        (permCasOverKgTD * overKiloRate) +
                        (otHoursTD * otHourRate);
                    const costToDatePerKg = (!isFuture && permCasWtToDate > 0) ? (costToDate / permCasWtToDate) : 0;

                    finalData.push({
                        day: i,
                        factoryWeightDay: (!isFuture && d.factoryWeightDay) ? d.factoryWeightDay.toFixed(1) : '',
                        factoryWeightTodate: (!isFuture && facToDate) ? facToDate.toFixed(1) : '',
                        fieldWeightDay: (!isFuture && d.fieldWeightDay) ? d.fieldWeightDay.toFixed(1) : '',
                        fieldWeightTodate: (!isFuture && fldToDate) ? fldToDate.toFixed(1) : '',
                        checkrollWeightDay: (!isFuture && d.checkrollWeightDay) ? d.checkrollWeightDay.toFixed(1) : '',
                        checkrollWeightTodate: (!isFuture && chkToDate) ? chkToDate.toFixed(1) : '',
                        yieldPerAcreDay: (!isFuture && yPerAcreDay) ? yPerAcreDay.toFixed(2) : '',
                        yieldPerAcreTodate: (!isFuture && yPerAcreToDate) ? yPerAcreToDate.toFixed(2) : '',
                        noOfPluckersDay: (!isFuture && d.noOfPluckersDay) ? d.noOfPluckersDay : '',
                        noOfPluckersTodate: (!isFuture && plkToDate) ? plkToDate : '',
                        overKilosDay: (!isFuture && d.overKilosDay) ? d.overKilosDay.toFixed(1) : '',
                        overKilosTodate: (!isFuture && oKToDate) ? oKToDate.toFixed(1) : '',
                        cashKilosDay: (!isFuture && d.cashKilosDay) ? d.cashKilosDay.toFixed(1) : '',
                        cashKilosTodate: (!isFuture && cKToDate) ? cKToDate.toFixed(1) : '',
                        pluckingAverageDay: (!isFuture && pAvgDay) ? pAvgDay.toFixed(2) : '',
                        pluckingAverageTodate: (!isFuture && pAvgToDate) ? pAvgToDate.toFixed(2) : '',
                        pluckingCostPerKgDay: (!isFuture && d.permAndCasualWeightDay > 0) ? costDayPerKg.toFixed(2) : '',
                        pluckingCostPerKgTodate: (!isFuture && permCasWtToDate > 0) ? costToDatePerKg.toFixed(2) : ''
                    });
                }

                setRealData(finalData);
            } catch (err) {
                console.error("Failed to load crop book data", err);
            }
        };
        fetchData();
    }, [selectedMonth, activeCrop, config.aththamaWage, config.overKiloRate]);

    // Totals for the month to derive KPI "Achieved Crop - Todate" 
    const lastValidDay = [...realData].reverse().find(d => d.factoryWeightTodate !== '');
    const facTodateMetric = lastValidDay ? Number(lastValidDay.factoryWeightTodate) : 0;

    // Auto-calculate "Budgeted Crop for todate" based on the current day vs total days in month
    const currentDate = new Date();
    const [selYearStr, selMonthStr] = selectedMonth.split('-');
    const selYear = Number(selYearStr);
    const selMonth = Number(selMonthStr);
    let daysPassed = 0;
    const totalDaysInMonth = new Date(selYear, selMonth, 0).getDate();

    if (currentDate.getFullYear() === selYear && (currentDate.getMonth() + 1) === selMonth) {
        daysPassed = currentDate.getDate();
    } else if (currentDate.getFullYear() > selYear || (currentDate.getFullYear() === selYear && (currentDate.getMonth() + 1) > selMonth)) {
        daysPassed = totalDaysInMonth; // the entire month passed
    }

    const monthPropertyMap: Record<string, string> = {
        '01': 'budgetJan', '02': 'budgetFeb', '03': 'budgetMar', '04': 'budgetApr',
        '05': 'budgetMay', '06': 'budgetJun', '07': 'budgetJul', '08': 'budgetAug',
        '09': 'budgetSep', '10': 'budgetOct', '11': 'budgetNov', '12': 'budgetDec'
    };

    const workingDaysPropertyMap: Record<string, string> = {
        '01': 'workingDaysJan', '02': 'workingDaysFeb', '03': 'workingDaysMar', '04': 'workingDaysApr',
        '05': 'workingDaysMay', '06': 'workingDaysJun', '07': 'workingDaysJul', '08': 'workingDaysAug',
        '09': 'workingDaysSep', '10': 'workingDaysOct', '11': 'workingDaysNov', '12': 'workingDaysDec'
    };

    const workingDayCalendar = parseWorkingDayCalendar(config.workingDayCalendar);
    const selectedMonthWorkingDays = getWorkingDaysForMonth(workingDayCalendar, selectedMonth);
    const selectedMonthWorkingDaysCount = selectedMonthWorkingDays.length;
    const calendarWeekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const calendarLeadingBlankDays = (new Date(selYear, selMonth - 1, 1).getDay() + 6) % 7;
    const calendarMonthTitle = new Date(selYear, selMonth - 1, 1).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    });

    const sysMonths = ['04', '05', '06', '07', '08', '09', '10', '11', '12', '01', '02', '03'];

    // Auto-calculate Budget up to last month (sum from April to month before selectedMonth)
    let budgetLastMonthCalculated = 0;
    const selMonthIndex = sysMonths.indexOf(selMonthStr);

    if (selMonthIndex !== -1) {
        for (let i = 0; i < selMonthIndex; i++) {
            const prop = monthPropertyMap[sysMonths[i]];
            budgetLastMonthCalculated += Number(config[prop] || 0);
        }
    }

    const budgetMonthCalculated = Number(config[monthPropertyMap[selMonthStr]] || 0);

    const elapsedWorkingDays = daysPassed > 0
        ? countWorkingDaysUpTo(workingDayCalendar, selectedMonth, daysPassed)
        : 0;
    const budgetPerWorkingDay = selectedMonthWorkingDaysCount > 0
        ? budgetMonthCalculated / selectedMonthWorkingDaysCount
        : 0;
    const automatedBudgetToDate = budgetPerWorkingDay * elapsedWorkingDays;

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonthName = monthNames[selMonth - 1];

    // Total achieved to date = previous months + current month so far
    const totalAchievedToDate = achievedLastMonthAuto + facTodateMetric;

    // Data for the left sidebar KPI section based on the db config
    const kpiData = [
        { label: `Budgeted crop for the Year`, value: `${config.budgetYear || 0} Kg`, type: 'header', bgColor: '#e8f5e9' },
        { label: `Achieved Crop - Todate (${currentMonthName})`, value: `${facTodateMetric.toFixed(1)} Kg`, type: 'achieved', bgColor: '#c8e6c9' },
        { label: `Total Achieved To Date`, value: `${totalAchievedToDate.toFixed(1)} Kg`, type: 'achieved', bgColor: '#a5d6a7' },
        { label: 'Achievement (vs Annual Budget)', value: config.budgetYear > 0 ? `${((totalAchievedToDate / Number(config.budgetYear || 0)) * 100).toFixed(2)} %` : '0 %', type: 'percentage', bgColor: '#66bb6a' },
        { label: `Budgeted crop for ${currentMonthName}`, value: `${budgetMonthCalculated} Kg`, type: 'header', bgColor: '#c8e6c9' },
        { label: 'Budgeted Crop for todate', value: `${automatedBudgetToDate.toFixed(1)} Kg`, type: 'achieved', bgColor: '#c8e6c9' },
        { label: `Achievement For ${currentMonthName}`, value: budgetMonthCalculated > 0 ? `${((facTodateMetric / budgetMonthCalculated) * 100).toFixed(2)} %` : '0 %', type: 'percentage', bgColor: '#a5d6a7' },
        { label: 'Achievement For To Date', value: automatedBudgetToDate > 0 ? `${((facTodateMetric / automatedBudgetToDate) * 100).toFixed(2)} %` : '0 %', type: 'percentage', bgColor: '#66bb6a' },
    ];

    const handleSaveConfig = async () => {
        try {
            const syncedCalendar = serializeWorkingDayCalendar(workingDayCalendar);
            await axios.post(`/api/crop-configs`, {
                tenantId: userSession.tenantId,
                cropType: activeCrop,
                ...config,
                workingDayCalendar: syncedCalendar,
                [workingDaysPropertyMap[selMonthStr]]: selectedMonthWorkingDaysCount
            });
            setOpenConfig(false);
            setOpenWages(false);
            loadConfig(activeCrop);
        } catch (e) {
            console.error("Failed to save config", e);
        }
    };

    const handleToggleWorkingDay = (day: number) => {
        const nextCalendar = toggleWorkingDay(workingDayCalendar, selectedMonth, day);
        setConfig({
            ...config,
            workingDayCalendar: serializeWorkingDayCalendar(nextCalendar),
            [workingDaysPropertyMap[selMonthStr]]: String(getWorkingDaysCountForMonth(nextCalendar, selectedMonth))
        });
    };

    return (
        <Box sx={{ pb: { xs: 2, md: 4 }, height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', p: { xs: 1, sm: 2, md: 3 } }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, gap: 2, mb: 2 }}>
                {/* Title */}
                <Typography variant={isMobile ? "h5" : "h4"} fontWeight="900" sx={{ color: '#1b5e20', letterSpacing: -0.5 }}>
                    Crop Book
                </Typography>

                {/* Center Bar: Month + Clock */}
                <Box sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', lg: 'row' },
                    alignItems: 'center',
                    gap: { xs: 1, sm: 2 },
                    bgcolor: '#f1f8e9',
                    border: '1.5px solid #a5d6a7',
                    borderRadius: 3,
                    px: { xs: 1.5, sm: 3 },
                    py: 1,
                    boxShadow: '0 2px 10px rgba(46,125,50,0.08)',
                    width: { xs: '100%', md: 'auto' }
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 900, color: '#2e7d32', textTransform: 'uppercase' }}>Month</Typography>
                        <TextField
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            size="small"
                            variant="standard"
                            InputProps={{ disableUnderline: true }}
                            sx={{ bgcolor: '#fff', px: 1, borderRadius: 1.5, '& input': { py: 0.5, fontWeight: '900', color: '#1b5e20', fontSize: '0.85rem' } }}
                        />
                    </Box>

                    {!isMobile && <Box sx={{ width: '1px', height: 32, bgcolor: '#a5d6a7' }} />}

                    <Box sx={{ textAlign: { xs: 'center', sm: 'right' }, minWidth: 120 }}>
                        <Typography sx={{ fontSize: '0.65rem', fontWeight: '800', color: '#388e3c', textTransform: 'uppercase' }}>
                            {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Typography>
                        <Typography sx={{ fontSize: '1rem', fontWeight: '900', color: '#1b5e20', fontVariantNumeric: 'tabular-nums' }}>
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </Typography>
                    </Box>

                    {!isChiefClerk && (
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<DownloadIcon />}
                            onClick={() => {
                                // Native .XLSX Export (Zero Warning Approach)
                                const worksheetData = [
                                    // Row 1: Category Headers
                                    ["", "Factory Weight", "", "Field Weight", "", "Checkroll Weight", "", "Yield per Acre", "", "No. Of Pluckers", "", "Over kilos", "", "Cash Kilos", "", "Plucking Average", "", "Plucking Cost", ""],
                                    // Row 2: Sub-Headers
                                    ["Day", "Day", "Todate", "Day", "Todate", "Day", "Todate", "Day", "Todate", "Day", "Todate", "Day", "Todate", "Day", "Todate", "Day", "Todate", "Day", "Todate"]
                                ];

                                realData.forEach(r => {
                                    worksheetData.push([
                                        r.day,
                                        r.factoryWeightDay || 0, r.factoryWeightTodate || 0,
                                        r.fieldWeightDay || 0, r.fieldWeightTodate || 0,
                                        r.checkrollWeightDay || 0, r.checkrollWeightTodate || 0,
                                        r.yieldPerAcreDay || 0, r.yieldPerAcreTodate || 0,
                                        r.noOfPluckersDay || 0, r.noOfPluckersTodate || 0,
                                        r.overKilosDay || 0, r.overKilosTodate || 0,
                                        r.cashKilosDay || 0, r.cashKilosTodate || 0,
                                        r.pluckingAverageDay || 0, r.pluckingAverageTodate || 0,
                                        r.pluckingCostPerKgDay || 0, r.pluckingCostPerKgTodate || 0
                                    ]);
                                });

                                const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
                                
                                // Apply Merges for the Stacked Header
                                worksheet['!merges'] = [
                                    { s: { r: 0, c: 1 }, e: { r: 0, c: 2 } },   // Factory Weight
                                    { s: { r: 0, c: 3 }, e: { r: 0, c: 4 } },   // Field Weight
                                    { s: { r: 0, c: 5 }, e: { r: 0, c: 6 } },   // Checkroll Weight
                                    { s: { r: 0, c: 7 }, e: { r: 0, c: 8 } },   // Yield per Acre
                                    { s: { r: 0, c: 9 }, e: { r: 0, c: 10 } },  // No. Of Pluckers
                                    { s: { r: 0, c: 11 }, e: { r: 0, c: 12 } }, // Over kilos
                                    { s: { r: 0, c: 13 }, e: { r: 0, c: 14 } }, // Cash Kilos
                                    { s: { r: 0, c: 15 }, e: { r: 0, c: 16 } }, // Plucking Average
                                    { s: { r: 0, c: 17 }, e: { r: 0, c: 18 } }  // Plucking Cost
                                ];

                                // Set Column Widths for legibility
                                worksheet['!cols'] = [
                                    { wch: 8 }, // Day
                                    ...Array(18).fill({ wch: 15 })
                                ];

                                const workbook = XLSX.utils.book_new();
                                XLSX.utils.book_append_sheet(workbook, worksheet, `Crop_Report`);
                                XLSX.writeFile(workbook, `Manager_Crop_Book_${activeCrop}_${selectedMonth}.xlsx`);
                            }}
                            sx={{
                                ml: { lg: 1 },
                                bgcolor: '#2e7d32',
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: '900',
                                px: 2,
                                '&:hover': { bgcolor: '#1b5e20' }
                            }}
                        >
                            Download Snapshot
                        </Button>
                    )}
                </Box>
            </Box>
            <Paper elevation={3} sx={{ flex: 1, display: 'flex', flexDirection: { xs: 'column', md: isChiefClerk ? 'column' : 'row' }, overflow: { xs: 'auto', md: 'hidden' }, border: '1px solid #e0e0e0', borderRadius: 2 }}>

                {/* Left Panel / Main Panel for Chief Clerk: Cost Analysis KPIs & Crop Tabs */}
                <Box sx={{ width: { xs: '100%', md: isChiefClerk ? '100%' : 320 }, flex: { xs: 'none', md: isChiefClerk ? 1 : '0 0 auto' }, borderRight: isChiefClerk ? 'none' : { xs: 'none', md: '1px solid #e0e0e0' }, borderBottom: { xs: '1px solid #e0e0e0', md: 'none' }, display: 'flex', flexDirection: 'column', overflow: { xs: 'visible', md: 'hidden' } }}>
                    <Tabs
                        variant="scrollable"
                        scrollButtons="auto"
                        value={availableCrops.includes(activeCrop) ? activeCrop : (availableCrops[0] || 'Tea')}
                        onChange={(_, v) => setActiveCrop(v)}
                        sx={{
                            minHeight: 40,
                            borderBottom: '1px solid #e0e0e0',
                            '& .MuiTab-root': {
                                minHeight: 40,
                                py: 0.5,
                                px: 2,
                                fontWeight: '900',
                                textTransform: 'uppercase',
                                color: '#666',
                                fontSize: '0.75rem',
                                letterSpacing: 1
                            },
                            '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' }
                        }}
                    >
                        {availableCrops.map(crop => {
                            let bColor = '#f5f5f5';
                            let sColor = '#bdbdbd';
                            if (crop.toLowerCase() === 'tea') { bColor = '#81c784'; sColor = '#4caf50'; }
                            if (crop.toLowerCase() === 'rubber') { bColor = '#81d4fa'; sColor = '#03a9f4'; }
                            if (crop.toLowerCase() === 'cinnamon') { bColor = '#ffe082'; sColor = '#ffc107'; }

                            return (
                                <Tab
                                    key={crop}
                                    label={crop}
                                    value={crop}
                                    sx={{
                                        bgcolor: activeCrop === crop ? sColor : bColor,
                                        '&.Mui-selected': { bgcolor: sColor, color: (crop.toLowerCase() === 'tea' || crop.toLowerCase() === 'rubber') ? '#fff !important' : '#000 !important' }
                                    }}
                                />
                            )
                        })}
                    </Tabs>

                    {/* For Chief Clerk: two-column layout with budget on left and wages on right */}
                    {isChiefClerk ? (
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, overflow: 'auto' }}>
                            {/* LEFT: Budget KPI tiles */}
                            <Box sx={{ flex: { xs: 'none', lg: '0 0 62%' }, display: 'flex', flexDirection: 'column', bgcolor: '#f9fbe7' }}>
                                <Box sx={{ px: 2, py: 1, bgcolor: '#558b2f' }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: '900', color: '#fff', letterSpacing: 1, textTransform: 'uppercase' }}>📊 Budget Targets</Typography>
                                </Box>
                                <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' }, gap: 1.5, p: 2, alignContent: 'flex-start' }}>
                                    {kpiData.map((kpi, idx) => (
                                        <Box key={idx} sx={{ bgcolor: kpi.bgColor, borderRadius: 2, p: 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid rgba(0,0,0,0.05)' }}>
                                            <Typography variant="caption" sx={{ fontWeight: '800', color: '#444' }}>{kpi.label}</Typography>
                                            <Typography variant="body1" sx={{ alignSelf: 'flex-end', fontWeight: '900', color: '#1b5e20' }}>{kpi.value}</Typography>
                                        </Box>
                                    ))}
                                </Box>
                                {isManagerOrChief && (
                                    <Box sx={{ p: 1.5, borderTop: '2px solid #c5e1a5', display: 'flex', justifyContent: 'center', bgcolor: '#f1f8e9' }}>
                                        <Button fullWidth variant="contained" color="success" size="small" onClick={() => setOpenConfig(true)}>Edit Targets</Button>
                                    </Box>
                                )}
                            </Box>
                            <Box sx={{ width: { xs: '100%', lg: '4px' }, height: { xs: '4px', lg: 'auto' }, bgcolor: '#bdbdbd' }} />
                            {/* RIGHT: Wage Rate tiles */}
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#fffde7' }}>
                                <Box sx={{ px: 2, py: 1, bgcolor: '#f57f17' }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: '900', color: '#fff', letterSpacing: 1, textTransform: 'uppercase' }}>💰 Wage Rates</Typography>
                                </Box>
                                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    {[
                                        { label: 'Aththama Wage', value: `රු. ${config.aththamaWage}`, color: '#e65100', bg: '#fff9c4' },
                                        { label: 'Over Kilo Rate', value: `රු. ${config.overKiloRate}`, color: '#e65100', bg: '#fff3e0' },
                                        { label: 'Cash Kilo Rate', value: `රු. ${config.cashKiloRate}`, color: '#33691e', bg: '#f1f8e9' },
                                        { label: 'OT Hour Rate', value: `රු. ${config.otHourRate}`, color: '#4527a0', bg: '#ede7f6' },
                                    ].map((w, i) => (
                                        <Box key={i} sx={{ bgcolor: w.bg, borderRadius: 2, p: 1.5, border: '1px solid rgba(0,0,0,0.05)' }}>
                                            <Typography variant="caption" fontWeight="800" color="text.secondary">{w.label}</Typography>
                                            <Typography variant="body1" fontWeight="900" textAlign="right" color={w.color}>{w.value}</Typography>
                                        </Box>
                                    ))}
                                </Box>
                                {isManagerOrChief && (
                                    <Box sx={{ p: 1.5, borderTop: '2px solid #ffe082', bgcolor: '#fff8e1' }}>
                                        <Button fullWidth variant="outlined" color="warning" size="small" onClick={() => setOpenWages(true)}>Edit Wages</Button>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    ) : (
                        /* Non-Chief Clerk: Horizontal Performance Bar on Mobile, Vertical list on Desktop */
                        <Box sx={{
                            width: { xs: '100%', md: 320 },
                            display: 'flex',
                            flexDirection: 'column',
                            bgcolor: '#f8f9fa',
                            height: '100%', // Ensure it takes full height
                            overflow: 'hidden' // No internal scrolling
                        }}>
                            {/* KPI Rows - using flex: 1 to distribute space evenly */}
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                {kpiData.map((kpi, idx) => (
                                    <Box key={idx} sx={{
                                        flex: 1, // Equally distribute vertical space
                                        bgcolor: kpi.bgColor,
                                        borderBottom: { xs: 'none', md: '1px solid rgba(0,0,0,0.08)' },
                                        px: 2,
                                        py: 1.2,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: 'all 0.2s ease',
                                        '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' }
                                    }}>
                                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#444' }}>{kpi.label}</Typography>
                                        <Typography sx={{ fontSize: '0.9rem', fontWeight: '1000', color: '#1b5e20' }}>{kpi.value}</Typography>
                                    </Box>
                                ))}
                            </Box>
                            
                            {/* Bottom Buttons - Fixed height */}
                            {isManagerOrChief && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 2, bgcolor: '#ffffff', borderTop: '1px solid #e0e0e0' }}>
                                    <Button fullWidth size="small" variant="contained" color="success" onClick={() => setOpenConfig(true)} sx={{ py: 1, fontSize: '0.75rem', fontWeight: '900' }}>Budgets</Button>
                                    <Button fullWidth size="small" variant="outlined" color="success" onClick={() => setOpenWages(true)} sx={{ py: 1, fontSize: '0.75rem', fontWeight: '900' }}>Wages</Button>
                                </Box>
                            )}
                        </Box>
                    )}
                </Box>

                {/* Right Panel: Data Grid / Mobile Cards */}
                {userRole !== 'CHIEF_CLERK' && (
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: { xs: 'visible', md: 'hidden' }, minHeight: { xs: 400, md: 'auto' } }}>
                        <TableContainer sx={{ 
                            flex: 1, 
                            overflow: 'auto',
                            bgcolor: '#fff',
                            borderTop: '1px solid #e0e0e0'
                        }}>
                            <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', padding: '4px 8px', whiteSpace: 'nowrap', textAlign: 'center' } }}>
                                <TableHead dropShadow={0}>
                                    <TableRow>
                                        <TableCell sx={{ bgcolor: '#fafafa', position: 'sticky', top: 0, zIndex: 3 }} />
                                        {['Factory Weight', 'Field Weight', 'Checkroll Weight', 'Yield per Acre', 'No. Of Pluckers', 'Over kilos', 'Cash Kilos', 'Plucking Average', 'Plucking Cost per Kg'].map(h => (
                                            <TableCell key={h} colSpan={2} sx={{ bgcolor: '#fafafa', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 3 }}>{h}</TableCell>
                                        ))}
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ bgcolor: '#fafafa', fontWeight: 'bold', position: 'sticky', left: isMobile ? 'auto' : 0, top: '29px', zIndex: isMobile ? 3 : 5, minWidth: 40, borderRight: '2px solid #000' }}>Day</TableCell>
                                        {Array.from({ length: 9 }).map((_, i) => (
                                            <React.Fragment key={i}>
                                                <TableCell sx={{ bgcolor: '#fafafa', fontSize: '0.75rem', position: 'sticky', top: '29px', zIndex: 3 }}>Day</TableCell>
                                                <TableCell sx={{ bgcolor: '#fafafa', fontSize: '0.75rem', position: 'sticky', top: '29px', zIndex: 3 }}>Todate</TableCell>
                                            </React.Fragment>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {realData.map((row) => (
                                        <TableRow key={row.day} sx={{ '&:hover': { bgcolor: '#f5f5f5' } }}>
                                            <TableCell sx={{ position: 'sticky', left: isMobile ? 'auto' : 0, bgcolor: '#fff', borderRight: '2px solid #ccc', fontWeight: 'bold', zIndex: isMobile ? 1 : 2 }}>{row.day}</TableCell>
                                            <TableCell>{row.factoryWeightDay}</TableCell>
                                            <TableCell>{row.factoryWeightTodate}</TableCell>
                                            <TableCell>{row.fieldWeightDay}</TableCell>
                                            <TableCell>{row.fieldWeightTodate}</TableCell>
                                            <TableCell>{row.checkrollWeightDay}</TableCell>
                                            <TableCell>{row.checkrollWeightTodate}</TableCell>
                                            <TableCell>{row.yieldPerAcreDay}</TableCell>
                                            <TableCell>{row.yieldPerAcreTodate}</TableCell>
                                            <TableCell>{row.noOfPluckersDay}</TableCell>
                                            <TableCell>{row.noOfPluckersTodate}</TableCell>
                                            <TableCell>{row.overKilosDay}</TableCell>
                                            <TableCell>{row.overKilosTodate}</TableCell>
                                            <TableCell>{row.cashKilosDay}</TableCell>
                                            <TableCell>{row.cashKilosTodate}</TableCell>
                                            <TableCell>{row.pluckingAverageDay}</TableCell>
                                            <TableCell>{row.pluckingAverageTodate}</TableCell>
                                            <TableCell>{row.pluckingCostPerKgDay}</TableCell>
                                            <TableCell>{row.pluckingCostPerKgTodate}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}
            </Paper>

            <Dialog open={openConfig} onClose={() => setOpenConfig(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Budget Metrics ({activeCrop})</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth label="Budgeted Crop for the Year (Kg)" type="number" margin="normal"
                                value={config.budgetYear} onChange={e => setConfig({ ...config, budgetYear: e.target.value.replace(/^0+(?=\d)/, '') })}
                                InputLabelProps={{ shrink: true }}
                                InputProps={{ endAdornment: <InputAdornment position="end">Kg</InputAdornment> }} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth label="Budgeted Crop up to Last Month (Kg)" type="number" margin="normal"
                                value={budgetLastMonthCalculated || ''} disabled
                                sx={{
                                    "& .MuiInputBase-input.Mui-disabled": {
                                        WebkitTextFillColor: "#1b5e20",
                                        fontWeight: 'bold'
                                    }
                                }}
                                InputLabelProps={{ shrink: true }}
                                InputProps={{ endAdornment: <InputAdornment position="end">Kg</InputAdornment> }} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth label={`Budgeted Crop for the Month (Kg)`} type="number" margin="normal"
                                value={config[monthPropertyMap[selMonthStr]] || ''}
                                onChange={e => setConfig({ ...config, [monthPropertyMap[selMonthStr]]: e.target.value.replace(/^0+(?=\d)/, '') })}
                                helperText={`Saving for: ${selectedMonth}`}
                                InputLabelProps={{ shrink: true }}
                                InputProps={{ endAdornment: <InputAdornment position="end">Kg</InputAdornment> }} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth label="Working Days for the Month" type="number" margin="normal"
                                value={selectedMonthWorkingDaysCount}
                                helperText={`Auto-count from working dates for: ${selectedMonth}`}
                                InputLabelProps={{ shrink: true }}
                                inputProps={{ min: 0, max: 31, step: 1 }}
                                disabled
                                InputProps={{ endAdornment: <InputAdornment position="end">days</InputAdornment> }} />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Box sx={{ mt: 1, p: 1.5, border: '1px solid #c8e6c9', borderRadius: 2, bgcolor: '#f8fff7' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1b5e20', mb: 0.25 }}>
                                    Working Day Calendar
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Weekdays start as working days by default. Click a date to mark it on or off for {selectedMonth}.
                                </Typography>
                                <Box sx={{
                                    mt: 1.5,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}>
                                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#1b5e20', letterSpacing: 0.3, textAlign: 'center' }}>
                                        {calendarMonthTitle}
                                    </Typography>
                                </Box>
                                <Box sx={{
                                    mt: 1.5,
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                                    gap: 0.75
                                }}>
                                    {calendarWeekLabels.map((label) => (
                                        <Box
                                            key={label}
                                            sx={{
                                                textAlign: 'center',
                                                py: 0.5,
                                                borderRadius: 1,
                                                bgcolor: '#edf7ed',
                                                color: '#2e7d32',
                                                fontWeight: 700,
                                                fontSize: '0.78rem'
                                            }}
                                        >
                                            {label}
                                        </Box>
                                    ))}
                                    {Array.from({ length: calendarLeadingBlankDays }).map((_, index) => (
                                        <Box
                                            key={`blank-${index}`}
                                            sx={{
                                                minHeight: 42,
                                                borderRadius: 1.5,
                                                bgcolor: 'transparent'
                                            }}
                                        />
                                    ))}
                                    {Array.from({ length: totalDaysInMonth }).map((_, index) => {
                                        const day = index + 1;
                                        const dayOfWeek = new Date(selYear, selMonth - 1, day).getDay();
                                        const weekend = dayOfWeek === 0 || dayOfWeek === 6;
                                        const working = isWorkingDay(workingDayCalendar, selectedMonth, day);

                                        return (
                                            <Button
                                                key={day}
                                                variant={working ? 'contained' : 'outlined'}
                                                color={working ? 'success' : 'inherit'}
                                                onClick={() => handleToggleWorkingDay(day)}
                                                sx={{
                                                    minWidth: 0,
                                                    px: 0,
                                                    py: 0.75,
                                                    minHeight: 42,
                                                    fontWeight: 700,
                                                    borderColor: weekend ? '#ef9a9a' : undefined,
                                                    bgcolor: working
                                                        ? '#43a047'
                                                        : (weekend ? '#fff3f3' : '#ffffff'),
                                                    color: working ? '#fff' : (weekend ? '#c62828' : '#1b5e20'),
                                                    '&:hover': {
                                                        bgcolor: working
                                                            ? '#2e7d32'
                                                            : (weekend ? '#ffe3e3' : '#f1f8e9')
                                                    }
                                                }}
                                            >
                                                {day}
                                            </Button>
                                        );
                                    })}
                                </Box>
                                <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'center' }}>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, justifyContent: 'center' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Box sx={{ width: 14, height: 14, borderRadius: '4px', bgcolor: '#43a047' }} />
                                            <Typography variant="caption" color="text.secondary">Working day</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Box sx={{ width: 14, height: 14, borderRadius: '4px', bgcolor: '#ffffff', border: '1px solid #c8e6c9' }} />
                                            <Typography variant="caption" color="text.secondary">Off day</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Box sx={{ width: 14, height: 14, borderRadius: '4px', bgcolor: '#fff3f3', border: '1px solid #ef9a9a' }} />
                                            <Typography variant="caption" color="text.secondary">Weekend</Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Box sx={{ p: 1.5, bgcolor: '#e8f5e9', borderRadius: 1, border: '1px solid #a5d6a7', mt: 1 }}>
                                <Typography variant="caption" color="text.secondary">Achieved Crop up to Last Month (Auto-calculated from system data)</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1b5e20', mt: 0.5 }}>{achievedLastMonthAuto} Kg</Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenConfig(false)} color="inherit">Cancel</Button>
                    <Button onClick={handleSaveConfig} variant="contained" color="primary">Save Changes</Button>
                </DialogActions>
            </Dialog >

            <Dialog open={openWages} onClose={() => setOpenWages(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Plucking Wages ({activeCrop})</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth label="Aththama Daily Wage (රු.)" type="number" margin="normal"
                                value={config.aththamaWage} onChange={e => setConfig({ ...config, aththamaWage: e.target.value.replace(/^0+(?=\d)/, '') })}
                                InputLabelProps={{ shrink: true }}
                                InputProps={{ startAdornment: <InputAdornment position="start">රු.</InputAdornment> }} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth label="Over Kilo Rate (රු. / Kg)" type="number" margin="normal"
                                value={config.overKiloRate} onChange={e => setConfig({ ...config, overKiloRate: e.target.value.replace(/^0+(?=\d)/, '') })}
                                InputLabelProps={{ shrink: true }}
                                InputProps={{ startAdornment: <InputAdornment position="start">රු.</InputAdornment> }} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth label="Cash Kilo Rate (රු. / Kg)" type="number" margin="normal"
                                value={config.cashKiloRate} onChange={e => setConfig({ ...config, cashKiloRate: e.target.value.replace(/^0+(?=\d)/, '') })}
                                InputLabelProps={{ shrink: true }}
                                InputProps={{ startAdornment: <InputAdornment position="start">රු.</InputAdornment> }} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth label="OT Hour Rate (රු. / Hour)" type="number" margin="normal"
                                value={config.otHourRate} onChange={e => setConfig({ ...config, otHourRate: e.target.value.replace(/^0+(?=\d)/, '') })}
                                InputLabelProps={{ shrink: true }}
                                InputProps={{ startAdornment: <InputAdornment position="start">රු.</InputAdornment> }} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenWages(false)} color="inherit">Cancel</Button>
                    <Button onClick={handleSaveConfig} variant="contained" color="primary">Save Changes</Button>
                </DialogActions>
            </Dialog>
        </Box >
    );
}
