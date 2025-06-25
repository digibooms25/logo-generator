"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Grid, List, Eye, Download, Heart, Star, X, Clock, TrendingUp, Calendar, FileText, Tag, Palette, AlertCircle, RefreshCw, Wifi, WifiOff, Save, Image } from 'lucide-react';
import { LocalStorageService, type StoredLogoFile } from '../services/local-storage';
import { LogoCategory, LogoStyle } from '../types/logo';

interface LogoGalleryProps {
  onLogoSelect?: (logo: StoredLogoFile) => void;
  className?: string;
}

interface GalleryFilters {
  category: LogoCategory | 'ALL';
  style: LogoStyle | 'ALL';
  searchQuery: string;
  sortBy: 'newest' | 'oldest' | 'name' | 'category' | 'size' | 'popularity';
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
  sizeRange: 'all' | 'small' | 'medium' | 'large';
}

interface ViewMode {
  type: 'grid' | 'list';
  gridSize: 'small' | 'medium' | 'large';
}

interface SearchSuggestion {
  type: 'keyword' | 'category' | 'style' | 'recent';
  value: string;
  count?: number;
}

interface PreviewModal {
  isOpen: boolean;
  logo: StoredLogoFile | null;
}

// Enhanced loading states interface
interface LoadingStates {
  main: boolean;
  search: boolean;
  favorites: string | null; // logo ID being processed
  imageLoad: Set<string>; // logo IDs with loading images
  operations: Set<string>; // logo IDs with pending operations
}

// Enhanced error states interface
interface ErrorStates {
  main: string | null;
  search: string | null;
  favorites: string | null;
  images: Map<string, string>; // logo ID -> error message
  operations: Map<string, string>; // logo ID -> error message
  network: boolean;
}

// Tab type
type TabType = 'gallery' | 'myAssets';

