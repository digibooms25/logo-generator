import { LocalStorageService, StoredLogoFile, StoredSVGIcon, storageHelpers } from './local-storage';
import { LogoCategory, LogoStyle } from '../types/logo';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    },
    hasOwnProperty: (key: string) => key in store,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock FileReader
const mockFileReader = {
  readAsDataURL: jest.fn(),
  result: '',
  onload: null as any,
  onerror: null as any,
};

Object.defineProperty(global, 'FileReader', {
  writable: true,
  value: jest.fn(() => mockFileReader),
});

describe('LocalStorageService', () => {
  let service: LocalStorageService;
  let mockLogoFile: File;
  let mockSVGFile: File;

  beforeEach(() => {
    // Clear localStorage
    localStorageMock.clear();
    
    // Create new instance by clearing the singleton
    (LocalStorageService as any).instance = undefined;
    service = LocalStorageService.getInstance();
    
    // Mock files
    mockLogoFile = new File(['logo content'], 'test-logo.png', { 
      type: 'image/png',
      lastModified: Date.now()
    });
    
    mockSVGFile = new File(['<svg></svg>'], 'test-icon.svg', { 
      type: 'image/svg+xml',
      lastModified: Date.now()
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = LocalStorageService.getInstance();
      const instance2 = LocalStorageService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Storage Initialization', () => {
    it('should initialize storage with empty arrays', () => {
      expect(service.getAllLogos()).toEqual([]);
      expect(service.getAllSVGIcons()).toEqual([]);
    });

    it('should initialize metadata', () => {
      const metadata = service.getMetadata();
      expect(metadata).toBeDefined();
      expect(metadata?.totalLogos).toBe(0);
      expect(metadata?.totalSVGIcons).toBe(0);
      expect(metadata?.storageVersion).toBe('1.0.0');
    });
  });

  describe('Logo Operations', () => {
    it('should save a logo successfully', async () => {
      const mockDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      
      // Mock FileReader
      mockFileReader.readAsDataURL.mockImplementation(() => {
        setTimeout(() => {
          mockFileReader.result = mockDataUrl;
          if (mockFileReader.onload) {
            mockFileReader.onload({} as any);
          }
        }, 0);
      });

      const savedLogo = await service.saveLogo(mockLogoFile, {
        category: LogoCategory.TECHNOLOGY,
        style: LogoStyle.MODERN,
        keywords: ['tech', 'modern'],
        description: 'Test logo'
      });

      expect(savedLogo.id).toBeDefined();
      expect(savedLogo.file.name).toBe('test-logo.png');
      expect(savedLogo.dataUrl).toBe(mockDataUrl);
      expect(savedLogo.category).toBe(LogoCategory.TECHNOLOGY);
      expect(savedLogo.style).toBe(LogoStyle.MODERN);
      expect(savedLogo.keywords).toEqual(['tech', 'modern']);
      expect(savedLogo.description).toBe('Test logo');
      expect(savedLogo.uploadedAt).toBeInstanceOf(Date);
    });

    it('should get all logos', async () => {
      const mockDataUrl = 'data:image/png;base64,test';
      
      mockFileReader.readAsDataURL.mockImplementation(() => {
        setTimeout(() => {
          mockFileReader.result = mockDataUrl;
          if (mockFileReader.onload) {
            mockFileReader.onload({} as any);
          }
        }, 0);
      });

      await service.saveLogo(mockLogoFile);
      const logos = service.getAllLogos();
      
      expect(logos).toHaveLength(1);
      expect(logos[0].file.name).toBe('test-logo.png');
    });

    it('should get logo by ID', async () => {
      const mockDataUrl = 'data:image/png;base64,test';
      
      mockFileReader.readAsDataURL.mockImplementation(() => {
        setTimeout(() => {
          mockFileReader.result = mockDataUrl;
          if (mockFileReader.onload) {
            mockFileReader.onload({} as any);
          }
        }, 0);
      });

      const savedLogo = await service.saveLogo(mockLogoFile);
      const foundLogo = service.getLogoById(savedLogo.id);
      
      expect(foundLogo).toBeDefined();
      expect(foundLogo?.id).toBe(savedLogo.id);
    });

    it('should return null for non-existent logo ID', () => {
      const foundLogo = service.getLogoById('non-existent-id');
      expect(foundLogo).toBeNull();
    });

    it('should update logo metadata', async () => {
      const mockDataUrl = 'data:image/png;base64,test';
      
      mockFileReader.readAsDataURL.mockImplementation(() => {
        setTimeout(() => {
          mockFileReader.result = mockDataUrl;
          if (mockFileReader.onload) {
            mockFileReader.onload({} as any);
          }
        }, 0);
      });

      const savedLogo = await service.saveLogo(mockLogoFile);
      const updateResult = service.updateLogo(savedLogo.id, {
        description: 'Updated description',
        keywords: ['updated', 'keywords']
      });

      expect(updateResult).toBe(true);
      
      const updatedLogo = service.getLogoById(savedLogo.id);
      expect(updatedLogo?.description).toBe('Updated description');
      expect(updatedLogo?.keywords).toEqual(['updated', 'keywords']);
    });

    it('should return false when updating non-existent logo', () => {
      const updateResult = service.updateLogo('non-existent-id', {
        description: 'Test'
      });
      expect(updateResult).toBe(false);
    });

    it('should delete logo successfully', async () => {
      const mockDataUrl = 'data:image/png;base64,test';
      
      mockFileReader.readAsDataURL.mockImplementation(() => {
        setTimeout(() => {
          mockFileReader.result = mockDataUrl;
          if (mockFileReader.onload) {
            mockFileReader.onload({} as any);
          }
        }, 0);
      });

      const savedLogo = await service.saveLogo(mockLogoFile);
      const deleteResult = service.deleteLogo(savedLogo.id);

      expect(deleteResult).toBe(true);
      expect(service.getAllLogos()).toHaveLength(0);
    });

    it('should return false when deleting non-existent logo', () => {
      const deleteResult = service.deleteLogo('non-existent-id');
      expect(deleteResult).toBe(false);
    });
  });

  describe('SVG Icon Operations', () => {
    it('should save an SVG icon successfully', async () => {
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>';
      
      const savedIcon = await service.saveSVGIcon(mockSVGFile, svgContent, {
        category: 'ui',
        keywords: ['circle', 'icon'],
        description: 'Test SVG icon',
        metadata: {
          viewBox: '0 0 24 24',
          width: 24,
          height: 24,
          colorCount: 1
        }
      });

      expect(savedIcon.id).toBeDefined();
      expect(savedIcon.file.name).toBe('test-icon.svg');
      expect(savedIcon.svgContent).toBe(svgContent);
      expect(savedIcon.category).toBe('ui');
      expect(savedIcon.keywords).toEqual(['circle', 'icon']);
      expect(savedIcon.description).toBe('Test SVG icon');
      expect(savedIcon.metadata?.viewBox).toBe('0 0 24 24');
      expect(savedIcon.uploadedAt).toBeInstanceOf(Date);
    });

    it('should get all SVG icons', async () => {
      const svgContent = '<svg></svg>';
      await service.saveSVGIcon(mockSVGFile, svgContent);
      
      const icons = service.getAllSVGIcons();
      expect(icons).toHaveLength(1);
      expect(icons[0].file.name).toBe('test-icon.svg');
    });

    it('should get SVG icon by ID', async () => {
      const svgContent = '<svg></svg>';
      const savedIcon = await service.saveSVGIcon(mockSVGFile, svgContent);
      
      const foundIcon = service.getSVGIconById(savedIcon.id);
      expect(foundIcon).toBeDefined();
      expect(foundIcon?.id).toBe(savedIcon.id);
    });

    it('should return null for non-existent SVG icon ID', () => {
      const foundIcon = service.getSVGIconById('non-existent-id');
      expect(foundIcon).toBeNull();
    });

    it('should update SVG icon metadata', async () => {
      const svgContent = '<svg></svg>';
      const savedIcon = await service.saveSVGIcon(mockSVGFile, svgContent);
      
      const updateResult = service.updateSVGIcon(savedIcon.id, {
        description: 'Updated SVG description',
        keywords: ['updated', 'svg']
      });

      expect(updateResult).toBe(true);
      
      const updatedIcon = service.getSVGIconById(savedIcon.id);
      expect(updatedIcon?.description).toBe('Updated SVG description');
      expect(updatedIcon?.keywords).toEqual(['updated', 'svg']);
    });

    it('should delete SVG icon successfully', async () => {
      const svgContent = '<svg></svg>';
      const savedIcon = await service.saveSVGIcon(mockSVGFile, svgContent);
      
      const deleteResult = service.deleteSVGIcon(savedIcon.id);
      expect(deleteResult).toBe(true);
      expect(service.getAllSVGIcons()).toHaveLength(0);
    });
  });

  describe('Search and Filter Operations', () => {
    beforeEach(async () => {
      const mockDataUrl = 'data:image/png;base64,test';
      
      mockFileReader.readAsDataURL.mockImplementation(() => {
        setTimeout(() => {
          mockFileReader.result = mockDataUrl;
          if (mockFileReader.onload) {
            mockFileReader.onload({} as any);
          }
        }, 0);
      });

      // Add test logos
      await service.saveLogo(mockLogoFile, {
        category: LogoCategory.TECHNOLOGY,
        style: LogoStyle.MODERN,
        keywords: ['tech', 'modern'],
        description: 'Technology logo'
      });

      await service.saveLogo(new File([''], 'healthcare.png', { type: 'image/png' }), {
        category: LogoCategory.HEALTHCARE,
        style: LogoStyle.PROFESSIONAL,
        keywords: ['health', 'medical'],
        description: 'Healthcare logo'
      });

      // Add test SVG icons
      await service.saveSVGIcon(mockSVGFile, '<svg></svg>', {
        category: 'ui',
        keywords: ['interface', 'button'],
        description: 'UI icon'
      });

      await service.saveSVGIcon(new File([''], 'nav.svg', { type: 'image/svg+xml' }), '<svg></svg>', {
        category: 'navigation',
        keywords: ['menu', 'nav'],
        description: 'Navigation icon'
      });
    });

    it('should search logos by keyword', () => {
      const results = service.searchLogos('tech');
      expect(results).toHaveLength(1);
      expect(results[0].keywords).toContain('tech');
    });

    it('should search logos by description', () => {
      const results = service.searchLogos('Healthcare');
      expect(results).toHaveLength(1);
      expect(results[0].description).toContain('Healthcare');
    });

    it('should filter logos by category', () => {
      const results = service.searchLogos('', {
        category: LogoCategory.TECHNOLOGY
      });
      expect(results).toHaveLength(1);
      expect(results[0].category).toBe(LogoCategory.TECHNOLOGY);
    });

    it('should filter logos by style', () => {
      const results = service.searchLogos('', {
        style: LogoStyle.MODERN
      });
      expect(results).toHaveLength(1);
      expect(results[0].style).toBe(LogoStyle.MODERN);
    });

    it('should search SVG icons by keyword', () => {
      const results = service.searchSVGIcons('interface');
      expect(results).toHaveLength(1);
      expect(results[0].keywords).toContain('interface');
    });

    it('should filter SVG icons by category', () => {
      const results = service.searchSVGIcons('', {
        category: 'ui'
      });
      expect(results).toHaveLength(1);
      expect(results[0].category).toBe('ui');
    });
  });

  describe('Analytics and Utilities', () => {
    beforeEach(async () => {
      const mockDataUrl = 'data:image/png;base64,test';
      
      mockFileReader.readAsDataURL.mockImplementation(() => {
        setTimeout(() => {
          mockFileReader.result = mockDataUrl;
          if (mockFileReader.onload) {
            mockFileReader.onload({} as any);
          }
        }, 0);
      });

      // Add test data
      await service.saveLogo(mockLogoFile, {
        category: LogoCategory.TECHNOLOGY,
        style: LogoStyle.MODERN
      });

      await service.saveSVGIcon(mockSVGFile, '<svg></svg>', {
        category: 'ui'
      });
    });

    it('should get storage statistics', () => {
      const stats = service.getStorageStats();
      
      expect(stats.totalFiles).toBe(2);
      expect(stats.logos.count).toBe(1);
      expect(stats.svgIcons.count).toBe(1);
      expect(stats.categories).toHaveProperty(LogoCategory.TECHNOLOGY);
      expect(stats.categories).toHaveProperty('ui');
      expect(stats.styles).toHaveProperty(LogoStyle.MODERN);
    });

    it('should export data as JSON', () => {
      const exportedData = service.exportData();
      const parsed = JSON.parse(exportedData);
      
      expect(parsed).toHaveProperty('logos');
      expect(parsed).toHaveProperty('svgIcons');
      expect(parsed).toHaveProperty('metadata');
      expect(parsed).toHaveProperty('exportedAt');
      expect(Array.isArray(parsed.logos)).toBe(true);
      expect(Array.isArray(parsed.svgIcons)).toBe(true);
    });

    it('should get storage usage information', () => {
      const usage = service.getStorageUsage();
      
      expect(usage).toHaveProperty('used');
      expect(usage).toHaveProperty('available');
      expect(usage).toHaveProperty('percentage');
      expect(typeof usage.used).toBe('number');
      expect(typeof usage.available).toBe('number');
      expect(typeof usage.percentage).toBe('number');
    });

    it('should clear all data', () => {
      service.clearAllData();
      
      expect(service.getAllLogos()).toHaveLength(0);
      expect(service.getAllSVGIcons()).toHaveLength(0);
      
      const metadata = service.getMetadata();
      expect(metadata?.totalLogos).toBe(0);
      expect(metadata?.totalSVGIcons).toBe(0);
    });
  });

  describe('Storage Helpers', () => {
    it('should format file size correctly', () => {
      expect(storageHelpers.formatFileSize(0)).toBe('0 Bytes');
      expect(storageHelpers.formatFileSize(1024)).toBe('1 KB');
      expect(storageHelpers.formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(storageHelpers.formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should format date correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = storageHelpers.formatDate(date);
      
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });

    it('should check storage availability', () => {
      const isAvailable = storageHelpers.isStorageAvailable();
      expect(typeof isAvailable).toBe('boolean');
      expect(isAvailable).toBe(true); // Should be true in test environment
    });
  });

  describe('Error Handling', () => {
    it('should handle FileReader errors gracefully', async () => {
      mockFileReader.readAsDataURL.mockImplementation(() => {
        setTimeout(() => {
          if (mockFileReader.onerror) {
            mockFileReader.onerror({} as any);
          }
        }, 0);
      });

      await expect(service.saveLogo(mockLogoFile)).rejects.toThrow();
    });

    it('should handle corrupted localStorage data', () => {
      // Corrupt the data
      localStorageMock.setItem('logo-generator-logos', 'invalid json');
      
      // Should return empty array instead of throwing
      const logos = service.getAllLogos();
      expect(logos).toEqual([]);
    });

    it('should handle missing localStorage gracefully', () => {
      // Remove the key
      localStorageMock.removeItem('logo-generator-metadata');
      
      // Should return null instead of throwing
      const metadata = service.getMetadata();
      expect(metadata).toBeNull();
    });
  });
}); 