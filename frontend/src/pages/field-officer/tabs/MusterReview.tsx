import { Box, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';

export default function MusterReview() {
    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                Muster Review
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={4}>
                Review and validate workforce attendance and task completion.
            </Typography>

            <Card>
                <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                        <GroupIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6">Past Muster Records</Typography>
                    </Box>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Gang / Division</TableCell>
                                <TableCell>Work Type</TableCell>
                                <TableCell>Workers</TableCell>
                                <TableCell>Output</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow>
                                <TableCell>2023-10-25</TableCell>
                                <TableCell>Gang #1 (Upper)</TableCell>
                                <TableCell>Plucking</TableCell>
                                <TableCell>22</TableCell>
                                <TableCell>480 kg</TableCell>
                                <TableCell><Chip label="Verified" color="success" size="small" /></TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>2023-10-25</TableCell>
                                <TableCell>Gang #2 (Lower)</TableCell>
                                <TableCell>Weeding</TableCell>
                                <TableCell>12</TableCell>
                                <TableCell>1.5 Ha</TableCell>
                                <TableCell><Chip label="Verified" color="success" size="small" /></TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>2023-10-24</TableCell>
                                <TableCell>Gang #1 (Upper)</TableCell>
                                <TableCell>Plucking</TableCell>
                                <TableCell>21</TableCell>
                                <TableCell>460 kg</TableCell>
                                <TableCell><Chip label="Audit" color="warning" size="small" /></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </Box>
    );
}
