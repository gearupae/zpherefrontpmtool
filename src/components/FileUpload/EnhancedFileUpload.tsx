import React, { useState, useRef, useCallback } from 'react';
import {
  CloudArrowUpIcon,
  DocumentIcon,
  PhotoIcon,
  FilmIcon,
  MusicalNoteIcon,
  ArchiveBoxIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  FolderIcon,
  LinkIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

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

interface CloudStorageProvider {
  id: 'google_drive' | 'dropbox' | 'onedrive';
  name: string;
  icon: string;
  connected: boolean;
  folder?: string;
}

interface EnhancedFileUploadProps {
  attachments: FileAttachment[];
  maxFileSize?: number; // in bytes
  allowedTypes?: string[];
  multiple?: boolean;
  cloudStorageEnabled?: boolean;
  onFileUpload: (files: File[]) => void;
  onCloudFileSelect: (provider: string, files: any[]) => void;
  onDeleteAttachment: (attachmentId: string) => void;
  onRetryUpload?: (attachmentId: string) => void;
  onPreviewFile?: (attachment: FileAttachment) => void;
  className?: string;
}

const EnhancedFileUpload: React.FC<EnhancedFileUploadProps> = ({
  attachments = [],
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  allowedTypes,
  multiple = true,
  cloudStorageEnabled = true,
  onFileUpload,
  onCloudFileSelect,
  onDeleteAttachment,
  onRetryUpload,
  onPreviewFile,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showCloudPicker, setShowCloudPicker] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock cloud storage providers (in real app, these would come from API)
  const [cloudProviders] = useState<CloudStorageProvider[]>([
    {
      id: 'google_drive',
      name: 'Google Drive',
      icon: '🗄️',
      connected: true,
      folder: '/Project Files'
    },
    {
      id: 'dropbox',
      name: 'Dropbox',
      icon: '📦',
      connected: false
    },
    {
      id: 'onedrive',
      name: 'OneDrive',
      icon: '☁️',
      connected: true,
      folder: '/Work/Projects'
    }
  ]);

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File "${file.name}" is too large. Maximum size is ${formatFileSize(maxFileSize)}.`;
    }
    
    if (allowedTypes && !allowedTypes.includes(file.type)) {
      return `File type "${file.type}" is not allowed for "${file.name}".`;
    }
    
    return null;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string, size: string = 'w-6 h-6') => {
    if (mimeType.startsWith('image/')) {
      return <PhotoIcon className={`${size} text-green-500`} />;
    } else if (mimeType.startsWith('video/')) {
      return <FilmIcon className={`${size} text-blue-500`} />;
    } else if (mimeType.startsWith('audio/')) {
      return <MusicalNoteIcon className={`${size} text-purple-500`} />;
    } else if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) {
      return <ArchiveBoxIcon className={`${size} text-orange-500`} />;
    } else {
      return <DocumentIcon className={`${size} text-gray-500`} />;
    }
  };

  const getCloudProviderIcon = (provider: string) => {
    const providerData = cloudProviders.find(p => p.id === provider);
    return providerData?.icon || '📁';
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFileSelection(files);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFileSelection(files);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelection = (files: File[]) => {
    const errors: string[] = [];
    const validFiles: File[] = [];

    files.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    setUploadErrors(errors);

    if (validFiles.length > 0) {
      onFileUpload(validFiles);
    }
  };

  const handleCloudFileSelect = (provider: CloudStorageProvider) => {
    // In a real app, this would open the cloud provider's file picker
    console.log(`Opening ${provider.name} file picker...`);
    
    // Mock file selection for demo
    const mockFiles = [
      {
        id: 'cloud-1',
        name: 'Project Specification.pdf',
        size: 2048576,
        url: 'https://example.com/file1.pdf',
        type: 'application/pdf'
      },
      {
        id: 'cloud-2',
        name: 'Design Mockups.zip',
        size: 15728640,
        url: 'https://example.com/file2.zip',
        type: 'application/zip'
      }
    ];
    
    onCloudFileSelect(provider.id, mockFiles);
    setShowCloudPicker(false);
  };

  const getStatusIcon = (status: FileAttachment['upload_status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <ExclamationCircleIcon className="w-5 h-5 text-red-500" />;
      case 'uploading':
        return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <ArrowPathIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getProgressBarColor = (status: FileAttachment['upload_status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'uploading':
        return 'bg-blue-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
        <div className="mt-4">
          <p className="text-lg font-medium text-gray-900">
            Drag and drop files here
          </p>
          <p className="text-sm text-gray-500 mt-1">
            or click to browse from your computer
          </p>
          {allowedTypes && (
            <p className="text-xs text-gray-400 mt-1">
              Allowed types: {allowedTypes.join(', ')}
            </p>
          )}
          <p className="text-xs text-gray-400">
            Maximum file size: {formatFileSize(maxFileSize)}
          </p>
        </div>
        
        <div className="mt-6 flex justify-center space-x-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <FolderIcon className="w-4 h-4 mr-2" />
            Choose Files
          </button>
          
          {cloudStorageEnabled && (
            <button
              onClick={() => setShowCloudPicker(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <CloudArrowUpIcon className="w-4 h-4 mr-2" />
              Cloud Storage
            </button>
          )}
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={allowedTypes?.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* Upload Errors */}
      {uploadErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationCircleIcon className="h-5 w-5 text-red-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Upload Errors</h3>
              <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                {uploadErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
          <button
            onClick={() => setUploadErrors([])}
            className="mt-2 text-sm text-red-600 hover:text-red-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* File List */}
      {attachments.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">
              Attachments ({attachments.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {attachment.thumbnail_url ? (
                      <img
                        src={attachment.thumbnail_url}
                        alt=""
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      getFileIcon(attachment.mime_type, 'w-10 h-10')
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {attachment.original_filename}
                        </p>
                        {attachment.cloud_provider && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {getCloudProviderIcon(attachment.cloud_provider)} {attachment.cloud_provider}
                          </span>
                        )}
                        {getStatusIcon(attachment.upload_status)}
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-xs text-gray-500">
                          {formatFileSize(attachment.file_size)}
                        </span>
                        {attachment.uploaded_by && (
                          <span className="text-xs text-gray-500">
                            Uploaded by {attachment.uploaded_by.full_name}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(attachment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {/* Progress bar for uploading files */}
                      {attachment.upload_status === 'uploading' && attachment.upload_progress !== undefined && (
                        <div className="mt-2">
                          <div className="bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(attachment.upload_status)}`}
                              style={{ width: `${attachment.upload_progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {attachment.upload_progress}% uploaded
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {onPreviewFile && attachment.upload_status === 'completed' && (
                      <button
                        onClick={() => onPreviewFile(attachment)}
                        className="p-2 text-gray-400 hover:text-blue-600"
                        title="Preview file"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                    )}
                    
                    {attachment.cloud_url && (
                      <a
                        href={attachment.cloud_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-green-600"
                        title="Open in cloud storage"
                      >
                        <LinkIcon className="w-4 h-4" />
                      </a>
                    )}
                    
                    {attachment.upload_status === 'failed' && onRetryUpload && (
                      <button
                        onClick={() => onRetryUpload(attachment.id)}
                        className="p-2 text-gray-400 hover:text-blue-600"
                        title="Retry upload"
                      >
                        <ArrowPathIcon className="w-4 h-4" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => onDeleteAttachment(attachment.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                      title="Delete attachment"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cloud Storage Picker Modal */}
      {showCloudPicker && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Choose Cloud Storage</h3>
              <button
                onClick={() => setShowCloudPicker(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-3">
              {cloudProviders.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleCloudFileSelect(provider)}
                  disabled={!provider.connected}
                  className={`w-full flex items-center justify-between p-3 border rounded-lg text-left ${
                    provider.connected
                      ? 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{provider.icon}</span>
                    <div>
                      <p className={`font-medium ${provider.connected ? 'text-gray-900' : 'text-gray-500'}`}>
                        {provider.name}
                      </p>
                      {provider.connected && provider.folder && (
                        <p className="text-xs text-gray-500">
                          Current folder: {provider.folder}
                        </p>
                      )}
                      {!provider.connected && (
                        <p className="text-xs text-red-500">Not connected</p>
                      )}
                    </div>
                  </div>
                  
                  {provider.connected ? (
                    <span className="text-green-500 text-sm">Connected</span>
                  ) : (
                    <span className="text-gray-400 text-sm">Connect</span>
                  )}
                </button>
              ))}
            </div>
            
            <div className="mt-4 text-xs text-gray-500">
              <p>Connect your cloud storage accounts in Settings to access files directly.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedFileUpload;
