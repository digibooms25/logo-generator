import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminDashboard from './AdminDashboard';
import { localStorageService } from '../services/local-storage';
import { LogoCategory, LogoStyle } from '../types/logo';

// Mock the local storage service
jest.mock('../services/local-storage', () => ({
  localStorageService: {
    getAllLogos: jest.fn(),
    getAllSVGIcons: jest.fn(),
    deleteLogo: jest.fn(),
    deleteSVGIcon: jest.fn(),
    updateLogo: jest.fn(),
    updateSVGIcon: jest.fn(),
  },
  storageHelpers: {
    formatFileSize: (bytes: number) => `${bytes} B`,
    formatDate: (date: Date) => date.toLocaleDateString(),
  },
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon" />,
  Grid: () => <div data-testid="grid-icon" />,
  List: () => <div data-testid="list-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Edit: () => <div data-testid="edit-icon" />,
  Download: () => <div data-testid="download-icon" />,
  FileImage: () => <div data-testid="file-image-icon" />,
  X: () => <div data-testid="x-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
}));

const mockLocalStorageService = localStorageService as jest.Mocked<typeof localStorageService>;

describe('AdminDashboard', () => {
  const mockLogos = [
    {
      id: 'logo-1',
      file: {
        name: 'tech-logo.png',
        size: 1024,
        type: 'image/png',
        lastModified: Date.now(),
      },
      dataUrl: 'data:image/png;base64,mock-data',
      uploadedAt: new Date('2024-01-15'),
      category: LogoCategory.TECHNOLOGY,
      style: LogoStyle.MODERN,
      keywords: ['tech', 'modern'],
      description: 'Technology company logo',
    },
    {
      id: 'logo-2',
      file: {
        name: 'health-logo.jpg',
        size: 2048,
        type: 'image/jpeg',
        lastModified: Date.now(),
      },
      dataUrl: 'data:image/jpeg;base64,mock-data',
      uploadedAt: new Date('2024-01-16'),
      category: LogoCategory.HEALTHCARE,
      style: LogoStyle.PROFESSIONAL,
      keywords: ['health', 'medical'],
      description: 'Healthcare organization logo',
    },
  ];

  const mockSVGIcons = [
    {
      id: 'icon-1',
      file: {
        name: 'user-icon.svg',
        size: 512,
        type: 'image/svg+xml',
        lastModified: Date.now(),
      },
      svgContent: '<svg><circle cx="12" cy="12" r="10"/></svg>',
      uploadedAt: new Date('2024-01-17'),
      category: 'ui',
      keywords: ['user', 'profile'],
      description: 'User profile icon',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorageService.getAllLogos.mockReturnValue(mockLogos);
    mockLocalStorageService.getAllSVGIcons.mockReturnValue(mockSVGIcons);
  });

  it('renders dashboard with correct title and description', () => {
    render(<AdminDashboard />);

    expect(screen.getByText('Content Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Manage your uploaded logos and SVG icons')).toBeInTheDocument();
  });

  it('loads and displays content counts', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('3 items total')).toBeInTheDocument();
    });

    expect(mockLocalStorageService.getAllLogos).toHaveBeenCalledTimes(1);
    expect(mockLocalStorageService.getAllSVGIcons).toHaveBeenCalledTimes(1);
  });

  it('shows implementation status when data is loaded', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard Implementation')).toBeInTheDocument();
    });

    expect(screen.getByText(/uploaded logos \(2\) and SVG icons \(1\)/)).toBeInTheDocument();
    expect(screen.getByText('Features being implemented:')).toBeInTheDocument();
    expect(screen.getByText('• Search and filtering capabilities')).toBeInTheDocument();
    expect(screen.getByText('• Grid and list view modes')).toBeInTheDocument();
    expect(screen.getByText('• Bulk selection and deletion')).toBeInTheDocument();
    expect(screen.getByText('• Edit metadata functionality')).toBeInTheDocument();
    expect(screen.getByText('• Download individual files')).toBeInTheDocument();
    expect(screen.getByText('• Category and style organization')).toBeInTheDocument();
  });

  it('handles empty state correctly', async () => {
    mockLocalStorageService.getAllLogos.mockReturnValue([]);
    mockLocalStorageService.getAllSVGIcons.mockReturnValue([]);

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('0 items total')).toBeInTheDocument();
    });

    expect(screen.getByText(/uploaded logos \(0\) and SVG icons \(0\)/)).toBeInTheDocument();
  });

  it('handles storage service errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockLocalStorageService.getAllLogos.mockImplementation(() => {
      throw new Error('Storage error');
    });
    mockLocalStorageService.getAllSVGIcons.mockImplementation(() => {
      throw new Error('Storage error');
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard Implementation')).toBeInTheDocument();
    });

    expect(consoleSpy).toHaveBeenCalledWith('Failed to load data:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('displays file image icon in the implementation status', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('file-image-icon')).toBeInTheDocument();
    });
  });

  it('shows proper component structure', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard Implementation')).toBeInTheDocument();
    });

    // Check that main elements are present
    expect(screen.getByText('Content Dashboard')).toBeInTheDocument();
    expect(screen.getByText('3 items total')).toBeInTheDocument();
    expect(screen.getByTestId('file-image-icon')).toBeInTheDocument();
  });

  it('renders within proper layout structure', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard Implementation')).toBeInTheDocument();
    });

    // Check for proper title styling
    const title = screen.getByText('Content Dashboard');
    expect(title).toHaveClass('text-2xl');
    expect(title).toHaveClass('font-bold');
    expect(title).toHaveClass('text-gray-900');
  });

  it('displays correct feature list formatting', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Features being implemented:')).toBeInTheDocument();
    });

    // Check that all features are listed with bullet points
    const features = [
      '• Search and filtering capabilities',
      '• Grid and list view modes',
      '• Bulk selection and deletion',
      '• Edit metadata functionality',
      '• Download individual files',
      '• Category and style organization'
    ];

    features.forEach(feature => {
      expect(screen.getByText(feature)).toBeInTheDocument();
    });
  });

  it('uses consistent styling classes', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard Implementation')).toBeInTheDocument();
    });

    // Check title styling
    const title = screen.getByText('Content Dashboard');
    expect(title).toHaveClass('text-2xl');
    expect(title).toHaveClass('font-bold');
    expect(title).toHaveClass('text-gray-900');

    // Check subtitle styling
    const subtitle = screen.getByText('Manage your uploaded logos and SVG icons');
    expect(subtitle).toHaveClass('text-gray-600');
    expect(subtitle).toHaveClass('mt-1');
  });
}); 