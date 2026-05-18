import { Box, Typography, Paper, TextField, IconButton, List, ListItemText, ListItemAvatar, Avatar, Badge, ListItemButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, Snackbar, Alert, Tooltip, Skeleton, CircularProgress } from '@mui/material';
import { useState, useEffect, useRef, useCallback } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CampaignIcon from '@mui/icons-material/Campaign';
import DownloadIcon from '@mui/icons-material/Download';
import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import axios from 'axios';
import { useLanguage } from '../../../context/LanguageContext';

export default function Correspondence() {
    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const tenantId = userSession.tenantId || '';
    const myId = userSession.userId || userSession.id || '';
    const myName = userSession.fullName || userSession.name || 'User';
    const myRole = userSession.role || 'FIELD_OFFICER';
    const { t } = useLanguage();

    const [chats, setChats] = useState<any[]>([]);
    const [selectedChatId, setSelectedChatId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [contactsLoading, setContactsLoading] = useState(true);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [attachedImage, setAttachedImage] = useState<string | null>(null);
    const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>({});
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
    const [broadcastText, setBroadcastText] = useState('');
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    const handleSnackbarClose = () => setSnackbar({ ...snackbar, open: false });
    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    const handleDownloadImage = () => {
        if (!zoomedImage) return;
        const link = document.createElement('a');
        link.href = zoomedImage;
        link.download = `correspondence-attachment-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const fetchMessages = useCallback(async () => {
        if (!myId || !tenantId) return;
        try {
            const res = await axios.get(`/api/messages?userId=${myId}&userRole=${myRole}`, {
                headers: { 'X-Tenant-ID': tenantId }
            });

            const counts: { [key: string]: number } = {};
            res.data.forEach((m: any) => {
                if (m.receiverId === myId && !m.read && m.senderId !== selectedChatId) {
                    counts[m.senderId] = (counts[m.senderId] || 0) + 1;
                }
            });
            setUnreadCounts(counts);

            const filtered = res.data.filter((m: any) =>
                (m.senderId === myId && m.receiverId === selectedChatId) ||
                (m.senderId === selectedChatId && m.receiverId === myId)
            );
            setMessages(filtered);

            filtered.forEach((m: any) => {
                if (m.senderId === selectedChatId && m.receiverId === myId && !m.read) {
                    axios.put(`/api/messages/${m.id}/read`, {}, {
                        headers: { 'X-Tenant-ID': tenantId }
                    }).catch(err => console.error("Failed to mark read", err));
                }
            });
        } catch (error) {
            console.error("Failed to fetch messages", error);
        }
    }, [myId, myRole, tenantId, selectedChatId]);

    // Heartbeat to update local lastSeen
    useEffect(() => {
        if (!myId) return;
        const sendHeartbeat = () => {
            axios.post(`/api/tenants/users/${myId}/heartbeat`).catch(err => console.error("Heartbeat failed", err));
        };
        sendHeartbeat();
        const interval = setInterval(sendHeartbeat, 30000); // 30s heartbeat
        return () => clearInterval(interval);
    }, [myId]);

    useEffect(() => {
        if (!tenantId) return;
        let cancelled = false;
        const loadUsers = async () => {
            try {
                const res = await axios.get(`/api/tenants/${tenantId}/users`);
                if (cancelled) return;
                if (!res.data || !Array.isArray(res.data)) {
                    setChats([]);
                    setContactsLoading(false);
                    return;
                }
                const myIdStr = myId ? myId.toString().toLowerCase() : '';
                const fetchedUsers = res.data
                    .filter((u: any) => u.userId && u.userId.toString().toLowerCase() !== myIdStr)
                    .map((u: any) => ({
                        id: u.userId,
                        name: u.fullName || u.name || 'Unknown User',
                        role: u.role ? u.role.replace(/_/g, ' ') : 'USER',
                        lastSeen: u.lastSeen,
                        type: 'user'
                    }));

                setChats(fetchedUsers);
                setContactsLoading(false);
                setSelectedChatId(prev => {
                    if (!prev && fetchedUsers.length > 0) {
                        return fetchedUsers[0].id;
                    }
                    return prev;
                });
            } catch (err) {
                if (!cancelled) {
                    console.error("Failed to load users for chat", err);
                    setContactsLoading(false);
                }
            }
        };
        loadUsers();
        const interval = setInterval(loadUsers, 10000);
        return () => { cancelled = true; clearInterval(interval); };
    }, [tenantId, myId]);

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

        setInputText('');
        setAttachedImage(null);
        try {
            await axios.post('/api/messages', newMsg, {
                headers: { 'X-Tenant-ID': tenantId }
            });
            fetchMessages();
        } catch (error) {
            console.error(error);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setAttachedImage(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleBroadcastSend = async () => {
        if (!broadcastText.trim()) return;
        const promises = chats.map(chat => {
            return axios.post('/api/messages', {
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
            setSnackbar({ open: true, message: 'Broadcast sent to all personnel!', severity: 'success' });
        } catch (error) {
            console.error("Failed to broadcast", error);
            setSnackbar({ open: true, message: 'Failed to send broadcast.', severity: 'error' });
        }
    };

    const isOnline = (lastSeen: string | null) => {
        if (!lastSeen) return false;
        const lastSeenDate = new Date(lastSeen);
        const now = new Date();
        const diffInMinutes = (now.getTime() - lastSeenDate.getTime()) / 60000;
        return diffInMinutes < 2; // Online if heartbeat was in last 2 minutes
    };

    const formatLastSeen = (lastSeen: string | null) => {
        if (!lastSeen) return 'Offline';
        if (isOnline(lastSeen)) return 'Online';
        const date = new Date(lastSeen);
        return `Last seen ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

    const activeChatUser = chats.find(c => c.id === selectedChatId);

    return (
        <Box sx={{ 
            height: { xs: 'calc(100dvh - 100px)', sm: 'calc(100vh - 120px)' }, 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden' 
        }}>
            <Box display="flex" justifyContent="space-between" alignItems="baseline" mb={{ xs: 1, sm: 2 }}>
                <Typography variant="h5" fontWeight="800" sx={{ color: '#1b5e20', letterSpacing: '-0.5px', fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                    {t('Correspondence')}
                </Typography>
                <Typography variant="body2" sx={{ color: '#666', fontWeight: 600 }}>
                    {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Typography>
            </Box>

            <Paper elevation={0} sx={{ flex: 1, display: 'flex', overflow: 'hidden', borderRadius: 4, bgcolor: '#fff', border: '1px solid #e0e0e0', boxShadow: '0 8px 24px rgba(0,0,0,0.05)' }}>
                
                {/* Contact List */}
                <Box sx={{ width: { xs: 80, sm: 320 }, display: 'flex', flexDirection: 'column', borderRight: '1px solid #f0f0f0' }}>
                    <Box sx={{ p: 2, pb: 1 }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search contacts..."
                            variant="outlined"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: <SearchIcon sx={{ color: '#aaa', mr: 1, fontSize: 20 }} />,
                                sx: { borderRadius: 3, bgcolor: '#f5f5f5', border: 'none', '& fieldset': { border: 'none' } }
                            }}
                            sx={{ display: { xs: 'none', sm: 'block' } }}
                        />
                    </Box>
                    
                    <Typography variant="overline" sx={{ px: 3, mt: 1, color: '#999', fontWeight: 700, display: { xs: 'none', sm: 'block' } }}>
                        {t('All Personnel')}
                    </Typography>
                    
                    <List sx={{ flex: 1, overflowY: 'auto', px: 1 }}>
                        {contactsLoading ? (
                            <Box sx={{ px: 1, py: 1 }}>
                                {[1,2,3,4].map(i => (
                                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, px: 1 }}>
                                        <Skeleton variant="circular" width={44} height={44} />
                                        <Box sx={{ flex: 1, display: { xs: 'none', sm: 'block' } }}>
                                            <Skeleton variant="text" width="70%" height={16} />
                                            <Skeleton variant="text" width="45%" height={13} />
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        ) : chats.filter(chat =>
                                (chat.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                (chat.role || '').toLowerCase().includes(searchQuery.toLowerCase())
                            ).length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 4, opacity: 0.4, display: { xs: 'none', sm: 'block' } }}>
                                <Typography variant="caption">No contacts found</Typography>
                            </Box>
                        ) : chats
                            .filter(chat => 
                                (chat.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                                (chat.role || '').toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            .map(chat => {
                                const userOnline = isOnline(chat.lastSeen);
                                return (
                                    <ListItemButton
                                    key={chat.id}
                                    selected={selectedChatId === chat.id}
                                    onClick={() => setSelectedChatId(chat.id)}
                                    sx={{ 
                                        borderRadius: 3, 
                                        mb: 0.5,
                                        py: 1.5,
                                        '&.Mui-selected': { bgcolor: '#e8f5e9', '&:hover': { bgcolor: '#e8f5e9' } },
                                        justifyContent: { xs: 'center', sm: 'flex-start' }
                                    }}
                                >
                                    <ListItemAvatar sx={{ minWidth: { xs: 0, sm: 56 } }}>
                                        <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} variant="dot" color={userOnline ? "success" : "default"}>
                                            <Badge badgeContent={unreadCounts[chat.id] || 0} color="error" overlap="circular" sx={{ '& .MuiBadge-badge': { top: 4, right: 4 } }}>
                                                <Avatar sx={{ width: 44, height: 44, bgcolor: selectedChatId === chat.id ? '#1b5e20' : '#f0f0f0', color: selectedChatId === chat.id ? '#fff' : '#1b5e20', fontWeight: 'bold' }}>
                                                    {chat.name.charAt(0)}
                                                </Avatar>
                                            </Badge>
                                        </Badge>
                                    </ListItemAvatar>
                                    <ListItemText
                                        sx={{ display: { xs: 'none', sm: 'block' } }}
                                        primary={<Typography variant="body2" fontWeight={selectedChatId === chat.id ? 700 : 500} color="#333">{chat.name}</Typography>}
                                        secondary={
                                            <Typography variant="caption" sx={{ color: userOnline ? '#4caf50' : '#888', fontWeight: userOnline ? 600 : 'normal' }}>
                                                {userOnline ? 'Online' : chat.role}
                                            </Typography>
                                        }
                                    />
                                </ListItemButton>
                            );
                        })}
                    </List>
                </Box>

                {/* Conversation Area */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#fafafa' }}>
                    {/* Chat Header */}
                    <Box sx={{ p: 2, px: 3, bgcolor: '#fff', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center' }}>
                        {contactsLoading ? (
                            <Skeleton variant="circular" width={36} height={36} sx={{ mr: 2 }} />
                        ) : (
                            <Avatar sx={{ width: 36, height: 36, mr: 2, bgcolor: '#e8f5e9', color: '#1b5e20' }}>
                                {activeChatUser?.name?.charAt(0) || ''}
                            </Avatar>
                        )}
                        <Box sx={{ flex: 1 }}>
                            {contactsLoading ? (
                                <>
                                    <Skeleton variant="text" width={140} height={20} />
                                    <Skeleton variant="text" width={80} height={14} />
                                </>
                            ) : (
                                <>
                                    <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>{activeChatUser?.name}</Typography>
                                    <Typography variant="caption" sx={{ color: isOnline(activeChatUser?.lastSeen) ? '#4caf50' : '#888', fontWeight: 600 }}>
                                        {formatLastSeen(activeChatUser?.lastSeen)}
                                    </Typography>
                                </>
                            )}
                        </Box>
                    </Box>

                    {/* Messages */}
                    <Box sx={{ flex: 1, px: 3, pt: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                        {contactsLoading ? (
                            <Box sx={{ m: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, opacity: 0.6 }}>
                                <CircularProgress size={36} sx={{ color: '#1b5e20' }} />
                                <Typography variant="body2" color="text.secondary">Loading contacts...</Typography>
                            </Box>
                        ) : messages.length === 0 && (
                            <Box sx={{ m: 'auto', textAlign: 'center', opacity: 0.5 }}>
                                <Typography variant="h6">{t('No messages yet')}</Typography>
                                <Typography variant="body2">{t('Start a conversation with')} {activeChatUser?.name}</Typography>
                            </Box>
                        )}
                        {messages.map((msg, idx) => {
                            const isMine = msg.senderId === myId;
                            const showName = !isMine && (idx === 0 || messages[idx-1].senderId !== msg.senderId);
                            
                            return (
                                <Box key={msg.id} sx={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '80%', mb: 1, mt: showName ? 1 : 0 }}>
                                    {showName && (
                                        <Typography variant="caption" sx={{ ml: 1, mb: 0.5, color: '#666', fontWeight: 600 }}>
                                            {msg.senderName}
                                        </Typography>
                                    )}
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 1.5,
                                            px: 2,
                                            bgcolor: isMine ? '#1b5e20' : '#fff',
                                            color: isMine ? '#fff' : '#333',
                                            borderRadius: isMine ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                                            boxShadow: isMine ? '0 4px 12px rgba(27,94,32,0.2)' : '0 2px 8px rgba(0,0,0,0.05)',
                                            position: 'relative'
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                            {msg.content}
                                        </Typography>
                                        
                                        {msg.imageAttachment && (
                                            <Box sx={{ mt: 1, overflow: 'hidden', borderRadius: 2, cursor: 'pointer' }} onClick={() => setZoomedImage(msg.imageAttachment)}>
                                                <img src={msg.imageAttachment} alt="Attachment" style={{ width: '100%', maxHeight: 300, objectFit: 'cover' }} />
                                            </Box>
                                        )}
                                        
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mt: 0.5, gap: 0.5 }}>
                                            <Typography variant="caption" sx={{ fontSize: '10px', opacity: 0.7 }}>
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Typography>
                                            {isMine && (
                                                msg.read ? 
                                                <DoneAllIcon sx={{ fontSize: 14, color: '#4fc3f7' }} /> : 
                                                <DoneIcon sx={{ fontSize: 14, opacity: 0.7 }} />
                                            )}
                                        </Box>
                                    </Paper>
                                </Box>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </Box>

                    {/* Input System */}
                    <Box sx={{ p: 2, px: 3, bgcolor: '#fff', borderTop: '1px solid #f0f0f0' }}>
                        {attachedImage && (
                            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', p: 1, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                                <Avatar src={attachedImage} variant="rounded" sx={{ width: 40, height: 40, mr: 2 }} />
                                <Typography variant="caption" sx={{ flex: 1 }}>{t('Image attached')}</Typography>
                                <IconButton size="small" onClick={() => setAttachedImage(null)}><Typography variant="body2">×</Typography></IconButton>
                            </Box>
                        )}
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ display: 'flex', bgcolor: '#f5f5f5', borderRadius: 6, p: 0.5 }}>
                                <Tooltip title={t('Attach Image')}>
                                    <IconButton size="small" onClick={() => document.getElementById('camera-upload')?.click()}>
                                        <CameraAltIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={t('Broadcast')}>
                                    <IconButton size="small" onClick={() => setBroadcastDialogOpen(true)}>
                                        <CampaignIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <input type="file" id="camera-upload" accept="image/*" style={{ display: 'none' }} onChange={handleImageSelect} />
                            </Box>

                            <TextField
                                fullWidth
                                variant="outlined"
                                placeholder={t('Write a message...')}
                                multiline
                                maxRows={4}
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                sx={{ 
                                    '& .MuiOutlinedInput-root': { 
                                        borderRadius: 6, 
                                        bgcolor: '#f5f5f5',
                                        '& fieldset': { border: 'none' },
                                        fontSize: { xs: '16px', sm: '0.9rem' }
                                    } 
                                }}
                            />

                            <IconButton 
                                onClick={handleSend} 
                                disabled={!inputText.trim() && !attachedImage}
                                sx={{ 
                                    bgcolor: '#1b5e20', 
                                    color: '#fff', 
                                    '&:hover': { bgcolor: '#2e7d32' },
                                    '&.Mui-disabled': { bgcolor: '#f0f0f0', color: '#ccc' }
                                }}
                            >
                                <SendIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    </Box>
                </Box>
            </Paper>

            {/* Dialogs */}
            <Dialog open={broadcastDialogOpen} onClose={() => setBroadcastDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
                <DialogTitle sx={{ fontWeight: 800 }}>{t('Broadcast Message')}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
                        Message will be sent to all {chats.length} contacts.
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        placeholder="Type announcement..."
                        value={broadcastText}
                        onChange={(e) => setBroadcastText(e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setBroadcastDialogOpen(false)} variant="text" sx={{ color: '#666' }}>{t('Cancel')}</Button>
                    <Button onClick={handleBroadcastSend} variant="contained" color="error" sx={{ borderRadius: 2, px: 3 }}>{t('Send Now')}</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={!!zoomedImage} onClose={() => setZoomedImage(null)} maxWidth="lg" PaperProps={{ sx: { bgcolor: 'transparent', boxShadow: 'none' } }}>
                <Box sx={{ position: 'relative' }}>
                    <IconButton onClick={() => setZoomedImage(null)} sx={{ position: 'absolute', top: -40, right: 0, color: '#fff' }}><Typography variant="h5">×</Typography></IconButton>
                    <IconButton onClick={handleDownloadImage} sx={{ position: 'absolute', top: -40, right: 40, color: '#fff' }}><DownloadIcon /></IconButton>
                    <img src={zoomedImage || ''} alt="Zoomed" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 12 }} />
                </Box>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleSnackbarClose} severity={snackbar.severity} variant="filled" sx={{ borderRadius: 5 }}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
