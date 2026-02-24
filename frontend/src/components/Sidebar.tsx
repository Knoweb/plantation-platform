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

import GroupIcon from '@mui/icons-material/Group';
import AssessmentIcon from '@mui/icons-material/Assessment';
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
    { text: 'General Stock', icon: <InventoryIcon />, path: '/dashboard/stock', roles: ['MANAGER'] }, // Shared with Mgr

    // Field Officer Specific Tabs
    { text: 'Morning Muster', icon: <PendingActionsIcon />, path: '/dashboard/morning-muster', roles: ['FIELD_OFFICER'] },
    { text: 'Evening Muster', icon: <AssignmentTurnedInIcon />, path: '/dashboard/evening-muster', roles: ['FIELD_OFFICER'] },
    // Workers moved to Chief Clerk / Manager
    { text: 'Worker Registry', icon: <EngineeringIcon />, path: '/dashboard/workers', roles: ['CHIEF_CLERK', 'MANAGER'] },
    { text: 'Attendance', icon: <HistoryIcon />, path: '/dashboard/attendance', roles: ['FIELD_OFFICER'] },
    { text: 'Crop Achievements', icon: <TrendingUpIcon />, path: '/dashboard/crop-achievements', roles: ['FIELD_OFFICER'] },
    { text: 'Crop Ages', icon: <ForestIcon />, path: '/dashboard/crop-ages', roles: ['FIELD_OFFICER'] },
    { text: 'Distribution of Works', icon: <WorkHistoryIcon />, path: '/dashboard/distribution-works', roles: ['FIELD_OFFICER'] },
    { text: 'Leave Application', icon: <EventNoteIcon />, path: '/dashboard/leave-application', roles: ['FIELD_OFFICER'] },
    { text: 'Order Request', icon: <InventoryIcon />, path: '/dashboard/order-request', roles: ['FIELD_OFFICER'] },
    { text: 'Request / Pending Orders', icon: <HistoryIcon />, path: '/dashboard/pending-orders', roles: ['FIELD_OFFICER'] },
    // { text: 'Muster Approval', icon: <DoneAllIcon />, path: '/dashboard/muster-approval', roles: ['FIELD_OFFICER'] }, // Removed as per request (Manager Only)
    // Muster Review removed for Field Officer

    { text: 'KPIs', icon: <AssessmentIcon />, path: '/dashboard/kpis', roles: ['FIELD_OFFICER', 'MANAGER'] },
    { text: 'Crop Book', icon: <MenuBookIcon />, path: '/dashboard/crop-book-fo', roles: ['FIELD_OFFICER'] },
    { text: 'Cost Analysis', icon: <AttachMoneyIcon />, path: '/dashboard/cost-analysis', roles: ['FIELD_OFFICER'] },
    { text: 'Correspondence', icon: <ChatIcon />, path: '/dashboard/correspondence', roles: ['FIELD_OFFICER', 'MANAGER', 'STORE_KEEPER', 'ESTATE_ADMIN', 'CHIEF_CLERK'] },

    // Chief Clerk Specific Tabs
    { text: 'Norms & Aththama', icon: <SettingsIcon />, path: '/dashboard/norms', roles: ['CHIEF_CLERK', 'MANAGER'] },

    // Manager Specific Tabs
    { text: 'Pending Approvals', icon: <PendingActionsIcon />, path: '/dashboard/approvals', roles: ['MANAGER'] },
    { text: 'Muster Review', icon: <GroupIcon />, path: '/dashboard/muster-review-manager', roles: ['MANAGER'] },
    { text: 'Crop Book', icon: <MenuBookIcon />, path: '/dashboard/crop-book', roles: ['MANAGER'] },


    // Manager
    { text: 'Leave Management', icon: <EventAvailableIcon />, path: '/dashboard/leave-management', roles: ['MANAGER'] },

    // Estate Admin / Manager
    { text: 'Staff Management', icon: <PeopleIcon />, path: '/dashboard/users', roles: ['ESTATE_ADMIN'] }, // Removed MANAGER
    { text: 'Divisions', icon: <TerrainIcon />, path: '/dashboard/divisions', roles: ['ESTATE_ADMIN', 'MANAGER'] },

    // Common Operational
    { text: 'Harvest Logs', icon: <SpaIcon />, path: '/dashboard/harvest', roles: ['ESTATE_ADMIN', 'MANAGER'] }, // Field Officer uses specific tabs now

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
    const estateName = userSession.estateName || 'Plantation';
    const estateLogo = userSession.estateLogo;

    // Alert Count for Manager
    const [alertCount, setAlertCount] = useState(0);
    const [restockCount, setRestockCount] = useState(0);
    const [musterReviewCount, setMusterReviewCount] = useState(0);
    const [eveningPendingCount, setEveningPendingCount] = useState(0);
    const [storePendingCount, setStorePendingCount] = useState(0); // Store Keeper Approved FOs count
    const [pendingDivisions, setPendingDivisions] = useState<string[]>([]);
    const [unreadChatCount, setUnreadChatCount] = useState(0);
    const [workerApprovalCount, setWorkerApprovalCount] = useState(0);

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
            // Stock Alerts
            const res = await axios.get(`/api/inventory?tenantId=${userSession.tenantId}`);
            const items = res.data;
            const count = items.filter((i: any) => i.bufferLevel === 0 || i.currentQuantity < i.bufferLevel).length;
            setAlertCount(count);

            // Restock Requests (Pending) - For Manager
            // Restock Requests (Pending) - For Manager + Muster Review
            if (userRole === 'MANAGER' || userRole === 'MANAGER_CLERK') {
                const transRes = await axios.get(`/api/inventory/transactions?tenantId=${userSession.tenantId}`);
                // Count Pending Restocks OR FO Requisitions
                const reqCount = transRes.data.filter((t: any) =>
                    (t.type === 'RESTOCK_REQUEST' || t.type === 'FO_REQUISITION') &&
                    (t.status === 'PENDING' || t.status === null)
                ).length;
                setRestockCount(reqCount);

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
            }

            // Store Keeper Alerts
            if (userRole === 'STORE_KEEPER') {
                const transRes = await axios.get(`/api/inventory/transactions?tenantId=${userSession.tenantId}`);
                const approvedCount = transRes.data.filter((t: any) =>
                    t.type === 'FO_REQUISITION' && t.status === 'APPROVED'
                ).length;
                setStorePendingCount(approvedCount);
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

    const handleLogout = () => {
        sessionStorage.removeItem('user');
        navigate('/login');
    };

    // Integrate Divisions into Menu
    // For Managers, we put Divisions at the top like the reference image


    // We'll just render Divisions manually in the list below
    const effectiveRoles = userRole === 'MANAGER_CLERK' ? ['MANAGER', 'CHIEF_CLERK'] : [userRole];

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
    });

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
                                {item.text === 'Pending Approvals' && (userRole === 'MANAGER' || userRole === 'MANAGER_CLERK') && (alertCount + restockCount) > 0 ? (
                                    <Badge badgeContent={alertCount + restockCount} color="error">
                                        {item.icon}
                                    </Badge>
                                ) : item.text === 'Pending Approvals' && userRole === 'STORE_KEEPER' && storePendingCount > 0 ? (
                                    <Badge badgeContent={storePendingCount} color="error">
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
