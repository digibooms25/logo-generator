import {
  validateFile,
  validateFileType,
  validateFileSize,
  validateImageFile,
  validateSVGFile,
  DEFAULT_LOGO_VALIDATION,
  DEFAULT_SVG_VALIDATION,
  formatFileSize,
  isImageFile,
  isSVGFile,
  getFileExtension,
  sanitizeFilename,
  ValidationResult,
  ValidationOptions
} from './index';

// Mock File constructor for testing
class MockFile implements File {
  name: string;
  size: number;
  type: string;
  lastModified: number = Date.now();
  webkitRelativePath: string = '';

  constructor(chunks: BlobPart[], filename: string, options?: FilePropertyBag) {
    this.name = filename;
    this.size = chunks.reduce((total, chunk) => total + chunk.toString().length, 0) || 1024; // Default size
    this.type = options?.type || 'application/octet-stream';
    if (options?.lastModified) this.lastModified = options.lastModified;
  }

  arrayBuffer(): Promise<ArrayBuffer> { return Promise.resolve(new ArrayBuffer(0)); }
  slice(): Blob { return new Blob(); }
  stream(): ReadableStream<Uint8Array> { return new ReadableStream(); }
  text(): Promise<string> { return Promise.resolve(''); }
}

// Mock URL.createObjectURL for tests
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock Image constructor
global.Image = jest.fn().mockImplementation(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  src: '',
  width: 100,
  height: 100,
  onload: null,
  onerror: null
}));

