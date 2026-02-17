import { AppBar, Toolbar, Typography, IconButton, Box, Avatar, Menu, MenuItem } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SearchIcon from '@mui/icons-material/Search';
import MenuIcon from '@mui/icons-material/Menu';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
    handleDrawerToggle: () => void;
    drawerWidth: number;
}

export default function Header({ handleDrawerToggle, drawerWidth }: HeaderProps) {
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

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

                <Typography variant="h6" noWrap component="div" sx={{ color: 'text.primary', fontWeight: 'bold', flexGrow: 1, textTransform: 'capitalize' }}>
                    {dashboardTitle}
                </Typography>

                <Box display="flex" alignItems="center" gap={1}>
                    <IconButton>
                        <SearchIcon color="action" />
                    </IconButton>
                    <IconButton>
                        <NotificationsIcon color="action" />
                    </IconButton>

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
                        <Box>
                            <Typography variant="subtitle2" color="text.primary" lineHeight={1}>
                                {userName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {userRole}
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
