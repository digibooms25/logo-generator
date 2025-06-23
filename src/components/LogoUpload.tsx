"use client";

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { LocalStorageService } from '../services/local-storage';
import { Upload, X, FileImage, AlertCircle, CheckCircle, Loader, Edit, RotateCcw, Clock, Check, AlertTriangle, Info } from 'lucide-react';
import { LogoCategory, LogoStyle } from '../types/logo';
import { 
  validateFile, 
  ValidationResult, 
  DEFAULT_LOGO_VALIDATION,
  formatFileSize,
  sanitizeFilename
} from '../utils';

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'validating' | 'valid' | 'invalid' | 'success' | 'error' | 'uploading';
  progress: number;
  validation?: ValidationResult;
  category?: LogoCategory;
  style?: LogoStyle;
  keywords?: string[];
  description?: string;
  error?: string;
}

interface LogoUploadProps {
  onFilesUploaded?: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  acceptedFormats?: string[];
  className?: string;
}

export default function LogoUpload({ 
  onFilesUploaded,
  maxFiles = 10,
  maxSize = 5 * 1024 * 1024, // 5MB default
  acceptedFormats = ['image/png', 'image/jpeg', 'image/jpg'],
  className = ''
}: LogoUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showMetadataForm, setShowMetadataForm] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [showBulkMetadataForm, setShowBulkMetadataForm] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [validationInProgress, setValidationInProgress] = useState<Set<string>>(new Set());
  const [metadata, setMetadata] = useState<{
    category: LogoCategory | '';
    style: LogoStyle | '';
    keywords: string;
    description: string;
  }>({
    category: '',
    style: '',
    keywords: '',
    description: ''
  });

  const localStorageService = LocalStorageService.getInstance();

  // Enhanced file validation
  const validateFiles = async (files: UploadedFile[]) => {
    const validationOptions = {
      ...DEFAULT_LOGO_VALIDATION,
      maxFileSize: maxSize,
      allowedMimeTypes: acceptedFormats,
    };

    for (const fileObj of files) {
      setValidationInProgress(prev => new Set([...prev, fileObj.id]));
      
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileObj.id 
          ? { ...f, status: 'validating', progress: 25 }
          : f
      ));

      try {
        const validationResult = await validateFile(fileObj.file, validationOptions);
        
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileObj.id 
            ? { 
                ...f, 
                status: validationResult.isValid ? 'valid' : 'invalid',
                progress: 100,
                validation: validationResult
              }
            : f
        ));
      } catch (error) {
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileObj.id 
            ? { 
                ...f, 
                status: 'invalid',
                progress: 0,
                validation: {
                  isValid: false,
                  errors: ['Validation failed'],
                  warnings: []
                }
              }
            : f
        ));
      } finally {
        setValidationInProgress(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileObj.id);
          return newSet;
        });
      }
    }
  };

  // Handle file drop/selection with validation
  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(rejection => {
        const errors = rejection.errors.map((e: any) => e.message).join(', ');
        alert(`File ${rejection.file.name} was rejected: ${errors}`);
      });
    }

    // Check if adding these files would exceed maxFiles
    if (uploadedFiles.length + acceptedFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed. Please remove some files first.`);
      return;
    }

    // Create file objects with previews
    const newFiles: UploadedFile[] = acceptedFiles.map(file => {
      // Create a new File object with sanitized name instead of spreading
      const sanitizedFile = new File([file], sanitizeFilename(file.name), {
        type: file.type,
        lastModified: file.lastModified
      });
      
      return {
        id: `${Date.now()}-${Math.random()}`,
        file: sanitizedFile,
        preview: URL.createObjectURL(file),
        status: 'pending',
        progress: 0
      };
    });

    // Add to state
    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Start validation
    await validateFiles(newFiles);

    // For single file upload, auto-open metadata form if valid
    if (newFiles.length === 1 && uploadedFiles.length === 0) {
      setTimeout(() => {
        const validatedFile = uploadedFiles.find(f => f.id === newFiles[0].id);
        if (validatedFile?.status === 'valid') {
          setSelectedFileId(newFiles[0].id);
          setShowMetadataForm(true);
        }
      }, 1000);
    }
    // For multiple files, show bulk metadata option if some are valid
    else if (newFiles.length > 1) {
      setTimeout(() => {
        const validFiles = uploadedFiles.filter(f => 
          newFiles.some(nf => nf.id === f.id) && f.status === 'valid'
        );
        
        if (validFiles.length > 1) {
          const shouldShowBulkForm = confirm(
            `Add metadata to ${validFiles.length} valid files? Click OK for bulk metadata or Cancel to add individually.`
          );
          if (shouldShowBulkForm) {
            setSelectedFiles(new Set(validFiles.map(f => f.id)));
            setShowBulkMetadataForm(true);
          }
        }
      }, 1500);
    }
  }, [uploadedFiles, maxFiles, maxSize, acceptedFormats]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/*': acceptedFormats
    },
    maxSize,
    maxFiles,
    multiple: true
  });

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      // Revoke object URL to prevent memory leaks
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return updated;
    });
  };

  const openMetadataForm = (fileId: string) => {
    const file = uploadedFiles.find(f => f.id === fileId);
    if (!file) return;

    setSelectedFileId(fileId);
    setMetadata({
      category: file.category || '',
      style: file.style || '',
      keywords: file.keywords?.join(', ') || '',
      description: file.description || ''
    });
    setShowMetadataForm(true);
  };

  const saveMetadata = () => {
    if (!selectedFileId) return;

    setUploadedFiles(prev => prev.map(f => 
      f.id === selectedFileId 
        ? { 
            ...f, 
            category: metadata.category as LogoCategory || undefined,
            style: metadata.style as LogoStyle || undefined,
            keywords: metadata.keywords ? metadata.keywords.split(',').map(k => k.trim()).filter(k => k) : undefined,
            description: metadata.description || undefined,
            status: 'success'
          }
        : f
    ));

    setShowMetadataForm(false);
    setSelectedFileId(null);
    setMetadata({
      category: '',
      style: '',
      keywords: '',
      description: ''
    });
  };

  // Bulk metadata application
  const applyBulkMetadata = () => {
    if (selectedFiles.size === 0) return;

    setUploadedFiles(prev => prev.map(f => 
      selectedFiles.has(f.id) 
        ? { 
            ...f, 
            category: metadata.category as LogoCategory || undefined,
            style: metadata.style as LogoStyle || undefined,
            keywords: metadata.keywords ? metadata.keywords.split(',').map(k => k.trim()).filter(k => k) : undefined,
            description: metadata.description || undefined,
            status: 'success'
          }
        : f
    ));

    setShowBulkMetadataForm(false);
    setSelectedFiles(new Set());
    setMetadata({
      category: '',
      style: '',
      keywords: '',
      description: ''
    });
  };

  // Bulk file selection
  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const selectAllFiles = () => {
    const validFileIds = uploadedFiles
      .filter(f => f.status === 'valid')
      .map(f => f.id);
    setSelectedFiles(new Set(validFileIds));
  };

  const deselectAllFiles = () => {
    setSelectedFiles(new Set());
  };

  // Bulk processing operations
  const processBulkOperation = async (operation: 'approve' | 'remove' | 'retry') => {
    if (selectedFiles.size === 0) return;

    setBulkProcessing(true);
    
    try {
      switch (operation) {
        case 'approve':
          setUploadedFiles(prev => prev.map(f => 
            selectedFiles.has(f.id) && f.status === 'valid'
              ? { ...f, status: 'success' }
              : f
          ));
          break;
          
        case 'remove':
          setUploadedFiles(prev => {
            const filesToRemove = prev.filter(f => selectedFiles.has(f.id));
            filesToRemove.forEach(file => {
              if (file.preview) {
                URL.revokeObjectURL(file.preview);
              }
            });
            return prev.filter(f => !selectedFiles.has(f.id));
          });
          break;
          
        case 'retry':
          const filesToRetry = uploadedFiles.filter(f => 
            selectedFiles.has(f.id) && f.status === 'invalid'
          );
          await validateFiles(filesToRetry);
          break;
      }
      
      setSelectedFiles(new Set());
    } catch (error) {
      console.error('Bulk operation error:', error);
    } finally {
      setBulkProcessing(false);
    }
  };

  // Enhanced save all functionality
  const saveAllToGallery = async () => {
    setIsUploading(true);
    const savedFiles: UploadedFile[] = [];
    const readyFiles = uploadedFiles.filter(f => f.status === 'success' || f.status === 'valid');
    let processed = 0;

    // Process files in batches of 3 for better performance
    const batchSize = 3;
    for (let i = 0; i < readyFiles.length; i += batchSize) {
      const batch = readyFiles.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (fileObj) => {
        try {
          // Update progress during processing
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileObj.id 
              ? { ...f, status: 'uploading', progress: 50 }
              : f
          ));

          // Save to local storage
          const storedFile = await localStorageService.saveLogo(
            fileObj.file,
            {
              category: fileObj.category,
              style: fileObj.style,
              keywords: fileObj.keywords,
              description: fileObj.description
            }
          );

          // Update final progress
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileObj.id 
              ? { ...f, status: 'success', progress: 100 }
              : f
          ));

          savedFiles.push(fileObj);
          processed++;
        } catch (error) {
          console.error('Failed to save file to gallery:', error);
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileObj.id 
              ? { ...f, status: 'error', progress: 0, error: 'Save failed' }
              : f
          ));
        }
      }));

      // Small delay between batches to prevent overwhelming
      if (i + batchSize < readyFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    setIsUploading(false);
    onFilesUploaded?.(savedFiles);
  };

  const clearAll = () => {
    uploadedFiles.forEach(file => {
      URL.revokeObjectURL(file.preview);
    });
    setUploadedFiles([]);
  };

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      uploadedFiles.forEach(file => {
        URL.revokeObjectURL(file.preview);
      });
    };
  }, []);

  // Enhanced file status display
  const getStatusIcon = (file: UploadedFile) => {
    switch (file.status) {
      case 'validating':
        return <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />;
      case 'valid':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'invalid':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'success':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = (file: UploadedFile) => {
    switch (file.status) {
      case 'validating':
        return 'Validating...';
      case 'valid':
        return 'Valid';
      case 'invalid':
        return 'Invalid';
      case 'success':
        return 'Ready';
      case 'error':
        return 'Error';
      default:
        return 'Pending';
    }
  };

  const getStatusColor = (file: UploadedFile) => {
    switch (file.status) {
      case 'validating':
        return 'text-blue-600 bg-blue-50';
      case 'valid':
        return 'text-green-600 bg-green-50';
      case 'invalid':
        return 'text-red-600 bg-red-50';
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Enhanced Upload Dropzone with validation info */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-indigo-500 bg-indigo-50' 
            : isDragReject
            ? 'border-red-500 bg-red-50'
            : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">
          {isDragActive ? 'Drop logos here...' : 'Upload Logo Files'}
        </p>
        <p className="text-gray-600 mb-4">
          Drag & drop multiple logo files or click to browse
        </p>
        <div className="text-sm text-gray-500">
          <p>Supports: {acceptedFormats.join(', ')}</p>
          <p>Max size: {formatFileSize(maxSize)} per file</p>
          <p>Max files: {maxFiles} • Files will be validated automatically</p>
          <p className="text-xs mt-2 text-gray-400">
            Validation includes: file type, size, dimensions, and integrity
          </p>
        </div>
      </div>

      {/* File List with Enhanced Validation Display */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-medium text-gray-900">
                Uploaded Files ({uploadedFiles.length}/{maxFiles})
              </h3>
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-green-600">
                  {uploadedFiles.filter(f => f.status === 'valid' || f.status === 'success').length} valid
                </span>
                <span className="text-red-600">
                  {uploadedFiles.filter(f => f.status === 'invalid').length} invalid
                </span>
                <span className="text-blue-600">
                  {uploadedFiles.filter(f => f.status === 'validating').length} validating
                </span>
              </div>
              {uploadedFiles.length > 1 && (
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-500">Bulk Actions:</span>
                  <button
                    onClick={selectAllFiles}
                    className="text-indigo-600 hover:text-indigo-700"
                  >
                    Select All Valid
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={deselectAllFiles}
                    className="text-gray-600 hover:text-gray-700"
                  >
                    Deselect All
                  </button>
                </div>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={clearAll}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Clear All
              </button>
              <button
                onClick={saveAllToGallery}
                disabled={isUploading || !uploadedFiles.some(f => f.status === 'success' || f.status === 'valid')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {isUploading ? 'Saving...' : `Save to Gallery (${uploadedFiles.filter(f => f.status === 'success' || f.status === 'valid').length})`}
              </button>
            </div>
          </div>

          {/* Enhanced Bulk Operations Bar */}
          {selectedFiles.size > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowBulkMetadataForm(true)}
                    disabled={bulkProcessing}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Add Bulk Metadata
                  </button>
                  <button
                    onClick={() => processBulkOperation('approve')}
                    disabled={bulkProcessing}
                    className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve Selected
                  </button>
                  <button
                    onClick={() => processBulkOperation('retry')}
                    disabled={bulkProcessing}
                    className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
                  >
                    Retry Validation
                  </button>
                  <button
                    onClick={() => processBulkOperation('remove')}
                    disabled={bulkProcessing}
                    className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    Remove Selected
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {uploadedFiles.map((fileObj) => (
              <div key={fileObj.id} className={`bg-white border rounded-lg p-4 ${
                selectedFiles.has(fileObj.id) ? 'border-blue-300 bg-blue-50' : 
                fileObj.status === 'invalid' ? 'border-red-200 bg-red-50' :
                fileObj.status === 'valid' || fileObj.status === 'success' ? 'border-green-200 bg-green-50' :
                'border-gray-200'
              }`}>
                <div className="flex items-start space-x-4">
                  {/* Selection Checkbox - only for valid files */}
                  {uploadedFiles.length > 1 && (fileObj.status === 'valid' || fileObj.status === 'success') && (
                    <div className="flex-shrink-0 pt-1">
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(fileObj.id)}
                        onChange={() => toggleFileSelection(fileObj.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </div>
                  )}

                  {/* File Preview */}
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                    {fileObj.file.type && fileObj.file.type.startsWith('image/') ? (
                      <img
                        src={fileObj.preview}
                        alt={fileObj.file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileImage className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Enhanced File Info with Validation Results */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {fileObj.file.name}
                        </h4>
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(fileObj)}`}>
                          {getStatusIcon(fileObj)}
                          <span>{getStatusText(fileObj)}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* File actions based on status */}
                        {fileObj.status === 'valid' && (
                          <button
                            onClick={() => openMetadataForm(fileObj.id)}
                            className="p-1 text-blue-600 hover:text-blue-700"
                            title="Add metadata"
                          >
                            <Info className="h-4 w-4" />
                          </button>
                        )}
                        {fileObj.status === 'invalid' && (
                          <button
                            onClick={() => validateFiles([fileObj])}
                            className="p-1 text-yellow-600 hover:text-yellow-700"
                            title="Retry validation"
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => removeFile(fileObj.id)}
                          className="p-1 text-red-600 hover:text-red-700"
                          title="Remove"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 mb-2">
                      {formatFileSize(fileObj.file.size)} • {fileObj.file.type || 'Unknown type'}
                      {fileObj.validation?.metadata?.dimensions && (
                        <span> • {fileObj.validation.metadata.dimensions.width}×{fileObj.validation.metadata.dimensions.height}</span>
                      )}
                    </div>

                    {/* Validation Results Display */}
                    {fileObj.validation && (
                      <div className="space-y-1">
                        {fileObj.validation.errors.length > 0 && (
                          <div className="text-xs text-red-600">
                            <span className="font-medium">Errors:</span>
                            <ul className="list-disc list-inside mt-1">
                              {fileObj.validation.errors.map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {fileObj.validation.warnings.length > 0 && (
                          <div className="text-xs text-yellow-600">
                            <span className="font-medium">Warnings:</span>
                            <ul className="list-disc list-inside mt-1">
                              {fileObj.validation.warnings.map((warning, index) => (
                                <li key={index}>{warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Progress bar for validation/upload */}
                    {(fileObj.status === 'validating' || fileObj.status === 'uploading') && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${fileObj.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Metadata display for successful files */}
                    {fileObj.status === 'success' && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {fileObj.category && (
                          <span className="inline-block px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded">
                            {fileObj.category}
                          </span>
                        )}
                        {fileObj.style && (
                          <span className="inline-block px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                            {fileObj.style}
                          </span>
                        )}
                        {fileObj.keywords && fileObj.keywords.length > 0 && (
                          <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                            Keywords: {fileObj.keywords.join(', ')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk Metadata Form Modal */}
      {showBulkMetadataForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Add Bulk Metadata ({selectedFiles.size} files)
              </h3>
              <button
                onClick={() => setShowBulkMetadataForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                This metadata will be applied to all {selectedFiles.size} selected files. 
                You can leave fields empty to skip them.
              </p>
            </div>

            <div className="space-y-4">
              {/* Same form fields as individual metadata form */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={metadata.category}
                  onChange={(e) => setMetadata({ ...metadata, category: e.target.value as LogoCategory | '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                >
                  <option value="">Select a category...</option>
                  {Object.values(LogoCategory).map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Style
                </label>
                <select
                  value={metadata.style}
                  onChange={(e) => setMetadata({ ...metadata, style: e.target.value as LogoStyle | '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                >
                  <option value="">Select a style...</option>
                  {Object.values(LogoStyle).map(style => (
                    <option key={style} value={style}>{style}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keywords
                </label>
                <input
                  type="text"
                  value={metadata.keywords}
                  onChange={(e) => setMetadata({ ...metadata, keywords: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500 bg-white"
                  placeholder="tech, modern, corporate (comma separated)"
                />
                <p className="text-xs text-gray-500 mt-1">Separate keywords with commas</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description Template
                </label>
                <textarea
                  value={metadata.description}
                  onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500 bg-white"
                  rows={3}
                  placeholder="Description to apply to all selected files..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                onClick={() => setShowBulkMetadataForm(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={applyBulkMetadata}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Apply to {selectedFiles.size} Files
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Individual Metadata Form Modal */}
      {showMetadataForm && selectedFileId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Add Logo Metadata
              </h3>
              <button
                onClick={() => setShowMetadataForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={metadata.category}
                  onChange={(e) => setMetadata({ ...metadata, category: e.target.value as LogoCategory | '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                >
                  <option value="">Select a category...</option>
                  {Object.values(LogoCategory).map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Style */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Style
                </label>
                <select
                  value={metadata.style}
                  onChange={(e) => setMetadata({ ...metadata, style: e.target.value as LogoStyle | '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                >
                  <option value="">Select a style...</option>
                  {Object.values(LogoStyle).map(style => (
                    <option key={style} value={style}>{style}</option>
                  ))}
                </select>
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keywords
                </label>
                <input
                  type="text"
                  value={metadata.keywords}
                  onChange={(e) => setMetadata({ ...metadata, keywords: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500 bg-white"
                  placeholder="tech, modern, corporate (comma separated)"
                />
                <p className="text-xs text-gray-500 mt-1">Separate keywords with commas</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={metadata.description}
                  onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500 bg-white"
                  rows={3}
                  placeholder="Brief description of the logo..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                onClick={() => setShowMetadataForm(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveMetadata}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Save Metadata
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 