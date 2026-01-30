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

const steps = ['Estate Details', 'Branding', 'Manage Divisions', 'Select Crops'];

export default function TenantOnboarding() {
    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [tenantData, setTenantData] = useState({
        companyName: '',
        // Subdomain will be generated
        adminUsername: '',
        adminPassword: '',
        logo: '',
        divisions: [],
        configJson: {
            tea: true,
            rubber: false,
            cinnamon: false
        }
    });

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
                await axios.post('http://localhost:8080/api/tenants', {
                    companyName: tenantData.companyName,
                    subDomain: generatedSubDomain,
                    adminUsername: tenantData.adminUsername,
                    adminPassword: tenantData.adminPassword,
                    logoUrl: tenantData.logo, // Send the Logo URL
                    configJson: tenantData.configJson
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
        <Container maxWidth="md" sx={{ mt: 8, mb: 4 }}>
            <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
                <Typography component="h1" variant="h4" align="center" gutterBottom color="primary">
                    Register Your Estate
                </Typography>

                <Stepper activeStep={activeStep} alternativeLabel sx={{ pt: 3, pb: 5 }}>
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
                                Welcome, <strong>{tenantData.companyName}</strong>.
                            </Typography>
                            <Typography variant="body1">
                                Your admin account <strong>{tenantData.adminUsername}</strong> has been created.
                            </Typography>

                            <Button href="/login" variant="contained" sx={{ mt: 4 }}>
                                Proceed to Login
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
                                    disabled={loading}
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
