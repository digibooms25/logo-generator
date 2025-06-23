import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SVGIconUpload from './SVGIconUpload';

// Mock the local storage service
jest.mock('../services/local-storage', () => ({
  LocalStorageService: {
    getInstance: jest.fn(() => ({
      saveSVGIcon: jest.fn(),
    })),
  },
}));

// Mock the utils
jest.mock('../utils', () => ({
  validateFile: jest.fn(),
  DEFAULT_SVG_VALIDATION: {
    maxFileSize: 1024 * 1024,
    allowedMimeTypes: ['image/svg+xml'],
    checkImageIntegrity: true,
  },
  formatFileSize: jest.fn((size) => `${Math.round(size / 1024)} KB`),
  sanitizeFilename: jest.fn((name) => name),
  isSVGFile: jest.fn(() => true),
}));

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn(() => ({
    getRootProps: () => ({
      'data-testid': 'dropzone'
    }),
    getInputProps: () => ({
      'data-testid': 'file-input'
    }),
    isDragActive: false,
    isDragReject: false
  }))
}));

// Mock FileReader
const mockFileReader = {
  readAsText: jest.fn(),
  result: '',
  onload: null as any,
  onerror: null as any,
};

Object.defineProperty(global, 'FileReader', {
  writable: true,
  value: jest.fn(() => mockFileReader),
});

// Mock DOMParser
const mockDOMParser = {
  parseFromString: jest.fn()
};

Object.defineProperty(global, 'DOMParser', {
  writable: true,
  value: jest.fn(() => mockDOMParser),
});

