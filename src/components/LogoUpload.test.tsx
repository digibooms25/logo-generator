import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LogoUpload from './LogoUpload';
import { LogoCategory, LogoStyle } from '../types/logo';

// Mock the local storage service
jest.mock('../services/local-storage', () => ({
  LocalStorageService: {
    getInstance: jest.fn(() => ({
      saveLogo: jest.fn(),
    })),
  },
}));

// Mock the utils - this was missing!
jest.mock('../utils', () => ({
  validateFile: jest.fn().mockResolvedValue({
    isValid: true,
    errors: [],
    warnings: [],
    metadata: {
      dimensions: { width: 100, height: 100 },
      fileSize: 1024,
      mimeType: 'image/png',
    },
  }),
  formatFileSize: jest.fn((size) => {
    if (size < 1024) return `${size} Bytes`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
    return `${(size / (1024 * 1024)).toFixed(1)}MB`;
  }),
  sanitizeFilename: jest.fn((name) => name.replace(/[^a-zA-Z0-9.-]/g, '_')),
  DEFAULT_LOGO_VALIDATION: {
    maxFileSize: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg'],
    checkImageIntegrity: true,
  },
}));

// Mock data
const mockStoredLogo = {
  id: '1',
  file: {
    name: 'test.png',
    size: 1024,
    type: 'image/png',
    lastModified: Date.now()
  },
  dataUrl: 'data:image/png;base64,test',
  uploadedAt: new Date(),
  category: LogoCategory.TECHNOLOGY,
  style: LogoStyle.MODERN,
  keywords: ['test'],
  description: 'Test logo'
};

// Create a proper MockFile class for testing
class MockFile extends File {
  constructor(parts: BlobPart[], filename: string, properties?: FilePropertyBag & { type?: string }) {
    // Create a proper File object
    super(parts, filename, {
      type: properties?.type || 'image/png',
      lastModified: properties?.lastModified || Date.now()
    });
    
    // Override size for special cases
    if (properties?.type === 'large') {
      Object.defineProperty(this, 'size', { value: 6 * 1024 * 1024 });
    }
  }
}

// Mock URL.createObjectURL
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: jest.fn(() => 'mocked-url'),
    revokeObjectURL: jest.fn(),
  },
});

// Mock confirm for bulk operations
Object.defineProperty(window, 'confirm', {
  value: jest.fn(() => true),
});

// Get the mocked instance
const { LocalStorageService } = require('../services/local-storage');
const mockStorageService = LocalStorageService.getInstance();

// Helper function to create proper FileList for testing
function createFileList(files: File[]): FileList {
  const fileList = Object.assign(files, {
    item: (index: number) => files[index] || null,
  });
  
  return fileList as unknown as FileList;
}

