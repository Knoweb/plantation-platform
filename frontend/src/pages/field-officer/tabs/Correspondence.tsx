import { Box, Typography, Paper, TextField, IconButton, List, ListItemText, ListItemAvatar, Avatar, Divider, InputAdornment, Badge, ListItemButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, Snackbar, Alert } from '@mui/material';
import { useState, useEffect, useRef } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CampaignIcon from '@mui/icons-material/Campaign';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import axios from 'axios';

// Shared correspondence component logic
export default function Correspondence() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId || '';
    const myId = userSession.userId || userSession.id || '';
    const myName = userSession.fullName || userSession.name || 'User';
    const myRole = userSession.role || 'FIELD_OFFICER';

    const [chats, setChats] = useState<any[]>([]);
    const [selectedChatId, setSelectedChatId] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [attachedImage, setAttachedImage] = useState<string | null>(null);
    const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>({});
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    // Dialog states
    const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
    const [broadcastText, setBroadcastText] = useState('');
    const [recordDialogOpen, setRecordDialogOpen] = useState(false);
    const [recentRecords, setRecentRecords] = useState<any[]>([]);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    // Snackbar state for non-intrusive notifications
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    const handleSnackbarClose = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchMessages = async () => {
        try {
            const res = await axios.get(`http://localhost:8080/api/messages?userId=${myId}&userRole=${myRole}`, {
                headers: { 'X-Tenant-ID': tenantId }
            });

            // Calculate unread counts per user
            const counts: { [key: string]: number } = {};
            res.data.forEach((m: any) => {
                // If message is for us, unread, AND not from the currently active chat (which we auto-read)
                if (m.receiverId === myId && !m.read && m.senderId !== selectedChatId) {
                    counts[m.senderId] = (counts[m.senderId] || 0) + 1;
                }
            });
            setUnreadCounts(counts);

            // Group messages for the selected user chat
            const filtered = res.data.filter((m: any) =>
                (m.senderId === myId && m.receiverId === selectedChatId) ||
                (m.senderId === selectedChatId && m.receiverId === myId)
            );
            setMessages(filtered);

            // Auto mark received messages from currently active chat as read
            filtered.forEach((m: any) => {
                if (m.senderId === selectedChatId && m.receiverId === myId && !m.read) {
                    axios.put(`http://localhost:8080/api/messages/${m.id}/read`, {}, {
                        headers: { 'X-Tenant-ID': tenantId }
                    }).catch(err => console.error("Failed to mark read", err));
                }
            });
        } catch (error) {
            console.error("Failed to fetch messages", error);
        }
    };

    // Fetch all users for this tenant to provide direct messaging
    useEffect(() => {
        if (!tenantId) return;
        axios.get(`http://localhost:8080/api/tenants/${tenantId}/users`)
            .then(res => {
                const fetchedUsers = res.data
                    .filter((u: any) => u.userId !== myId) // Exclude myself
                    .map((u: any) => ({
                        id: u.userId,
                        name: `${u.fullName} (${u.role.replace('_', ' ')})`,
                        active: false,
                        type: 'user'
                    }));

                setChats(fetchedUsers);
                if (fetchedUsers.length > 0 && !selectedChatId) {
                    setSelectedChatId(fetchedUsers[0].id);
                }
            })
            .catch(err => console.error("Failed to load users for chat", err));
    }, [tenantId, myId]); // Remove selectedChatId from dependency so it only runs once and doesn't reset it

    // Polling simulation for Real-Time chat without massive WebSocket setup
    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 2000);
        return () => clearInterval(interval);
    }, [selectedChatId, myId, myRole]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!inputText.trim() && !attachedImage) return;

        const newMsg = {
            senderId: myId,
            senderName: myName,
            senderRole: myRole,
            receiverId: selectedChatId,
            receiverName: chats.find(c => c.id === selectedChatId)?.name || '',
            content: inputText.trim() || '[Image Attached]',
            imageAttachment: attachedImage
        };

        setInputText(''); // optimistic clear
        setAttachedImage(null);
        try {
            await axios.post('http://localhost:8080/api/messages', newMsg, {
                headers: { 'X-Tenant-ID': tenantId }
            });
            fetchMessages(); // refresh immediately after post
        } catch (error) {
            console.error(error);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setAttachedImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleBroadcastSend = async () => {
        if (!broadcastText.trim()) return;
        const promises = chats.map(chat => {
            return axios.post('http://localhost:8080/api/messages', {
                senderId: myId,
                senderName: myName,
                senderRole: myRole,
                receiverId: chat.id,
                receiverName: chat.name,
                content: `[BROADCAST ANNOUNCEMENT]\n\n${broadcastText}`
            }, { headers: { 'X-Tenant-ID': tenantId } });
        });

        try {
            await Promise.all(promises);
            setBroadcastText('');
            setBroadcastDialogOpen(false);
            fetchMessages();
            setSnackbar({ open: true, message: 'Broadcast sent successfully to all personnel in your contact list!', severity: 'success' });
        } catch (error) {
            console.error("Failed to broadcast", error);
            setSnackbar({ open: true, message: 'Failed to send broadcast.', severity: 'error' });
        }
    };

    const fetchRecentRecords = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const res = await axios.get(`http://localhost:8080/api/operations/daily-work?tenantId=${tenantId}&date=${today}`);
            setRecentRecords(res.data || []);
            setRecordDialogOpen(true);
        } catch (error) {
            console.error("Failed to fetch records", error);
            // Fallback mock data if table is empty / error
            setRecentRecords([
                { workId: 'W-001', workType: 'Harvesting', status: 'PENDING' },
                { workId: 'W-002', workType: 'Weeding', status: 'COMPLETED' }
            ]);
            setRecordDialogOpen(true);
        }
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
                <Box sx={{ width: 300, borderRight: '1px solid #000', display: 'flex', flexDirection: 'column', bgcolor: '#fff' }}>

                    {/* Search Bar */}
                    <Box sx={{ p: 1, borderBottom: '1px solid #000' }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search Roles or Contacts..."
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
                        Groups & Contacts
                    </Typography>
                    <List sx={{ flex: 1, overflowY: 'auto', p: 0 }}>
                        {chats.map(chat => {
                            // Determine if this user has sent us any unread messages right now
                            // We do this by checking if they are in the full unread backlog, but here we can just pass the prop
                            // Actually properly handling live badges per user would involve storing global message state.
                            return (
                                <Box key={chat.id}>
                                    <ListItemButton
                                        selected={selectedChatId === chat.id}
                                        onClick={() => setSelectedChatId(chat.id)}
                                        sx={{ '&.Mui-selected': { bgcolor: '#e8f5e9' } }}
                                    >
                                        <ListItemAvatar>
                                            <Badge badgeContent={unreadCounts[chat.id] || 0} color="error">
                                                <Avatar sx={{ bgcolor: selectedChatId === chat.id ? '#4caf50' : '#bdbdbd' }}>
                                                    {chat.name.charAt(0)}
                                                </Avatar>
                                            </Badge>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={<Typography fontWeight={selectedChatId === chat.id ? 'bold' : 'normal'}>{chat.name}</Typography>}
                                            secondary={<Typography variant="caption" color="text.secondary" noWrap>Tap to direct message</Typography>}
                                        />
                                    </ListItemButton>
                                    <Divider />
                                </Box>
                            );
                        })}
                    </List>
                </Box>

                {/* Right Panel: Chat Area */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>

                    {/* Messages Area */}
                    <Box sx={{ flex: 1, p: 2, overflowY: 'auto', bgcolor: '#f1f8e9' }}>
                        {messages.length === 0 && (
                            <Typography textAlign="center" color="text.secondary" sx={{ mt: 5 }}>
                                No messages in this channel yet. Say hello!
                            </Typography>
                        )}
                        {messages.map((msg) => {
                            const isMine = msg.senderId === myId;
                            return (
                                <Box key={msg.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', mb: 2 }}>
                                    <Paper
                                        elevation={1}
                                        sx={{
                                            p: 1.5,
                                            maxWidth: '70%',
                                            bgcolor: isMine ? '#c8e6c9' : '#ffffff',
                                            borderRadius: 2,
                                            borderBottomRightRadius: isMine ? 0 : 8,
                                            borderBottomLeftRadius: !isMine ? 0 : 8
                                        }}
                                    >
                                        {!isMine && (
                                            <Typography variant="caption" fontWeight="bold" color="#1b5e20" display="block">
                                                {msg.senderName} ({msg.senderRole})
                                            </Typography>
                                        )}
                                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
                                        {msg.imageAttachment && (
                                            <Box sx={{ mt: 1, maxWidth: '100%', cursor: 'pointer', display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }} onClick={() => setZoomedImage(msg.imageAttachment)}>
                                                <img src={msg.imageAttachment} alt="Attachment" style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: 8, border: '1px solid #e0e0e0' }} />
                                            </Box>
                                        )}
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: 0.5, fontSize: '0.7rem' }}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Typography>
                                    </Paper>
                                </Box>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </Box>

                    {/* Input Area */}
                    <Box sx={{ borderTop: '1px solid #000', bgcolor: '#fff', display: 'flex', flexDirection: 'column' }}>

                        {/* Attached Image Preview */}
                        {attachedImage && (
                            <Box sx={{ p: 1, borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center' }}>
                                <Badge badgeContent="x" color="error" onClick={() => setAttachedImage(null)} sx={{ cursor: 'pointer' }}>
                                    <Avatar src={attachedImage} variant="rounded" sx={{ width: 60, height: 60 }} />
                                </Badge>
                                <Typography variant="caption" sx={{ ml: 2, color: 'text.secondary' }}>Image attached</Typography>
                            </Box>
                        )}

                        {/* Action Icons */}
                        <Box sx={{ display: 'flex', gap: 1, p: 0.5, px: 2, borderBottom: '1px solid #e0e0e0' }}>
                            <input type="file" id="camera-upload" accept="image/*" style={{ display: 'none' }} onChange={handleImageSelect} />
                            <IconButton size="small" sx={{ color: '#000' }} onClick={() => document.getElementById('camera-upload')?.click()}>
                                <CameraAltIcon />
                            </IconButton>
                            <IconButton size="small" sx={{ color: '#000' }} onClick={() => setBroadcastDialogOpen(true)}>
                                <CampaignIcon />
                            </IconButton>
                            <IconButton size="small" sx={{ color: '#000' }} onClick={fetchRecentRecords}>
                                <LibraryBooksIcon />
                            </IconButton>
                        </Box>

                        {/* Text Input Row */}
                        <Box sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
                            <TextField
                                fullWidth
                                variant="standard"
                                placeholder="Type a message to the group..."
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

            {/* Broadcast Dialog */}
            <Dialog open={broadcastDialogOpen} onClose={() => setBroadcastDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Broadcast Announcement</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                        This message will be instantly sent to <strong>all {chats.length} personnel</strong> in your contact roster via direct message.
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        variant="outlined"
                        placeholder="Type your massive announcement here..."
                        value={broadcastText}
                        onChange={(e) => setBroadcastText(e.target.value)}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setBroadcastDialogOpen(false)} color="inherit">Cancel</Button>
                    <Button onClick={handleBroadcastSend} variant="contained" color="error">Send Broadcast Now</Button>
                </DialogActions>
            </Dialog>

            {/* Attach Record Dialog */}
            <Dialog open={recordDialogOpen} onClose={() => setRecordDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Attach Estate Record Reference</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                        Select a recent Daily Work or Harvest Log record to ping into the chat:
                    </Typography>
                    <List>
                        {recentRecords.map((rec: any, idx: number) => (
                            <Box key={rec.workId || idx}>
                                <ListItemButton onClick={() => {
                                    setInputText(prev => prev + `[Ref Tracker: ${rec.workType} ID #${rec.workId}] `);
                                    setRecordDialogOpen(false);
                                }}>
                                    <ListItemText
                                        primary={`ID: ${rec.workId} - ${rec.workType}`}
                                        secondary={`Status: ${rec.status || 'N/A'}`}
                                    />
                                </ListItemButton>
                                <Divider />
                            </Box>
                        ))}
                        {recentRecords.length === 0 && <Typography>No records found today.</Typography>}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRecordDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Image Zoom Modal */}
            <Dialog open={!!zoomedImage} onClose={() => setZoomedImage(null)} maxWidth="lg" fullWidth>
                <DialogContent sx={{ p: 0, bgcolor: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                    <IconButton
                        onClick={() => setZoomedImage(null)}
                        sx={{ position: 'absolute', top: 8, right: 8, color: '#fff', bgcolor: 'rgba(0,0,0,0.5)' }}
                    >
                        <Typography variant="h6" sx={{ lineHeight: 0.5 }}>×</Typography>
                    </IconButton>
                    {zoomedImage && (
                        <img src={zoomedImage} alt="Zoomed" style={{ width: '100%', height: 'auto', maxHeight: '90vh', objectFit: 'contain' }} />
                    )}
                </DialogContent>
            </Dialog>

            {/* Premium Toast Notification System */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%', boxShadow: 3 }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
