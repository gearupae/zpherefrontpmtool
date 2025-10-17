import React, { useState, useEffect, useRef } from 'react';
import { 
 ChatBubbleLeftRightIcon, 
 PaperAirplaneIcon, 
 UserIcon,
 XMarkIcon,
 MinusIcon
} from '@heroicons/react/24/outline';

interface ChatMessage {
 id: string;
 type: string;
 from_user?: string;
 author?: string;
 author_id?: string;
 message?: string;
 content?: string;
 timestamp: string;
 project_id?: string;
 task_id?: string;
}

interface User {
 id: string;
 username: string;
 first_name?: string;
 last_name?: string;
 full_name?: string;
 avatar_url?: string;
}

interface ProjectChatProps {
 projectId: string;
 projectName: string;
 currentUser?: User;
}

const ProjectChat: React.FC<ProjectChatProps> = ({ projectId, projectName, currentUser }) => {
 const [isOpen, setIsOpen] = useState(false);
 const [isMinimized, setIsMinimized] = useState(false);
 const [messages, setMessages] = useState<ChatMessage[]>([]);
 const [newMessage, setNewMessage] = useState('');
 const [isConnected, setIsConnected] = useState(false);
 const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
 
 const websocketRef = useRef<WebSocket | null>(null);
 const messagesEndRef = useRef<HTMLDivElement>(null);

 const scrollToBottom = () => {
 messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 };

 const connectWebSocket = () => {
 const token = localStorage.getItem('access_token');
 if (!token) return;

 const wsUrl = `ws://localhost:8000/api/v1/ws/projects/${projectId}?token=${token}`;
 websocketRef.current = new WebSocket(wsUrl);

 websocketRef.current.onopen = () => {
 setIsConnected(true);
 console.log('Connected to project chat');
 };

 websocketRef.current.onmessage = (event) => {
 try {
 const data = JSON.parse(event.data);
 
 if (data.type === 'connected') {
 console.log('Connected to project:', data.message);
 } else if (data.type === 'project_update') {
 // Handle project updates
 const message: ChatMessage = {
 id: Date.now().toString(),
 type: 'system',
 message: `${data.updated_by} updated the project`,
 timestamp: data.timestamp,
 project_id: projectId
 };
 setMessages(prev => [...prev, message]);
 } else if (data.type === 'user_message') {
 // Handle user messages
 const message: ChatMessage = {
 id: data.id || Date.now().toString(),
 type: 'message',
 from_user: data.from_user,
 author: data.author,
 author_id: data.author_id,
 content: data.content || data.message,
 timestamp: data.timestamp,
 project_id: projectId
 };
 setMessages(prev => [...prev, message]);
 }
 } catch (error) {
 console.error('Error parsing WebSocket message:', error);
 }
 };

 websocketRef.current.onclose = () => {
 setIsConnected(false);
 console.log('Disconnected from project chat');
 };

 websocketRef.current.onerror = (error) => {
 console.error('WebSocket error:', error);
 setIsConnected(false);
 };
 };

 const sendMessage = () => {
 if (!newMessage.trim() || !websocketRef.current || !isConnected) return;

 const messageData = {
 type: 'user_message',
 content: newMessage.trim(),
 project_id: projectId,
 timestamp: new Date().toISOString()
 };

 websocketRef.current.send(JSON.stringify(messageData));
 
 // Add message to local state immediately for better UX
 const localMessage: ChatMessage = {
 id: Date.now().toString(),
 type: 'message',
 author: currentUser?.full_name || currentUser?.username || 'You',
 author_id: currentUser?.id || '',
 content: newMessage.trim(),
 timestamp: new Date().toISOString(),
 project_id: projectId
 };
 
 setMessages(prev => [...prev, localMessage]);
 setNewMessage('');
 };

 const timeAgo = (dateString: string) => {
 const date = new Date(dateString);
 const now = new Date();
 const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

 if (diffInSeconds < 60) return 'now';
 if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
 if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
 return `${Math.floor(diffInSeconds / 86400)}d`;
 };

 useEffect(() => {
 if (isOpen && !websocketRef.current) {
 connectWebSocket();
 }

 return () => {
 if (websocketRef.current) {
 websocketRef.current.close();
 websocketRef.current = null;
 }
 };
 }, [isOpen, projectId]);

 useEffect(() => {
 scrollToBottom();
 }, [messages]);

 if (!isOpen) {
 return (
 <button
 onClick={() => setIsOpen(true)}
 className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
 >
 <ChatBubbleLeftRightIcon className="w-6 h-6" />
 </button>
 );
 }

 return (
 <div className={`fixed bottom-4 right-4 bg-white rounded-lg shadow-xl border border-gray-200 z-50 ${
 isMinimized ? 'w-80 h-12' : 'w-80 h-96'
 } transition-all duration-200`}>
 {/* Header */}
 <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-blue-600 text-white rounded-t-lg">
 <div className="flex items-center space-x-2">
 <ChatBubbleLeftRightIcon className="w-5 h-5" />
 <div>
 <h3 className="text-sm font-medium truncate">{projectName}</h3>
 <p className="text-xs opacity-90">
 {isConnected ? (
 <span className="flex items-center">
 <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
 Connected
 </span>
 ) : (
 <span className="flex items-center">
 <span className="w-2 h-2 bg-red-400 rounded-full mr-1"></span>
 Disconnected
 </span>
 )}
 </p>
 </div>
 </div>
 <div className="flex items-center space-x-1">
 <button
 onClick={() => setIsMinimized(!isMinimized)}
 className="p-1 hover:bg-blue-700 rounded"
 >
 <MinusIcon className="w-4 h-4" />
 </button>
 <button
 onClick={() => setIsOpen(false)}
 className="p-1 hover:bg-blue-700 rounded"
 >
 <XMarkIcon className="w-4 h-4" />
 </button>
 </div>
 </div>

 {!isMinimized && (
 <>
 {/* Messages */}
 <div className="flex-1 p-4 space-y-3 overflow-y-auto h-64">
 {messages.length === 0 ? (
 <div className="text-center text-gray-500 text-sm">
 <ChatBubbleLeftRightIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
 <p>No messages yet</p>
 <p className="text-xs">Start chatting with your team!</p>
 </div>
 ) : (
 messages.map((message) => (
 <div key={message.id} className="flex space-x-2">
 <div className="flex-shrink-0">
 <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
 <UserIcon className="w-4 h-4 text-gray-600" />
 </div>
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center space-x-2">
 <span className="text-xs font-medium text-gray-900">
 {message.from_user || message.author || 'System'}
 </span>
 <span className="text-xs text-gray-500">
 {timeAgo(message.timestamp)}
 </span>
 </div>
 <p className="text-sm text-gray-700 mt-1">
 {message.content || message.message}
 </p>
 </div>
 </div>
 ))
 )}
 <div ref={messagesEndRef} />
 </div>

 {/* Input */}
 <div className="p-4 border-t border-gray-200">
 <div className="flex space-x-2">
 <input
 type="text"
 value={newMessage}
 onChange={(e) => setNewMessage(e.target.value)}
 placeholder="Type a message..."
 className="flex-1 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 onKeyPress={(e) => {
 if (e.key === 'Enter' && !e.shiftKey) {
 e.preventDefault();
 sendMessage();
 }
 }}
 disabled={!isConnected}
 />
 <button
 onClick={sendMessage}
 disabled={!newMessage.trim() || !isConnected}
 className="bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
 >
 <PaperAirplaneIcon className="w-4 h-4" />
 </button>
 </div>
 </div>
 </>
 )}
 </div>
 );
};

export default ProjectChat;
