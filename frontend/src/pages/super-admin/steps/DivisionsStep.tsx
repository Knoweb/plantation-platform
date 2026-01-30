import { Box, Typography, TextField, Button, IconButton, Paper, List, ListItem, ListItemText, ListItemSecondaryAction, Grid } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useState } from 'react';

interface Props {
    data: any;
    updateData: (data: any) => void;
}

export default function DivisionsStep({ data, updateData }: Props) {
    const [newDivName, setNewDivName] = useState('');
    const [newDivCode, setNewDivCode] = useState('');

    const handleAdd = () => {
        if (newDivName && newDivCode) {
            const newDivision = { name: newDivName, code: newDivCode };
            updateData({
                ...data,
                divisions: [...(data.divisions || []), newDivision]
            });
            setNewDivName('');
            setNewDivCode('');
        }
    };

    const handleDelete = (index: number) => {
        const updated = data.divisions.filter((_: any, i: number) => i !== index);
        updateData({ ...data, divisions: updated });
    };

    return (
        <Box sx={{ mt: 1 }}>
            <Typography variant="h6" gutterBottom>
                Manage Divisions
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
                Define the operational divisions (e.g., "Glassaugh Division", "Factory Division").
            </Typography>

            <Grid container spacing={2} alignItems="center">
                <Grid item xs={7}>
                    <TextField
                        fullWidth
                        label="Division Name"
                        value={newDivName}
                        onChange={(e) => setNewDivName(e.target.value)}
                        placeholder="e.g. Upper Division"
                        size="small"
                    />
                </Grid>
                <Grid item xs={3}>
                    <TextField
                        fullWidth
                        label="Code"
                        value={newDivCode}
                        onChange={(e) => setNewDivCode(e.target.value)}
                        placeholder="e.g. UD"
                        size="small"
                    />
                </Grid>
                <Grid item xs={2}>
                    <Button
                        variant="contained"
                        onClick={handleAdd}
                        disabled={!newDivName || !newDivCode}
                        startIcon={<AddCircleOutlineIcon />}
                    >
                        Add
                    </Button>
                </Grid>
            </Grid>

            <Box mt={3}>
                <Typography variant="subtitle2" gutterBottom>
                    Added Divisions ({data.divisions?.length || 0})
                </Typography>
                <Paper variant="outlined">
                    <List dense>
                        {(!data.divisions || data.divisions.length === 0) && (
                            <ListItem>
                                <ListItemText primary="No divisions added yet." sx={{ color: 'text.secondary', fontStyle: 'italic' }} />
                            </ListItem>
                        )}
                        {data.divisions?.map((div: any, index: number) => (
                            <ListItem key={index} divider={index !== data.divisions.length - 1}>
                                <ListItemText
                                    primary={div.name}
                                    secondary={`Code: ${div.code}`}
                                    primaryTypographyProps={{ fontWeight: 500 }}
                                />
                                <ListItemSecondaryAction>
                                    <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(index)}>
                                        <DeleteIcon color="error" />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))}
                    </List>
                </Paper>
            </Box>
        </Box>
    );
}
