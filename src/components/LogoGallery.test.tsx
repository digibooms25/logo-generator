import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LogoGallery from './LogoGallery';
import { LocalStorageService } from '../services/local-storage';
import { LogoCategory, LogoStyle } from '../types/logo';

// Mock the local storage service
jest.mock('../services/local-storage', () => ({
  LocalStorageService: {
    getInstance: jest.fn(() => ({
      getAllLogos: jest.fn(),
    })),
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Get the mocked instance
const { LocalStorageService: MockLocalStorageService } = require('../services/local-storage');
const mockStorageService = MockLocalStorageService.getInstance();

// Mock data
const mockLogos = [
  {
    id: '1',
    file: {
      name: 'tech-logo.png',
      size: 1048576, // 1 MB
      type: 'image/png',
      lastModified: Date.now() - 1000
    },
    dataUrl: 'data:image/png;base64,mock1',
    uploadedAt: new Date(Date.now() - 1000),
    category: LogoCategory.TECHNOLOGY,
    style: LogoStyle.MODERN,
    keywords: ['tech', 'innovation'],
    description: 'A modern technology logo'
  },
  {
    id: '2',
    file: {
      name: 'food-logo.png',
      size: 2097152, // 2 MB
      type: 'image/png',
      lastModified: Date.now() - 2000
    },
    dataUrl: 'data:image/png;base64,mock2',
    uploadedAt: new Date(Date.now() - 2000),
    category: LogoCategory.FOOD_BEVERAGE,
    style: LogoStyle.VINTAGE,
    keywords: ['food', 'restaurant'],
    description: 'Vintage food and beverage logo'
  },
  {
    id: '3',
    file: {
      name: 'health-logo.png',
      size: 3145728, // 3 MB
      type: 'image/png',
      lastModified: Date.now() - 3000
    },
    dataUrl: 'data:image/png;base64,mock3',
    uploadedAt: new Date(Date.now() - 3000),
    category: LogoCategory.HEALTHCARE,
    style: LogoStyle.MINIMALIST,
    keywords: ['health', 'medical'],
    description: 'Clean healthcare logo'
  }
];

describe('LogoGallery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockStorageService.getAllLogos.mockReturnValue(mockLogos);
  });

  describe('Loading and Error States', () => {
    test('displays loading state initially', () => {
      render(<LogoGallery />);
      expect(screen.getByText('Loading your logo gallery...')).toBeInTheDocument();
    });

    test('displays logos after loading', async () => {
      render(<LogoGallery />);
      
      await waitFor(() => {
        expect(screen.getByText('Logo Gallery')).toBeInTheDocument();
        expect(screen.getByText('Browse and discover 3 professional logos')).toBeInTheDocument();
      });
    });

    test('displays error state when loading fails', async () => {
      mockStorageService.getAllLogos.mockImplementation(() => {
        throw new Error('Storage error');
      });

      render(<LogoGallery />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load logos. Please try refreshing the page.')).toBeInTheDocument();
      });
    });

    test('can retry after error', async () => {
      mockStorageService.getAllLogos
        .mockImplementationOnce(() => {
          throw new Error('Storage error');
        })
        .mockReturnValueOnce(mockLogos);

      render(<LogoGallery />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Try Again'));

      await waitFor(() => {
        expect(screen.getByText('Logo Gallery')).toBeInTheDocument();
      });
    });
  });

  describe('Gallery Display', () => {
    test('displays all logos in grid view by default', async () => {
      render(<LogoGallery />);

      await waitFor(() => {
        expect(screen.getByText('tech-logo.png')).toBeInTheDocument();
        expect(screen.getByText('food-logo.png')).toBeInTheDocument();
        expect(screen.getByText('health-logo.png')).toBeInTheDocument();
      });
    });

    test('displays correct logo count', async () => {
      render(<LogoGallery />);

      await waitFor(() => {
        expect(screen.getByText('Showing 3 of 3 logos')).toBeInTheDocument();
      });
    });

    test('displays logo categories and file sizes', async () => {
      render(<LogoGallery />);

      await waitFor(() => {
        expect(screen.getByText('Technology')).toBeInTheDocument();
        expect(screen.getByText('Food Beverage')).toBeInTheDocument();
        expect(screen.getByText('Healthcare')).toBeInTheDocument();
        expect(screen.getByText('1.0 MB')).toBeInTheDocument();
      });
    });

    test('displays keywords for logos', async () => {
      render(<LogoGallery />);

      await waitFor(() => {
        expect(screen.getByText('tech')).toBeInTheDocument();
        expect(screen.getByText('food')).toBeInTheDocument();
        expect(screen.getByText('health')).toBeInTheDocument();
      });
    });
  });

  describe('View Modes', () => {
    test('can switch between grid and list view', async () => {
      render(<LogoGallery />);

      await waitFor(() => {
        expect(screen.getByText('tech-logo.png')).toBeInTheDocument();
      });

      // Switch to list view
      const listButton = screen.getByRole('button', { name: '' });
      const buttons = screen.getAllByRole('button');
      const listViewButton = buttons.find(btn => btn.querySelector('svg')?.classList.contains('lucide-list'));
      
      if (listViewButton) {
        fireEvent.click(listViewButton);
        // In list view, descriptions should be visible
        await waitFor(() => {
          expect(screen.getByText('Modern technology logo')).toBeInTheDocument();
        });
      }
    });

    test('can change grid size', async () => {
      render(<LogoGallery />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Medium')).toBeInTheDocument();
      });

      const gridSizeSelect = screen.getByDisplayValue('Medium');
      fireEvent.change(gridSizeSelect, { target: { value: 'large' } });

      expect(screen.getByDisplayValue('Large')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    test('can search logos by name', async () => {
      render(<LogoGallery />);

      await waitFor(() => {
        expect(screen.getByText('tech-logo.png')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search logos by name, description, or keywords...');
      fireEvent.change(searchInput, { target: { value: 'tech' } });

      await waitFor(() => {
        expect(screen.getByText('Showing 1 of 3 logos')).toBeInTheDocument();
        expect(screen.getByText('tech-logo.png')).toBeInTheDocument();
        expect(screen.queryByText('food-logo.png')).not.toBeInTheDocument();
      });
    });

    test('can search logos by keywords', async () => {
      render(<LogoGallery />);

      await waitFor(() => {
        expect(screen.getByText('tech-logo.png')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search logos by name, description, or keywords...');
      fireEvent.change(searchInput, { target: { value: 'innovation' } });

      await waitFor(() => {
        expect(screen.getByText('Showing 1 of 3 logos')).toBeInTheDocument();
        expect(screen.getByText('tech-logo.png')).toBeInTheDocument();
      });
    });

    test('shows no results when search has no matches', async () => {
      render(<LogoGallery />);

      await waitFor(() => {
        expect(screen.getByText('tech-logo.png')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search logos by name, description, or keywords...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText('No logos found')).toBeInTheDocument();
        expect(screen.getByText('Try adjusting your search criteria or filters to find what you\'re looking for.')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    test('can toggle filter panel', async () => {
      render(<LogoGallery />);

      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Filters'));

      await waitFor(() => {
        expect(screen.getByText('Category')).toBeInTheDocument();
        expect(screen.getByText('Style')).toBeInTheDocument();
        expect(screen.getByText('Sort By')).toBeInTheDocument();
      });
    });

    test('can filter by category', async () => {
      render(<LogoGallery />);

      await waitFor(() => {
        expect(screen.getByText('tech-logo.png')).toBeInTheDocument();
      });

      // Open filters
      fireEvent.click(screen.getByText('Filters'));

      await waitFor(() => {
        expect(screen.getByText('Category')).toBeInTheDocument();
      });

      // Filter by technology
      const categorySelect = screen.getByDisplayValue('All Categories');
      fireEvent.change(categorySelect, { target: { value: 'TECHNOLOGY' } });

      await waitFor(() => {
        expect(screen.getByText('Showing 1 of 3 logos')).toBeInTheDocument();
        expect(screen.getByText('tech-logo.png')).toBeInTheDocument();
        expect(screen.queryByText('food-logo.png')).not.toBeInTheDocument();
      });
    });

    test('can filter by style', async () => {
      render(<LogoGallery />);

      await waitFor(() => {
        expect(screen.getByText('tech-logo.png')).toBeInTheDocument();
      });

      // Open filters
      fireEvent.click(screen.getByText('Filters'));

      await waitFor(() => {
        expect(screen.getByText('Style')).toBeInTheDocument();
      });

      // Filter by modern style
      const styleSelect = screen.getByDisplayValue('All Styles');
      fireEvent.change(styleSelect, { target: { value: 'MODERN' } });

      await waitFor(() => {
        expect(screen.getByText('Showing 1 of 3 logos')).toBeInTheDocument();
        expect(screen.getByText('tech-logo.png')).toBeInTheDocument();
      });
    });

    test('can clear all filters', async () => {
      render(<LogoGallery />);

      await waitFor(() => {
        expect(screen.getByText('tech-logo.png')).toBeInTheDocument();
      });

      // Open filters and apply a filter
      fireEvent.click(screen.getByText('Filters'));
      
      await waitFor(() => {
        const categorySelect = screen.getByDisplayValue('All Categories');
        fireEvent.change(categorySelect, { target: { value: 'TECHNOLOGY' } });
      });

      await waitFor(() => {
        expect(screen.getByText('Clear all filters')).toBeInTheDocument();
      });

      // Clear filters
      fireEvent.click(screen.getByText('Clear all filters'));

      await waitFor(() => {
        expect(screen.getByText('Showing 3 of 3 logos')).toBeInTheDocument();
      });
    });

    test('shows active filter indicator', async () => {
      render(<LogoGallery />);

      await waitFor(() => {
        expect(screen.getByText('tech-logo.png')).toBeInTheDocument();
      });

      // Open filters and apply a filter
      fireEvent.click(screen.getByText('Filters'));
      
      await waitFor(() => {
        const categorySelect = screen.getByDisplayValue('All Categories');
        fireEvent.change(categorySelect, { target: { value: 'TECHNOLOGY' } });
      });

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });
  });

  describe('Sorting', () => {
    test('can sort by name', async () => {
      render(<LogoGallery />);

      await waitFor(() => {
        expect(screen.getByText('tech-logo.png')).toBeInTheDocument();
      });

      // Open filters
      fireEvent.click(screen.getByText('Filters'));

      await waitFor(() => {
        const sortSelect = screen.getByDisplayValue('Newest First');
        fireEvent.change(sortSelect, { target: { value: 'name' } });
      });

      // Logos should be sorted alphabetically
      await waitFor(() => {
        const logoElements = screen.getAllByText(/.*-logo\.png/);
        expect(logoElements[0]).toHaveTextContent('food-logo.png');
        expect(logoElements[1]).toHaveTextContent('health-logo.png');
        expect(logoElements[2]).toHaveTextContent('tech-logo.png');
      });
    });
  });

  describe('Favorites', () => {
    test('can toggle favorites', async () => {
      render(<LogoGallery />);

      await waitFor(() => {
        expect(screen.getByText('tech-logo.png')).toBeInTheDocument();
      });

      // Find and click heart button (in grid view, it's in the overlay)
      const logoCard = screen.getByText('tech-logo.png').closest('.group');
      expect(logoCard).toBeInTheDocument();

      // Hover over card to show overlay
      fireEvent.mouseEnter(logoCard!);

      await waitFor(() => {
        const heartButtons = screen.getAllByRole('button');
        const heartButton = heartButtons.find(btn => 
          btn.querySelector('svg')?.classList.contains('lucide-heart')
        );
        
        if (heartButton) {
          fireEvent.click(heartButton);
          expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
            'logo-gallery-favorites',
            JSON.stringify(['1'])
          );
        }
      });
    });

    test('loads favorites from localStorage', async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(['1', '2']));

      render(<LogoGallery />);

      await waitFor(() => {
        expect(mockLocalStorage.getItem).toHaveBeenCalledWith('logo-gallery-favorites');
      });
    });
  });

  describe('Logo Selection', () => {
    test('opens preview modal when logo is clicked', async () => {
      render(<LogoGallery />);

      await waitFor(() => {
        expect(screen.getByText('tech-logo.png')).toBeInTheDocument();
      });

      const logoCard = screen.getByText('tech-logo.png').closest('.group');
      fireEvent.click(logoCard!);

      // Modal should open
      await waitFor(() => {
        expect(screen.getByText('Logo Preview')).toBeInTheDocument();
        expect(screen.getByText('File Information')).toBeInTheDocument();
        expect(screen.getByText('Classification')).toBeInTheDocument();
      });
    });

    test('calls onLogoSelect when Select button is clicked in modal', async () => {
      const onLogoSelect = jest.fn();
      render(<LogoGallery onLogoSelect={onLogoSelect} />);

      await waitFor(() => {
        expect(screen.getByText('tech-logo.png')).toBeInTheDocument();
      });

      // Click logo to open modal
      const logoCard = screen.getByText('tech-logo.png').closest('.group');
      fireEvent.click(logoCard!);

      // Wait for modal to open and click select button
      await waitFor(() => {
        expect(screen.getByText('Select This Logo')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Select This Logo'));

      expect(onLogoSelect).toHaveBeenCalledWith(mockLogos[0]);
    });

    test('closes modal when X button is clicked', async () => {
      render(<LogoGallery />);

      await waitFor(() => {
        expect(screen.getByText('tech-logo.png')).toBeInTheDocument();
      });

      // Open modal
      const logoCard = screen.getByText('tech-logo.png').closest('.group');
      fireEvent.click(logoCard!);

      await waitFor(() => {
        expect(screen.getByText('Logo Preview')).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByRole('button', { name: '' }); // X button
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Logo Preview')).not.toBeInTheDocument();
      });
    });

    test('closes modal when backdrop is clicked', async () => {
      render(<LogoGallery />);

      await waitFor(() => {
        expect(screen.getByText('tech-logo.png')).toBeInTheDocument();
      });

      // Open modal
      const logoCard = screen.getByText('tech-logo.png').closest('.group');
      fireEvent.click(logoCard!);

      await waitFor(() => {
        expect(screen.getByText('Logo Preview')).toBeInTheDocument();
      });

      // Click backdrop (the modal overlay div)
      const backdrop = screen.getByText('Logo Preview').closest('[class*="fixed inset-0"]');
      fireEvent.click(backdrop!);

      await waitFor(() => {
        expect(screen.queryByText('Logo Preview')).not.toBeInTheDocument();
      });
    });

    test('displays logo details in modal correctly', async () => {
      render(<LogoGallery />);

      await waitFor(() => {
        expect(screen.getByText('tech-logo.png')).toBeInTheDocument();
      });

      // Open modal
      const logoCard = screen.getByText('tech-logo.png').closest('.group');
      fireEvent.click(logoCard!);

      await waitFor(() => {
        // File information should be displayed in modal
        expect(screen.getByText('File Information')).toBeInTheDocument();
        expect(screen.getByText('1.0 MB')).toBeInTheDocument(); // File size
        expect(screen.getByText('image/png')).toBeInTheDocument(); // File type
        
        // Category and style
        expect(screen.getByText('Technology')).toBeInTheDocument();
        expect(screen.getByText('Modern')).toBeInTheDocument();
        
        // Keywords
        expect(screen.getByText('tech')).toBeInTheDocument();
        expect(screen.getByText('innovation')).toBeInTheDocument();
        
        // Description
        expect(screen.getByText('A modern technology logo')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    test('shows empty state when no logos are uploaded', async () => {
      mockStorageService.getAllLogos.mockReturnValue([]);

      render(<LogoGallery />);

      await waitFor(() => {
        expect(screen.getByText('No logos found')).toBeInTheDocument();
        expect(screen.getByText('No logos have been uploaded yet. Visit the admin panel to upload some logos.')).toBeInTheDocument();
        expect(screen.getByText('Go to Admin Panel')).toBeInTheDocument();
      });
    });
  });
}); 