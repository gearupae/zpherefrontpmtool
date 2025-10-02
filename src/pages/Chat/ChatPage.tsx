import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fetchRooms, fetchMessages, sendMessage, ChatRoom, ChatMessage } from '../../api/chat';

function makeWsUrl(path: string) {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.host;
  // Ensure no double slashes
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${proto}://${host}${clean}`;
}

export default function ChatPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [connecting, setConnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Load rooms on mount
  useEffect(() => {
    let mounted = true;
    fetchRooms().then((data) => {
      if (!mounted) return;
      setRooms(data);
      if (data.length > 0) setActiveRoom(data[0]);
    }).catch((err) => console.error('Failed to fetch rooms', err));
    return () => { mounted = false; };
  }, []);

  // Load messages when room changes
  useEffect(() => {
    if (!activeRoom) return;
    let mounted = true;
    fetchMessages(activeRoom.id).then((data) => {
      if (!mounted) return;
      setMessages(data);
    }).catch((err) => console.error('Failed to fetch messages', err));
    return () => { mounted = false; };
  }, [activeRoom?.id]);

  // Connect websocket when room changes
  useEffect(() => {
    if (!activeRoom) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    setConnecting(true);
    const wsPath = `/api/v1/ws/chat/${activeRoom.id}?token=${encodeURIComponent(token)}`;
    const wsUrl = makeWsUrl(wsPath);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnecting(false);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'chat_message') {
          setMessages((prev) => [...prev, {
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
  }, [activeRoom?.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !activeRoom) return;
    try {
      await sendMessage(activeRoom.id, text);
      setInput('');
      // Message will arrive via websocket broadcast
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Organization Chat</h1>

      <div className="flex items-center space-x-2">
        <label className="text-gray-600">Room:</label>
        <select
          className="border rounded p-2"
          value={activeRoom?.id || ''}
          onChange={(e) => {
            const room = rooms.find(r => r.id === e.target.value) || null;
            setActiveRoom(room);
            setMessages([]);
          }}
        >
          {rooms.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        {connecting && <span className="text-gray-600">Connecting...</span>}
      </div>

      <div className="border rounded p-2 bg-gray-50" style={{ height: 400, overflowY: 'auto' }}>
        {messages.length === 0 ? (
          <div className="text-gray-600">No messages yet.</div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="mb-2">
              <div className="text-gray-900">{m.content}</div>
              <div className="text-gray-600 text-xs">{m.sent_at ? new Date(m.sent_at).toLocaleString() : ''}</div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSend} className="flex items-center space-x-2">
        <input
          type="text"
          className="flex-1 border rounded p-2"
          value={input}
          placeholder="Type a message..."
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="border rounded p-2 bg-white">Send</button>
      </form>
    </div>
  );
}