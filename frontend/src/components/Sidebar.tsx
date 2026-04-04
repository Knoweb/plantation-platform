import {
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Box,
    Typography,
    Divider,
    Badge, // Import Badge
    Tooltip, // Import Tooltip
} from '@mui/material';
import { useState, useEffect } from 'react';
import axios from 'axios';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SpaIcon from '@mui/icons-material/Spa';
import InventoryIcon from '@mui/icons-material/Inventory';
import LogoutIcon from '@mui/icons-material/Logout';
import PeopleIcon from '@mui/icons-material/People';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ScienceIcon from '@mui/icons-material/Science';

import GroupIcon from '@mui/icons-material/Group';
import TerrainIcon from '@mui/icons-material/Terrain';
import ChatIcon from '@mui/icons-material/Chat';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SettingsIcon from '@mui/icons-material/Settings';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import HistoryIcon from '@mui/icons-material/History';
import EngineeringIcon from '@mui/icons-material/Engineering';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import ForestIcon from '@mui/icons-material/Forest';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import EventNoteIcon from '@mui/icons-material/EventNote';

import { useNavigate, useLocation } from 'react-router-dom';

const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', roles: ['ESTATE_ADMIN', 'MANAGER', 'FIELD_OFFICER', 'CHIEF_CLERK'] },
    { text: 'General Stock', icon: <InventoryIcon />, path: '/dashboard/stock', roles: ['MANAGER', 'ESTATE_ADMIN'] }, // Shared with Mgr

    // Field Officer Specific Tabs
    { text: 'Morning Muster', icon: <PendingActionsIcon />, path: '/dashboard/morning-muster', roles: ['FIELD_OFFICER'] },
    { text: 'Evening Muster', icon: <AssignmentTurnedInIcon />, path: '/dashboard/evening-muster', roles: ['FIELD_OFFICER'] },
    // Workers moved to Chief Clerk / Manager
    { text: 'Worker Registry', icon: <EngineeringIcon />, path: '/dashboard/workers', roles: ['CHIEF_CLERK', 'MANAGER'] },
    { text: 'Crop Achievements', icon: <TrendingUpIcon />, path: '/dashboard/crop-achievements', roles: ['FIELD_OFFICER'] },
    { text: 'Field log', icon: <ForestIcon />, path: '/dashboard/crop-ages', roles: ['FIELD_OFFICER'] },
    { text: 'Fertilizer Programme', icon: <ScienceIcon />, path: '/dashboard/fertilizer-programme', roles: ['FIELD_OFFICER'] },
    { text: 'Distribution of Works', icon: <WorkHistoryIcon />, path: '/dashboard/distribution-works', roles: ['FIELD_OFFICER'] },
    { text: 'Leave Application', icon: <EventNoteIcon />, path: '/dashboard/leave-application', roles: ['FIELD_OFFICER'] },
    { text: 'Order Request', icon: <InventoryIcon />, path: '/dashboard/order-request', roles: ['FIELD_OFFICER'] },
    { text: 'Request / Pending Orders', icon: <HistoryIcon />, path: '/dashboard/pending-orders', roles: ['FIELD_OFFICER'] },
    // { text: 'Muster Approval', icon: <DoneAllIcon />, path: '/dashboard/muster-approval', roles: ['FIELD_OFFICER'] }, // Removed as per request (Manager Only)
    // Muster Review removed for Field Officer

    { text: 'Crop Book', icon: <MenuBookIcon />, path: '/dashboard/crop-book-fo', roles: ['FIELD_OFFICER', 'ESTATE_ADMIN'] },
    { text: 'Cost Analysis', icon: <AttachMoneyIcon />, path: '/dashboard/cost-analysis', roles: ['FIELD_OFFICER', 'ESTATE_ADMIN'] },
    { text: 'Correspondence', icon: <ChatIcon />, path: '/dashboard/correspondence', roles: ['FIELD_OFFICER', 'MANAGER', 'STORE_KEEPER', 'ESTATE_ADMIN', 'CHIEF_CLERK'] },

    // Chief Clerk Specific Tabs
    { text: 'Job Roles & Tasks', icon: <WorkHistoryIcon />, path: '/dashboard/job-roles', roles: ['CHIEF_CLERK'] },
    { text: 'Cost Analysis', icon: <AttachMoneyIcon />, path: '/dashboard/chief-cost-analysis', roles: ['CHIEF_CLERK'] },
    { text: 'Distribution of Works', icon: <WorkHistoryIcon />, path: '/dashboard/chief-distribution-works', roles: ['CHIEF_CLERK'] },
    { text: 'Inventory Management', icon: <InventoryIcon />, path: '/dashboard/chief-inventory', roles: ['CHIEF_CLERK'] },

    // Manager Specific Tabs
    { text: 'Operational Targets & Norms', icon: <SettingsIcon />, path: '/dashboard/norms', roles: ['MANAGER'] },
    { text: 'Pending Approvals', icon: <PendingActionsIcon />, path: '/dashboard/approvals', roles: ['MANAGER'] },
    { text: 'Crop Book', icon: <MenuBookIcon />, path: '/dashboard/crop-book', roles: ['MANAGER', 'CHIEF_CLERK'] },


    // Manager
    { text: 'Leave Management', icon: <EventAvailableIcon />, path: '/dashboard/leave-management', roles: ['MANAGER'] },

    // Estate Admin / Manager
    { text: 'Staff Management', icon: <PeopleIcon />, path: '/dashboard/users', roles: ['ESTATE_ADMIN'] }, // Removed MANAGER
    { text: 'Divisions', icon: <TerrainIcon />, path: '/dashboard/divisions', roles: ['ESTATE_ADMIN'] },
    { text: 'Distribution of Works', icon: <WorkHistoryIcon />, path: '/dashboard/distribution-works', roles: ['ESTATE_ADMIN'] },
    { text: 'Fertilizer Programme', icon: <ForestIcon />, path: '/dashboard/fertilizer-programme', roles: ['ESTATE_ADMIN'] },

    // Common Operational
    { text: 'Harvest Logs', icon: <SpaIcon />, path: '/dashboard/harvest', roles: [] }, // Removed from Manager


    // Store Keeper
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard/store/main', roles: ['STORE_KEEPER'] },
    { text: 'Inventory', icon: <InventoryIcon />, path: '/dashboard/store/inventory', roles: ['STORE_KEEPER'] },
    { text: 'Pending Approvals', icon: <PendingActionsIcon />, path: '/dashboard/store/approvals', roles: ['STORE_KEEPER'] },
    { text: 'Recent Transactions', icon: <HistoryIcon />, path: '/dashboard/store/history', roles: ['STORE_KEEPER'] },

    // Settings
    { text: 'Configuration', icon: <SettingsIcon />, path: '/dashboard/settings', roles: ['ESTATE_ADMIN'] },
];

