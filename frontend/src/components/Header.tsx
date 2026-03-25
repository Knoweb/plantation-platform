import { AppBar, Toolbar, Typography, IconButton, Box, Avatar, Menu, MenuItem } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MenuIcon from '@mui/icons-material/Menu';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@mui/material';

interface HeaderProps {
    handleDrawerToggle: () => void;
    drawerWidth: number;
}

export default function Header({ handleDrawerToggle, drawerWidth }: HeaderProps) {
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
    const [globalAlerts, setGlobalAlerts] = useState<{ total: number, alertsList: any[] }>({ total: 0, alertsList: [] });

    useEffect(() => {
        const handleGlobalAlerts = (e: any) => {
            if (e.detail) {
                setGlobalAlerts({ total: e.detail.total, alertsList: e.detail.alertsList });
            }
        };

        window.addEventListener('global-alerts-update', handleGlobalAlerts);
        return () => window.removeEventListener('global-alerts-update', handleGlobalAlerts);
    }, []);

    // Load user info
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const userName = userSession.username || 'Guest User';
    const userRole = userSession.role || 'Visitor';

    const getDashboardTitle = (role: string) => {
        switch (role) {
            case 'MANAGER': return 'Manager Dashboard';
            case 'ESTATE_ADMIN': return 'Estate Admin Dashboard';
            case 'FIELD_OFFICER': return 'Field Officer Dashboard';
            case 'STORE_KEEPER': return 'Store Keeper Dashboard';
            default: return 'Plantation Dashboard';
        }
    };
    const dashboardTitle = getDashboardTitle(userRole);

    const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        sessionStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <AppBar
            position="fixed"
            color="default"
            elevation={0}
            sx={{
                width: { sm: `calc(100% - ${drawerWidth}px)` },
                ml: { sm: `${drawerWidth}px` },
                bgcolor: 'background.default', // Matches page background so it floats
                borderBottom: '1px solid #e0e0e0'
            }}
        >
            <Toolbar>
                <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    edge="start"
                    onClick={handleDrawerToggle}
                    sx={{ mr: 2, display: { sm: 'none' } }}
                >
                    <MenuIcon />
                </IconButton>

                <Typography variant="h6" noWrap component="div" sx={{ color: 'text.primary', fontWeight: 'bold', flexGrow: 1, textTransform: 'capitalize', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                    {dashboardTitle.replace('Dashboard', '').trim()}
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, ml: 0.5 }}>
                        Dashboard
                    </Box>
                </Typography>

                <Box display="flex" alignItems="center" gap={1}>
                    <IconButton onClick={(e) => setNotifAnchorEl(e.currentTarget)}>
                        <Badge badgeContent={globalAlerts.total} color="error">
                            <NotificationsIcon color="action" />
                        </Badge>
                    </IconButton>

                    {/* Notification Dropdown */}
                    <Menu
                        anchorEl={notifAnchorEl}
                        open={Boolean(notifAnchorEl)}
                        onClose={() => setNotifAnchorEl(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        PaperProps={{
                            elevation: 3,
                            sx: { width: 320, mt: 1.5, borderRadius: 2 }
                        }}
                    >
                        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #eee' }}>
                            <Typography variant="subtitle1" fontWeight="bold">Notifications</Typography>
                        </Box>

                        {globalAlerts.alertsList.length === 0 ? (
                            <MenuItem disabled sx={{ py: 2, justifyContent: 'center' }}>
                                <Typography variant="body2" color="text.secondary">No pending alerts</Typography>
                            </MenuItem>
                        ) : (
                            globalAlerts.alertsList.map((alert: any) => (
                                <MenuItem
                                    key={alert.id}
                                    onClick={() => {
                                        setNotifAnchorEl(null);
                                        navigate(alert.path);
                                    }}
                                    sx={{ borderBottom: '1px solid #f5f5f5', py: 1.5 }}
                                >
                                    <Box display="flex" alignItems="center" gap={1.5}>
                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }} />
                                        <Typography variant="body2">{alert.label}</Typography>
                                    </Box>
                                </MenuItem>
                            ))
                        )}
                    </Menu>

                    <Box
                        ml={1}
                        display="flex"
                        alignItems="center"
                        gap={1}
                        sx={{ cursor: 'pointer' }}
                        onClick={handleMenu}
                    >
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                            {userName.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                            <Typography variant="subtitle2" color="text.primary" lineHeight={1}>
                                {userName}
                            </Typography>
                        </Box>
                    </Box>

                    <Menu
                        id="menu-appbar"
                        anchorEl={anchorEl}
                        anchorOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                        keepMounted
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                        open={Boolean(anchorEl)}
                        onClose={handleClose}
                    >
                        <MenuItem onClick={handleClose}>Profile</MenuItem>
                        <MenuItem onClick={handleLogout}>Logout</MenuItem>
                    </Menu>
                </Box>
            </Toolbar>
        </AppBar>
    );
}