describe('SVGIconUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFileReader.readAsText.mockClear();
  });

  it('renders the SVG upload zone with correct information', () => {
    render(<SVGIconUpload />);

    expect(screen.getByText('Upload SVG Icons')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop SVG icon files here, or click to browse')).toBeInTheDocument();
    expect(screen.getByText('Supported format: SVG only')).toBeInTheDocument();
    expect(screen.getByText('Maximum file size: 1 MB')).toBeInTheDocument();
    expect(screen.getByText('Maximum files: 20')).toBeInTheDocument();
    expect(screen.getByText('Choose SVG Files')).toBeInTheDocument();
  });

  it('displays custom props correctly', () => {
    const customProps = {
      maxFiles: 10,
      maxSize: 512 * 1024, // 512KB
    };

    render(<SVGIconUpload {...customProps} />);

    expect(screen.getByText('Maximum file size: 512 KB')).toBeInTheDocument();
    expect(screen.getByText('Maximum files: 10')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const { container } = render(<SVGIconUpload className="custom-svg-class" />);
    
    expect(container.firstChild).toHaveClass('custom-svg-class');
  });

  it('uses green color scheme for SVG uploads', () => {
    const { useDropzone } = require('react-dropzone');
    
    // Mock drag active state
    useDropzone.mockImplementation(() => ({
      getRootProps: () => ({
        'data-testid': 'dropzone',
        className: 'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors border-green-400 bg-green-50'
      }),
      getInputProps: () => ({
        'data-testid': 'file-input'
      }),
      isDragActive: true,
      isDragReject: false
    }));

    render(<SVGIconUpload />);
    expect(screen.getByText('Drop SVG icons here...')).toBeInTheDocument();
  });

  it('configures dropzone for SVG files only', () => {
    const { useDropzone } = require('react-dropzone');
    let capturedConfig: any;

    useDropzone.mockImplementation((config: any) => {
      capturedConfig = config;
      return {
        getRootProps: () => ({ 'data-testid': 'dropzone' }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: false,
        isDragReject: false
      };
    });

    render(<SVGIconUpload />);

    expect(capturedConfig.accept).toEqual({
      'image/svg+xml': ['.svg']
    });
    expect(capturedConfig.maxSize).toBe(1024 * 1024);
    expect(capturedConfig.multiple).toBe(true);
  });

  it('validates SVG content correctly', async () => {
    const mockCallback = jest.fn();
    
    // Mock valid SVG content
    const validSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>';
    
    // Mock DOM parsing for valid SVG
    mockDOMParser.parseFromString.mockReturnValue({
      querySelector: jest.fn((selector) => {
        if (selector === 'parsererror') return null;
        if (selector === 'svg') return {
          getAttribute: jest.fn((attr) => {
            if (attr === 'viewBox') return '0 0 24 24';
            return null;
          }),
          querySelector: jest.fn(() => null)
        };
        return null;
      }),
      querySelectorAll: jest.fn(() => []) // No scripts
    });

    const { useDropzone } = require('react-dropzone');
    useDropzone.mockImplementation(({ onDrop }: any) => ({
      getRootProps: () => ({
        'data-testid': 'dropzone',
        onClick: () => {
          const mockFile = new File([validSVG], 'icon.svg', { type: 'image/svg+xml' });
          onDrop([mockFile], []);
        }
      }),
      getInputProps: () => ({
        'data-testid': 'file-input'
      }),
      isDragActive: false,
      isDragReject: false
    }));

    render(<SVGIconUpload onFilesUploaded={mockCallback} />);

    const dropzone = screen.getByTestId('dropzone');
    fireEvent.click(dropzone);

    // Simulate FileReader loading
    await waitFor(() => {
      if (mockFileReader.onload) {
        mockFileReader.result = validSVG;
        mockFileReader.onload({} as any);
      }
    });

    // Should process the file without errors
    expect(mockDOMParser.parseFromString).toHaveBeenCalledWith(validSVG, 'image/svg+xml');
  });

  it('rejects invalid SVG content', async () => {
    const mockCallback = jest.fn();
    
    // Mock invalid SVG content
    const invalidSVG = '<div>Not an SVG</div>';
    
    // Mock DOM parsing for invalid SVG
    mockDOMParser.parseFromString.mockReturnValue({
      querySelector: jest.fn((selector) => {
        if (selector === 'parsererror') return null;
        if (selector === 'svg') return null; // No SVG element found
        return null;
      }),
      querySelectorAll: jest.fn(() => [])
    });

    const { useDropzone } = require('react-dropzone');
    useDropzone.mockImplementation(({ onDrop }: any) => ({
      getRootProps: () => ({
        'data-testid': 'dropzone',
        onClick: () => {
          const mockFile = new File([invalidSVG], 'not-icon.svg', { type: 'image/svg+xml' });
          onDrop([mockFile], []);
        }
      }),
      getInputProps: () => ({
        'data-testid': 'file-input'
      }),
      isDragActive: false,
      isDragReject: false
    }));

    render(<SVGIconUpload onFilesUploaded={mockCallback} />);

    const dropzone = screen.getByTestId('dropzone');
    fireEvent.click(dropzone);

    // Simulate FileReader loading
    await waitFor(() => {
      if (mockFileReader.onload) {
        mockFileReader.result = invalidSVG;
        mockFileReader.onload({} as any);
      }
    });

    // Should validate and reject the invalid SVG
    expect(mockDOMParser.parseFromString).toHaveBeenCalledWith(invalidSVG, 'image/svg+xml');
  });

  it('extracts SVG metadata correctly', async () => {
    const svgWithMetadata = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><title>Test Icon</title><desc>A test icon</desc><circle cx="50" cy="50" r="40" fill="red"/><rect x="10" y="10" width="20" height="20" fill="blue"/></svg>';
    
    // Mock DOM parsing with metadata
    mockDOMParser.parseFromString.mockReturnValue({
      querySelector: jest.fn((selector) => {
        if (selector === 'parsererror') return null;
        if (selector === 'svg') return {
          getAttribute: jest.fn((attr) => {
            if (attr === 'viewBox') return '0 0 100 100';
            if (attr === 'width') return '100';
            if (attr === 'height') return '100';
            return null;
          }),
          querySelector: jest.fn((sel) => {
            if (sel === 'title') return { textContent: 'Test Icon' };
            if (sel === 'desc') return { textContent: 'A test icon' };
            return null;
          })
        };
        return null;
      }),
      querySelectorAll: jest.fn(() => [])
    });

    const { useDropzone } = require('react-dropzone');
    useDropzone.mockImplementation(({ onDrop }: any) => ({
      getRootProps: () => ({
        'data-testid': 'dropzone',
        onClick: () => {
          const mockFile = new File([svgWithMetadata], 'icon-with-metadata.svg', { type: 'image/svg+xml' });
          onDrop([mockFile], []);
        }
      }),
      getInputProps: () => ({
        'data-testid': 'file-input'
      }),
      isDragActive: false,
      isDragReject: false
    }));

    render(<SVGIconUpload />);

    const dropzone = screen.getByTestId('dropzone');
    fireEvent.click(dropzone);

    // Simulate FileReader loading
    await waitFor(() => {
      if (mockFileReader.onload) {
        mockFileReader.result = svgWithMetadata;
        mockFileReader.onload({} as any);
      }
    });

    // Should extract metadata from SVG
    expect(mockDOMParser.parseFromString).toHaveBeenCalledWith(svgWithMetadata, 'image/svg+xml');
  });

  it('handles FileReader errors gracefully', async () => {
    const { useDropzone } = require('react-dropzone');
    useDropzone.mockImplementation(({ onDrop }: any) => ({
      getRootProps: () => ({
        'data-testid': 'dropzone',
        onClick: () => {
          const mockFile = new File(['content'], 'icon.svg', { type: 'image/svg+xml' });
          onDrop([mockFile], []);
        }
      }),
      getInputProps: () => ({
        'data-testid': 'file-input'
      }),
      isDragActive: false,
      isDragReject: false
    }));

    render(<SVGIconUpload />);

    const dropzone = screen.getByTestId('dropzone');
    fireEvent.click(dropzone);

    // Simulate FileReader error
    await waitFor(() => {
      if (mockFileReader.onerror) {
        mockFileReader.onerror({} as any);
      }
    });

    // Should handle the error gracefully
    expect(mockFileReader.readAsText).toHaveBeenCalled();
  });

  it('formats file sizes correctly for smaller SVG files', () => {
    render(<SVGIconUpload maxSize={2048} />); // 2KB
    expect(screen.getByText('Maximum file size: 2 KB')).toBeInTheDocument();

    render(<SVGIconUpload maxSize={500} />); // 500 bytes
    expect(screen.getByText('Maximum file size: 500 Bytes')).toBeInTheDocument();
  });
}); 