import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tab, TextField, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, InputAdornment } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function CropBook() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const userRole = userSession.role;
    const isManagerOrChief = userRole === 'MANAGER' || userRole === 'MANAGER_CLERK' || userRole === 'CHIEF_CLERK';
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
        aththamaWage: '',
        overKiloRate: '',
        cashKiloRate: ''
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
                    aththamaWage: res.data.aththamaWage || '',
                    overKiloRate: res.data.overKiloRate || '',
                    cashKiloRate: res.data.cashKiloRate || ''
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
    // Financial year runs April-March. Sum factory weights from April 1 of this fin year up to end of last month.
    useEffect(() => {
        const fetchAchievedLastMonth = async () => {
            try {
                const [selYearStr, selMonthStr] = selectedMonth.split('-');
                const selYear = Number(selYearStr);
                const selMonth = Number(selMonthStr);

                // Financial year starts April (month 4)
                const finYearStart = selMonth >= 4 ? selYear : selYear - 1;
                const startMonth = { year: finYearStart, month: 4 }; // April

                // "Last month" = month before selected month
                const lastMonthDate = new Date(selYear, selMonth - 2, 1);
                const lastMonthYear = lastMonthDate.getFullYear();
                const lastMonth = lastMonthDate.getMonth() + 1;

                // If selected month IS April (start of fin year), there's no previous month in this fin year
                if (selMonth === 4 && selYear === finYearStart) {
                    setAchievedLastMonthAuto(0);
                    return;
                }

                // Fetch fields to build a fieldId -> cropType map for crop filtering
                const fieldsRes = await axios.get(`/api/fields?tenantId=${userSession.tenantId}`);
                const fieldCropMap = new Map<string, string>();
                (fieldsRes.data || []).forEach((f: any) => {
                    if (f.id && f.cropType) fieldCropMap.set(String(f.id), f.cropType.toLowerCase());
                });

                // Collect all months from fin year start to last month
                const months: { year: number; month: number }[] = [];
                let y = startMonth.year;
                let m = startMonth.month;
                while (y < lastMonthYear || (y === lastMonthYear && m <= lastMonth)) {
                    months.push({ year: y, month: m });
                    m++;
                    if (m > 12) { m = 1; y++; }
                }

                // Fetch factory weights for each month, filtered by active crop
                let total = 0;
                await Promise.all(months.map(async ({ year, month }) => {
                    const mm = String(month).padStart(2, '0');
                    const lastDay = new Date(year, month, 0).getDate();
                    const res = await axios.get(
                        `/api/operations/daily-work?tenantId=${userSession.tenantId}&startDate=${year}-${mm}-01&endDate=${year}-${mm}-${lastDay}`
                    );
                    const ops = res.data || [];
                    ops.forEach((op: any) => {
                        // Only count this daily-work if its field belongs to the active crop
                        const opCropType = fieldCropMap.get(String(op.fieldId));
                        if (!opCropType || opCropType !== activeCrop.toLowerCase()) return;

                        // Factory weight is inside bulkWeights JSON under __FACTORY__ key
                        if (op.bulkWeights) {
                            try {
                                const bw = JSON.parse(op.bulkWeights);
                                if (bw.__FACTORY__?.factoryWt) {
                                    total += Number(bw.__FACTORY__.factoryWt);
                                }
                            } catch (e) { /* ignore malformed JSON */ }
                        }
                    });
                }));

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
                        permCasualOverKilosDay: 0 // Over kilos for PERM/CASUAL workers only
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
                            const cash = Number(a.cashKilos || 0);
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
                    // = (full athtama workers × wage) + (half athtama workers × wage/2) + (perm/casual over kilos × rate)
                    // Divided by total perm/casual weight (not factory weight)
                    const aththamaWage = Number(config.aththamaWage || 0);
                    const overKiloRate = Number(config.overKiloRate || 0);

                    const costDay =
                        (d.fullAththamaCount * aththamaWage) +
                        (d.halfAththamaCount * (aththamaWage / 2)) +
                        (d.permCasualOverKilosDay * overKiloRate);
                    const costDayPerKg = (!isFuture && d.permAndCasualWeightDay > 0) ? (costDay / d.permAndCasualWeightDay) : 0;

                    // Todate accumulators for cost
                    let fullAththamaTD = 0, halfAththamaTD = 0, permCasOverKgTD = 0;
                    for (let j = 1; j <= i; j++) {
                        const dj = dayMap.get(j);
                        const isFutureJ = (selY > currentY) ||
                            (selY === currentY && selM > currentM) ||
                            (selY === currentY && selM === currentM && j > currentD);
                        if (!isFutureJ) {
                            fullAththamaTD += dj.fullAththamaCount;
                            halfAththamaTD += dj.halfAththamaCount;
                            permCasOverKgTD += dj.permCasualOverKilosDay;
                        }
                    }
                    const costToDate =
                        (fullAththamaTD * aththamaWage) +
                        (halfAththamaTD * (aththamaWage / 2)) +
                        (permCasOverKgTD * overKiloRate);
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
                        pluckingCostPerKgDay: (!isFuture && costDayPerKg > 0) ? costDayPerKg.toFixed(2) : '',
                        pluckingCostPerKgTodate: (!isFuture && costToDatePerKg > 0) ? costToDatePerKg.toFixed(2) : ''
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

    // Calculate the expected progress proportionally
    const automatedBudgetToDate = (budgetMonthCalculated / totalDaysInMonth) * daysPassed;

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const prevMonthName = selMonth === 1 ? 'December' : monthNames[selMonth - 2];
    const currentMonthName = monthNames[selMonth - 1];

    // Total achieved to date = previous months + current month so far
    const totalAchievedToDate = achievedLastMonthAuto + facTodateMetric;

    // Data for the left sidebar KPI section based on the db config
    const kpiData = [
        { label: `Budgeted crop for the Year`, value: `${config.budgetYear || 0} Kg`, type: 'header', bgColor: '#e8f5e9' },
        { label: `Achieved Crop Up to ${prevMonthName}`, value: `${achievedLastMonthAuto} Kg`, type: 'achieved', bgColor: '#c8e6c9' },
        { label: `Achieved Crop - Todate (${currentMonthName})`, value: `${facTodateMetric.toFixed(1)} Kg`, type: 'achieved', bgColor: '#c8e6c9' },
        { label: `Total Achieved To Date`, value: `${totalAchievedToDate.toFixed(1)} Kg`, type: 'achieved', bgColor: '#a5d6a7' },
        { label: 'Achievement (vs Annual Budget)', value: config.budgetYear > 0 ? `${((totalAchievedToDate / Number(config.budgetYear || 0)) * 100).toFixed(2)} %` : '0 %', type: 'percentage', bgColor: '#66bb6a' },
        { label: `Budgeted crop up to ${prevMonthName}`, value: `${budgetLastMonthCalculated} Kg`, type: 'header', bgColor: '#c8e6c9' },
        { label: `Achievement up to ${prevMonthName}`, value: budgetLastMonthCalculated > 0 ? `${((achievedLastMonthAuto / budgetLastMonthCalculated) * 100).toFixed(2)} %` : '0 %', type: 'percentage', bgColor: '#81c784' },
        { label: `Budgeted crop for ${currentMonthName}`, value: `${budgetMonthCalculated} Kg`, type: 'header', bgColor: '#c8e6c9' },
        { label: 'Budgeted Crop for todate', value: `${automatedBudgetToDate.toFixed(1)} Kg`, type: 'achieved', bgColor: '#c8e6c9' },
        { label: `Achievement For ${currentMonthName}`, value: budgetMonthCalculated > 0 ? `${((facTodateMetric / budgetMonthCalculated) * 100).toFixed(2)} %` : '0 %', type: 'percentage', bgColor: '#a5d6a7' },
        { label: 'Achievement For To Date', value: automatedBudgetToDate > 0 ? `${((facTodateMetric / automatedBudgetToDate) * 100).toFixed(2)} %` : '0 %', type: 'percentage', bgColor: '#66bb6a' },
    ];

    const handleSaveConfig = async () => {
        try {
            await axios.post(`/api/crop-configs`, {
                tenantId: userSession.tenantId,
                cropType: activeCrop,
                ...config
            });
            setOpenConfig(false);
            setOpenWages(false);
            loadConfig(activeCrop);
        } catch (e) {
            console.error("Failed to save config", e);
        }
    };

    return (
        <Box sx={{ pb: 4, height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                {/* Title */}
                <Box sx={{ flex: '0 0 auto' }}>
                    <Typography variant="h4" fontWeight="bold" sx={{ color: '#1b5e20' }}>
                        Crop Book
                    </Typography>
                </Box>

                {/* Centre: Month picker + Live Clock in one themed card */}
                <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 2,
                    bgcolor: '#e8f5e9', border: '2px solid #a5d6a7',
                    borderRadius: 3, px: 3, py: 1,
                    boxShadow: '0 2px 8px rgba(46,125,50,0.12)'
                }}>
                    {/* Month Picker */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#2e7d32', whiteSpace: 'nowrap' }}>
                            📅 Month
                        </Typography>
                        <TextField
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            size="small"
                            sx={{
                                width: 160,
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    bgcolor: '#fff',
                                    '& fieldset': { borderColor: '#81c784' },
                                    '&:hover fieldset': { borderColor: '#2e7d32' },
                                    '&.Mui-focused fieldset': { borderColor: '#1b5e20' },
                                },
                                '& input': { color: '#1b5e20', fontWeight: 'bold' }
                            }}
                        />
                    </Box>

                    {/* Divider */}
                    <Box sx={{ width: '1px', height: 40, bgcolor: '#a5d6a7' }} />

                    {/* Live Clock */}
                    <Box sx={{ textAlign: 'center', lineHeight: 1.1 }}>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#388e3c' }}>
                            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </Typography>
                        <Typography sx={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1b5e20', fontVariantNumeric: 'tabular-nums', letterSpacing: 2, lineHeight: 1.2 }}>
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </Typography>
                    </Box>
                </Box>

                {/* Right spacer to keep centre card balanced */}
                <Box sx={{ flex: '0 0 auto', minWidth: 120 }} />
            </Box>
            <Paper elevation={3} sx={{ flex: 1, display: 'flex', flexDirection: isChiefClerk ? 'column' : 'row', overflow: 'hidden', border: '1px solid #e0e0e0', borderRadius: 2 }}>

                {/* Left Panel / Main Panel for Chief Clerk: Cost Analysis KPIs & Crop Tabs */}
                <Box sx={{ width: isChiefClerk ? '100%' : 320, flex: isChiefClerk ? 1 : '0 0 auto', borderRight: isChiefClerk ? 'none' : '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <Tabs
                        value={availableCrops.includes(activeCrop) ? activeCrop : (availableCrops[0] || 'Tea')}
                        onChange={(_, v) => setActiveCrop(v)}
                        sx={{
                            minHeight: 36,
                            borderBottom: '1px solid #000',
                            '& .MuiTab-root': { minHeight: 36, py: 0.5, px: 2, fontWeight: 'bold', textTransform: 'none', color: '#000', borderRight: '1px solid #000' }
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
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>

                            {/* LEFT: Budget KPI tiles */}
                            <Box sx={{
                                flex: '0 0 62%',
                                display: 'flex',
                                flexDirection: 'column',
                                bgcolor: '#f9fbe7',
                                overflow: 'hidden'
                            }}>
                                {/* Section Header */}
                                <Box sx={{ px: 2, py: 1, bgcolor: '#558b2f', display: 'flex', alignItems: 'center' }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#fff', letterSpacing: 1, textTransform: 'uppercase' }}>
                                        📊 Budget Targets
                                    </Typography>
                                </Box>
                                <Box sx={{
                                    flex: 1,
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    gap: 1.5,
                                    p: 2,
                                    alignContent: 'flex-start',
                                    overflowY: 'auto'
                                }}>
                                    {kpiData.map((kpi, idx) => (
                                        <Box key={idx} sx={{
                                            bgcolor: kpi.bgColor,
                                            borderRadius: 2,
                                            boxShadow: '0px 2px 4px rgba(0,0,0,0.08)',
                                            p: 1.5,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            minHeight: 72,
                                        }}>
                                            <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#444', lineHeight: 1.3, fontSize: '0.7rem' }}>
                                                {kpi.label}
                                            </Typography>
                                            <Typography variant="h6" sx={{ alignSelf: 'flex-end', fontWeight: 'bold', color: '#1b5e20', mt: 0.5, fontSize: '1rem' }}>
                                                {kpi.value}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                                {isManagerOrChief && (
                                    <Box sx={{ p: 1.5, borderTop: '2px solid #c5e1a5', display: 'flex', justifyContent: 'center', bgcolor: '#f1f8e9' }}>
                                        <Button variant="contained" color="primary" startIcon={<EditIcon />} onClick={() => setOpenConfig(true)} sx={{ minWidth: 200 }}>
                                            Edit Target Budgets
                                        </Button>
                                    </Box>
                                )}
                            </Box>

                            {/* DIVIDER */}
                            <Box sx={{ width: '6px', bgcolor: '#bdbdbd', flexShrink: 0 }} />

                            {/* RIGHT: Wage Rate tiles */}
                            <Box sx={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                bgcolor: '#fffde7',
                                overflow: 'hidden'
                            }}>
                                {/* Section Header */}
                                <Box sx={{ px: 2, py: 1, bgcolor: '#f57f17', display: 'flex', alignItems: 'center' }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#fff', letterSpacing: 1, textTransform: 'uppercase' }}>
                                        💰 Wage Rates
                                    </Typography>
                                </Box>
                                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, p: 2, overflowY: 'auto', justifyContent: 'flex-start' }}>
                                    <Box sx={{ bgcolor: '#fff9c4', borderRadius: 2, boxShadow: '0px 2px 6px rgba(0,0,0,0.1)', p: 2.5, border: '1px solid #f9a825' }}>
                                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#5d4037', letterSpacing: 0.5 }}>Aththama Daily Wage</Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#e65100', mt: 0.5, textAlign: 'right' }}>
                                            රු. {config.aththamaWage || 0}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ bgcolor: '#fff3e0', borderRadius: 2, boxShadow: '0px 2px 6px rgba(0,0,0,0.1)', p: 2.5, border: '1px solid #ffb300' }}>
                                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#5d4037', letterSpacing: 0.5 }}>Over Kilo Rate (per Kg)</Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#e65100', mt: 0.5, textAlign: 'right' }}>
                                            රු. {config.overKiloRate || 0}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ bgcolor: '#f1f8e9', borderRadius: 2, boxShadow: '0px 2px 6px rgba(0,0,0,0.1)', p: 2.5, border: '1px solid #aed581' }}>
                                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#33691e', letterSpacing: 0.5 }}>Cash Kilo Rate (per Kg)</Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#33691e', mt: 0.5, textAlign: 'right' }}>
                                            රු. {config.cashKiloRate || 0}
                                        </Typography>
                                    </Box>
                                </Box>
                                {isManagerOrChief && (
                                    <Box sx={{ p: 1.5, borderTop: '2px solid #ffe082', display: 'flex', justifyContent: 'center', bgcolor: '#fff8e1' }}>
                                        <Button variant="outlined" color="warning" startIcon={<EditIcon />} onClick={() => setOpenWages(true)} sx={{ minWidth: 200, color: '#e65100', borderColor: '#e65100' }}>
                                            Edit Plucking Wages
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    ) : (
                        /* Non-Chief Clerk: slim list that fills full height */
                        <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            {kpiData.map((kpi, idx) => (
                                <Box key={idx} sx={{
                                    flex: 1,
                                    bgcolor: kpi.bgColor,
                                    borderBottom: '1px solid rgba(0,0,0,0.06)',
                                    px: 2,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    minHeight: 0,
                                }}>
                                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#444', lineHeight: 1.3, flex: 1, pr: 1 }}>{kpi.label}</Typography>
                                    <Typography sx={{ fontSize: '0.88rem', fontWeight: 'bold', color: '#1b5e20', whiteSpace: 'nowrap' }}>{kpi.value}</Typography>
                                </Box>
                            ))}
                            {isManagerOrChief && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 1, borderTop: '1px solid #e0e0e0' }}>
                                    <Button size="small" variant="contained" color="primary" startIcon={<EditIcon />} onClick={() => setOpenConfig(true)} sx={{ fontSize: '0.7rem', py: 0.4 }}>Edit Budgets</Button>
                                    <Button size="small" variant="outlined" color="primary" startIcon={<EditIcon />} onClick={() => setOpenWages(true)} sx={{ fontSize: '0.7rem', py: 0.4 }}>Edit Wages</Button>
                                </Box>
                            )}
                        </Box>
                    )}
                </Box>

                {/* Right Panel: Data Grid - Hidden for Chief Clerk */}
                {
                    userRole !== 'CHIEF_CLERK' && (
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                                <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', padding: '4px 8px', whiteSpace: 'nowrap', textAlign: 'center' } }}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell colSpan={1} sx={{ bgcolor: '#fafafa', position: 'sticky', top: 0, zIndex: 3 }} />
                                            <TableCell colSpan={2} sx={{ bgcolor: '#fafafa', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 3 }}>Factory Weight</TableCell>
                                            <TableCell colSpan={2} sx={{ bgcolor: '#fafafa', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 3 }}>Field Weight</TableCell>
                                            <TableCell colSpan={2} sx={{ bgcolor: '#fafafa', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 3 }}>Checkroll Weight</TableCell>
                                            <TableCell colSpan={2} sx={{ bgcolor: '#fafafa', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 3 }}>Yield per Acre</TableCell>
                                            <TableCell colSpan={2} sx={{ bgcolor: '#fafafa', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 3 }}>No. Of Pluckers</TableCell>
                                            <TableCell colSpan={2} sx={{ bgcolor: '#fafafa', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 3 }}>Over kilos</TableCell>
                                            <TableCell colSpan={2} sx={{ bgcolor: '#fafafa', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 3 }}>Cash Kilos</TableCell>
                                            <TableCell colSpan={2} sx={{ bgcolor: '#fafafa', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 3 }}>Plucking Average</TableCell>
                                            <TableCell colSpan={2} sx={{ bgcolor: '#fafafa', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 3 }}>Plucking Cost per Kg</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell sx={{ bgcolor: '#fafafa', fontWeight: 'bold', position: 'sticky', left: 0, top: '29px', zIndex: 5, minWidth: 40, borderRight: '2px solid #000' }}>Day</TableCell>

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
                                                <TableCell sx={{ position: 'sticky', left: 0, bgcolor: '#fff', borderRight: '2px solid #ccc', fontWeight: 'bold' }}>
                                                    {row.day}
                                                </TableCell>

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
                    )
                }
            </Paper >

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
