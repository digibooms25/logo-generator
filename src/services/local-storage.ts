/**
 * Local Storage Service for Logo Generator
 * Manages uploaded logos and SVG icons with metadata persistence
 */

import { Logo, LogoCategory, LogoStyle } from '../types/logo';

// Storage keys
const STORAGE_KEYS = {
  LOGOS: 'logo-generator-logos',
  SVG_ICONS: 'logo-generator-svg-icons',
  METADATA: 'logo-generator-metadata',
  SELECTED_LOGO: 'logo-generator-selected-logo',
} as const;

// Extended interfaces for stored data
export interface StoredLogoFile {
  id: string;
  file: {
    name: string;
    size: number;
    type: string;
    lastModified: number;
  };
  dataUrl: string; // Base64 encoded image data
  uploadedAt: Date;
  category?: LogoCategory;
  style?: LogoStyle;
  keywords?: string[];
  description?: string;
}

export interface StoredSVGIcon {
  id: string;
  file: {
    name: string;
    size: number;
    type: string;
    lastModified: number;
  };
  svgContent: string;
  uploadedAt: Date;
  category?: string;
  keywords?: string[];
  description?: string;
  metadata?: {
    viewBox?: string;
    width?: number;
    height?: number;
    hasTitle?: boolean;
    hasDesc?: boolean;
    colorCount?: number;
  };
}

export interface StorageMetadata {
  totalLogos: number;
  totalSVGIcons: number;
  lastUpdated: Date;
  storageVersion: string;
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  logos: {
    count: number;
    size: number;
  };
  svgIcons: {
    count: number;
    size: number;
  };
  categories: Record<string, number>;
  styles: Record<string, number>;
}

/**
 * Local Storage Service Class
 */
export class LocalStorageService {
  private static instance: LocalStorageService;
  private readonly storageVersion = '1.0.0';

  private constructor() {
    this.initializeStorage();
  }

  public static getInstance(): LocalStorageService {
    if (!LocalStorageService.instance) {
      LocalStorageService.instance = new LocalStorageService();
    }
    return LocalStorageService.instance;
  }

