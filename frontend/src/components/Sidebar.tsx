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
import ParkIcon from '@mui/icons-material/Park';
import SpaIcon from '@mui/icons-material/Spa';
import GroupsIcon from '@mui/icons-material/Groups';
import InventoryIcon from '@mui/icons-material/Inventory';
import LogoutIcon from '@mui/icons-material/Logout';
import PeopleIcon from '@mui/icons-material/People'; // Added
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 260;

const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Field Map', icon: <ParkIcon />, path: '/dashboard/map' },
    { text: 'Harvest Logs', icon: <SpaIcon />, path: '/dashboard/harvest' },
    { text: 'Muster', icon: <GroupsIcon />, path: '/dashboard/muster' },
    { text: 'Inventory', icon: <InventoryIcon />, path: '/dashboard/inventory' },
    { text: 'Staff', icon: <PeopleIcon />, path: '/dashboard/users' },
];

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();

    // Load estate name & logo from backend session
    const userSession = JSON.parse(localStorage.getItem('user') || '{}');
    const estateName = userSession.estateName || 'EstateIQ';
    const estateLogo = userSession.estateLogo;

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: drawerWidth,
                flexShrink: 0,
                [`& .MuiDrawer-paper`]: {
                    width: drawerWidth,
                    boxSizing: 'border-box',
                    bgcolor: 'primary.main', // Green Sidebar
                    color: 'white'
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
                {menuItems.map((item) => (
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
                <ListItemButton onClick={() => { localStorage.removeItem('user'); navigate('/login'); }} sx={{ borderRadius: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                    <ListItemIcon sx={{ color: 'white' }}><LogoutIcon /></ListItemIcon>
                    <ListItemText primary="Logout" />
                </ListItemButton>
            </Box>
        </Drawer>
    );
}
