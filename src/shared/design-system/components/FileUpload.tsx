import React, { useCallback, useState, useRef } from 'react';
import Papa from 'papaparse';
import { cn } from '../utils';
import { Button } from './Button';
import { ArrowUpTrayIcon, DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline';

// General FileUpload component interface
interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number;
  onFilesChange?: (files: File[]) => void;
  allowedTypes?: string[];
  uploadText?: string;
  showPreview?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

// CSV-specific interface
interface CSVRow {
  [key: string]: string;
}

interface CSVUploadProps {
  onFileUpload: (csvData: CSVRow[]) => void;
  acceptedFormats?: string[];
  maxFileSize?: number; // in MB
  className?: string;
  disabled?: boolean;
}

// General FileUpload component
export const FileUpload: React.FC<FileUploadProps> = ({
  accept = "*/*",
  multiple = false,
  maxFiles = 1,
  maxSize = 10 * 1024 * 1024, // 10MB default
  onFilesChange,
  allowedTypes,
  uploadText = "Drop files here or click to upload",
  showPreview = false,
  size = 'md',
  className,
  disabled = false
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (allowedTypes && !allowedTypes.includes(file.type)) {
      return `File type ${file.type} is not allowed`;
    }
    if (file.size > maxSize) {
      return `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`;
    }
    return null;
  }, [allowedTypes, maxSize]);

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const validFiles: File[] = [];
    let errorMsg: string | null = null;

    for (const file of fileArray) {
      const validation = validateFile(file);
      if (validation) {
        errorMsg = validation;
        break;
      }
      validFiles.push(file);
    }

    if (errorMsg) {
      setError(errorMsg);
      return;
    }

    if (!multiple && validFiles.length > 1) {
      setError('Only one file is allowed');
      return;
    }

    if (multiple && validFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setError(null);
    const finalFiles = multiple ? [...files, ...validFiles].slice(0, maxFiles) : validFiles;
    setFiles(finalFiles);
    onFilesChange?.(finalFiles);
  }, [files, multiple, maxFiles, validateFile, onFilesChange]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled || !e.dataTransfer.files) return;
    handleFiles(e.dataTransfer.files);
  }, [disabled, handleFiles]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || !e.target.files) return;
    handleFiles(e.target.files);
  }, [disabled, handleFiles]);

  const removeFile = useCallback((index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesChange?.(newFiles);
  }, [files, onFilesChange]);

  const openFileDialog = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const sizeClasses = {
    sm: 'p-4 text-sm',
    md: 'p-6 text-base', 
    lg: 'p-8 text-lg'
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "border-2 border-dashed rounded-lg transition-colors cursor-pointer",
          dragActive 
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" 
            : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600",
          disabled && "opacity-50 cursor-not-allowed",
          sizeClasses[size]
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <div className="text-center">
          <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {uploadText}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {accept !== "*/*" && `Accepted: ${accept}`}
            {maxSize && ` • Max size: ${Math.round(maxSize / 1024 / 1024)}MB`}
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      {showPreview && files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Selected Files:
          </h4>
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <span className="text-sm truncate flex-1">{file.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
              >
                <XMarkIcon className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}
    </div>
  );
};

// CSV-specific component
export const CSVUpload: React.FC<CSVUploadProps> = ({
  onFileUpload,
  acceptedFormats = ['.csv', '.txt'],
  maxFileSize = 10,
  className,
  disabled = false
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseCSV = useCallback((text: string): CSVRow[] => {
    if (!text || text.trim().length === 0) return [];

    // Detect separator (tab vs comma)
    const firstLine = text.split('\n')[0];
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const delimiter = tabCount > commaCount ? '\t' : ',';

    // Use Papa Parse for proper CSV parsing that handles quoted fields
    const results = Papa.parse(text, {
      header: true,
      delimiter: delimiter,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      transform: (value: string) => value.trim()
    });

    if (results.errors.length > 0) {
      console.warn('CSV parsing warnings:', results.errors);
    }

    return results.data as CSVRow[];
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;

    setError(null);
    setIsProcessing(true);

    try {
      // Validate file type
      const fileName = file.name.toLowerCase();
      const hasValidExtension = acceptedFormats.some(format => 
        fileName.endsWith(format.toLowerCase())
      );
      
      if (!hasValidExtension) {
        throw new Error(`File must be one of: ${acceptedFormats.join(', ')}`);
      }

      // Validate file size
      const fileSizeMB = file.size / 1024 / 1024;
      if (fileSizeMB > maxFileSize) {
        throw new Error(`File size must be less than ${maxFileSize}MB`);
      }

      // Read and parse file
      const text = await file.text();
      const csvData = parseCSV(text);
      
      if (csvData.length === 0) {
        throw new Error('CSV file appears to be empty or invalid');
      }

      onFileUpload(csvData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setIsProcessing(false);
    }
  }, [acceptedFormats, maxFileSize, parseCSV, onFileUpload]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, [disabled]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  }, [disabled, handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
    // Reset input
    e.target.value = '';
  }, [disabled, handleFile]);

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          dragActive 
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" 
            : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && "cursor-pointer"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && document.getElementById('csv-file-input')?.click()}
      >
        <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">
          {isProcessing ? 'Processing...' : 'Upload CSV File'}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Drag and drop a CSV file here, or click to select
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Supports: {acceptedFormats.join(', ')} • Max size: {maxFileSize}MB
        </p>
        
        {isProcessing && (
          <div className="mt-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        )}
      </div>

      <input
        id="csv-file-input"
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || isProcessing}
      />

      {error && (
        <div className="mt-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}
    </div>
  );
}; 