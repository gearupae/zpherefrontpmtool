import React, { useState, useEffect, useCallback } from 'react';
import { DocumentIcon, PlusIcon, EyeIcon, TrashIcon, PencilIcon, XMarkIcon, TagIcon } from '@heroicons/react/24/outline';

interface TaskDocument {
 id: string;
 task_id: string;
 title: string;
 content: string;
 document_type: 'notes' | 'specification' | 'requirements' | 'test_plan' | 'design' | 'other';
 tags: string[];
 version: number;
 is_template: boolean;
 created_at: string;
 updated_at: string;
 created_by?: {
 id: string;
 full_name: string;
 avatar_url?: string;
 };
}

interface TaskDocumentsProps {
 taskId: string;
}

const documentTypeLabels = {
 notes: 'Notes',
 specification: 'Specification',
 requirements: 'Requirements',
 test_plan: 'Test Plan',
 design: 'Design Document',
 other: 'Other'
};

const documentTypeColors = {
 notes: 'bg-blue-50 text-blue-700 border-blue-200',
 specification: 'bg-green-50 text-green-700 border-green-200',
 requirements: 'bg-purple-50 text-purple-700 border-purple-200',
 test_plan: 'bg-orange-50 text-orange-700 border-orange-200',
 design: 'bg-pink-50 text-pink-700 border-pink-200',
 other: 'bg-gray-50 text-gray-700 border-gray-200'
};

