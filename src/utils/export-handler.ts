/**
 * Export Handler Utility
 * Handles logo export in multiple formats with high-resolution outputs
 */

import type { GeneratedLogo } from '@/services/logo-generation-workflow';

export enum ExportFormat {
  PNG = 'png',
  SVG = 'svg',
  PDF = 'pdf',
  JPEG = 'jpeg',
  WEBP = 'webp'
}

export enum ExportSize {
  SMALL = 'small',      // 256x256
  MEDIUM = 'medium',    // 512x512
  LARGE = 'large',      // 1024x1024
  XLARGE = 'xlarge',    // 2048x2048
  CUSTOM = 'custom'
}

export interface ExportOptions {
  format: ExportFormat;
  size: ExportSize;
  customDimensions?: { width: number; height: number };
  quality?: number; // 1-100 for JPEG/WEBP
  backgroundColor?: string;
  includePadding?: boolean;
  paddingPercentage?: number; // 0-50
  dpi?: number; // For print outputs
  transparentBackground?: boolean;
}

export interface ExportResult {
  success: boolean;
  blob?: Blob;
  dataUrl?: string;
  filename: string;
  format: ExportFormat;
  dimensions: { width: number; height: number };
  fileSize?: number;
  error?: string;
}

export interface BatchExportOptions {
  formats: ExportFormat[];
  sizes: ExportSize[];
  commonOptions?: Partial<ExportOptions>;
}

export interface BatchExportResult {
  logo: GeneratedLogo;
  exports: ExportResult[];
  totalFiles: number;
  successCount: number;
  failureCount: number;
  totalSize: number;
}

// Size mappings
const SIZE_MAPPINGS = {
  [ExportSize.SMALL]: { width: 256, height: 256 },
  [ExportSize.MEDIUM]: { width: 512, height: 512 },
  [ExportSize.LARGE]: { width: 1024, height: 1024 },
  [ExportSize.XLARGE]: { width: 2048, height: 2048 }
};

// DPI settings for different use cases
const DPI_PRESETS = {
  web: 72,
  print: 300,
  highres: 600
};

export class ExportHandlerService {
  private static instance: ExportHandlerService;

  public static getInstance(): ExportHandlerService {
    if (!ExportHandlerService.instance) {
      ExportHandlerService.instance = new ExportHandlerService();
    }
    return ExportHandlerService.instance;
  }

  /**
   * Export logo to specified format and size
   */
  public async exportLogo(
    logo: GeneratedLogo, 
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const dimensions = this.calculateDimensions(options);
      const filename = this.generateFilename(logo, options, dimensions);

      // Load and process image
      const processedImageData = await this.loadAndProcessImage(
        logo.imageUrl || logo.imageBase64!,
        dimensions,
        options
      );

      let result: ExportResult;

      switch (options.format) {
        case ExportFormat.PNG:
          result = await this.exportToPNG(processedImageData, filename, dimensions, options);
          break;
        case ExportFormat.JPEG:
          result = await this.exportToJPEG(processedImageData, filename, dimensions, options);
          break;
        case ExportFormat.WEBP:
          result = await this.exportToWebP(processedImageData, filename, dimensions, options);
          break;
        case ExportFormat.SVG:
          result = await this.exportToSVG(logo, filename, dimensions, options);
          break;
        case ExportFormat.PDF:
          result = await this.exportToPDF(processedImageData, filename, dimensions, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      return result;

    } catch (error) {
      return {
        success: false,
        filename: this.generateFilename(logo, options, { width: 0, height: 0 }),
        format: options.format,
        dimensions: { width: 0, height: 0 },
        error: error instanceof Error ? error.message : 'Unknown export error'
      };
    }
  }

  /**
   * Export logo in multiple formats and sizes
   */
  public async batchExport(
    logo: GeneratedLogo,
    batchOptions: BatchExportOptions
  ): Promise<BatchExportResult> {
    const exports: ExportResult[] = [];
    let totalSize = 0;

    for (const format of batchOptions.formats) {
      for (const size of batchOptions.sizes) {
        try {
          const exportOptions: ExportOptions = {
            format,
            size,
            ...batchOptions.commonOptions
          };

          const result = await this.exportLogo(logo, exportOptions);
          exports.push(result);

          if (result.success && result.fileSize) {
            totalSize += result.fileSize;
          }
        } catch (error) {
          console.error(`Batch export failed for ${format}/${size}:`, error);
          exports.push({
            success: false,
            filename: `${logo.metadata.companyName}_${size}.${format}`,
            format,
            dimensions: { width: 0, height: 0 },
            error: error instanceof Error ? error.message : 'Export failed'
          });
        }
      }
    }

    const successCount = exports.filter(e => e.success).length;
    const failureCount = exports.length - successCount;

    return {
      logo,
      exports,
      totalFiles: exports.length,
      successCount,
      failureCount,
      totalSize
    };
  }

  /**
   * Download exported file
   */
  public downloadFile(exportResult: ExportResult): void {
    if (!exportResult.success || !exportResult.blob) {
      console.error('Cannot download: Export was not successful or blob is missing');
      return;
    }

    const url = URL.createObjectURL(exportResult.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportResult.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Download multiple files as ZIP
   */
  public async downloadBatchAsZip(batchResult: BatchExportResult): Promise<void> {
    try {
      // Dynamic import to reduce bundle size
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Add successful exports to ZIP
      for (const exportResult of batchResult.exports) {
        if (exportResult.success && exportResult.blob) {
          zip.file(exportResult.filename, exportResult.blob);
        }
      }

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipFilename = `${batchResult.logo.metadata.companyName}_logo_pack.zip`;

      // Download ZIP
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = zipFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Failed to create ZIP download:', error);
      throw new Error('Failed to create ZIP file for batch download');
    }
  }

  /**
   * Load and process image from URL or base64
   */
  private async loadAndProcessImage(
    source: string,
    dimensions: { width: number; height: number },
    options: ExportOptions
  ): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Set canvas dimensions
          canvas.width = dimensions.width;
          canvas.height = dimensions.height;

          // Set background
          if (!options.transparentBackground && options.backgroundColor) {
            ctx.fillStyle = options.backgroundColor;
            ctx.fillRect(0, 0, dimensions.width, dimensions.height);
          }

          // Calculate image positioning with padding
          let drawWidth = dimensions.width;
          let drawHeight = dimensions.height;
          let drawX = 0;
          let drawY = 0;

          if (options.includePadding && options.paddingPercentage) {
            const padding = (options.paddingPercentage / 100) * Math.min(dimensions.width, dimensions.height);
            drawWidth = dimensions.width - (padding * 2);
            drawHeight = dimensions.height - (padding * 2);
            drawX = padding;
            drawY = padding;
          }

          // Maintain aspect ratio
          const aspectRatio = img.width / img.height;
          if (drawWidth / drawHeight > aspectRatio) {
            drawWidth = drawHeight * aspectRatio;
            drawX = (dimensions.width - drawWidth) / 2;
          } else {
            drawHeight = drawWidth / aspectRatio;
            drawY = (dimensions.height - drawHeight) / 2;
          }

          // Draw image
          ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

          resolve(canvas);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = source.startsWith('data:') ? source : source;
    });
  }