  /**
   * Initialize storage with default values if not exists
   */
  private initializeStorage(): void {
    try {
      // Check if we're in browser environment
      if (typeof window === 'undefined') {
        return;
      }
      
      if (!localStorage.getItem(STORAGE_KEYS.LOGOS)) {
        localStorage.setItem(STORAGE_KEYS.LOGOS, JSON.stringify([]));
      }
      if (!localStorage.getItem(STORAGE_KEYS.SVG_ICONS)) {
        localStorage.setItem(STORAGE_KEYS.SVG_ICONS, JSON.stringify([]));
      }
      if (!localStorage.getItem(STORAGE_KEYS.METADATA)) {
        const metadata: StorageMetadata = {
          totalLogos: 0,
          totalSVGIcons: 0,
          lastUpdated: new Date(),
          storageVersion: this.storageVersion,
        };
        localStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify(metadata));
      }
    } catch (error) {
      console.error('Failed to initialize local storage:', error);
    }
  }

  /**
   * Convert File to base64 data URL
   */
  private async fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update metadata
   */
  private updateMetadata(): void {
    try {
      const logos = this.getAllLogos();
      const svgIcons = this.getAllSVGIcons();
      
      const metadata: StorageMetadata = {
        totalLogos: logos.length,
        totalSVGIcons: svgIcons.length,
        lastUpdated: new Date(),
        storageVersion: this.storageVersion,
      };
      
      localStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify(metadata));
    } catch (error) {
      console.error('Failed to update metadata:', error);
    }
  }

  // === LOGO OPERATIONS ===

  /**
   * Save a logo file to local storage
   */
  public async saveLogo(
    file: File, 
    metadata: Partial<Pick<StoredLogoFile, 'category' | 'style' | 'keywords' | 'description'>> = {}
  ): Promise<StoredLogoFile> {
    try {
      const dataUrl = await this.fileToDataUrl(file);
      
      const storedLogo: StoredLogoFile = {
        id: this.generateId(),
        file: {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
        },
        dataUrl,
        uploadedAt: new Date(),
        ...metadata,
      };

      const logos = this.getAllLogos();
      logos.push(storedLogo);
      
      localStorage.setItem(STORAGE_KEYS.LOGOS, JSON.stringify(logos));
      this.updateMetadata();
      
      return storedLogo;
    } catch (error) {
      console.error('Failed to save logo:', error);
      throw new Error('Failed to save logo to local storage');
    }
  }

  /**
   * Get all logos from local storage
   */
  public getAllLogos(): StoredLogoFile[] {
    try {
      if (typeof window === 'undefined') {
        return [];
      }
      const data = localStorage.getItem(STORAGE_KEYS.LOGOS);
      if (!data) return [];
      
      const logos = JSON.parse(data);
      // Convert date strings back to Date objects
      return logos.map((logo: any) => ({
        ...logo,
        uploadedAt: new Date(logo.uploadedAt),
      }));
    } catch (error) {
      console.error('Failed to get logos:', error);
      return [];
    }
  }

  /**
   * Get a logo by ID
   */
  public getLogoById(id: string): StoredLogoFile | null {
    const logos = this.getAllLogos();
    return logos.find(logo => logo.id === id) || null;
  }

  /**
   * Update logo metadata
   */
  public updateLogo(id: string, updates: Partial<StoredLogoFile>): boolean {
    try {
      const logos = this.getAllLogos();
      const index = logos.findIndex(logo => logo.id === id);
      
      if (index === -1) return false;
      
      logos[index] = { ...logos[index], ...updates };
      localStorage.setItem(STORAGE_KEYS.LOGOS, JSON.stringify(logos));
      this.updateMetadata();
      
      return true;
    } catch (error) {
      console.error('Failed to update logo:', error);
      return false;
    }
  }

  /**
   * Delete a logo by ID
   */
  public deleteLogo(id: string): boolean {
    try {
      if (typeof window === 'undefined') {
        return false;
      }
      const logos = this.getAllLogos();
      const filteredLogos = logos.filter(logo => logo.id !== id);
      
      if (logos.length === filteredLogos.length) return false;
      
      localStorage.setItem(STORAGE_KEYS.LOGOS, JSON.stringify(filteredLogos));
      this.updateMetadata();
      
      return true;
    } catch (error) {
      console.error('Failed to delete logo:', error);
      return false;
    }
  }

  // === SVG ICON OPERATIONS ===

  /**
   * Save an SVG icon to local storage
   */
  public async saveSVGIcon(
    file: File,
    svgContent: string,
    metadata: Partial<Pick<StoredSVGIcon, 'category' | 'keywords' | 'description' | 'metadata'>> = {}
  ): Promise<StoredSVGIcon> {
    try {
      const storedIcon: StoredSVGIcon = {
        id: this.generateId(),
        file: {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
        },
        svgContent,
        uploadedAt: new Date(),
        ...metadata,
      };

      const icons = this.getAllSVGIcons();
      icons.push(storedIcon);
      
      localStorage.setItem(STORAGE_KEYS.SVG_ICONS, JSON.stringify(icons));
      this.updateMetadata();
      
      return storedIcon;
    } catch (error) {
      console.error('Failed to save SVG icon:', error);
      throw new Error('Failed to save SVG icon to local storage');
    }
  }

  /**
   * Get all SVG icons from local storage
   */
  public getAllSVGIcons(): StoredSVGIcon[] {
    try {
      if (typeof window === 'undefined') {
        return [];
      }
      const data = localStorage.getItem(STORAGE_KEYS.SVG_ICONS);
      if (!data) return [];
      
      const icons = JSON.parse(data);
      // Convert date strings back to Date objects
      return icons.map((icon: any) => ({
        ...icon,
        uploadedAt: new Date(icon.uploadedAt),
      }));
    } catch (error) {
      console.error('Failed to get SVG icons:', error);
      return [];
    }
  }

  /**
   * Get an SVG icon by ID
   */
  public getSVGIconById(id: string): StoredSVGIcon | null {
    const icons = this.getAllSVGIcons();
    return icons.find(icon => icon.id === id) || null;
  }

  /**
   * Update SVG icon metadata
   */
  public updateSVGIcon(id: string, updates: Partial<StoredSVGIcon>): boolean {
    try {
      const icons = this.getAllSVGIcons();
      const index = icons.findIndex(icon => icon.id === id);
      
      if (index === -1) return false;
      
      icons[index] = { ...icons[index], ...updates };
      localStorage.setItem(STORAGE_KEYS.SVG_ICONS, JSON.stringify(icons));
      this.updateMetadata();
      
      return true;
    } catch (error) {
      console.error('Failed to update SVG icon:', error);
      return false;
    }
  }

  /**
   * Delete an SVG icon by ID
   */
  public deleteSVGIcon(id: string): boolean {
    try {
      if (typeof window === 'undefined') {
        return false;
      }
      const icons = this.getAllSVGIcons();
      const filteredIcons = icons.filter(icon => icon.id !== id);
      localStorage.setItem(STORAGE_KEYS.SVG_ICONS, JSON.stringify(filteredIcons));
      return true;
    } catch (error) {
      console.error('Error deleting SVG icon:', error);
      return false;
    }
  }

  // === SEARCH AND FILTER OPERATIONS ===

  /**
   * Search logos by keywords
   */
  public searchLogos(query: string, filters?: {
    category?: LogoCategory;
    style?: LogoStyle;
  }): StoredLogoFile[] {
    const logos = this.getAllLogos();
    const searchTerm = query.toLowerCase();
    
    return logos.filter(logo => {
      // Text search
      const matchesSearch = !query || 
        logo.file.name.toLowerCase().includes(searchTerm) ||
        logo.description?.toLowerCase().includes(searchTerm) ||
        logo.keywords?.some(keyword => keyword.toLowerCase().includes(searchTerm));
      
      // Category filter
      const matchesCategory = !filters?.category || logo.category === filters.category;
      
      // Style filter
      const matchesStyle = !filters?.style || logo.style === filters.style;
      
      return matchesSearch && matchesCategory && matchesStyle;
    });
  }

  /**
   * Search SVG icons by keywords
   */
  public searchSVGIcons(query: string, filters?: {
    category?: string;
  }): StoredSVGIcon[] {
    const icons = this.getAllSVGIcons();
    const searchTerm = query.toLowerCase();
    
    return icons.filter(icon => {
      // Text search
      const matchesSearch = !query || 
        icon.file.name.toLowerCase().includes(searchTerm) ||
        icon.description?.toLowerCase().includes(searchTerm) ||
        icon.keywords?.some(keyword => keyword.toLowerCase().includes(searchTerm));
      
      // Category filter
      const matchesCategory = !filters?.category || icon.category === filters.category;
      
      return matchesSearch && matchesCategory;
    });
  }

  // === ANALYTICS AND UTILITIES ===

  /**
   * Get storage statistics
   */
  public getStorageStats(): StorageStats {
    const logos = this.getAllLogos();
    const svgIcons = this.getAllSVGIcons();
    
    const logoSize = logos.reduce((sum, logo) => sum + logo.file.size, 0);
    const iconSize = svgIcons.reduce((sum, icon) => sum + icon.file.size, 0);
    
    const categories: Record<string, number> = {};
    const styles: Record<string, number> = {};
    
    logos.forEach(logo => {
      if (logo.category) {
        categories[logo.category] = (categories[logo.category] || 0) + 1;
      }
      if (logo.style) {
        styles[logo.style] = (styles[logo.style] || 0) + 1;
      }
    });
    
    svgIcons.forEach(icon => {
      if (icon.category) {
        categories[icon.category] = (categories[icon.category] || 0) + 1;
      }
    });
    
    return {
      totalFiles: logos.length + svgIcons.length,
      totalSize: logoSize + iconSize,
      logos: {
        count: logos.length,
        size: logoSize,
      },
      svgIcons: {
        count: svgIcons.length,
        size: iconSize,
      },
      categories,
      styles,
    };
  }

  /**
   * Get storage metadata
   */
  public getMetadata(): StorageMetadata | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.METADATA);
      if (!data) return null;
      
      const metadata = JSON.parse(data);
      return {
        ...metadata,
        lastUpdated: new Date(metadata.lastUpdated),
      };
    } catch (error) {
      console.error('Failed to get metadata:', error);
      return null;
    }
  }

  /**
   * Clear all storage data
   */
  public clearAllData(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.LOGOS);
      localStorage.removeItem(STORAGE_KEYS.SVG_ICONS);
      localStorage.removeItem(STORAGE_KEYS.METADATA);
      this.initializeStorage();
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  /**
   * Export all data as JSON
   */
  public exportData(): string {
    const data = {
      logos: this.getAllLogos(),
      svgIcons: this.getAllSVGIcons(),
      metadata: this.getMetadata(),
      exportedAt: new Date(),
    };
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * Check storage quota usage (approximate)
   */
  public getStorageUsage(): { used: number; available: number; percentage: number } {
    try {
      let used = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length;
        }
      }
      
      // Approximate localStorage limit (usually 5-10MB)
      const available = 5 * 1024 * 1024; // 5MB estimate
      const percentage = (used / available) * 100;
      
      return { used, available, percentage };
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }

  // Selected logo operations for inspiration
  public setSelectedLogo(logo: StoredLogoFile): void {
    try {
      if (typeof window === 'undefined') {
        return;
      }
      localStorage.setItem(STORAGE_KEYS.SELECTED_LOGO, JSON.stringify(logo));
    } catch (error) {
      console.error('Failed to save selected logo:', error);
    }
  }

  public getSelectedLogo(): StoredLogoFile | null {
    try {
      if (typeof window === 'undefined') {
        return null;
      }
      const stored = localStorage.getItem(STORAGE_KEYS.SELECTED_LOGO);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to get selected logo:', error);
      return null;
    }
  }

  public clearSelectedLogo(): void {
    try {
      if (typeof window === 'undefined') {
        return;
      }
      localStorage.removeItem(STORAGE_KEYS.SELECTED_LOGO);
    } catch (error) {
      console.error('Failed to clear selected logo:', error);
    }
  }
}

// Export singleton instance
export const localStorageService = LocalStorageService.getInstance();

// Helper functions for common operations
export const storageHelpers = {
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  formatDate: (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  },

  isStorageAvailable: (): boolean => {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  },
}; 