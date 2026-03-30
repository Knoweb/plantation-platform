import { AppBar, Toolbar, Typography, IconButton, Box, Avatar, Menu, MenuItem } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MenuIcon from '@mui/icons-material/Menu';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@mui/material';
import axios from 'axios';

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

    // Load user info into state so it can react to live updates (e.g. estate name change)
    const readSession = () => {
        const s = JSON.parse(sessionStorage.getItem('user') || '{}');
        return {
            displayName: s.estateName || s.fullName || s.username || 'Guest User',  // estateName wins
            email: s.username || '',
            role: s.role || 'Visitor',
            tenantId: s.tenantId || '',
            userId: s.userId || s.id || '',
        };
    };
    const [userInfo, setUserInfo] = useState(readSession);
    const userDisplayName = userInfo.displayName;
    const userEmail = userInfo.email;
    const userRole = userInfo.role;

    useEffect(() => {
        // Fetch live estate name from tenant API (same source as Sidebar)
        const fetchLiveInfo = async () => {
            const session = JSON.parse(sessionStorage.getItem('user') || '{}');
            const tenantId = session.tenantId;
            if (!tenantId) return;
            try {
                const res = await axios.get(`/api/tenants/${tenantId}`);
                const tenant = res.data;
                const name = tenant?.companyName || tenant?.name;
                if (name) {
                    session.estateName = name;
                    sessionStorage.setItem('user', JSON.stringify(session));
                    setUserInfo(prev => ({ ...prev, displayName: name }));
                }
            } catch {
                // Silently keep using session values
            }
        };
        fetchLiveInfo();
        const interval = setInterval(fetchLiveInfo, 30000);

        // Also react to Sidebar's estate-name update event — re-read session which now has estateName
        const handleSessionUpdate = () => setUserInfo(readSession());
        window.addEventListener('user-session-updated', handleSessionUpdate);

        return () => {
            clearInterval(interval);
            window.removeEventListener('user-session-updated', handleSessionUpdate);
        };
    }, []);

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
                        gap={1.5}
                        sx={{ 
                            cursor: 'pointer',
                            p: 0.5,
                            px: 1,
                            borderRadius: '12px',
                            transition: 'all 0.2s',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
                        }}
                        onClick={handleMenu}
                    >
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#2e7d32', fontSize: '0.9rem', fontWeight: 'bold', boxShadow: '0 2px 8px rgba(46, 125, 50, 0.2)' }}>
                            {userDisplayName.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                            <Typography variant="subtitle2" color="text.primary" fontWeight="700" lineHeight={1.1}>
                                {userDisplayName}
                            </Typography>

                        </Box>
                    </Box>

                    <Menu
                        id="menu-appbar"
                        anchorEl={anchorEl}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                        }}
                        keepMounted
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                        open={Boolean(anchorEl)}
                        onClose={handleClose}
                        PaperProps={{
                            elevation: 3,
                            sx: {
                                mt: 1,
                                minWidth: 200,
                                borderRadius: 2,
                                border: '1px solid #eee'
                            }
                        }}
                    >
                        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #f0f0f0', mb: 1 }}>
                            <Typography variant="subtitle2" fontWeight="800" color="primary">Account</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                                Logged in as: <strong>{userRole.replace('_', ' ')}</strong>
                            </Typography>
                        </Box>
                        <MenuItem onClick={handleLogout} sx={{ color: 'error.main', fontWeight: 'bold', py: 1.5 }}>
                            Logout
                        </MenuItem>
                    </Menu>
                </Box>
            </Toolbar>
        </AppBar>
    );
}
