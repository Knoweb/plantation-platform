import { Box, CssBaseline, Dialog, DialogContent, IconButton } from '@mui/material';
import { Outlet, useNavigate } from 'react-router-dom';
import SuperAdminSidebar from '../components/SuperAdminSidebar';
import { useEffect, useState } from 'react';
import TenantOnboarding from '../pages/super-admin/TenantOnboarding';
import CloseIcon from '@mui/icons-material/Close';

export default function SuperAdminLayout() {
    const navigate = useNavigate();
    const [isNewEstateOpen, setIsNewEstateOpen] = useState(false);

    useEffect(() => {
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        if (!user.role) {
            navigate('/login');
        } else if (user.role !== 'SUPER_ADMIN') {
            navigate('/dashboard');
        }
    }, [navigate]);

    return (
        <>
            <Box
                sx={{
                    display: 'flex',
                    filter: isNewEstateOpen ? 'blur(5px)' : 'none',
                    transition: 'filter 0.3s ease',
                    pointerEvents: isNewEstateOpen ? 'none' : 'auto'
                }}
            >
                <CssBaseline />
                <SuperAdminSidebar onNewEstateClick={() => setIsNewEstateOpen(true)} />

                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        height: '100vh',
                        overflow: 'auto',
                        bgcolor: '#f5f5f5'
                    }}
                >
                    <Outlet />
                </Box>
            </Box>

            {/* Modal for New Estate */}
            <Dialog
                open={isNewEstateOpen}
                onClose={() => setIsNewEstateOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        boxShadow: 24,
                        maxHeight: '90vh',
                        m: 2
                    }
                }}
            >
                <Box sx={{ position: 'relative' }}>
                    <IconButton
                        onClick={() => setIsNewEstateOpen(false)}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            zIndex: 1,
                            color: 'grey.500'
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                    <DialogContent sx={{ p: 0 }}>
                        <TenantOnboarding isModal={true} onClose={() => setIsNewEstateOpen(false)} />
                    </DialogContent>
                </Box>
            </Dialog>
        </>
    );
}
