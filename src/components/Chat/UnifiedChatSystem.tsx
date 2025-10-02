import React, { useState, useEffect, useRef } from 'react';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  UserIcon,
  XMarkIcon,
  MinusIcon,
  PlusIcon,
  HashtagIcon,
  AtSymbolIcon,
  EllipsisVerticalIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  VideoCameraIcon,
  InformationCircleIcon,
  PaperClipIcon,
  FaceSmileIcon
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar_url?: string;
  is_online: boolean;
  last_seen?: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
}

interface ChatMessage {
  id: string;
  type: 'message' | 'system' | 'file' | 'call';
  content: string;
  from_user_id: string;
  from_user: User;
  timestamp: string;
  edited_at?: string;
  is_edited: boolean;
  thread_id?: string;
  reply_to?: ChatMessage;
  mentions: string[];
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
}

interface MessageAttachment {
  id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  url: string;
  thumbnail_url?: string;
}

interface MessageReaction {
  id: string;
  user_id: string;
  user: User;
  emoji: string;
}

interface ChatChannel {
  id: string;
  name: string;
  type: 'project' | 'direct' | 'group';
  description?: string;
  is_private: boolean;
  participants: User[];
  last_message?: ChatMessage;
  unread_count: number;
  created_at: string;
  project_id?: string;
}

interface UnifiedChatSystemProps {
  currentUser: User;
  channels: ChatChannel[];
  projectMembers: User[];
  onSendMessage: (channelId: string, content: string, replyTo?: string, mentions?: string[]) => void;
  onCreateChannel: (name: string, type: 'project' | 'group', participants: string[]) => void;
  onJoinChannel: (channelId: string) => void;
  onLeaveChannel: (channelId: string) => void;
  onStartDirectMessage: (userId: string) => void;
}

