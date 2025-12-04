import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, Image } from 'lucide-react';
import { Button } from './Button';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
  maxFiles?: number;
  disabled?: boolean;
}

interface SelectedFile {
  file: File;
  preview?: string;
}

export function FileUpload({
  onFilesSelected,
  accept = '.pdf,.jpg,.jpeg,.png,.gif,.webp,.tiff',
  multiple = true,
  maxSize = 10, // 10MB default
  maxFiles = 10,
  disabled = false,
}: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File "${file.name}" exceeds ${maxSize}MB limit`;
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/tiff',
    ];
    if (!allowedTypes.includes(file.type)) {
      return `File "${file.name}" has unsupported type. Allowed: PDF, JPEG, PNG, GIF, WebP, TIFF`;
    }

    return null;
  }, [maxSize]);

  const processFiles = useCallback((files: FileList | File[]) => {
    setError(null);
    const fileArray = Array.from(files);

    // Check max files limit
    if (selectedFiles.length + fileArray.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const validFiles: SelectedFile[] = [];

    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      // Create preview for images
      const isImage = file.type.startsWith('image/');
      const preview = isImage ? URL.createObjectURL(file) : undefined;

      validFiles.push({ file, preview });
    }

    const newFiles = [...selectedFiles, ...validFiles];
    setSelectedFiles(newFiles);
    onFilesSelected(newFiles.map(f => f.file));
  }, [selectedFiles, maxFiles, validateFile, onFilesSelected]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [disabled, processFiles]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  }, [processFiles]);

  const handleRemoveFile = useCallback((index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);

    // Revoke preview URL to prevent memory leak
    if (selectedFiles[index].preview) {
      URL.revokeObjectURL(selectedFiles[index].preview!);
    }

    setSelectedFiles(newFiles);
    onFilesSelected(newFiles.map(f => f.file));
    setError(null);
  }, [selectedFiles, onFilesSelected]);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-5 w-5 text-blue-500" />;
    }
    return <FileText className="h-5 w-5 text-red-500" />;
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-200
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
        />

        <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
        <p className="text-sm text-gray-600">
          <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-gray-500 mt-1">
          PDF, JPEG, PNG, GIF, WebP, TIFF (max {maxSize}MB each, up to {maxFiles} files)
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {/* Selected files list */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Selected Files ({selectedFiles.length})
          </p>
          <ul className="divide-y divide-gray-200 border rounded-lg">
            {selectedFiles.map((item, index) => (
              <li key={index} className="flex items-center justify-between p-3 hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  {item.preview ? (
                    <img
                      src={item.preview}
                      alt={item.file.name}
                      className="h-10 w-10 object-cover rounded"
                    />
                  ) : (
                    getFileIcon(item.file.type)
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                      {item.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(item.file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(index);
                  }}
                >
                  <X className="h-4 w-4 text-gray-500 hover:text-red-500" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
