import { useState } from 'react';
import {
    Box,
    Stepper,
    Step,
    StepLabel,
    Button,
    Typography,
    Paper,
    Container
} from '@mui/material';
import axios from 'axios';
import BasicInfoStep from './steps/BasicInfoStep';
import LogoUploadStep from './steps/LogoUploadStep';
import DivisionsStep from './steps/DivisionsStep';
import ConfigurationStep from './steps/ConfigurationStep';
import { useLocation, useNavigate } from 'react-router-dom';

const steps = ['Estate Details', 'Branding', 'Manage Divisions', 'Select Crops'];


interface TenantOnboardingProps {
    isModal?: boolean;
    onClose?: () => void;
}

export default function TenantOnboarding({ isModal = false, onClose }: TenantOnboardingProps) {
    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const location = useLocation();
    const navigate = useNavigate();
    const fromAdmin = location.state?.fromAdmin || isModal; // Force fromAdmin if in modal (Super Admin context)

    const [tenantData, setTenantData] = useState({
        companyName: '',
        // Subdomain will be generated
        adminUsername: '',
        adminEmail: '',
        adminPassword: '',
        logo: '',
        divisions: [],
        configJson: {
            tea: true,
            rubber: false,
            cinnamon: false
        } as Record<string, boolean>
    });

    const isStepValid = () => {
        switch (activeStep) {
            case 0: // Basic Info
                return (
                    tenantData.companyName?.trim() !== '' &&
                    tenantData.adminEmail?.trim() !== '' &&
                    tenantData.adminUsername?.trim() !== '' &&
                    tenantData.adminPassword?.length >= 8
                );
            case 1: // Branding
                return true; // Optional
            case 2: // Divisions
                return true; // Optional
            case 3: // Configuration
                // At least one crop selected
                const keys = Object.keys(tenantData.configJson);
                return keys.some(key => tenantData.configJson[key]);
            default:
                return false;
        }
    };

    const handleNext = async () => {
        // Final Step submission logic
        if (activeStep === steps.length - 1) {
            setLoading(true);
            setError('');
            try {
                // Auto-generate subdomain from company name (lowercase, alphanumeric only)
                const generatedSubDomain = tenantData.companyName
                    ? tenantData.companyName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20)
                    : 'estate-' + Math.floor(Math.random() * 10000);

                // 1. Create Tenant & Admin User
                const response = await axios.post('/api/tenants', {
                    companyName: tenantData.companyName,
                    subDomain: generatedSubDomain,
                    adminUsername: tenantData.adminUsername,
                    adminEmail: tenantData.adminEmail,
                    adminPassword: tenantData.adminPassword,
                    logoUrl: tenantData.logo,
                    configJson: tenantData.configJson,
                    divisions: tenantData.divisions
                });

                // 2. TODO: Call API to save Divisions (after we build that endpoint)
                // 3. TODO: Call API to save Logo URL (after we build S3)

                setActiveStep((prev) => prev + 1);
            } catch (err: any) {
                console.error(err);
                setError(err.response?.data?.message || 'Failed to create estate. Connection refused or server error.');
            } finally {
                setLoading(false);
            }
        } else {
            setActiveStep((prev) => prev + 1);
        }
    };

    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
    };

    const getStepContent = (step: number) => {
        switch (step) {
            case 0:
                return <BasicInfoStep data={tenantData} updateData={setTenantData} />;
            case 1:
                return <LogoUploadStep data={tenantData} updateData={setTenantData} />;
            case 2:
                return <DivisionsStep data={tenantData} updateData={setTenantData} />;
            case 3:
                return <ConfigurationStep data={tenantData} updateData={setTenantData} />;
            default:
                return 'Unknown step';
        }
    };

    return (
        <Container maxWidth="md" sx={{ mt: isModal ? 0 : 8, mb: isModal ? 0 : 4, p: isModal ? 0 : 2 }}>
            <Paper elevation={isModal ? 0 : 3} sx={{ p: isModal ? 2 : 4, borderRadius: 3 }}>
                <Typography component="h1" variant={isModal ? "h5" : "h4"} align="center" gutterBottom color="primary">
                    Register Your Estate
                </Typography>

                <Stepper activeStep={activeStep} alternativeLabel sx={{ pt: isModal ? 1 : 3, pb: isModal ? 2 : 5 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                <Box>
                    {activeStep === steps.length ? (
                        <Box textAlign="center">
                            <Typography variant="h5" gutterBottom color="success.main">
                                Registration Successful!
                            </Typography>
                            <Typography variant="subtitle1" paragraph>
                                {fromAdmin ? (
                                    <>
                                        Estate <strong>{tenantData.companyName}</strong> has been created successfully.
                                        You can now manage it from the dashboard.
                                    </>
                                ) : (
                                    <>
                                        Welcome, <strong>{tenantData.companyName}</strong>.
                                    </>
                                )}
                            </Typography>
                            <Typography variant="body1">
                                Admin account <strong>{tenantData.adminUsername}</strong> is ready.
                            </Typography>

                            <Button
                                onClick={() => {
                                    if (onClose) {
                                        onClose();
                                    } else if (fromAdmin) {
                                        navigate('/super-admin');
                                    } else {
                                        navigate('/login');
                                    }
                                }}
                                variant="contained"
                                sx={{ mt: 4 }}
                            >
                                {fromAdmin ? "Return to Super Admin Dashboard" : "Proceed to Login"}
                            </Button>
                        </Box>
                    ) : (
                        <>
                            {error && (
                                <Typography color="error" variant="body2" sx={{ mb: 2, textAlign: 'center', bgcolor: '#ffebee', p: 1, borderRadius: 1 }}>
                                    {error}
                                </Typography>
                            )}

                            {getStepContent(activeStep)}

                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
                                {activeStep !== 0 && (
                                    <Button onClick={handleBack} sx={{ mr: 1 }} disabled={loading}>
                                        Back
                                    </Button>
                                )}
                                <Button
                                    variant="contained"
                                    onClick={handleNext}
                                    disabled={loading || !isStepValid()}
                                    sx={{ borderRadius: 2, px: 4 }}
                                >
                                    {loading ? 'Registering...' : (activeStep === steps.length - 1 ? 'Finish' : 'Next')}
                                </Button>
                            </Box>
                        </>
                    )}
                </Box>
            </Paper>
        </Container>
    );
}
