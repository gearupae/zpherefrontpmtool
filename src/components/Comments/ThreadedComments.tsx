import React, { useState, useRef, useEffect } from 'react';
import {
  ChatBubbleLeftIcon,
  UserIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  HeartIcon,
  LinkIcon,
  ArrowUturnLeftIcon,
  AtSymbolIcon,
  HashtagIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

interface User {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar_url?: string;
  role: string;
}

interface Comment {
  id: string;
  content: string;
  user_id: string;
  user: User;
  parent_comment_id?: string;
  mentions: string[]; // User IDs mentioned in comment
  linked_tasks: string[]; // Task IDs linked in comment
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  replies?: Comment[];
  attachments?: CommentAttachment[];
  reactions?: CommentReaction[];
  likes_count?: number;
  is_liked?: boolean;
}

interface CommentAttachment {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  file_path: string;
}

interface CommentReaction {
  id: string;
  user_id: string;
  user: User;
  reaction_type: string; // emoji or reaction type
}

interface TaskReference {
  id: string;
  title: string;
  status: string;
  priority: string;
}

interface ThreadedCommentsProps {
  comments: Comment[];
  currentUser: User;
  projectMembers: User[];
  taskReferences: TaskReference[];
  entityType: 'task' | 'project';
  entityId: string;
  onAddComment: (content: string, parentId?: string, mentions?: string[], linkedTasks?: string[]) => void;
  onEditComment: (commentId: string, content: string, mentions?: string[], linkedTasks?: string[]) => void;
  onDeleteComment: (commentId: string) => void;
  onLikeComment: (commentId: string) => void;
  onUploadAttachment?: (file: File, commentId: string) => void;
}

const ThreadedComments: React.FC<ThreadedCommentsProps> = ({
  comments,
  currentUser,
  projectMembers,
  taskReferences,
  entityType,
  entityId,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onLikeComment,
  onUploadAttachment
}) => {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [showTaskSuggestions, setShowTaskSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [taskQuery, setTaskQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // Build nested comment tree
  const buildCommentTree = (comments: Comment[]): Comment[] => {
    const commentMap = new Map<string, Comment>();
    const topLevelComments: Comment[] = [];

    // First pass: create map of all comments
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: build tree structure
    comments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)!;
      if (comment.parent_comment_id) {
        const parent = commentMap.get(comment.parent_comment_id);
        if (parent) {
          parent.replies!.push(commentWithReplies);
        }
      } else {
        topLevelComments.push(commentWithReplies);
      }
    });

    return topLevelComments;
  };

  const commentTree = buildCommentTree(comments);

  // Parse mentions and task links from content
  const parseMentionsAndTasks = (content: string) => {
    const mentions: string[] = [];
    const linkedTasks: string[] = [];
    
    // Extract @mentions
    const mentionMatches = content.match(/@(\w+)/g);
    if (mentionMatches) {
      mentionMatches.forEach(match => {
        const username = match.substring(1);
        const user = projectMembers.find(u => u.username === username);
        if (user) mentions.push(user.id);
      });
    }
    
    // Extract #task references
    const taskMatches = content.match(/#(\w+)/g);
    if (taskMatches) {
      taskMatches.forEach(match => {
        const taskRef = match.substring(1);
        const task = taskReferences.find(t => 
          t.title.toLowerCase().includes(taskRef.toLowerCase()) || 
          t.id === taskRef
        );
        if (task) linkedTasks.push(task.id);
      });
    }
    
    return { mentions, linkedTasks };
  };

  // Handle @mentions and #task suggestions
  const handleInputChange = (value: string, inputRef: React.RefObject<HTMLTextAreaElement | null>) => {
    if (editingComment) {
      setEditContent(value);
    } else {
      setNewComment(value);
    }
    
    const cursorPos = inputRef.current?.selectionStart || 0;
    setCursorPosition(cursorPos);
    
    // Check for @mention trigger
    const beforeCursor = value.substring(0, cursorPos);
    const mentionMatch = beforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentionSuggestions(true);
      setShowTaskSuggestions(false);
    } else {
      setShowMentionSuggestions(false);
    }
    
    // Check for #task trigger
    const taskMatch = beforeCursor.match(/#(\w*)$/);
    if (taskMatch) {
      setTaskQuery(taskMatch[1]);
      setShowTaskSuggestions(true);
      setShowMentionSuggestions(false);
    } else {
      setShowTaskSuggestions(false);
    }
  };

  const insertSuggestion = (suggestion: string, type: 'mention' | 'task') => {
    const input = editingComment ? editInputRef.current : commentInputRef.current;
    if (!input) return;
    
    const value = editingComment ? editContent : newComment;
    const beforeCursor = value.substring(0, cursorPosition);
    const afterCursor = value.substring(cursorPosition);
    
    let newValue = '';
    if (type === 'mention') {
      const mentionMatch = beforeCursor.match(/@(\w*)$/);
      if (mentionMatch) {
        newValue = beforeCursor.replace(/@(\w*)$/, `@${suggestion} `) + afterCursor;
      }
    } else {
      const taskMatch = beforeCursor.match(/#(\w*)$/);
      if (taskMatch) {
        newValue = beforeCursor.replace(/#(\w*)$/, `#${suggestion} `) + afterCursor;
      }
    }
    
    if (editingComment) {
      setEditContent(newValue);
    } else {
      setNewComment(newValue);
    }
    
    setShowMentionSuggestions(false);
    setShowTaskSuggestions(false);
    input.focus();
  };

  const handleSubmitComment = () => {
    const content = newComment.trim();
    if (!content) return;
    
    const { mentions, linkedTasks } = parseMentionsAndTasks(content);
    onAddComment(content, replyingTo || undefined, mentions, linkedTasks);
    setNewComment('');
    setReplyingTo(null);
  };

  const handleSubmitEdit = () => {
    const content = editContent.trim();
    if (!content || !editingComment) return;
    
    const { mentions, linkedTasks } = parseMentionsAndTasks(content);
    onEditComment(editingComment, content, mentions, linkedTasks);
    setEditingComment(null);
    setEditContent('');
  };

  const renderContent = (content: string, mentions: string[], linkedTasks: string[]) => {
    let processedContent = content;
    
    // Highlight mentions
    mentions.forEach(userId => {
      const user = projectMembers.find(u => u.id === userId);
      if (user) {
        const mentionRegex = new RegExp(`@${user.username}`, 'g');
        processedContent = processedContent.replace(
          mentionRegex,
          `<span class="bg-blue-100 text-blue-800 px-1 rounded">@${user.username}</span>`
        );
      }
    });
    
    // Highlight task links
    linkedTasks.forEach(taskId => {
      const task = taskReferences.find(t => t.id === taskId);
      if (task) {
        const taskRegex = new RegExp(`#${task.title}`, 'gi');
        processedContent = processedContent.replace(
          taskRegex,
          `<span class="bg-green-100 text-green-800 px-1 rounded cursor-pointer hover:bg-green-200">#${task.title}</span>`
        );
      }
    });
    
    return { __html: processedContent };
  };

  const renderComment = (comment: Comment, depth: number = 0) => {
    const isEditing = editingComment === comment.id;
    const canEdit = comment.user_id === currentUser.id;
    const canDelete = canEdit || ['ADMIN', 'MANAGER'].includes(currentUser.role);
    
    return (
      <div key={comment.id} className={`${depth > 0 ? 'ml-8 border-l border-gray-200 pl-4' : ''}`}>
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
          <div className="flex items-start space-x-3">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {comment.user.avatar_url ? (
                <img
                  src={comment.user.avatar_url}
                  alt=""
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-700">
                    {comment.user.first_name[0]}{comment.user.last_name[0]}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-gray-900">{comment.user.full_name}</p>
                  <span className="text-xs text-gray-500">@{comment.user.username}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(comment.created_at).toLocaleString()}
                  </span>
                  {comment.is_edited && (
                    <span className="text-xs text-gray-400">(edited)</span>
                  )}
                </div>
                
                {(canEdit || canDelete) && (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onLikeComment(comment.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      {comment.is_liked ? (
                        <HeartIconSolid className="w-4 h-4 text-red-600" />
                      ) : (
                        <HeartIcon className="w-4 h-4" />
                      )}
                    </button>
                    {comment.likes_count && comment.likes_count > 0 && (
                      <span className="text-xs text-gray-500">{comment.likes_count}</span>
                    )}
                    
                    {canEdit && (
                      <button
                        onClick={() => {
                          setEditingComment(comment.id);
                          setEditContent(comment.content);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this comment?')) {
                            onDeleteComment(comment.id);
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="mt-2">
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      ref={editInputRef}
                      value={editContent}
                      onChange={(e) => handleInputChange(e.target.value, editInputRef)}
                      className="w-full p-2 border border-gray-300 rounded-md resize-none"
                      rows={3}
                      placeholder="Edit your comment..."
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setEditingComment(null)}
                        className="btn-cancel text-sm rounded"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmitEdit}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="text-sm text-gray-700"
                    dangerouslySetInnerHTML={renderContent(comment.content, comment.mentions, comment.linked_tasks)}
                  />
                )}
              </div>
              
              {/* Attachments */}
              {comment.attachments && comment.attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {comment.attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                      <LinkIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{attachment.original_filename}</span>
                      <span className="text-xs text-gray-500">
                        ({Math.round(attachment.file_size / 1024)} KB)
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Actions */}
              {!isEditing && (
                <div className="mt-3 flex items-center space-x-4">
                  <button
                    onClick={() => setReplyingTo(comment.id)}
                    className="flex items-center space-x-1 text-sm text-gray-500 hover:text-blue-600"
                  >
                    <ArrowUturnLeftIcon className="w-4 h-4" />
                    <span>Reply</span>
                  </button>
                  {comment.replies && comment.replies.length > 0 && (
                    <span className="text-sm text-gray-500">
                      {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Render replies */}
        {comment.replies && comment.replies.map(reply => renderComment(reply, depth + 1))}
        
        {/* Reply form */}
        {replyingTo === comment.id && (
          <div className="ml-8 mb-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {currentUser.avatar_url ? (
                    <img src={currentUser.avatar_url} alt="" className="h-6 w-6 rounded-full" />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="text-xs font-medium text-white">
                        {currentUser.first_name[0]}{currentUser.last_name[0]}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="relative">
                    <textarea
                      ref={commentInputRef}
                      value={newComment}
                      onChange={(e) => handleInputChange(e.target.value, commentInputRef)}
                      className="w-full p-2 border border-gray-300 rounded-md resize-none"
                      rows={2}
                      placeholder={`Reply to ${comment.user.first_name}...`}
                    />
                    
                    {/* Mention suggestions */}
                    {showMentionSuggestions && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {projectMembers
                          .filter(user => 
                            user.username.toLowerCase().includes(mentionQuery.toLowerCase()) ||
                            user.full_name.toLowerCase().includes(mentionQuery.toLowerCase())
                          )
                          .slice(0, 5)
                          .map(user => (
                            <button
                              key={user.id}
                              onClick={() => insertSuggestion(user.username, 'mention')}
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center space-x-2"
                            >
                              <AtSymbolIcon className="w-4 h-4 text-blue-500" />
                              <span className="font-medium">{user.username}</span>
                              <span className="text-gray-500">({user.full_name})</span>
                            </button>
                          ))
                        }
                      </div>
                    )}
                    
                    {/* Task suggestions */}
                    {showTaskSuggestions && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {taskReferences
                          .filter(task => 
                            task.title.toLowerCase().includes(taskQuery.toLowerCase())
                          )
                          .slice(0, 5)
                          .map(task => (
                            <button
                              key={task.id}
                              onClick={() => insertSuggestion(task.title, 'task')}
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center space-x-2"
                            >
                              <HashtagIcon className="w-4 h-4 text-green-500" />
                              <span className="font-medium">{task.title}</span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {task.status}
                              </span>
                            </button>
                          ))
                        }
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-xs text-gray-500">
                      Use @username to mention someone or #task to link a task
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setReplyingTo(null);
                          setNewComment('');
                        }}
                        className="btn-cancel text-sm rounded"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmitComment}
                        disabled={!newComment.trim()}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* New comment form */}
      {!replyingTo && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {currentUser.avatar_url ? (
                <img src={currentUser.avatar_url} alt="" className="h-8 w-8 rounded-full" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-xs font-medium text-white">
                    {currentUser.first_name[0]}{currentUser.last_name[0]}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="relative">
                <textarea
                  ref={commentInputRef}
                  value={newComment}
                  onChange={(e) => handleInputChange(e.target.value, commentInputRef)}
                  className="w-full p-3 border border-gray-300 rounded-md resize-none"
                  rows={3}
                  placeholder={`Add a comment to this ${entityType}...`}
                />
                
                {/* Mention suggestions */}
                {showMentionSuggestions && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {projectMembers
                      .filter(user => 
                        user.username.toLowerCase().includes(mentionQuery.toLowerCase()) ||
                        user.full_name.toLowerCase().includes(mentionQuery.toLowerCase())
                      )
                      .slice(0, 5)
                      .map(user => (
                        <button
                          key={user.id}
                          onClick={() => insertSuggestion(user.username, 'mention')}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <AtSymbolIcon className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">{user.username}</span>
                          <span className="text-gray-500">({user.full_name})</span>
                        </button>
                      ))
                    }
                  </div>
                )}
                
                {/* Task suggestions */}
                {showTaskSuggestions && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {taskReferences
                      .filter(task => 
                        task.title.toLowerCase().includes(taskQuery.toLowerCase())
                      )
                      .slice(0, 5)
                      .map(task => (
                        <button
                          key={task.id}
                          onClick={() => insertSuggestion(task.title, 'task')}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <HashtagIcon className="w-4 h-4 text-green-500" />
                          <span className="font-medium">{task.title}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            task.status === 'completed' ? 'bg-green-100 text-green-800' :
                            task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.status}
                          </span>
                        </button>
                      ))
                    }
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center mt-3">
                <div className="text-xs text-gray-500">
                  Use @username to mention someone or #task to link a task
                </div>
                <button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Comment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Comments list */}
      <div className="space-y-4">
        {commentTree.length === 0 ? (
          <div className="text-center py-8">
            <ChatBubbleLeftIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No comments yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Start the conversation by adding the first comment.
            </p>
          </div>
        ) : (
          commentTree.map(comment => renderComment(comment))
        )}
      </div>
    </div>
  );
};

export default ThreadedComments;