const UnifiedChatSystem: React.FC<UnifiedChatSystemProps> = ({
  currentUser,
  channels,
  projectMembers,
  onSendMessage,
  onCreateChannel,
  onJoinChannel,
  onLeaveChannel,
  onStartDirectMessage
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeChannel, setActiveChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showChannelList, setShowChannelList] = useState(true);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  
  // WebSocket connection
  const [isConnected, setIsConnected] = useState(false);
  const websocketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Create channel form
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<'project' | 'group'>('group');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const connectWebSocket = () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const wsUrl = `ws://localhost:8000/api/v1/ws/chat?token=${token}`;
    websocketRef.current = new WebSocket(wsUrl);

    websocketRef.current.onopen = () => {
      setIsConnected(true);
      console.log('Connected to chat system');
    };

    websocketRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'message') {
          const message: ChatMessage = {
            id: data.id,
            type: data.message_type || 'message',
            content: data.content,
            from_user_id: data.from_user_id,
            from_user: data.from_user,
            timestamp: data.timestamp,
            is_edited: data.is_edited || false,
            mentions: data.mentions || [],
            attachments: data.attachments || [],
            reactions: data.reactions || []
          };
          
          if (activeChannel && data.channel_id === activeChannel.id) {
            setMessages(prev => [...prev, message]);
          }
        } else if (data.type === 'user_status') {
          // Handle user online/offline status updates
          console.log('User status update:', data);
        } else if (data.type === 'typing') {
          // Handle typing indicators
          console.log('Typing indicator:', data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    websocketRef.current.onclose = () => {
      setIsConnected(false);
      console.log('Disconnected from chat system');
    };

    websocketRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeChannel) return;

    const mentions = extractMentions(newMessage);
    onSendMessage(activeChannel.id, newMessage.trim(), replyingTo?.id, mentions);
    
    // Send via WebSocket for real-time delivery
    if (websocketRef.current && isConnected) {
      websocketRef.current.send(JSON.stringify({
        type: 'send_message',
        channel_id: activeChannel.id,
        content: newMessage.trim(),
        reply_to: replyingTo?.id,
        mentions
      }));
    }
    
    setNewMessage('');
    setReplyingTo(null);
  };

  const extractMentions = (content: string): string[] => {
    const mentions: string[] = [];
    const mentionMatches = content.match(/@(\w+)/g);
    
    if (mentionMatches) {
      mentionMatches.forEach(match => {
        const username = match.substring(1);
        const user = projectMembers.find(u => u.username === username);
        if (user) mentions.push(user.id);
      });
    }
    
    return mentions;
  };

  const handleCreateChannel = () => {
    if (!newChannelName.trim()) return;
    
    onCreateChannel(newChannelName.trim(), newChannelType, selectedParticipants);
    setShowCreateChannel(false);
    setNewChannelName('');
    setSelectedParticipants([]);
  };

  const getChannelIcon = (channel: ChatChannel) => {
    if (channel.type === 'direct') {
      return <UserIcon className="w-4 h-4" />;
    } else if (channel.type === 'project') {
      return <HashtagIcon className="w-4 h-4" />;
    } else {
      return <ChatBubbleLeftRightIcon className="w-4 h-4" />;
    }
  };

  const getChannelName = (channel: ChatChannel) => {
    if (channel.type === 'direct') {
      const otherUser = channel.participants.find(p => p.id !== currentUser.id);
      return otherUser?.full_name || 'Unknown User';
    }
    return channel.name;
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-400';
      case 'away':
        return 'bg-yellow-400';
      case 'busy':
        return 'bg-red-400';
      default:
        return 'bg-gray-400';
    }
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

  const filteredChannels = channels.filter(channel =>
    getChannelName(channel).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = projectMembers.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    user.id !== currentUser.id
  );

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
  }, [isOpen]);

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
        {channels.some(c => c.unread_count > 0) && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {channels.reduce((sum, c) => sum + c.unread_count, 0)}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 bg-white rounded-lg shadow-xl border border-gray-200 z-50 ${
      isMinimized ? 'w-80 h-12' : 'w-96 h-[32rem]'
    } transition-all duration-200 flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-blue-600 text-white rounded-t-lg">
        <div className="flex items-center space-x-2">
          <ChatBubbleLeftRightIcon className="w-5 h-5" />
          <div>
            <h3 className="text-sm font-medium">
              {activeChannel ? getChannelName(activeChannel) : 'Team Chat'}
            </h3>
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
            onClick={() => setShowChannelList(!showChannelList)}
            className="p-1 hover:bg-blue-700 rounded"
          >
            <HashtagIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowUserList(!showUserList)}
            className="p-1 hover:bg-blue-700 rounded"
          >
            <UserIcon className="w-4 h-4" />
          </button>
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
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          {(showChannelList || showUserList) && (
            <div className="w-64 border-r border-gray-200 flex flex-col">
              {/* Search */}
              <div className="p-3 border-b border-gray-200">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={showChannelList ? "Search channels..." : "Search users..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-2 w-full text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {showChannelList ? (
                  <div>
                    {/* Create Channel Button */}
                    <div className="p-3">
                      <button
                        onClick={() => setShowCreateChannel(true)}
                        className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:border-gray-400 hover:text-gray-700"
                      >
                        <PlusIcon className="w-4 h-4" />
                        <span>Create Channel</span>
                      </button>
                    </div>

                    {/* Channels List */}
                    <div className="space-y-1 px-2">
                      {filteredChannels.map((channel) => (
                        <button
                          key={channel.id}
                          onClick={() => {
                            setActiveChannel(channel);
                            setShowChannelList(false);
                          }}
                          className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md text-left ${
                            activeChannel?.id === channel.id
                              ? 'bg-blue-100 text-blue-900'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {getChannelIcon(channel)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {getChannelName(channel)}
                            </p>
                            {channel.last_message && (
                              <p className="text-xs text-gray-500 truncate">
                                {channel.last_message.content}
                              </p>
                            )}
                          </div>
                          {channel.unread_count > 0 && (
                            <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                              {channel.unread_count}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 px-2 pt-2">
                    {filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          onStartDirectMessage(user.id);
                          setShowUserList(false);
                        }}
                        className="w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left hover:bg-gray-100"
                      >
                        <div className="relative">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-700">
                                {user.first_name[0]}{user.last_name[0]}
                              </span>
                            </div>
                          )}
                          <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white ${getStatusColor(user.status)}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user.full_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {user.status === 'online' ? 'Online' : `Last seen ${timeAgo(user.last_seen || '')}`}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {activeChannel ? (
              <>
                {/* Channel Header */}
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getChannelIcon(activeChannel)}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {getChannelName(activeChannel)}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {activeChannel.participants.length} members
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {activeChannel.type === 'direct' && (
                        <>
                          <button className="p-1 text-gray-400 hover:text-green-600">
                            <PhoneIcon className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-blue-600">
                            <VideoCameraIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <InformationCircleIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-gray-50">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm">
                      <ChatBubbleLeftRightIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>No messages yet</p>
                      <p className="text-xs">Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div key={message.id} className="flex space-x-2">
                        <div className="flex-shrink-0">
                          {message.from_user.avatar_url ? (
                            <img src={message.from_user.avatar_url} alt="" className="h-6 w-6 rounded-full" />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-700">
                                {message.from_user.first_name[0]}{message.from_user.last_name[0]}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium text-gray-900">
                              {message.from_user.full_name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {timeAgo(message.timestamp)}
                            </span>
                            {message.is_edited && (
                              <span className="text-xs text-gray-400">(edited)</span>
                            )}
                          </div>
                          
                          {message.reply_to && (
                            <div className="mt-1 p-2 bg-gray-200 rounded border-l-2 border-gray-400">
                              <p className="text-xs text-gray-600">
                                Replying to <span className="font-medium">{message.reply_to.from_user.full_name}</span>
                              </p>
                              <p className="text-xs text-gray-700 truncate">{message.reply_to.content}</p>
                            </div>
                          )}
                          
                          <p className="text-sm text-gray-700 mt-1">
                            {message.content}
                          </p>
                          
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {message.attachments.map((attachment) => (
                                <div key={attachment.id} className="flex items-center space-x-2 p-2 bg-white rounded border">
                                  <PaperClipIcon className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm text-gray-700">{attachment.filename}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-2 mt-1">
                            <button
                              onClick={() => setReplyingTo(message)}
                              className="text-xs text-gray-500 hover:text-blue-600"
                            >
                              Reply
                            </button>
                            <button className="text-xs text-gray-500 hover:text-yellow-600">
                              <FaceSmileIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply indicator */}
                {replyingTo && (
                  <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="text-blue-700">Replying to </span>
                        <span className="font-medium text-blue-900">{replyingTo.from_user.full_name}</span>
                        <span className="text-gray-600 ml-2 truncate">{replyingTo.content}</span>
                      </div>
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="text-blue-400 hover:text-blue-600"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="p-4 border-t border-gray-200 bg-white">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={replyingTo ? "Reply..." : "Type a message..."}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={!isConnected}
                    />
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <PaperClipIcon className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-yellow-600">
                      <FaceSmileIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || !isConnected}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      <PaperAirplaneIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Select a conversation</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Choose a channel or start a direct message to begin chatting.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create Channel</h3>
              <button
                onClick={() => setShowCreateChannel(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleCreateChannel(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Channel Name</label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Enter channel name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={newChannelType}
                  onChange={(e) => setNewChannelType(e.target.value as 'project' | 'group')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="group">Group Chat</option>
                  <option value="project">Project Channel</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Participants</label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {projectMembers.filter(u => u.id !== currentUser.id).map((user) => (
                    <label key={user.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedParticipants.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedParticipants([...selectedParticipants, user.id]);
                          } else {
                            setSelectedParticipants(selectedParticipants.filter(id => id !== user.id));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{user.full_name}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateChannel(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedChatSystem;