describe('File Validation Utilities', () => {
  describe('formatFileSize', () => {
    test('formats bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });
  });

  describe('isImageFile', () => {
    test('identifies image files correctly', () => {
      const imageFile = new MockFile([], 'test.png', { type: 'image/png' });
      const textFile = new MockFile([], 'test.txt', { type: 'text/plain' });
      
      expect(isImageFile(imageFile as File)).toBe(true);
      expect(isImageFile(textFile as File)).toBe(false);
    });
  });

  describe('isSVGFile', () => {
    test('identifies SVG files correctly', () => {
      const svgFile = new MockFile([], 'test.svg', { type: 'image/svg+xml' });
      const svgFileByExtension = new MockFile([], 'test.svg', { type: 'text/plain' });
      const pngFile = new MockFile([], 'test.png', { type: 'image/png' });
      
      expect(isSVGFile(svgFile as File)).toBe(true);
      expect(isSVGFile(svgFileByExtension as File)).toBe(true);
      expect(isSVGFile(pngFile as File)).toBe(false);
    });
  });

  describe('getFileExtension', () => {
    test('extracts file extensions correctly', () => {
      expect(getFileExtension('test.png')).toBe('png');
      expect(getFileExtension('test.svg')).toBe('svg');
      expect(getFileExtension('test.file.jpg')).toBe('jpg');
      expect(getFileExtension('noextension')).toBe('');
      expect(getFileExtension('test.PNG')).toBe('png');
    });
  });

  describe('sanitizeFilename', () => {
    test('sanitizes filenames correctly', () => {
      expect(sanitizeFilename('normal-file.png')).toBe('normal-file.png');
      expect(sanitizeFilename('file with spaces.png')).toBe('file_with_spaces.png');
      expect(sanitizeFilename('file@#$%^&*().png')).toBe('file___________.png');
      expect(sanitizeFilename('__file__.png')).toBe('file__.png');
      expect(sanitizeFilename('multiple___underscores.png')).toBe('multiple_underscores.png');
    });
  });

  describe('validateFileType', () => {
    test('validates allowed file types', () => {
      const pngFile = new MockFile([], 'test.png', { type: 'image/png' });
      const allowedTypes = ['image/png', 'image/jpeg'];
      
      const result = validateFileType(pngFile as File, allowedTypes);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects disallowed file types', () => {
      const textFile = new MockFile([], 'test.txt', { type: 'text/plain' });
      const allowedTypes = ['image/png', 'image/jpeg'];
      
      const result = validateFileType(textFile as File, allowedTypes);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File type text/plain is not allowed. Allowed types: image/png, image/jpeg');
    });

    test('warns about mismatched file extensions', () => {
      const file = new MockFile([], 'test.txt', { type: 'image/png' });
      const allowedTypes = ['image/png'];
      
      const result = validateFileType(file as File, allowedTypes);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('File extension .txt doesn\'t match MIME type image/png');
    });
  });

  describe('validateFileSize', () => {
    test('validates file size within limits', () => {
      const file = new MockFile(['x'.repeat(1024)], 'test.png'); // 1KB
      
      const result = validateFileSize(file as File, 5 * 1024 * 1024); // 5MB limit
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects files exceeding size limit', () => {
      const file = new MockFile(['x'.repeat(10 * 1024 * 1024)], 'test.png'); // 10MB
      
      const result = validateFileSize(file as File, 5 * 1024 * 1024); // 5MB limit
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File size 10 MB exceeds maximum allowed size 5 MB');
    });

    test('rejects empty files', () => {
      const file = new MockFile([], 'test.png'); // Empty file
      
      const result = validateFileSize(file as File, 5 * 1024 * 1024);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File is empty');
    });

    test('warns about large files near limit', () => {
      const file = new MockFile(['x'.repeat(Math.floor(4.5 * 1024 * 1024))], 'test.png'); // 4.5MB
      
      const result = validateFileSize(file as File, 5 * 1024 * 1024); // 5MB limit
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('File size 4.5 MB is quite large');
    });
  });

  describe('validateImageFile', () => {
    test('validates image dimensions within limits', async () => {
      const file = new MockFile([], 'test.png', { type: 'image/png' });
      const options: ValidationOptions = {
        minDimensions: { width: 50, height: 50 },
        maxDimensions: { width: 200, height: 200 }
      };

      // Mock Image load success
      const mockImage = {
        width: 100,
        height: 100,
        onload: null,
        onerror: null,
        src: ''
      };
      
      (global.Image as jest.Mock).mockImplementation(() => mockImage);

      const promise = validateImageFile(file as File, options);
      
      // Simulate image load
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload();
      }, 0);

      const result = await promise;
      
      expect(result.isValid).toBe(true);
      expect(result.metadata?.dimensions).toEqual({ width: 100, height: 100 });
    });

    test('rejects images below minimum dimensions', async () => {
      const file = new MockFile([], 'test.png', { type: 'image/png' });
      const options: ValidationOptions = {
        minDimensions: { width: 100, height: 100 }
      };

      const mockImage = {
        width: 50,
        height: 50,
        onload: null,
        onerror: null,
        src: ''
      };
      
      (global.Image as jest.Mock).mockImplementation(() => mockImage);

      const promise = validateImageFile(file as File, options);
      
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload();
      }, 0);

      const result = await promise;
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Image dimensions 50x50 are below minimum required 100x100');
    });

    test('rejects images above maximum dimensions', async () => {
      const file = new MockFile([], 'test.png', { type: 'image/png' });
      const options: ValidationOptions = {
        maxDimensions: { width: 100, height: 100 }
      };

      const mockImage = {
        width: 200,
        height: 200,
        onload: null,
        onerror: null,
        src: ''
      };
      
      (global.Image as jest.Mock).mockImplementation(() => mockImage);

      const promise = validateImageFile(file as File, options);
      
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload();
      }, 0);

      const result = await promise;
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Image dimensions 200x200 exceed maximum allowed 100x100');
    });

    test('warns about extreme aspect ratios', async () => {
      const file = new MockFile([], 'test.png', { type: 'image/png' });
      const options: ValidationOptions = {};

      const mockImage = {
        width: 1000,
        height: 50, // 20:1 aspect ratio
        onload: null,
        onerror: null,
        src: ''
      };
      
      (global.Image as jest.Mock).mockImplementation(() => mockImage);

      const promise = validateImageFile(file as File, options);
      
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload();
      }, 0);

      const result = await promise;
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Unusual aspect ratio 20.00:1 - consider a more balanced ratio');
    });

    test('handles corrupted images', async () => {
      const file = new MockFile([], 'test.png', { type: 'image/png' });
      const options: ValidationOptions = {};

      const mockImage = {
        onload: null,
        onerror: null,
        src: ''
      };
      
      (global.Image as jest.Mock).mockImplementation(() => mockImage);

      const promise = validateImageFile(file as File, options);
      
      setTimeout(() => {
        if (mockImage.onerror) mockImage.onerror();
      }, 0);

      const result = await promise;
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unable to load image - file may be corrupted or invalid');
    });
  });

  describe('validateSVGFile', () => {
    const validSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40"/></svg>';
    const invalidSVG = '<invalid>Not an SVG</invalid>';
    const scriptSVG = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert("xss")</script></svg>';

    // Mock FileReader
    const mockFileReader = {
      readAsText: jest.fn(),
      result: '',
      onload: null,
      onerror: null
    };

    beforeEach(() => {
      global.FileReader = jest.fn(() => mockFileReader) as any;
      global.DOMParser = jest.fn(() => ({
        parseFromString: jest.fn()
      })) as any;
    });

    test('validates correct SVG files', async () => {
      const file = new MockFile([validSVG], 'test.svg', { type: 'image/svg+xml' });
      const options: ValidationOptions = {};

      const mockDoc = {
        documentElement: {
          tagName: 'svg',
          getAttribute: (attr: string) => {
            if (attr === 'width') return '100';
            if (attr === 'height') return '100';
            return null;
          }
        },
        querySelector: () => null,
        querySelectorAll: () => []
      };

      (global.DOMParser as jest.Mock).mockImplementation(() => ({
        parseFromString: () => mockDoc
      }));

      const promise = validateSVGFile(file as File, options);
      
      setTimeout(() => {
        mockFileReader.result = validSVG;
        if (mockFileReader.onload) mockFileReader.onload();
      }, 0);

      const result = await promise;
      
      expect(result.isValid).toBe(true);
      expect(result.metadata?.dimensions).toEqual({ width: 100, height: 100 });
    });

    test('rejects invalid XML', async () => {
      const file = new MockFile([invalidSVG], 'test.svg', { type: 'image/svg+xml' });
      const options: ValidationOptions = {};

      const mockDoc = {
        querySelector: () => ({ tagName: 'parsererror' })
      };

      (global.DOMParser as jest.Mock).mockImplementation(() => ({
        parseFromString: () => mockDoc
      }));

      const promise = validateSVGFile(file as File, options);
      
      setTimeout(() => {
        mockFileReader.result = invalidSVG;
        if (mockFileReader.onload) mockFileReader.onload();
      }, 0);

      const result = await promise;
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('SVG file contains invalid XML syntax');
    });

    test('detects security risks in SVG', async () => {
      const file = new MockFile([scriptSVG], 'test.svg', { type: 'image/svg+xml' });
      const options: ValidationOptions = {};

      const mockDoc = {
        documentElement: {
          tagName: 'svg',
          getAttribute: () => null
        },
        querySelector: () => null,
        querySelectorAll: (selector: string) => {
          if (selector === 'script') return [{}]; // Mock script element found
          return [];
        }
      };

      (global.DOMParser as jest.Mock).mockImplementation(() => ({
        parseFromString: () => mockDoc
      }));

      const promise = validateSVGFile(file as File, options);
      
      setTimeout(() => {
        mockFileReader.result = scriptSVG;
        if (mockFileReader.onload) mockFileReader.onload();
      }, 0);

      const result = await promise;
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('SVG contains script tags - potential security risk');
    });

    test('handles file read errors', async () => {
      const file = new MockFile([], 'test.svg', { type: 'image/svg+xml' });
      const options: ValidationOptions = {};

      const promise = validateSVGFile(file as File, options);
      
      setTimeout(() => {
        if (mockFileReader.onerror) mockFileReader.onerror();
      }, 0);

      const result = await promise;
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Failed to read file content');
    });
  });

  describe('validateFile', () => {
    test('performs comprehensive validation for logo files', async () => {
      const file = new MockFile([], 'test.png', { 
        type: 'image/png',
        lastModified: 1024 * 1024 // 1MB
      });

      const result = await validateFile(file as File, DEFAULT_LOGO_VALIDATION);
      
      expect(result.isValid).toBe(true);
      expect(result.metadata?.fileSize).toBe(1024 * 1024);
      expect(result.metadata?.mimeType).toBe('image/png');
    });

    test('performs comprehensive validation for SVG files', async () => {
      const validSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>';
      const file = new MockFile([validSVG], 'test.svg', { 
        type: 'image/svg+xml',
        lastModified: 1024 // 1KB
      });

      // Mock FileReader and DOMParser for SVG validation
      const mockFileReader = {
        readAsText: jest.fn(),
        result: validSVG,
        onload: null,
        onerror: null
      };

      global.FileReader = jest.fn(() => mockFileReader) as any;

      const mockDoc = {
        documentElement: {
          tagName: 'svg',
          getAttribute: (attr: string) => {
            if (attr === 'width') return '100';
            if (attr === 'height') return '100';
            return null;
          }
        },
        querySelector: () => null,
        querySelectorAll: () => []
      };

      global.DOMParser = jest.fn(() => ({
        parseFromString: () => mockDoc
      })) as any;

      const promise = validateFile(file as File, DEFAULT_SVG_VALIDATION);
      
      // Simulate file reader success
      setTimeout(() => {
        if (mockFileReader.onload) mockFileReader.onload();
      }, 0);

      const result = await promise;
      
      expect(result.isValid).toBe(true);
      expect(result.metadata?.fileSize).toBe(1024);
      expect(result.metadata?.mimeType).toBe('image/svg+xml');
    });

    test('combines multiple validation results', async () => {
      const file = new MockFile([], 'test.exe', { 
        type: 'application/octet-stream',
        lastModified: 20 * 1024 * 1024 // 20MB - exceeds default limit
      });

      const result = await validateFile(file as File, DEFAULT_LOGO_VALIDATION);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1); // Should have both file type and size errors
    });
  });

  describe('Default validation options', () => {
    test('DEFAULT_LOGO_VALIDATION has correct settings', () => {
      expect(DEFAULT_LOGO_VALIDATION.maxFileSize).toBe(10 * 1024 * 1024); // 10MB
      expect(DEFAULT_LOGO_VALIDATION.minDimensions).toEqual({ width: 32, height: 32 });
      expect(DEFAULT_LOGO_VALIDATION.maxDimensions).toEqual({ width: 4096, height: 4096 });
      expect(DEFAULT_LOGO_VALIDATION.allowedMimeTypes).toContain('image/png');
      expect(DEFAULT_LOGO_VALIDATION.allowedMimeTypes).toContain('image/jpeg');
      expect(DEFAULT_LOGO_VALIDATION.checkImageIntegrity).toBe(true);
    });

    test('DEFAULT_SVG_VALIDATION has correct settings', () => {
      expect(DEFAULT_SVG_VALIDATION.maxFileSize).toBe(1 * 1024 * 1024); // 1MB
      expect(DEFAULT_SVG_VALIDATION.minDimensions).toEqual({ width: 16, height: 16 });
      expect(DEFAULT_SVG_VALIDATION.maxDimensions).toEqual({ width: 1024, height: 1024 });
      expect(DEFAULT_SVG_VALIDATION.allowedMimeTypes).toEqual(['image/svg+xml']);
      expect(DEFAULT_SVG_VALIDATION.checkImageIntegrity).toBe(true);
    });
  });
}); 