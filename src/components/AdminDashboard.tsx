"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  Trash2, 
  Edit, 
  Eye, 
  Download, 
  Tag, 
  Calendar,
  FileImage,
  MoreVertical,
  X,
  Check,
  AlertTriangle
} from 'lucide-react';
import { localStorageService, StoredLogoFile, StoredSVGIcon, storageHelpers } from '../services/local-storage';
import { LogoCategory, LogoStyle } from '../types/logo';

type ViewMode = 'grid' | 'list';
type ContentType = 'all' | 'logos' | 'icons';
type SortOption = 'newest' | 'oldest' | 'name' | 'size' | 'category';

interface FilterOptions {
  contentType: ContentType;
  category?: string;
  style?: string;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

interface EditModalData {
  isOpen: boolean;
  item: StoredLogoFile | StoredSVGIcon | null;
  type: 'logo' | 'icon' | null;
}

export default function AdminDashboard() {
  const [logos, setLogos] = useState<StoredLogoFile[]>([]);
  const [svgIcons, setSvgIcons] = useState<StoredSVGIcon[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filters, setFilters] = useState<FilterOptions>({
    contentType: 'all'
  });
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [editModal, setEditModal] = useState<EditModalData>({
    isOpen: false,
    item: null,
    type: null
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    items: string[];
    type: 'single' | 'bulk';
  }>({
    isOpen: false,
    items: [],
    type: 'single'
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load data from storage
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setIsLoading(true);
    try {
      const logoData = localStorageService.getAllLogos();
      const iconData = localStorageService.getAllSVGIcons();
      setLogos(logoData);
      setSvgIcons(iconData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Combined and filtered data
  const filteredData = useMemo(() => {
    let allItems: (StoredLogoFile | StoredSVGIcon & { itemType: 'logo' | 'icon' })[] = [];

    // Add logos
    if (filters.contentType === 'all' || filters.contentType === 'logos') {
      allItems.push(...logos.map(logo => ({ ...logo, itemType: 'logo' as const })));
    }

    // Add SVG icons
    if (filters.contentType === 'all' || filters.contentType === 'icons') {
      allItems.push(...svgIcons.map(icon => ({ ...icon, itemType: 'icon' as const })));
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      allItems = allItems.filter(item => 
        item.file.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.keywords?.some(keyword => keyword.toLowerCase().includes(query)) ||
        item.category?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (filters.category) {
      allItems = allItems.filter(item => item.category === filters.category);
    }

    // Apply style filter (logos only)
    if (filters.style) {
      allItems = allItems.filter(item => 
        'style' in item && item.style === filters.style
      );
    }

    // Apply date range filter
    if (filters.dateRange?.start || filters.dateRange?.end) {
      allItems = allItems.filter(item => {
        const uploadDate = new Date(item.uploadedAt);
        if (filters.dateRange?.start && uploadDate < filters.dateRange.start) return false;
        if (filters.dateRange?.end && uploadDate > filters.dateRange.end) return false;
        return true;
      });
    }

    // Sort data
    allItems.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
        case 'oldest':
          return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
        case 'name':
          return a.file.name.localeCompare(b.file.name);
        case 'size':
          return b.file.size - a.file.size;
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        default:
          return 0;
      }
    });

    return allItems;
  }, [logos, svgIcons, searchQuery, filters, sortBy]);

  // Get unique categories and styles for filters
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    logos.forEach(logo => logo.category && categories.add(logo.category));
    svgIcons.forEach(icon => icon.category && categories.add(icon.category));
    return Array.from(categories).sort();
  }, [logos, svgIcons]);

  const availableStyles = useMemo(() => {
    const styles = new Set<string>();
    logos.forEach(logo => logo.style && styles.add(logo.style));
    return Array.from(styles).sort();
  }, [logos]);

  // Handle item selection
  const handleItemSelect = (id: string, selected: boolean) => {
    const newSelected = new Set(selectedItems);
    if (selected) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const allIds = filteredData.map(item => item.id);
      setSelectedItems(new Set(allIds));
    } else {
      setSelectedItems(new Set());
    }
  };

  // Handle delete operations
  const handleDelete = (id: string) => {
    setDeleteConfirm({
      isOpen: true,
      items: [id],
      type: 'single'
    });
  };

  const handleBulkDelete = () => {
    setDeleteConfirm({
      isOpen: true,
      items: Array.from(selectedItems),
      type: 'bulk'
    });
  };

  const confirmDelete = () => {
    deleteConfirm.items.forEach(id => {
      // Try to delete as logo first, then as SVG icon
      const deleteSuccess = localStorageService.deleteLogo(id) || localStorageService.deleteSVGIcon(id);
      if (!deleteSuccess) {
        console.error(`Failed to delete item with ID: ${id}`);
      }
    });

    // Reload data and clear selection
    loadData();
    setSelectedItems(new Set());
    setDeleteConfirm({ isOpen: false, items: [], type: 'single' });
  };

  // Handle edit operations
  const handleEdit = (item: StoredLogoFile | StoredSVGIcon, type: 'logo' | 'icon') => {
    setEditModal({
      isOpen: true,
      item,
      type
    });
  };

  const handleSaveEdit = (updatedData: Partial<StoredLogoFile | StoredSVGIcon>) => {
    if (!editModal.item || !editModal.type) return;

    const success = editModal.type === 'logo' 
      ? localStorageService.updateLogo(editModal.item.id, updatedData)
      : localStorageService.updateSVGIcon(editModal.item.id, updatedData);

    if (success) {
      loadData();
      setEditModal({ isOpen: false, item: null, type: null });
    } else {
      console.error('Failed to update item');
    }
  };

  // Handle download
  const handleDownload = (item: StoredLogoFile | StoredSVGIcon) => {
    let content: string;
    let mimeType: string;
    let filename: string;

    if ('dataUrl' in item) {
      // Logo file
      content = item.dataUrl;
      mimeType = item.file.type;
      filename = item.file.name;
    } else {
      // SVG icon
      content = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(item.svgContent)}`;
      mimeType = 'image/svg+xml';
      filename = item.file.name;
    }

    const link = document.createElement('a');
    link.href = content;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Content Dashboard</h2>
          <p className="text-gray-600 mt-1">
            Manage your uploaded logos and SVG icons
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {logos.length + svgIcons.length} items total
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <div className="text-center">
          <FileImage className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            Dashboard Implementation
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            The admin dashboard will display uploaded logos ({logos.length}) and SVG icons ({svgIcons.length})
          </p>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-600">Features being implemented:</p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Search and filtering capabilities</li>
              <li>• Grid and list view modes</li>
              <li>• Bulk selection and deletion</li>
              <li>• Edit metadata functionality</li>
              <li>• Download individual files</li>
              <li>• Category and style organization</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, description, keywords, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Content Type Filter */}
          <select
            value={filters.contentType}
            onChange={(e) => setFilters({ ...filters, contentType: e.target.value as ContentType })}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Content</option>
            <option value="logos">Logos Only</option>
            <option value="icons">Icons Only</option>
          </select>

          {/* Category Filter */}
          <select
            value={filters.category || ''}
            onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Categories</option>
            {availableCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          {/* Style Filter (for logos) */}
          {(filters.contentType === 'all' || filters.contentType === 'logos') && (
            <select
              value={filters.style || ''}
              onChange={(e) => setFilters({ ...filters, style: e.target.value || undefined })}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Styles</option>
              {availableStyles.map(style => (
                <option key={style} value={style}>{style}</option>
              ))}
            </select>
          )}

          {/* Sort Options */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Name A-Z</option>
            <option value="size">Size (Largest)</option>
            <option value="category">Category</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center border border-gray-300 rounded-md">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400'}`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-indigo-900">
                {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setSelectedItems(new Set())}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBulkDelete}
                className="flex items-center px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Grid/List */}
      {filteredData.length === 0 ? (
        <div className="text-center py-12">
          <FileImage className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No content found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery || Object.values(filters).some(v => v && v !== 'all') 
              ? 'Try adjusting your search or filters'
              : 'Upload some logos or icons to get started'
            }
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border">
          {/* Select All Header */}
          <div className="border-b px-4 py-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedItems.size === filteredData.length && filteredData.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Select all {filteredData.length} items
              </span>
            </label>
          </div>

          {/* Content Display */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
              {filteredData.map((item) => (
                <ContentGridItem
                  key={item.id}
                  item={item}
                  selected={selectedItems.has(item.id)}
                  onSelect={(selected) => handleItemSelect(item.id, selected)}
                  onEdit={() => handleEdit(item, 'itemType' in item ? item.itemType : ('dataUrl' in item ? 'logo' : 'icon'))}
                  onDelete={() => handleDelete(item.id)}
                  onDownload={() => handleDownload(item)}
                />
              ))}
            </div>
          ) : (
            <div className="divide-y">
              {filteredData.map((item) => (
                <ContentListItem
                  key={item.id}
                  item={item}
                  selected={selectedItems.has(item.id)}
                  onSelect={(selected) => handleItemSelect(item.id, selected)}
                  onEdit={() => handleEdit(item, 'itemType' in item ? item.itemType : ('dataUrl' in item ? 'logo' : 'icon'))}
                  onDelete={() => handleDelete(item.id)}
                  onDownload={() => handleDownload(item)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editModal.isOpen && editModal.item && (
        <EditModal
          item={editModal.item}
          type={editModal.type!}
          onSave={handleSaveEdit}
          onClose={() => setEditModal({ isOpen: false, item: null, type: null })}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <DeleteConfirmModal
          itemCount={deleteConfirm.items.length}
          type={deleteConfirm.type}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm({ isOpen: false, items: [], type: 'single' })}
        />
      )}
    </div>
  );
}

// Grid Item Component
interface ContentGridItemProps {
  item: StoredLogoFile | StoredSVGIcon & { itemType?: 'logo' | 'icon' };
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onDownload: () => void;
}

function ContentGridItem({ item, selected, onSelect, onEdit, onDelete, onDownload }: ContentGridItemProps) {
  const [showActions, setShowActions] = useState(false);
  const isLogo = 'dataUrl' in item;

  return (
    <div 
      className={`relative bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow ${
        selected ? 'ring-2 ring-indigo-500' : ''
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-2 left-2 z-10">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
      </div>

      {/* Actions Menu */}
      {showActions && (
        <div className="absolute top-2 right-2 z-10 flex space-x-1">
          <button
            onClick={onDownload}
            className="p-1 bg-white rounded-full shadow-sm hover:bg-gray-50"
            title="Download"
          >
            <Download className="h-3 w-3 text-gray-600" />
          </button>
          <button
            onClick={onEdit}
            className="p-1 bg-white rounded-full shadow-sm hover:bg-gray-50"
            title="Edit"
          >
            <Edit className="h-3 w-3 text-gray-600" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 bg-white rounded-full shadow-sm hover:bg-gray-50"
            title="Delete"
          >
            <Trash2 className="h-3 w-3 text-red-600" />
          </button>
        </div>
      )}

      {/* Content Preview */}
      <div className="aspect-square bg-gray-50 flex items-center justify-center">
        {isLogo ? (
          <img
            src={item.dataUrl}
            alt={item.file.name}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div 
            className="w-16 h-16"
            dangerouslySetInnerHTML={{ __html: item.svgContent }}
          />
        )}
      </div>

      {/* Item Info */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-900 truncate" title={item.file.name}>
          {item.file.name}
        </h3>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500">
            {storageHelpers.formatFileSize(item.file.size)}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${
            isLogo ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
          }`}>
            {isLogo ? 'Logo' : 'Icon'}
          </span>
        </div>
        {item.category && (
          <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            {item.category}
          </span>
        )}
      </div>
    </div>
  );
}

// List Item Component
interface ContentListItemProps {
  item: StoredLogoFile | StoredSVGIcon & { itemType?: 'logo' | 'icon' };
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onDownload: () => void;
}

function ContentListItem({ item, selected, onSelect, onEdit, onDelete, onDownload }: ContentListItemProps) {
  const isLogo = 'dataUrl' in item;

  return (
    <div className="flex items-center p-4 hover:bg-gray-50">
      {/* Selection Checkbox */}
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => onSelect(e.target.checked)}
        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mr-4"
      />

      {/* Preview */}
      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
        {isLogo ? (
          <img
            src={item.dataUrl}
            alt={item.file.name}
            className="max-w-full max-h-full object-contain rounded"
          />
        ) : (
          <div 
            className="w-8 h-8"
            dangerouslySetInnerHTML={{ __html: item.svgContent }}
          />
        )}
      </div>

      {/* Item Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-3">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {item.file.name}
          </h3>
          <span className={`text-xs px-2 py-1 rounded-full ${
            isLogo ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
          }`}>
            {isLogo ? 'Logo' : 'Icon'}
          </span>
          {item.category && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              {item.category}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
          <span>{storageHelpers.formatFileSize(item.file.size)}</span>
          <span>{storageHelpers.formatDate(item.uploadedAt)}</span>
          {item.description && (
            <span className="truncate max-w-xs">{item.description}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onDownload}
          className="p-2 text-gray-400 hover:text-gray-600"
          title="Download"
        >
          <Download className="h-4 w-4" />
        </button>
        <button
          onClick={onEdit}
          className="p-2 text-gray-400 hover:text-gray-600"
          title="Edit"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-gray-400 hover:text-red-600"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Edit Modal Component
interface EditModalProps {
  item: StoredLogoFile | StoredSVGIcon;
  type: 'logo' | 'icon';
  onSave: (data: Partial<StoredLogoFile | StoredSVGIcon>) => void;
  onClose: () => void;
}

function EditModal({ item, type, onSave, onClose }: EditModalProps) {
  const [formData, setFormData] = useState({
    description: item.description || '',
    category: item.category || '',
    keywords: item.keywords?.join(', ') || '',
    style: ('style' in item ? item.style : '') || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updates: Partial<StoredLogoFile | StoredSVGIcon> = {
      description: formData.description || undefined,
      category: formData.category || undefined,
      keywords: formData.keywords ? formData.keywords.split(',').map(k => k.trim()).filter(k => k) : undefined,
    };

    if (type === 'logo' && formData.style) {
      (updates as Partial<StoredLogoFile>).style = formData.style as LogoStyle;
    }

    onSave(updates);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Edit {type === 'logo' ? 'Logo' : 'Icon'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500 bg-white"
              rows={3}
              placeholder="Add a description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500 bg-white"
              placeholder="e.g., Technology, Healthcare"
            />
          </div>

          {type === 'logo' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Style
              </label>
              <select
                value={formData.style}
                onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
              >
                <option value="">Select a style...</option>
                {Object.values(LogoStyle).map(style => (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Keywords
            </label>
            <input
              type="text"
              value={formData.keywords}
              onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500 bg-white"
              placeholder="keyword1, keyword2, keyword3"
            />
            <p className="text-xs text-gray-500 mt-1">Separate keywords with commas</p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Confirmation Modal
interface DeleteConfirmModalProps {
  itemCount: number;
  type: 'single' | 'bulk';
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmModal({ itemCount, type, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
          Delete {type === 'bulk' ? 'Multiple Items' : 'Item'}
        </h3>
        
        <p className="text-sm text-gray-500 text-center mb-6">
          Are you sure you want to delete {itemCount} item{itemCount !== 1 ? 's' : ''}? 
          This action cannot be undone.
        </p>

        <div className="flex justify-center space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
} 