import { Box, Typography, Paper, TextField, IconButton, List, ListItemText, ListItemAvatar, Avatar, Divider, InputAdornment, Button, ListItemButton } from '@mui/material';
import { useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CampaignIcon from '@mui/icons-material/Campaign';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';

export default function Correspondence() {
    // Mock user list
    // Mock user list
    const [chats] = useState([
        { id: 1, name: 'Manager Silva', lastMsg: 'Please check the upper field.', time: '10:30 AM', active: true },
        { id: 2, name: 'FO Perera', lastMsg: 'Plucking completed.', time: 'Yesterday', active: false },
        { id: 3, name: 'General Announcement', lastMsg: 'Muster at 6:30 AM tomorrow.', time: 'Mon', active: false }
    ]);

    const [messages, setMessages] = useState([
        { id: 1, sender: 'Manager Silva', text: 'Have you verified the order request?', time: '10:00 AM', isMine: false },
        { id: 2, sender: 'Me', text: 'Yes, I just submitted the request for 20 picking baskets.', time: '10:15 AM', isMine: true },
        { id: 3, sender: 'Manager Silva', text: 'Please check the upper field as well today.', time: '10:30 AM', isMine: false },
    ]);

    const [inputText, setInputText] = useState('');

    const handleSend = () => {
        if (!inputText.trim()) return;
        setMessages([...messages, {
            id: messages.length + 1,
            sender: 'Me',
            text: inputText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isMine: true
        }]);
        setInputText('');
    };

    return (
        <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4" fontWeight="bold" sx={{ color: '#1b5e20' }}>
                    Correspondence
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }).replace(/ /g, '-')}
                </Typography>
            </Box>

            <Paper elevation={3} sx={{ flex: 1, display: 'flex', overflow: 'hidden', border: '1px solid #000', borderRadius: 0 }}>

                {/* Left Panel: Recent Chats */}
                <Box sx={{ width: 300, borderRight: '1px solid #000', display: 'flex', flexDirection: 'column' }}>

                    {/* Search Bar */}
                    <Box sx={{ p: 1, borderBottom: '1px solid #000' }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search..."
                            variant="outlined"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                                sx: { borderRadius: 0 }
                            }}
                        />
                    </Box>

                    {/* Chat List */}
                    <Typography variant="subtitle2" sx={{ p: 1, pl: 2, bgcolor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
                        Recent Chats
                    </Typography>
                    <List sx={{ flex: 1, overflowY: 'auto', p: 0 }}>
                        {chats.map(chat => (
                            <Box key={chat.id}>
                                <ListItemButton selected={chat.active} sx={{ '&.Mui-selected': { bgcolor: '#e8f5e9' } }}>
                                    <ListItemAvatar>
                                        <Avatar sx={{ bgcolor: chat.active ? '#4caf50' : '#bdbdbd' }}>{chat.name.charAt(0)}</Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={<Typography fontWeight={chat.active ? 'bold' : 'normal'}>{chat.name}</Typography>}
                                        secondary={<Typography variant="caption" color="text.secondary" noWrap>{chat.lastMsg}</Typography>}
                                    />
                                    <Typography variant="caption" color="text.secondary">{chat.time}</Typography>
                                </ListItemButton>
                                <Divider />
                            </Box>
                        ))}
                    </List>
                </Box>

                {/* Right Panel: Chat Area */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>

                    {/* Add People Button */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1, borderBottom: '1px solid #e0e0e0' }}>
                        <Button
                            variant="contained"
                            size="small"
                            sx={{ bgcolor: '#ffca28', color: '#000', '&:hover': { bgcolor: '#ffb300' }, textTransform: 'none', borderRadius: 0, fontWeight: 'bold' }}
                        >
                            Add people +
                        </Button>
                    </Box>

                    {/* Messages Area */}
                    <Box sx={{ flex: 1, p: 2, overflowY: 'auto', bgcolor: '#f9f9f9' }}>
                        {messages.map((msg) => (
                            <Box key={msg.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: msg.isMine ? 'flex-end' : 'flex-start', mb: 2 }}>
                                <Paper
                                    elevation={1}
                                    sx={{
                                        p: 1.5,
                                        maxWidth: '70%',
                                        bgcolor: msg.isMine ? '#dcedc8' : '#ffffff',
                                        borderRadius: 2,
                                        borderBottomRightRadius: msg.isMine ? 0 : 8,
                                        borderBottomLeftRadius: !msg.isMine ? 0 : 8
                                    }}
                                >
                                    {!msg.isMine && <Typography variant="caption" fontWeight="bold" color="#1b5e20" display="block">{msg.sender}</Typography>}
                                    <Typography variant="body1">{msg.text}</Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: 0.5, fontSize: '0.7rem' }}>
                                        {msg.time}
                                    </Typography>
                                </Paper>
                            </Box>
                        ))}
                    </Box>

                    {/* Input Area */}
                    <Box sx={{ borderTop: '1px solid #000', bgcolor: '#fff' }}>

                        {/* Action Icons */}
                        <Box sx={{ display: 'flex', gap: 1, p: 0.5, px: 2, borderBottom: '1px solid #e0e0e0' }}>
                            <IconButton size="small" sx={{ color: '#000' }}><CameraAltIcon /></IconButton>
                            <IconButton size="small" sx={{ color: '#000' }}><CampaignIcon /></IconButton>
                            <IconButton size="small" sx={{ color: '#000' }}><LibraryBooksIcon /></IconButton>
                        </Box>

                        {/* Text Input Row */}
                        <Box sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
                            <TextField
                                fullWidth
                                variant="standard"
                                placeholder="Type a message..."
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyPress={(e) => { if (e.key === 'Enter') handleSend(); }}
                                InputProps={{ disableUnderline: true, sx: { px: 2 } }}
                            />
                            <IconButton onClick={handleSend} sx={{ color: '#000', mr: 1 }}>
                                <SendIcon />
                            </IconButton>
                        </Box>

                    </Box>
                </Box>
            </Paper>
        </Box>
    );
}
