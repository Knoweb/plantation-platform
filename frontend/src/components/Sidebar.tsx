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
} from '@mui/material';
import { useState, useEffect } from 'react';
import axios from 'axios';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SpaIcon from '@mui/icons-material/Spa';
import InventoryIcon from '@mui/icons-material/Inventory';
import LogoutIcon from '@mui/icons-material/Logout';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import GroupIcon from '@mui/icons-material/Group';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TerrainIcon from '@mui/icons-material/Terrain';
import SettingsIcon from '@mui/icons-material/Settings';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import HistoryIcon from '@mui/icons-material/History';
import EngineeringIcon from '@mui/icons-material/Engineering';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 260;

const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', roles: ['ESTATE_ADMIN', 'MANAGER', 'FIELD_OFFICER'] },

    // Field Officer Specific Tabs
    { text: 'Morning Muster', icon: <PendingActionsIcon />, path: '/dashboard/morning-muster', roles: ['FIELD_OFFICER'] },
    { text: 'Evening Muster', icon: <AssignmentTurnedInIcon />, path: '/dashboard/evening-muster', roles: ['FIELD_OFFICER'] },
    { text: 'Workers', icon: <EngineeringIcon />, path: '/dashboard/workers', roles: ['FIELD_OFFICER'] },
    { text: 'Crop Achievements', icon: <TrendingUpIcon />, path: '/dashboard/crop-achievements', roles: ['FIELD_OFFICER'] },
    // { text: 'Muster Approval', icon: <DoneAllIcon />, path: '/dashboard/muster-approval', roles: ['FIELD_OFFICER'] }, // Removed as per request (Manager Only)
    { text: 'Muster Review', icon: <GroupIcon />, path: '/dashboard/muster-review', roles: ['FIELD_OFFICER'] },
    { text: 'General Stock', icon: <InventoryIcon />, path: '/dashboard/stock', roles: ['FIELD_OFFICER', 'MANAGER'] }, // Shared with Mgr
    { text: 'KPIs', icon: <AssessmentIcon />, path: '/dashboard/kpis', roles: ['FIELD_OFFICER', 'MANAGER'] },

    // Manager Specific Tabs
    { text: 'Pending Approvals', icon: <PendingActionsIcon />, path: '/dashboard/approvals', roles: ['MANAGER'] },
    { text: 'Muster Review', icon: <GroupIcon />, path: '/dashboard/muster-review-manager', roles: ['MANAGER'] },
    { text: 'Crop Book', icon: <MenuBookIcon />, path: '/dashboard/crop-book', roles: ['MANAGER'] },
    { text: 'Attendance', icon: <HistoryIcon />, path: '/dashboard/attendance', roles: ['MANAGER'] },


    // Estate Admin / Manager
    { text: 'Staff Management', icon: <PeopleIcon />, path: '/dashboard/users', roles: ['ESTATE_ADMIN'] }, // Removed MANAGER
    { text: 'Divisions', icon: <TerrainIcon />, path: '/dashboard/divisions', roles: ['ESTATE_ADMIN', 'MANAGER'] },

    // Common Operational
    { text: 'Harvest Logs', icon: <SpaIcon />, path: '/dashboard/harvest', roles: ['ESTATE_ADMIN', 'MANAGER'] }, // Field Officer uses specific tabs now

    // Store Keeper
    { text: 'Inventory', icon: <InventoryIcon />, path: '/dashboard/inventory', roles: ['STORE_KEEPER'] },
    { text: 'Recent Transactions', icon: <HistoryIcon />, path: '/dashboard/store/history', roles: ['STORE_KEEPER'] },

    // Settings
    { text: 'Configuration', icon: <SettingsIcon />, path: '/dashboard/settings', roles: ['ESTATE_ADMIN'] },
];
export default function Sidebar() {
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

    // State for Divisions
    const [divisions, setDivisions] = useState<any[]>([]);

    useEffect(() => {
        if (userSession.tenantId) {
            fetchDivisions();
            if (userRole === 'MANAGER') {
                fetchAlerts();
            }
        }
    }, [userRole, userSession.tenantId]);

    const fetchDivisions = async () => {
        try {
            const res = await axios.get(`/api/divisions?tenantId=${userSession.tenantId}`);
            // Filter if user has restricted access (e.g. Field Officer with specific list)
            // For now, load all or filter by session access
            let loaded = res.data;
            if (userSession.divisionAccess && userSession.divisionAccess.length > 0) {
                loaded = loaded.filter((d: any) => userSession.divisionAccess.includes(d.divisionId));
            }
            setDivisions(loaded);
        } catch (err) {
            console.warn("Failed to fetch divisions for sidebar", err);
        }
    };

    const fetchAlerts = async () => {
        try {
            // Stock Alerts
            const res = await axios.get(`/api/inventory?tenantId=${userSession.tenantId}`);
            const items = res.data;
            const count = items.filter((i: any) => i.bufferLevel === 0 || i.currentQuantity < i.bufferLevel).length;
            setAlertCount(count);

            // Restock Requests (Pending) - For Manager
            if (userRole === 'MANAGER') {
                const transRes = await axios.get(`/api/inventory/transactions?tenantId=${userSession.tenantId}`);
                // Count Pending Only
                const reqCount = transRes.data.filter((t: any) => t.type === 'RESTOCK_REQUEST' && (t.status === 'PENDING' || t.status === null)).length;
                setRestockCount(reqCount);
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
    const divisionItems = divisions.map(d => ({
        text: d.name,
        icon: <TerrainIcon />,
        path: `/dashboard/division/${d.divisionId}`,
        roles: ['MANAGER', 'ESTATE_ADMIN', 'FIELD_OFFICER'],
        isDivision: true // Marker for styling
    }));

    const finalMenuItems = [
        ...menuItems.filter(m => !m.text.includes('Divisions')), // Remove generic 'Divisions' link if we show list
        ...((userRole === 'MANAGER' || userRole === 'ESTATE_ADMIN') ? [] : []) // Logic to insert divisions
    ];

    // We'll just render Divisions manually in the list below

    const filteredMenuItems = menuItems.filter(item =>
        !item.roles || (userRole && item.roles.includes(userRole))
    );

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: drawerWidth,
                flexShrink: 0,
                [`& .MuiDrawer-paper`]: {
                    width: drawerWidth,
                    boxSizing: 'border-box',
                    background: userRole === 'ESTATE_ADMIN' ? 'linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)' : '#2e7d32',
                    color: 'white',
                    borderRight: 'none',
                    boxShadow: 4
                },
            }}
        >
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


                {/* Dynamic Divisions List - Hide for Store Keeper */}
                {['MANAGER', 'ESTATE_ADMIN', 'FIELD_OFFICER'].includes(userRole) && divisions.map((d) => (
                    <ListItem key={d.divisionId} disablePadding sx={{ mb: 1 }}>
                        <ListItemButton
                            onClick={() => navigate(`/dashboard?divisionId=${d.divisionId}`)}
                            selected={location.search.includes(d.divisionId)}
                            sx={{
                                borderRadius: 2, // Match Menu Items
                                mx: 1, // Match Menu Items margin
                                minHeight: 48,
                                justifyContent: 'initial',
                                bgcolor: location.search.includes(d.divisionId) ? 'rgba(255,255,255,0.2)' : 'transparent',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                                '&.Mui-selected:hover': { bgcolor: 'rgba(255,255,255,0.25)' }
                            }}
                        >
                            <ListItemIcon sx={{ color: 'white', minWidth: 40, justifyContent: 'center', mr: 2 }}>
                                <TerrainIcon fontSize="medium" />
                            </ListItemIcon>
                            <ListItemText
                                primary={d.name}
                                primaryTypographyProps={{ fontSize: '1rem', fontWeight: 500 }} // Standardize
                            />
                        </ListItemButton>
                    </ListItem>
                ))}



                {/* Standard Menu Items */}
                {filteredMenuItems.map((item) => (
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
                                {item.text === 'General Stock' && (alertCount + restockCount) > 0 ? (
                                    <Badge badgeContent={alertCount + restockCount} color="error">
                                        {item.icon}
                                    </Badge>
                                ) : (
                                    item.icon
                                )}
                            </ListItemIcon>
                            <ListItemText
                                primary={item.text}
                                primaryTypographyProps={{ fontSize: '1rem', fontWeight: 500 }} // Standardize
                            />
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
        </Drawer>
    );
}
