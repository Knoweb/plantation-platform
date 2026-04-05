import { Box, Grid, Paper, Typography, Card, CardContent, Button, List, ListItem, ListItemText, Divider, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, FormControl, InputLabel, Chip, Autocomplete, Checkbox, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GroupIcon from '@mui/icons-material/Group';
import AddIcon from '@mui/icons-material/Add';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import PaidIcon from '@mui/icons-material/Paid';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Muster {
    id: number;
    date: string;
    fieldName: string;
    taskType: string;
    workerCount: number;
    workerIds: string[]; // Added workerIds
    status: string;
}

interface HarvestLog {
    id: number;
    date: string;
    fieldName: string;
    workerName: string;
    quantityKg: number;
    cropType: string;
}

interface Field {
    fieldId: string;
    id?: string;
    name: string;
    divisionId: string;
    acreage?: number;
    cropType?: string;
}

interface Worker {
    id: string;
    name: string;
    name: string;
}

export default function FieldOfficerDashboard() {
    const navigate = useNavigate();
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;

    const [loading, setLoading] = useState(true);
    const [musters, setMusters] = useState<Muster[]>([]);
    const [harvestLogs, setHarvestLogs] = useState<HarvestLog[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [fields, setFields] = useState<Field[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]); // Added workers state

    // KPIs
    const [dailyYield, setDailyYield] = useState(0);
    const [workerTurnout, setWorkerTurnout] = useState(0);
    const [fertilizerStock, setFertilizerStock] = useState('Checking...');
    const [landProductivity, setLandProductivity] = useState(0);
    const [laborEfficiency, setLaborEfficiency] = useState(0);
    const [costPerKg, setCostPerKg] = useState(0);

    const [weeklyYieldData, setWeeklyYieldData] = useState<any[]>([]);
    const [factoryWeightView, setFactoryWeightView] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
    const [groupedMuster, setGroupedMuster] = useState<any[]>([]);

    // Forms
    const [openMuster, setOpenMuster] = useState(false);
    const [openHarvest, setOpenHarvest] = useState(false);

    // New Muster State
    const [newMuster, setNewMuster] = useState<{ fieldName: string, taskType: string, workerIds: string[] }>({
        fieldName: '',
        taskType: 'Plucking',
        workerIds: []
    });
    // New Harvest State
    const [newHarvest, setNewHarvest] = useState({ fieldName: '', workerName: '', quantityKg: 0, cropType: 'Tea' });
    const [weather, setWeather] = useState<{ 
        temp: number, 
        humidity: number, 
        condition: string, 
        icon: string, 
        currentLoc: string, 
        advisory: string, 
        advisoryColor: string, 
        rainMorningChance: number, 
        rainEveningChance: number 
    } | null>(null);

    useEffect(() => {
        fetchData();
        fetchWorkers(); // Fetch workers on mount
        fetchWeather();
    }, []);


    const fetchWeather = () => {
        const weatherCodes: Record<number, {cond: string, icon: string}> = {
            0: { cond: 'Clear Sky', icon: 'U+2600' }, 1: { cond: 'Mainly Clear', icon: 'U+1F324' },
            2: { cond: 'Partly Cloudy', icon: 'U+26C5' }, 3: { cond: 'Overcast', icon: 'U+2601' },
            45: { cond: 'Fog', icon: 'U+1F32B' }, 48: { cond: 'Fog', icon: 'U+1F32B' },
            51: { cond: 'Light Drizzle', icon: 'U+1F326' }, 53: { cond: 'Drizzle', icon: 'U+1F326' }, 55: { cond: 'Dense Drizzle', icon: 'U+1F327' },
            61: { cond: 'Slight Rain', icon: 'U+1F327' }, 63: { cond: 'Moderate Rain', icon: 'U+1F327' }, 65: { cond: 'Heavy Rain', icon: 'U+1F327' },
            80: { cond: 'Rain Showers', icon: 'U+1F326' }, 81: { cond: 'Moderate Showers', icon: 'U+1F327' }, 82: { cond: 'Violent Showers', icon: 'U+26C8' },
            95: { cond: 'Thunderstorm', icon: 'U+26C8' }, 96: { cond: 'Thunderstorm & Hail', icon: 'U+26C8' }, 99: { cond: 'Heavy Thunderstorm', icon: 'U+26C8' }
        };

        const buildAdvisory = (hourlyTimes: string[], hourlyPrecip: number[]) => {
            // User definition: Morning (8-12) and Evening (12-4:30)
            const morning = hourlyPrecip.slice(8, 12);
            const evening = hourlyPrecip.slice(12, 17);
            const maxMorning = Math.max(...morning);
            const maxEvening = Math.max(...evening);
            
            let advisory = '';
            let color = 'success.main';

            if (maxEvening >= 70) {
                advisory = "Heavy rain expected this afternoon/evening. Complete plucking early and avoid field chemicals.";
                color = 'error.main';
            } else if (maxEvening >= 40) {
                advisory = "Moderate rain likely after noon. Safe for morning tasks but prepare for afternoon halt.";
                color = 'warning.main';
            } else if (maxMorning >= 60) {
                advisory = "Rain showers likely this morning. Productivity may be reduced during the first shift.";
                color = 'warning.main';
            } else if (maxMorning >= 30) {
                advisory = "Slight chance of scattered morning showers. Overall good for outdoor work.";
                color = 'info.main';
            } else {
                advisory = "Strong conditions: Clear weather expected during both morning and afternoon work shifts.";
                color = 'success.main';
            }
            return { advisory, color, rainEveningChance: maxEvening, rainMorningChance: maxMorning };
        };

        const getWeatherData = async (lat: number, lon: number, locName: string) => {
            try {
                const [weatherRes, geoRes] = await Promise.all([
                    axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&hourly=precipitation_probability,weather_code&timezone=auto&forecast_days=1`),
                    locName === 'Local' 
                        ? axios.get(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`).catch(() => null)
                        : Promise.resolve(null)
                ]);

                const current = weatherRes.data.current;
                const hourlyTimes = weatherRes.data.hourly.time as string[];
                const hourlyPrecip = weatherRes.data.hourly.precipitation_probability as number[];
                const hourlyCode = weatherRes.data.hourly.weather_code as number[];
                const currentHour = new Date().getHours();

                // Extract extremely precise name from reverse geo if available
                let finalLoc = locName;
                if (geoRes?.data?.address) {
                    const addr = geoRes.data.address;
                    // Order of granularity: most local to least local
                    finalLoc = addr.neighbourhood || addr.hamlet || addr.village || addr.suburb || addr.town || addr.city || locName;
                }

            const w = weatherCodes[current.weather_code] || { cond: 'Cloudy', icon: 'U+2601' };
            const icon = String.fromCodePoint(parseInt(w.icon.replace('U+', ''), 16));
            const hum = current.relative_humidity_2m;
            const { advisory, color, rainEveningChance, rainMorningChance } = buildAdvisory(hourlyTimes, hourlyPrecip);

            const statusAdvisory = hum > 85 && rainMorningChance < 30
                ? `High humidity (${hum}%) detected. Ideal plucking window but monitor afternoon sky. ${advisory}`
                : advisory;

            setWeather({
                temp: Math.round(current.temperature_2m),
                humidity: hum,
                condition: w.cond,
                icon,
                currentLoc: finalLoc,
                advisory: statusAdvisory,
                advisoryColor: color,
                rainMorningChance,
                rainEveningChance
            });
            } catch (err) {
                console.error("Failed to fetch weather", err);
            }
        };

        const fetchByIp = async () => {
            try {
                // Check cache first
                const cachedLat = sessionStorage.getItem('user_lat');
                const cachedLon = sessionStorage.getItem('user_lon');
                const cachedLoc = sessionStorage.getItem('user_loc_name');
                
                if (cachedLat && cachedLon) {
                    await getWeatherData(parseFloat(cachedLat), parseFloat(cachedLon), cachedLoc || 'Local');
                    return;
                }

                const geoRes = await axios.get('https://ipapi.co/json/');
                const { latitude, longitude, city } = geoRes.data;
                
                // Cache for next time
                sessionStorage.setItem('user_lat', latitude.toString());
                sessionStorage.setItem('user_lon', longitude.toString());
                sessionStorage.setItem('user_loc_name', city || 'Local');

                await getWeatherData(latitude, longitude, city || 'Local');
            } catch (err: any) {
                if (err.response?.status === 429) {
                    console.warn("Geolocation API rate limited. Using default/cached location.");
                } else {
                    console.error("Geolocation failed after all attempts", err);
                }
            }
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    sessionStorage.setItem('user_lat', latitude.toString());
                    sessionStorage.setItem('user_lon', longitude.toString());
                    await getWeatherData(latitude, longitude, 'Local');
                },
                async () => {
                    await fetchByIp();
                },
                { timeout: 8000, enableHighAccuracy: true }
            );
        } else {
            fetchByIp();
        }
    };
    const fetchWorkers = async () => {
        try {
            // For now, let's just get all workers for the tenant to populate the dropdown.
            const res = await axios.get(`/api/workers?tenantId=${tenantId}`);
            setWorkers(res.data);
        } catch (err) {
            console.error("Failed to fetch workers", err);
        }
    }

    const fetchData = async () => {
        try {
            // Filter data based on User's Assigned Divisions
            const now = new Date();
            // Use local date (not UTC) to prevent off-by-one errors in IST (+05:30)
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

            const chartStartDate = `${now.getFullYear() - 3}-01-01`;

            const [musterRes, harvestRes, invRes, fieldRes, allFieldsRes, workRes, chartWorkRes, attRes, workersRes] = await Promise.all([
                axios.get(`/api/operations/muster?tenantId=${tenantId}`),
                axios.get(`/api/operations/harvest?tenantId=${tenantId}`),
                axios.get(`/api/inventory?tenantId=${tenantId}`),
                axios.get(`/api/fields?tenantId=${tenantId}`),
                axios.get(`/api/fields?tenantId=${tenantId}`),
                axios.get(`/api/operations/daily-work?tenantId=${tenantId}&startDate=${monthStart}&endDate=${today}`),
                axios.get(`/api/operations/daily-work?tenantId=${tenantId}&startDate=${chartStartDate}&endDate=${today}`),
                axios.get(`/api/operations/attendance?tenantId=${tenantId}&startDate=${monthStart}&endDate=${today}`),
                axios.get(`/api/workers?tenantId=${tenantId}`),
            ]);

            setMusters(musterRes.data);
            setHarvestLogs(harvestRes.data);
            setInventory(invRes.data);
            setFields(fieldRes.data);

            // Calculate KPIs
            const todayHarvest = harvestRes.data
                .filter((h: HarvestLog) => h.date === today)
                .reduce((sum: number, h: HarvestLog) => sum + h.quantityKg, 0);
            setDailyYield(todayHarvest);

            const todayMuster = musterRes.data
                .filter((m: Muster) => m.date === today)
                .reduce((sum: number, m: Muster) => sum + m.workerCount, 0);
            setWorkerTurnout(todayMuster);

            const fertStock = invRes.data
                .filter((i: any) => i.category === 'Fertilizer')
                .reduce((sum: number, i: any) => sum + i.currentQuantity, 0);
            setFertilizerStock(fertStock > 0 ? `${fertStock} kg` : 'Low Stock');

            // Use tenant-wide field list for KPI math to match CropBook calculations.
            const accessibleFields: Field[] = allFieldsRes.data || [];
            const fieldById = new Map<string, any>();
            const availableCrops = new Set<string>();
            accessibleFields.forEach((field: any) => {
                const fieldKey = String(field.id || field.fieldId || '');
                if (fieldKey) fieldById.set(fieldKey, field);
                const crop = String(field.cropType || '').trim();
                if (crop) availableCrops.add(crop);
            });

            // Match CropBook behavior: prefer Tea when it exists, otherwise use the first available crop.
            const primaryCrop =
                Array.from(availableCrops).find((crop) => crop.toLowerCase() === 'tea') ||
                Array.from(availableCrops)[0] ||
                'Tea';

            let cropConfig: any = {};
            try {
                const cfgRes = await axios.get(`/api/crop-configs?tenantId=${tenantId}&cropType=${primaryCrop}`);
                cropConfig = cfgRes.data || {};
            } catch {
                cropConfig = {};
            }

            const fieldByName = new Map<string, any>();
            accessibleFields.forEach((field: any) => {
                const nameKey = String(field.name || '').trim().toLowerCase();
                if (nameKey) fieldByName.set(nameKey, field);
            });

            const workBelongsToCrop = (work: any) => {
                const directField = fieldById.get(String(work.fieldId || ''));
                if (directField) {
                    return String(directField.cropType || '').toLowerCase() === primaryCrop.toLowerCase();
                }

                const fieldNames = new Set<string>();

                if (work.bulkWeights) {
                    try {
                        const bulkWeights = JSON.parse(work.bulkWeights);
                        Object.keys(bulkWeights || {}).forEach((key) => {
                            if (key !== '__FACTORY__') fieldNames.add(String(key).trim().toLowerCase());
                        });
                    } catch {
                        // Ignore malformed bulk weights.
                    }
                }

                if (work.details) {
                    try {
                        const details = JSON.parse(work.details);
                        (Array.isArray(details) ? details : []).forEach((item: any) => {
                            const fieldName = String(item?.field || '').trim().toLowerCase();
                            if (fieldName) fieldNames.add(fieldName);
                        });
                    } catch {
                        // Ignore malformed work details.
                    }
                }

                for (const fieldName of fieldNames) {
                    const field = fieldByName.get(fieldName);
                    if (field && String(field.cropType || '').toLowerCase() === primaryCrop.toLowerCase()) {
                        return true;
                    }
                }

                return false;
            };

            const buildCropBookFactoryDays = (works: any[], year: number, month: number) => {
                const monthKey = `${year}-${String(month).padStart(2, '0')}`;
                const daysInMonth = new Date(year, month, 0).getDate();
                const factoryDayMap = new Map<number, number>();

                for (let i = 1; i <= daysInMonth; i++) {
                    factoryDayMap.set(i, 0);
                }

                works.forEach((work: any) => {
                    if (!workBelongsToCrop(work)) return;
                    if (!work.workDate || !String(work.workDate).startsWith(monthKey)) return;

                    const day = parseInt(String(work.workDate).split('-')[2], 10);
                    if (!factoryDayMap.has(day) || !work.bulkWeights) return;

                    try {
                        const bulkWeights = JSON.parse(work.bulkWeights);
                        const factoryWeight = Number(bulkWeights.__FACTORY__?.factoryWt || 0);
                        factoryDayMap.set(day, (factoryDayMap.get(day) || 0) + factoryWeight);
                    } catch {
                        // Ignore malformed bulk weights.
                    }
                });

                return factoryDayMap;
            };

            const workList = (workRes.data || []).filter((work: any) => workBelongsToCrop(work));
            const chartWorkList = (chartWorkRes.data || []).filter((work: any) => workBelongsToCrop(work));
            const workMap = new Map<string, any>();
            workList.forEach((work: any) => {
                workMap.set(String(work.workId || work.id || ''), work);
            });

            const workerTypeMap = new Map<string, string>();
            (workersRes.data || []).forEach((worker: any) => {
                workerTypeMap.set(String(worker.id), String(worker.employmentType || ''));
            });

            const relevantTask =
                primaryCrop.toLowerCase() === 'tea' ? 'plucking' :
                primaryCrop.toLowerCase() === 'rubber' ? 'tapping' :
                '';

            const fieldsList = accessibleFields;
            const totalAcreage = fieldsList
                .filter((field: any) => String(field.cropType || '').toLowerCase() === primaryCrop.toLowerCase())
                .reduce((sum: number, field: any) => sum + Number(field.acreage || 0), 0);
            const acreageDivisor = totalAcreage > 0 ? totalAcreage : 1;
            const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

            const dayMap = new Map<number, any>();
            for (let i = 1; i <= lastDayOfMonth; i++) {
                dayMap.set(i, {
                    day: i,
                    factoryWeightDay: 0,
                    noOfPluckersDay: 0,
                    permAndCasualPluckersDay: 0,
                    permAndCasualWeightDay: 0,
                    overKilosDay: 0,
                    cashKilosDay: 0,
                    fullAththamaCount: 0,
                    halfAththamaCount: 0,
                    permCasualOverKilosDay: 0,
                });
            }

            workList.forEach((work: any) => {
                if (!work.workDate || !String(work.workDate).startsWith(monthStart.slice(0, 7))) return;
                if (!workBelongsToCrop(work)) return;

                const day = parseInt(String(work.workDate).split('-')[2], 10);
                if (!dayMap.has(day)) return;

                workMap.set(String(work.workId || work.id || ''), work);
                if (!work.bulkWeights) return;

                try {
                    const bulkWeights = JSON.parse(work.bulkWeights);
                    dayMap.get(day).factoryWeightDay += Number(bulkWeights.__FACTORY__?.factoryWt || 0);
                } catch {
                    // Ignore malformed bulk weights.
                }
            });

            (attRes.data || []).forEach((attendance: any) => {
                const work = workMap.get(String(attendance.dailyWorkId || ''));
                if (!work || !work.bulkWeights) return;
                if (relevantTask && String(attendance.workType || '').toLowerCase() !== relevantTask) return;
                if (!attendance.workDate || !String(attendance.workDate).startsWith(monthStart.slice(0, 7))) return;

                const day = parseInt(String(attendance.workDate).split('-')[2], 10);
                if (!dayMap.has(day)) return;

                const dayData = dayMap.get(day);
                const status = String(attendance.status || '').toUpperCase();
                const employmentType = String(workerTypeMap.get(String(attendance.workerId)) || '').toUpperCase();
                const isPermOrCasual = employmentType === 'PERMANENT' || employmentType === 'CASUAL';
                const am = Number(attendance.amWeight || attendance.am || 0);
                const pm = Number(attendance.pmWeight || attendance.pm || 0);
                const over = Number(attendance.overKilos || 0);
                const cash = Number(attendance.cashKilos || 0);

                if (status === 'PRESENT' || status === 'HALF_DAY') {
                    dayData.noOfPluckersDay += 1;
                    if (isPermOrCasual) {
                        dayData.permAndCasualPluckersDay += 1;
                        dayData.permAndCasualWeightDay += (am + pm);
                        dayData.permCasualOverKilosDay += over;
                        if (status === 'PRESENT') dayData.fullAththamaCount += 1;
                        if (status === 'HALF_DAY') dayData.halfAththamaCount += 1;
                    }
                }

                dayData.overKilosDay += over;
                dayData.cashKilosDay += cash;
            });

            let factoryWeightMtd = 0;
            let cashKilosMtd = 0;
            let permAndCasualPluckersMtd = 0;
            let permAndCasualWeightMtd = 0;
            let fullAththamaCountMtd = 0;
            let halfAththamaCountMtd = 0;
            let permCasualOverKilosMtd = 0;

            for (let i = 1; i <= now.getDate(); i++) {
                const dayData = dayMap.get(i);
                if (!dayData) continue;

                factoryWeightMtd += dayData.factoryWeightDay;
                cashKilosMtd += dayData.cashKilosDay;
                permAndCasualPluckersMtd += dayData.permAndCasualPluckersDay;
                permAndCasualWeightMtd += dayData.permAndCasualWeightDay;
                fullAththamaCountMtd += dayData.fullAththamaCount;
                halfAththamaCountMtd += dayData.halfAththamaCount;
                permCasualOverKilosMtd += dayData.permCasualOverKilosDay;
            }

            const computedLandProductivity =
                totalAcreage > 0 ? (permAndCasualWeightMtd / acreageDivisor) : 0;
            const computedLaborEfficiency =
                permAndCasualPluckersMtd > 0 ? (factoryWeightMtd - cashKilosMtd) / permAndCasualPluckersMtd : 0;

            const aththamaWage = Number(cropConfig.aththamaWage || 0);
            const overKiloRate = Number(cropConfig.overKiloRate || 0);
            const computedCostPerKg =
                permAndCasualWeightMtd > 0
                    ? (
                        (fullAththamaCountMtd * aththamaWage) +
                        (halfAththamaCountMtd * (aththamaWage / 2)) +
                        (permCasualOverKilosMtd * overKiloRate)
                    ) / permAndCasualWeightMtd
                    : 0;

            setLandProductivity(Number.isFinite(computedLandProductivity) ? computedLandProductivity : 0);
            setLaborEfficiency(Number.isFinite(computedLaborEfficiency) ? computedLaborEfficiency : 0);
            setCostPerKg(Number.isFinite(computedCostPerKg) ? computedCostPerKg : 0);

            const currentMonthFactoryDays = buildCropBookFactoryDays(chartWorkList, now.getFullYear(), now.getMonth() + 1);

            const dailyData = Array.from({ length: now.getDate() }, (_, index) => {
                return {
                    label: String(index + 1).padStart(2, '0'),
                    value: currentMonthFactoryDays.get(index + 1) || 0,
                };
            });

            const weeklyData = [
                {
                    label: 'Week 1',
                    value: Array.from({ length: Math.min(7, now.getDate()) }, (_, index) => currentMonthFactoryDays.get(index + 1) || 0)
                        .reduce((sum, value) => sum + value, 0),
                },
                {
                    label: 'Week 2',
                    value: Array.from({ length: Math.max(0, Math.min(14, now.getDate()) - 7) }, (_, index) => currentMonthFactoryDays.get(index + 8) || 0)
                        .reduce((sum, value) => sum + value, 0),
                },
                {
                    label: 'Week 3',
                    value: Array.from({ length: Math.max(0, Math.min(21, now.getDate()) - 14) }, (_, index) => currentMonthFactoryDays.get(index + 15) || 0)
                        .reduce((sum, value) => sum + value, 0),
                },
                {
                    label: 'Week 4',
                    value: Array.from({ length: Math.max(0, now.getDate() - 21) }, (_, index) => currentMonthFactoryDays.get(index + 22) || 0)
                        .reduce((sum, value) => sum + value, 0),
                },
            ];

            const monthlyMap = new Map<string, number>();
            for (let month = 1; month <= now.getMonth() + 1; month++) {
                const monthKey = String(month).padStart(2, '0');
                const monthFactoryDays = buildCropBookFactoryDays(chartWorkList, now.getFullYear(), month);
                const monthTotal = Array.from(monthFactoryDays.values()).reduce((sum, value) => sum + value, 0);
                monthlyMap.set(monthKey, monthTotal);
            }

            const monthlyData = Array.from({ length: now.getMonth() + 1 }, (_, index) => {
                const monthDate = new Date(now.getFullYear(), index, 1);
                const monthKey = String(index + 1).padStart(2, '0');
                return {
                    label: monthDate.toLocaleDateString('en-US', { month: 'short' }),
                    value: monthlyMap.get(monthKey) || 0,
                };
            });

            const yearlyMap = new Map<number, number>();
            const chartYears = Array.from(
                new Set(
                    chartWorkList
                        .map((work: any) => {
                            const dateStr = String(work.workDate || '');
                            return dateStr ? Number(dateStr.slice(0, 4)) : 0;
                        })
                        .filter((year: number) => year > 0 && Number.isFinite(year))
                )
            ).sort((a, b) => a - b);

            chartYears.forEach((year) => {
                let yearTotal = 0;
                for (let month = 1; month <= 12; month++) {
                    const monthFactoryDays = buildCropBookFactoryDays(chartWorkList, year, month);
                    yearTotal += Array.from(monthFactoryDays.values()).reduce((sum, value) => sum + value, 0);
                }
                yearlyMap.set(year, yearTotal);
            });

            const yearlyData = Array.from(yearlyMap.entries())
                .sort((a, b) => a[0] - b[0])
                .map(([year, value]) => ({ label: String(year), value }));

            const chartDataByView = {
                daily: dailyData,
                weekly: weeklyData,
                monthly: monthlyData,
                yearly: yearlyData,
            };

            setWeeklyYieldData(chartDataByView[factoryWeightView]);

            // Group Muster by Division, Field & Task
            const grouped = musterRes.data
                .filter((m: Muster) => m.date === today)
                .reduce((acc: any, m: Muster) => {
                    const key = `${m.divisionId || m.divisionName || 'All'}-${m.fieldName}-${m.taskType}`;
                    if (!acc[key]) acc[key] = { ...m, workerCount: 0 };
                    acc[key].workerCount += m.workerCount;
                    return acc;
                }, {});
            setGroupedMuster(Object.values(grouped));

            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [factoryWeightView]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            fetchData();
        }, 30000);

        const handleWindowFocus = () => {
            fetchData();
        };

        window.addEventListener('focus', handleWindowFocus);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleWindowFocus);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [factoryWeightView]);

    const handleCreateMuster = async () => {
        try {
            const divisionId = (userSession.divisionAccess && userSession.divisionAccess.length > 0) ? userSession.divisionAccess[0] : null;
            const now = new Date();
            const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            await axios.post('/api/operations/muster', {
                ...newMuster,
                tenantId,
                divisionId,
                date: localDate,
                workerCount: newMuster.workerIds.length // Optimistically send count, backend recalculates anyway
            });
            setOpenMuster(false);
            setNewMuster({ fieldName: '', taskType: 'Plucking', workerIds: [] }); // Reset form
            fetchData();
        } catch (e) {
            alert("Failed to create Muster");
        }
    };

    const handleLogHarvest = async () => {
        try {
            const divisionId = (userSession.divisionAccess && userSession.divisionAccess.length > 0) ? userSession.divisionAccess[0] : null;
            const now = new Date();
            const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            await axios.post('/api/operations/harvest', { ...newHarvest, tenantId, divisionId, date: localDate });
            setOpenHarvest(false);
            fetchData();
        } catch (e) {
            alert("Failed to log Harvest");
        }
    };

    // handleApproveMuster removed as per request (Manager Only)

    const chartDescriptionByView = {
        daily: 'Daily factory output for the current month.',
        weekly: 'Week-by-week factory output across the current month.',
        monthly: 'Monthly trend for the current year.',
        yearly: 'Year-over-year factory weight performance.',
    } as const;

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight="bold" color="primary">
                    Field Operation Center
                </Typography>
            </Box>

            {/* KPI Section with Weather and Primary Metrics */}
            <Grid container spacing={2.5} mb={4} alignItems="stretch">
                {/* Weather Advisory Card - Enhanced Exact Location & Details */}
                {weather && (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                height: '100%',
                                borderRadius: 3,
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                border: '1px solid #e0ebf5',
                                boxShadow: '0 8px 22px rgba(15, 23, 42, 0.07)',
                                transition: 'all 0.3s ease',
                                '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 12px 28px rgba(15, 23, 42, 0.12)' }
                            }}
                        >
                            <Box sx={{
                                background: 'linear-gradient(160deg, #1e3c72 0%, #2a5298 100%)',
                                color: 'white',
                                px: 2,
                                py: 1.5,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <Box display="flex" alignItems="center" gap={1.5}>
                                    <Typography sx={{ fontSize: '2rem' }}>{weather.icon}</Typography>
                                    <Box>
                                        <Typography variant="h5" fontWeight="900" sx={{ lineHeight: 1 }}>{weather.temp}&deg;C</Typography>
                                        <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 700, fontSize: '0.7rem', display: 'block', mt: 0.3 }}>
                                            {weather.currentLoc.toUpperCase()}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                    <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.6rem', display: 'block' }}>HUMIDITY</Typography>
                                    <Typography variant="body2" fontWeight="bold">{weather.humidity || 0}%</Typography>
                                </Box>
                            </Box>
                            <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', bgcolor: 'white' }}>
                                <Box>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Typography variant="caption" fontWeight="800" sx={{ color: '#1e3c72', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>AI Field Insight</Typography>
                                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: weather.rainEveningChance >= 60 ? '#ef5350' : weather.rainAfternoonChance >= 40 ? '#ff9800' : '#4caf50', animation: 'pulse 2s infinite' }} />
                                        </Box>
                                    </Box>
                                    <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.5, fontSize: '0.8rem', fontWeight: 500 }}>
                                        {weather.advisory}
                                    </Typography>
                                </Box>
                                <Box display="flex" gap={1} mt={1.5}>
                                    <Box sx={{ bgcolor: 'rgba(30,60,114,0.06)', borderRadius: 1.5, px: 1, py: 0.5, flex: 1, textAlign: 'center' }}>
                                        <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.secondary', display: 'block', fontWeight: 800 }}>MORNING</Typography>
                                        <Typography variant="caption" fontWeight="900" sx={{ fontSize: '0.8rem', color: '#1e3c72' }}>{weather.rainMorningChance}% Rain</Typography>
                                    </Box>
                                    <Box sx={{ bgcolor: weather.rainEveningChance >= 70 ? 'rgba(239,83,80,0.08)' : 'rgba(30,60,114,0.06)', borderRadius: 1.5, px: 1, py: 0.5, flex: 1, textAlign: 'center' }}>
                                        <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.secondary', display: 'block', fontWeight: 800 }}>EVENING</Typography>
                                        <Typography variant="caption" fontWeight="900" sx={{ fontSize: '0.8rem', color: weather.rainEveningChance >= 70 ? '#ef5350' : '#1e3c72' }}>{weather.rainEveningChance}% Rain</Typography>
                                    </Box>
                                </Box>
                            </Box>
                        </Paper>
                    </Grid>
                )}

                {[
                    {
                        title: 'Yield per Acre',
                        value: landProductivity > 0 ? landProductivity.toFixed(2) : '0.00',
                        unit: 'kg / Acre',
                        note: 'Crop Book MTD',
                        noteColor: 'success.main',
                        accent: '#43a047',
                        softBg: 'linear-gradient(135deg, #f4fff5 0%, #ffffff 100%)',
                        iconBg: 'rgba(67, 160, 71, 0.12)',
                        icon: <TrendingUpIcon sx={{ color: '#2e7d32', fontSize: 28 }} />,
                    },
                    {
                        title: 'Plucking Average',
                        value: laborEfficiency > 0 ? laborEfficiency.toFixed(2) : '0.00',
                        unit: 'kg / Worker',
                        note: 'Month to Date',
                        noteColor: 'success.main',
                        accent: '#1e88e5',
                        softBg: 'linear-gradient(135deg, #f3faff 0%, #ffffff 100%)',
                        iconBg: 'rgba(30, 136, 229, 0.12)',
                        icon: <GroupIcon sx={{ color: '#1565c0', fontSize: 28 }} />,
                    },
                    {
                        title: 'Cost per Kg',
                        value: `Rs. ${costPerKg > 0 ? costPerKg.toFixed(2) : '0.00'}`,
                        unit: 'Production Cost',
                        note: 'Month to Date',
                        noteColor: 'text.secondary',
                        accent: '#fb8c00',
                        softBg: 'linear-gradient(135deg, #fff8ef 0%, #ffffff 100%)',
                        iconBg: 'rgba(251, 140, 0, 0.14)',
                        icon: <PaidIcon sx={{ color: '#ef6c00', fontSize: 28 }} />,
                    },
                ].map((card) => (
                    <Grid key={card.title} size={{ xs: 12, sm: 6, md: 3 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 1.75,
                                height: '100%',
                                borderRadius: 2.5,
                                border: `1px solid ${card.accent}22`,
                                borderTop: `4px solid ${card.accent}`,
                                background: card.softBg,
                                boxShadow: '0 8px 22px rgba(15, 23, 42, 0.07)',
                                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 12px 26px rgba(15, 23, 42, 0.1)',
                                },
                            }}
                        >
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.25}>
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: 0.2, fontWeight: 700 }}>
                                        {card.title}
                                    </Typography>
                                    <Typography sx={{ mt: 0.75, color: '#16324f', lineHeight: 1, fontSize: '1.8rem', fontWeight: 800 }}>
                                        {card.value}
                                    </Typography>
                                </Box>
                                <Box
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: card.iconBg,
                                        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.5)',
                                    }}
                                >
                                    {card.icon}
                                </Box>
                            </Box>
                            <Typography sx={{ color: '#4f6b87', fontWeight: 500, fontSize: '0.75rem' }}>
                                {card.unit}
                            </Typography>
                            <Chip
                                label={card.note}
                                size="small"
                                sx={{
                                    mt: 1.25,
                                    fontWeight: 700,
                                    height: 22,
                                    '& .MuiChip-label': {
                                        px: 1,
                                        fontSize: '0.68rem',
                                    },
                                    color: card.noteColor,
                                    bgcolor: 'rgba(255,255,255,0.72)',
                                    border: '1px solid rgba(15,23,42,0.06)',
                                }}
                            />
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            <Grid container spacing={3}>
                {/* Chart Section */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 2, sm: 3 },
                            height: { xs: 'auto', md: 400 },
                            borderRadius: 3,
                            border: '1px solid rgba(46,125,50,0.14)',
                            background: 'linear-gradient(180deg, #ffffff 0%, #f8fcf8 100%)',
                            boxShadow: '0 14px 32px rgba(15, 23, 42, 0.08)',
                            mb: { xs: 2, md: 0 }
                        }}
                    >
                        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={2} gap={2}>
                            <Box>
                                <Typography variant="h6" color="primary" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' }, fontWeight: 700 }}>Factory Weight Performance</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                    {chartDescriptionByView[factoryWeightView]}
                                </Typography>
                            </Box>
                            <ToggleButtonGroup
                                size="small"
                                exclusive
                                value={factoryWeightView}
                                onChange={(_, value) => {
                                    if (value) setFactoryWeightView(value);
                                }}
                                sx={{
                                    alignSelf: { xs: 'stretch', sm: 'auto' },
                                    '& .MuiToggleButton-root': {
                                        flex: { xs: 1, sm: 'none' },
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        px: 1.5,
                                        borderColor: 'rgba(46,125,50,0.14)',
                                        color: '#55708b',
                                        fontSize: '0.75rem'
                                    },
                                    '& .MuiToggleButton-root.Mui-selected': {
                                        color: '#1b5e20',
                                        bgcolor: 'rgba(46,125,50,0.08)',
                                    },
                                    '& .MuiToggleButton-root.Mui-selected:hover': {
                                        bgcolor: 'rgba(46,125,50,0.12)',
                                    },
                                }}
                            >
                                <ToggleButton value="daily">Daily</ToggleButton>
                                <ToggleButton value="weekly">Weekly</ToggleButton>
                                <ToggleButton value="monthly">Monthly</ToggleButton>
                                <ToggleButton value="yearly">Yearly</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>
                        <Box sx={{ width: '100%', height: { xs: 260, sm: 300, md: 320 } }}>
                            <ResponsiveContainer width="100%" height="100%">
                                {factoryWeightView === 'monthly' ? (
                                    <AreaChart data={weeklyYieldData} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="factoryWeightFill" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2e7d32" stopOpacity={0.38} />
                                                <stop offset="95%" stopColor="#2e7d32" stopOpacity={0.02} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="4 4" stroke="rgba(27,94,32,0.12)" vertical={false} />
                                        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#5d7388', fontSize: 10 }} minTickGap={15} />
                                        <YAxis tickLine={false} axisLine={false} tick={{ fill: '#5d7388', fontSize: 12 }} />
                                        <RechartsTooltip
                                            contentStyle={{
                                                borderRadius: 12,
                                                border: '1px solid rgba(46,125,50,0.14)',
                                                boxShadow: '0 18px 34px rgba(15, 23, 42, 0.12)',
                                            }}
                                            formatter={(value: number) => [`${Number(value).toFixed(1)} Kg`, 'Factory Weight']}
                                            labelFormatter={(label) => `Monthly: ${label}`}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#2e7d32"
                                            strokeWidth={3}
                                            fill="url(#factoryWeightFill)"
                                            dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
                                            activeDot={{ r: 6 }}
                                            name="Factory Weight (Kg)"
                                        />
                                    </AreaChart>
                                ) : factoryWeightView === 'yearly' ? (
                                    <LineChart data={weeklyYieldData} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="4 4" stroke="rgba(27,94,32,0.12)" vertical={false} />
                                        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#5d7388', fontSize: 10 }} minTickGap={15} />
                                        <YAxis tickLine={false} axisLine={false} tick={{ fill: '#5d7388', fontSize: 12 }} />
                                        <RechartsTooltip
                                            contentStyle={{
                                                borderRadius: 12,
                                                border: '1px solid rgba(46,125,50,0.14)',
                                                boxShadow: '0 18px 34px rgba(15, 23, 42, 0.12)',
                                            }}
                                            formatter={(value: number) => [`${Number(value).toFixed(1)} Kg`, 'Factory Weight']}
                                            labelFormatter={(label) => `Year: ${label}`}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#1b5e20"
                                            strokeWidth={3}
                                            dot={{ r: 5, strokeWidth: 2, fill: '#ffffff' }}
                                            activeDot={{ r: 7 }}
                                            name="Factory Weight (Kg)"
                                        />
                                    </LineChart>
                                ) : (
                                    <BarChart data={weeklyYieldData} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="factoryWeightBar" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#43a047" stopOpacity={0.95} />
                                                <stop offset="100%" stopColor="#1b5e20" stopOpacity={0.88} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="4 4" stroke="rgba(27,94,32,0.12)" vertical={false} />
                                        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#5d7388', fontSize: 10 }} minTickGap={15} />
                                        <YAxis tickLine={false} axisLine={false} tick={{ fill: '#5d7388', fontSize: 12 }} />
                                        <RechartsTooltip
                                            cursor={{ fill: 'rgba(46,125,50,0.06)' }}
                                            contentStyle={{
                                                borderRadius: 12,
                                                border: '1px solid rgba(46,125,50,0.14)',
                                                boxShadow: '0 18px 34px rgba(15, 23, 42, 0.12)',
                                            }}
                                            formatter={(value: number) => [`${Number(value).toFixed(1)} Kg`, 'Factory Weight']}
                                            labelFormatter={(label) => `${factoryWeightView.charAt(0).toUpperCase() + factoryWeightView.slice(1)}: ${label}`}
                                        />
                                        <Bar
                                            dataKey="value"
                                            fill="url(#factoryWeightBar)"
                                            radius={[10, 10, 4, 4]}
                                            maxBarSize={48}
                                            name="Factory Weight (Kg)"
                                        />
                                    </BarChart>
                                )}
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>

                {/* Divisional Assignments (Grouped Muster) */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ height: 400, overflow: 'auto' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2} justifyContent="space-between">
                                <Box display="flex" alignItems="center">
                                    <GroupIcon color="secondary" sx={{ mr: 1 }} />
                                    <Typography variant="h6">Today's Plan</Typography>
                                </Box>
                                <Chip label={`${workerTurnout} Workers`} size="small" color="success" variant="outlined" />
                            </Box>

                            <List dense>
                                {groupedMuster.map((m: any, index) => (
                                    <div key={index}>
                                        <ListItem
                                            sx={{
                                                bgcolor: '#f5f5f5',
                                                borderRadius: 2,
                                                mb: 1,
                                                borderLeft: `4px solid ${m.taskType === 'Plucking' ? '#4caf50' : '#ffa000'}`
                                            }}
                                        >
                                            <ListItemText
                                                primary={
                                                    <Typography variant="subtitle2" fontWeight="bold">
                                                        {m.fieldName}
                                                    </Typography>
                                                }
                                                secondary={m.taskType}
                                            />
                                            <Chip label={m.workerCount} size="small" sx={{ fontWeight: 'bold' }} />
                                        </ListItem>
                                    </div>
                                ))}
                                {groupedMuster.length === 0 && (
                                    <Box textAlign="center" py={4}>
                                        <Typography variant="body2" color="text.secondary">No Assignments Yet</Typography>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            sx={{ mt: 2 }}
                                            onClick={() => navigate('/dashboard/morning-muster')}
                                            startIcon={<AddIcon />}
                                        >
                                            Create Assignments
                                        </Button>
                                    </Box>
                                )}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Add Muster Dialog */}
            <Dialog open={openMuster} onClose={() => setOpenMuster(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Morning Muster</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Field Name</InputLabel>
                        <Select
                            value={newMuster.fieldName}
                            label="Field Name"
                            onChange={(e) => setNewMuster({ ...newMuster, fieldName: e.target.value })}
                        >
                            {fields.map((field) => (
                                <MenuItem key={field.fieldId} value={field.name}>
                                    {field.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Task Type</InputLabel>
                        <Select value={newMuster.taskType} label="Task Type" onChange={(e) => setNewMuster({ ...newMuster, taskType: e.target.value })}>
                            <MenuItem value="Plucking">Plucking</MenuItem>
                            <MenuItem value="Weeding">Weeding</MenuItem>
                            <MenuItem value="Fertilizing">Fertilizing</MenuItem>
                            <MenuItem value="Tapping">Tapping</MenuItem>
                        </Select>
                    </FormControl>

                    {/* Worker Multi-Select */}
                    {/* Worker Multi-Select with Autocomplete and Grouping */}
                    <Autocomplete
                        multiple
                        id="worker-select-grouped"
                        options={workers.sort((a, b) => a.name.localeCompare(b.name))}
                        getOptionLabel={(option) => option.name}
                        value={workers.filter(w => newMuster.workerIds.includes(w.id))}
                        onChange={(event, newValue) => {
                            setNewMuster({ ...newMuster, workerIds: newValue.map(w => w.id) });
                        }}
                        disableCloseOnSelect
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Assign Workers"
                                placeholder="Search by name or role"
                                margin="dense"
                            />
                        )}
                        renderOption={(props, option, { selected }) => {
                            const d = new Date();
                            const todayLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                            const isUnavailable = musters.some(m => m.date === todayLocal && m.workerIds?.includes(option.id));
                            const { key, ...otherProps } = props as any;
                            return (
                                <li key={option.id || key} {...otherProps}>
                                    <Checkbox
                                        checked={selected}
                                        style={{ marginRight: 8 }}
                                        disabled={isUnavailable}
                                    />
                                    <Box sx={{ opacity: isUnavailable ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                        <Typography variant="body2">{option.name} {isUnavailable ? '(Assigned)' : ''}</Typography>
                                    </Box>
                                </li>
                            );
                        }}
                        sx={{ mt: 2 }}
                    />

                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenMuster(false)}>Cancel</Button>
                    <Button onClick={handleCreateMuster} variant="contained" disabled={newMuster.workerIds.length === 0 || !newMuster.fieldName}>
                        Assign ({newMuster.workerIds.length})
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Log Harvest Dialog */}
            <Dialog open={openHarvest} onClose={() => setOpenHarvest(false)}>
                <DialogTitle>Log Daily Harvest</DialogTitle>
                <DialogContent>
                    <TextField autoFocus margin="dense" label="Worker Name / Gang ID" fullWidth value={newHarvest.workerName} onChange={(e) => setNewHarvest({ ...newHarvest, workerName: e.target.value })} />
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Field Name</InputLabel>
                        <Select
                            value={newHarvest.fieldName}
                            label="Field Name"
                            onChange={(e) => setNewHarvest({ ...newHarvest, fieldName: e.target.value })}
                        >
                            {fields.map((field) => (
                                <MenuItem key={field.fieldId} value={field.name}>
                                    {field.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField margin="dense" label="Quantity (kg)" type="number" fullWidth value={newHarvest.quantityKg} onChange={(e) => setNewHarvest({ ...newHarvest, quantityKg: Number(e.target.value) })} />
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Crop Type</InputLabel>
                        <Select value={newHarvest.cropType} label="Crop Type" onChange={(e) => setNewHarvest({ ...newHarvest, cropType: e.target.value })}>
                            {(userSession.config?.crops || ['Tea', 'Rubber', 'Cinnamon']).map((crop: string) => (
                                <MenuItem key={crop} value={crop}>{crop}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenHarvest(false)}>Cancel</Button>
                    <Button onClick={handleLogHarvest} variant="contained" color="secondary">Submit Log</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
