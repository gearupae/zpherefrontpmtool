import apiClient from './client';

export interface ChatRoom {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  sent_at?: string;
}

export async function fetchRooms() {
  const res = await apiClient.get('/chat/rooms');
  return res.data as ChatRoom[];
}

export async function fetchMessages(roomId: string, before?: string, limit: number = 50) {
  const params: any = { limit };
  if (before) params.before = before;
  const res = await apiClient.get(`/chat/rooms/${roomId}/messages`, { params });
  return res.data as ChatMessage[];
}

export async function sendMessage(roomId: string, content: string) {
  const res = await apiClient.post(`/chat/rooms/${roomId}/messages`, { content });
  return res.data as ChatMessage;
}