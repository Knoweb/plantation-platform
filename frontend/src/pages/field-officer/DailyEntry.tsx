import { Box, Typography, Button, Paper, Tabs, Tab, Table, TableBody, TableContainer, TableCell, TableHead, TableRow, Chip, IconButton, MenuItem, Select, FormControl, InputLabel, Avatar, CircularProgress, Alert, Snackbar, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Badge, TextField, Autocomplete, Checkbox, InputAdornment, useMediaQuery, useTheme } from '@mui/material';
import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import axios from 'axios';
import {
    Check as CheckIcon,
    Close as CloseIcon,
    Block as BlockIcon,
    Person as PersonIcon,
    History as HistoryIcon,
    EditCalendar as EditStartIcon,
    Visibility as VisibilityIcon,
    Delete as DeleteIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';

// --- Interfaces ---
interface AttendanceRecord {
    id: string;
    workerId: string;
    workType: string;
    fieldName: string;
    amWeight?: number | string;
    pmWeight?: number | string;
    overKilos?: number | string;
    cashKilos?: number | string;
    otHours?: number | string;
    status: string;
    workerName?: string;
    divisionId?: string;
    workDate: string; 
    updatedAt?: string;
    session?: string;
    tenantId?: string;
    dailyWorkId?: string;
    workerType?: string;
}

const parseJavaDate = (dateVal: any) => {
    if (!dateVal) return null;
    if (typeof dateVal === 'string') return new Date(dateVal);
    if (Array.isArray(dateVal)) {
        const [year, month, day, hour, minute, second] = dateVal;
        return new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
    }
    return new Date(dateVal);
};

// --- Main Component ---
export default function EveningMusterPage({ defaultTab = 0 }: { defaultTab?: number }) {
    const [tabIndex, setTabIndex] = useState(defaultTab);
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const userRole = userSession.role;
    const [auditAlertCount, setAuditAlertCount] = useState(0);

    const fetchAuditAlerts = useCallback(async () => {
        if (userRole === 'CHIEF_CLERK') {
            setAuditAlertCount(0);
            return;
        }
        try {
            const auditRes = await axios.get(`/api/operations/daily-work/audited?tenantId=${userSession.tenantId}`);
            const auditedRecords = auditRes.data || [];
            const seenAudits = JSON.parse(localStorage.getItem('seen_audit_notes') || '[]');
            const unreadAudits = auditedRecords.filter((r: any) => !seenAudits.includes(r.workId || r.id));
            setAuditAlertCount(unreadAudits.length);
        } catch (_e) {
            console.warn("Audit alerts unavailable for tab badge");
        }
    }, [userSession.tenantId, userRole]);

    useEffect(() => {
        void fetchAuditAlerts();
        window.addEventListener('muster-update', fetchAuditAlerts);
        const interval = setInterval(fetchAuditAlerts, 30000); // Check every 30s
        return () => {
            window.removeEventListener('muster-update', fetchAuditAlerts);
            clearInterval(interval);
        };
    }, [fetchAuditAlerts]);

    return (
        <Box sx={{ bgcolor: '#f4f7f5', minHeight: '100vh', pb: 10, width: '100%', overflowX: 'hidden' }}>
            <Box sx={{ 
                bgcolor: 'white', 
                px: { xs: 1.5, sm: 4 }, 
                pt: { xs: 2, sm: 2 }, 
                pb: { xs: 1.5, sm: 2 },
                borderBottom: '1px solid #eef2f6',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
            }}>
                <Box 
                    display="flex" 
                    flexDirection={{ xs: 'column', sm: 'row' }} 
                    justifyContent="space-between" 
                    alignItems="center" 
                    gap={{ xs: 1.5, sm: 3 }}
                >
                    {/* Left Group: Branding & Context */}
                    <Box sx={{ 
                        alignSelf: { xs: 'stretch', sm: 'auto' },
                        display: 'flex',
                        flexDirection: { xs: 'row', sm: 'column' }, // Row on mobile to put date on right
                        justifyContent: 'space-between',
                        alignItems: { xs: 'center', sm: 'flex-start' },
                        width: { xs: '100%', sm: 'auto' }
                    }}>
                        <Box>
                            <Box display="flex" alignItems="center" gap={1.2}>
                                <Typography variant="h6" fontWeight="900" color="#1b5e20" sx={{ letterSpacing: '-0.02em', fontSize: { xs: '0.95rem', sm: '1.2rem' }, lineHeight: 1.2 }}>
                                    Field Officer Portal
                                </Typography>
                                <Box sx={{ 
                                    width: 7, 
                                    height: 7, 
                                    borderRadius: '50%', 
                                    bgcolor: '#4caf50', 
                                    boxShadow: '0 0 0 2px rgba(76, 175, 80, 0.2)',
                                    animation: 'pulse-green 2s infinite',
                                    '@keyframes pulse-green': {
                                        '0%': { boxShadow: '0 0 0 0 rgba(76, 175, 80, 0.4)' },
                                        '70%': { boxShadow: '0 0 0 6px rgba(76, 175, 80, 0)' },
                                        '100%': { boxShadow: '0 0 0 0 rgba(76, 175, 80, 0)' }
                                    }
                                }} />
                            </Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.55rem', mt: 0.1, display: 'block' }}>
                                Operational Dashboard
                            </Typography>
                        </Box>

                        <Box sx={{ 
                            display: { xs: 'flex', sm: 'none' },
                            bgcolor: '#f1f8e9', 
                            px: 1.2, 
                            py: 0.6, 
                            borderRadius: '15px', 
                            border: '1px solid #c8e6c9',
                            alignItems: 'center',
                            gap: 0.8,
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 5px rgba(46, 125, 50, 0.05)'
                        }}>
                             <Typography variant="body2" fontWeight="900" color="#2e7d32" sx={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                 {new Date().toLocaleDateString('en-US', { weekday: 'short' })}
                             </Typography>
                             <Box sx={{ width: '1px', height: 12, bgcolor: '#c8e6c9' }} />
                             <Typography variant="body2" fontWeight="800" color="#1b5e20" sx={{ fontSize: '0.75rem' }}>
                                 {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                             </Typography>
                             <Box sx={{ width: '1px', height: 12, bgcolor: '#c8e6c9' }} />
                             <Typography variant="body2" fontWeight="700" color="#558b2f" sx={{ fontSize: '0.75rem' }}>
                                 {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                             </Typography>
                        </Box>
                    </Box>

                    {/* Right Group: Navigation & Utilities */}
                    <Box sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: 'center', 
                        gap: { xs: 2.5, sm: 2 }, 
                        width: { xs: '100%', sm: 'auto' }, 
                        justifyContent: { xs: 'center', sm: 'flex-end' } 
                    }}>
                        {/* Compact Segmented Control */}
                        <Box sx={{ 
                            display: 'inline-flex', 
                            bgcolor: '#f1f5f9', 
                            p: 0.4, 
                            borderRadius: 2.5,
                            border: '1px solid #e2e8f0',
                            gap: 0.4
                        }}>
                            {userRole === 'FIELD_OFFICER' && (
                                <Box 
                                    onClick={() => setTabIndex(0)}
                                    sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: 0.8, 
                                        px: { xs: 2.8, sm: 2 }, 
                                        py: { xs: 1, sm: 0.7 }, 
                                        borderRadius: 2.2,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                        bgcolor: tabIndex === 0 ? '#1b5e20' : 'transparent',
                                        color: tabIndex === 0 ? 'white' : '#64748b',
                                        boxShadow: tabIndex === 0 ? '0 4px 10px rgba(27, 94, 32, 0.2)' : 'none',
                                        animation: (tabIndex === 0) ? { xs: 'pulse-active 2.5s infinite ease-in-out', sm: 'none' } : 'none',
                                        '@keyframes pulse-active': {
                                            '0%': { transform: 'scale(1)' },
                                            '50%': { transform: 'scale(0.98)', opacity: 0.9 },
                                            '100%': { transform: 'scale(1)' }
                                        },
                                        '&:hover': { bgcolor: tabIndex === 0 ? '#1b5e20' : '#f8fafc' }
                                    }}
                                >
                                    <EditStartIcon sx={{ fontSize: '1rem' }} />
                                    <Typography sx={{ fontSize: '0.8rem', fontWeight: tabIndex === 0 ? '900' : '700' }}>Entry</Typography>
                                </Box>
                            )}
                            <Box 
                                onClick={() => setTabIndex(1)}
                                sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 0.8, 
                                    px: { xs: 2.8, sm: 2 }, 
                                    py: { xs: 1, sm: 0.7 }, 
                                    borderRadius: 2.2,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    bgcolor: tabIndex === 1 ? '#1b5e20' : 'transparent',
                                    color: tabIndex === 1 ? 'white' : '#64748b',
                                    boxShadow: tabIndex === 1 ? '0 4px 10px rgba(27, 94, 32, 0.2)' : 'none',
                                    animation: (tabIndex === 1) ? { xs: 'pulse-active 2.5s infinite ease-in-out', sm: 'none' } : 'none',
                                    '&:hover': { bgcolor: tabIndex === 1 ? '#1b5e20' : '#f8fafc' }
                                }}
                            >
                                <Badge badgeContent={auditAlertCount} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 14, height: 14 } }}>
                                    <HistoryIcon sx={{ fontSize: '1rem' }} />
                                </Badge>
                                <Typography sx={{ fontSize: '0.75rem', fontWeight: tabIndex === 1 ? '900' : '700' }}>History</Typography>
                            </Box>
                        </Box>

                        {/* Date Pill: Desktop position */}
                        <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center' }}>
                            <Box sx={{ 
                                bgcolor: '#f1f8e9', 
                                px: { xs: 2, sm: 2.2 }, 
                                py: { xs: 1, sm: 1.2 }, 
                                borderRadius: '30px', 
                                border: '1px solid #c8e6c9',
                                display: 'flex',
                                alignItems: 'center',
                                gap: { xs: 1.2, sm: 1.5 },
                                whiteSpace: 'nowrap',
                                boxShadow: '0 3px 8px rgba(46, 125, 50, 0.1)'
                            }}>
                                <Typography variant="body2" fontWeight="900" color="#2e7d32" sx={{ fontSize: { xs: '1rem', sm: '1.3rem' }, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {new Date().toLocaleDateString('en-US', { weekday: 'short' })}
                                </Typography>
                                <Box sx={{ width: '2px', height: 22, bgcolor: '#c8e6c9', borderRadius: 1 }} />
                                <Typography variant="body2" fontWeight="700" color="#558b2f" sx={{ fontSize: { xs: '1rem', sm: '1.3rem' } }}>
                                    {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Box>

            <Box sx={{ p: { xs: 1, sm: 2 } }}>
                {userRole === 'FIELD_OFFICER' ? (
                    <>
                        {tabIndex === 0 && <DailyEntryTab />}
                        {tabIndex === 1 && <HistoryTab />}
                    </>
                ) : (
                    <HistoryTab />
                )}
            </Box>
        </Box>
    );
}

// --- Tab 1: Daily Entry (Today) ---
function DailyEntryTab() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const [loading, setLoading] = useState(true);
    const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
    const [divisions, setDivisions] = useState<any[]>([]);
    const [fields, setFields] = useState<any[]>([]);
    const [taskTypes, setTaskTypes] = useState<any[]>([]);
    const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' });
    const [norms, setNorms] = useState<any[]>([]);
    const [dailyWorks, setDailyWorks] = useState<any[]>([]);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isFirstLoad, setIsFirstLoad] = useState(true);
    const lastDivisionRef = useRef(selectedDivision);

    // Derived state for submission status to prevent flickering during refreshes
    const isSubmitted = useMemo(() => {
        if (!selectedDivision || selectedDivision === 'ALL' || !tenantId) return false;
        const entry = dailyWorks.find((dw: any) => String(dw.divisionId) === String(selectedDivision));
        const localStatus = localStorage.getItem(`muster_submitted_${tenantId}_${today}_${selectedDivision}`) === 'true';
        return !!(entry && entry.submittedAt) || localStatus;
    }, [selectedDivision, dailyWorks, tenantId, today]);
    const isEditModeRef = useRef(false);
    const [confirmSaveDraftOpen, setConfirmSaveDraftOpen] = useState(false);
    const [viewTargetsOpen, setViewTargetsOpen] = useState(false);
    const [isEditingWeightsAfterSubmission, setIsEditingWeightsAfterSubmission] = useState(false);
    const [confirmWeightsOpen, setConfirmWeightsOpen] = useState(false);
    const [allWorkers, setAllWorkers] = useState<any[]>([]);
    const [availableTasks, setAvailableTasks] = useState<string[]>([]);
    const [addWorkerOpen, setAddWorkerOpen] = useState(false);
    const [addWorkerTask, setAddWorkerTask] = useState<string>('');
    const [addWorkerField, setAddWorkerField] = useState<string>('');
    const [pendingEveningWorkers, setPendingEveningWorkers] = useState<any[]>([]);
    const [dailyWeights, setDailyWeights] = useState<any>({});

    const fetchInitialData = useCallback(async (silent = false) => {
        if (!tenantId) return;
        const isDivisionSwitch = selectedDivision !== lastDivisionRef.current;
        if (!silent && (isFirstLoad || isDivisionSwitch)) setLoading(true);
        try {
            const [attRes, fRes, wRes, tRes, dwRes, normsRes, allDivRes] = await Promise.all([
                axios.get(`/api/operations/attendance?tenantId=${tenantId}&date=${today}`),
                axios.get(`/api/fields?tenantId=${tenantId}`),
                axios.get(`/api/workers?tenantId=${tenantId}`),
                axios.get(`/api/operations/task-types?tenantId=${tenantId}`),
                axios.get(`/api/operations/daily-work?tenantId=${tenantId}&date=${today}`),
                axios.get(`/api/operations/norms`, { headers: { 'X-Tenant-Id': tenantId } }),
                axios.get(`/api/divisions?tenantId=${tenantId}`)
            ]);

            setTaskTypes(tRes.data);
            setAvailableTasks(tRes.data.map((t: any) => t.name));
            setFields(fRes.data);
            setNorms(normsRes.data);
            setDailyWorks(dwRes.data);

            const wMap = new Map<string, any>();
            wRes.data.forEach((w: any) => {
                if (w.workerId) wMap.set(w.workerId, w);
                wMap.set(w.id, w);
            });
            if (!isEditModeRef.current) setAllWorkers(wRes.data);

            const divNameMap = new Map<string, string>();
            allDivRes.data.forEach((d: any) => divNameMap.set(d.divisionId, d.name));

            const dwMap = new Map<string, string>();
            const dbWeights: any = {};
            const backendSubmittedDivisions = new Set<string>();
            dwRes.data.forEach((dw: any) => {
                // IMPORTANT: Only process records for the CURRENT date.
                // The API currently returns all records for the tenant, so we must filter locally.
                if (dw.workDate !== today) return;

                const divId = String(dw.divisionId);
                dwMap.set(dw.workId || dw.id, divId);
                
                // Load weights for TODAY if they are in the DB (either submitted or just saved as draft)
                const hasDraft = localStorage.getItem(`muster_draft_${tenantId}_${today}_${divId}`) === 'true';
                if (dw.bulkWeights && (dw.submittedAt || hasDraft || dw.status === 'PENDING' || dw.status === 'APPROVED')) {
                    try {
                        const parsed = JSON.parse(dw.bulkWeights);
                        dbWeights[divId] = {
                            ...(dbWeights[divId] || {}),
                            ...parsed
                        };
                    } catch (e) { }
                }

                if (dw.submittedAt) {
                    backendSubmittedDivisions.add(String(dw.divisionId));
                }
            });

            if (!isEditModeRef.current) {
                setDailyWeights((prev: any) => {
                    const next = { ...prev };
                    Object.entries(dbWeights).forEach(([divId, fields]: [string, any]) => {
                        // Merge fields at the division level instead of replacing the whole division object
                        next[divId] = { 
                            ...(next[divId] || {}),
                            ...fields 
                        };
                    });
                    return next;
                });
            }

            const enriched = attRes.data.map((rec: any) => {
                let divId = dwMap.get(rec.dailyWorkId) || 'UNKNOWN';
                if (divId === 'UNKNOWN') {
                    const field = fRes.data.find((f: any) => f.name?.toLowerCase() === rec.fieldName?.toLowerCase());
                    if (field) divId = field.divisionId;
                }
                
                const draftKey = `muster_draft_${tenantId}_${today}_${divId}`;
                const submittedKey = `muster_submitted_${tenantId}_${today}_${divId}`;
                const hasDraft = localStorage.getItem(draftKey) === 'true';
                const hasSubmitted = localStorage.getItem(submittedKey) === 'true';
                const backendSubmitted = backendSubmittedDivisions.has(String(divId));

                return {
                    ...rec,
                    workerName: wMap.get(rec.workerId)?.name || rec.workerName || rec.workerId,
                    workerType: wMap.get(rec.workerId)?.employmentType || 'PERMANENT',
                    status: (hasDraft || hasSubmitted || backendSubmitted) ? rec.status : '',
                    amWeight: rec.amWeight ?? '',
                    pmWeight: (hasDraft || hasSubmitted || backendSubmitted) ? (rec.pmWeight ?? '') : '',
                    overKilos: (hasDraft || hasSubmitted || backendSubmitted) ? (rec.overKilos ?? '') : '',
                    otHours: (hasDraft || hasSubmitted || backendSubmitted) ? (rec.otHours ?? '') : '',
                    session: rec.session || 'FULL_DAY',
                    divisionId: divId,
                    tenantId: tenantId
                };
            });

            if (!isEditModeRef.current) {
                setAttendanceData(enriched);

                const activeDivIds = Array.from(new Set(enriched.map((i: any) => i.divisionId).filter((id: any) => id && id !== 'UNKNOWN')));
                const activeDivs = activeDivIds.map(id => ({
                    divisionId: id,
                    name: divNameMap.get(id) || id
                })).sort((a, b) => a.name.localeCompare(b.name));
                
                setDivisions(activeDivs);

                setSelectedDivision(prev => {
                    if (activeDivs.length > 0 && (prev === '' || prev === 'ALL' || !activeDivs.find(d => d.divisionId === prev))) {
                        return activeDivs[0].divisionId;
                    }
                    return prev;
                });
            }

            if (selectedDivision && selectedDivision !== 'ALL') {
                const entry = dwRes.data.find((dw: any) => String(dw.divisionId) === String(selectedDivision));
                if (entry && entry.submittedAt) {
                    setIsEditMode(false);
                }
            }

            if (!silent) setLoading(false);
            setIsFirstLoad(false);
            lastDivisionRef.current = selectedDivision;
        } catch (e) {
            console.error("Failed", e);
            if (!silent) setNotification({ open: true, message: "Failed to load data.", severity: 'error' });
            setLoading(false);
        }
    }, [tenantId, today, isEditModeRef, selectedDivision, isFirstLoad]);

    useEffect(() => {
        isEditModeRef.current = isEditMode;
    }, [isEditMode]);

    useEffect(() => {
        if (tenantId) {
            void fetchInitialData();
            const interval = setInterval(() => {
                void fetchInitialData(true);
            }, 10000);
            return () => clearInterval(interval);
        }
    }, [tenantId, fetchInitialData]);

    // Handle shared fetch trigger
    useEffect(() => {
        const handler = () => fetchInitialData(true);
        window.addEventListener('muster-update', handler);
        return () => window.removeEventListener('muster-update', handler);
    }, [fetchInitialData]);

    const handleUpdate = (id: string, field: keyof AttendanceRecord, value: any) => {
        setAttendanceData(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const [confirmOpen, setConfirmOpen] = useState(false);

    const handleSaveDraft = async () => {
        setConfirmSaveDraftOpen(false);
        try {
            const updates = attendanceData.filter(item => item.divisionId === selectedDivision).map(item => ({
                id: item.id,
                tenantId: item.tenantId,
                workerId: item.workerId,
                workDate: item.workDate,
                dailyWorkId: item.dailyWorkId,
                workType: item.workType,
                fieldName: item.fieldName,
                am: item.amWeight !== '' ? Number(item.amWeight) : null,
                pm: item.pmWeight !== '' ? Number(item.pmWeight) : null,
                overKilos: item.overKilos !== '' && item.overKilos != null ? Number(item.overKilos) : 0,
                cashKilos: item.workerType?.includes('CONTRACT') ? ((Number(item.amWeight) || 0) + (Number(item.pmWeight) || 0)) : (item.cashKilos !== '' && item.cashKilos != null ? Number(item.cashKilos) : 0),
                otHours: item.otHours !== '' && item.otHours != null ? Number(item.otHours) : 0,
                status: (item.workerType?.includes('CONTRACT') && (!item.status || item.status === '')) ? 'PRESENT' : item.status,
                session: item.session
            }));
            await axios.post(`/api/operations/attendance/bulk`, updates);

            // Also save Field and Factory weights to ALL DailyWork entities for this division to keep them in sync
            const allWorkIdsForDiv = dailyWorks
                .filter((dw: any) => String(dw.divisionId) === String(selectedDivision))
                .map((dw: any) => dw.workId || dw.id);

            if (allWorkIdsForDiv.length > 0) {
                try {
                    await Promise.all(allWorkIdsForDiv.map(workId => 
                        axios.put(`/api/operations/daily-work/${workId}/weights`, {
                            bulkWeights: JSON.stringify(dailyWeights[selectedDivision] || {}),
                            isSubmission: false
                        })
                    ));
                } catch (we) {
                    console.error("Failed to save draft bulk weights to DB", we);
                }
            }

            // Mark draft as saved so fetchInitialData doesn't wipe the statuses again
            localStorage.setItem(`muster_draft_${tenantId}_${today}_${selectedDivision}`, 'true');

            setNotification({ open: true, message: "Saved Successfully!", severity: 'success' });
            setIsEditMode(false);
            isEditModeRef.current = false; // Force immediate ref update before fetch
            window.dispatchEvent(new Event('muster-update'));
        } catch (e) {
            setNotification({ open: true, message: "Failed to save.", severity: 'error' });
        }
    };

    const handleCancelEdit = () => {
        setIsEditMode(false);
        fetchInitialData(false); // Reset to last saved state
    };

    // Note: dailyWeights are intentionally NOT restored from localStorage.
    // They start blank each session. Submitted weights are loaded from the backend via fetchInitialData.
    useEffect(() => {
        if (tenantId && today) {
            const key = `dailyWeights_${tenantId}_${today}`;
            localStorage.removeItem(key); // Clear any stale saved weights
        }
    }, [tenantId, today]);

    useEffect(() => {
        if (isSubmitted) {
            setIsEditMode(false);
        }
    }, [isSubmitted]);

    const handleSubmit = async () => {
        // Build a set of workerIds whose last assignment (per task order) needs a status
        const divData = attendanceData.filter(item => item.divisionId === selectedDivision);
        const allTaskOrder = Object.keys(
            divData.reduce((a: any, i) => { a[i.workType] = true; return a; }, {})
        );
        const workerLastTaskMap: Record<string, string> = {};
        divData.forEach(item => {
            // For each worker, find which task appears LAST in the ordered task list
            workerLastTaskMap[item.workerId] = item.workType; // last one wins (order = task grouping order)
        });

        const incomplete = divData.filter(item =>
            // Only check workers whose last assignment is this item AND they are not CONTRACT
            workerLastTaskMap[item.workerId] === item.workType &&
            !item.workerType?.includes('CONTRACT') &&
            (!item.status || item.status === 'PENDING' || item.status === '')
        );
        if (incomplete.length > 0) {
            setNotification({ open: true, message: `Cannot submit! Please mark the attendance status (Present, Absent, etc.) for all ${incomplete.length} remaining worker(s).`, severity: 'error' });
            return;
        }
        setConfirmOpen(true);
    };

    const handleConfirmSubmit = async () => {
        setConfirmOpen(false);
        try {
            const updates = attendanceData.filter(item => item.divisionId === selectedDivision).map(item => ({
                id: item.id,
                tenantId: item.tenantId,
                workerId: item.workerId,
                workDate: item.workDate,
                dailyWorkId: item.dailyWorkId,
                workType: item.workType,
                fieldName: item.fieldName,
                am: Number(item.amWeight) || null,
                pm: Number(item.pmWeight) || null,
                overKilos: item.overKilos !== '' && item.overKilos != null ? Number(item.overKilos) : 0,
                cashKilos: item.workerType?.includes('CONTRACT') ? ((Number(item.amWeight) || 0) + (Number(item.pmWeight) || 0)) : (item.cashKilos !== '' && item.cashKilos != null ? Number(item.cashKilos) : 0),
                otHours: item.otHours !== '' && item.otHours != null ? Number(item.otHours) : 0,
                status: (item.workerType?.includes('CONTRACT') && (!item.status || item.status === '')) ? 'PRESENT' : item.status,
                session: item.session
            }));
            await axios.post(`/api/operations/attendance/bulk`, updates);

            // Also save Field and Factory weights to ALL DailyWork entities for this division
            const allWorkIdsForDiv = dailyWorks
                .filter((dw: any) => String(dw.divisionId) === String(selectedDivision))
                .map((dw: any) => dw.workId || dw.id);

            if (allWorkIdsForDiv.length > 0) {
                try {
                    await Promise.all(allWorkIdsForDiv.map(workId => 
                        axios.put(`/api/operations/daily-work/${workId}/weights`, {
                            bulkWeights: JSON.stringify(dailyWeights[selectedDivision] || {}),
                            isSubmission: true // Tell backend to set the submitted_at timestamp
                        })
                    ));
                } catch (we) {
                    console.error("Failed to save bulk weights to DB", we);
                }
            } else {
                console.warn("No DailyWork ID found for division:", selectedDivision);
            }

            setNotification({ open: true, message: "Saved Successfully!", severity: 'success' });

            // Persist Submission
            localStorage.setItem(`muster_submitted_${tenantId}_${today}_${selectedDivision}`, 'true');
            isEditModeRef.current = false; // ensure polling can update state

            // Re-fetch so temp-ID workers get replaced with real backend IDs
            await fetchInitialData(true);

            // Trigger Sidebar Update
            window.dispatchEvent(new Event('muster-update'));
        } catch (e) {
            setNotification({ open: true, message: "Failed to save.", severity: 'error' });
        }
    };

    // Filter Logic
    const filteredData = attendanceData.filter(item => item.divisionId === selectedDivision);
    const uniqueFieldsInMuster = Array.from(new Set(filteredData.map(item => item.fieldName))).filter(Boolean) as string[];

    // Only fields that involve plucking / harvesting should get bulk weight inputs
    const uniqueFieldsForWeights = Array.from(new Set(
        filteredData
            .filter(item => item.workType?.toLowerCase().includes('pluck') || item.workType?.toLowerCase().includes('harvest'))
            .map(item => item.fieldName)
    )).filter(Boolean) as string[];

    // Grouping
    const grouped = filteredData.reduce((acc: any, item) => {
        const key = item.workType;
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});

    // Build a map: workerId -> the workType of the LAST task they appear in (for icon visibility)
    const workerLastTaskMap: Record<string, string> = {};
    filteredData.forEach(item => {
        workerLastTaskMap[item.workerId] = item.workType; // Last assignment wins
    });

    // Handler to remove an accidentally added evening-only worker
    const handleRemoveWorker = (itemId: string) => {
        setAttendanceData(prev => prev.filter(a => a.id !== itemId));
    };

    // Categorized Summary Calculation for Muster Chit
    const getCategorizedSummary = () => {
        const categories: any = { Tea: {}, Rubber: {}, General: {} };

        filteredData.forEach(m => {
            const field = fields.find(f => f.name === m.fieldName);
            const crop = field?.cropType || 'General';

            let catKey = 'General';
            if (crop === 'Tea') catKey = 'Tea';
            if (crop === 'Rubber') catKey = 'Rubber';

            if (!categories[catKey][m.workType]) {
                categories[catKey][m.workType] = { countMorning: 0, countEvening: 0, fields: {} };
            }

            if (m.status !== 'ABSENT') {
                const addMorning = m.session === 'MORNING_SESSION' || m.session === 'FULL_DAY';
                const addEvening = m.session === 'EVENING_SESSION' || m.session === 'FULL_DAY';

                if (addMorning) categories[catKey][m.workType].countMorning++;
                if (addEvening) categories[catKey][m.workType].countEvening++;

                if (!categories[catKey][m.workType].fields[m.fieldName]) {
                    categories[catKey][m.workType].fields[m.fieldName] = { countMorning: 0, countEvening: 0 };
                }
                if (addMorning) categories[catKey][m.workType].fields[m.fieldName].countMorning++;
                if (addEvening) categories[catKey][m.workType].fields[m.fieldName].countEvening++;
            }
        });
        return categories;
    };

    const categorizedSummary = useMemo(() => getCategorizedSummary(), [filteredData, fields]);
    const grandMorningTotal = useMemo(() => filteredData.filter(d => d.status !== 'ABSENT' && (d.session === 'MORNING_SESSION' || d.session === 'FULL_DAY')).length, [filteredData]);
    const grandEveningTotal = useMemo(() => filteredData.filter(d => d.status !== 'ABSENT' && (d.session === 'EVENING_SESSION' || d.session === 'FULL_DAY')).length, [filteredData]);

    const pendingCount = useMemo(() => divisions.filter((d: { divisionId: string | number }) => !dailyWorks.some((dw: { divisionId: string | number, submittedAt: any }) => String(dw.divisionId) === String(d.divisionId) && Boolean(dw.submittedAt))).length, [divisions, dailyWorks]);

    if (loading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

    return (
        <Box sx={{ width: '100%', overflowX: 'hidden' }}>
        <Box sx={{ mb: isMobile ? 2 : 3 }}>
            {!isMobile ? (
                /* Desktop Toolbar: Restored to original exactly */
                <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} mb={3}>
                    <Box display="flex" alignItems="center">
                        {isSubmitted && <Chip label="Read-Only Mode" color="info" sx={{ fontWeight: 'bold' }} />}
                    </Box>
                    <Box display="flex" gap={2} alignItems="center">
                        <Badge
                            badgeContent={pendingCount}
                            color="error"
                            invisible={pendingCount === 0}
                            sx={{
                                overflow: 'visible', // Ensure label isn't cut
                                '& .MuiBadge-badge': {
                                    right: 10,
                                    top: 5
                                }
                            }}
                        >
                            <FormControl size="small" sx={{ 
                                mt: 1, // Added margin top to prevent label cutting
                                minWidth: { xs: 200, sm: 250 }, 
                                bgcolor: 'white',
                                borderRadius: 2,
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    '& fieldset': { borderColor: '#c8e6c9', borderWidth: '1.5px' },
                                    '&:hover fieldset': { borderColor: '#4caf50' },
                                    '&.Mui-focused fieldset': { borderColor: '#2e7d32' }
                                }
                            }}>
                                <InputLabel sx={{ 
                                    color: '#2e7d32', 
                                    fontWeight: 'bold',
                                    bgcolor: 'white', // Mask the border
                                    px: 0.5,         // Some padding for the mask
                                    ml: -0.5         // Offset for padding
                                }}>Select Division</InputLabel>
                                <Select 
                                    value={selectedDivision} 
                                    label="Select Division" 
                                    onChange={(e) => {
                                        const newDiv = e.target.value;
                                        setSelectedDivision(newDiv);
                                        const hasDraft = localStorage.getItem(`muster_draft_${tenantId}_${today}_${newDiv}`) === 'true';
                                        if (!hasDraft && isEditMode) {
                                            setDailyWeights((prev: any) => ({
                                                ...prev,
                                                [newDiv]: {}
                                            }));
                                        }
                                    }}
                                    sx={{ fontWeight: 'bold', color: '#1b5e20' }}
                                >
                                    {divisions.map((d: any) => {
                                        const isPending = localStorage.getItem(`muster_submitted_${tenantId}_${today}_${d.divisionId}`) !== 'true';
                                        return (
                                            <MenuItem key={d.divisionId} value={d.divisionId} sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                                {d.name}
                                                {isPending && <Chip label="Pending" color="error" size="small" sx={{ height: 20, fontSize: '0.65rem', ml: 1, fontWeight: 'bold' }} />}
                                            </MenuItem>
                                        );
                                    })}
                                </Select>
                            </FormControl>
                        </Badge>
                        {attendanceData.length > 0 && selectedDivision && (
                            <Box display="flex" gap={1}>
                                {isSubmitted ? (
                                    <>
                                        <Button variant="contained" disabled sx={{ bgcolor: '#e0e0e0', fontWeight: 'bold' }}>Finalized</Button>
                                        {!isEditingWeightsAfterSubmission ? (
                                            <Button variant="outlined" color="primary" onClick={() => setIsEditingWeightsAfterSubmission(true)} sx={{ fontWeight: 'bold' }}>Edit Weights</Button>
                                        ) : (
                                            <>
                                                <Button variant="outlined" color="inherit" onClick={() => setIsEditingWeightsAfterSubmission(false)} sx={{ fontWeight: 'bold', bgcolor: 'white' }}>Cancel</Button>
                                                <Button variant="contained" color="success" onClick={() => setConfirmWeightsOpen(true)} sx={{ fontWeight: 'bold' }}>Save Weights</Button>
                                            </>
                                        )}
                                    </>
                                ) : !isEditMode ? (
                                    <>
                                        <Button variant="contained" color="secondary" onClick={() => setViewTargetsOpen(true)} startIcon={<VisibilityIcon />} sx={{ fontWeight: 'bold' }}>View Targets</Button>
                                        <Button variant="contained" color="primary" onClick={() => {
                                            setIsEditMode(true);
                                            const hasDraft = localStorage.getItem(`muster_draft_${tenantId}_${today}_${selectedDivision}`) === 'true';
                                            if (!hasDraft) {
                                                setDailyWeights((prev: any) => ({
                                                    ...prev,
                                                    [selectedDivision]: {}
                                                }));
                                            }
                                        }} sx={{ fontWeight: 'bold' }}>Edit Entry</Button>
                                        <Button variant="outlined" color="error" onClick={handleSubmit} sx={{ fontWeight: 'bold', borderWidth: 2, '&:hover': { borderWidth: 2 } }}>Submit</Button>
                                    </>
                                ) : (
                                    <>
                                        <Button variant="contained" color="secondary" onClick={() => setViewTargetsOpen(true)} startIcon={<VisibilityIcon />} sx={{ fontWeight: 'bold' }}>View Targets</Button>
                                        <Button variant="contained" color="error" onClick={() => setAddWorkerOpen(true)} startIcon={<PersonIcon />} sx={{ fontWeight: 'bold', color: 'white' }}>Assign Evening Worker</Button>
                                        <Button variant="outlined" color="inherit" onClick={handleCancelEdit} sx={{ fontWeight: 'bold', bgcolor: 'white' }}>Cancel</Button>
                                        <Button variant="contained" color="success" onClick={() => setConfirmSaveDraftOpen(true)} sx={{ fontWeight: 'bold' }}>Save</Button>
                                    </>
                                )}
                            </Box>
                        )}
                        <Button variant="contained" color="inherit" onClick={() => fetchInitialData()} sx={{ minWidth: 'auto' }}><RefreshIcon /></Button>
                    </Box>
                </Box>
            ) : (
                /* Mobile Toolbar: New optimized grid layout */
                <Box display="flex" flexDirection="column" gap={2} sx={{ pt: 2.5 }}>
                    {isSubmitted && (
                        <Box display="flex" justifyContent="center">
                            <Chip label="Read-Only Mode" color="info" sx={{ fontWeight: 'bold' }} />
                        </Box>
                    )}
                    <Box display="flex" gap={1}>
                        <Badge
                            badgeContent={pendingCount}
                            color="error"
                            invisible={pendingCount === 0}
                            sx={{
                                flex: 1,
                                '& .MuiBadge-badge': {
                                    right: 10,
                                    top: 5
                                }
                            }}
                        >
                            <FormControl size="small" sx={{ 
                                bgcolor: 'white', 
                                width: '100%',
                                borderRadius: 2,
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    '& fieldset': { borderColor: '#c8e6c9' },
                                    '&:hover fieldset': { borderColor: '#4caf50' },
                                    '&.Mui-focused fieldset': { borderColor: '#2e7d32' }
                                }
                            }}>
                                <InputLabel sx={{ color: '#2e7d32', fontWeight: 'bold' }}>Select Division</InputLabel>
                                <Select 
                                    value={selectedDivision} 
                                    label="Select Division" 
                                    onChange={(e) => {
                                        const newDiv = e.target.value;
                                        setSelectedDivision(newDiv);
                                        const hasDraft = localStorage.getItem(`muster_draft_${tenantId}_${today}_${newDiv}`) === 'true';
                                        if (!hasDraft && isEditMode) {
                                            setDailyWeights((prev: any) => ({
                                                ...prev,
                                                [newDiv]: {}
                                            }));
                                        }
                                    }}
                                    sx={{ fontWeight: 'bold', color: '#1b5e20' }}
                                >
                                    {divisions.map((d: any) => {
                                        const isPending = localStorage.getItem(`muster_submitted_${tenantId}_${today}_${d.divisionId}`) !== 'true';
                                        return (
                                            <MenuItem key={d.divisionId} value={d.divisionId} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                {d.name}
                                                {isPending && <Chip label="Pending" color="error" size="small" sx={{ height: 20, fontSize: '0.65rem', ml: 1 }} />}
                                            </MenuItem>
                                        );
                                    })}
                                </Select>
                            </FormControl>
                        </Badge>
                        <IconButton 
                            onClick={() => fetchInitialData()}
                            sx={{ border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#f5f5f5' }}
                        >
                            <RefreshIcon />
                        </IconButton>
                    </Box>

                    {attendanceData.length > 0 && selectedDivision && (
                        <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1}>
                            {isSubmitted ? (
                                <>
                                    <Button variant="contained" disabled sx={{ gridColumn: 'span 2', bgcolor: '#e0e0e0' }}>Finalized</Button>
                                    {isEditingWeightsAfterSubmission ? (
                                        <>
                                            <Button variant="outlined" color="inherit" onClick={() => setIsEditingWeightsAfterSubmission(false)}>Cancel</Button>
                                            <Button variant="contained" color="success" onClick={() => setConfirmWeightsOpen(true)}>Save</Button>
                                        </>
                                    ) : (
                                        <Button variant="outlined" color="primary" fullWidth onClick={() => setIsEditingWeightsAfterSubmission(true)} sx={{ gridColumn: 'span 2' }}>Edit Weights</Button>
                                    )}
                                </>
                            ) : !isEditMode ? (
                                <>
                                    <Button variant="contained" color="secondary" onClick={() => setViewTargetsOpen(true)} startIcon={<VisibilityIcon />} sx={{ gridColumn: 'span 2' }}>View Targets</Button>
                                    <Button variant="contained" color="primary" onClick={() => {
                                        setIsEditMode(true);
                                        const hasDraft = localStorage.getItem(`muster_draft_${tenantId}_${today}_${selectedDivision}`) === 'true';
                                        if (!hasDraft) {
                                            setDailyWeights((prev: any) => ({
                                                ...prev,
                                                [selectedDivision]: {}
                                            }));
                                        }
                                    }}>Edit Entry</Button>
                                    <Button variant="outlined" color="error" onClick={handleSubmit} sx={{ fontWeight: 'bold' }}>Submit</Button>
                                </>
                            ) : (
                                <>
                                    <Button variant="contained" color="secondary" onClick={() => setViewTargetsOpen(true)} startIcon={<VisibilityIcon />} sx={{ py: 1.2, borderRadius: 2, fontWeight: 'bold' }}>Targets</Button>
                                    <Button variant="contained" color="error" onClick={() => setAddWorkerOpen(true)} startIcon={<PersonIcon />} sx={{ py: 1.2, borderRadius: 2, fontWeight: 'bold', color: 'white' }}>Assign Evening Worker</Button>
                                    <Button variant="outlined" color="inherit" onClick={handleCancelEdit} sx={{ py: 1.2, borderRadius: 2, fontWeight: 'bold' }}>Cancel</Button>
                                    <Button variant="contained" color="success" onClick={() => setConfirmSaveDraftOpen(true)} sx={{ py: 1.2, borderRadius: 2, fontWeight: 'bold' }}>Save</Button>
                                </>
                            )}
                        </Box>
                    )}
                </Box>
            )}
        </Box>



            <Box display="flex" flexDirection="column" gap={3}>

                {/* Main Content Area */}
                <Box flex={1} minWidth={0}>
                    {attendanceData.length === 0 ? (
                        <Alert severity="info" sx={{ fontSize: '1.1rem', py: 2 }}>No Morning Muster Approved for Today. Cannot verify Attendance.</Alert>
                    ) : (
                        <Box display="flex" flexDirection={{ xs: 'column', lg: 'row' }} gap={{ xs: 2.5, lg: 3 }}>
                            {/* Left Column: Muster Chit + Submit */}
                            <Box flex={0.8} sx={{ width: '100%', minWidth: 250, maxWidth: { lg: 350 }, display: 'flex', flexDirection: 'column', gap: 2.5 }}>


                                {/* Muster Chit */}
                                <Paper elevation={3} sx={{ overflow: 'hidden', borderRadius: 2 }}>
                                    <Box bgcolor="#e0e0e0" p={1} borderBottom="1px solid #ccc">
                                        <Typography variant="h6" align="center" fontWeight="bold">Muster Chit</Typography>
                                    </Box>
                                    <TableContainer sx={{ 
                                        maxHeight: { xs: 600, lg: 'none' }, 
                                        overflowX: { xs: 'auto', lg: 'hidden' } // Disable scroll on desktop
                                    }}>
                                        <Table size="small" stickyHeader sx={{
                                            minWidth: { xs: 320, lg: '100%' },
                                            tableLayout: { lg: 'fixed' }, // Force fixed layout on desktop
                                            '& .MuiTableCell-root': { py: 0.5, px: 0.8, fontSize: { xs: '0.85rem', sm: '0.75rem' } }
                                        }}>
                                            <TableHead sx={{ bgcolor: '#f5f7f7' }}>
                                                <TableRow>
                                                    <TableCell 
                                                        rowSpan={2} 
                                                        sx={{ fontWeight: 'bold', width: { lg: '35%' } }}
                                                    >Task</TableCell>
                                                    <TableCell 
                                                        rowSpan={2} 
                                                        sx={{ fontWeight: 'bold', width: { lg: '35%' } }}
                                                    >Field</TableCell>
                                                    <TableCell align="center" colSpan={2} sx={{ fontWeight: 'bold' }}>Workers</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell align="center" sx={{ fontWeight: 'bold', borderLeft: '1px solid #e0e0e0', width: { lg: '15%' } }}>AM SESSION</TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 'bold', borderLeft: '1px solid #e0e0e0', width: { lg: '15%' } }}>PM SESSION</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {/* Tea Section */}
                                                {Object.entries(categorizedSummary.Tea).map(([task, data]: any) => (
                                                    <Fragment key={task}>
                                                        {Object.entries(data.fields).map(([field, counts]: any, idx) => (
                                                            <TableRow key={`${task}-${field}`}>
                                                                {idx === 0 && (
                                                                    <TableCell rowSpan={Object.keys(data.fields).length} sx={{ verticalAlign: 'top', fontWeight: 'bold' }}>{task}</TableCell>
                                                                )}
                                                                <TableCell>{field}</TableCell>
                                                                <TableCell align="center">{counts.countMorning}</TableCell>
                                                                <TableCell align="center">{counts.countEvening}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {task === 'Plucking' && (
                                                            <TableRow sx={{ bgcolor: '#a5d6a7' }}>
                                                                <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>Total Pluckers</TableCell>
                                                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>{data.countMorning}</TableCell>
                                                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>{data.countEvening}</TableCell>
                                                            </TableRow>
                                                        )}
                                                    </Fragment>
                                                ))}
                                                {Object.keys(categorizedSummary.Tea).length > 0 && (
                                                    <TableRow sx={{ bgcolor: '#81c784', borderTop: '2px solid #2e7d32' }}>
                                                        <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>Total Tea</TableCell>
                                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>{Object.values(categorizedSummary.Tea).reduce((acc: number, curr: any) => acc + curr.countMorning, 0)}</TableCell>
                                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>{Object.values(categorizedSummary.Tea).reduce((acc: number, curr: any) => acc + curr.countEvening, 0)}</TableCell>
                                                    </TableRow>
                                                )}

                                                {/* Rubber Section */}
                                                {Object.entries(categorizedSummary.Rubber).map(([task, data]: any) => (
                                                    <Fragment key={task}>
                                                        {Object.entries(data.fields).map(([field, counts]: any, idx) => (
                                                            <TableRow key={`${task}-${field}`}>
                                                                {idx === 0 && (
                                                                    <TableCell rowSpan={Object.keys(data.fields).length} sx={{ verticalAlign: 'top', fontWeight: 'bold' }}>{task}</TableCell>
                                                                )}
                                                                <TableCell>{field}</TableCell>
                                                                <TableCell align="center">{counts.countMorning}</TableCell>
                                                                <TableCell align="center">{counts.countEvening}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {task === 'Tapping' && (
                                                            <TableRow sx={{ bgcolor: '#a5d6a7' }}>
                                                                <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>Total Tappers</TableCell>
                                                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>{data.countMorning}</TableCell>
                                                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>{data.countEvening}</TableCell>
                                                            </TableRow>
                                                        )}
                                                    </Fragment>
                                                ))}
                                                {Object.keys(categorizedSummary.Rubber).length > 0 && (
                                                    <TableRow sx={{ bgcolor: '#81c784', borderTop: '2px solid #2e7d32' }}>
                                                        <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>Total Rubber</TableCell>
                                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>{Object.values(categorizedSummary.Rubber).reduce((acc: number, curr: any) => acc + curr.countMorning, 0)}</TableCell>
                                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>{Object.values(categorizedSummary.Rubber).reduce((acc: number, curr: any) => acc + curr.countEvening, 0)}</TableCell>
                                                    </TableRow>
                                                )}

                                                {/* General Section */}
                                                {Object.entries(categorizedSummary.General).map(([task, data]: any) => (
                                                    <Fragment key={task}>
                                                        {Object.entries(data.fields).map(([field, counts]: any, idx) => (
                                                            <TableRow key={`${task}-${field}`}>
                                                                {idx === 0 && (
                                                                    <TableCell rowSpan={Object.keys(data.fields).length} sx={{ verticalAlign: 'top', fontWeight: 'bold' }}>{task}</TableCell>
                                                                )}
                                                                <TableCell>{field}</TableCell>
                                                                <TableCell align="center">{counts.countMorning}</TableCell>
                                                                <TableCell align="center">{counts.countEvening}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </Fragment>
                                                ))}
                                                {Object.keys(categorizedSummary.General).length > 0 && (
                                                    <TableRow sx={{ bgcolor: '#81c784', borderTop: '2px solid #2e7d32' }}>
                                                        <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>Total General</TableCell>
                                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>{Object.values(categorizedSummary.General).reduce((acc: number, curr: any) => acc + curr.countMorning, 0)}</TableCell>
                                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>{Object.values(categorizedSummary.General).reduce((acc: number, curr: any) => acc + curr.countEvening, 0)}</TableCell>
                                                    </TableRow>
                                                )}

                                                <TableRow sx={{ bgcolor: '#dcdcdc', borderTop: '3px double #000' }}>
                                                    <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>Total Workers</TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>{grandMorningTotal}</TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>{grandEveningTotal}</TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Paper>

                                {/* Manager Remarks Section */}
                                {dailyWorks.filter(dw => dw.workDate === today && dw.divisionId === selectedDivision && dw.remarks && dw.remarks.trim() !== '').map((dw, i) => (
                                    <Alert
                                        key={i}
                                        severity={dw.status === 'REJECTED' ? 'error' : 'info'}
                                        sx={{ borderRadius: 2 }}
                                    >
                                        <Typography variant="subtitle2" fontWeight="bold">
                                            Manager Remarks {dw.status === 'REJECTED' ? '(Rejected)' : ''}:
                                        </Typography>
                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{dw.remarks}</Typography>
                                    </Alert>
                                ))}
                            </Box>

                            {/* Detailed List */}
                            <Box flex={3} sx={{
                                opacity: (isSubmitted && !isEditingWeightsAfterSubmission) || (!isSubmitted && !isEditMode) ? 0.6 : 1,
                                filter: (isSubmitted && !isEditingWeightsAfterSubmission) || (!isSubmitted && !isEditMode) ? 'grayscale(40%)' : 'none',
                                pointerEvents: (isSubmitted && !isEditingWeightsAfterSubmission) || (!isSubmitted && !isEditMode) ? 'none' : 'auto',
                                transition: 'all 0.3s ease-in-out'
                            }}>
                                {/* Weight Entries Section */}
                                {uniqueFieldsForWeights.length > 0 && (
                                    <Paper elevation={0} variant="outlined" sx={{ mb: 3, p: 2, borderRadius: 2, borderColor: '#a5d6a7', bgcolor: '#f1f8e9' }}>
                                        <Typography variant="subtitle2" fontWeight="bold" color="#1b5e20" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <EditStartIcon fontSize="small" /> Bulk Weights Entry
                                        </Typography>
                                        <Grid container spacing={2} sx={{ mt: 0.5 }}>
                                            {uniqueFieldsForWeights.map(field => (
                                                <Grid size={{ xs: 12, sm: 4 }} key={field}>
                                                    <TextField
                                                        fullWidth
                                                        label={`Field Wt. (${field})`}
                                                        value={dailyWeights[selectedDivision]?.[field]?.fieldWt || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setDailyWeights((prev: any) => ({
                                                                ...prev,
                                                                [selectedDivision]: {
                                                                    ...(prev[selectedDivision] || {}),
                                                                    [field]: { ...(prev[selectedDivision]?.[field] || {}), fieldWt: val }
                                                                }
                                                            }));
                                                        }}
                                                        size="small"
                                                        type="number"
                                                        disabled={(isSubmitted && !isEditingWeightsAfterSubmission) || (!isSubmitted && !isEditMode)}
                                                        sx={{ bgcolor: 'white', minWidth: { sm: 170 }, boxShadow: '0px 2px 4px rgba(0,0,0,0.05)' }}
                                                        InputProps={{ endAdornment: <InputAdornment position="end" sx={{ '& .MuiTypography-root': { fontWeight: 'bold' } }}>kg</InputAdornment>, sx: { fontSize: '1rem', fontWeight: 'bold', color: '#333' } }}
                                                        InputLabelProps={{ shrink: true, sx: { fontSize: '0.85rem', fontWeight: 'bold', color: '#2e7d32' } }}
                                                    />
                                                </Grid>
                                            ))}

                                            <Grid size={{ xs: 12, sm: 'auto' }} sx={{ ml: { sm: 'auto' } }}>
                                                <Box sx={{ p: 1, bgcolor: '#e3f2fd', borderRadius: 2, border: '1px solid #90caf9' }}>
                                                    <TextField
                                                        fullWidth
                                                        label="Factory Weight (Total)"
                                                        value={dailyWeights[selectedDivision]?.['__FACTORY__']?.factoryWt || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setDailyWeights((prev: any) => ({
                                                                ...prev,
                                                                [selectedDivision]: {
                                                                    ...(prev[selectedDivision] || {}),
                                                                    '__FACTORY__': { factoryWt: val }
                                                                }
                                                            }));
                                                        }}
                                                        size="small"
                                                        type="number"
                                                        disabled={(isSubmitted && !isEditingWeightsAfterSubmission) || (!isSubmitted && !isEditMode)}
                                                        sx={{ bgcolor: 'white', minWidth: { sm: 200 } }}
                                                        InputProps={{ endAdornment: <InputAdornment position="end" sx={{ '& .MuiTypography-root': { fontWeight: 'bold', color: '#1565c0' } }}>kg</InputAdornment>, sx: { fontSize: '1rem', fontWeight: 'bold', color: '#1565c0' } }}
                                                        InputLabelProps={{ shrink: true, sx: { fontSize: '0.9rem', fontWeight: 'bold', color: '#1976d2' } }}
                                                    />
                                                </Box>
                                            </Grid>
                                        </Grid>
                                    </Paper>
                                )}

                                {Object.entries(grouped).map(([task, items]: any) => (
                                    <TaskSection key={task} task={task} items={items} onUpdate={handleUpdate} isSubmitted={isSubmitted || !isEditMode} isFinalized={isSubmitted} fields={fields} taskTypes={taskTypes || []} workerLastTaskMap={workerLastTaskMap} onRemove={handleRemoveWorker} />
                                ))}
                            </Box>
                        </Box>
                    )}
                </Box>
            </Box>

            {/* Confirm Save Weights Dialog */}
            <Dialog open={confirmWeightsOpen} onClose={() => setConfirmWeightsOpen(false)} PaperProps={{ sx: { borderRadius: 3, p: 2 } }}>
                <DialogTitle sx={{ color: '#2e7d32', fontWeight: 'bold' }}>Save Weight Updates?</DialogTitle>
                <DialogContent>
                    <Typography>Are you sure you want to save the updated Field and Factory weights? This will be recorded against the finalized muster.</Typography>
                </DialogContent>
                <DialogActions sx={{ mt: 2 }}>
                    <Button onClick={() => setConfirmWeightsOpen(false)} color="inherit" sx={{ fontWeight: 'bold' }}>Cancel</Button>
                    <Button onClick={async () => {
                        setIsEditingWeightsAfterSubmission(false);
                        setConfirmWeightsOpen(false);

                        // Save weights directly to the database for ALL DailyWork records for this division
                        const allWorkIdsForDiv = dailyWorks
                            .filter((dw: any) => String(dw.divisionId) === String(selectedDivision))
                            .map((dw: any) => dw.workId || dw.id);

                        if (allWorkIdsForDiv.length > 0) {
                            try {
                                await Promise.all(allWorkIdsForDiv.map(workId => 
                                    axios.put(`/api/operations/daily-work/${workId}/weights`, {
                                        bulkWeights: JSON.stringify(dailyWeights[selectedDivision] || {}),
                                        isSubmission: false
                                    })
                                ));
                                setNotification({ open: true, message: 'Weights updated successfully!', severity: 'success' });
                            } catch (error) {
                                console.error("Failed to update weights", error);
                                setNotification({ open: true, message: 'Failed to save weights to the database.', severity: 'error' });
                            }
                        } else {
                            setNotification({ open: true, message: 'Could not resolve DailyWork ID to save weights.', severity: 'error' });
                        }
                    }} color="success" variant="contained" sx={{ fontWeight: 'bold' }}>Confirm & Save</Button>
                </DialogActions>
            </Dialog>

            {/* Add Evening Worker Dialog */}
            <Dialog open={addWorkerOpen} onClose={() => { setAddWorkerOpen(false); setPendingEveningWorkers([]); }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ color: '#2e7d32', fontWeight: 'bold' }}>Assign Evening Worker</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
                        <InputLabel>Task Type</InputLabel>
                        <Select
                            value={addWorkerTask}
                            label="Task Type"
                            onChange={(e) => setAddWorkerTask(e.target.value)}
                        >
                            {availableTasks.length > 0 ? availableTasks.map((t: string) => (
                                <MenuItem key={t} value={t}>{t}</MenuItem>
                            )) : (
                                ['Plucking', 'Sundry', 'Other'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)
                            )}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
                        <InputLabel>Field Name</InputLabel>
                        <Select
                            value={addWorkerField}
                            label="Field Name"
                            onChange={(e) => setAddWorkerField(e.target.value)}
                        >
                            {fields.filter((f: any) => f.divisionId === selectedDivision).map((f: any) => (
                                <MenuItem key={f.name} value={f.name}>{f.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Autocomplete
                        id="evening-worker-select"
                        options={allWorkers.filter((w: any) => {
                            if (w.status !== 'ACTIVE') return false;
                            if (w.employmentType === 'CONTRACT') return w.registeredDate === today;
                            if (w.employmentType === 'CONTRACT_MEMBER') return false;
                            return true;
                        }).sort((a: any, b: any) => {
                            const typeOrders: Record<string, number> = { 'PERMANENT': 1, 'CASUAL': 2, 'CONTRACT': 3, 'CONTRACT_MEMBER': 3 };
                            const orderA = typeOrders[a.employmentType || ''] || 4;
                            const orderB = typeOrders[b.employmentType || ''] || 4;
                            if (orderA !== orderB) return orderA - orderB;
                            return a.name.localeCompare(b.name);
                        })}
                        groupBy={(option: any) => {
                            if (option.employmentType === 'PERMANENT') return '— PERMANENT —';
                            if (option.employmentType === 'CASUAL') return '— CASUAL —';
                            if (option.employmentType === 'CONTRACT' || option.employmentType === 'CONTRACT_MEMBER') return '— CONTRACT —';
                            return '— OTHER —';
                        }}
                        multiple
                        disableCloseOnSelect
                        getOptionLabel={(option: any) => option.name}
                        isOptionEqualToValue={(option: any, value: any) => option.id === value?.id}
                        value={pendingEveningWorkers}
                        onChange={(_event, newValue: any[]) => {
                            setPendingEveningWorkers(newValue);
                        }}
                        getOptionDisabled={(option: any) => {
                            const wId = option.workerId || option.id;
                            // Get all records for this worker in this division
                            const workerRecords = attendanceData.filter(a =>
                                (a.workerId === wId) && a.divisionId === selectedDivision
                            );
                            if (workerRecords.length === 0) return false; // Not assigned at all - available

                            // If ALL their records are MORNING_SESSION, they can still be added for evening
                            const allMorningOnly = workerRecords.every(a => a.session === 'MORNING_SESSION');
                            return !allMorningOnly; // Block if FULL_DAY or EVENING_SESSION
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Assign Worker"
                                placeholder="Search by name or role"
                                margin="dense"
                            />
                        )}
                        renderOption={(props, option: any) => {
                            let color = "#757575";

                            const wId = option.workerId || option.id;

                            // Mark as assigned only if FULL_DAY or EVENING_SESSION (not morning-only)
                            const workerRecords = attendanceData.filter(a =>
                                (a.workerId === wId) && a.divisionId === selectedDivision
                            );
                            const allMorningOnly = workerRecords.length > 0 && workerRecords.every(a => a.session === 'MORNING_SESSION');
                            const isAssigned = workerRecords.length > 0 && !allMorningOnly;

                            if (option.employmentType === 'PERMANENT') color = "#2e7d32";
                            else if (option.employmentType === 'CASUAL') color = "#0288d1";
                            else if (option.employmentType === 'CONTRACT' || option.employmentType === 'CONTRACT_MEMBER') color = "#9c27b0";

                            const { key, ...optionProps } = props as any;

                            return (
                                <li key={key || option.id} {...optionProps} style={{ color, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px' }}>
                                    <Checkbox checked={isAssigned} size="small" sx={{ p: 0 }} disabled />
                                    <span>{option.name} {isAssigned ? '(Assigned)' : allMorningOnly ? '(Morning only)' : ''}</span>
                                </li>
                            );
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
                    <Button onClick={() => { setAddWorkerOpen(false); setPendingEveningWorkers([]); setAddWorkerTask(''); setAddWorkerField(''); }} color="inherit">Cancel</Button>
                    <Button
                        variant="contained"
                        color="success"
                        disabled={pendingEveningWorkers.length === 0 || !addWorkerTask || !addWorkerField}
                        onClick={() => {
                            if (!addWorkerTask || !addWorkerField) {
                                setNotification({ open: true, message: 'Please select both Task and Field first', severity: 'error' });
                                return;
                            }
                            const itemsForDiv = attendanceData.filter(item => item.divisionId === selectedDivision && item.dailyWorkId && item.dailyWorkId !== '00000000-0000-0000-0000-000000000000');
                            const defaultDailyWorkId = itemsForDiv.length > 0 ? itemsForDiv[0].dailyWorkId : '00000000-0000-0000-0000-000000000000';
                            
                            // Dedup guard: skip workers already present with EVENING_SESSION (handles background polling race conditions)
                            const workersToAdd = pendingEveningWorkers.filter(worker => {
                                const wId = worker.workerId || worker.id;
                                return !attendanceData.some(a =>
                                    a.workerId === wId &&
                                    a.divisionId === selectedDivision &&
                                    (a.session === 'EVENING_SESSION' || a.session === 'FULL_DAY')
                                );
                            });
                            
                            if (workersToAdd.length === 0) {
                                setNotification({ open: true, message: 'All selected workers are already assigned for this evening.', severity: 'warning' });
                                setAddWorkerOpen(false);
                                setPendingEveningWorkers([]);
                                setAddWorkerTask('');
                                setAddWorkerField('');
                                return;
                            }
                            
                            const newRecords: AttendanceRecord[] = workersToAdd.map((worker, i) => ({
                                id: `temp-${Date.now()}-${i}`,
                                workerId: worker.workerId || worker.id,
                                workerName: worker.name,
                                workerType: worker.employmentType || 'PERMANENT',
                                workType: addWorkerTask,
                                fieldName: addWorkerField,
                                status: '',
                                session: 'EVENING_SESSION',
                                divisionId: selectedDivision,
                                workDate: today,
                                tenantId: tenantId,
                                dailyWorkId: defaultDailyWorkId
                            }));
                            setAttendanceData(prev => [...prev, ...newRecords]);
                            setAddWorkerOpen(false);
                            setPendingEveningWorkers([]);
                            setAddWorkerTask('');
                            setAddWorkerField('');
                        }}
                    >
                        Assign {pendingEveningWorkers.length > 0 ? `(${pendingEveningWorkers.length})` : ''} Workers
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar open={notification.open} autoHideDuration={4000} onClose={() => setNotification({ ...notification, open: false })}>
                <Alert severity={notification.severity}>{notification.message}</Alert>
            </Snackbar>

            {/* Confirmation Dialog - Plantation Vibe */}
            <Dialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        bgcolor: '#f1f8e9', // Lighter green bg
                        width: '100%',
                        maxWidth: 350,
                        border: '2px solid #4caf50'
                    }
                }}
            >
                <DialogTitle sx={{ color: '#2e7d32', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckIcon sx={{ color: '#4caf50' }} /> Confirm Submission
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" color="text.secondary">
                        Are you sure you want to finalize the Evening Muster and Harvest data? This action will save all entries.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button
                        onClick={() => setConfirmOpen(false)}
                        variant="outlined" color="inherit"
                        sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#757575', color: '#757575' }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmSubmit}
                        variant="contained"
                        autoFocus
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            bgcolor: '#2e7d32',
                            '&:hover': { bgcolor: '#1b5e20' }
                        }}>
                        Yes, Submit Data
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Save Draft Dialog */}
            <Dialog
                open={confirmSaveDraftOpen}
                onClose={() => setConfirmSaveDraftOpen(false)}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        bgcolor: '#e8f5e9', // Lighter green bg
                        width: '100%',
                        maxWidth: 350,
                        border: '2px solid #66bb6a'
                    }
                }}
            >
                <DialogTitle sx={{ color: '#2e7d32', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckIcon sx={{ color: '#66bb6a' }} /> Save Work Progress
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" color="text.secondary">
                        Save current entries? You can continue editing later before final submission.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={() => setConfirmSaveDraftOpen(false)} variant="outlined" color="inherit">Cancel</Button>
                    <Button onClick={handleSaveDraft} variant="contained" color="success">Save</Button>
                </DialogActions>
            </Dialog>

            {/* View Targets Dialog */}
            <Dialog
                open={viewTargetsOpen}
                onClose={() => setViewTargetsOpen(false)}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        bgcolor: '#e8f5e9',
                        width: '100%',
                        maxWidth: 350,
                        border: '2px solid #66bb6a'
                    }
                }}
            >
                <DialogTitle sx={{ color: '#2e7d32', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #c5e1a5', pb: 2 }}>
                    <VisibilityIcon sx={{ color: '#66bb6a' }} /> Active Targets / Norms
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    {norms.length === 0 ? (
                        <Box p={3} textAlign="center">
                            <Typography variant="body2" color="text.secondary">No active targets found.</Typography>
                        </Box>
                    ) : (
                        <Box>
                            {norms.map((n: any, index: number) => (
                                <Box key={n.id} display="flex" justifyContent="space-between" alignItems="center" px={3} py={2} sx={{
                                    borderBottom: index < norms.length - 1 ? '1px solid #c5e1a5' : 'none',
                                    '&:hover': { bgcolor: '#f1f8e9' }
                                }}>
                                    <Typography variant="body1" fontWeight="bold" color="text.secondary">{n.jobRole}</Typography>
                                    <Chip label={`${n.targetValue} ${n.unit}`} color="success" size="small" variant="outlined" sx={{ fontWeight: 'bold', bgcolor: 'white' }} />
                                </Box>
                            ))}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #c5e1a5' }}>
                    <Button onClick={() => setViewTargetsOpen(false)} variant="contained" color="inherit" fullWidth sx={{ fontWeight: 'bold', color: '#2e7d32', bgcolor: '#c8e6c9', '&:hover': { bgcolor: '#a5d6a7' } }}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

function TaskSection({ task, items, onUpdate, isSubmitted, hideOutput = false, fields, taskTypes, isFinalized = false, workerLastTaskMap = {}, onRemove }: { task: string, items: any[], onUpdate: any, isSubmitted: boolean, hideOutput?: boolean, fields: any[], taskTypes: any[], isFinalized?: boolean, workerLastTaskMap?: Record<string, string>, onRemove?: (id: string) => void }) {
    const [statusConfirm, setStatusConfirm] = useState<{ itemId: string, newStatus: string, workerName: string, label: string } | null>(null);
    const isMobile = useMediaQuery('(max-width:600px)');

    // Task Configuration Logic
    const getTaskConfig = (taskName: string) => {
        const lower = taskName.toLowerCase();

        // 1. Check database task types first
        const dbTask = (taskTypes || []).find(t => t.name.toLowerCase() === lower);
        if (dbTask && dbTask.expectedUnit) {
            const unit = dbTask.expectedUnit;
            if (unit.toLowerCase() === 'none' || unit === '') return { label: 'Attendance', unit: '', type: 'none' };

            // Try to infer a friendly label based on the unit or name
            let label = 'Amount';
            if (unit.toLowerCase() === 'kg') label = lower.includes('pluck') ? 'Green Leaf' : 'Weight';
            if (unit.toLowerCase() === 'l' || unit.toLowerCase() === 'liters') label = lower.includes('tap') ? 'Latex' : 'Volume';
            if (unit.toLowerCase() === 'acres' || unit.toLowerCase() === 'ha') label = 'Area';
            if (unit.toLowerCase() === 'count' || unit.toLowerCase() === 'taps' || unit.toLowerCase() === 'bushes') label = 'Count';

            return { label, unit: unit, type: 'input' };
        }

        // 2. Fallback to hardcoded logic if not in DB yet
        const firstItem = items[0];
        const fieldName = firstItem?.fieldName;
        const field = fields?.find((f: any) => f.name === fieldName);
        const cropType = (field?.cropType || 'General');
        const cropLower = String(cropType).toLowerCase();

        if (lower.includes('pluck') || (lower.includes('harvest') && cropLower === 'tea')) return { label: 'Green Leaf', unit: 'kg', type: 'input' };
        if (lower.includes('tap') || (lower.includes('harvest') && cropLower === 'rubber')) return { label: 'Latex', unit: 'L', type: 'input' };

        if (lower.includes('pluck')) return { label: 'Green Leaf', unit: 'kg', type: 'input' };
        if (lower.includes('tap')) return { label: 'Latex', unit: 'L', type: 'input' };

        if (lower.includes('sack')) return { label: 'Sacks', unit: 'Count', type: 'input' };
        if (lower.includes('transport')) return { label: 'Weight', unit: 'kg', type: 'input' };
        if (lower.includes('fertilizer')) return { label: 'Area', unit: 'Ha', type: 'input' };
        if (lower.includes('chemical') || lower.includes('manual') || lower.includes('weeding')) return { label: 'Area', unit: 'Acres', type: 'input' };

        if (lower.includes('pruning') || lower.includes('prun')) {
            if (cropLower === 'tea') return { label: 'Bushes', unit: 'Count', type: 'input' };
            if (cropLower === 'rubber') return { label: 'Trees', unit: 'Count', type: 'input' };
            return { label: 'Plants', unit: 'Count', type: 'input' };
        }

        // Attendance Only roles
        if (lower.includes('kangani') || lower.includes('watch') || lower.includes('sundry') || lower.includes('other')) return { label: 'Attendance', unit: '', type: 'none' };

        return { label: 'Amount', unit: 'Task', type: 'input' };
    };

    const taskConfig = getTaskConfig(task);
    const showInputs = !hideOutput && taskConfig.type === 'input';

    // Unique Fields for this task
    const uniqueFields = Array.from(new Set(items.map((i: any) => i.fieldName)));

    // Determine if we need to show Cash Kilos (if historical data exists OR if there's a contract worker)
    const hasCashKilos = items.some((i: any) => (i.cashKilos && Number(i.cashKilos) > 0) || i.workerType?.includes('CONTRACT'));

    // Common Input Style
    const inputStyle = {
        width: 68,
        padding: '4px',
        height: 36,
        border: '1px solid #ced4da',
        borderRadius: 4,
        textAlign: 'center' as const,
        fontSize: '0.9rem',
        fontWeight: 'bold',
        outline: 'none',
        transition: 'all 0.2s',
        color: '#495057',
        backgroundColor: '#fff',
        pointerEvents: isSubmitted ? 'none' as const : 'auto' as const,
    };

    return (
        <>
            <Paper elevation={0} variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', borderColor: '#e0e0e0' }}>
            {/* Task Header */}
            <Box bgcolor="#f9fbf9" borderBottom="1px solid #eaefe9" p={1.5} display="flex" alignItems="center" gap={2}>
                <Typography variant="subtitle1" fontWeight="bold" color="#2e7d32" sx={{ fontSize: '1rem' }}>{task}</Typography>
                <Chip label={taskConfig.label} size="small" variant="outlined" sx={{ fontWeight: 'bold', bgcolor: 'white' }} />
            </Box>

            {/* === READ-ONLY REVIEW LAYOUT — Mobile only: full names visible as cards === */}
            {/* Unified Layout for Desktop and Mobile (History & Actual) */}
            <Box sx={{ width: '100%', overflowX: 'auto' }}>
                        {/* Column Headers - Compact for Desktop */}
                        {showInputs && (
                            <Box display="flex" alignItems="center" px={1.5} py={1} bgcolor="#f5f7f7" borderBottom="1px solid #eaeeef" sx={{ gap: 0.5 }}>
                                <Box sx={{ flex: 1, minWidth: 200 }}>
                                    <Typography variant="caption" fontWeight="bold" color="#546e7a">WORKER</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Typography sx={{ width: 55, fontSize: '0.62rem', fontWeight: 'bold', color: '#546e7a', textAlign: 'center', lineHeight: 1 }}>AM</Typography>
                                    <Typography sx={{ width: 55, fontSize: '0.62rem', fontWeight: 'bold', color: '#546e7a', textAlign: 'center', lineHeight: 1 }}>PM</Typography>
                                    <Typography sx={{ width: 50, fontSize: '0.65rem', fontWeight: 'bold', color: '#546e7a', textAlign: 'center', lineHeight: 1 }}>TOTAL</Typography>
                                    <Typography sx={{ width: 55, fontSize: '0.58rem', fontWeight: 'bold', color: '#546e7a', textAlign: 'center', lineHeight: 1.1, whiteSpace: 'pre-line' }}>
                                        {(() => {
                                            const u = taskConfig.unit?.toLowerCase();
                                            if (u === 'kg') return 'OVER\nKILOS';
                                            if (u === 'acres' || u === 'acre') return 'OVER\nACRES';
                                            if (u === 'l' || u === 'liters') return 'OVER\nLITERS';
                                            if (u === 'ha' || u === 'hectares') return 'OVER\nHECTARES';
                                            return `OVER\n${u?.toUpperCase() || 'QTY'}`;
                                        })()}
                                    </Typography>
                                    {hasCashKilos && (
                                        <Typography sx={{ width: 55, fontSize: '0.58rem', fontWeight: 'bold', color: '#546e7a', textAlign: 'center', lineHeight: 1.1, whiteSpace: 'pre-line' }}>
                                            {(() => {
                                                const u = taskConfig.unit?.toLowerCase();
                                                if (u === 'kg') return 'CASH\nKILOS';
                                                if (u === 'acres' || u === 'acre') return 'CASH\nACRES';
                                                if (u === 'l' || u === 'liters') return 'CASH\nLITERS';
                                                if (u === 'ha' || u === 'hectares') return 'CASH\nHECTARES';
                                                return `CASH\n${u?.toUpperCase() || 'QTY'}`;
                                            })()}
                                        </Typography>
                                    )}
                                    <Typography sx={{ width: 45, fontSize: '0.6rem', fontWeight: 'bold', color: '#546e7a', textAlign: 'center', lineHeight: 1.1, whiteSpace: 'pre-line' }}>OT HOURS</Typography>
                                    <Typography sx={{ width: 85, fontSize: '0.65rem', fontWeight: 'bold', color: '#546e7a', textAlign: 'center', lineHeight: 1 }}>SESSION</Typography>
                                    <Box sx={{ width: 110 }} /> {/* Actions */}
                                </Box>
                            </Box>
                        )}

                        <Box p={1} display="flex" flexDirection="column" gap={0.5} sx={{ minWidth: 700 }}>
                            {items.map((item: any) => {
                                const isPieceRate = item.workerType?.includes('CONTRACT');
                                const total = (Number(item.amWeight) || 0) + (Number(item.pmWeight) || 0);

                                return (
                                    <Box key={item.id}
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="space-between"
                                        p={1}
                                        mb={0.5}
                                        borderRadius={2}
                                        sx={{
                                            bgcolor: '#ffffff',
                                            border: '1px solid #f0f0f0',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <Box display="flex" alignItems="center" gap={1.5} flex={1} minWidth={200}>
                                            <Avatar sx={{
                                                bgcolor: item.workerType === 'PERMANENT' ? '#2e7d32' : item.workerType === 'CASUAL' ? '#0288d1' : item.workerType?.includes('CONTRACT') ? '#9c27b0' : '#333',
                                                width: 36, height: 36
                                            }}><PersonIcon sx={{ fontSize: 20, color: 'white' }} /></Avatar>
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography variant="body2" fontWeight="bold" color="#333" sx={{ whiteSpace: 'nowrap', mb: 0.2 }}>{item.workerName}</Typography>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Chip
                                                        label={item.workerType?.includes('CONTRACT') ? 'CONTRACT' : item.workerType}
                                                        size="small"
                                                        sx={{ 
                                                            height: 16, 
                                                            fontSize: '0.6rem', 
                                                            fontWeight: 'bold',
                                                            bgcolor: item.workerType === 'PERMANENT' ? '#e8f5e9' : item.workerType === 'CASUAL' ? '#e1f5fe' : '#f3e5f5',
                                                            color: item.workerType === 'PERMANENT' ? '#2e7d32' : item.workerType === 'CASUAL' ? '#0288d1' : '#9c27b0',
                                                            border: '0.5px solid',
                                                            borderColor: 'inherit'
                                                        }}
                                                    />
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{item.fieldName}</Typography>
                                                </Box>
                                            </Box>
                                        </Box>

                                        {showInputs && (
                                            <Box display="flex" alignItems="center" sx={{ gap: 0.5 }}>
                                                <Box width={55} display="flex" justifyContent="center">
                                                    <input
                                                        type="number"
                                                        value={item.amWeight ?? ''}
                                                        onChange={(e) => onUpdate(item.id, 'amWeight', e.target.value)}
                                                        disabled={isSubmitted || item.status === 'ABSENT' || item.session === 'EVENING_SESSION'}
                                                        style={{ ...inputStyle, width: 48, opacity: item.session === 'EVENING_SESSION' ? 0.4 : 1, fontSize: '0.8rem' }}
                                                    />
                                                </Box>
                                                <Box width={55} display="flex" justifyContent="center">
                                                    <input
                                                        type="number"
                                                        style={{ ...inputStyle, width: 48, opacity: item.session === 'MORNING_SESSION' ? 0.4 : 1, fontSize: '0.8rem' }}
                                                        value={item.pmWeight ?? ''}
                                                        onChange={(e) => onUpdate(item.id, 'pmWeight', e.target.value)}
                                                        disabled={isSubmitted || item.status === 'ABSENT' || item.session === 'MORNING_SESSION'}
                                                    />
                                                </Box>
                                                <Box width={50} display="flex" justifyContent="center">
                                                    <Box bgcolor="#e8f5e9" color="#2e7d32" borderRadius={1.5} width={45} height={30} display="flex" alignItems="center" justifyContent="center" border="1px solid #a5d6a7">
                                                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{total.toFixed(taskConfig.unit === 'kg' || taskConfig.unit === 'Count' ? 0 : 1)}</Typography>
                                                    </Box>
                                                </Box>
                                                <Box width={55} display="flex" justifyContent="center">
                                                    <input
                                                        type="number"
                                                        style={{ ...inputStyle, width: 48, fontSize: '0.8rem' }}
                                                        value={isPieceRate ? '' : item.overKilos ?? ''}
                                                        onChange={(e) => onUpdate(item.id, 'overKilos', e.target.value)}
                                                        disabled={isSubmitted || item.status === 'ABSENT' || isPieceRate}
                                                    />
                                                </Box>
                                                {hasCashKilos && (
                                                    <Box width={55} display="flex" justifyContent="center">
                                                        <input
                                                            type="number"
                                                            value={isPieceRate ? item.cashKilos ?? '' : ''}
                                                            onChange={(e) => onUpdate(item.id, 'cashKilos', e.target.value)}
                                                            disabled={isSubmitted || item.status === 'ABSENT' || !isPieceRate}
                                                            style={{ ...inputStyle, width: 48, fontSize: '0.8rem' }}
                                                        />
                                                    </Box>
                                                )}
                                                <Box width={45} display="flex" justifyContent="center">
                                                    <input
                                                        type="number"
                                                        value={item.otHours ?? ''}
                                                        onChange={(e) => onUpdate(item.id, 'otHours', e.target.value)}
                                                        disabled={isSubmitted || item.status === 'ABSENT'}
                                                        style={{ ...inputStyle, width: 40, fontSize: '0.8rem' }}
                                                    />
                                                </Box>
                                                <Box width={85} display="flex" justifyContent="center">
                                                    <Select
                                                        value={item.session || 'FULL_DAY'}
                                                        onChange={(e) => onUpdate(item.id, 'session', e.target.value)}
                                                        size="small"
                                                        sx={{ height: 28, fontSize: '0.65rem', borderRadius: 1.5 }}
                                                        disabled={isSubmitted || item.status === 'ABSENT'}
                                                    >
                                                        <MenuItem value="FULL_DAY" sx={{ fontSize: '0.7rem' }}>Full</MenuItem>
                                                        <MenuItem value="MORNING_SESSION" sx={{ fontSize: '0.7rem' }}>AM</MenuItem>
                                                        <MenuItem value="EVENING_SESSION" sx={{ fontSize: '0.7rem' }}>PM</MenuItem>
                                                    </Select>
                                                </Box>
                                                <Box width={110} display="flex" justifyContent="flex-end" alignItems="center" gap={0.5}>
                                                    {!isSubmitted && onRemove && (item.session === 'EVENING_SESSION' || item.id.startsWith('temp-')) && (
                                                        <IconButton size="small" color="error" onClick={() => onRemove(item.id)} sx={{ p: 0.4, bgcolor: '#ffebee' }}>
                                                            <DeleteIcon sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                    )}
                                                    <Box display="flex" gap={0.4} bgcolor="#1565c0" p={0.4} borderRadius={1.5}>
                                                        {!isPieceRate && (
                                                            <IconButton 
                                                                onClick={() => setStatusConfirm({ itemId: item.id, newStatus: 'HALF_DAY', workerName: item.workerName, label: 'Half Day' })} 
                                                                size="small" 
                                                                disabled={isSubmitted} 
                                                                sx={{ 
                                                                    bgcolor: item.status === 'HALF_DAY' ? '#ffd600' : 'white', 
                                                                    p: 0.4, width: 24, height: 24,
                                                                    '&.Mui-disabled': {
                                                                        bgcolor: item.status === 'HALF_DAY' ? '#ffd600' : 'white',
                                                                        opacity: 1,
                                                                        color: 'rgba(0,0,0,0.7)'
                                                                    }
                                                                }}
                                                            >
                                                                <BlockIcon sx={{ fontSize: 14 }} />
                                                            </IconButton>
                                                        )}
                                                        {!isPieceRate && (
                                                            <IconButton 
                                                                onClick={() => setStatusConfirm({ itemId: item.id, newStatus: 'PRESENT', workerName: item.workerName, label: 'Present' })} 
                                                                size="small" 
                                                                disabled={isSubmitted} 
                                                                sx={{ 
                                                                    bgcolor: item.status === 'PRESENT' ? '#00e676' : 'white', 
                                                                    p: 0.4, width: 24, height: 24,
                                                                    '&.Mui-disabled': {
                                                                        bgcolor: item.status === 'PRESENT' ? '#00e676' : 'white',
                                                                        opacity: 1,
                                                                        color: 'rgba(0,0,0,0.7)'
                                                                    }
                                                                }}
                                                            >
                                                                <CheckIcon sx={{ fontSize: 14 }} />
                                                            </IconButton>
                                                        )}
                                                        <IconButton 
                                                            onClick={() => setStatusConfirm({ itemId: item.id, newStatus: item.status === 'ABSENT' ? 'PRESENT' : 'ABSENT', workerName: item.workerName, label: item.status === 'ABSENT' ? 'Undo Absent' : 'Absent' })} 
                                                            size="small" 
                                                            disabled={isSubmitted} 
                                                            sx={{ 
                                                                bgcolor: item.status === 'ABSENT' ? '#ff3d00' : 'white', 
                                                                p: 0.4, width: 24, height: 24,
                                                                '&.Mui-disabled': {
                                                                    bgcolor: item.status === 'ABSENT' ? '#ff3d00' : 'white',
                                                                    opacity: 1,
                                                                    color: item.status === 'ABSENT' ? 'white' : 'rgba(0,0,0,0.7)'
                                                                }
                                                            }}
                                                        >
                                                            <CloseIcon sx={{ fontSize: 14, color: item.status === 'ABSENT' ? 'white' : 'inherit' }} />
                                                        </IconButton>
                                                    </Box>
                                                </Box>
                                            </Box>
                                        )}
                                    </Box>
                                );
                            })}
                    </Box>
                </Box>
            </Paper>

            <Dialog open={!!statusConfirm} onClose={() => setStatusConfirm(null)} PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ color: '#d32f2f', fontWeight: 'bold', borderBottom: '1px solid #ffebee' }}>Confirm Status Change</DialogTitle>
                <DialogContent sx={{ mt: 2, minWidth: 300 }}>
                    <Typography variant="body1">
                        Are you sure you want to mark <strong>{statusConfirm?.workerName}</strong>'s attendance status as:
                    </Typography>
                    <Typography variant="h6" color="primary" fontWeight="bold" textAlign="center" mt={2} mb={1}>
                        {statusConfirm?.label}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setStatusConfirm(null)} color="inherit" variant="text">Cancel</Button>
                    <Button
                        onClick={() => {
                            if (statusConfirm) {
                                onUpdate(statusConfirm.itemId, 'status', statusConfirm.newStatus);
                                if (statusConfirm.newStatus === 'ABSENT') {
                                    onUpdate(statusConfirm.itemId, 'amWeight', '0');
                                    onUpdate(statusConfirm.itemId, 'pmWeight', '0');
                                    onUpdate(statusConfirm.itemId, 'overKilos', '0');
                                    onUpdate(statusConfirm.itemId, 'cashKilos', '0');
                                    onUpdate(statusConfirm.itemId, 'otHours', '0');
                                }
                                setStatusConfirm(null);
                            }
                        }}
                        color="primary"
                        variant="contained"
                        sx={{ fontWeight: 'bold', borderRadius: 2 }}
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

// --- Shared Component: Muster Chit Summary ---
const MusterChitSummary = ({ data = [], fields = [], label, includeAbsent = false, isMorningPlan = false }: any) => {
    // Categorization Logic for History (Handles AM / PM)
    const getSummary = () => {
        const categories: any = { Tea: {}, Rubber: {}, General: {} };
        if (!data || !Array.isArray(data)) return categories;

        data.forEach((m: any) => {
            const field = fields.find((f: any) => f.name === m.fieldName || f.fieldId === m.fieldId);
            const crop = field?.cropType || 'General';
            let catKey = 'General';
            if (crop === 'Tea') catKey = 'Tea';
            if (crop === 'Rubber') catKey = 'Rubber';

            if (!categories[catKey][m.workType]) categories[catKey][m.workType] = { countMorning: 0, countEvening: 0, fields: {} };

            // Morning Data
            categories[catKey][m.workType].countMorning++;
            if (!categories[catKey][m.workType].fields[m.fieldName]) {
                categories[catKey][m.workType].fields[m.fieldName] = { countMorning: 0, countEvening: 0 };
            }
            categories[catKey][m.workType].fields[m.fieldName].countMorning++;

            // Evening Data
            if (includeAbsent || m.status !== 'ABSENT') {
                categories[catKey][m.workType].countEvening++;
                categories[catKey][m.workType].fields[m.fieldName].countEvening++;
            }
        });
        return categories;
    };
    const summary = getSummary();
    const grandMorningTotal = (data || []).length;
    const grandEveningTotal = (data || []).filter((d: any) => includeAbsent || d.status !== 'ABSENT').length;

    return (
        <Paper elevation={3} sx={{ overflow: 'hidden', borderRadius: 2, mb: 2, maxWidth: 350, mx: 'auto' }}>
            <Box bgcolor="#e0e0e0" p={1} borderBottom="1px solid #ccc">
                <Typography variant="h6" align="center" fontWeight="bold">{label}</Typography>
            </Box>
            <Box>
                <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1, fontSize: '0.75rem' } }}>
                    <TableHead sx={{ bgcolor: '#f5f7f7' }}>
                        {isMorningPlan ? (
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Task</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Field</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Workers</TableCell>
                            </TableRow>
                        ) : (
                            <>
                                <TableRow>
                                    <TableCell rowSpan={2} sx={{ fontWeight: 'bold' }}>Task</TableCell>
                                    <TableCell rowSpan={2} sx={{ fontWeight: 'bold' }}>Field</TableCell>
                                    <TableCell align="center" colSpan={2} sx={{ fontWeight: 'bold' }}>Workers</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', borderLeft: '1px solid #e0e0e0' }}>AM SESSION</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', borderLeft: '1px solid #e0e0e0' }}>PM SESSION</TableCell>
                                </TableRow>
                            </>
                        )}
                    </TableHead>
                    <TableBody>
                        {/* Tea Section */}
                        {Object.entries(summary.Tea).map(([task, val]: any) => (
                            <Fragment key={task}>
                                {Object.entries(val.fields).map(([field, counts]: any, idx) => (
                                    <TableRow key={`${task}-${field}`}>
                                        {idx === 0 && (
                                            <TableCell rowSpan={Object.keys(val.fields).length} sx={{ verticalAlign: 'top', fontWeight: 'bold' }}>{task}</TableCell>
                                        )}
                                        <TableCell>{field}</TableCell>
                                        {isMorningPlan ? (
                                            <TableCell align="center">{counts.countMorning}</TableCell>
                                        ) : (
                                            <>
                                                <TableCell align="center">{counts.countMorning}</TableCell>
                                                <TableCell align="center">{counts.countEvening}</TableCell>
                                            </>
                                        )}
                                    </TableRow>
                                ))}
                                {task === 'Plucking' && (
                                    <TableRow sx={{ bgcolor: '#a5d6a7' }}>
                                        <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>Total Pluckers</TableCell>
                                        {isMorningPlan ? (
                                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>{val.countMorning}</TableCell>
                                        ) : (
                                            <>
                                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>{val.countMorning}</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>{val.countEvening}</TableCell>
                                            </>
                                        )}
                                    </TableRow>
                                )}
                            </Fragment>
                        ))}
                        {Object.keys(summary.Tea).length > 0 && (
                            <TableRow sx={{ bgcolor: '#81c784', borderTop: '2px solid #2e7d32' }}>
                                <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>Total Tea</TableCell>
                                {isMorningPlan ? (
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>{Object.values(summary.Tea).reduce((acc: number, curr: any) => acc + curr.countMorning, 0)}</TableCell>
                                ) : (
                                    <>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>{Object.values(summary.Tea).reduce((acc: number, curr: any) => acc + curr.countMorning, 0)}</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>{Object.values(summary.Tea).reduce((acc: number, curr: any) => acc + curr.countEvening, 0)}</TableCell>
                                    </>
                                )}
                            </TableRow>
                        )}

                        {/* Rubber Section */}
                        {Object.entries(summary.Rubber).map(([task, val]: any) => (
                            <Fragment key={task}>
                                {Object.entries(val.fields).map(([field, counts]: any, idx) => (
                                    <TableRow key={`${task}-${field}`}>
                                        {idx === 0 && (
                                            <TableCell rowSpan={Object.keys(val.fields).length} sx={{ verticalAlign: 'top', fontWeight: 'bold' }}>{task}</TableCell>
                                        )}
                                        <TableCell>{field}</TableCell>
                                        {isMorningPlan ? (
                                            <TableCell align="center">{counts.countMorning}</TableCell>
                                        ) : (
                                            <>
                                                <TableCell align="center">{counts.countMorning}</TableCell>
                                                <TableCell align="center">{counts.countEvening}</TableCell>
                                            </>
                                        )}
                                    </TableRow>
                                ))}
                                {task === 'Tapping' && (
                                    <TableRow sx={{ bgcolor: '#a5d6a7' }}>
                                        <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>Total Tappers</TableCell>
                                        {isMorningPlan ? (
                                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>{val.countMorning}</TableCell>
                                        ) : (
                                            <>
                                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>{val.countMorning}</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>{val.countEvening}</TableCell>
                                            </>
                                        )}
                                    </TableRow>
                                )}
                            </Fragment>
                        ))}
                        {Object.keys(summary.Rubber).length > 0 && (
                            <TableRow sx={{ bgcolor: '#81c784', borderTop: '2px solid #2e7d32' }}>
                                <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>Total Rubber</TableCell>
                                {isMorningPlan ? (
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>{Object.values(summary.Rubber).reduce((acc: number, curr: any) => acc + curr.countMorning, 0)}</TableCell>
                                ) : (
                                    <>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>{Object.values(summary.Rubber).reduce((acc: number, curr: any) => acc + curr.countMorning, 0)}</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>{Object.values(summary.Rubber).reduce((acc: number, curr: any) => acc + curr.countEvening, 0)}</TableCell>
                                    </>
                                )}
                            </TableRow>
                        )}

                        {/* General Section */}
                        {Object.entries(summary.General).map(([task, val]: any) => (
                            <Fragment key={task}>
                                {Object.entries(val.fields).map(([field, counts]: any, idx) => (
                                    <TableRow key={`${task}-${field}`}>
                                        {idx === 0 && (
                                            <TableCell rowSpan={Object.keys(val.fields).length} sx={{ verticalAlign: 'top', fontWeight: 'bold' }}>{task}</TableCell>
                                        )}
                                        <TableCell>{field}</TableCell>
                                        {isMorningPlan ? (
                                            <TableCell align="center">{counts.countMorning}</TableCell>
                                        ) : (
                                            <>
                                                <TableCell align="center">{counts.countMorning}</TableCell>
                                                <TableCell align="center">{counts.countEvening}</TableCell>
                                            </>
                                        )}
                                    </TableRow>
                                ))}
                            </Fragment>
                        ))}
                        {Object.keys(summary.General).length > 0 && (
                            <TableRow sx={{ bgcolor: '#81c784', borderTop: '2px solid #2e7d32' }}>
                                <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>Total General</TableCell>
                                {isMorningPlan ? (
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>{Object.values(summary.General).reduce((acc: number, curr: any) => acc + curr.countMorning, 0)}</TableCell>
                                ) : (
                                    <>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>{Object.values(summary.General).reduce((acc: number, curr: any) => acc + curr.countMorning, 0)}</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>{Object.values(summary.General).reduce((acc: number, curr: any) => acc + curr.countEvening, 0)}</TableCell>
                                    </>
                                )}
                            </TableRow>
                        )}

                        <TableRow sx={{ bgcolor: '#dcdcdc', borderTop: '3px double #000' }}>
                            <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>Total Workers</TableCell>
                            {isMorningPlan ? (
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>{grandMorningTotal}</TableCell>
                            ) : (
                                <>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>{grandMorningTotal}</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>{grandEveningTotal}</TableCell>
                                </>
                            )}
                        </TableRow>
                    </TableBody>
                </Table>
            </Box>
        </Paper>
    );
};

// --- Morning Plan Display (Uses Submitted JSON Snapshot) ---
function MorningPlanDisplay({ plans }: { plans: any[] }) {
    // Group by Task

    const groupedByTask = plans.reduce((acc: any, plan: any) => {
        if (!acc[plan.task]) acc[plan.task] = [];
        acc[plan.task].push(plan);
        return acc;
    }, {});

    return (
        <Box>
            {Object.entries(groupedByTask).map(([task, fieldPlans]: any) => (
                <Paper key={task} elevation={0} variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', borderColor: '#e0e0e0' }}>
                    {/* Header - Matches TaskSection Theme */}
                    <Box bgcolor="#f9fbf9" borderBottom="1px solid #eaefe9" p={1.5} display="flex" alignItems="center" gap={2} flexWrap="wrap">
                        <Typography variant="subtitle2" fontWeight="bold" color="#a2b5aa" sx={{ minWidth: 120, fontSize: '0.95rem' }}>{task}</Typography>
                    </Box>

                    {/* Column Header */}
                    <Box display="flex" alignItems="center" px={2} py={1} bgcolor="#f5f7f7" borderBottom="1px solid #eaeeef">
                        <Box flex={1} minWidth={0}>
                            <Typography variant="caption" fontWeight="bold" color="#b0babb">WORKER</Typography>
                        </Box>
                    </Box>

                    <Box p={1} display="flex" flexDirection="column" gap={0.5}>
                        {fieldPlans.map((plan: any) => (
                            plan.assigned && plan.assigned.map((w: any, index: number) => {
                                const workerType = w.type || w.employmentType || w.workerType || 'CASUAL';
                                return (
                                    <Box key={`${plan.field}-${w.id}-${index}`}
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="space-between"
                                        p={1}
                                        mb={0.5}
                                        borderRadius={2}
                                        sx={{
                                            bgcolor: '#ffffff',
                                            border: '1px solid #f0f0f0',
                                            '&:hover': { bgcolor: '#fafdfa', borderColor: '#eaefe9' },
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <Box display="flex" alignItems="center" gap={1.5} flex={1} minWidth={0}>
                                            <Avatar sx={{
                                                bgcolor: workerType === 'PERMANENT' ? '#2e7d32' : workerType === 'CASUAL' ? '#0288d1' : workerType?.includes('CONTRACT') ? '#9c27b0' : '#333',
                                                width: 36, height: 36
                                            }}><PersonIcon sx={{ fontSize: 20, color: 'white' }} /></Avatar>
                                            <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Typography variant="body2" fontWeight="bold" noWrap lineHeight={1.2} color="#333" sx={{ fontSize: '0.95rem' }}>{w.name}</Typography>
                                                    <Chip
                                                        label={workerType?.includes('CONTRACT') ? 'CONTRACT' : workerType}
                                                        size="small"
                                                        sx={{
                                                            height: 18,
                                                            fontSize: '0.65rem',
                                                            fontWeight: 'bold',
                                                            bgcolor: workerType === 'PERMANENT' ? '#e8f5e9' : workerType === 'CASUAL' ? '#e1f5fe' : '#f3e5f5',
                                                            color: workerType === 'PERMANENT' ? '#2e7d32' : workerType === 'CASUAL' ? '#0288d1' : workerType?.includes('CONTRACT') ? '#9c27b0' : '#333',
                                                            border: '1px solid',
                                                            borderColor: workerType === 'PERMANENT' ? '#a5d6a7' : workerType === 'CASUAL' ? '#81d4fa' : '#ce93d8',
                                                        }}
                                                    />
                                                </Box>
                                                <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ fontSize: '0.75rem', mt: 0.5 }}>{plan.field}</Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                )
                            })
                        ))}
                    </Box>
                </Paper>
            ))}
            {plans.length === 0 && (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4, fontStyle: 'italic' }}>
                    No Morning Plan Found
                </Typography>
            )}
        </Box>
    );
}

// --- Tab 2: History (Past Musters) ---
function HistoryTab() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId;
    const userRole = userSession.role;
    const [history, setHistory] = useState<any[]>([]);
    const [rawData, setRawData] = useState<any[]>([]);
    const [fields, setFields] = useState<any[]>([]);
    const [divisions, setDivisions] = useState<any[]>([]);
    const [taskTypes, setTaskTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    // Review Modal State
    const [reviewOpen, setReviewOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedRecords, setSelectedRecords] = useState<any[]>([]);
    const [morningPlan, setMorningPlan] = useState<any[]>([]);
    const [historicWeights, setHistoricWeights] = useState<any>({});
    const [historicDivision, setHistoricDivision] = useState<string>('');
    const [auditNote, setAuditNote] = useState<string>('');
    const [isSavingAudit, setIsSavingAudit] = useState(false);
    const [selectedMusterId, setSelectedMusterId] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true); // Ensure loading state is shown during manual refreshes via events
                // Fetch Metadata
                const [fRes, wRes, divRes, tRes] = await Promise.all([
                    axios.get(`/api/fields?tenantId=${tenantId}`),
                    axios.get(`/api/workers?tenantId=${tenantId}`),
                    axios.get(`/api/divisions?tenantId=${tenantId}`),
                    axios.get(`/api/operations/task-types?tenantId=${tenantId}`)
                ]);
                setFields(fRes.data);
                setDivisions(divRes.data);
                setTaskTypes(tRes.data);

                const divMap = new Map<string, string>();
                divRes.data.forEach((d: any) => divMap.set(d.divisionId, d.name));

                const wMap = new Map<string, any>();
                wRes.data.forEach((w: any) => {
                    if (w.workerId) wMap.set(w.workerId, w);
                    wMap.set(w.id, w);
                });

                // Fetch WORK History (The source of truth for Musters)
                const dwRes = await axios.get(`/api/operations/daily-work?tenantId=${tenantId}`);
                const morningMusters = dwRes.data.filter((dw: any) => dw.workType === 'Morning Muster');

                // Fetch Attendance
                const attRes = await axios.get(`/api/operations/attendance?tenantId=${tenantId}`);

                // Map Attendance to Divisions via DailyWork ID (or infer)
                // We build a helper map: DailyWorkID -> DivisionID
                const dwDivMap = new Map<string, string>();
                dwRes.data.forEach((dw: any) => {
                    const id = dw.workId || dw.id;
                    if (id) dwDivMap.set(String(id), String(dw.divisionId));
                });

                const enrichedAttendance = attRes.data.map((rec: any) => {
                    // Try to resolve division from dailyWork link or field
                    let divId = 'UNKNOWN';
                    if (rec.dailyWorkId) divId = dwDivMap.get(String(rec.dailyWorkId)) || 'UNKNOWN';
                    if (divId === 'UNKNOWN') {
                        // Fallback: try field mapping
                        const f = fRes.data.find((field: any) => field.name && rec.fieldName && String(field.name).trim().toLowerCase() === String(rec.fieldName).trim().toLowerCase());
                        if (f) divId = f.divisionId;
                    }

                    const mappedWorker = wMap.get(rec.workerId);
                    return {
                        ...rec,
                        workerName: mappedWorker?.name || rec.workerName || 'Unknown',
                        workerType: mappedWorker?.type || mappedWorker?.employmentType || mappedWorker?.workerType || 'CASUAL',
                        gender: mappedWorker?.gender || 'MALE',
                        divisionId: divId
                    };
                });

                setRawData(enrichedAttendance); // Global store of attendance

                // Construct History Rows from Morning Muster DailyWorks
                const historyRows = morningMusters.map((mm: any) => {
                    const date = mm.workDate;
                    const divId = mm.divisionId;

                    // Filter attendance for this specific muster (Date + Division)
                    const musterAtt = enrichedAttendance.filter((a: any) =>
                        String(a.workDate).split('T')[0] === String(date).split('T')[0] &&
                        String(a.divisionId) === String(divId)
                    );

                    let attended = 0;
                    let totalWeight = 0;
                    let latestUpdate: string | null = null;
                    let isEveningSubmitted = mm.bulkWeights != null && mm.bulkWeights !== "";

                    musterAtt.forEach((item: any) => {

                        if (item.status === 'PRESENT' || item.status === 'HALF_DAY' || item.status === 'COMPLETED') {
                            attended++;
                            totalWeight += (Number(item.amWeight) || 0) + (Number(item.pmWeight) || 0);
                        }
                        // Track latest update time
                        if (item.updatedAt) {
                            const parsedUpd = parseJavaDate(item.updatedAt);
                            if (parsedUpd && (!latestUpdate || parsedUpd > (latestUpdate as any))) {
                                latestUpdate = parsedUpd as any;
                            }
                        }
                    });

                    const finalSubmittedAt = parseJavaDate(mm.submittedAt) || latestUpdate || parseJavaDate(mm.createdAt);

                    return {
                        id: mm.workId, // Correct field from backend (DailyWork entity)
                        date: date,
                        divisionId: divId,
                        divisionName: divMap.get(divId) || 'Unknown',
                        submittedAt: finalSubmittedAt,
                        assigned: mm.workerCount,
                        attended: attended,
                        totalWeight: totalWeight,
                        types: ['Morning Muster'],
                        details: mm.details, // Store the snapshot JSON here!
                        bulkWeights: mm.bulkWeights, // Add DB-saved weights
                        isEveningSubmitted,
                        auditRemarks: mm.auditRemarks
                    };
                }).filter((r: any) => r.isEveningSubmitted);

                // Sort by Date (desc) then by submission/creation time (desc) within the same date
                setHistory(historyRows.sort((a: any, b: any) => {
                    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
                    if (dateDiff !== 0) return dateDiff;
                    const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
                    const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
                    return timeB - timeA;
                }));

            } catch (e) {
                console.error("History fetch failed", e);
            }
            setLoading(false);
        };

        fetchData();

        // Listen for muster updates (e.g. from DailyEntry submission) to re-fetch history
        window.addEventListener('muster-update', fetchData);
        return () => window.removeEventListener('muster-update', fetchData);
    }, [tenantId]);

    const handleReview = async (row: any) => {
        setSelectedDate(`${row.date} - ${row.divisionName}`);
        setHistoricDivision(row.divisionId);

        // Fetch historic weights from the database snapshot
        if (row.bulkWeights) {
            try {
                // Ensure it gets wrapped properly depending on whether it's keyed by division or not
                const parsed = JSON.parse(row.bulkWeights);
                // wrap in generic way so historic UI can consume it
                setHistoricWeights({ [row.divisionId]: parsed });
            } catch (e) {
                setHistoricWeights({});
            }
        } else {
            // Fallback to local storage (for very old data that never got the db fix)
            try {
                const weights = localStorage.getItem(`dailyWeights_${tenantId}_${row.date}`);
                setHistoricWeights(weights ? JSON.parse(weights) : {});
            } catch (e) {
                setHistoricWeights({});
            }
        }

        // Filter attendance for this specific Division + Date
        const records = rawData.filter((r: any) => {
            const rDate = String(r.workDate).split('T')[0];
            const rowDate = String(row.date).split('T')[0];
            return rDate === rowDate && String(r.divisionId) === String(row.divisionId);
        });
        setSelectedRecords(records);

        // Use the snapshot directly from the row
        if (row.details) {
            try {
                let parsedPlan = JSON.parse(row.details);
                // Dynamically backfill missing worker types for old history records
                parsedPlan = parsedPlan.map((plan: any) => ({
                    ...plan,
                    assigned: plan.assigned?.map((w: any) => ({
                        ...w,
                        type: w.type || rawData.find((r: any) => r.workerId === w.id)?.workerType || 'CASUAL'
                    })) || []
                }));
                setMorningPlan(parsedPlan);
            } catch (e) { setMorningPlan([]); }
        } else {
            setMorningPlan([]);
        }

        setReviewOpen(true);
        setSelectedMusterId(row.id);
        setAuditNote(row.auditRemarks || '');

        // Mark as read if it has an audit note
        if (row.auditRemarks) {
            const seenAudits = JSON.parse(localStorage.getItem('seen_audit_notes') || '[]');
            if (!seenAudits.includes(row.id)) {
                seenAudits.push(row.id);
                localStorage.setItem('seen_audit_notes', JSON.stringify(seenAudits));
                // Notify sidebar to re-calculate alerts
                window.dispatchEvent(new Event('muster-update'));
            }
        }
    };

    const handleSaveAudit = async () => {
        if (!selectedMusterId) return;
        try {
            setIsSavingAudit(true);
            await axios.put(`/api/operations/daily-work/${selectedMusterId}/audit-remarks`, { auditRemarks: auditNote });
            
            // Update local state
            setHistory(prev => prev.map(h => h.id === selectedMusterId ? { ...h, auditRemarks: auditNote } : h));
            
            setNotification({ open: true, message: "Audit note posted successfully!", severity: 'success' });
        } catch (e) {
            console.error("Failed to save audit note", e);
            setNotification({ open: true, message: "Failed to save audit note.", severity: 'error' });
        } finally {
            setIsSavingAudit(false);
        }
    };

    const handleDelete = async (row: any) => {
        if (!row.id) {
            console.error("Cannot delete: Row ID is missing", row);
            alert(`Error: Row ID is missing. Available fields: ${Object.keys(row).join(", ")}`);
            return;
        }
        if (window.confirm(`Are you sure you want to delete the report for ${row.date} - ${row.divisionName}?`)) {
            try {
                await axios.delete(`/api/tenants/daily-work/${row.id}?tenantId=${tenantId}`);
                setHistory(prev => prev.filter(h => h.id !== row.id));
            } catch (e) {
                console.error("Delete failed", e);
                alert("Failed to delete report");
            }
        }
    };

    const groupedRecords = selectedRecords.reduce((acc: any, item) => {
        const key = item.workType;
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});

    const uniqueFieldsInHistoryForWeights = Array.from(new Set(
        selectedRecords
            .filter((item: any) => item.workType?.toLowerCase().includes('pluck') || item.workType?.toLowerCase().includes('harvest'))
            .map((item: any) => item.fieldName)
    )).filter(Boolean) as string[];

    if (loading) return <Box display="flex" justifyItems="center" p={3}><CircularProgress /></Box>;

    return (
        <Box sx={{ maxWidth: 1000, mx: 'auto', mt: { xs: 1, sm: 4 }, px: { xs: 1, sm: 0 } }}>
            <Paper elevation={0} sx={{ 
                p: { xs: 2.5, sm: 4 }, 
                borderRadius: 4, 
                bgcolor: 'white',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                border: '1px solid #eef2f6'
            }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={4} gap={1}>
                    <Box display="flex" alignItems="center" gap={{ xs: 1.5, sm: 2.5 }}>
                        <Box sx={{ 
                            bgcolor: 'rgba(46, 125, 50, 0.08)', 
                            p: { xs: 0.8, sm: 1.2 }, 
                            borderRadius: 2.5, 
                            display: 'flex',
                            boxShadow: '0 2px 8px rgba(46, 125, 50, 0.1)'
                        }}>
                            <HistoryIcon sx={{ fontSize: { xs: 24, sm: 30 }, color: '#2e7d32' }} />
                        </Box>
                        <Box>
                            <Typography variant={isMobile ? "h6" : "h5"} fontWeight="900" color="#2e7d32" sx={{ letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                                Muster History
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold', display: { xs: 'none', sm: 'block' } }}>
                                Review and track past operational records
                            </Typography>
                        </Box>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Chip 
                            label={`${history.length} Records`} 
                            size="small" 
                            sx={{ 
                                fontWeight: '900', 
                                border: '2px solid #e8f5e9', 
                                bgcolor: 'white', 
                                color: '#2e7d32',
                                height: 28,
                                px: 1
                            }} 
                        />
                        <IconButton
                            onClick={() => window.dispatchEvent(new Event('muster-update'))}
                            size="small"
                            sx={{
                                bgcolor: '#f5f7f9',
                                color: '#2e7d32',
                                '&:hover': { bgcolor: '#eef2f6' },
                                border: '1px solid #e0e6ed'
                            }}
                        >
                            <RefreshIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </Box>

                {isMobile ? (
                    <Box display="flex" flexDirection="column" gap={2}>
                        {history.map((row: any) => {
                            const seenAudits = JSON.parse(localStorage.getItem('seen_audit_notes') || '[]');
                            const isUnread = row.auditRemarks && !seenAudits.includes(row.id) && userRole !== 'CHIEF_CLERK';
                            
                            return (
                                <Paper 
                                    key={`${row.date}-${row.divisionId}`} 
                                    elevation={0} 
                                    sx={{ 
                                        p: 2, 
                                        borderRadius: 3, 
                                        border: '1px solid #f0f4f8',
                                        bgcolor: '#ffffff',
                                        transition: 'all 0.2s',
                                        '&:active': { transform: 'scale(0.98)', bgcolor: '#f9fbfc' }
                                    }}
                                >
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                                        <Box>
                                            <Typography variant="subtitle2" sx={{ fontWeight: '900', color: '#2e7d32', fontSize: '1rem' }}>
                                                {new Date(row.date).toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short' })}
                                            </Typography>
                                            <Box display="flex" alignItems="center" mt={0.5} gap={1}>
                                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>
                                                    {row.submittedAt ? new Date(row.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Box display="flex" flexDirection="column" alignItems="flex-end" gap={0.8}>
                                            <Chip 
                                                label={row.divisionName} 
                                                size="small" 
                                                sx={{ 
                                                    fontWeight: 'bold', 
                                                    bgcolor: '#e8f5e9', 
                                                    color: '#2e7d32', 
                                                    fontSize: '0.7rem' 
                                                }} 
                                            />
                                            {row.auditRemarks && (
                                                <Chip 
                                                    label={isUnread ? "NEW REMARK" : "Audited"} 
                                                    size="small" 
                                                    color={isUnread ? "error" : "warning"}
                                                    sx={{ 
                                                        height: 18, 
                                                        fontSize: '0.6rem', 
                                                        fontWeight: '900',
                                                        ...(isUnread && {
                                                            animation: 'pulse-tiny 2s infinite',
                                                            '@keyframes pulse-tiny': {
                                                                '0%': { boxShadow: '0 0 0 0 rgba(211, 47, 47, 0.4)' },
                                                                '70%': { boxShadow: '0 0 0 4px rgba(211, 47, 47, 0)' },
                                                                '100%': { boxShadow: '0 0 0 0 rgba(211, 47, 47, 0)' }
                                                            }
                                                        })
                                                    }} 
                                                />
                                            )}
                                        </Box>
                                    </Box>
                                    
                                    <Box display="flex" gap={1.5} mt={2}>
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            size="small"
                                            startIcon={<VisibilityIcon sx={{ fontSize: 18 }} />}
                                            onClick={() => handleReview(row)}
                                            sx={{ 
                                                borderRadius: 2.5, 
                                                textTransform: 'none', 
                                                fontWeight: 'bold',
                                                bgcolor: '#2e7d32',
                                                '&:hover': { bgcolor: '#1b5e20' }
                                            }}
                                        >
                                            View Details
                                        </Button>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleDelete(row)}
                                            sx={{ 
                                                bgcolor: '#fff5f5', 
                                                border: '1px solid #ffebee',
                                                borderRadius: 2.5,
                                                px: 2
                                            }}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </Paper>
                            );
                        })}
                        {history.length === 0 && (
                            <Box sx={{ py: 8, textAlign: 'center', opacity: 0.6 }}>No records found.</Box>
                        )}
                    </Box>
                ) : (
                    <TableContainer sx={{ border: '1px solid #f0f4f8', borderRadius: 3, overflow: 'hidden' }}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#f5f7f7' }}>
                                    <TableCell sx={{ fontWeight: '800', color: '#2e7d32', py: 2 }}>Date</TableCell>
                                    <TableCell sx={{ fontWeight: '800', color: '#2e7d32', py: 2 }}>Division</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: '800', color: '#2e7d32', py: 2 }}>Submitted At</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: '800', color: '#2e7d32', py: 2 }}>Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {history.map((row: any) => (
                                    <TableRow key={`${row.date}-${row.divisionId}`} hover sx={{ '&:hover': { bgcolor: '#fbfcfe' } }}>
                                        <TableCell sx={{ fontWeight: 'bold', color: '#333' }}>
                                            {new Date(row.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Chip label={row.divisionName} size="small" sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 'bold' }} />
                                                {row.auditRemarks && (() => {
                                                    const seenAudits = JSON.parse(localStorage.getItem('seen_audit_notes') || '[]');
                                                    const isUnread = !seenAudits.includes(row.id) && userRole !== 'CHIEF_CLERK';
                                                    return (
                                                        <Tooltip title={isUnread ? "Unread Audit Remark" : "Has Audit Note"}>
                                                            <Chip 
                                                                label={isUnread ? "NEW REMARK" : "Audited"} 
                                                                size="small" 
                                                                color={isUnread ? "error" : "warning"} 
                                                                sx={{ 
                                                                    height: 20, 
                                                                    fontSize: '0.65rem', 
                                                                    fontWeight: 'bold',
                                                                    ...(isUnread && {
                                                                        animation: 'pulse-red 2s infinite',
                                                                        '@keyframes pulse-red': {
                                                                            '0%': { boxShadow: '0 0 0 0 rgba(211, 47, 47, 0.4)' },
                                                                            '70%': { boxShadow: '0 0 0 6px rgba(211, 47, 47, 0)' },
                                                                            '100%': { boxShadow: '0 0 0 0 rgba(211, 47, 47, 0)' }
                                                                        }
                                                                    })
                                                                }} 
                                                            />
                                                        </Tooltip>
                                                    );
                                                })()}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center" sx={{ color: 'text.secondary', fontWeight: '500' }}>
                                            {row.submittedAt ? new Date(row.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                startIcon={<VisibilityIcon />}
                                                onClick={() => handleReview(row)}
                                                sx={{ 
                                                    textTransform: 'none', 
                                                    borderRadius: 2, 
                                                    mr: 1, 
                                                    fontWeight: 'bold',
                                                    borderColor: '#2e7d32',
                                                    color: '#2e7d32',
                                                    '&:hover': { borderColor: '#1b5e20', bgcolor: 'rgba(46, 125, 50, 0.04)' }
                                                }}
                                            >
                                                View
                                            </Button>
                                            <Tooltip title="Delete Report">
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDelete(row)}
                                                    sx={{ bgcolor: '#fff5f5', border: '1px solid #ffebee', '&:hover': { bgcolor: '#ffcdd2' } }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {history.length === 0 && (
                                    <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6, color: 'text.secondary', fontStyle: 'italic' }}>No muster records found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper >

            {/* FULL REVIEW MODAL */}
            < Dialog open={reviewOpen} onClose={() => setReviewOpen(false)
            } maxWidth="xl" fullWidth >
                <DialogTitle sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 'bold' }}>
                    Muster Review: {selectedDate}
                </DialogTitle>
                <DialogContent sx={{ mt: 1, bgcolor: '#f5f5f5', p: { xs: 1, sm: 2 } }}>
                    {/* HIGH VISIBILITY TOP ALERT FOR AUDIT NOTES - Hidden for Chief Clerk (Author) */}
                    {auditNote && userRole !== 'CHIEF_CLERK' && (
                        <Alert 
                            severity="warning" 
                            variant="filled" 
                            sx={{ 
                                mb: 2, 
                                borderRadius: 2, 
                                fontWeight: 'bold',
                                boxShadow: '0px 4px 10px rgba(0,0,0,0.1)',
                                border: '2px solid #ffb74d'
                            }}
                        >
                            CHIEF CLERK AUDIT NOTE: {auditNote}
                        </Alert>
                    )}

                    <Grid container spacing={3} wrap={isMobile ? "wrap" : "nowrap"} sx={{ minHeight: '60vh' }}>
                        {/* LEFT: MORNING PLAN  */}
                        <Grid size={{ xs: 12, md: 4 }} sx={{ borderRight: isMobile ? 'none' : '2px dashed #bdbdbd', borderBottom: isMobile ? '2px dashed #bdbdbd' : 'none', pb: isMobile ? 3 : 0 }}>
                            <Box mb={3}>
                                <Box display="flex" alignItems="center" gap={1} mb={2} justifyContent="center">
                                    <Avatar sx={{ bgcolor: 'orange', width: 24, height: 24 }}>🌞</Avatar>
                                    <Typography variant="h6" color="primary.main" fontWeight="bold">Morning Assignments (Plan)</Typography>
                                </Box>
                                <MusterChitSummary
                                    data={selectedRecords}
                                    fields={fields}
                                    label="Muster Chit"
                                    includeAbsent={true}
                                    isMorningPlan={true}
                                />
                            </Box>

                            <Box>
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Field Assignments</Typography>
                                <MorningPlanDisplay plans={morningPlan} />
                            </Box>
                        </Grid>

                        {/* RIGHT: EVENING ACTUAL */}
                        <Grid size={{ xs: 12, md: 8 }}>
                            <Box mb={3}>
                                <Box display="flex" alignItems="center" gap={1} mb={2} justifyContent="center">
                                    <Avatar sx={{ bgcolor: '#bdbdbd', width: 24, height: 24 }}>🌙</Avatar>
                                    <Typography variant="h6" color="success.main" fontWeight="bold">Evening Results (Actual)</Typography>
                                </Box>
                                <MusterChitSummary
                                    data={selectedRecords}
                                    fields={fields}
                                    label="Muster Chit"
                                    includeAbsent={false}
                                />
                            </Box>

                            <Box>
                                {/* Weight Entries Section (Historic) */}
                                {uniqueFieldsInHistoryForWeights.length > 0 && (
                                    <Paper elevation={0} variant="outlined" sx={{ mb: 3, p: 2, borderRadius: 2, borderColor: '#a5d6a7', bgcolor: '#f1f8e9' }}>
                                        <Typography variant="subtitle2" fontWeight="bold" color="#1b5e20" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <EditStartIcon fontSize="small" /> Bulk Weights Entry
                                        </Typography>
                                        <Box display="flex" flexWrap="wrap" gap={3} alignItems="center">
                                            {uniqueFieldsInHistoryForWeights.map((field: string) => (
                                                <TextField
                                                    key={field}
                                                    label={`Field Wt. (${field})`}
                                                    value={historicWeights[historicDivision]?.[field]?.fieldWt || ''}
                                                    size="small"
                                                    type="number"
                                                    disabled={true}
                                                    sx={{ bgcolor: 'white', width: 170, boxShadow: '0px 2px 4px rgba(0,0,0,0.05)' }}
                                                    InputProps={{ sx: { fontSize: '1rem', fontWeight: 'bold', color: '#333' } }}
                                                    InputLabelProps={{ shrink: true, sx: { fontSize: '0.85rem', fontWeight: 'bold', color: '#2e7d32' } }}
                                                />
                                            ))}

                                            <Box flex={1} /> {/* Spacer to push Factory weight to the right */}

                                            <Box sx={{ p: 1, bgcolor: '#e3f2fd', borderRadius: 2, border: '1px solid #90caf9' }}>
                                                <TextField
                                                    label="Factory Weight (Total)"
                                                    value={historicWeights[historicDivision]?.['__FACTORY__']?.factoryWt || ''}
                                                    size="small"
                                                    type="number"
                                                    disabled={true}
                                                    sx={{ bgcolor: 'white', width: 200 }}
                                                    InputProps={{ sx: { fontSize: '1rem', fontWeight: 'bold', color: '#1565c0' } }}
                                                    InputLabelProps={{ shrink: true, sx: { fontSize: '0.9rem', fontWeight: 'bold', color: '#1976d2' } }}
                                                />
                                            </Box>
                                        </Box>
                                    </Paper>
                                )}

                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Harvest & Output</Typography>
                                {Object.entries(groupedRecords).map(([task, items]: any) => (
                                    <TaskSection
                                        key={`evening-${task}`}
                                        task={task}
                                        items={items}
                                        onUpdate={() => { }} // Read-only
                                        isSubmitted={true}
                                        hideOutput={false} // Show outputs
                                        fields={fields} // Pass fields
                                        taskTypes={taskTypes}
                                        isFinalized={true}
                                    />
                                ))}
                            </Box>
                        </Grid>
                    </Grid>

                    {/* AUDIT & COST CONTROL SECTION - ONLY FOR CHIEF CLERK (Writing) OR IF NO TOP ALERT IS SHOWN */}
                    {userRole === 'CHIEF_CLERK' && (
                        <Box sx={{ mt: 3, pt: 3, borderTop: '2px solid #e0e0e0' }}>
                            <Box display="flex" alignItems="center" gap={1} mb={2}>
                                <Avatar sx={{ bgcolor: '#ff9800', width: 32, height: 32 }}>
                                    <HistoryIcon sx={{ fontSize: 20 }} />
                                </Avatar>
                                <Typography variant="h6" fontWeight="bold" color="warning.dark">
                                    Audit & Cost Control (Investigation)
                                </Typography>
                            </Box>

                            <Paper elevation={0} variant="outlined" sx={{ p: 2, bgcolor: '#fffde7', borderColor: '#fff176' }}>
                                <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                                    Chief Clerk's Investigation Note:
                                </Typography>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    placeholder="Enter audit observations here (e.g., 'Excessive aththama offered for this division...')"
                                    value={auditNote}
                                    onChange={(e) => setAuditNote(e.target.value)}
                                    sx={{ bgcolor: 'white', mb: 2 }}
                                />
                                <Box display="flex" justifyContent="flex-end">
                                    <Button
                                        variant="contained"
                                        color="warning"
                                        onClick={handleSaveAudit}
                                        disabled={isSavingAudit}
                                        startIcon={isSavingAudit ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                                        sx={{ fontWeight: 'bold' }}
                                    >
                                        {isSavingAudit ? "Posting..." : "Post Audit Note"}
                                    </Button>
                                </Box>
                            </Paper>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, bgcolor: '#fff' }}>
                    <Button onClick={() => setReviewOpen(false)} variant="contained" color="primary" size="large">Close Review</Button>
                </DialogActions>
            </Dialog >

            <Snackbar
                open={notification.open}
                autoHideDuration={6000}
                onClose={() => setNotification({ ...notification, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setNotification({ ...notification, open: false })} severity={notification.severity} sx={{ width: '100%' }}>
                    {notification.message}
                </Alert>
            </Snackbar>
        </Box >
    );
}
