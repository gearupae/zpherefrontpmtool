import React, { useMemo, useRef, useState } from 'react';
import { Upload, Paperclip, Send } from 'lucide-react';
import apiClient from '../../api/client';
import { detectTenantContext } from '../../utils/tenantUtils';

export interface AILandingProps {
  onStartChat: (opts: { message: string; attachments: { filename: string; url: string }[] }) => void;
  onFocusToChat?: () => void;
}

// A simple centered landing hero for the AI page
// - Big prompt bar with upload and send icons
// - Optional file uploads (images, pdf, docs, sheets)
const AILanding: React.FC<AILandingProps> = ({ onStartChat, onFocusToChat }) => {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const canSend = (text.trim().length > 0) || files.length > 0;
  const navigatedRef = useRef(false);
  const maybeGoToChat = () => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    try { onFocusToChat && onFocusToChat(); } finally {}
  };

  const accept = useMemo(
    () => [
      'image/*',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ].join(','),
    []
  );

  const onPickFiles = () => inputRef.current?.click();

  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    if (list.length) setFiles((prev) => [...prev, ...list].slice(0, 10));
    // reset input so re-selecting the same file triggers change
    if (inputRef.current) inputRef.current.value = '';
  };

  const start = async () => {
    const q = text.trim();
    // Allow empty prompt if there are files
    if (!q && files.length === 0) return;

    try {
      setUploading(true);
      const tenant = detectTenantContext(undefined, undefined);
      const uploaded: { filename: string; url: string }[] = [];

      for (const f of files) {
        const fd = new FormData();
        fd.append('file', f);
        // Optional: project context could be added later
        const resp = await apiClient.post('/files/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const url = resp?.data?.public_url || '';
        uploaded.push({ filename: f.name, url });
      }

      onStartChat({
        message: q,
        attachments: uploaded,
      });
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

return (
    <div className="relative min-h-screen flex flex-col items-center overflow-hidden" style={{ paddingTop: '30vh' }}>
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50" />
      <div className="absolute inset-0 bg-gradient-to-tl from-blue-50/30 via-transparent to-yellow-50/20" />
      
      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-300/20 to-pink-300/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-blue-300/20 to-purple-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="relative z-10 flex flex-col items-center w-full px-4">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-12 text-center">Ready when you are.</h1>

        <div className="w-full max-w-3xl">
          <form
            className="relative flex items-center bg-white/80 backdrop-blur-xl rounded-full shadow-lg hover:shadow-xl transition-all duration-200 pl-5 pr-1.5"
            onSubmit={(e) => { e.preventDefault(); if (canSend && !uploading) start(); }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Upload (paperclip) */}
            <button
              type="button"
              title="Upload"
              onClick={onPickFiles}
              className="p-2 rounded-full hover:bg-gray-100/80 text-black transition-colors flex-shrink-0"
            >
              <Paperclip size={20} />
            </button>

            <input
              type="text"
              className="flex-1 border-0 bg-transparent py-3 text-base placeholder-gray-500 focus:outline-none focus:ring-0 focus:border-0"
              style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
              placeholder="Ask anything"
              value={text}
              onFocus={maybeGoToChat}
              onMouseEnter={maybeGoToChat}
              onClick={maybeGoToChat}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') start();
              }}
            />

            {/* Send */}
            <button
              type="submit"
              disabled={!canSend || uploading}
              className="p-2.5 rounded-full bg-gradient-to-r from-gray-900 to-gray-800 text-white hover:from-gray-800 hover:to-gray-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-md flex-shrink-0"
              title="Send"
            >
              <Send size={18} />
            </button>

            <input
              ref={inputRef}
              type="file"
              accept={accept}
              multiple
              className="hidden"
              onChange={onFilesSelected}
            />
          </form>

          {/* Selected files */}
          {files.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 justify-center">
              {files.map((f, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-2 text-xs bg-white/80 backdrop-blur-sm rounded-full.5 shadow-sm"
                >
                  <Upload size={14} className="text-black" />
                  <span className="truncate max-w-[200px]" title={f.name}>{f.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Remove file"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AILanding;
