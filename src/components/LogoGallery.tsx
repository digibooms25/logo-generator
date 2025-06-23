"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Grid, List, Eye, Download, Heart, Star, X, Clock, TrendingUp, Calendar, FileText, Tag, Palette } from 'lucide-react';
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

export default function LogoGallery({ 
  onLogoSelect,
  className = ''
}: LogoGalleryProps) {
  const [logos, setLogos] = useState<StoredLogoFile[]>([]);
  const [filteredLogos, setFilteredLogos] = useState<StoredLogoFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
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

  const loadLogos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const allLogos = storageService.getAllLogos();
      setLogos(allLogos);
      
      // Load favorites from localStorage
      const savedFavorites = localStorage.getItem('logo-gallery-favorites');
      if (savedFavorites) {
        setFavorites(new Set(JSON.parse(savedFavorites)));
      }
    } catch (err) {
      setError('Failed to load logos. Please try refreshing the page.');
      console.error('Error loading logos:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSearchHistory = () => {
    const saved = localStorage.getItem('logo-search-history');
    if (saved) {
      setSearchHistory(JSON.parse(saved));
    }
  };

  const saveSearchHistory = (query: string) => {
    if (!query.trim()) return;
    
    const updated = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
    setSearchHistory(updated);
    localStorage.setItem('logo-search-history', JSON.stringify(updated));
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

    // Apply search filter with enhanced matching
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase().trim();
      
      filtered = filtered.filter(logo => {
        // Exact matches get higher priority
        const exactNameMatch = logo.file.name.toLowerCase() === query;
        const exactDescMatch = logo.description?.toLowerCase() === query;
        const exactKeywordMatch = logo.keywords?.some(k => k.toLowerCase() === query);
        
        // Partial matches
        const nameMatch = logo.file.name.toLowerCase().includes(query);
        const descMatch = logo.description?.toLowerCase().includes(query);
        const keywordMatch = logo.keywords?.some(keyword => 
          keyword.toLowerCase().includes(query)
        );
        const categoryMatch = logo.category?.toLowerCase().replace('_', ' ').includes(query);
        const styleMatch = logo.style?.toLowerCase().replace('_', ' ').includes(query);
        
        return exactNameMatch || exactDescMatch || exactKeywordMatch ||
               nameMatch || descMatch || keywordMatch || categoryMatch || styleMatch;
      });
    }

    // Apply sorting with enhanced options
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
          // Sort by favorites first, then by newest
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

  // Generate search suggestions
  const searchSuggestions = useMemo((): SearchSuggestion[] => {
    if (!filters.searchQuery.trim()) {
      // Show recent searches when no query
      return searchHistory.map(h => ({
        type: 'recent',
        value: h
      }));
    }

    const query = filters.searchQuery.toLowerCase();
    const suggestions: SearchSuggestion[] = [];

    // Add keyword suggestions
    const allKeywords = new Set<string>();
    logos.forEach(logo => {
      logo.keywords?.forEach(keyword => {
        if (keyword.toLowerCase().includes(query)) {
          allKeywords.add(keyword);
        }
      });
    });

    allKeywords.forEach(keyword => {
      const count = logos.filter(logo => 
        logo.keywords?.some(k => k.toLowerCase() === keyword.toLowerCase())
      ).length;
      suggestions.push({
        type: 'keyword',
        value: keyword,
        count
      });
    });

    // Add category suggestions
    Object.values(LogoCategory).forEach(category => {
      const formattedCategory = formatEnumValue(category);
      if (formattedCategory.toLowerCase().includes(query)) {
        const count = logos.filter(logo => logo.category === category).length;
        if (count > 0) {
          suggestions.push({
            type: 'category',
            value: formattedCategory,
            count
          });
        }
      }
    });

    // Add style suggestions
    Object.values(LogoStyle).forEach(style => {
      const formattedStyle = formatEnumValue(style);
      if (formattedStyle.toLowerCase().includes(query)) {
        const count = logos.filter(logo => logo.style === style).length;
        if (count > 0) {
          suggestions.push({
            type: 'style',
            value: formattedStyle,
            count
          });
        }
      }
    });

    return suggestions.slice(0, 8);
  }, [filters.searchQuery, logos, searchHistory]);

  const handleSearchSubmit = () => {
    if (filters.searchQuery.trim()) {
      saveSearchHistory(filters.searchQuery);
      setShowSearchSuggestions(false);
    }
  };

  const applySuggestion = (suggestion: SearchSuggestion) => {
    setFilters(prev => ({ ...prev, searchQuery: suggestion.value }));
    setShowSearchSuggestions(false);
    saveSearchHistory(suggestion.value);
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('logo-search-history');
  };

  const toggleFavorite = (logoId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(logoId)) {
      newFavorites.delete(logoId);
    } else {
      newFavorites.add(logoId);
    }
    
    setFavorites(newFavorites);
    localStorage.setItem('logo-gallery-favorites', JSON.stringify([...newFavorites]));
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

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-64 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your logo gallery...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-64 ${className}`}>
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800 mb-4">{error}</p>
            <button
              onClick={loadLogos}
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
          {/* Enhanced Search with Suggestions */}
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
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
            />
            {filters.searchQuery && (
              <button
                onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            
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

        {/* Enhanced Filter Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    category: e.target.value as LogoCategory | 'ALL' 
                  }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="ALL">All Categories ({logos?.length || 0})</option>
                  {Object.values(LogoCategory).map(category => {
                    const count = getCategoryCounts()[category] || 0;
                    return (
                      <option key={category} value={category}>
                        {formatEnumValue(category)} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Style Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Style
                </label>
                <select
                  value={filters.style}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    style: e.target.value as LogoStyle | 'ALL' 
                  }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="ALL">All Styles ({logos?.length || 0})</option>
                  {Object.values(LogoStyle).map(style => {
                    const count = getStyleCounts()[style] || 0;
                    return (
                      <option key={style} value={style}>
                        {formatEnumValue(style)} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Date
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    dateRange: e.target.value as 'all' | 'today' | 'week' | 'month' | 'year' 
                  }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Past Week</option>
                  <option value="month">Past Month</option>
                  <option value="year">Past Year</option>
                </select>
              </div>

              {/* Size Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File Size
                </label>
                <select
                  value={filters.sizeRange}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    sizeRange: e.target.value as 'all' | 'small' | 'medium' | 'large' 
                  }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="all">All Sizes</option>
                  <option value="small">Small (&lt; 1MB)</option>
                  <option value="medium">Medium (1-5MB)</option>
                  <option value="large">Large (&gt; 5MB)</option>
                </select>
              </div>

              {/* Sort Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    sortBy: e.target.value as 'newest' | 'oldest' | 'name' | 'category' | 'size' | 'popularity' 
                  }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="category">Category</option>
                  <option value="size">File Size</option>
                  <option value="popularity">Popularity</option>
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            {(filters.category !== 'ALL' || filters.style !== 'ALL' || filters.searchQuery || filters.dateRange !== 'all' || filters.sizeRange !== 'all') && (
              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={() => setFilters({
                    category: 'ALL',
                    style: 'ALL',
                    searchQuery: '',
                    sortBy: 'newest',
                    dateRange: 'all',
                    sizeRange: 'all'
                  })}
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-600">
          Showing {filteredLogos?.length || 0} of {logos?.length || 0} logos
        </p>
      </div>

      {/* Gallery Grid - Enhanced Responsive Layout */}
      {filteredLogos.length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 max-w-md mx-auto">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Eye className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">No logos found</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {(logos?.length || 0) === 0 
                ? "No logos have been uploaded yet. Start building your collection by uploading some logos to the admin panel."
                : "We couldn't find any logos matching your criteria. Try adjusting your search terms or filters to discover more options."
              }
            </p>
            {(logos?.length || 0) === 0 && (
              <a
                href="/admin"
                className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
              >
                Go to Admin Panel
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className={`grid gap-4 sm:gap-6 lg:gap-8 ${
          viewMode.type === 'grid' 
            ? getGridSizeClass()
            : 'grid-cols-1 max-w-4xl mx-auto'
        }`}>
          {filteredLogos.map((logo) => (
            <div
              key={logo.id}
              className={`group relative bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 ${
                viewMode.type === 'list' ? 'flex items-center p-4 sm:p-6' : 'overflow-hidden'
              }`}
              onClick={() => handleLogoClick(logo)}
            >
              {viewMode.type === 'grid' ? (
                <>
                  {/* Enhanced Grid View */}
                  <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6 relative overflow-hidden">
                    <img
                      src={logo.dataUrl}
                      alt={logo.file.name}
                      className="max-w-full max-h-full object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-logo.svg';
                      }}
                    />
                    
                    {/* Favorite Indicator */}
                    {favorites.has(logo.id) && (
                      <div className="absolute top-3 right-3 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                        <Heart className="h-3 w-3 text-white fill-current" />
                      </div>
                    )}
                  </div>
                  
                  {/* Enhanced Overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center">
                    <div className="flex space-x-3 mb-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(logo.id);
                        }}
                        className="p-3 bg-white/90 backdrop-blur-sm rounded-xl hover:bg-white transition-all duration-200 shadow-lg"
                        title={favorites.has(logo.id) ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Heart 
                          className={`h-4 w-4 ${
                            favorites.has(logo.id) 
                              ? 'text-red-500 fill-current' 
                              : 'text-gray-700'
                          }`} 
                        />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Implement download functionality
                        }}
                        className="p-3 bg-white/90 backdrop-blur-sm rounded-xl hover:bg-white transition-all duration-200 shadow-lg"
                        title="Download logo"
                      >
                        <Download className="h-4 w-4 text-gray-700" />
                      </button>
                    </div>
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
                  {/* Enhanced List View */}
                  <div className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center mr-6 relative overflow-hidden">
                    <img
                      src={logo.dataUrl}
                      alt={logo.file.name}
                      className="max-w-full max-h-full object-contain drop-shadow-sm"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-logo.svg';
                      }}
                    />
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
                          className="p-2.5 hover:bg-gray-100 rounded-xl transition-all duration-200"
                          title={favorites.has(logo.id) ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Heart 
                            className={`h-5 w-5 ${
                              favorites.has(logo.id) 
                                ? 'text-red-500 fill-current' 
                                : 'text-gray-400'
                            }`} 
                          />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Implement download functionality
                          }}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                          <Download className="h-4 w-4 text-gray-400" />
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

      {/* Logo Preview Modal */}
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
              {/* Logo Preview Section */}
              <div className="flex-1 bg-gray-50 flex items-center justify-center p-8 min-h-[300px] lg:min-h-[400px]">
                <div className="max-w-full max-h-full flex items-center justify-center">
                  <img
                    src={previewModal.logo.dataUrl}
                    alt={previewModal.logo.file.name}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg bg-white p-4"
                    style={{ maxHeight: '400px', maxWidth: '400px' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-logo.svg';
                    }}
                  />
                </div>
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

                  {/* Actions */}
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

                      {/* Secondary Actions */}
                      <div className="flex space-x-3">
                        <button
                          onClick={() => toggleFavorite(previewModal.logo!.id)}
                          className={`flex-1 py-2 px-4 rounded-lg border transition-colors flex items-center justify-center text-sm font-medium ${
                            favorites.has(previewModal.logo!.id)
                              ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <Heart 
                            className={`h-4 w-4 mr-2 ${
                              favorites.has(previewModal.logo!.id) 
                                ? 'fill-current' 
                                : ''
                            }`} 
                          />
                          {favorites.has(previewModal.logo!.id) ? 'Favorited' : 'Add to Favorites'}
                        </button>

                        <button
                          onClick={() => {
                            // TODO: Implement download functionality
                            console.log('Download logo:', previewModal.logo);
                          }}
                          className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center text-sm font-medium"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
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