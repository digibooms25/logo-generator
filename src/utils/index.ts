// Utility exports will be added here as utilities are created
// Example: export * from './export-handler';

export * from './export-handler';

export {};

// File validation utilities for logo generator

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: {
    dimensions?: { width: number; height: number };
    fileSize: number;
    mimeType: string;
    colorDepth?: number;
    hasTransparency?: boolean;
  };
}

export interface ValidationOptions {
  maxFileSize?: number;
  minDimensions?: { width: number; height: number };
  maxDimensions?: { width: number; height: number };
  allowedMimeTypes?: string[];
  requireTransparency?: boolean;
  checkImageIntegrity?: boolean;
}

/**
 * Default validation options for logo files
 */
export const DEFAULT_LOGO_VALIDATION: ValidationOptions = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  minDimensions: { width: 32, height: 32 },
  maxDimensions: { width: 4096, height: 4096 },
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  checkImageIntegrity: true,
};

/**
 * Default validation options for SVG icons
 */
export const DEFAULT_SVG_VALIDATION: ValidationOptions = {
  maxFileSize: 1 * 1024 * 1024, // 1MB
  minDimensions: { width: 16, height: 16 },
  maxDimensions: { width: 1024, height: 1024 },
  allowedMimeTypes: ['image/svg+xml'],
  checkImageIntegrity: true,
};

/**
 * Validate file type and MIME type
 */
export function validateFileType(file: File, allowedMimeTypes: string[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file extension
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  const expectedExtensions: Record<string, string[]> = {
    'image/png': ['png'],
    'image/jpeg': ['jpg', 'jpeg'],
    'image/jpg': ['jpg', 'jpeg'],
    'image/webp': ['webp'],
    'image/svg+xml': ['svg'],
  };

  if (!allowedMimeTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`);
  }

  // Validate file extension matches MIME type
  if (allowedMimeTypes.includes(file.type)) {
    const validExtensions = expectedExtensions[file.type];
    if (validExtensions && fileExtension && !validExtensions.includes(fileExtension)) {
      warnings.push(`File extension .${fileExtension} doesn't match MIME type ${file.type}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      fileSize: file.size,
      mimeType: file.type,
    },
  };
}

/**
 * Validate file size
 */
export function validateFileSize(file: File, maxSize: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (file.size > maxSize) {
    errors.push(`File size ${formatFileSize(file.size)} exceeds maximum allowed size ${formatFileSize(maxSize)}`);
  }

  if (file.size === 0) {
    errors.push('File is empty');
  }

  // Warn for very large files (even if under limit)
  if (file.size > maxSize * 0.8) {
    warnings.push(`File size ${formatFileSize(file.size)} is quite large`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      fileSize: file.size,
      mimeType: file.type,
    },
  };
}

/**
 * Validate image dimensions and integrity
 */
