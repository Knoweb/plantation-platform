import React, { ReactNode } from 'react';
import { Box, Paper, Typography, Divider } from '@mui/material';

interface DashboardCardProps {
    title: string;
    filters?: ReactNode;
    children: ReactNode;
    subtitle?: string;
    icon?: ReactNode;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, filters, children, subtitle, icon }) => {
    return (
        <Paper 
            elevation={0} 
            variant="outlined" 
            sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                borderRadius: 2,
                overflow: 'hidden',
                borderColor: '#e0e0e0',
                bgcolor: '#ffffff'
            }}
        >
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={1}>
                        {icon && <Box sx={{ color: '#10b981' }}>{icon}</Box>}
                        <Box>
                            <Typography variant="subtitle1" fontWeight="700" color="#1e293b">
                                {title}
                            </Typography>
                            {subtitle && (
                                <Typography variant="caption" color="text.secondary">
                                    {subtitle}
                                </Typography>
                            )}
                        </Box>
                    </Box>
                    {filters && (
                        <Box display="flex" gap={1} alignItems="center">
                            {filters}
                        </Box>
                    )}
                </Box>
            </Box>
            <Divider />
            <Box sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column' }}>
                {children}
            </Box>
        </Paper>
    );
};

export default DashboardCard;