interface SidebarProps {
    mobileOpen: boolean;
    handleDrawerToggle: () => void;
    drawerWidth: number;
}

export default function Sidebar({ mobileOpen, handleDrawerToggle, drawerWidth }: SidebarProps) {
    const navigate = useNavigate();
    const location = useLocation();

    // Load estate name & logo from backend session
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const userRole = userSession.role;
    const [estateName, setEstateName] = useState<string>(userSession.estateName || 'Plantation');
    const [estateLogo, setEstateLogo] = useState<string | null>(userSession.estateLogo || null);

    // Fetch live estate name from backend so it updates when admin changes it
    useEffect(() => {
        const fetchEstateName = async () => {
            if (!userSession.tenantId) return;
            try {
                const res = await axios.get(`/api/tenants/${userSession.tenantId}`);
                const tenant = res.data;
                if (tenant?.name || tenant?.companyName) {
                    setEstateName(tenant.companyName || tenant.name);
                    // Also update sessionStorage so other components stay in sync
                    const session = JSON.parse(sessionStorage.getItem('user') || '{}');
                    session.estateName = tenant.companyName || tenant.name;
                    if (tenant.logoUrl) {
                        setEstateLogo(tenant.logoUrl);
                        session.estateLogo = tenant.logoUrl;
                    }
                    sessionStorage.setItem('user', JSON.stringify(session));
                    // Notify Header to refresh its display
                    window.dispatchEvent(new Event('user-session-updated'));
                }
            } catch (e) {
                // Silently ignore - keep using session value
            }
        };
        fetchEstateName();
        const interval = setInterval(fetchEstateName, 30000); // Re-check every 30s
        return () => clearInterval(interval);
    }, [userSession.tenantId]);

    // Alert Count for Manager
    const [alertCount, setAlertCount] = useState(0);
    const [restockCount, setRestockCount] = useState(0);
    const [musterReviewCount, setMusterReviewCount] = useState(0);
    const [eveningPendingCount, setEveningPendingCount] = useState(0);
    const [storePendingCount, setStorePendingCount] = useState(0); // Store Keeper Approved FOs count
    const [chiefClerkPendingCount, setChiefClerkPendingCount] = useState(0);
    const [leaveApprovalCount, setLeaveApprovalCount] = useState(0); // Manager pending leave approvals
    const [pendingDivisions, setPendingDivisions] = useState<string[]>([]);
    const [unreadChatCount, setUnreadChatCount] = useState(0);
    const [workerApprovalCount, setWorkerApprovalCount] = useState(0);
    const [sidebarDivisions, setSidebarDivisions] = useState<any[]>([]);
    // divisionId -> true means morning submitted but evening NOT yet submitted today
    const [divMusterActive, setDivMusterActive] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (userSession.tenantId) {
            if (['MANAGER', 'FIELD_OFFICER', 'STORE_KEEPER', 'ESTATE_ADMIN', 'CHIEF_CLERK', 'MANAGER_CLERK'].includes(userRole)) {
                fetchAlerts();

                // Poll every 10 seconds for real-time updates
                const interval = setInterval(fetchAlerts, 10000);

                // Listen for immediate local updates
                const handleUpdate = () => fetchAlerts();
                window.addEventListener('muster-update', handleUpdate);

                return () => {
                    clearInterval(interval);
                    window.removeEventListener('muster-update', handleUpdate);
                };
            }
        }
    }, [userRole, userSession.tenantId]);

    useEffect(() => {
        if (userSession.tenantId && (userRole === 'MANAGER' || userRole === 'MANAGER_CLERK')) {
            const fetchManagerDivisions = async () => {
                try {
                    // Fetch latest user details dynamically to prevent stale session cache
                    const myId = userSession.userId || userSession.id;
                    let latestAccess = userSession.divisionAccess || [];
                    try {
                        const usersRes = await axios.get(`/api/tenants/${userSession.tenantId}/users`);
                        const me = usersRes.data.find((u: any) => u.userId === myId || u.id === myId);
                        if (me && me.divisionAccess) {
                            latestAccess = me.divisionAccess;
                        }
                    } catch (e) {
                        console.warn("Could not fetch latest user details, falling back to session");
                    }

                    const res = await axios.get(`/api/divisions?tenantId=${userSession.tenantId}`);
                    let divs = res.data;

                    if (latestAccess.length > 0) {
                        divs = divs.filter((d: any) => latestAccess.includes(d.divisionId));
                    }
                    setSidebarDivisions(divs);

                    // ── Muster blink status per division ──────────────────────────────
                    // Uses same proven 2-step approach as Field Officer alerts:
                    // 1. daily-work records → build workId→divisionId map
                    // 2. attendance records → find which divisions have attendance today (= morning active)
                    const dNow = new Date();
                    const today = `${dNow.getFullYear()}-${String(dNow.getMonth() + 1).padStart(2, '0')}-${String(dNow.getDate()).padStart(2, '0')}`;
                    try {
                        // Step 1 — all daily-work for today, build workId→divisionId map
                        const dwRes = await axios.get(
                            `/api/operations/daily-work?tenantId=${userSession.tenantId}`
                        );
                        const workToDivMap = new Map<string, string>();
                        const eveningDoneDivs = new Set<string>();
                        (dwRes.data || []).forEach((w: any) => {
                            if (!w.divisionId) return;
                            const divId = String(w.divisionId);
                            // Determine if the work date matches today
                            const wDate = (w.workDate || '').slice(0, 10);
                            if (wDate === today) {
                                workToDivMap.set(String(w.workId || w.id), divId);
                                // Evening done if record is SUBMITTED / APPROVED
                                if (w.status === 'SUBMITTED' || w.status === 'APPROVED' || w.eveningSubmittedAt) {
                                    eveningDoneDivs.add(divId);
                                }
                            }
                        });

                        // Step 2 — today's attendance to find morning-active divisions
                        const attRes = await axios.get(
                            `/api/operations/attendance?tenantId=${userSession.tenantId}&date=${today}`
                        );
                        const morningActiveDivs = new Set<string>();
                        (attRes.data || []).forEach((rec: any) => {
                            const divId = workToDivMap.get(String(rec.dailyWorkId || rec.workId));
                            if (divId) morningActiveDivs.add(divId);
                        });

                        // Build per-division blink map
                        const newStatus: Record<string, boolean> = {};
                        divs.forEach((div: any) => {
                            const divId = String(div.divisionId);
                            newStatus[divId] = morningActiveDivs.has(divId) && !eveningDoneDivs.has(divId);
                        });
                        setDivMusterActive(newStatus);
                    } catch {
                        // Silently ignore — blink is best-effort
                    }
                    // ─────────────────────────────────────────────────────────────────
                } catch (err) {
                    console.error("Failed to load divisions for sidebar");
                }
            };
            fetchManagerDivisions();

            // Poll for dynamic updates
            const divInterval = setInterval(fetchManagerDivisions, 30000);
            return () => clearInterval(divInterval);
        }
    }, [userRole, userSession.tenantId]);

    const fetchAlerts = async () => {
        try {
            // Fetch Messages Alerts (For all roles)
            try {
                const myId = userSession.userId || userSession.id;
                const msgRes = await axios.get(`/api/messages?userId=${myId}&userRole=${userRole}`, {
                    headers: { 'X-Tenant-ID': userSession.tenantId }
                });
                const unread = msgRes.data.filter((m: any) => m.receiverId === myId && !m.read).length;
                setUnreadChatCount(unread);
            } catch (err) {
                console.warn("Message alerts unavailable", err);
            }
            // Restock Requests (Pending) - For Manager + Muster Review
            if (userRole === 'MANAGER' || userRole === 'MANAGER_CLERK') {
                const transRes = await axios.get(`/api/inventory/transactions?tenantId=${userSession.tenantId}`);
                // Count Pending Restocks OR FO Requisitions
                const foCount = transRes.data.filter((t: any) =>
                    t.type === 'FO_REQUISITION' &&
                    (t.status === 'PENDING' || t.status === null)
                ).length;
                setAlertCount(foCount);

                const restockC = transRes.data.filter((t: any) =>
                    t.type === 'RESTOCK_REQUEST' &&
                    (t.status === 'PENDING' || t.status === null) &&
                    !(t.issuedTo && t.issuedTo.includes('SYSTEM')) // Hide auto-refills from Manager sidebar count
                ).length;

                // Count items below buffer level
                const res = await axios.get(`/api/inventory?tenantId=${userSession.tenantId}`);
                const items = res.data;
                const lowStockCount = items.filter((i: any) => i.bufferLevel === 0 || i.currentQuantity < i.bufferLevel).length;

                setRestockCount(restockC + lowStockCount);

                // Muster Review Count
                const workRes = await axios.get(`/api/operations/daily-work?tenantId=${userSession.tenantId}&status=PENDING`);
                const pendingMusters = workRes.data.filter((item: any) =>
                    (item.workType === 'Morning Muster' || item.workType === 'Evening Muster') &&
                    (item.status === 'PENDING' || !item.status)
                ).length;
                setMusterReviewCount(pendingMusters);

                // Manager Worker Approvals Count
                const wRes = await axios.get(`/api/workers?tenantId=${userSession.tenantId}`);
                const pendingWorkers = wRes.data.filter((item: any) => item.status === 'PENDING_APPROVAL' && item.employmentType !== 'CONTRACT_MEMBER').length;
                setWorkerApprovalCount(pendingWorkers);

                // Leave Approval Count for Manager
                try {
                    const leaveRes = await axios.get(`/api/operations/leaves/tenant/${userSession.tenantId}/applications`);
                    const pendingLeaves = (leaveRes.data || []).filter((a: any) => a.status === 'PENDING').length;
                    setLeaveApprovalCount(pendingLeaves);
                } catch (e) {
                    console.warn('Leave approval count unavailable', e);
                }
            }

            // Store Keeper Alerts
            if (userRole === 'STORE_KEEPER') {
                const transRes = await axios.get(`/api/inventory/transactions?tenantId=${userSession.tenantId}`);
                const approvedCount = transRes.data.filter((t: any) =>
                    t.type === 'FO_REQUISITION' && t.status === 'APPROVED'
                ).length;
                setStorePendingCount(approvedCount);
            }

            // Chief Clerk Alerts
            if (userRole === 'CHIEF_CLERK') {
                const transRes = await axios.get(`/api/inventory/transactions?tenantId=${userSession.tenantId}`);
                const ccPending = transRes.data.filter((t: any) =>
                    t.type === 'RESTOCK_REQUEST' &&
                    ((t.status === 'PENDING' && t.issuedTo && t.issuedTo.includes('SYSTEM')) || t.status === 'CHIEF_CLERK_PENDING')
                ).length;
                setChiefClerkPendingCount(ccPending);
            }

            // Field Officer Alerts
            if (userRole === 'FIELD_OFFICER') {
                const d = new Date();
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const today = `${year}-${month}-${day}`;

                // Fetch Today's Daily Work (Mappings)
                const dwRes = await axios.get(`/api/operations/daily-work?tenantId=${userSession.tenantId}&date=${today}`);
                const dwMap = new Map();
                dwRes.data.forEach((dw: any) => dwMap.set(dw.workId, dw.divisionId));

                // Fetch Today's Attendance to find active divisions (Mirroring DailyEntry.tsx logic)
                const attRes = await axios.get(`/api/operations/attendance?tenantId=${userSession.tenantId}&date=${today}`);
                const activeDivIds = new Set();

                attRes.data.forEach((rec: any) => {
                    // Find division for this attendance record
                    const divId = dwMap.get(rec.dailyWorkId);
                    if (divId) activeDivIds.add(divId);
                });

                let divIds = Array.from(activeDivIds);

                // Fetch Division Names map
                const divRes = await axios.get(`/api/divisions?tenantId=${userSession.tenantId}`);
                const divNameMap = new Map();
                divRes.data.forEach((d: any) => divNameMap.set(d.divisionId, d.name));

                // DO NOT Filter out Ghost Divisions - Keep them to match DailyEntry logic
                // If DailyEntry shows it (even as unknown), Sidebar should alert it.
                // divIds = divIds.filter((id: any) => divMap.has(id)); 

                let pendingCount = 0;
                const pDivs: string[] = [];

                divIds.forEach((divId: any) => {
                    const key = `muster_submitted_${userSession.tenantId}_${today}_${divId}`;
                    if (localStorage.getItem(key) !== 'true') {
                        pendingCount++;
                        pDivs.push(divNameMap.get(divId) || 'Unknown Division');
                    }
                });
                setEveningPendingCount(pendingCount);
                setPendingDivisions(pDivs);
            }
        } catch (err) {
            // Silently fail if inventory service is down
            console.warn("Sidebar alerts unavailable (Inventory Service might be down)");
        }
    };

    // Calculate sum of alerts across the entire sidebar to pass to the global Header bell
    useEffect(() => {
        let total = 0;
        const alertsList: any[] = [];

        if (alertCount > 0) { total += alertCount; alertsList.push({ id: 1, label: `${alertCount} Pending Approvals`, path: userRole === 'STORE_KEEPER' ? '/dashboard/store/approvals' : '/dashboard/approvals' }); }
        if (restockCount > 0) { total += restockCount; alertsList.push({ id: 2, label: `${restockCount} General Stock Issues`, path: '/dashboard/stock' }); }
        if (musterReviewCount > 0) { total += musterReviewCount; alertsList.push({ id: 3, label: `${musterReviewCount} Daily Muster Reviews`, path: '/dashboard/muster-review-manager' }); }
        if (eveningPendingCount > 0) { total += eveningPendingCount; alertsList.push({ id: 4, label: `${eveningPendingCount} Evening Mustee Submissions`, path: '/dashboard/evening-muster' }); }
        if (storePendingCount > 0) { total += storePendingCount; alertsList.push({ id: 5, label: `${storePendingCount} Dispatches`, path: '/dashboard/store/approvals' }); }
        if (chiefClerkPendingCount > 0) { total += chiefClerkPendingCount; alertsList.push({ id: 6, label: `${chiefClerkPendingCount} Pending Inventory Actions`, path: '/dashboard/chief-inventory' }); }
        if (unreadChatCount > 0) { total += unreadChatCount; alertsList.push({ id: 7, label: `${unreadChatCount} Unread Messages`, path: '/dashboard/correspondence' }); }
        if (workerApprovalCount > 0) { total += workerApprovalCount; alertsList.push({ id: 8, label: `${workerApprovalCount} Worker Approvals`, path: '/dashboard/workers' }); }
        if (leaveApprovalCount > 0) { total += leaveApprovalCount; alertsList.push({ id: 9, label: `${leaveApprovalCount} Leave Approval${leaveApprovalCount > 1 ? 's' : ''} Pending`, path: '/dashboard/leave-management' }); }

        window.dispatchEvent(new CustomEvent('global-alerts-update', { detail: { total, alertsList } }));
    }, [alertCount, restockCount, musterReviewCount, eveningPendingCount, storePendingCount, chiefClerkPendingCount, unreadChatCount, workerApprovalCount, leaveApprovalCount, userRole]);

    const handleLogout = () => {
        sessionStorage.removeItem('user');
        navigate('/login');
    };

    // Integrate Divisions into Menu
    // For Managers, we put Divisions at the top like the reference image


    // We'll just render Divisions manually in the list below
    const effectiveRoles = userRole === 'MANAGER_CLERK' ? ['MANAGER', 'CHIEF_CLERK'] : [userRole];

    const getAlertCount = (item: any) => {
        if (item.text === 'Pending Approvals' && (userRole === 'MANAGER' || userRole === 'MANAGER_CLERK')) return alertCount;
        if (item.text === 'General Stock' && (userRole === 'MANAGER' || userRole === 'MANAGER_CLERK')) return restockCount;
        if (item.text === 'Pending Approvals' && userRole === 'STORE_KEEPER') return storePendingCount;
        if (item.text === 'Inventory Management' && userRole === 'CHIEF_CLERK') return chiefClerkPendingCount;
        if (item.text === 'Dashboard' && userRole === 'STORE_KEEPER') return alertCount;
        if (item.text === 'Muster Review') return musterReviewCount;
        if (item.text === 'Correspondence') return unreadChatCount;
        if (item.text === 'Worker Registry' && (userRole === 'MANAGER' || userRole === 'MANAGER_CLERK')) return workerApprovalCount;
        if (item.text === 'Evening Muster') return eveningPendingCount;
        if (item.text === 'Leave Management' && (userRole === 'MANAGER' || userRole === 'MANAGER_CLERK')) return leaveApprovalCount;
        return 0;
    };

    const filteredMenuItems = menuItems.filter(item =>
        !item.roles || (effectiveRoles.some(r => item.roles.includes(r)))
    ).map(item => {
        if (item.text === 'Dashboard') {
            let dashboardPath = '/dashboard';
            if (userRole === 'ESTATE_ADMIN') dashboardPath = '/dashboard/admin';
            else if (userRole === 'MANAGER' || userRole === 'MANAGER_CLERK') dashboardPath = '/dashboard/manager';
            else if (userRole === 'FIELD_OFFICER') dashboardPath = '/dashboard/field';
            else if (userRole === 'CHIEF_CLERK') dashboardPath = '/dashboard/chief';
            return { ...item, path: dashboardPath };
        }
        return item;
    }).map((item, index) => ({ item, index }))
        .sort((a, b) => {
            const countA = getAlertCount(a.item);
            const countB = getAlertCount(b.item);
            if (countA > 0 && countB === 0) return -1;
            if (countB > 0 && countA === 0) return 1;
            return a.index - b.index; // Stable sort for identical alert states
        }).map(obj => obj.item);

    const drawerContent = (
        <>
            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                    width: 50,
                    height: 50,
                    bgcolor: 'white',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 0.5,
                    boxShadow: 2
                }}>
                    {estateLogo ? (
                        <img src={estateLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                        <SpaIcon color="primary" fontSize="medium" />
                    )}
                </Box>
                <Box>
                    <Typography variant="subtitle1" fontWeight="900" sx={{ color: 'white', lineHeight: 1.2, textTransform: 'uppercase' }}>
                        {estateName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', letterSpacing: 1 }}>
                        {userRole}
                    </Typography>
                </Box>
            </Box>
            <Divider sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.2)' }} />

            <List sx={{ px: 2 }}>

                {/* Dashboard - Always Top */}
                <ListItem disablePadding sx={{ mb: 1 }}>
                    <ListItemButton
                        onClick={() => {
                            let path = '/dashboard';
                            if (userRole === 'ESTATE_ADMIN') path = '/dashboard/admin';
                            else if (userRole === 'MANAGER' || userRole === 'MANAGER_CLERK') path = '/dashboard/manager';
                            else if (userRole === 'FIELD_OFFICER') path = '/dashboard/field';
                            else if (userRole === 'CHIEF_CLERK') path = '/dashboard/chief';
                            navigate(path);
                        }}
                        selected={location.pathname === '/dashboard' || location.pathname === '/dashboard/admin' || location.pathname === '/dashboard/manager' || location.pathname === '/dashboard/field' || location.pathname === '/dashboard/chief'}
                        sx={{
                            borderRadius: 2,
                            mx: 1,
                            minHeight: 48,
                            justifyContent: 'initial',
                            '&.Mui-selected': {
                                bgcolor: 'rgba(255,255,255,0.2)',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }
                            },
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                        }}
                    >
                        <ListItemIcon sx={{ color: 'white', minWidth: 40, justifyContent: 'center', mr: 2 }}>
                            <DashboardIcon />
                        </ListItemIcon>
                        <ListItemText primary="Dashboard" primaryTypographyProps={{ fontSize: '1rem', fontWeight: 500 }} />
                    </ListItemButton>
                </ListItem>

                {/* Manager Divisions */}
                {(userRole === 'MANAGER' || userRole === 'MANAGER_CLERK') && sidebarDivisions.length > 0 && (
                    <Box sx={{ mt: 1, mb: 1 }}>
                        <Typography variant="overline" sx={{ px: 3, color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>
                            Divisions
                        </Typography>
                        {sidebarDivisions.map((div: any) => {
                            const isActive = !!divMusterActive[String(div.divisionId)];
                            return (
                                <ListItem key={div.divisionId} disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton
                                        onClick={() => navigate(`/dashboard/division-view/${div.divisionId}`)}
                                        selected={location.pathname === `/dashboard/division-view/${div.divisionId}`}
                                        sx={{
                                            borderRadius: 2,
                                            mx: 2,
                                            minHeight: 36,
                                            justifyContent: 'initial',
                                            '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.2)' },
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                                        }}
                                    >
                                        <ListItemIcon sx={{ color: 'white', minWidth: 32, justifyContent: 'center', mr: 1 }}>
                                            <TerrainIcon fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText primary={div.name} primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 400 }} />
                                        {/* Green blinking dot: morning active, evening not yet submitted */}
                                        {isActive && (
                                            <Box
                                                component="span"
                                                sx={{
                                                    width: 10,
                                                    height: 10,
                                                    borderRadius: '50%',
                                                    bgcolor: '#69f0ae',
                                                    flexShrink: 0,
                                                    ml: 1,
                                                    boxShadow: '0 0 6px 2px rgba(105,240,174,0.7)',
                                                    '@keyframes muster-blink': {
                                                        '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                                                        '50%': { opacity: 0.3, transform: 'scale(0.75)' },
                                                    },
                                                    animation: 'muster-blink 1.4s ease-in-out infinite',
                                                }}
                                                title="Morning muster started – evening pending"
                                            />
                                        )}
                                    </ListItemButton>
                                </ListItem>
                            );
                        })}
                    </Box>
                )}

                {/* Muster Review directly below Divisions for Manager */}
                {(userRole === 'MANAGER' || userRole === 'MANAGER_CLERK') && (
                    <ListItem disablePadding sx={{ mb: 1 }}>
                        <ListItemButton
                            onClick={() => navigate('/dashboard/muster-review-manager')}
                            selected={location.pathname === '/dashboard/muster-review-manager'}
                            sx={{
                                borderRadius: 2,
                                mx: 1,
                                minHeight: 48,
                                justifyContent: 'initial',
                                '&.Mui-selected': {
                                    bgcolor: 'rgba(255,255,255,0.2)',
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }
                                },
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                            }}
                        >
                            <ListItemIcon sx={{ color: 'white', minWidth: 40, justifyContent: 'center', mr: 2 }}>
                                {musterReviewCount > 0 ? (
                                    <Badge badgeContent={musterReviewCount} color="error">
                                        <GroupIcon />
                                    </Badge>
                                ) : (
                                    <GroupIcon />
                                )}
                            </ListItemIcon>
                            <ListItemText primary="Muster Review" primaryTypographyProps={{ fontSize: '1rem', fontWeight: 500 }} />
                        </ListItemButton>
                    </ListItem>
                )}

                {/* Standard Menu Items (Excluding Dashboard) */}
                {filteredMenuItems.filter(item => item.text !== 'Dashboard').map((item) => (
                    <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                        <ListItemButton
                            onClick={() => navigate(item.path)}
                            selected={location.pathname === item.path}
                            sx={{
                                borderRadius: 2,
                                mx: 1,
                                minHeight: 48,
                                justifyContent: 'initial',
                                '&.Mui-selected': {
                                    bgcolor: 'rgba(255,255,255,0.2)',
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }
                                },
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                            }}
                        >
                            <ListItemIcon sx={{ color: 'white', minWidth: 40, justifyContent: 'center', mr: 2 }}>
                                {item.text === 'Pending Approvals' && (userRole === 'MANAGER' || userRole === 'MANAGER_CLERK') && alertCount > 0 ? (
                                    <Badge badgeContent={alertCount} color="error">
                                        {item.icon}
                                    </Badge>
                                ) : item.text === 'General Stock' && (userRole === 'MANAGER' || userRole === 'MANAGER_CLERK') && restockCount > 0 ? (
                                    <Badge badgeContent={restockCount} color="error">
                                        {item.icon}
                                    </Badge>
                                ) : item.text === 'Pending Approvals' && userRole === 'STORE_KEEPER' && storePendingCount > 0 ? (
                                    <Badge badgeContent={storePendingCount} color="error">
                                        {item.icon}
                                    </Badge>
                                ) : item.text === 'Inventory Management' && userRole === 'CHIEF_CLERK' && chiefClerkPendingCount > 0 ? (
                                    <Badge badgeContent={chiefClerkPendingCount} color="error">
                                        {item.icon}
                                    </Badge>
                                ) : item.text === 'Dashboard' && userRole === 'STORE_KEEPER' && alertCount > 0 ? (
                                    <Badge badgeContent={alertCount} color="error">
                                        {item.icon}
                                    </Badge>
                                ) : item.text === 'Muster Review' && musterReviewCount > 0 ? (
                                    <Badge badgeContent={musterReviewCount} color="error">
                                        {item.icon}
                                    </Badge>
                                ) : item.text === 'Correspondence' && unreadChatCount > 0 ? (
                                    <Badge badgeContent={unreadChatCount} color="error">
                                        {item.icon}
                                    </Badge>
                                ) : item.text === 'Worker Registry' && (userRole === 'MANAGER' || userRole === 'MANAGER_CLERK') && workerApprovalCount > 0 ? (
                                    <Badge badgeContent={workerApprovalCount} color="error">
                                        {item.icon}
                                    </Badge>
                                ) : item.text === 'Leave Management' && (userRole === 'MANAGER' || userRole === 'MANAGER_CLERK') && leaveApprovalCount > 0 ? (
                                    <Badge badgeContent={leaveApprovalCount} color="error">
                                        {item.icon}
                                    </Badge>
                                ) : (
                                    item.icon
                                )}
                            </ListItemIcon>
                            <ListItemText
                                primary={item.text}
                                primaryTypographyProps={{ fontSize: '1rem', fontWeight: 500 }}
                            />
                            {item.text === 'Evening Muster' && eveningPendingCount > 0 && (
                                <Tooltip title={`Pending: ${pendingDivisions.join(', ')}`} arrow placement="right">
                                    <Box sx={{
                                        bgcolor: 'error.main',
                                        color: 'white',
                                        borderRadius: '50%',
                                        width: 24,
                                        height: 24,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold',
                                        animation: 'blink 1.5s infinite',
                                        '@keyframes blink': {
                                            '0%': { opacity: 1 },
                                            '50%': { opacity: 0.5 },
                                            '100%': { opacity: 1 }
                                        }
                                    }}>
                                        {eveningPendingCount}
                                    </Box>
                                </Tooltip>
                            )}
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>

            <Box sx={{ mt: 'auto', p: 2 }}>
                <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                    <ListItemIcon sx={{ color: 'white' }}><LogoutIcon /></ListItemIcon>
                    <ListItemText primary="Logout" />
                </ListItemButton>
            </Box>
        </>
    );

    return (
        <Box
            component="nav"
            sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
            aria-label="mailbox folders"
        >
            {/* Mobile Drawer */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{
                    keepMounted: true, // Better open performance on mobile.
                }}
                sx={{
                    display: { xs: 'block', sm: 'none' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: drawerWidth,
                        background: userRole === 'ESTATE_ADMIN' ? 'linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)' : '#2e7d32',
                        color: 'white',
                    },
                }}
            >
                {drawerContent}
            </Drawer>

            {/* Desktop Drawer */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', sm: 'block' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: drawerWidth,
                        background: userRole === 'ESTATE_ADMIN' ? 'linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)' : '#2e7d32',
                        color: 'white',
                        borderRight: 'none',
                        boxShadow: 4
                    },
                }}
                open
            >
                {drawerContent}
            </Drawer>
        </Box>
    );
}