const TaskDocuments: React.FC<TaskDocumentsProps> = ({ taskId }) => {
 const [documents, setDocuments] = useState<TaskDocument[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [isCreating, setIsCreating] = useState(false);
 const [editingDocument, setEditingDocument] = useState<TaskDocument | null>(null);
 const [previewDocument, setPreviewDocument] = useState<TaskDocument | null>(null);

 const [newDocument, setNewDocument] = useState<Partial<TaskDocument>>({
 title: '',
 content: '',
 document_type: 'notes',
 tags: [],
 is_template: false
 });

 const [tagInput, setTagInput] = useState('');

 const fetchDocuments = useCallback(async () => {
 if (!taskId) return;
 
 setIsLoading(true);
 try {
 const { default: apiClient } = await import('../../api/client');
 const response = await apiClient.get(`/tasks/${taskId}/documents`);
 setDocuments(response.data || []);
 } catch (error) {
 console.error('Error fetching task documents:', error);
 setDocuments([]);
 } finally {
 setIsLoading(false);
 }
 }, [taskId]);

 const handleCreateDocument = async () => {
 if (!newDocument.title?.trim() || !newDocument.content?.trim()) return;

 try {
 const { default: apiClient } = await import('../../api/client');
 const response = await apiClient.post(`/tasks/${taskId}/documents`, {
 ...newDocument,
 task_id: taskId
 });
 
 setDocuments(prev => [...prev, response.data]);
 setNewDocument({
 title: '',
 content: '',
 document_type: 'notes',
 tags: [],
 is_template: false
 });
 setTagInput('');
 setIsCreating(false);
 } catch (error) {
 console.error('Error creating document:', error);
 }
 };

 const handleUpdateDocument = async () => {
 if (!editingDocument) return;

 try {
 const { default: apiClient } = await import('../../api/client');
 const response = await apiClient.put(`/tasks/${taskId}/documents/${editingDocument.id}`, editingDocument);
 
 setDocuments(prev => 
 prev.map(doc => 
 doc.id === editingDocument.id ? response.data : doc
 )
 );
 setEditingDocument(null);
 } catch (error) {
 console.error('Error updating document:', error);
 }
 };

 const handleDeleteDocument = async (documentId: string) => {
 if (!window.confirm('Are you sure you want to delete this document?')) return;

 try {
 const { default: apiClient } = await import('../../api/client');
 await apiClient.delete(`/tasks/${taskId}/documents/${documentId}`);
 setDocuments(prev => prev.filter(doc => doc.id !== documentId));
 } catch (error) {
 console.error('Error deleting document:', error);
 }
 };

 const addTag = (tag: string) => {
 const trimmedTag = tag.trim().toLowerCase();
 if (trimmedTag && !newDocument.tags?.includes(trimmedTag)) {
 setNewDocument(prev => ({
 ...prev,
 tags: [...(prev.tags || []), trimmedTag]
 }));
 }
 };

 const addTagToEdit = (tag: string) => {
 const trimmedTag = tag.trim().toLowerCase();
 if (trimmedTag && editingDocument && !editingDocument.tags?.includes(trimmedTag)) {
 setEditingDocument(prev => prev ? ({
 ...prev,
 tags: [...(prev.tags || []), trimmedTag]
 }) : null);
 }
 };

 const removeTag = (tagToRemove: string, isEditing = false) => {
 if (isEditing && editingDocument) {
 setEditingDocument(prev => prev ? ({
 ...prev,
 tags: prev.tags.filter(tag => tag !== tagToRemove)
 }) : null);
 } else {
 setNewDocument(prev => ({
 ...prev,
 tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
 }));
 }
 };

 const handleTagInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, isEditing = false) => {
 if (e.key === 'Enter' || e.key === ',') {
 e.preventDefault();
 if (isEditing) {
 addTagToEdit(tagInput);
 } else {
 addTag(tagInput);
 }
 setTagInput('');
 }
 };

 const formatRelativeTime = (dateString: string) => {
 const date = new Date(dateString);
 const now = new Date();
 const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
 
 if (diffInSeconds < 60) return 'just now';
 if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
 if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
 if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
 return date.toLocaleDateString();
 };

 useEffect(() => {
 fetchDocuments();
 }, [fetchDocuments]);

 if (isLoading) {
 return (
 <div className="bg-white rounded-lg shadow">
 <div className="px-6 py-4 border-b border-gray-200">
 <h3 className="text-lg font-medium text-gray-900 flex items-center">
 <DocumentIcon className="w-5 h-5 mr-2" />
 Task Documents
 </h3>
 </div>
 <div className="px-6 py-8">
 <div className="animate-pulse space-y-4">
 <div className="h-4 bg-gray-200 rounded w-3/4"></div>
 <div className="h-4 bg-gray-200 rounded w-1/2"></div>
 <div className="h-4 bg-gray-200 rounded w-2/3"></div>
 </div>
 </div>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Header with Create Button */}
 <div className="bg-white rounded-lg shadow">
 <div className="px-6 py-4 border-b border-gray-200">
 <div className="flex justify-between items-center">
 <h3 className="text-lg font-medium text-gray-900 flex items-center">
 <DocumentIcon className="w-5 h-5 mr-2" />
 Task Documents ({documents.length})
 </h3>
 <button
 onClick={() => setIsCreating(true)}
 className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
 >
 <PlusIcon className="h-4 w-4 mr-2" />
 Create Document
 </button>
 </div>
 </div>

 {/* Create Document Form */}
 {isCreating && (
 <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
 <h4 className="text-md font-medium text-gray-900 mb-4">Create New Document</h4>
 <div className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Document Title *
 </label>
 <input
 type="text"
 value={newDocument.title || ''}
 onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 placeholder="Enter document title..."
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Document Type
 </label>
 <select
 value={newDocument.document_type || 'notes'}
 onChange={(e) => setNewDocument({ ...newDocument, document_type: e.target.value as any })}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 >
 {Object.entries(documentTypeLabels).map(([value, label]) => (
 <option key={value} value={value}>{label}</option>
 ))}
 </select>
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Tags
 </label>
 <div className="flex flex-wrap gap-2 mb-2">
 {newDocument.tags?.map((tag) => (
 <span
 key={tag}
 className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
 >
 #{tag}
 <button
 onClick={() => removeTag(tag)}
 className="ml-1 hover:text-blue-600"
 >
 <XMarkIcon className="h-3 w-3" />
 </button>
 </span>
 ))}
 </div>
 <input
 type="text"
 value={tagInput}
 onChange={(e) => setTagInput(e.target.value)}
 onKeyPress={handleTagInputKeyPress}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 placeholder="Add tags (press Enter or comma to add)"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Content *
 </label>
 <textarea
 value={newDocument.content || ''}
 onChange={(e) => setNewDocument({ ...newDocument, content: e.target.value })}
 rows={8}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 placeholder="Write your document content here..."
 />
 </div>

 <div className="flex items-center">
 <input
 type="checkbox"
 id="is_template"
 checked={newDocument.is_template || false}
 onChange={(e) => setNewDocument({ ...newDocument, is_template: e.target.checked })}
 className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
 />
 <label htmlFor="is_template" className="ml-2 block text-sm text-gray-900">
 Save as template for future tasks
 </label>
 </div>

 <div className="flex justify-end space-x-3">
 <button
 onClick={() => {
 setIsCreating(false);
 setNewDocument({
 title: '',
 content: '',
 document_type: 'notes',
 tags: [],
 is_template: false
 });
 setTagInput('');
 }}
 className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
 >
 Cancel
 </button>
 <button
 onClick={handleCreateDocument}
 disabled={!newDocument.title?.trim() || !newDocument.content?.trim()}
 className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
 >
 Create Document
 </button>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* Documents List */}
 {documents.length > 0 ? (
 <div className="space-y-4">
 {documents.map((document) => (
 <div key={document.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
 <div className="px-6 py-4">
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <div className="flex items-center space-x-2 mb-2">
 <h4 className="text-lg font-medium text-gray-900">{document.title}</h4>
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${documentTypeColors[document.document_type]}`}>
 {documentTypeLabels[document.document_type]}
 </span>
 {document.is_template && (
 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
 Template
 </span>
 )}
 </div>
 
 {document.tags.length > 0 && (
 <div className="flex flex-wrap gap-1 mb-2">
 {document.tags.map((tag) => (
 <span
 key={tag}
 className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
 >
 <TagIcon className="h-3 w-3 mr-1" />
 #{tag}
 </span>
 ))}
 </div>
 )}
 
 <div className="text-sm text-gray-700 mb-3 line-clamp-3">
 {document.content.length > 200 
 ? `${document.content.substring(0, 200)}...` 
 : document.content}
 </div>
 
 <div className="text-xs text-gray-500">
 Version {document.version} • Created {formatRelativeTime(document.created_at)}
 {document.created_by && (
 <span> • by {document.created_by.full_name}</span>
 )}
 </div>
 </div>
 
 <div className="flex items-center space-x-2 ml-4">
 <button
 onClick={() => setPreviewDocument(document)}
 className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
 title="Preview document"
 >
 <EyeIcon className="h-4 w-4" />
 </button>
 <button
 onClick={() => setEditingDocument(document)}
 className="p-2 text-gray-400 hover:text-green-600 transition-colors"
 title="Edit document"
 >
 <PencilIcon className="h-4 w-4" />
 </button>
 <button
 onClick={() => handleDeleteDocument(document.id)}
 className="p-2 text-gray-400 hover:text-red-600 transition-colors"
 title="Delete document"
 >
 <TrashIcon className="h-4 w-4" />
 </button>
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="bg-white rounded-lg shadow">
 <div className="px-6 py-8 text-center">
 <DocumentIcon className="mx-auto h-8 w-8 text-gray-400" />
 <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
 <p className="mt-1 text-sm text-gray-500">Create documents to organize task information.</p>
 </div>
 </div>
 )}

 {/* Preview Modal */}
 {previewDocument && (
 <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
 <div className="relative top-10 mx-auto p-5 border max-w-4xl shadow-lg rounded-md bg-white">
 <div className="flex items-center justify-between mb-4">
 <div>
 <h3 className="text-lg font-medium text-gray-900">{previewDocument.title}</h3>
 <div className="flex items-center space-x-2 mt-1">
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${documentTypeColors[previewDocument.document_type]}`}>
 {documentTypeLabels[previewDocument.document_type]}
 </span>
 <span className="text-xs text-gray-500">
 Version {previewDocument.version} • {formatRelativeTime(previewDocument.created_at)}
 </span>
 </div>
 </div>
 <button
 onClick={() => setPreviewDocument(null)}
 className="text-gray-400 hover:text-gray-600"
 >
 <XMarkIcon className="h-6 w-6" />
 </button>
 </div>
 
 {previewDocument.tags.length > 0 && (
 <div className="flex flex-wrap gap-1 mb-4">
 {previewDocument.tags.map((tag) => (
 <span
 key={tag}
 className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
 >
 #{tag}
 </span>
 ))}
 </div>
 )}
 
 <div className="max-h-96 overflow-y-auto">
 <div className="prose max-w-none">
 <div className="whitespace-pre-wrap text-gray-700">
 {previewDocument.content}
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Edit Modal */}
 {editingDocument && (
 <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
 <div className="relative top-10 mx-auto p-5 border max-w-4xl shadow-lg rounded-md bg-white">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-medium text-gray-900">Edit Document</h3>
 <button
 onClick={() => setEditingDocument(null)}
 className="text-gray-400 hover:text-gray-600"
 >
 <XMarkIcon className="h-6 w-6" />
 </button>
 </div>
 
 <div className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Document Title *
 </label>
 <input
 type="text"
 value={editingDocument.title}
 onChange={(e) => setEditingDocument({ ...editingDocument, title: e.target.value })}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Document Type
 </label>
 <select
 value={editingDocument.document_type}
 onChange={(e) => setEditingDocument({ ...editingDocument, document_type: e.target.value as any })}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 >
 {Object.entries(documentTypeLabels).map(([value, label]) => (
 <option key={value} value={value}>{label}</option>
 ))}
 </select>
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Tags
 </label>
 <div className="flex flex-wrap gap-2 mb-2">
 {editingDocument.tags.map((tag) => (
 <span
 key={tag}
 className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
 >
 #{tag}
 <button
 onClick={() => removeTag(tag, true)}
 className="ml-1 hover:text-blue-600"
 >
 <XMarkIcon className="h-3 w-3" />
 </button>
 </span>
 ))}
 </div>
 <input
 type="text"
 value={tagInput}
 onChange={(e) => setTagInput(e.target.value)}
 onKeyPress={(e) => handleTagInputKeyPress(e, true)}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 placeholder="Add tags (press Enter or comma to add)"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Content *
 </label>
 <textarea
 value={editingDocument.content}
 onChange={(e) => setEditingDocument({ ...editingDocument, content: e.target.value })}
 rows={12}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 </div>

 <div className="flex items-center">
 <input
 type="checkbox"
 id="edit_is_template"
 checked={editingDocument.is_template}
 onChange={(e) => setEditingDocument({ ...editingDocument, is_template: e.target.checked })}
 className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
 />
 <label htmlFor="edit_is_template" className="ml-2 block text-sm text-gray-900">
 Save as template for future tasks
 </label>
 </div>

 <div className="flex justify-end space-x-3">
 <button
 onClick={() => setEditingDocument(null)}
 className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
 >
 Cancel
 </button>
 <button
 onClick={handleUpdateDocument}
 disabled={!editingDocument.title.trim() || !editingDocument.content.trim()}
 className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
 >
 Save Changes
 </button>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 );
};

export default TaskDocuments;