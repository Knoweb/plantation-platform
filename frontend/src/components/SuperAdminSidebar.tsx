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
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 260;

const menuItems = [
    { text: 'Estates Overview', icon: <DashboardIcon />, path: '/super-admin' },
    // We can add more global settings here later
];

export default function SuperAdminSidebar() {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: drawerWidth,
                flexShrink: 0,
                [`& .MuiDrawer-paper`]: {
                    width: drawerWidth,
                    boxSizing: 'border-box',
                    bgcolor: 'primary.main', // Unified Plantation Green
                    color: 'white',
                    borderRight: 'none',
                    boxShadow: '4px 0 10px rgba(0,0,0,0.1)' // Soft shadow for depth
                },
            }}
        >
            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                    SUPER ADMIN
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

                {/* Special 'Add Estate' Button in Sidebar */}
                <ListItem disablePadding>
                    <ListItemButton
                        onClick={() => navigate('/register', { state: { fromAdmin: true } })}
                        sx={{
                            bgcolor: 'rgba(255, 255, 255, 0.15)', // White transparent
                            mx: 1,
                            borderRadius: 2,
                            mb: 1,
                            border: '1px solid rgba(255,255,255,0.3)',
                            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.25)' }
                        }}
                    >
                        <ListItemIcon sx={{ color: 'white' }}><AddBusinessIcon /></ListItemIcon>
                        <ListItemText primary="New Estate" primaryTypographyProps={{ color: 'white', fontWeight: 'bold' }} />
                    </ListItemButton>
                </ListItem>
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
