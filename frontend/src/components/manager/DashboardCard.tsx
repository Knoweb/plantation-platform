import React, { type ReactNode } from 'react';
import { Box, Paper, Typography, Divider } from '@mui/material';

interface DashboardCardProps {
    title: string;
    filters?: ReactNode;
    children: ReactNode;
    subtitle?: string;
    icon?: ReactNode;
    variant?: 'emerald' | 'indigo' | 'amber' | 'slate';
}

const GRADIENTS = {
    emerald: {
        bg: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
        border: 'rgba(16, 185, 129, 0.12)',
        iconBg: '#f0fdf4',
        iconColor: '#10b981'
    },
    indigo: {
        bg: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
        border: 'rgba(59, 130, 246, 0.12)',
        iconBg: '#eff6ff',
        iconColor: '#3b82f6'
    },
    amber: {
        bg: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)',
        border: 'rgba(245, 158, 11, 0.12)',
        iconBg: '#fffbeb',
        iconColor: '#f59e0b'
    },
    slate: {
        bg: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
        border: 'rgba(71, 85, 105, 0.12)',
        iconBg: '#f1f5f9',
        iconColor: '#475569'
    }
};

const DashboardCard: React.FC<DashboardCardProps> = ({ title, filters, children, subtitle, icon, variant = 'slate' }) => {
    const config = GRADIENTS[variant];

    return (
        <Paper 
            elevation={0} 
            sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                borderRadius: 3,
                overflow: 'hidden',
                border: `1px solid ${config.border}`,
                background: config.bg,
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.04), 0 4px 6px -2px rgba(0, 0, 0, 0.01)',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
                }
            }}
        >
            <Box sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.2)', borderBottom: `1px solid ${config.border}` }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
                    <Box display="flex" alignItems="center" gap={1.5}>
                        {icon && (
                            <Box sx={{ 
                                color: config.iconColor, 
                                bgcolor: '#ffffff', 
                                p: 0.8, 
                                borderRadius: 1.5, 
                                display: 'flex', 
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)' 
                            }}>
                                {icon}
                            </Box>
                        )}
                        <Box>
                            <Typography variant="subtitle1" fontWeight="800" color="#1e293b" sx={{ whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
                                {title}
                            </Typography>
                            {subtitle && (
                                <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ opacity: 0.8 }}>
                                    {subtitle}
                                </Typography>
                            )}
                        </Box>
                    </Box>
                    {filters && (
                        <Box display="flex" gap={1} alignItems="center" flexWrap="wrap" justifyContent="flex-end" sx={{ flexGrow: 1 }}>
                            {filters}
                        </Box>
                    )}
                </Box>
            </Box>
            <Box sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column', bgcolor: 'transparent' }}>
                {children}
            </Box>
        </Paper>
    );
};

export default DashboardCard;
