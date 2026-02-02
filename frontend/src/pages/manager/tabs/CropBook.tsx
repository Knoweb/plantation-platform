import { Box, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Chip, Button } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';

export default function CropBook() {
    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                Crop Book
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={4}>
                Comprehensive records of planting schedules, growth stages, and yield analysis.
            </Typography>

            <Card>
                <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                        <Box display="flex" alignItems="center">
                            <MenuBookIcon color="success" sx={{ mr: 1, fontSize: 32 }} />
                            <Typography variant="h6">Field Records</Typography>
                        </Box>
                        <Button variant="contained" color="success">Add New Field</Button>
                    </Box>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Field ID</TableCell>
                                <TableCell>Division</TableCell>
                                <TableCell>Crop Type</TableCell>
                                <TableCell>Planting Date</TableCell>
                                <TableCell>Stage</TableCell>
                                <TableCell align="right">Est. Yield (Kg/Ha)</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow>
                                <TableCell><b>FD-001</b></TableCell>
                                <TableCell>Upper Division</TableCell>
                                <TableCell>Tea (VP 2023)</TableCell>
                                <TableCell>2015-05-12</TableCell>
                                <TableCell>Mature</TableCell>
                                <TableCell align="right">1,200</TableCell>
                                <TableCell><Chip label="Healthy" color="success" size="small" /></TableCell>
                                <TableCell align="right"><Button size="small">Details</Button></TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell><b>FD-004</b></TableCell>
                                <TableCell>Lower Division</TableCell>
                                <TableCell>Tea (S-Clone)</TableCell>
                                <TableCell>2020-01-20</TableCell>
                                <TableCell>Pruning</TableCell>
                                <TableCell align="right">-</TableCell>
                                <TableCell><Chip label="Maintenance" color="warning" size="small" /></TableCell>
                                <TableCell align="right"><Button size="small">Details</Button></TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell><b>FD-009</b></TableCell>
                                <TableCell>New Division</TableCell>
                                <TableCell>Rubber</TableCell>
                                <TableCell>2023-08-01</TableCell>
                                <TableCell>Sapling</TableCell>
                                <TableCell align="right">-</TableCell>
                                <TableCell><Chip label="Growth" color="info" size="small" /></TableCell>
                                <TableCell align="right"><Button size="small">Details</Button></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </Box>
    );
}