export function validateImageFile(file: File, options: ValidationOptions): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const img = new Image();
    
    img.onload = () => {
      const metadata = {
        dimensions: { width: img.width, height: img.height },
        fileSize: file.size,
        mimeType: file.type,
      };

      // Check minimum dimensions
      if (options.minDimensions) {
        if (img.width < options.minDimensions.width || img.height < options.minDimensions.height) {
          errors.push(
            `Image dimensions ${img.width}x${img.height} are below minimum required ${options.minDimensions.width}x${options.minDimensions.height}`
          );
        }
      }

      // Check maximum dimensions
      if (options.maxDimensions) {
        if (img.width > options.maxDimensions.width || img.height > options.maxDimensions.height) {
          errors.push(
            `Image dimensions ${img.width}x${img.height} exceed maximum allowed ${options.maxDimensions.width}x${options.maxDimensions.height}`
          );
        }
      }

      // Check aspect ratio (warn for extreme ratios)
      const aspectRatio = img.width / img.height;
      if (aspectRatio > 10 || aspectRatio < 0.1) {
        warnings.push(`Unusual aspect ratio ${aspectRatio.toFixed(2)}:1 - consider a more balanced ratio`);
      }

      // Warn for very small images
      if (img.width < 64 || img.height < 64) {
        warnings.push('Image is quite small - may not be suitable for all use cases');
      }

      URL.revokeObjectURL(img.src);
      resolve({
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve({
        isValid: false,
        errors: ['Unable to load image - file may be corrupted or invalid'],
        warnings,
        metadata: {
          fileSize: file.size,
          mimeType: file.type,
        },
      });
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Validate SVG file content and structure
 */
export function validateSVGFile(file: File, options: ValidationOptions): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    const errors: string[] = [];
    const warnings: string[] = [];

    reader.onload = () => {
      const svgContent = reader.result as string;
      
      try {
        // Parse SVG as XML
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgContent, 'image/svg+xml');
        
        // Check for parsing errors
        const parserError = doc.querySelector('parsererror');
        if (parserError) {
          errors.push('SVG file contains invalid XML syntax');
          resolve({
            isValid: false,
            errors,
            warnings,
            metadata: { fileSize: file.size, mimeType: file.type },
          });
          return;
        }

        const svgElement = doc.documentElement;
        
        // Validate root element
        if (svgElement.tagName.toLowerCase() !== 'svg') {
          errors.push('File does not contain a valid SVG root element');
        }

        // Extract dimensions
        let width = 0, height = 0;
        const widthAttr = svgElement.getAttribute('width');
        const heightAttr = svgElement.getAttribute('height');
        const viewBox = svgElement.getAttribute('viewBox');

        if (widthAttr && heightAttr) {
          width = parseFloat(widthAttr.replace(/[^\d.]/g, ''));
          height = parseFloat(heightAttr.replace(/[^\d.]/g, ''));
        } else if (viewBox) {
          const viewBoxValues = viewBox.split(/\s+|,/).map(v => parseFloat(v));
          if (viewBoxValues.length >= 4) {
            width = viewBoxValues[2];
            height = viewBoxValues[3];
          }
        }

        // Validate dimensions if specified
        if (options.minDimensions && (width < options.minDimensions.width || height < options.minDimensions.height)) {
          errors.push(
            `SVG dimensions ${width}x${height} are below minimum required ${options.minDimensions.width}x${options.minDimensions.height}`
          );
        }

        if (options.maxDimensions && (width > options.maxDimensions.width || height > options.maxDimensions.height)) {
          errors.push(
            `SVG dimensions ${width}x${height} exceed maximum allowed ${options.maxDimensions.width}x${options.maxDimensions.height}`
          );
        }

        // Security checks
        const scriptTags = doc.querySelectorAll('script');
        if (scriptTags.length > 0) {
          errors.push('SVG contains script tags - potential security risk');
        }

        const foreignObjects = doc.querySelectorAll('foreignObject');
        if (foreignObjects.length > 0) {
          warnings.push('SVG contains foreignObject elements - may not render consistently');
        }

        // Check for external references
        const externalRefs = svgContent.match(/href\s*=\s*["'][^"']*["']/g);
        if (externalRefs && externalRefs.some(ref => ref.includes('http'))) {
          warnings.push('SVG contains external references - may not work offline');
        }

        // Quality checks
        const pathElements = doc.querySelectorAll('path');
        const circleElements = doc.querySelectorAll('circle');
        const rectElements = doc.querySelectorAll('rect');
        const totalElements = pathElements.length + circleElements.length + rectElements.length;

        if (totalElements === 0) {
          warnings.push('SVG appears to be empty or contains no visible elements');
        }

        if (totalElements > 1000) {
          warnings.push('SVG is very complex with many elements - may impact performance');
        }

        const metadata = {
          dimensions: { width, height },
          fileSize: file.size,
          mimeType: file.type,
        };

        resolve({
          isValid: errors.length === 0,
          errors,
          warnings,
          metadata,
        });

      } catch (error) {
        resolve({
          isValid: false,
          errors: ['Failed to parse SVG content'],
          warnings,
          metadata: { fileSize: file.size, mimeType: file.type },
        });
      }
    };

    reader.onerror = () => {
      resolve({
        isValid: false,
        errors: ['Failed to read file content'],
        warnings,
        metadata: { fileSize: file.size, mimeType: file.type },
      });
    };

    reader.readAsText(file);
  });
}

/**
 * Comprehensive file validation
 */
export async function validateFile(
  file: File, 
  options: ValidationOptions = DEFAULT_LOGO_VALIDATION
): Promise<ValidationResult> {
  const results: ValidationResult[] = [];
  
  // Basic file type validation
  if (options.allowedMimeTypes) {
    results.push(validateFileType(file, options.allowedMimeTypes));
  }

  // File size validation
  if (options.maxFileSize) {
    results.push(validateFileSize(file, options.maxFileSize));
  }

  // Content validation based on file type
  if (options.checkImageIntegrity) {
    if (file.type === 'image/svg+xml') {
      results.push(await validateSVGFile(file, options));
    } else if (file.type.startsWith('image/')) {
      results.push(await validateImageFile(file, options));
    }
  }

  // Combine all results
  const allErrors = results.flatMap(r => r.errors);
  const allWarnings = results.flatMap(r => r.warnings);
  const metadata = results.find(r => r.metadata)?.metadata;

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    metadata,
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Check if file is SVG
 */
export function isSVGFile(file: File): boolean {
  return file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
}