export default function LogoGallery({ 
  onLogoSelect,
  className = ''
}: LogoGalleryProps) {
  const [activeTab, setActiveTab] = useState<TabType>('gallery');
  const [galleryLogos, setGalleryLogos] = useState<StoredLogoFile[]>([]);
  const [myAssets, setMyAssets] = useState<StoredLogoFile[]>([]);
  const [filteredLogos, setFilteredLogos] = useState<StoredLogoFile[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  // Enhanced loading states
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    main: true,
    search: false,
    favorites: null,
    imageLoad: new Set(),
    operations: new Set()
  });

  // Enhanced error states
  const [errorStates, setErrorStates] = useState<ErrorStates>({
    main: null,
    search: null,
    favorites: null,
    images: new Map(),
    operations: new Map(),
    network: navigator.onLine ?? true
  });
  
  const [filters, setFilters] = useState<GalleryFilters>({
    category: 'ALL',
    style: 'ALL',
    searchQuery: '',
    sortBy: 'newest',
    dateRange: 'all',
    sizeRange: 'all'
  });
  
  const [viewMode, setViewMode] = useState<ViewMode>({
    type: 'grid',
    gridSize: 'medium'
  });

  const [showFilters, setShowFilters] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  
  const [previewModal, setPreviewModal] = useState<PreviewModal>({
    isOpen: false,
    logo: null
  });

  const storageService = LocalStorageService.getInstance();

  // Get current logos based on active tab
  const currentLogos = useMemo(() => {
    return activeTab === 'gallery' ? galleryLogos : myAssets;
  }, [activeTab, galleryLogos, myAssets]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setErrorStates(prev => ({ ...prev, network: true }));
      // Retry failed operations when coming back online
      if (!loadingStates.main && errorStates.main) {
        loadLogos();
      }
    };

    const handleOffline = () => {
      setErrorStates(prev => ({ ...prev, network: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadingStates.main, errorStates.main]);

  // Load logos on component mount
  useEffect(() => {
    loadLogos();
    loadSearchHistory();
  }, []);

  // Apply filters whenever logos or filters change
  useEffect(() => {
    applyFilters();
  }, [currentLogos, filters]);

  // Handle Escape key for modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previewModal.isOpen) {
        closePreviewModal();
      }
    };

    if (previewModal.isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [previewModal.isOpen]);

  // Enhanced loadLogos with better error handling
  const loadLogos = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoadingStates(prev => ({ ...prev, main: true }));
      }
      setErrorStates(prev => ({ ...prev, main: null }));
      
      // Check network connectivity for more graceful handling
      if (!navigator.onLine) {
        throw new Error('No internet connection. Please check your network and try again.');
      }
      
      const allGalleryLogos = storageService.getAllLogos();
      const allMyAssets = storageService.getMyAssets();
      
      setGalleryLogos(allGalleryLogos);
      setMyAssets(allMyAssets);
      
      // Load favorites from localStorage with error handling
      try {
        const savedFavorites = localStorage.getItem('logo-gallery-favorites');
        if (savedFavorites) {
          setFavorites(new Set(JSON.parse(savedFavorites)));
        }
      } catch (favError) {
        console.warn('Failed to load favorites:', favError);
        // Don't fail the entire operation for favorites
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load logos. Please try refreshing the page.';
      setErrorStates(prev => ({ ...prev, main: errorMessage }));
      console.error('Error loading logos:', err);
    } finally {
      setLoadingStates(prev => ({ ...prev, main: false }));
    }
  };

  // Enhanced search with loading states
  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setLoadingStates(prev => ({ ...prev, search: true }));
    setErrorStates(prev => ({ ...prev, search: null }));
    
    try {
      // Add some artificial delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // The filtering will be handled by applyFilters through useEffect
      
    } catch (error) {
      setErrorStates(prev => ({ 
        ...prev, 
        search: error instanceof Error ? error.message : 'Search failed' 
      }));
    } finally {
      setLoadingStates(prev => ({ ...prev, search: false }));
    }
  };

  // Toggle favorite status with enhanced error handling
  const toggleFavorite = async (logoId: string) => {
    if (loadingStates.favorites === logoId) return;
    
    setLoadingStates(prev => ({ ...prev, favorites: logoId }));
    setErrorStates(prev => ({ ...prev, favorites: null }));
    
    try {
      const newFavorites = new Set(favorites);
      if (newFavorites.has(logoId)) {
        newFavorites.delete(logoId);
      } else {
        newFavorites.add(logoId);
      }
      
      setFavorites(newFavorites);
      localStorage.setItem('logo-gallery-favorites', JSON.stringify(Array.from(newFavorites)));
      
    } catch (error) {
      setErrorStates(prev => ({ 
        ...prev, 
        favorites: error instanceof Error ? error.message : 'Failed to update favorites' 
      }));
    } finally {
      setLoadingStates(prev => ({ ...prev, favorites: null }));
    }
  };

  // Handle image loading states
  const handleImageLoad = (logoId: string) => {
    setLoadingStates(prev => ({
      ...prev,
      imageLoad: new Set([...prev.imageLoad].filter(id => id !== logoId))
    }));
    setErrorStates(prev => ({
      ...prev,
      images: new Map([...prev.images].filter(([id]) => id !== logoId))
    }));
  };

  const handleImageError = (logoId: string, errorMsg = 'Failed to load image') => {
    setLoadingStates(prev => ({
      ...prev,
      imageLoad: new Set([...prev.imageLoad].filter(id => id !== logoId))
    }));
    setErrorStates(prev => ({
      ...prev,
      images: new Map(prev.images.set(logoId, errorMsg))
    }));
  };

  const handleImageLoadStart = (logoId: string) => {
    setLoadingStates(prev => ({
      ...prev,
      imageLoad: new Set([...prev.imageLoad, logoId])
    }));
  };

  // Handle operations with loading states
  const handleOperation = async (logoId: string, operation: () => Promise<void>, operationName = 'operation') => {
    if (loadingStates.operations.has(logoId)) return;
    
    setLoadingStates(prev => ({
      ...prev,
      operations: new Set([...prev.operations, logoId])
    }));
    setErrorStates(prev => ({
      ...prev,
      operations: new Map([...prev.operations].filter(([id]) => id !== logoId))
    }));
    
    try {
      await operation();
    } catch (error) {
      setErrorStates(prev => ({
        ...prev,
        operations: new Map(prev.operations.set(logoId, 
          error instanceof Error ? error.message : `Failed to ${operationName}`
        ))
      }));
    } finally {
      setLoadingStates(prev => ({
        ...prev,
        operations: new Set([...prev.operations].filter(id => id !== logoId))
      }));
    }
  };

  // Load search history
  const loadSearchHistory = () => {
    try {
      const history = localStorage.getItem('logo-gallery-search-history');
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    } catch (error) {
      console.warn('Failed to load search history:', error);
    }
  };

  // Save search to history
  const saveSearchHistory = (query: string) => {
    if (!query.trim()) return;
    
    const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem('logo-gallery-search-history', JSON.stringify(newHistory));
  };

  // Utility functions
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatEnumValue = (value: string): string => {
    return value.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };

  const getCategoryCounts = () => {
    const counts: Record<string, number> = {};
    currentLogos.forEach(logo => {
      if (logo.category) {
        counts[logo.category] = (counts[logo.category] || 0) + 1;
      }
    });
    return counts;
  };

  const getStyleCounts = () => {
    const counts: Record<string, number> = {};
    currentLogos.forEach(logo => {
      if (logo.style) {
        counts[logo.style] = (counts[logo.style] || 0) + 1;
      }
    });
    return counts;
  };

  const getGridSizeClass = () => {
    switch (viewMode.gridSize) {
      case 'small':
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4';
      case 'medium':
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6';
      case 'large':
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8';
      default:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6';
    }
  };

  // Filter and search logic
  const applyFilters = () => {
    let filtered = [...currentLogos];

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(logo =>
        logo.file.name.toLowerCase().includes(query) ||
        logo.description?.toLowerCase().includes(query) ||
        logo.keywords?.some(keyword => keyword.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (filters.category !== 'ALL') {
      filtered = filtered.filter(logo => logo.category === filters.category);
    }

    // Style filter
    if (filters.style !== 'ALL') {
      filtered = filtered.filter(logo => logo.style === filters.style);
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const startDate = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(logo => new Date(logo.uploadedAt) >= startDate);
    }

    // Size range filter
    if (filters.sizeRange !== 'all') {
      filtered = filtered.filter(logo => {
        const sizeMB = logo.file.size / (1024 * 1024);
        switch (filters.sizeRange) {
          case 'small':
            return sizeMB < 1;
          case 'medium':
            return sizeMB >= 1 && sizeMB < 5;
          case 'large':
            return sizeMB >= 5;
          default:
            return true;
        }
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
        case 'oldest':
          return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
        case 'name':
          return a.file.name.localeCompare(b.file.name);
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        case 'size':
          return b.file.size - a.file.size;
        case 'popularity':
          // For now, sort by favorites, then by newest
          const aFav = favorites.has(a.id) ? 1 : 0;
          const bFav = favorites.has(b.id) ? 1 : 0;
          if (aFav !== bFav) return bFav - aFav;
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
        default:
          return 0;
      }
    });

    setFilteredLogos(filtered);
  };

  // Search suggestions
  const searchSuggestions = useMemo(() => {
    if (!filters.searchQuery || filters.searchQuery.length < 2) return [];

    const suggestions: SearchSuggestion[] = [];
    const query = filters.searchQuery.toLowerCase();

    // Category suggestions
    Object.keys(getCategoryCounts()).forEach(category => {
      if (category.toLowerCase().includes(query)) {
        suggestions.push({
          type: 'category',
          value: formatEnumValue(category),
          count: getCategoryCounts()[category]
        });
      }
    });

    // Style suggestions
    Object.keys(getStyleCounts()).forEach(style => {
      if (style.toLowerCase().includes(query)) {
        suggestions.push({
          type: 'style',
          value: formatEnumValue(style),
          count: getStyleCounts()[style]
        });
      }
    });

    // Keyword suggestions from logo metadata
    const keywordCounts: Record<string, number> = {};
    currentLogos.forEach(logo => {
      logo.keywords?.forEach(keyword => {
        if (keyword.toLowerCase().includes(query)) {
          keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
        }
      });
    });

    Object.entries(keywordCounts).forEach(([keyword, count]) => {
      suggestions.push({
        type: 'keyword',
        value: keyword,
        count
      });
    });

    return suggestions.slice(0, 8);
  }, [filters.searchQuery, currentLogos]);

  const handleSearchSubmit = () => {
    if (filters.searchQuery.trim()) {
      saveSearchHistory(filters.searchQuery);
      performSearch(filters.searchQuery);
    }
    setShowSearchSuggestions(false);
  };

  const applySuggestion = (suggestion: SearchSuggestion) => {
    setFilters(prev => ({ ...prev, searchQuery: suggestion.value }));
    setShowSearchSuggestions(false);
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('logo-gallery-search-history');
  };

  const handleLogoClick = (logo: StoredLogoFile) => {
    if (onLogoSelect) {
      onLogoSelect(logo);
    }
  };

  const openPreviewModal = (logo: StoredLogoFile) => {
    setPreviewModal({ isOpen: true, logo });
  };

  const closePreviewModal = () => {
    setPreviewModal({ isOpen: false, logo: null });
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Network Status Banner */}
        {!errorStates.network && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center space-x-3">
            <WifiOff className="h-5 w-5 text-yellow-600" />
            <div className="flex-1">
              <p className="text-yellow-800 font-medium">You're currently offline</p>
              <p className="text-yellow-700 text-sm">Some features may not work properly until your connection is restored.</p>
            </div>
          </div>
        )}

        {/* Global Error Messages */}
        {errorStates.search && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800">{errorStates.search}</p>
            </div>
            <button
              onClick={() => setErrorStates(prev => ({ ...prev, search: null }))}
              className="text-red-600 hover:text-red-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {errorStates.favorites && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800">{errorStates.favorites}</p>
            </div>
            <button
              onClick={() => setErrorStates(prev => ({ ...prev, favorites: null }))}
              className="text-red-600 hover:text-red-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Enhanced Header */}
        <div className="mb-8 lg:mb-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-3 tracking-tight">
                Logo Gallery
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl">
                Browse and discover {currentLogos?.length || 0} professional logos
              </p>
            </div>
            
            {/* Enhanced View Controls */}
            <div className="flex items-center justify-center lg:justify-end space-x-3 mt-6 lg:mt-0">
              <div className="flex items-center bg-gray-100 rounded-xl p-1.5">
                <button
                  onClick={() => setViewMode(prev => ({ ...prev, type: 'grid' }))}
                  className={`p-3 rounded-lg transition-all duration-200 ${
                    viewMode.type === 'grid' 
                      ? 'bg-white text-indigo-600 shadow-md' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                  title="Grid view"
                >
                  <Grid className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode(prev => ({ ...prev, type: 'list' }))}
                  className={`p-3 rounded-lg transition-all duration-200 ${
                    viewMode.type === 'list' 
                      ? 'bg-white text-indigo-600 shadow-md' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                  title="List view"
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
              
              {viewMode.type === 'grid' && (
                <select
                  value={viewMode.gridSize}
                  onChange={(e) => setViewMode(prev => ({ 
                    ...prev, 
                    gridSize: e.target.value as 'small' | 'medium' | 'large' 
                  }))}
                  className="text-sm border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white shadow-sm hover:border-gray-400 transition-all duration-200"
                >
                  <option value="small">Small Grid</option>
                  <option value="medium">Medium Grid</option>
                  <option value="large">Large Grid</option>
                </select>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-8 border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('gallery')}
              className={`flex items-center space-x-2 pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'gallery'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Image className="h-5 w-5" />
              <span>Gallery</span>
              <span className="ml-2 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                {galleryLogos.length}
              </span>
            </button>
            
            <button
              onClick={() => setActiveTab('myAssets')}
              className={`flex items-center space-x-2 pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'myAssets'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Save className="h-5 w-5" />
              <span>My Assets</span>
              <span className="ml-2 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                {myAssets.length}
              </span>
            </button>
          </div>

          {/* Enhanced Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Enhanced Search with Loading States */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab === 'gallery' ? 'gallery' : 'your assets'} by name, keywords, category, style...`}
                value={filters.searchQuery}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, searchQuery: e.target.value }));
                  setShowSearchSuggestions(e.target.value.length > 0);
                }}
                onFocus={() => setShowSearchSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
                className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                disabled={loadingStates.search}
              />
              
              {/* Search Loading Indicator */}
              {loadingStates.search ? (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <RefreshCw className="h-4 w-4 text-indigo-600 animate-spin" />
                </div>
              ) : filters.searchQuery ? (
                <button
                  onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
              
              {/* Search Suggestions Dropdown */}
              {showSearchSuggestions && (searchSuggestions.length > 0 || searchHistory.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                  {searchSuggestions.length > 0 ? (
                    <>
                      <div className="px-4 py-2 text-sm font-medium text-gray-700 border-b bg-gray-50">
                        Suggestions
                      </div>
                      {searchSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => applySuggestion(suggestion)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between group"
                        >
                          <div className="flex items-center space-x-2">
                            {suggestion.type === 'keyword' && <TrendingUp className="h-4 w-4 text-blue-500" />}
                            {suggestion.type === 'category' && <Filter className="h-4 w-4 text-green-500" />}
                            {suggestion.type === 'style' && <Star className="h-4 w-4 text-purple-500" />}
                            {suggestion.type === 'recent' && <Clock className="h-4 w-4 text-gray-400" />}
                            <span className="text-sm text-gray-900">{suggestion.value}</span>
                          </div>
                          {suggestion.count && (
                            <span className="text-xs text-gray-500">
                              {suggestion.count} result{suggestion.count !== 1 ? 's' : ''}
                            </span>
                          )}
                        </button>
                      ))}
                    </>
                  ) : searchHistory.length > 0 ? (
                    <>
                      <div className="px-4 py-2 text-sm font-medium text-gray-700 border-b bg-gray-50 flex items-center justify-between">
                        <span>Recent Searches</span>
                        <button
                          onClick={clearSearchHistory}
                          className="text-xs text-indigo-600 hover:text-indigo-700"
                        >
                          Clear
                        </button>
                      </div>
                      {searchHistory.map((query, index) => (
                        <button
                          key={index}
                          onClick={() => applySuggestion({ type: 'recent', value: query })}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
                        >
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{query}</span>
                        </button>
                      ))}
                    </>
                  ) : null}
                </div>
              )}
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {(filters.category !== 'ALL' || filters.style !== 'ALL' || filters.dateRange !== 'all' || filters.sizeRange !== 'all') && (
                <span className="ml-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded-full">
                  Active
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Enhanced Filters Panel */}
        {showFilters && (
          <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value as LogoCategory | 'ALL' }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="ALL">All Categories</option>
                  {Object.entries(getCategoryCounts()).map(([category, count]) => (
                    <option key={category} value={category}>
                      {formatEnumValue(category)} ({count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Style Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Style
                </label>
                <select
                  value={filters.style}
                  onChange={(e) => setFilters(prev => ({ ...prev, style: e.target.value as LogoStyle | 'ALL' }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="ALL">All Styles</option>
                  {Object.entries(getStyleCounts()).map(([style, count]) => (
                    <option key={style} value={style}>
                      {formatEnumValue(style)} ({count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name">Name A-Z</option>
                  <option value="category">Category</option>
                  <option value="size">File Size</option>
                  <option value="popularity">Popularity</option>
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            {(filters.category !== 'ALL' || filters.style !== 'ALL' || filters.dateRange !== 'all' || filters.sizeRange !== 'all') && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setFilters({
                    category: 'ALL',
                    style: 'ALL',
                    searchQuery: '',
                    sortBy: 'newest',
                    dateRange: 'all',
                    sizeRange: 'all'
                  })}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Main Content */}
        {loadingStates.main ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading {activeTab === 'gallery' ? 'gallery' : 'your assets'}...</p>
            </div>
          </div>
        ) : errorStates.main ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-800 mb-2">Failed to Load {activeTab === 'gallery' ? 'Gallery' : 'My Assets'}</h3>
            <p className="text-red-700 mb-4">{errorStates.main}</p>
            <button
              onClick={() => loadLogos()}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </button>
          </div>
        ) : filteredLogos.length === 0 ? (
          <div className="text-center py-20">
            <div className="max-w-md mx-auto">
              {currentLogos.length === 0 ? (
                <>
                  <Image className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    {activeTab === 'gallery' ? 'No logos in gallery' : 'No saved assets yet'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {activeTab === 'gallery' 
                      ? 'Upload some logo files to get started with your gallery.' 
                      : 'Generate some logos and save them to see them here.'}
                  </p>
                </>
              ) : (
                <>
                  <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    No results found
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Try adjusting your search criteria or clearing the filters.
                  </p>
                  <button
                    onClick={() => setFilters(prev => ({ 
                      ...prev, 
                      searchQuery: '', 
                      category: 'ALL', 
                      style: 'ALL',
                      dateRange: 'all',
                      sizeRange: 'all'
                    }))}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Clear Search & Filters
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Results Summary */}
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {filteredLogos.length} of {currentLogos.length} {activeTab === 'gallery' ? 'gallery logos' : 'saved assets'}
                {filters.searchQuery && (
                  <span> for "<span className="font-medium">{filters.searchQuery}</span>"</span>
                )}
              </p>
            </div>

            {/* Logo Grid/List */}
            {viewMode.type === 'grid' ? (
              <div className={`grid ${getGridSizeClass()}`}>
                {filteredLogos.map((logo) => (
                  <div
                    key={logo.id}
                    className="group relative bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer"
                    onClick={() => handleLogoClick(logo)}
                  >
                    {/* Image Container */}
                    <div className="aspect-square bg-gray-50 relative overflow-hidden">
                      {loadingStates.imageLoad.has(logo.id) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                          <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
                        </div>
                      )}
                      
                      {errorStates.images.has(logo.id) ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-red-50">
                          <div className="text-center">
                            <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                            <p className="text-xs text-red-600">{errorStates.images.get(logo.id)}</p>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={logo.dataUrl}
                          alt={logo.file.name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                          onLoad={() => handleImageLoad(logo.id)}
                          onError={() => handleImageError(logo.id)}
                          onLoadStart={() => handleImageLoadStart(logo.id)}
                        />
                      )}

                      {/* Overlay Actions */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openPreviewModal(logo);
                            }}
                            className="p-2 bg-white text-gray-700 rounded-lg shadow-md hover:bg-gray-50 transition-colors"
                            title="Preview"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(logo.id);
                            }}
                            disabled={loadingStates.favorites === logo.id}
                            className={`p-2 rounded-lg shadow-md transition-colors ${
                              favorites.has(logo.id)
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                            title={favorites.has(logo.id) ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            {loadingStates.favorites === logo.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Heart className={`h-4 w-4 ${favorites.has(logo.id) ? 'fill-current' : ''}`} />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Favorite Badge */}
                      {favorites.has(logo.id) && (
                        <div className="absolute top-2 right-2">
                          <Heart className="h-5 w-5 text-red-500 fill-current" />
                        </div>
                      )}
                    </div>

                    {/* Logo Info */}
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 mb-1 truncate" title={logo.file.name}>
                        {logo.file.name}
                      </h3>
                      
                      <div className="space-y-1">
                        {logo.category && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Tag className="h-3 w-3 mr-1" />
                            {formatEnumValue(logo.category)}
                          </div>
                        )}
                        
                        {logo.style && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Palette className="h-3 w-3 mr-1" />
                            {formatEnumValue(logo.style)}
                          </div>
                        )}
                        
                        <div className="flex items-center text-xs text-gray-500">
                          <FileText className="h-3 w-3 mr-1" />
                          {formatFileSize(logo.file.size)}
                        </div>
                        
                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(logo.uploadedAt).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Keywords */}
                      {logo.keywords && logo.keywords.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {logo.keywords.slice(0, 3).map((keyword, index) => (
                            <span
                              key={index}
                              className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md"
                            >
                              {keyword}
                            </span>
                          ))}
                          {logo.keywords.length > 3 && (
                            <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-md">
                              +{logo.keywords.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* List View */
              <div className="space-y-4">
                {filteredLogos.map((logo) => (
                  <div
                    key={logo.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer"
                    onClick={() => handleLogoClick(logo)}
                  >
                    <div className="flex items-center p-4">
                      {/* Thumbnail */}
                      <div className="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0 mr-4">
                        {errorStates.images.has(logo.id) ? (
                          <div className="w-full h-full flex items-center justify-center bg-red-50">
                            <AlertCircle className="h-6 w-6 text-red-400" />
                          </div>
                        ) : (
                          <img
                            src={logo.dataUrl}
                            alt={logo.file.name}
                            className="w-full h-full object-contain"
                            onLoad={() => handleImageLoad(logo.id)}
                            onError={() => handleImageError(logo.id)}
                          />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900 truncate">{logo.file.name}</h3>
                          
                          {/* Actions */}
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(logo.id);
                              }}
                              disabled={loadingStates.favorites === logo.id}
                              className={`p-2 rounded-lg transition-colors ${
                                favorites.has(logo.id)
                                  ? 'text-red-500 hover:bg-red-50'
                                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              {loadingStates.favorites === logo.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Heart className={`h-4 w-4 ${favorites.has(logo.id) ? 'fill-current' : ''}`} />
                              )}
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openPreviewModal(logo);
                              }}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                          {logo.category && (
                            <span className="flex items-center">
                              <Tag className="h-3 w-3 mr-1" />
                              {formatEnumValue(logo.category)}
                            </span>
                          )}
                          
                          {logo.style && (
                            <span className="flex items-center">
                              <Palette className="h-3 w-3 mr-1" />
                              {formatEnumValue(logo.style)}
                            </span>
                          )}
                          
                          <span>{formatFileSize(logo.file.size)}</span>
                          <span>{new Date(logo.uploadedAt).toLocaleDateString()}</span>
                        </div>

                        {logo.description && (
                          <p className="mt-1 text-sm text-gray-600 truncate">{logo.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Preview Modal */}
        {previewModal.isOpen && previewModal.logo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">{previewModal.logo.file.name}</h2>
                <button
                  onClick={closePreviewModal}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Image */}
                  <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center min-h-[300px]">
                    <img
                      src={previewModal.logo.dataUrl}
                      alt={previewModal.logo.file.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  
                  {/* Details */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Details</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">File Size:</span>
                          <span className="text-gray-900">{formatFileSize(previewModal.logo.file.size)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Upload Date:</span>
                          <span className="text-gray-900">{new Date(previewModal.logo.uploadedAt).toLocaleDateString()}</span>
                        </div>
                        {previewModal.logo.category && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Category:</span>
                            <span className="text-gray-900">{formatEnumValue(previewModal.logo.category)}</span>
                          </div>
                        )}
                        {previewModal.logo.style && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Style:</span>
                            <span className="text-gray-900">{formatEnumValue(previewModal.logo.style)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {previewModal.logo.description && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                        <p className="text-sm text-gray-600">{previewModal.logo.description}</p>
                      </div>
                    )}
                    
                    {previewModal.logo.keywords && previewModal.logo.keywords.length > 0 && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">Keywords</h3>
                        <div className="flex flex-wrap gap-2">
                          {previewModal.logo.keywords.map((keyword, index) => (
                            <span
                              key={index}
                              className="inline-block px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="pt-4 space-y-3">
                      <button
                        onClick={() => {
                          handleLogoClick(previewModal.logo!);
                          closePreviewModal();
                        }}
                        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Select This Logo
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(previewModal.logo!.id);
                        }}
                        disabled={loadingStates.favorites === previewModal.logo.id}
                        className={`w-full py-2 px-4 rounded-lg transition-colors ${
                          favorites.has(previewModal.logo.id)
                            ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                            : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {loadingStates.favorites === previewModal.logo.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin mx-auto" />
                        ) : favorites.has(previewModal.logo.id) ? (
                          'Remove from Favorites'
                        ) : (
                          'Add to Favorites'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
