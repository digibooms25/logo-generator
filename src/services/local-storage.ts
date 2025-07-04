/**
 * Local Storage Service for Logo Generator
 * Manages uploaded logos and SVG icons with metadata persistence
 */

import { Logo, LogoCategory, LogoStyle } from '../types/logo';

// Storage keys
const STORAGE_KEYS = {
  LOGOS: 'logo-generator-logos',
  MY_ASSETS: 'logo-generator-my-assets', // New storage key for generated logos
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
  isGenerated?: boolean; // New field to identify generated logos
  source?: 'gallery' | 'generated'; // New field to categorize the source
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
  totalMyAssets: number; // New field for generated logos count
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
  myAssets: { // New stats for generated logos
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
  private readonly storageVersion = '1.1.0'; // Updated version for new features

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
      if (!localStorage.getItem(STORAGE_KEYS.MY_ASSETS)) {
        localStorage.setItem(STORAGE_KEYS.MY_ASSETS, JSON.stringify([]));
      }
      if (!localStorage.getItem(STORAGE_KEYS.SVG_ICONS)) {
        localStorage.setItem(STORAGE_KEYS.SVG_ICONS, JSON.stringify([]));
      }
      if (!localStorage.getItem(STORAGE_KEYS.METADATA)) {
        const metadata: StorageMetadata = {
          totalLogos: 0,
          totalMyAssets: 0,
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
      const myAssets = this.getMyAssets();
      const svgIcons = this.getAllSVGIcons();
      
      const metadata: StorageMetadata = {
        totalLogos: logos.length,
        totalMyAssets: myAssets.length,
        totalSVGIcons: svgIcons.length,
        lastUpdated: new Date(),
        storageVersion: this.storageVersion,
      };
      
      localStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify(metadata));
    } catch (error) {
      console.error('Failed to update metadata:', error);
    }
  }

  // === GALLERY LOGO OPERATIONS ===

  /**
   * Save a gallery logo file to local storage
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
        source: 'gallery',
        isGenerated: false,
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
   * Get all gallery logos from local storage
   */
  public getAllLogos(): StoredLogoFile[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LOGOS);
      if (!stored) return [];
      
      const logos: StoredLogoFile[] = JSON.parse(stored);
      return logos.map(logo => ({
        ...logo,
        uploadedAt: new Date(logo.uploadedAt),
      }));
    } catch (error) {
      console.error('Failed to load logos:', error);
      return [];
    }
  }

  // === MY ASSETS (GENERATED LOGOS) OPERATIONS ===

  /**
   * Save a generated logo to My Assets
   */
  public async saveToMyAssets(
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
        source: 'generated',
        isGenerated: true,
        ...metadata,
      };

      const myAssets = this.getMyAssets();
      myAssets.push(storedLogo);
      
      localStorage.setItem(STORAGE_KEYS.MY_ASSETS, JSON.stringify(myAssets));
      this.updateMetadata();
      
      return storedLogo;
    } catch (error) {
      console.error('Failed to save to My Assets:', error);
      throw new Error('Failed to save logo to My Assets');
    }
  }

  /**
   * Get all generated logos from My Assets
   */
  public getMyAssets(): StoredLogoFile[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MY_ASSETS);
      if (!stored) return [];
      
      const logos: StoredLogoFile[] = JSON.parse(stored);
      return logos.map(logo => ({
        ...logo,
        uploadedAt: new Date(logo.uploadedAt),
      }));
    } catch (error) {
      console.error('Failed to load My Assets:', error);
      return [];
    }
  }

  /**
   * Delete from My Assets
   */
  public deleteFromMyAssets(id: string): boolean {
    try {
      const myAssets = this.getMyAssets();
      const filteredAssets = myAssets.filter(asset => asset.id !== id);
      
      if (filteredAssets.length === myAssets.length) {
        return false; // Logo not found
      }
      
      localStorage.setItem(STORAGE_KEYS.MY_ASSETS, JSON.stringify(filteredAssets));
      this.updateMetadata();
      
      return true;
    } catch (error) {
      console.error('Failed to delete from My Assets:', error);
      return false;
    }
  }

  // === SHARED OPERATIONS ===

  /**
   * Get a logo by ID from either gallery or My Assets
   */
  public getLogoById(id: string): StoredLogoFile | null {
    // Check gallery first
    const galleryLogos = this.getAllLogos();
    let logo = galleryLogos.find(logo => logo.id === id);
    
    if (logo) return logo;
    
    // Check My Assets
    const myAssets = this.getMyAssets();
    logo = myAssets.find(logo => logo.id === id);
    
    return logo || null;
  }

  /**
   * Update logo metadata (works for both gallery and My Assets)
   */
  public updateLogo(id: string, updates: Partial<StoredLogoFile>): boolean {
    try {
      // Try updating in gallery first
      const logos = this.getAllLogos();
      const logoIndex = logos.findIndex(logo => logo.id === id);
      
      if (logoIndex !== -1) {
        logos[logoIndex] = { ...logos[logoIndex], ...updates };
        localStorage.setItem(STORAGE_KEYS.LOGOS, JSON.stringify(logos));
        this.updateMetadata();
        return true;
      }
      
      // Try updating in My Assets
      const myAssets = this.getMyAssets();
      const assetIndex = myAssets.findIndex(asset => asset.id === id);
      
      if (assetIndex !== -1) {
        myAssets[assetIndex] = { ...myAssets[assetIndex], ...updates };
        localStorage.setItem(STORAGE_KEYS.MY_ASSETS, JSON.stringify(myAssets));
        this.updateMetadata();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to update logo:', error);
      return false;
    }
  }

  /**
   * Delete a logo by ID (works for both gallery and My Assets)
   */
  public deleteLogo(id: string): boolean {
    try {
      if (typeof window === 'undefined') {
        return false;
      }
      
      // Try deleting from gallery first
      const logos = this.getAllLogos();
      const filteredLogos = logos.filter(logo => logo.id !== id);
      
      if (logos.length !== filteredLogos.length) {
        localStorage.setItem(STORAGE_KEYS.LOGOS, JSON.stringify(filteredLogos));
        this.updateMetadata();
        return true;
      }
      
      // Try deleting from My Assets
      return this.deleteFromMyAssets(id);
      
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
   * Search gallery logos by keywords
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
   * Search My Assets by keywords
   */
  public searchMyAssets(query: string, filters?: {
    category?: LogoCategory;
    style?: LogoStyle;
  }): StoredLogoFile[] {
    const myAssets = this.getMyAssets();
    const searchTerm = query.toLowerCase();
    
    return myAssets.filter(asset => {
      // Text search
      const matchesSearch = !query || 
        asset.file.name.toLowerCase().includes(searchTerm) ||
        asset.description?.toLowerCase().includes(searchTerm) ||
        asset.keywords?.some(keyword => keyword.toLowerCase().includes(searchTerm));
      
      // Category filter
      const matchesCategory = !filters?.category || asset.category === filters.category;
      
      // Style filter
      const matchesStyle = !filters?.style || asset.style === filters.style;
      
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

  // === UTILITY AND STATS OPERATIONS ===

  /**
   * Get storage statistics
   */
  public getStorageStats(): StorageStats {
    const logos = this.getAllLogos();
    const myAssets = this.getMyAssets();
    const svgIcons = this.getAllSVGIcons();
    
    const logoSize = logos.reduce((sum, logo) => sum + logo.file.size, 0);
    const myAssetsSize = myAssets.reduce((sum, asset) => sum + asset.file.size, 0);
    const svgSize = svgIcons.reduce((sum, icon) => sum + icon.file.size, 0);
    
    const categories: Record<string, number> = {};
    const styles: Record<string, number> = {};
    
    [...logos, ...myAssets].forEach(logo => {
      if (logo.category) {
        categories[logo.category] = (categories[logo.category] || 0) + 1;
      }
      if (logo.style) {
        styles[logo.style] = (styles[logo.style] || 0) + 1;
      }
    });
    
    return {
      totalFiles: logos.length + myAssets.length + svgIcons.length,
      totalSize: logoSize + myAssetsSize + svgSize,
      logos: {
        count: logos.length,
        size: logoSize,
      },
      myAssets: {
        count: myAssets.length,
        size: myAssetsSize,
      },
      svgIcons: {
        count: svgIcons.length,
        size: svgSize,
      },
      categories,
      styles,
    };
  }

  /**
   * Get metadata
   */
  public getMetadata(): StorageMetadata | null {
    try {
      if (typeof window === 'undefined') {
        return null;
      }
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
   * Clear all data
   */
  public clearAllData(): void {
    try {
      if (typeof window === 'undefined') {
        return;
      }
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      this.initializeStorage();
    } catch (error) {
      console.error('Failed to clear all data:', error);
    }
  }

  /**
   * Export all data as JSON
   */
  public exportData(): string {
    return JSON.stringify({
      logos: this.getAllLogos(),
      myAssets: this.getMyAssets(),
      svgIcons: this.getAllSVGIcons(),
      metadata: this.getMetadata(),
    }, null, 2);
  }

  /**
   * Get storage usage information
   */
  public getStorageUsage(): { used: number; available: number; percentage: number } {
    try {
      if (typeof window === 'undefined') {
        return { used: 0, available: 0, percentage: 0 };
      }
      
      // Estimate used storage
      let used = 0;
      Object.values(STORAGE_KEYS).forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          used += new Blob([data]).size;
        }
      });
      
      // Most browsers have 5-10MB limit for localStorage
      const available = 10 * 1024 * 1024; // 10MB estimate
      const percentage = (used / available) * 100;
      
      return { used, available, percentage };
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }

  // === SELECTED LOGO OPERATIONS ===

  /**
   * Set selected logo
   */
  public setSelectedLogo(logo: StoredLogoFile): void {
    try {
      if (typeof window === 'undefined') {
        return;
      }
      localStorage.setItem(STORAGE_KEYS.SELECTED_LOGO, JSON.stringify(logo));
    } catch (error) {
      console.error('Failed to set selected logo:', error);
    }
  }

  /**
   * Get selected logo
   */
  public getSelectedLogo(): StoredLogoFile | null {
    try {
      if (typeof window === 'undefined') {
        return null;
      }
      const data = localStorage.getItem(STORAGE_KEYS.SELECTED_LOGO);
      if (!data) return null;
      
      const logo = JSON.parse(data);
      return {
        ...logo,
        uploadedAt: new Date(logo.uploadedAt),
      };
    } catch (error) {
      console.error('Failed to get selected logo:', error);
      return null;
    }
  }

  /**
   * Clear selected logo
   */
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
