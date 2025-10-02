import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatBubbleLeftIcon, PaperAirplaneIcon, UserIcon, PaperClipIcon, XMarkIcon, DocumentIcon } from '@heroicons/react/24/outline';

interface User {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  avatar_url?: string;
}

interface Attachment {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type?: string;
}

interface Comment {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  parent_comment_id?: string;
  mentions: string[];
  linked_tasks: string[];
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  user?: User;
  replies?: Comment[];
  attachments?: Attachment[];
}

interface ProjectCommentsProps {
  projectId: string;
}

const ProjectComments: React.FC<ProjectCommentsProps> = ({ projectId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchComments = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `http://localhost:8000/api/v1/projects/${projectId}/comments`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  }, [projectId]);

  const addComment = async (content: string, parentId?: string, files?: File[]) => {
    if (!content.trim() && (!files || files.length === 0)) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      
      // Use the new endpoint for comments with files
      if (files && files.length > 0) {
        const formData = new FormData();
        formData.append('content', content.trim() || 'Shared files');
        if (parentId) {
          formData.append('parent_comment_id', parentId);
        }
        
        files.forEach(file => {
          formData.append('files', file);
        });
        
        const response = await fetch(
          `http://localhost:8000/api/v1/projects/${projectId}/comments/with-files`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData,
          }
        );

        if (response.ok) {
          setNewComment('');
          setReplyContent('');
          setReplyingTo(null);
          setSelectedFiles([]);
          fetchComments();
        }
      } else {
        // Use original endpoint for text-only comments
        const response = await fetch(
          `http://localhost:8000/api/v1/projects/${projectId}/comments`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: content.trim(),
              parent_comment_id: parentId,
            }),
          }
        );

        if (response.ok) {
          setNewComment('');
          setReplyContent('');
          setReplyingTo(null);
          fetchComments();
        }
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatMentions = (content: string) => {
    // Simple mention highlighting - replace with more sophisticated logic
    return content.replace(/@(\w+)/g, '<span class="text-blue-600 font-medium">@$1</span>');
  };

  const formatTaskLinks = (content: string) => {
    // Simple task link highlighting - replace with actual task link logic
    return content.replace(/#([A-Z0-9-]+)/g, '<span class="text-green-600 font-medium cursor-pointer hover:underline">#$1</span>');
  };

  const formatContent = (content: string) => {
    let formatted = formatMentions(content);
    formatted = formatTaskLinks(formatted);
    return formatted;
  };

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const CommentItem: React.FC<{ comment: Comment; isReply?: boolean }> = ({ comment, isReply = false }) => (
    <div className={`${isReply ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''} mb-4`}>
      <div className="flex space-x-3">
        <div className="flex-shrink-0">
          {comment.user?.avatar_url ? (
            <img
              className="w-8 h-8 rounded-full"
              src={comment.user.avatar_url}
              alt={comment.user.full_name || comment.user.username}
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-gray-600" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm">
            <span className="font-medium text-gray-900">
              {comment.user?.full_name || comment.user?.username || 'Unknown User'}
            </span>
            <span className="text-gray-500 ml-2">
              {timeAgo(comment.created_at)}
              {comment.is_edited && <span className="ml-1 text-xs">(edited)</span>}
            </span>
          </div>
          <div 
            className="mt-1 text-sm text-gray-700"
            dangerouslySetInnerHTML={{ __html: formatContent(comment.content) }}
          />
          
          {/* Attachments */}
          {comment.attachments && comment.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {comment.attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
                  <DocumentIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {attachment.original_filename}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatFileSize(attachment.file_size)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
            <button
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              className="hover:text-blue-600 flex items-center space-x-1"
            >
              <ChatBubbleLeftIcon className="w-4 h-4" />
              <span>Reply</span>
            </button>
          </div>
          
          {replyingTo === comment.id && (
            <div className="mt-3">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      addComment(replyContent, comment.id);
                    }
                  }}
                />
                <button
                  onClick={() => addComment(replyContent, comment.id)}
                  disabled={isLoading || !replyContent.trim()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4">
              {comment.replies.map((reply) => (
                <CommentItem key={reply.id} comment={reply} isReply={true} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <ChatBubbleLeftIcon className="w-5 h-5 mr-2" />
          Project Discussion
        </h3>
      </div>
      
      <div className="px-6 py-4">
        {/* Add new comment */}
        <div className="mb-6">
          <div className="flex space-x-3">
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts about this project... Use @username to mention someone or #TASK-123 to link tasks"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
              
              {/* Selected files display */}
              {selectedFiles.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="text-xs text-gray-600 font-medium">Attached files:</div>
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded-md">
                      <div className="flex items-center space-x-2">
                        <DocumentIcon className="w-4 h-4 text-blue-500" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{file.name}</div>
                          <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="p-1 hover:bg-blue-100 rounded"
                      >
                        <XMarkIcon className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-2 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="text-xs text-gray-500">
                    Tip: Use @username to mention, #TASK-123 to link tasks
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700"
                  >
                    <PaperClipIcon className="w-4 h-4" />
                    <span>Attach files</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar"
                  />
                </div>
                <button
                  onClick={() => addComment(newComment, undefined, selectedFiles)}
                  disabled={isLoading || (!newComment.trim() && selectedFiles.length === 0)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm flex items-center space-x-2"
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                  <span>{isLoading ? 'Posting...' : 'Post Comment'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Comments list */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ChatBubbleLeftIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>No comments yet. Start the discussion!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectComments;
