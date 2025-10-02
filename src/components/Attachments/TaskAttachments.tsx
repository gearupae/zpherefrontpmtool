import React, { useState, useEffect, useCallback } from 'react';
import { PaperClipIcon, ArrowDownTrayIcon, TrashIcon, DocumentIcon, EyeIcon } from '@heroicons/react/24/outline';
import EnhancedFileUpload from '../FileUpload/EnhancedFileUpload';

interface FileAttachment {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  file_path: string;
  upload_progress?: number;
  upload_status: 'pending' | 'uploading' | 'completed' | 'failed';
  cloud_url?: string;
  cloud_provider?: 'google_drive' | 'dropbox' | 'onedrive' | 'local';
  thumbnail_url?: string;
  created_at: string;
  uploaded_by?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

interface TaskAttachmentsProps {
  taskId: string;
}

const TaskAttachments: React.FC<TaskAttachmentsProps> = ({ taskId }) => {
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAttachments = useCallback(async () => {
    if (!taskId) return;
    
    setIsLoading(true);
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get(`/tasks/${taskId}/attachments`);
      setAttachments(response.data || []);
    } catch (error) {
      console.error('Error fetching task attachments:', error);
      setAttachments([]);
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  const handleFileUpload = async (files: File[]) => {
    if (!taskId || files.length === 0) return;

    // Create placeholder entries for uploading files
    const placeholderAttachments = files.map(file => ({
      id: `uploading-${Date.now()}-${Math.random()}`,
      filename: file.name,
      original_filename: file.name,
      file_size: file.size,
      mime_type: file.type,
      file_path: '',
      upload_status: 'uploading' as const,
      upload_progress: 0,
      created_at: new Date().toISOString(),
      uploaded_by: {
        id: 'current-user',
        full_name: 'Current User',
      }
    }));

    setAttachments(prev => [...prev, ...placeholderAttachments]);

    try {
      const { default: apiClient } = await import('../../api/client');
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const placeholderId = placeholderAttachments[i].id;
        
        const formData = new FormData();
        formData.append('file', file);
        
        // Simulate upload progress
        const response = await apiClient.post(`/tasks/${taskId}/attachments`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = progressEvent.total 
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            
            setAttachments(prev => 
              prev.map(att => 
                att.id === placeholderId 
                  ? { ...att, upload_progress: percentCompleted }
                  : att
              )
            );
          }
        });

        // Replace placeholder with actual attachment
        setAttachments(prev => 
          prev.map(att => 
            att.id === placeholderId 
              ? { ...response.data, upload_status: 'completed' as const }
              : att
          )
        );
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      // Mark failed uploads
      placeholderAttachments.forEach(placeholder => {
        setAttachments(prev => 
          prev.map(att => 
            att.id === placeholder.id 
              ? { ...att, upload_status: 'failed' as const }
              : att
          )
        );
      });
    }
  };

  const handleCloudFileSelect = async (provider: string, files: any[]) => {
    // Handle cloud file selection - implementation depends on cloud provider APIs
    console.log(`Cloud file selection from ${provider}:`, files);
    // This would typically make API calls to link cloud files to the task
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;
    
    try {
      const { default: apiClient } = await import('../../api/client');
      await apiClient.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
      setAttachments(prev => prev.filter(att => att.id !== attachmentId));
    } catch (error) {
      console.error('Error deleting attachment:', error);
    }
  };

  const handleDownloadAttachment = async (attachment: FileAttachment) => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get(`/tasks/${taskId}/attachments/${attachment.id}/download`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.original_filename || attachment.filename || 'download';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
    }
  };

  const handleRetryUpload = (attachmentId: string) => {
    // Remove the failed attachment and let user re-upload
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };

  const handlePreviewFile = (attachment: FileAttachment) => {
    // Handle file preview - could open in modal or new tab
    if (attachment.cloud_url) {
      window.open(attachment.cloud_url, '_blank');
    } else {
      // For local files, you might want to implement a preview modal
      console.log('Preview file:', attachment);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <PaperClipIcon className="w-5 h-5 mr-2" />
            Task Attachments
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
      {/* File Upload Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <PaperClipIcon className="w-5 h-5 mr-2" />
            Upload Files
          </h3>
        </div>
        <div className="px-6 py-4">
          <EnhancedFileUpload
            attachments={attachments}
            maxFileSize={10 * 1024 * 1024} // 10MB
            allowedTypes={[
              'image/*',
              'application/pdf',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'text/plain',
              'application/zip',
              'application/x-rar-compressed'
            ]}
            multiple={true}
            cloudStorageEnabled={true}
            onFileUpload={handleFileUpload}
            onCloudFileSelect={handleCloudFileSelect}
            onDeleteAttachment={handleDeleteAttachment}
            onRetryUpload={handleRetryUpload}
            onPreviewFile={handlePreviewFile}
          />
        </div>
      </div>

      {/* Existing Attachments */}
      {attachments.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <DocumentIcon className="w-5 h-5 mr-2" />
              Task Attachments ({attachments.length})
            </h3>
          </div>
          <div className="px-6 py-4">
            <div className="space-y-3">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <DocumentIcon className="h-8 w-8 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {attachment.original_filename}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(attachment.file_size / 1024 / 1024).toFixed(2)} MB •{' '}
                        {new Date(attachment.created_at).toLocaleDateString()}
                        {attachment.uploaded_by && (
                          <span> • Uploaded by {attachment.uploaded_by.full_name}</span>
                        )}
                      </div>
                      {attachment.upload_status === 'uploading' && attachment.upload_progress !== undefined && (
                        <div className="mt-1">
                          <div className="bg-gray-200 rounded-full h-2 w-32">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${attachment.upload_progress}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {attachment.upload_progress}% uploaded
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {attachment.upload_status === 'completed' && (
                      <>
                        <button
                          onClick={() => handlePreviewFile(attachment)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Preview file"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadAttachment(attachment)}
                          className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                          title="Download file"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    
                    {attachment.upload_status === 'failed' && (
                      <button
                        onClick={() => handleRetryUpload(attachment.id)}
                        className="px-3 py-1 text-xs bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors"
                      >
                        Retry
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleDeleteAttachment(attachment.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete attachment"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {attachments.length === 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-8 text-center">
            <PaperClipIcon className="mx-auto h-8 w-8 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No attachments</h3>
            <p className="mt-1 text-sm text-gray-500">Upload files to share with your team.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskAttachments;