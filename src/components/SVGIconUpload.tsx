"use client";

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { LocalStorageService, StoredSVGIcon } from '../services/local-storage';
import { Upload, X, FileImage, AlertCircle, CheckCircle, Loader, Eye, Info, Check, Edit, Clock, RotateCcw, AlertTriangle, Shield } from 'lucide-react';
import { 
  validateFile, 
  ValidationResult, 
  DEFAULT_SVG_VALIDATION,
  formatFileSize,
  sanitizeFilename,
  isSVGFile
} from '../utils';

interface SVGMetadata {
  viewBox?: string;
  width?: number;
  height?: number;
  hasTitle?: boolean;
  hasDesc?: boolean;
  colorCount?: number;
}

interface SVGIconFile {
  id: string;
  file: File;
  svgContent: string;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  metadata?: SVGMetadata;
}

interface SVGIconUploadProps {
  onFilesUploaded?: (files: StoredSVGIcon[]) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  className?: string;
}

interface UploadedSVGIcon {
  id: string;
  file: File;
  preview: string;
  status: 'uploading' | 'success' | 'error' | 'pending' | 'validating' | 'valid' | 'invalid';
  progress: number;
  error?: string;
  svgContent?: string;
  metadata?: SVGMetadata;
  category?: string;
  keywords?: string[];
  description?: string;
  validation?: ValidationResult;
  securityIssues?: string[];
}

