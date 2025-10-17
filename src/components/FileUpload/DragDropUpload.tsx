import React, { useState, useRef, useCallback } from 'react';
import { 
  CloudArrowUpIcon, 
  DocumentIcon, 
  PhotoIcon, 
  TrashIcon,
  LinkIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import apiClient from '../../api/client';

interface FileUploadProps {
  onFileUpload?: (files: File[]) => void;
  onCloudImport?: (source: string) => void;
  maxFiles?: number;
  maxSizeM?: number;
  acceptedTypes?: string[];
  projectId?: string;
  taskId?: string;
}

interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  url?: string;
}

const DragDropUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  onCloudImport,
  maxFiles = 10,
  maxSizeM = 50,
  acceptedTypes = ['image/*', 'application/pdf', 'text/*', '.doc', '.docx', '.xls', '.xlsx'],
  projectId,
  taskId
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showCloudOptions, setShowCloudOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const validateFile = (file: File): string | null => {
    // Size check
    if (file.size > maxSizeM * 1024 * 1024) {
      return `File size exceeds ${maxSizeM}MB limit`;
    }

    // Type check
    const isValidType = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      return file.type.match(type.replace('*', '.*'));
    });

    if (!isValidType) {
      return `File type not supported. Accepted: ${acceptedTypes.join(', ')}`;
    }

    return null;
  };

  const uploadFile = async (file: File): Promise<UploadedFile> => {
    const fileId = Math.random().toString(36).substr(2, 9);
    const uploadedFile: UploadedFile = {
      id: fileId,
      file,
      progress: 0,
      status: 'uploading'
    };

    setUploadedFiles(prev => [...prev, uploadedFile]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (projectId) formData.append('project_id', projectId);
      if (taskId) formData.append('task_id', taskId);

      const response = await apiClient.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = response.data;
      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === fileId
            ? { ...f, progress: 100, status: 'completed', url: result.file_path }
            : f
        )
      );
      return { ...uploadedFile, progress: 100, status: 'completed', url: result.file_path };
    } catch (error) {
      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === fileId ? { ...f, status: 'error' } : f
        )
      );
      throw error;
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Validate files
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    }

    // Check max files limit
    if (uploadedFiles.length + validFiles.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Show errors if any
    if (errors.length > 0) {
      alert('Upload errors:\n' + errors.join('\n'));
    }

    // Upload valid files
    if (validFiles.length > 0) {
      try {
        await Promise.all(validFiles.map(uploadFile));
        onFileUpload?.(validFiles);
      } catch (error) {
        console.error('Upload error:', error);
      }
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    await handleFiles(files);
  }, [uploadedFiles.length, maxFiles, onFileUpload]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      await handleFiles(files);
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <PhotoIcon className="w-8 h-8 text-blue-500" />;
    }
    return <DocumentIcon className="w-8 h-8 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCloudImport = (source: string) => {
    // Placeholder for cloud integration
    onCloudImport?.(source);
    setShowCloudOptions(false);
    
    // For demo purposes, simulate cloud import
    alert(`Cloud import from ${source} would be implemented here. This would integrate with APIs for Google Drive, Dropbox, etc.`);
  };

  return (
    <div className="w-full">
      {/* Main upload area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="text-center">
          <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              <button
                type="button"
                className="font-medium text-blue-600 hover:text-blue-500"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload files
              </button>{' '}
              or drag and drop
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Up to {maxFiles} files, {maxSizeM}MB each
            </p>
            <p className="text-xs text-gray-500">
              {acceptedTypes.join(', ')}
            </p>
          </div>
          
          {/* Cloud import options */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowCloudOptions(!showCloudOptions)}
              className="inline-flex items-center border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <LinkIcon className="w-4 h-4 mr-1" />
              Import from Cloud
            </button>
            
            {showCloudOptions && (
              <div className="mt-2 flex justify-center space-x-2">
                <button
                  onClick={() => handleCloudImport('google-drive')}
                  className="text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Google Drive
                </button>
                <button
                  onClick={() => handleCloudImport('dropbox')}
                  className="text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Dropbox
                </button>
                <button
                  onClick={() => handleCloudImport('onedrive')}
                  className="text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  OneDrive
                </button>
              </div>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Uploaded files list */}
      {uploadedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Uploaded Files</h4>
          {uploadedFiles.map((uploadedFile) => (
            <div
              key={uploadedFile.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                {getFileIcon(uploadedFile.file)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {uploadedFile.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(uploadedFile.file.size)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {uploadedFile.status === 'uploading' && (
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadedFile.progress}%` }}
                    ></div>
                  </div>
                )}
                
                {uploadedFile.status === 'completed' && (
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                )}
                
                {uploadedFile.status === 'error' && (
                  <span className="text-xs text-red-500">Failed</span>
                )}

                <button
                  onClick={() => removeFile(uploadedFile.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DragDropUpload;
