import { Box, CssBaseline } from '@mui/material';
import { Outlet, useNavigate } from 'react-router-dom';
import SuperAdminSidebar from '../components/SuperAdminSidebar';
import { useEffect } from 'react';

export default function SuperAdminLayout() {
    const navigate = useNavigate();

    useEffect(() => {
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        if (!user.role) {
            navigate('/login');
        } else if (user.role !== 'SUPER_ADMIN') {
            navigate('/dashboard');
        }
    }, [navigate]);

    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />
            <SuperAdminSidebar />
            <Box component="main" sx={{ flexGrow: 1, height: '100vh', overflow: 'auto', bgcolor: '#f5f5f5' }}>
                <Outlet />
            </Box>
        </Box>
    );
}
