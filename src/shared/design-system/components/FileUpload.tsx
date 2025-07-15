import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';
import { 
  Upload, 
  File, 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Folder
} from 'lucide-react';

const fileUploadVariants = cva(
  'relative border-2 border-dashed rounded-lg transition-all duration-200 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
        active: 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20',
        error: 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20',
        success: 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20',
      },
      size: {
        sm: 'p-4 min-h-[120px]',
        md: 'p-6 min-h-[160px]',
        lg: 'p-8 min-h-[200px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

interface FileWithPreview extends File {
  id: string;
  preview?: string;
  progress?: number;
  error?: string;
  status?: 'pending' | 'uploading' | 'success' | 'error';
}

interface FileUploadProps extends VariantProps<typeof fileUploadVariants> {
  onFilesChange?: (files: FileWithPreview[]) => void;
  onUpload?: (files: FileWithPreview[]) => Promise<void>;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  showPreview?: boolean;
  allowedTypes?: string[];
  uploadText?: string;
  dragActiveText?: string;
  errorText?: string;
  successText?: string;
  validateFile?: (file: File) => string | null;
}

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return FileImage;
  if (type.startsWith('audio/')) return FileAudio;
  if (type.startsWith('video/')) return FileVideo;
  if (type.startsWith('text/')) return FileText;
  return File;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  ({
    onFilesChange,
    onUpload,
    accept = '*/*',
    multiple = false,
    maxSize = 10 * 1024 * 1024, // 10MB
    maxFiles = 5,
    disabled = false,
    className,
    children,
    showPreview = true,
    allowedTypes = [],
    uploadText = 'Drop files here or click to upload',
    dragActiveText = 'Drop files here',
    errorText = 'Upload failed',
    successText = 'Files uploaded successfully',
    validateFile,
    variant: initialVariant = 'default',
    size,
    ...props
  }, ref) => {
    const [files, setFiles] = useState<FileWithPreview[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [variant, setVariant] = useState<'default' | 'active' | 'error' | 'success'>(initialVariant);
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);
    
    const inputRef = useRef<HTMLInputElement>(null);
    const dragCounterRef = useRef(0);

    // Generate unique ID for file
    const generateId = () => Math.random().toString(36).substring(2, 9);

    // Validate file function
    const validateFileInternal = useCallback((file: File): string | null => {
      // Custom validation
      if (validateFile) {
        const customError = validateFile(file);
        if (customError) return customError;
      }

      // Size validation
      if (file.size > maxSize) {
        return `File size must be less than ${formatFileSize(maxSize)}`;
      }

      // Type validation
      if (allowedTypes.length > 0) {
        const isAllowed = allowedTypes.some(type => {
          if (type.endsWith('/*')) {
            return file.type.startsWith(type.slice(0, -1));
          }
          return file.type === type;
        });
        if (!isAllowed) {
          return `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`;
        }
      }

      return null;
    }, [maxSize, allowedTypes, validateFile]);

    // Process files
    const processFiles = useCallback(async (fileList: FileList | File[]) => {
      const newFiles: FileWithPreview[] = [];
      const filesToProcess = Array.from(fileList);

      // Check max files limit
      if (files.length + filesToProcess.length > maxFiles) {
        setGlobalError(`Maximum ${maxFiles} files allowed`);
        setVariant('error');
        return;
      }

      for (const file of filesToProcess) {
        const error = validateFileInternal(file);
        const fileWithPreview: FileWithPreview = {
          ...file,
          id: generateId(),
          status: error ? 'error' : 'pending',
          error: error || undefined,
        };

        // Generate preview for images
        if (file.type.startsWith('image/') && showPreview) {
          try {
            const preview = URL.createObjectURL(file);
            fileWithPreview.preview = preview;
          } catch (err) {
            console.warn('Failed to create preview:', err);
          }
        }

        newFiles.push(fileWithPreview);
      }

      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);
      onFilesChange?.(updatedFiles);
      
      // Set variant based on file status
      const hasErrors = newFiles.some(f => f.error);
      if (hasErrors) {
        setVariant('error');
      } else {
        setVariant('default');
        setGlobalError(null);
      }
    }, [files, maxFiles, validateFileInternal, showPreview, onFilesChange]);

    // Handle file input change
    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (fileList) {
        processFiles(fileList);
      }
    }, [processFiles]);

    // Handle drag events
    const handleDragEnter = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current++;
      
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setDragActive(true);
        setVariant('active');
      }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current--;
      
      if (dragCounterRef.current === 0) {
        setDragActive(false);
        setVariant('default');
      }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      setDragActive(false);
      dragCounterRef.current = 0;
      setVariant('default');
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
        e.dataTransfer.clearData();
      }
    }, [processFiles]);

    // Handle file removal
    const removeFile = useCallback((fileId: string) => {
      setFiles(prevFiles => {
        const file = prevFiles.find(f => f.id === fileId);
        if (file && file.preview) {
          URL.revokeObjectURL(file.preview);
        }
        const updatedFiles = prevFiles.filter(f => f.id !== fileId);
        onFilesChange?.(updatedFiles);
        return updatedFiles;
      });
    }, [onFilesChange]);

    // Handle upload
    const handleUpload = useCallback(async () => {
      if (!onUpload || isUploading) return;
      
      const validFiles = files.filter(f => !f.error);
      if (validFiles.length === 0) return;

      setIsUploading(true);
      setGlobalError(null);
      setGlobalSuccess(null);

      try {
        // Update files to uploading status
        setFiles(prevFiles => 
          prevFiles.map(f => 
            f.error ? f : { ...f, status: 'uploading' as const, progress: 0 }
          )
        );

        await onUpload(validFiles);

        // Mark as successful
        setFiles(prevFiles =>
          prevFiles.map(f =>
            f.error ? f : { ...f, status: 'success' as const, progress: 100 }
          )
        );
        
        setGlobalSuccess(successText);
        setVariant('success');
      } catch (error) {
        setFiles(prevFiles =>
          prevFiles.map(f =>
            f.error ? f : { 
              ...f, 
              status: 'error' as const, 
              error: error instanceof Error ? error.message : 'Upload failed'
            }
          )
        );
        
        setGlobalError(errorText);
        setVariant('error');
      } finally {
        setIsUploading(false);
      }
    }, [files, onUpload, isUploading, successText, errorText]);

    // Click handler for upload area
    const handleClick = useCallback(() => {
      if (!disabled) {
        inputRef.current?.click();
      }
    }, [disabled]);

    // Clean up previews on unmount
    useEffect(() => {
      return () => {
        files.forEach(file => {
          if (file.preview) {
            URL.revokeObjectURL(file.preview);
          }
        });
      };
    }, [files]);

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {/* Upload Area */}
        <div
          className={cn(fileUploadVariants({ variant, size }))}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClick}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="File upload area"
          aria-disabled={disabled}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleFileChange}
            disabled={disabled}
            className="sr-only"
          />
          
          {children || (
            <div className="flex flex-col items-center justify-center text-center">
              <Upload 
                size={48} 
                className={cn(
                  'mb-4 text-gray-400',
                  dragActive && 'text-blue-500',
                  variant === 'error' && 'text-red-500',
                  variant === 'success' && 'text-green-500'
                )}
              />
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {dragActive ? dragActiveText : uploadText}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {accept === '*/*' ? 'Any file type' : accept.replace(/,/g, ', ')}
                {maxSize && ` • Max ${formatFileSize(maxSize)}`}
                {multiple && ` • Up to ${maxFiles} files`}
              </p>
            </div>
          )}
        </div>

        {/* Global Messages */}
        {globalError && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-sm text-red-700 dark:text-red-300">{globalError}</span>
            </div>
          </div>
        )}

        {globalSuccess && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-sm text-green-700 dark:text-green-300">{globalSuccess}</span>
            </div>
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Files ({files.length})
              </h3>
              {onUpload && files.some(f => !f.error) && (
                <button
                  onClick={handleUpload}
                  disabled={isUploading || disabled}
                  className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </>
                  )}
                </button>
              )}
            </div>
            
            <div className="space-y-2">
              {files.map((file) => {
                const Icon = getFileIcon(file.type);
                return (
                  <div
                    key={file.id}
                    className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    {/* Preview or Icon */}
                    {file.preview ? (
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <Icon className="w-10 h-10 text-gray-400" />
                    )}
                    
                    {/* File Info */}
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.size)}
                      </p>
                      
                      {/* Progress Bar */}
                      {file.status === 'uploading' && (
                        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-200"
                            style={{ width: `${file.progress || 0}%` }}
                          />
                        </div>
                      )}
                      
                      {/* Error Message */}
                      {file.error && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                          {file.error}
                        </p>
                      )}
                    </div>
                    
                    {/* Status Icon */}
                    <div className="ml-3 flex items-center">
                      {file.status === 'uploading' && (
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                      )}
                      {file.status === 'success' && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      {file.status === 'error' && (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                      {file.status === 'pending' && !file.error && (
                        <button
                          onClick={() => removeFile(file.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          aria-label="Remove file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }
);

FileUpload.displayName = 'FileUpload';

export default FileUpload; 