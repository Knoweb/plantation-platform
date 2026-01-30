import { Box, CssBaseline } from '@mui/material';
import { Outlet } from 'react-router-dom';
import SuperAdminSidebar from '../components/SuperAdminSidebar';

export default function SuperAdminLayout() {
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
