import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        primary: {
            main: '#2E7D32', // Plantation Green
            light: '#4CAF50',
            dark: '#1B5E20',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#FFC107', // Amber for warnings/highlights
            light: '#FFD54F',
            dark: '#FFA000',
            contrastText: '#000000',
        },
        background: {
            default: '#F4F6F8', // Light Grey for dashboard background
            paper: '#FFFFFF',
        },
        text: {
            primary: '#263238',
            secondary: '#546E7A',
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
            fontWeight: 700,
        },
        h2: {
            fontWeight: 600,
        },
        h3: {
            fontWeight: 600,
        },
        h4: {
            fontWeight: 600,
        },
        h5: {
            fontWeight: 500,
        },
        h6: {
            fontWeight: 500,
        },
        button: {
            textTransform: 'none', // More modern feel than uppercase
            fontWeight: 500,
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
                },
            },
        },
    },
});

export default theme;
