import React, { useEffect, useRef, useState } from 'react';
import { ChatBubbleLeftRightIcon, XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { fetchRooms, fetchMessages, sendMessage, ChatRoom, ChatMessage } from '../../api/chat';

const FloatingChatWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    (async () => {
      try {
        const r = await fetchRooms();
        if (!mounted) return;
        setRooms(r);
        if (r.length > 0) setRoom(r[0]);
      } catch (e) {}
    })();
    return () => { mounted = false; };
  }, [open]);

  useEffect(() => {
    if (!open || !room) return;
    let mounted = true;
    (async () => {
      try {
        const msgs = await fetchMessages(room.id);
        if (!mounted) return;
        setMessages(msgs);
      } catch (e) {}
    })();
    return () => { mounted = false; };
  }, [open, room?.id]);

  useEffect(() => {
    if (!open || !room) return;
    const token = localStorage.getItem('access_token');
    if (!token) return;
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;
    const ws = new WebSocket(`${proto}://${host}/api/v1/ws/chat/${room.id}?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'chat_message') {
          setMessages(prev => [...prev, {
            id: data.message_id,
            room_id: data.room_id,
            user_id: data.author_id,
            content: data.content,
            sent_at: data.sent_at,
          }]);
        }
      } catch {}
    };
    ws.onclose = () => { if (wsRef.current === ws) wsRef.current = null; };
    return () => { try { ws.close(); } catch {} };
  }, [open, room?.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;
    const text = input.trim();
    if (!text) return;
    try {
      await sendMessage(room.id, text);
      setInput('');
    } catch {}
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-4 right-4 z-50 bg-user-blue text-white p-3 rounded-full shadow-lg hover:bg-user-blue"
        aria-label="Open chat"
        title="Chat"
      >
        <ChatBubbleLeftRightIcon className="w-6 h-6" />
      </button>

      {/* Widget Panel */}
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-96 max-w-[95vw] h-[28rem] bg-white border shadow-xl rounded-lg flex flex-col">
          <div className="py-2 border-b flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-user-blue" />
              <span className="font-medium">Chat</span>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 text-gray-500 hover:text-gray-700" aria-label="Close chat">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="py-2 border-b">
            <select className="w-full border rounded p-2" value={room?.id || ''} onChange={(e) => {
              const r = rooms.find(x => x.id === e.target.value) || null; setRoom(r); setMessages([]);
            }}>
              {rooms.map(r => (<option key={r.id} value={r.id}>{r.name}</option>))}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-sm text-gray-600">No messages yet.</div>
            ) : messages.map(m => (
              <div key={m.id} className="bg-white border rounded p-2">
                <div className="text-gray-900 text-sm">{m.content}</div>
                <div className="text-xs text-gray-500">{m.sent_at ? new Date(m.sent_at).toLocaleString() : ''}</div>
              </div>
            ))}
          </div>
          <form onSubmit={handleSend} className="p-3 border-t flex items-center space-x-2">
            <input
              className="flex-1 border rounded p-2"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
            />
            <button type="submit" className="p-2 bg-user-blue text-white rounded hover:bg-user-blue" aria-label="Send">
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default FloatingChatWidget;