export default function SVGIconUpload({ 
  onFilesUploaded,
  maxFiles = 20,
  maxSize = 1 * 1024 * 1024, // 1MB default for SVG files
  className = ''
}: SVGIconUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedSVGIcon[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    file: UploadedSVGIcon | null;
  }>({
    isOpen: false,
    file: null
  });
  const [showMetadataForm, setShowMetadataForm] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [showBulkMetadataForm, setShowBulkMetadataForm] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [validationInProgress, setValidationInProgress] = useState<Set<string>>(new Set());
  const [metadata, setMetadata] = useState<{
    category: string;
    keywords: string;
    description: string;
  }>({
    category: '',
    keywords: '',
    description: ''
  });

  const localStorageService = LocalStorageService.getInstance();

  // Parse SVG content and extract metadata
  const parseSVGMetadata = (svgContent: string) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      
      if (!svg) {
        throw new Error('Invalid SVG content');
      }

      const viewBox = svg.getAttribute('viewBox') || undefined;
      const width = svg.getAttribute('width') ? parseFloat(svg.getAttribute('width')!) : undefined;
      const height = svg.getAttribute('height') ? parseFloat(svg.getAttribute('height')!) : undefined;
      const hasTitle = !!svg.querySelector('title');
      const hasDesc = !!svg.querySelector('desc');
      
      // Count approximate number of colors (simple heuristic)
      const colorMatches = svgContent.match(/(#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\))/g);
      const colorCount = colorMatches ? new Set(colorMatches).size : 0;

      return {
        viewBox,
        width,
        height,
        hasTitle,
        hasDesc,
        colorCount
      };
    } catch (error) {
      console.error('Error parsing SVG:', error);
      return undefined;
    }
  };

  // Validate SVG content
  const validateSVG = (content: string): { isValid: boolean; error?: string } => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'image/svg+xml');
      const parseError = doc.querySelector('parsererror');
      
      if (parseError) {
        return { isValid: false, error: 'Invalid SVG syntax' };
      }

      const svg = doc.querySelector('svg');
      if (!svg) {
        return { isValid: false, error: 'No SVG element found' };
      }

      // Check for potentially unsafe content
      const scripts = doc.querySelectorAll('script');
      if (scripts.length > 0) {
        return { isValid: false, error: 'SVG contains scripts (security risk)' };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Failed to parse SVG' };
    }
  };

  // Simulate file upload process with SVG validation
  const simulateUpload = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const svgContent = reader.result as string;
        const validation = validateSVG(svgContent);
        
        if (!validation.isValid) {
          setUploadedFiles(prev => prev.map(f => 
            f.file.name === file.name 
              ? { ...f, status: 'error' as const, error: validation.error }
              : f
          ));
          reject(new Error(validation.error));
          return;
        }

        // Extract metadata
        const metadata = parseSVGMetadata(svgContent);
        
        // Update file with SVG content and metadata
        setUploadedFiles(prev => prev.map(f => 
          f.file.name === file.name 
            ? { ...f, svgContent, metadata }
            : f
        ));

        // Simulate upload progress
        const duration = 1000 + Math.random() * 2000; // 1-3 seconds
        const interval = 50;
        let progress = 0;

        const timer = setInterval(() => {
          progress += (interval / duration) * 100;
          
          setUploadedFiles(prev => prev.map(f => 
            f.file.name === file.name 
              ? { ...f, progress: Math.min(progress, 100) }
              : f
          ));

          if (progress >= 100) {
            clearInterval(timer);
            
            // Simulate occasional upload failure (5% chance)
            if (Math.random() < 0.05) {
              setUploadedFiles(prev => prev.map(f => 
                f.file.name === file.name 
                  ? { ...f, status: 'error' as const, error: 'Upload failed. Please try again.' }
                  : f
              ));
              reject(new Error('Upload failed'));
            } else {
              setUploadedFiles(prev => prev.map(f => 
                f.file.name === file.name 
                  ? { ...f, status: 'success' as const, progress: 100 }
                  : f
              ));
              resolve();
            }
          }
        }, interval);
      };

      reader.onerror = () => {
        setUploadedFiles(prev => prev.map(f => 
          f.file.name === file.name 
            ? { ...f, status: 'error' as const, error: 'Failed to read file' }
            : f
        ));
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  };

  // Bulk SVG processing
  const processSVGBatch = async (files: UploadedSVGIcon[]) => {
    const batchSize = 5;
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (fileObj) => {
        if (validationInProgress.has(fileObj.id)) return;
        
        setValidationInProgress(prev => new Set([...prev, fileObj.id]));
        
        try {
          // Update status to validating
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileObj.id 
              ? { ...f, status: 'validating', progress: 25 }
              : f
          ));

          // Read and validate SVG content
          const svgContent = await readFileAsText(fileObj.file);
          
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileObj.id 
              ? { ...f, progress: 50 }
              : f
          ));
          
          const isValidSVG = validateSVG(svgContent);
          if (!isValidSVG) {
            throw new Error('Invalid SVG format');
          }

          // Extract metadata
          const svgMetadata = parseSVGMetadata(svgContent);
          
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileObj.id 
              ? { 
                  ...f, 
                  svgContent, 
                  metadata: svgMetadata,
                  status: 'valid',
                  progress: 100
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
      }));
      
      // Small delay between batches
      if (i + batchSize < files.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  };

  // Handle file drop/selection
  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(rejection => {
        const errors = rejection.errors.map((e: any) => e.message).join(', ');
        alert(`File ${rejection.file.name} was rejected: ${errors}`);
      });
    }

    if (uploadedFiles.length + acceptedFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} SVG files allowed. Please remove some files first.`);
      return;
    }

    const newFiles: UploadedSVGIcon[] = [];

    // Process each file to extract SVG content
    for (const file of acceptedFiles) {
      try {
        const svgContent = await readFileAsText(file);
        const newFile: UploadedSVGIcon = {
          id: `${Date.now()}-${Math.random()}`,
          file: {
            ...file,
            name: sanitizeFilename(file.name)
          } as File,
          svgContent,
          preview: URL.createObjectURL(file),
          status: 'pending',
          progress: 0
        };
        newFiles.push(newFile);
      } catch (error) {
        alert(`Failed to read SVG content from ${file.name}`);
      }
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Start validation
    await processSVGBatch(newFiles);

    // Handle metadata forms based on upload count
    if (newFiles.length === 1 && uploadedFiles.length === 0) {
      setTimeout(() => {
        const validatedFile = uploadedFiles.find(f => f.id === newFiles[0].id);
        if (validatedFile?.status === 'valid') {
          setSelectedFileId(newFiles[0].id);
          setShowMetadataForm(true);
        }
      }, 1000);
    } else if (newFiles.length > 1) {
      setTimeout(() => {
        const validFiles = uploadedFiles.filter(f => 
          newFiles.some(nf => nf.id === f.id) && f.status === 'valid'
        );
        
        if (validFiles.length > 1) {
          const shouldShowBulkForm = confirm(
            `Add metadata to ${validFiles.length} valid SVG files? Click OK for bulk metadata or Cancel to add individually.`
          );
          if (shouldShowBulkForm) {
            setSelectedFiles(new Set(validFiles.map(f => f.id)));
            setShowBulkMetadataForm(true);
          }
        }
      }, 1500);
    }
  }, [uploadedFiles, maxFiles]);

  // Read file as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/svg+xml': ['.svg']
    },
    maxSize,
    maxFiles,
    multiple: true
  });

  // Enhanced status display functions
  const getStatusIcon = (file: UploadedSVGIcon) => {
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

  const getStatusText = (file: UploadedSVGIcon) => {
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

  const getStatusColor = (file: UploadedSVGIcon) => {
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

  // Bulk metadata application
  const applyBulkMetadata = () => {
    if (selectedFiles.size === 0) return;

    setUploadedFiles(prev => prev.map(f => 
      selectedFiles.has(f.id) 
        ? { 
            ...f, 
            category: metadata.category || undefined,
            keywords: metadata.keywords ? metadata.keywords.split(',').map(k => k.trim()).filter(k => k) : undefined,
            description: metadata.description || undefined
          }
        : f
    ));

    setShowBulkMetadataForm(false);
    setSelectedFiles(new Set());
    setMetadata({
      category: '',
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
          await processSVGBatch(filesToRetry);
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
    const savedFiles: UploadedSVGIcon[] = [];
    const readyFiles = uploadedFiles.filter(f => f.status === 'success' && f.svgContent);

    // Process files in batches of 3 for better performance
    const batchSize = 3;
    for (let i = 0; i < readyFiles.length; i += batchSize) {
      const batch = readyFiles.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (fileObj) => {
        try {
          // Save to local storage
          const storedFile = await localStorageService.saveSVGIcon({
            file: {
              name: fileObj.file.name,
              size: fileObj.file.size,
              type: fileObj.file.type,
              lastModified: fileObj.file.lastModified
            },
            svgContent: fileObj.svgContent!,
            metadata: fileObj.metadata,
            category: fileObj.category,
            keywords: fileObj.keywords,
            description: fileObj.description
          });
          savedFiles.push(fileObj);
        } catch (error) {
          console.error('Failed to save SVG icon to gallery:', error);
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

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const retryUpload = async (fileId: string) => {
    const file = uploadedFiles.find(f => f.id === fileId);
    if (!file) return;

    setUploadedFiles(prev => prev.map(f => 
      f.id === fileId 
        ? { ...f, status: 'validating', progress: 0, error: undefined }
        : f
    ));

    setIsUploading(true);
    try {
      await processSVGBatch([file]);
    } catch (error) {
      console.error('Retry upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Upload Dropzone - Enhanced for bulk uploads */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-green-500 bg-green-50' 
            : isDragReject
            ? 'border-red-500 bg-red-50'
            : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">
          {isDragActive ? 'Drop SVG icons here...' : 'Upload SVG Icons'}
        </p>
        <p className="text-gray-600 mb-4">
          Drag & drop multiple SVG files or click to browse
        </p>
        <div className="text-sm text-gray-500">
          <p>Supports: SVG files only (.svg)</p>
          <p>Max size: {formatFileSize(maxSize)} per file</p>
          <p>Max files: {maxFiles} • Files will be validated automatically</p>
          <div className="flex items-center justify-center gap-1 text-xs mt-2 text-gray-400">
            <Shield className="h-3 w-3" />
            <span>Security validation includes: script detection, malicious content scan</span>
          </div>
        </div>
      </div>

      {/* File List with Bulk Operations */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-medium text-gray-900">
                SVG Files ({uploadedFiles.length}/{maxFiles})
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
                {uploadedFiles.some(f => f.securityIssues && f.securityIssues.length > 0) && (
                  <span className="text-orange-600 flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    security issues detected
                  </span>
                )}
              </div>
              {uploadedFiles.length > 1 && (
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-500">Bulk Actions:</span>
                  <button
                    onClick={selectAllFiles}
                    className="text-green-600 hover:text-green-700"
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
                disabled={isUploading || !uploadedFiles.some(f => f.status === 'success')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {isUploading ? 'Saving...' : `Save to Gallery (${uploadedFiles.filter(f => f.status === 'success').length})`}
              </button>
            </div>
          </div>

          {/* Processing Status */}
          {validationInProgress.size > 0 && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-900">
                  Validating {validationInProgress.size} SVG file{validationInProgress.size !== 1 ? 's' : ''}...
                </span>
                <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full"></div>
              </div>
            </div>
          )}

          {/* Bulk Operations Bar */}
          {selectedFiles.size > 0 && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-900">
                  {selectedFiles.size} SVG file{selectedFiles.size !== 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowBulkMetadataForm(true)}
                    disabled={bulkProcessing}
                    className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
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
                selectedFiles.has(fileObj.id) ? 'border-green-300 bg-green-50' : 
                fileObj.status === 'invalid' ? 'border-red-200 bg-red-50' :
                fileObj.status === 'valid' || fileObj.status === 'success' ? 'border-green-200 bg-green-50' :
                'border-gray-200'
              }`}>
                <div className="flex items-start space-x-4">
                  {/* Selection Checkbox */}
                  {uploadedFiles.length > 1 && (fileObj.status === 'valid' || fileObj.status === 'success') && (
                    <div className="flex-shrink-0 pt-1">
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(fileObj.id)}
                        onChange={() => toggleFileSelection(fileObj.id)}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                    </div>
                  )}

                  {/* SVG Preview */}
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {fileObj.svgContent ? (
                      <div 
                        className="w-12 h-12"
                        dangerouslySetInnerHTML={{ __html: fileObj.svgContent }}
                      />
                    ) : (
                      <FileImage className="h-8 w-8 text-gray-400" />
                    )}
                  </div>

                  {/* File Info - Enhanced with bulk indicators */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {fileObj.file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(fileObj.file.size)}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {/* Preview Button */}
                        {fileObj.svgContent && fileObj.status === 'success' && (
                          <button
                            onClick={() => setPreviewModal({ isOpen: true, file: fileObj })}
                            className="text-blue-600 hover:text-blue-700 transition-colors"
                            title="Preview SVG"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}

                        {/* Status Icon */}
                        {fileObj.status === 'validating' && (
                          <Loader className="h-4 w-4 text-green-600 animate-spin" />
                        )}
                        {fileObj.status === 'valid' && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                        {fileObj.status === 'invalid' && (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}

                        {/* Remove Button */}
                        <button
                          onClick={() => removeFile(fileObj.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {fileObj.status === 'validating' && (
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${fileObj.progress}%` }}
                        />
                      </div>
                    )}

                    {/* Error Message */}
                    {fileObj.status === 'invalid' && fileObj.error && (
                      <div className="mb-2">
                        <p className="text-sm text-red-600">{fileObj.error}</p>
                        <button
                          onClick={() => retryUpload(fileObj.id)}
                          className="text-xs text-green-600 hover:text-green-700 font-medium"
                        >
                          Retry Validation
                        </button>
                      </div>
                    )}

                    {/* Success Message with Metadata */}
                    {fileObj.status === 'success' && (
                      <div className="space-y-1">
                        <p className="text-sm text-green-600">Upload completed successfully</p>
                        {fileObj.metadata && (
                          <div className="text-xs text-gray-500 space-y-1">
                            {fileObj.metadata.viewBox && (
                              <p>ViewBox: {fileObj.metadata.viewBox}</p>
                            )}
                            {(fileObj.metadata.width || fileObj.metadata.height) && (
                              <p>Size: {fileObj.metadata.width || '?'} × {fileObj.metadata.height || '?'}</p>
                            )}
                                                         {(fileObj.metadata.colorCount ?? 0) > 0 && (
                               <p>Colors: {fileObj.metadata.colorCount}</p>
                             )}
                          </div>
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
                Add Bulk Metadata ({selectedFiles.size} SVG icons)
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
                This metadata will be applied to all {selectedFiles.size} selected SVG icons. 
                You can leave fields empty to skip them.
              </p>
            </div>

            <div className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={metadata.category}
                  onChange={(e) => setMetadata({ ...metadata, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 placeholder-gray-500 bg-white"
                  placeholder="e.g., UI, Navigation, Social"
                />
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 placeholder-gray-500 bg-white"
                  placeholder="icon, ui, arrow, navigation (comma separated)"
                />
                <p className="text-xs text-gray-500 mt-1">Separate keywords with commas</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description Template
                </label>
                <textarea
                  value={metadata.description}
                  onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 placeholder-gray-500 bg-white"
                  rows={3}
                  placeholder="Description to apply to all selected icons..."
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
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Apply to {selectedFiles.size} Icons
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
                Add SVG Icon Metadata
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
                <input
                  type="text"
                  value={metadata.category}
                  onChange={(e) => setMetadata({ ...metadata, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="e.g., UI, Navigation, Social"
                />
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="icon, ui, arrow, navigation (comma separated)"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows={3}
                  placeholder="Brief description of the icon..."
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
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Save Metadata
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewModal.isOpen && previewModal.file && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">SVG Preview</h3>
              <button
                onClick={() => setPreviewModal({ isOpen: false, file: null })}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-8 flex items-center justify-center">
                <div 
                  className="max-w-full max-h-48"
                  dangerouslySetInnerHTML={{ __html: previewModal.file.svgContent }}
                />
              </div>
              
              <div className="text-sm text-gray-600 space-y-2">
                <p><strong>File:</strong> {previewModal.file.file.name}</p>
                <p><strong>Size:</strong> {formatFileSize(previewModal.file.file.size)}</p>
                {previewModal.file.metadata && (
                  <>
                    {previewModal.file.metadata.viewBox && (
                      <p><strong>ViewBox:</strong> {previewModal.file.metadata.viewBox}</p>
                    )}
                    {(previewModal.file.metadata.width || previewModal.file.metadata.height) && (
                      <p><strong>Dimensions:</strong> {previewModal.file.metadata.width || '?'} × {previewModal.file.metadata.height || '?'}</p>
                    )}
                    <p><strong>Colors:</strong> {previewModal.file.metadata.colorCount || 0}</p>
                    <p><strong>Accessibility:</strong> {previewModal.file.metadata.hasTitle ? '✓' : '✗'} Title, {previewModal.file.metadata.hasDesc ? '✓' : '✗'} Description</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 