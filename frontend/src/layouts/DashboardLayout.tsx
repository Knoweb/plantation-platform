import { useState } from 'react';
import { Box, Toolbar } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const drawerWidth = 260;

export default function DashboardLayout() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    return (
        <Box sx={{ display: 'flex' }}>
            <Header handleDrawerToggle={handleDrawerToggle} drawerWidth={drawerWidth} />
            <Sidebar mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} drawerWidth={drawerWidth} />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: { xs: 1, sm: 2, md: 3 },
                    bgcolor: 'background.default',
                    minHeight: '100vh',
                    minWidth: 0,
                    width: 0,
                    flexBasis: 0,
                }}
            >
                <Toolbar /> {/* Spacer for fixed Header */}
                <Outlet key={location.pathname} />
            </Box>
        </Box>
    );
}
