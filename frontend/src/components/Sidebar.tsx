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
} from '@mui/material';
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
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 260;

const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', roles: ['ESTATE_ADMIN', 'MANAGER', 'FIELD_OFFICER'] },

    // Field Officer Specific Tabs
    { text: 'Crop Achievements', icon: <TrendingUpIcon />, path: '/dashboard/crop-achievements', roles: ['FIELD_OFFICER'] },
    { text: 'Muster Approval', icon: <DoneAllIcon />, path: '/dashboard/muster-approval', roles: ['FIELD_OFFICER'] },
    { text: 'Muster Review', icon: <GroupIcon />, path: '/dashboard/muster-review', roles: ['FIELD_OFFICER'] },
    { text: 'General Stock', icon: <InventoryIcon />, path: '/dashboard/stock', roles: ['FIELD_OFFICER', 'MANAGER'] }, // Shared with Mgr
    { text: 'KPIs', icon: <AssessmentIcon />, path: '/dashboard/kpis', roles: ['FIELD_OFFICER', 'MANAGER'] },

    // Manager Specific Tabs
    { text: 'Pending Approvals', icon: <PendingActionsIcon />, path: '/dashboard/approvals', roles: ['MANAGER'] },
    { text: 'Crop Book', icon: <MenuBookIcon />, path: '/dashboard/crop-book', roles: ['MANAGER'] },

    // Estate Admin / Manager
    { text: 'Staff Management', icon: <PeopleIcon />, path: '/dashboard/users', roles: ['ESTATE_ADMIN', 'MANAGER'] },
    { text: 'Divisions', icon: <TerrainIcon />, path: '/dashboard/divisions', roles: ['ESTATE_ADMIN', 'MANAGER'] },

    // Common Operational
    { text: 'Harvest Logs', icon: <SpaIcon />, path: '/dashboard/harvest', roles: ['ESTATE_ADMIN', 'MANAGER'] }, // Field Officer uses specific tabs now

    // Store Keeper
    { text: 'Inventory', icon: <InventoryIcon />, path: '/dashboard/inventory', roles: ['STORE_KEEPER'] },

    // Settings
    { text: 'Configuration', icon: <SettingsIcon />, path: '/dashboard/settings', roles: ['ESTATE_ADMIN'] },
];
export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();

    // Load estate name & logo from backend session
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const estateName = userSession.estateName || 'EstateIQ';
    const estateLogo = userSession.estateLogo;
    const userRole = userSession.role;

    // Filter menu items based on role
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
                    background: userRole === 'ESTATE_ADMIN'
                        ? 'linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)' // Premium Gradient for Admin
                        : '#2e7d32', // Standard Flat Green for Staff
                    color: 'white',
                    borderRight: 'none',
                    boxShadow: 4
                },
            }}
        >
            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                {/* Dynamic Logo Box - No White Background, Larger Size */}
                <Box sx={{
                    width: 70,
                    height: 70,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0
                }}>
                    {estateLogo ? (
                        <img src={estateLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                        <Box sx={{ width: 50, height: 50, bgcolor: 'white', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <SpaIcon color="primary" fontSize="large" />
                        </Box>
                    )}
                </Box>

                <Typography
                    variant="subtitle1"
                    fontWeight="bold"
                    sx={{
                        lineHeight: 1.2,
                        textTransform: 'uppercase', // Capitalized Name
                        letterSpacing: 1
                    }}
                >
                    {estateName}
                </Typography>
            </Box>

            <Divider sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />

            <List sx={{ mt: 2 }}>
                {filteredMenuItems.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton
                            onClick={() => navigate(item.path)}
                            selected={location.pathname === item.path}
                            sx={{
                                '&.Mui-selected': {
                                    bgcolor: 'rgba(255,255,255,0.2)',
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                                },
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                                mx: 1,
                                borderRadius: 2,
                                mb: 1
                            }}
                        >
                            <ListItemIcon sx={{ color: 'white' }}>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>

            <Box sx={{ mt: 'auto', p: 2 }}>
                <ListItemButton onClick={() => { sessionStorage.removeItem('user'); navigate('/login'); }} sx={{ borderRadius: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                    <ListItemIcon sx={{ color: 'white' }}><LogoutIcon /></ListItemIcon>
                    <ListItemText primary="Logout" />
                </ListItemButton>
            </Box>
        </Drawer>
    );
}