describe('LogoUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageService.saveLogo.mockResolvedValue(mockStoredLogo);
  });

  test('renders upload dropzone', () => {
    render(<LogoUpload />);
    expect(screen.getByText('Upload Logo Files')).toBeInTheDocument();
    expect(screen.getByText('Drag & drop multiple logo files or click to browse')).toBeInTheDocument();
  });

  test('displays file format information', () => {
    render(<LogoUpload />);
    expect(screen.getByText(/Supports:/)).toBeInTheDocument();
    expect(screen.getByText(/Max size:/)).toBeInTheDocument();
    expect(screen.getByText(/Max files: 10 • Select multiple files for bulk upload/)).toBeInTheDocument();
  });

  test('accepts custom props', () => {
    render(<LogoUpload maxFiles={5} maxSize={2 * 1024 * 1024} />);
    expect(screen.getByText(/Max files: 5/)).toBeInTheDocument();
    expect(screen.getByText(/Max size: 2.0MB/)).toBeInTheDocument();
  });

  test('shows accepted file formats', () => {
    render(<LogoUpload acceptedFormats={['image/png', 'image/jpeg']} />);
    expect(screen.getByText(/Supports: image\/png, image\/jpeg/)).toBeInTheDocument();
  });

  // INDIVIDUAL FILE TESTS
  test('handles single file upload', async () => {
    const mockFile = new MockFile(['test'], 'logo.png', { type: 'image/png' });
    render(<LogoUpload />);
    
    const dropzone = screen.getByText('Upload Logo Files').closest('div');
    fireEvent.drop(dropzone!, {
      dataTransfer: { 
        files: createFileList([mockFile]),
        types: ['Files']
      }
    });

    await waitFor(() => {
      expect(screen.getByText('logo.png')).toBeInTheDocument();
    });
  });

  test('displays metadata form for single file', async () => {
    const mockFile = new File(['test'], 'logo.png', { type: 'image/png' });
    render(<LogoUpload />);
    
    const dropzone = screen.getByText('Upload Logo Files').closest('div');
    fireEvent.drop(dropzone!, {
      dataTransfer: { files: [mockFile] }
    });

    await waitFor(() => {
      expect(screen.getByText('Add Logo Metadata')).toBeInTheDocument();
    });
  });

  test('saves metadata for individual file', async () => {
    const mockFile = new File(['test'], 'logo.png', { type: 'image/png' });
    render(<LogoUpload />);
    
    const dropzone = screen.getByText('Upload Logo Files').closest('div');
    fireEvent.drop(dropzone!, {
      dataTransfer: { files: [mockFile] }
    });

    await waitFor(() => {
      expect(screen.getByText('Add Logo Metadata')).toBeInTheDocument();
    });

    // Fill metadata form
    fireEvent.change(screen.getByLabelText('Category'), {
      target: { value: 'TECHNOLOGY' }
    });
    fireEvent.change(screen.getByLabelText('Keywords'), {
      target: { value: 'test, logo' }
    });

    fireEvent.click(screen.getByText('Save Metadata'));

    await waitFor(() => {
      expect(screen.getByText('TECHNOLOGY')).toBeInTheDocument();
    });
  });

  // BULK UPLOAD TESTS
  test('handles multiple file drop and shows bulk actions', async () => {
    const mockFiles = [
      new MockFile(['test1'], 'logo1.png', { type: 'image/png' }),
      new MockFile(['test2'], 'logo2.png', { type: 'image/png' }),
      new MockFile(['test3'], 'logo3.png', { type: 'image/png' })
    ];
    
    render(<LogoUpload />);
    
    const dropzone = screen.getByText('Upload Logo Files').closest('div');
    fireEvent.drop(dropzone!, {
      dataTransfer: { 
        files: createFileList(mockFiles),
        types: ['Files']
      }
    });

    await waitFor(() => {
      expect(screen.getByText('logo1.png')).toBeInTheDocument();
      expect(screen.getByText('logo2.png')).toBeInTheDocument();
      expect(screen.getByText('logo3.png')).toBeInTheDocument();
    });

    // Should show bulk actions
    expect(screen.getByText('Select All Pending')).toBeInTheDocument();
    expect(screen.getByText('Deselect All')).toBeInTheDocument();
  });

  test('bulk file selection functionality', async () => {
    const mockFiles = [
      new File(['test1'], 'logo1.png', { type: 'image/png' }),
      new File(['test2'], 'logo2.png', { type: 'image/png' })
    ];
    
    render(<LogoUpload />);
    
    const dropzone = screen.getByText('Upload Logo Files').closest('div');
    fireEvent.drop(dropzone!, {
      dataTransfer: { files: mockFiles }
    });

    await waitFor(() => {
      expect(screen.getByText('logo1.png')).toBeInTheDocument();
    });

    // Select individual files
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);

    fireEvent.click(checkboxes[0]);
    await waitFor(() => {
      expect(screen.getByText('1 file selected')).toBeInTheDocument();
    });

    fireEvent.click(checkboxes[1]);
    await waitFor(() => {
      expect(screen.getByText('2 files selected')).toBeInTheDocument();
    });
  });

  test('select all and deselect all functionality', async () => {
    const mockFiles = [
      new File(['test1'], 'logo1.png', { type: 'image/png' }),
      new File(['test2'], 'logo2.png', { type: 'image/png' })
    ];
    
    render(<LogoUpload />);
    
    const dropzone = screen.getByText('Upload Logo Files').closest('div');
    fireEvent.drop(dropzone!, {
      dataTransfer: { files: mockFiles }
    });

    await waitFor(() => {
      expect(screen.getByText('logo1.png')).toBeInTheDocument();
    });

    // Select all pending files
    fireEvent.click(screen.getByText('Select All Pending'));
    await waitFor(() => {
      expect(screen.getByText('2 files selected')).toBeInTheDocument();
    });

    // Deselect all
    fireEvent.click(screen.getByText('Deselect All'));
    await waitFor(() => {
      expect(screen.queryByText('2 files selected')).not.toBeInTheDocument();
    });
  });

  test('bulk metadata form functionality', async () => {
    const mockFiles = [
      new File(['test1'], 'logo1.png', { type: 'image/png' }),
      new File(['test2'], 'logo2.png', { type: 'image/png' })
    ];
    
    render(<LogoUpload />);
    
    const dropzone = screen.getByText('Upload Logo Files').closest('div');
    fireEvent.drop(dropzone!, {
      dataTransfer: { files: mockFiles }
    });

    await waitFor(() => {
      expect(screen.getByText('logo1.png')).toBeInTheDocument();
    });

    // Select files manually
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    await waitFor(() => {
      expect(screen.getByText('2 files selected')).toBeInTheDocument();
    });

    // Open bulk metadata form
    fireEvent.click(screen.getByText('Add Bulk Metadata'));

    await waitFor(() => {
      expect(screen.getByText('Add Bulk Metadata (2 files)')).toBeInTheDocument();
    });

    // Fill out bulk metadata form
    fireEvent.change(screen.getByLabelText('Category'), {
      target: { value: 'TECHNOLOGY' }
    });
    fireEvent.change(screen.getByLabelText('Keywords'), {
      target: { value: 'bulk, test, logos' }
    });

    // Apply metadata
    fireEvent.click(screen.getByText('Apply to 2 Files'));

    await waitFor(() => {
      expect(screen.queryByText('Add Bulk Metadata (2 files)')).not.toBeInTheDocument();
    });

    // Check that metadata was applied
    expect(screen.getAllByText('TECHNOLOGY')).toHaveLength(2);
  });

  test('bulk operations - approve selected', async () => {
    const mockFiles = [
      new File(['test1'], 'logo1.png', { type: 'image/png' }),
      new File(['test2'], 'logo2.png', { type: 'image/png' })
    ];
    
    render(<LogoUpload />);
    
    const dropzone = screen.getByText('Upload Logo Files').closest('div');
    fireEvent.drop(dropzone!, {
      dataTransfer: { files: mockFiles }
    });

    await waitFor(() => {
      expect(screen.getByText('logo1.png')).toBeInTheDocument();
    });

    // Select files
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    // Approve selected files
    fireEvent.click(screen.getByText('Approve Selected'));

    await waitFor(() => {
      expect(screen.getAllByText('Ready')).toHaveLength(2);
    });
  });

  test('bulk operations - remove selected', async () => {
    const mockFiles = [
      new MockFile(['test1'], 'logo1.png', { type: 'image/png' }),
      new MockFile(['test2'], 'logo2.png', { type: 'image/png' }),
      new MockFile(['test3'], 'logo3.png', { type: 'image/png' })
    ];
    
    render(<LogoUpload />);
    
    const dropzone = screen.getByText('Upload Logo Files').closest('div');
    fireEvent.drop(dropzone!, {
      dataTransfer: { 
        files: createFileList(mockFiles),
        types: ['Files']
      }
    });

    await waitFor(() => {
      expect(screen.getByText('logo1.png')).toBeInTheDocument();
      expect(screen.getByText('logo2.png')).toBeInTheDocument();
      expect(screen.getByText('logo3.png')).toBeInTheDocument();
    });

    // Select first two files
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    // Remove selected files
    fireEvent.click(screen.getByText('Remove Selected'));

    await waitFor(() => {
      expect(screen.queryByText('logo1.png')).not.toBeInTheDocument();
      expect(screen.queryByText('logo2.png')).not.toBeInTheDocument();
      expect(screen.getByText('logo3.png')).toBeInTheDocument();
    });
  });

  test('save to gallery counter updates correctly', async () => {
    const mockFiles = [
      new File(['test1'], 'logo1.png', { type: 'image/png' }),
      new File(['test2'], 'logo2.png', { type: 'image/png' })
    ];
    
    render(<LogoUpload />);
    
    const dropzone = screen.getByText('Upload Logo Files').closest('div');
    fireEvent.drop(dropzone!, {
      dataTransfer: { files: mockFiles }
    });

    await waitFor(() => {
      expect(screen.getByText('Save to Gallery (0)')).toBeInTheDocument();
    });

    // Approve files
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);
    fireEvent.click(screen.getByText('Approve Selected'));

    await waitFor(() => {
      expect(screen.getByText('Save to Gallery (2)')).toBeInTheDocument();
    });
  });

  test('batch processing with progress tracking', async () => {
    const mockFiles = Array.from({ length: 6 }, (_, i) => 
      new File(['test'], `logo${i}.png`, { type: 'image/png' })
    );
    
    const onFilesUploaded = jest.fn();
    render(<LogoUpload onFilesUploaded={onFilesUploaded} />);
    
    const dropzone = screen.getByText('Upload Logo Files').closest('div');
    fireEvent.drop(dropzone!, {
      dataTransfer: { files: mockFiles }
    });

    // Wait for files to appear
    await waitFor(() => {
      expect(screen.getByText('logo0.png')).toBeInTheDocument();
    });

    // Approve all files
    fireEvent.click(screen.getByText('Select All Pending'));
    fireEvent.click(screen.getByText('Approve Selected'));

    // Save to gallery (will process in batches)
    fireEvent.click(screen.getByText(/Save to Gallery/));

    await waitFor(() => {
      expect(onFilesUploaded).toHaveBeenCalled();
    }, { timeout: 5000 });
  });

  test('handles file selection visual feedback', async () => {
    const mockFiles = [
      new File(['test1'], 'logo1.png', { type: 'image/png' }),
      new File(['test2'], 'logo2.png', { type: 'image/png' })
    ];
    
    render(<LogoUpload />);
    
    const dropzone = screen.getByText('Upload Logo Files').closest('div');
    fireEvent.drop(dropzone!, {
      dataTransfer: { files: mockFiles }
    });

    await waitFor(() => {
      expect(screen.getByText('logo1.png')).toBeInTheDocument();
    });

    // Check that file cards have normal styling initially
    const fileCards = screen.getAllByText('logo1.png')[0].closest('div');
    expect(fileCards).toHaveClass('border-gray-200');

    // Select file and check visual feedback
    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);

    await waitFor(() => {
      const selectedCard = screen.getAllByText('logo1.png')[0].closest('div');
      expect(selectedCard).toHaveClass('border-blue-300', 'bg-blue-50');
    });
  });

  test('bulk metadata form validation', async () => {
    const mockFiles = [
      new File(['test1'], 'logo1.png', { type: 'image/png' }),
      new File(['test2'], 'logo2.png', { type: 'image/png' })
    ];
    
    render(<LogoUpload />);
    
    const dropzone = screen.getByText('Upload Logo Files').closest('div');
    fireEvent.drop(dropzone!, {
      dataTransfer: { files: mockFiles }
    });

    await waitFor(() => {
      expect(screen.getByText('logo1.png')).toBeInTheDocument();
    });

    // Select files
    fireEvent.click(screen.getByText('Select All Pending'));
    fireEvent.click(screen.getByText('Add Bulk Metadata'));

    await waitFor(() => {
      expect(screen.getByText('Add Bulk Metadata (2 files)')).toBeInTheDocument();
    });

    // Check warning message
    expect(screen.getByText(/This metadata will be applied to all 2 selected files/)).toBeInTheDocument();

    // Test form fields
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Style')).toBeInTheDocument();
    expect(screen.getByLabelText('Keywords')).toBeInTheDocument();
    expect(screen.getByLabelText('Description Template')).toBeInTheDocument();

    // Cancel should close form
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.queryByText('Add Bulk Metadata (2 files)')).not.toBeInTheDocument();
    });
  });

  test('enforces maximum file limit', async () => {
    const mockFiles = Array.from({ length: 12 }, (_, i) => 
      new File(['test'], `logo${i}.png`, { type: 'image/png' })
    );
    
    // Mock alert
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<LogoUpload maxFiles={10} />);
    
    const dropzone = screen.getByText('Upload Logo Files').closest('div');
    fireEvent.drop(dropzone!, {
      dataTransfer: { files: mockFiles }
    });

    expect(alertSpy).toHaveBeenCalledWith('Maximum 10 files allowed. Please remove some files first.');
    
    alertSpy.mockRestore();
  });

  test('calls onFilesUploaded callback', async () => {
    const onFilesUploaded = jest.fn();
    const mockFile = new File(['test'], 'logo.png', { type: 'image/png' });
    
    render(<LogoUpload onFilesUploaded={onFilesUploaded} />);
    
    const dropzone = screen.getByText('Upload Logo Files').closest('div');
    fireEvent.drop(dropzone!, {
      dataTransfer: { files: [mockFile] }
    });

    await waitFor(() => {
      expect(screen.getByText('Add Logo Metadata')).toBeInTheDocument();
    });

    // Save metadata and then save to gallery
    fireEvent.click(screen.getByText('Save Metadata'));
    
    await waitFor(() => {
      fireEvent.click(screen.getByText(/Save to Gallery/));
    });

    await waitFor(() => {
      expect(onFilesUploaded).toHaveBeenCalled();
    });
  });
}); 