import React, { useState, useEffect, useRef } from 'react';
import {
  SparklesIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  CheckIcon,
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import apiClient from '../../api/client';

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: string;
  payload?: any;
  context_detected?: any;
  created_at: string;
}

interface ContextCard {
  id: string;
  card_type: string;
  title: string;
  data: any;
  status: 'preview' | 'confirmed' | 'rejected';
}

interface AIConversationChatProps {
  onClose?: () => void;
  initialSessionId?: string;
}

const AIConversationChat: React.FC<AIConversationChatProps> = ({ onClose, initialSessionId }) => {
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextCard, setContextCard] = useState<ContextCard | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (initialSessionId) {
      loadConversationHistory(initialSessionId);
    }
  }, [initialSessionId]);

  const loadConversationHistory = async (sid: string) => {
    try {
      const response = await apiClient.get(`/ai/conversation/${sid}/history`);
      setMessages(response.data);
      setSessionId(sid);
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Optimistically add user message
    const tempUserMsg: AIMessage = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await apiClient.post('/ai/conversation/message', {
        content: userMessage,
        session_id: sessionId
      });

      const data = response.data;
      
      // Update session ID if new
      if (!sessionId) {
        setSessionId(data.session_id);
      }

      // Replace temp message with actual user message and add assistant response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempUserMsg.id);
        return [
          ...filtered,
          tempUserMsg,
          {
            id: data.message_id,
            role: 'assistant',
            content: data.assistant,
            mode: data.mode,
            payload: data.payload,
            context_detected: data.context_detected,
            created_at: new Date().toISOString()
          }
        ];
      });

      // Show context card in right pane if there's payload
      if (data.payload && data.mode !== 'idle') {
        setContextCard({
          id: data.message_id,
          card_type: data.mode,
          title: getCardTitle(data.mode, data.payload),
          data: data.payload,
          status: 'preview'
        });
        setShowPreview(true);
      }

    } catch (error: any) {
      console.error('Failed to send message:', error);
      
      // Show error as assistant message
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempUserMsg.id),
        tempUserMsg,
        {
          id: 'error-' + Date.now(),
          role: 'assistant',
          content: "Sorry, I'm having trouble processing that. Could you try rephrasing?",
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const getCardTitle = (mode: string, payload: any): string => {
    switch (mode) {
      case 'create_project':
        return `Create Project: ${payload.name || 'New Project'}`;
      case 'create_task':
        return `Create Task: ${payload.title || 'New Task'}`;
      case 'invoice_create_from_nl':
        return `Invoice Preview`;
      case 'overdue_tasks':
        return 'Your Overdue Tasks';
      case 'at_risk_projects':
        return 'Projects at Risk';
      case 'team_workload_week':
        return 'Team Workload This Week';
      default:
        return mode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const handleConfirmAction = async () => {
    if (!contextCard) return;
    
    try {
      await apiClient.patch(`/ai/conversation/context-card/${contextCard.id}`, {
        status: 'confirmed'
      });
      
      setContextCard({ ...contextCard, status: 'confirmed' });
      
      // Add confirmation message
      setMessages(prev => [...prev, {
        id: 'confirm-' + Date.now(),
        role: 'assistant',
        content: '✓ Done! Action confirmed and executed.',
        created_at: new Date().toISOString()
      }]);
      
      // Close preview after confirmation
      setTimeout(() => setShowPreview(false), 2000);
    } catch (error) {
      console.error('Failed to confirm action:', error);
    }
  };

  const handleRejectAction = async () => {
    if (!contextCard) return;
    
    try {
      await apiClient.patch(`/ai/conversation/context-card/${contextCard.id}`, {
        status: 'rejected'
      });
      
      setContextCard(null);
      setShowPreview(false);
      
      // Add rejection message
      setMessages(prev => [...prev, {
        id: 'reject-' + Date.now(),
        role: 'assistant',
        content: 'No worries! Cancelled that. What would you like to do instead?',
        created_at: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Failed to reject action:', error);
    }
  };

  const renderContextCard = () => {
    if (!contextCard || !showPreview) return null;

    return (
      <div className="h-full flex flex-col bg-gray-50">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">{contextCard.title}</h3>
            <button
              onClick={() => setShowPreview(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">
              {JSON.stringify(contextCard.data, null, 2)}
            </pre>
          </div>
        </div>

        {/* Actions */}
        {contextCard.status === 'preview' && (
          <div className="px-4 py-3 border-t border-gray-200 bg-white">
            <div className="flex space-x-2">
              <button
                onClick={handleConfirmAction}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <CheckIcon className="w-4 h-4 mr-2" />
                Confirm
              </button>
              <button
                onClick={handleRejectAction}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                <XCircleIcon className="w-4 h-4 mr-2" />
                Cancel
              </button>
            </div>
          </div>
        )}

        {contextCard.status === 'confirmed' && (
          <div className="px-4 py-3 border-t border-gray-200 bg-green-50">
            <div className="flex items-center justify-center text-green-700">
              <CheckIcon className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Action Confirmed</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full">
      {/* Chat Pane - Left */}
      <div className="flex-1 flex flex-col bg-white border-r border-gray-200">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <SparklesIcon className="w-5 h-5" />
              <h3 className="text-sm font-medium">AI Assistant</h3>
            </div>
            {onClose && (
              <button onClick={onClose} className="text-white hover:text-gray-200">
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center2">
              <SparklesIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Hi! I'm your AI teammate
              </h4>
              <p className="text-sm text-gray-500">
                Ask me anything about your projects, tasks, invoices, or team.
              </p>
              <div className="mt-4 text-left max-w-md mx-auto">
                <p className="text-xs text-gray-400 mb-2">Try asking:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• "Show my overdue tasks"</li>
                  <li>• "Create invoice for @ADDC"</li>
                  <li>• "What's the team workload this week?"</li>
                  <li>• "Create a new project for mobile app"</li>
                </ul>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                {message.context_detected && message.context_detected.mentions && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs opacity-70">
                      Detected: {message.context_detected.mentions.map((m: string) => `@${m}`).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <ArrowPathIcon className="w-4 h-4 animate-spin text-gray-500" />
                  <span className="text-sm text-gray-500">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type your message... (use @mentions)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || loading}
              className="bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Tip: Use @mentions for people/customers, #hashtags for projects
          </p>
        </div>
      </div>

      {/* Preview Pane - Right */}
      {showPreview && contextCard && (
        <div className="w-96 flex flex-col">
          {renderContextCard()}
        </div>
      )}
    </div>
  );
};

export default AIConversationChat;