  /**
   * Export to PNG format
   */
  private async exportToPNG(
    canvas: HTMLCanvasElement,
    filename: string,
    dimensions: { width: number; height: number },
    options: ExportOptions
  ): Promise<ExportResult> {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve({
            success: true,
            blob,
            dataUrl: canvas.toDataURL('image/png'),
            filename,
            format: ExportFormat.PNG,
            dimensions,
            fileSize: blob.size
          });
        } else {
          resolve({
            success: false,
            filename,
            format: ExportFormat.PNG,
            dimensions,
            error: 'Failed to generate PNG blob'
          });
        }
      }, 'image/png');
    });
  }

  /**
   * Export to JPEG format
   */
  private async exportToJPEG(
    canvas: HTMLCanvasElement,
    filename: string,
    dimensions: { width: number; height: number },
    options: ExportOptions
  ): Promise<ExportResult> {
    return new Promise((resolve) => {
      const quality = (options.quality || 90) / 100;
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve({
            success: true,
            blob,
            dataUrl: canvas.toDataURL('image/jpeg', quality),
            filename,
            format: ExportFormat.JPEG,
            dimensions,
            fileSize: blob.size
          });
        } else {
          resolve({
            success: false,
            filename,
            format: ExportFormat.JPEG,
            dimensions,
            error: 'Failed to generate JPEG blob'
          });
        }
      }, 'image/jpeg', quality);
    });
  }

  /**
   * Export to WebP format
   */
  private async exportToWebP(
    canvas: HTMLCanvasElement,
    filename: string,
    dimensions: { width: number; height: number },
    options: ExportOptions
  ): Promise<ExportResult> {
    return new Promise((resolve) => {
      const quality = (options.quality || 90) / 100;
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve({
            success: true,
            blob,
            dataUrl: canvas.toDataURL('image/webp', quality),
            filename,
            format: ExportFormat.WEBP,
            dimensions,
            fileSize: blob.size
          });
        } else {
          resolve({
            success: false,
            filename,
            format: ExportFormat.WEBP,
            dimensions,
            error: 'WebP format not supported or failed to generate blob'
          });
        }
      }, 'image/webp', quality);
    });
  }

  /**
   * Export to SVG format (simplified conversion)
   */
  private async exportToSVG(
    logo: GeneratedLogo,
    filename: string,
    dimensions: { width: number; height: number },
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      // Create SVG with embedded image
      const svgContent = `
        <svg width="${dimensions.width}" height="${dimensions.height}" xmlns="http://www.w3.org/2000/svg">
          ${options.backgroundColor && !options.transparentBackground ? 
            `<rect width="100%" height="100%" fill="${options.backgroundColor}"/>` : ''
          }
          <image href="${logo.imageUrl || logo.imageBase64}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet"/>
        </svg>
      `.trim();

      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      
      return {
        success: true,
        blob,
        dataUrl: `data:image/svg+xml;base64,${btoa(svgContent)}`,
        filename,
        format: ExportFormat.SVG,
        dimensions,
        fileSize: blob.size
      };

    } catch (error) {
      return {
        success: false,
        filename,
        format: ExportFormat.SVG,
        dimensions,
        error: error instanceof Error ? error.message : 'SVG export failed'
      };
    }
  }

  /**
   * Export to PDF format
   */
  private async exportToPDF(
    canvas: HTMLCanvasElement,
    filename: string,
    dimensions: { width: number; height: number },
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      // Dynamic import to reduce bundle size
      const jsPDF = (await import('jspdf')).jsPDF;
      
      // Calculate PDF dimensions (convert pixels to mm at specified DPI)
      const dpi = options.dpi || DPI_PRESETS.print;
      const mmPerInch = 25.4;
      const widthMm = (dimensions.width / dpi) * mmPerInch;
      const heightMm = (dimensions.height / dpi) * mmPerInch;

      // Create PDF
      const pdf = new jsPDF({
        orientation: widthMm > heightMm ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [widthMm, heightMm]
      });

      // Add image to PDF
      const imageData = canvas.toDataURL('image/png');
      pdf.addImage(imageData, 'PNG', 0, 0, widthMm, heightMm);

      // Generate blob
      const pdfBlob = pdf.output('blob');

      return {
        success: true,
        blob: pdfBlob,
        filename,
        format: ExportFormat.PDF,
        dimensions,
        fileSize: pdfBlob.size
      };

    } catch (error) {
      return {
        success: false,
        filename,
        format: ExportFormat.PDF,
        dimensions,
        error: error instanceof Error ? error.message : 'PDF export failed'
      };
    }
  }

  /**
   * Calculate dimensions based on size option
   */
  private calculateDimensions(options: ExportOptions): { width: number; height: number } {
    if (options.size === ExportSize.CUSTOM && options.customDimensions) {
      return options.customDimensions;
    }
    
    return SIZE_MAPPINGS[options.size as keyof typeof SIZE_MAPPINGS] || SIZE_MAPPINGS[ExportSize.MEDIUM];
  }

  /**
   * Generate filename for export
   */
  private generateFilename(
    logo: GeneratedLogo,
    options: ExportOptions,
    dimensions: { width: number; height: number }
  ): string {
    const companyName = logo.metadata.companyName.replace(/[^a-zA-Z0-9]/g, '_');
    const size = options.size === ExportSize.CUSTOM ? 
      `${dimensions.width}x${dimensions.height}` : 
      options.size;
    
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    
    return `${companyName}_logo_${size}_${timestamp}.${options.format}`;
  }

  /**
   * Get export presets for common use cases
   */
  public getExportPresets(): Record<string, ExportOptions> {
    return {
      web_favicon: {
        format: ExportFormat.PNG,
        size: ExportSize.SMALL,
        transparentBackground: true
      },
      web_header: {
        format: ExportFormat.PNG,
        size: ExportSize.MEDIUM,
        transparentBackground: true
      },
      print_business_card: {
        format: ExportFormat.PDF,
        size: ExportSize.LARGE,
        dpi: DPI_PRESETS.print,
        backgroundColor: '#ffffff'
      },
      print_letterhead: {
        format: ExportFormat.PDF,
        size: ExportSize.XLARGE,
        dpi: DPI_PRESETS.print,
        transparentBackground: true
      },
      social_media: {
        format: ExportFormat.PNG,
        size: ExportSize.LARGE,
        backgroundColor: '#ffffff',
        includePadding: true,
        paddingPercentage: 10
      },
      email_signature: {
        format: ExportFormat.PNG,
        size: ExportSize.MEDIUM,
        transparentBackground: true
      }
    };
  }

  /**
   * Validate export options
   */
  public validateExportOptions(options: ExportOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check custom dimensions
    if (options.size === ExportSize.CUSTOM) {
      if (!options.customDimensions) {
        errors.push('Custom dimensions required when size is set to custom');
      } else {
        if (options.customDimensions.width <= 0 || options.customDimensions.height <= 0) {
          errors.push('Custom dimensions must be positive numbers');
        }
        if (options.customDimensions.width > 4096 || options.customDimensions.height > 4096) {
          errors.push('Custom dimensions cannot exceed 4096 pixels');
        }
      }
    }

    // Check quality for JPEG/WebP
    if ([ExportFormat.JPEG, ExportFormat.WEBP].includes(options.format)) {
      if (options.quality !== undefined && (options.quality < 1 || options.quality > 100)) {
        errors.push('Quality must be between 1 and 100');
      }
    }

    // Check padding
    if (options.includePadding && options.paddingPercentage !== undefined) {
      if (options.paddingPercentage < 0 || options.paddingPercentage > 50) {
        errors.push('Padding percentage must be between 0 and 50');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const exportHandlerService = ExportHandlerService.getInstance(); 