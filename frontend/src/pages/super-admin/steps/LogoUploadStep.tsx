import { Box, Typography, Button, Paper, Input, Grid } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

interface Props {
    data: any;
    updateData: (data: any) => void;
}

export default function LogoUploadStep({ data, updateData }: Props) {
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            const reader = new FileReader();

            reader.onloadend = () => {
                // Store Base64 string
                updateData({ ...data, logo: reader.result as string });
            };

            reader.readAsDataURL(file);
        }
    };

    return (
        <Box sx={{ mt: 1, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
                Estate Branding
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
                Upload your estate logo. This will replace the default branding on all reports and dashboards.
            </Typography>

            <Box display="flex" justifyContent="center" mt={2}>
                <Paper
                    variant="outlined"
                    sx={{
                        p: 2,
                        borderStyle: 'dashed',
                        borderColor: 'primary.main',
                        bgcolor: 'background.default',
                        width: '100%',
                        maxWidth: 400
                    }}
                >
                    {data.logo ? (
                        <Box mb={2}>
                            <img
                                src={data.logo}
                                alt="Logo Preview"
                                style={{ maxHeight: 100, maxWidth: '100%', objectFit: 'contain' }}
                            />
                            <Typography variant="caption" display="block" color="success.main">
                                Logo Selected
                            </Typography>
                        </Box>
                    ) : (
                        <CloudUploadIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    )}

                    <Typography variant="body1" gutterBottom>
                        Drag and drop your logo here
                    </Typography>
                    <Typography variant="caption" display="block" gutterBottom>
                        or
                    </Typography>

                    <Button
                        component="label"
                        variant="contained"
                        startIcon={<CloudUploadIcon />}
                    >
                        Upload File
                        <Input
                            type="file"
                            sx={{ display: 'none' }}
                            onChange={handleFileChange}
                            inputProps={{ accept: "image/*" }}
                        />
                    </Button>
                </Paper>
            </Box>
        </Box>
    );
}
