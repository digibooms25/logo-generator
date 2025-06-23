"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Grid, List, Eye, Download, Heart, Star, X, Clock, TrendingUp, Calendar, FileText, Tag, Palette, AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
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

export default function LogoGallery({ 
  onLogoSelect,
  className = ''
}: LogoGalleryProps) {
  const [logos, setLogos] = useState<StoredLogoFile[]>([]);
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
  }, [logos, filters]);

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
      
      const allLogos = storageService.getAllLogos();
      setLogos(allLogos);
      
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

    try {
      setLoadingStates(prev => ({ ...prev, search: true }));
      setErrorStates(prev => ({ ...prev, search: null }));

      // Simulate search delay for better UX
      await new Promise(resolve => setTimeout(resolve, 300));
      
      saveSearchHistory(query);
      setShowSearchSuggestions(false);
      
    } catch (err) {
      setErrorStates(prev => ({ 
        ...prev, 
        search: 'Search failed. Please try again.' 
      }));
      console.error('Search error:', err);
    } finally {
      setLoadingStates(prev => ({ ...prev, search: false }));
    }
  };

  // Enhanced favorites toggle with loading and error handling
  const toggleFavorite = async (logoId: string) => {
    try {
      setLoadingStates(prev => ({ ...prev, favorites: logoId }));
      setErrorStates(prev => ({ ...prev, favorites: null }));

      const newFavorites = new Set(favorites);
      if (newFavorites.has(logoId)) {
        newFavorites.delete(logoId);
      } else {
        newFavorites.add(logoId);
      }
      
      // Simulate operation delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setFavorites(newFavorites);
      localStorage.setItem('logo-gallery-favorites', JSON.stringify([...newFavorites]));
      
    } catch (err) {
      setErrorStates(prev => ({ 
        ...prev, 
        favorites: 'Failed to update favorites. Please try again.' 
      }));
      console.error('Favorites error:', err);
    } finally {
      setLoadingStates(prev => ({ ...prev, favorites: null }));
    }
  };

  // Enhanced image loading with error handling
  const handleImageLoad = (logoId: string) => {
    setLoadingStates(prev => ({
      ...prev,
      imageLoad: new Set([...prev.imageLoad].filter(id => id !== logoId))
    }));
    setErrorStates(prev => {
      const newImages = new Map(prev.images);
      newImages.delete(logoId);
      return { ...prev, images: newImages };
    });
  };

  const handleImageError = (logoId: string, errorMsg = 'Failed to load image') => {
    setLoadingStates(prev => ({
      ...prev,
      imageLoad: new Set([...prev.imageLoad].filter(id => id !== logoId))
    }));
    setErrorStates(prev => {
      const newImages = new Map(prev.images);
      newImages.set(logoId, errorMsg);
      return { ...prev, images: newImages };
    });
  };

  const handleImageLoadStart = (logoId: string) => {
    setLoadingStates(prev => ({
      ...prev,
      imageLoad: new Set([...prev.imageLoad, logoId])
    }));
  };

  // Enhanced operation handling
  const handleOperation = async (logoId: string, operation: () => Promise<void>, operationName = 'operation') => {
    try {
      setLoadingStates(prev => ({
        ...prev,
        operations: new Set([...prev.operations, logoId])
      }));
      setErrorStates(prev => {
        const newOperations = new Map(prev.operations);
        newOperations.delete(logoId);
        return { ...prev, operations: newOperations };
      });

      await operation();
      
    } catch (err) {
      setErrorStates(prev => {
        const newOperations = new Map(prev.operations);
        newOperations.set(logoId, `Failed to ${operationName}. Please try again.`);
        return { ...prev, operations: newOperations };
      });
      console.error(`${operationName} error:`, err);
    } finally {
      setLoadingStates(prev => ({
        ...prev,
        operations: new Set([...prev.operations].filter(id => id !== logoId))
      }));
    }
  };

  const loadSearchHistory = () => {
    try {
      const saved = localStorage.getItem('logo-search-history');
      if (saved) {
        setSearchHistory(JSON.parse(saved));
      }
    } catch (err) {
      console.warn('Failed to load search history:', err);
    }
  };

  const saveSearchHistory = (query: string) => {
    if (!query.trim()) return;
    
    try {
      const updated = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
      setSearchHistory(updated);
      localStorage.setItem('logo-search-history', JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to save search history:', err);
    }
  };

  // Helper functions (moved above useMemo to avoid hoisting issues)
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatEnumValue = (value: string): string => {
    return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getCategoryCounts = () => {
    const counts: Record<string, number> = {};
    logos?.forEach(logo => {
      const category = logo.category || 'UNCATEGORIZED';
      counts[category] = (counts[category] || 0) + 1;
    });
    return counts;
  };

  const getStyleCounts = () => {
    const counts: Record<string, number> = {};
    logos?.forEach(logo => {
      const style = logo.style || 'NO_STYLE';
      counts[style] = (counts[style] || 0) + 1;
    });
    return counts;
  };

  const getGridSizeClass = () => {
    switch (viewMode.gridSize) {
      case 'small':
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8';
      case 'medium':
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6';
      case 'large':
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';
      default:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6';
    }
  };

  const applyFilters = () => {
    let filtered = [...(logos || [])];

    // Apply category filter
    if (filters.category !== 'ALL') {
      filtered = filtered.filter(logo => logo.category === filters.category);
    }

    // Apply style filter
    if (filters.style !== 'ALL') {
      filtered = filtered.filter(logo => logo.style === filters.style);
    }

    // Apply date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(logo => 
        new Date(logo.uploadedAt) >= filterDate
      );
    }

    // Apply size range filter
    if (filters.sizeRange !== 'all') {
      filtered = filtered.filter(logo => {
        const sizeInMB = logo.file.size / (1024 * 1024);
        switch (filters.sizeRange) {
          case 'small':
            return sizeInMB < 1;
          case 'medium':
            return sizeInMB >= 1 && sizeInMB < 5;
          case 'large':
            return sizeInMB >= 5;
          default:
            return true;
        }
      });
    }

    // Apply search filter
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(logo => {
        const searchableText = [
          logo.file.name,
          logo.description || '',
          logo.category || '',
          logo.style || '',
          ...(logo.keywords || [])
        ].join(' ').toLowerCase();
        
        return searchableText.includes(query);
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
        case 'oldest':
          return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
        case 'name':
          return a.file.name.localeCompare(b.file.name);
        case 'category':
          return (a.category || 'z').localeCompare(b.category || 'z');
        case 'size':
          return b.file.size - a.file.size;
        case 'popularity':
          // TODO: Implement popularity sorting based on usage/favorites
          return 0;
        default:
          return 0;
      }
    });

    setFilteredLogos(filtered);
  };

  // Computed search suggestions
  const searchSuggestions = useMemo<SearchSuggestion[]>(() => {
    if (!filters.searchQuery.trim() || filters.searchQuery.length < 2) {
      return [];
    }

    const query = filters.searchQuery.toLowerCase();
    const suggestions: SearchSuggestion[] = [];

    // Category suggestions
    const categoryMatches = Object.values(LogoCategory).filter(category =>
      category.toLowerCase().replace('_', ' ').includes(query)
    );
    categoryMatches.forEach(category => {
      const count = getCategoryCounts()[category] || 0;
      if (count > 0) {
        suggestions.push({
          type: 'category',
          value: formatEnumValue(category),
          count
        });
      }
    });

    // Style suggestions
    const styleMatches = Object.values(LogoStyle).filter(style =>
      style.toLowerCase().replace('_', ' ').includes(query)
    );
    styleMatches.forEach(style => {
      const count = getStyleCounts()[style] || 0;
      if (count > 0) {
        suggestions.push({
          type: 'style',
          value: formatEnumValue(style),
          count
        });
      }
    });

    // Keyword suggestions from existing logos
    const keywordCounts: Record<string, number> = {};
    logos.forEach(logo => {
      logo.keywords?.forEach(keyword => {
        if (keyword.toLowerCase().includes(query)) {
          keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
        }
      });
    });

    Object.entries(keywordCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .forEach(([keyword, count]) => {
        suggestions.push({
          type: 'keyword',
          value: keyword,
          count
        });
      });

    return suggestions.slice(0, 8); // Limit to 8 suggestions
  }, [filters.searchQuery, logos]);

  const handleSearchSubmit = () => {
    if (filters.searchQuery.trim()) {
      performSearch(filters.searchQuery);
    }
  };

  const applySuggestion = (suggestion: SearchSuggestion) => {
    setFilters(prev => ({ ...prev, searchQuery: suggestion.value }));
    setShowSearchSuggestions(false);
    performSearch(suggestion.value);
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('logo-search-history');
  };

  const handleLogoClick = (logo: StoredLogoFile) => {
    openPreviewModal(logo);
  };

  const openPreviewModal = (logo: StoredLogoFile) => {
    setPreviewModal({ isOpen: true, logo });
  };

  const closePreviewModal = () => {
    setPreviewModal({ isOpen: false, logo: null });
  };

  if (loadingStates.main) {
    return (
      <div className={`flex items-center justify-center min-h-64 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your logo gallery...</p>
        </div>
      </div>
    );
  }

  if (errorStates.main) {
    return (
      <div className={`flex items-center justify-center min-h-64 ${className}`}>
        <div className="text-center">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="text-red-800 mb-4">{errorStates.main}</p>
              <button
                onClick={() => loadLogos()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
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
              Browse and discover {logos?.length || 0} professional logos designed for modern brands
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

        {/* Enhanced Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Enhanced Search with Loading States */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, keywords, category, style..."
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

      {/* Enhanced Stats and Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <p className="text-sm text-gray-600">
            Showing {filteredLogos.length} of {logos.length} logos
          </p>
          {loadingStates.search && (
            <div className="flex items-center space-x-2 text-sm text-indigo-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Searching...</span>
            </div>
          )}
        </div>
        
        {/* Enhanced Sort Controls */}
        <select
          value={filters.sortBy}
          onChange={(e) => setFilters(prev => ({ 
            ...prev, 
            sortBy: e.target.value as GalleryFilters['sortBy'] 
          }))}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name">Name (A-Z)</option>
          <option value="category">Category</option>
          <option value="size">File Size</option>
          <option value="popularity">Popularity</option>
        </select>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-600">
          Showing {filteredLogos?.length || 0} of {logos?.length || 0} logos
        </p>
      </div>

      {/* Logo Display with Enhanced Loading States */}
      {filteredLogos.length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 max-w-md mx-auto">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Eye className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              {filters.searchQuery ? 'No matching logos found' : 'No logos found'}
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {filters.searchQuery 
                ? 'Try adjusting your search terms or filters to find what you\'re looking for.' 
                : 'No logos have been uploaded yet. Start building your collection by uploading some logos to the admin panel.'
              }
            </p>
            <div className="space-y-3">
              {filters.searchQuery ? (
                <button
                  onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                >
                  Clear Search
                </button>
              ) : (
                <a
                  href="/admin"
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                >
                  Go to Admin Panel
                </a>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className={viewMode.type === 'grid' 
          ? `grid ${getGridSizeClass()} gap-4 sm:gap-6 lg:gap-8` 
          : 'space-y-4'
        }>
          {filteredLogos.map((logo) => (
            <div
              key={logo.id}
              onClick={() => handleLogoClick(logo)}
              className={`group cursor-pointer transition-all duration-300 hover:shadow-xl ${
                viewMode.type === 'grid' 
                  ? 'bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-indigo-300 transform hover:scale-105' 
                  : 'bg-white rounded-xl p-6 border border-gray-200 hover:border-indigo-300 flex items-center'
              }`}
            >
              {viewMode.type === 'grid' ? (
                <>
                  {/* Enhanced Grid View with Loading States */}
                  <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
                    {/* Image Loading State */}
                    {loadingStates.imageLoad.has(logo.id) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                        <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
                      </div>
                    )}
                    
                    {/* Image Error State */}
                    {errorStates.images.has(logo.id) ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 text-red-600">
                        <AlertCircle className="h-8 w-8 mb-2" />
                        <p className="text-xs text-center px-2">Failed to load</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleImageLoadStart(logo.id);
                            // Retry loading the image
                            const img = new Image();
                            img.onload = () => handleImageLoad(logo.id);
                            img.onerror = () => handleImageError(logo.id);
                            img.src = logo.dataUrl;
                          }}
                          className="mt-1 text-xs text-red-700 underline hover:text-red-800"
                        >
                          Retry
                        </button>
                      </div>
                    ) : (
                      <img
                        src={logo.dataUrl}
                        alt={logo.file.name}
                        className="max-w-full max-h-full object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-110"
                        onLoadStart={() => handleImageLoadStart(logo.id)}
                        onLoad={() => handleImageLoad(logo.id)}
                        onError={() => handleImageError(logo.id)}
                      />
                    )}

                    {/* Enhanced Action Buttons */}
                    <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(logo.id);
                        }}
                        disabled={loadingStates.favorites === logo.id}
                        className={`p-3 backdrop-blur-sm rounded-xl transition-all duration-200 shadow-lg ${
                          loadingStates.favorites === logo.id 
                            ? 'bg-gray-200 cursor-not-allowed' 
                            : 'bg-white/90 hover:bg-white'
                        }`}
                        title={favorites.has(logo.id) ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {loadingStates.favorites === logo.id ? (
                          <RefreshCw className="h-4 w-4 text-gray-500 animate-spin" />
                        ) : (
                          <Heart 
                            className={`h-4 w-4 ${
                              favorites.has(logo.id) 
                                ? 'text-red-500 fill-current' 
                                : 'text-gray-700'
                            }`} 
                          />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOperation(logo.id, async () => {
                            // TODO: Implement download functionality
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            console.log('Download logo:', logo);
                          }, 'download');
                        }}
                        disabled={loadingStates.operations.has(logo.id)}
                        className={`p-3 backdrop-blur-sm rounded-xl transition-all duration-200 shadow-lg ${
                          loadingStates.operations.has(logo.id) 
                            ? 'bg-gray-200 cursor-not-allowed' 
                            : 'bg-white/90 hover:bg-white'
                        }`}
                        title="Download logo"
                      >
                        {loadingStates.operations.has(logo.id) ? (
                          <RefreshCw className="h-4 w-4 text-gray-500 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 text-gray-700" />
                        )}
                      </button>
                    </div>

                    {/* Operation Error Display */}
                    {errorStates.operations.has(logo.id) && (
                      <div className="absolute bottom-2 left-2 right-2 bg-red-50 border border-red-200 rounded-lg p-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-red-800">{errorStates.operations.get(logo.id)}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setErrorStates(prev => {
                                const newOperations = new Map(prev.operations);
                                newOperations.delete(logo.id);
                                return { ...prev, operations: newOperations };
                              });
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Enhanced Logo Info */}
                  <div className="p-4 sm:p-5">
                    <h3 className="font-semibold text-gray-900 truncate mb-2 text-sm sm:text-base">
                      {logo.file.name}
                    </h3>
                    <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500 mb-3">
                      <span className="capitalize font-medium">
                        {logo.category?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) || 'Uncategorized'}
                      </span>
                      <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">
                        {formatFileSize(logo.file.size)}
                      </span>
                    </div>
                    {logo.keywords && logo.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {logo.keywords.slice(0, viewMode.gridSize === 'large' ? 3 : 2).map((keyword, index) => (
                          <span
                            key={index}
                            className="inline-block bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded-md font-medium"
                          >
                            {keyword}
                          </span>
                        ))}
                        {logo.keywords.length > (viewMode.gridSize === 'large' ? 3 : 2) && (
                          <span className="text-xs text-gray-400 font-medium">
                            +{logo.keywords.length - (viewMode.gridSize === 'large' ? 3 : 2)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Enhanced List View with Loading States */}
                  <div className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center mr-6 relative overflow-hidden">
                    {/* Image Loading State */}
                    {loadingStates.imageLoad.has(logo.id) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                        <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
                      </div>
                    )}
                    
                    {/* Image Error State */}
                    {errorStates.images.has(logo.id) ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 text-red-600">
                        <AlertCircle className="h-4 w-4 mb-1" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleImageLoadStart(logo.id);
                            const img = new Image();
                            img.onload = () => handleImageLoad(logo.id);
                            img.onerror = () => handleImageError(logo.id);
                            img.src = logo.dataUrl;
                          }}
                          className="text-xs text-red-700 underline hover:text-red-800"
                        >
                          Retry
                        </button>
                      </div>
                    ) : (
                      <img
                        src={logo.dataUrl}
                        alt={logo.file.name}
                        className="max-w-full max-h-full object-contain drop-shadow-sm"
                        onLoadStart={() => handleImageLoadStart(logo.id)}
                        onLoad={() => handleImageLoad(logo.id)}
                        onError={() => handleImageError(logo.id)}
                      />
                    )}
                    
                    {favorites.has(logo.id) && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <Heart className="h-2.5 w-2.5 text-white fill-current" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate text-lg mb-1">
                          {logo.file.name}
                        </h3>
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            {logo.category?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) || 'Uncategorized'}
                          </span>
                          {logo.style && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {logo.style.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          )}
                        </div>
                        {logo.description && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                            {logo.description}
                          </p>
                        )}
                        {logo.keywords && logo.keywords.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {logo.keywords.slice(0, 6).map((keyword, index) => (
                              <span
                                key={index}
                                className="inline-block bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-md font-medium"
                              >
                                {keyword}
                              </span>
                            ))}
                            {logo.keywords.length > 6 && (
                              <span className="text-xs text-gray-400 font-medium flex items-center">
                                +{logo.keywords.length - 6} more
                              </span>
                            )}
                          </div>
                        )}
                        
                        {/* Operation Error Display for List View */}
                        {errorStates.operations.has(logo.id) && (
                          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-red-800">{errorStates.operations.get(logo.id)}</p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setErrorStates(prev => {
                                    const newOperations = new Map(prev.operations);
                                    newOperations.delete(logo.id);
                                    return { ...prev, operations: newOperations };
                                  });
                                }}
                                className="text-red-600 hover:text-red-800"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-3 ml-6">
                        <div className="text-right">
                          <div className="text-xs text-gray-500 mb-1">File Size</div>
                          <span className="text-sm font-medium text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg">
                            {formatFileSize(logo.file.size)}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(logo.id);
                          }}
                          disabled={loadingStates.favorites === logo.id}
                          className={`p-2.5 rounded-xl transition-all duration-200 ${
                            loadingStates.favorites === logo.id 
                              ? 'bg-gray-200 cursor-not-allowed' 
                              : 'hover:bg-gray-100'
                          }`}
                          title={favorites.has(logo.id) ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          {loadingStates.favorites === logo.id ? (
                            <RefreshCw className="h-5 w-5 text-gray-500 animate-spin" />
                          ) : (
                            <Heart 
                              className={`h-5 w-5 ${
                                favorites.has(logo.id) 
                                  ? 'text-red-500 fill-current' 
                                  : 'text-gray-400'
                              }`} 
                            />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOperation(logo.id, async () => {
                              // TODO: Implement download functionality
                              await new Promise(resolve => setTimeout(resolve, 1000));
                              console.log('Download logo:', logo);
                            }, 'download');
                          }}
                          disabled={loadingStates.operations.has(logo.id)}
                          className={`p-1 rounded transition-colors ${
                            loadingStates.operations.has(logo.id) 
                              ? 'bg-gray-200 cursor-not-allowed' 
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          {loadingStates.operations.has(logo.id) ? (
                            <RefreshCw className="h-4 w-4 text-gray-500 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Enhanced Logo Preview Modal */}
      {previewModal.isOpen && previewModal.logo && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closePreviewModal();
            }
          }}
        >
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gray-50">
              <div className="flex items-center space-x-3">
                <Eye className="h-6 w-6 text-indigo-600" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Logo Preview
                  </h2>
                  <p className="text-sm text-gray-600">
                    {previewModal.logo.file.name}
                  </p>
                </div>
              </div>
              <button
                onClick={closePreviewModal}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex flex-col lg:flex-row h-full max-h-[calc(90vh-80px)]">
              {/* Logo Preview Section with Enhanced Loading */}
              <div className="flex-1 bg-gray-50 flex items-center justify-center p-8 min-h-[300px] lg:min-h-[400px] relative">
                {/* Image Loading State */}
                {previewModal.logo && loadingStates.imageLoad.has(previewModal.logo.id) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                      <RefreshCw className="h-12 w-12 text-gray-400 animate-spin mx-auto mb-4" />
                      <p className="text-gray-600">Loading preview...</p>
                    </div>
                  </div>
                )}
                
                {/* Image Error State */}
                {previewModal.logo && errorStates.images.has(previewModal.logo.id) ? (
                  <div className="text-center">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="h-10 w-10 text-red-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load preview</h3>
                    <p className="text-gray-600 mb-4">{errorStates.images.get(previewModal.logo.id)}</p>
                    <button
                      onClick={() => {
                        if (previewModal.logo) {
                          handleImageLoadStart(previewModal.logo.id);
                          const img = new Image();
                          img.onload = () => handleImageLoad(previewModal.logo!.id);
                          img.onerror = () => handleImageError(previewModal.logo!.id);
                          img.src = previewModal.logo.dataUrl;
                        }
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                ) : previewModal.logo ? (
                  <div className="max-w-full max-h-full flex items-center justify-center">
                    <img
                      src={previewModal.logo.dataUrl}
                      alt={previewModal.logo.file.name}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-lg bg-white p-4"
                      style={{ maxHeight: '400px', maxWidth: '400px' }}
                      onLoadStart={() => previewModal.logo && handleImageLoadStart(previewModal.logo.id)}
                      onLoad={() => previewModal.logo && handleImageLoad(previewModal.logo.id)}
                      onError={() => previewModal.logo && handleImageError(previewModal.logo.id, 'Failed to load preview image')}
                    />
                  </div>
                ) : null}
              </div>

              {/* Details Panel */}
              <div className="w-full lg:w-96 bg-white border-l overflow-y-auto">
                <div className="p-6 space-y-6">
                  {/* File Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-gray-500" />
                      File Information
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">File Name:</span>
                        <span className="text-gray-900 font-medium truncate ml-2">
                          {previewModal.logo.file.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">File Size:</span>
                        <span className="text-gray-900 font-medium">
                          {formatFileSize(previewModal.logo.file.size)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">File Type:</span>
                        <span className="text-gray-900 font-medium">
                          {previewModal.logo.file.type || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Uploaded:</span>
                        <span className="text-gray-900 font-medium">
                          {new Date(previewModal.logo.uploadedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Category and Style */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                      <Palette className="h-5 w-5 mr-2 text-gray-500" />
                      Classification
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-gray-500">Category:</span>
                        <div className="mt-1">
                          <span className="inline-block bg-indigo-100 text-indigo-800 text-sm px-3 py-1 rounded-full">
                            {previewModal.logo.category 
                              ? formatEnumValue(previewModal.logo.category)
                              : 'Uncategorized'
                            }
                          </span>
                        </div>
                      </div>
                      {previewModal.logo.style && (
                        <div>
                          <span className="text-sm text-gray-500">Style:</span>
                          <div className="mt-1">
                            <span className="inline-block bg-purple-100 text-purple-800 text-sm px-3 py-1 rounded-full">
                              {formatEnumValue(previewModal.logo.style)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Keywords */}
                  {previewModal.logo.keywords && previewModal.logo.keywords.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                        <Tag className="h-5 w-5 mr-2 text-gray-500" />
                        Keywords
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {previewModal.logo.keywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="inline-block bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {previewModal.logo.description && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">
                        Description
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {previewModal.logo.description}
                      </p>
                    </div>
                  )}

                  {/* Modal Operation Error Display */}
                  {previewModal.logo && errorStates.operations.has(previewModal.logo.id) && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="h-5 w-5 text-red-600" />
                          <p className="text-sm text-red-800">{errorStates.operations.get(previewModal.logo.id)}</p>
                        </div>
                        <button
                          onClick={() => {
                            if (previewModal.logo) {
                              setErrorStates(prev => {
                                const newOperations = new Map(prev.operations);
                                newOperations.delete(previewModal.logo!.id);
                                return { ...prev, operations: newOperations };
                              });
                            }
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions with Enhanced Loading States */}
                  <div className="border-t pt-6">
                    <div className="flex flex-col space-y-3">
                      {/* Primary Action - Select Logo */}
                      {onLogoSelect && (
                        <button
                          onClick={() => {
                            onLogoSelect(previewModal.logo!);
                            closePreviewModal();
                          }}
                          className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center"
                        >
                          <Star className="h-4 w-4 mr-2" />
                          Select This Logo
                        </button>
                      )}

                      {/* Secondary Actions with Loading States */}
                      <div className="flex space-x-3">
                        <button
                          onClick={() => toggleFavorite(previewModal.logo!.id)}
                          disabled={loadingStates.favorites === previewModal.logo!.id}
                          className={`flex-1 py-2 px-4 rounded-lg border transition-colors flex items-center justify-center text-sm font-medium ${
                            loadingStates.favorites === previewModal.logo!.id
                              ? 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed'
                              : favorites.has(previewModal.logo!.id)
                                ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {loadingStates.favorites === previewModal.logo!.id ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Heart 
                              className={`h-4 w-4 mr-2 ${
                                favorites.has(previewModal.logo!.id) 
                                  ? 'fill-current' 
                                  : ''
                              }`} 
                            />
                          )}
                          {loadingStates.favorites === previewModal.logo!.id 
                            ? 'Processing...'
                            : favorites.has(previewModal.logo!.id) 
                              ? 'Favorited' 
                              : 'Add to Favorites'
                          }
                        </button>

                        <button
                          onClick={() => {
                            handleOperation(previewModal.logo!.id, async () => {
                              // TODO: Implement download functionality
                              await new Promise(resolve => setTimeout(resolve, 1000));
                              console.log('Download logo:', previewModal.logo);
                            }, 'download');
                          }}
                          disabled={loadingStates.operations.has(previewModal.logo!.id)}
                          className={`flex-1 py-2 px-4 rounded-lg border transition-colors flex items-center justify-center text-sm font-medium ${
                            loadingStates.operations.has(previewModal.logo!.id)
                              ? 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {loadingStates.operations.has(previewModal.logo!.id) ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
                          {loadingStates.operations.has(previewModal.logo!.id) ? 'Downloading...' : 'Download'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 