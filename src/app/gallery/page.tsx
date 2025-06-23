import Link from 'next/link';
import { Search, Filter, ArrowLeft, Grid, List } from 'lucide-react';

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link 
                href="/"
                className="flex items-center text-gray-600 hover:text-indigo-600 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Home
              </Link>
              <div className="h-6 border-l border-gray-300"></div>
              <h1 className="text-xl font-semibold text-gray-900">Logo Gallery</h1>
            </div>
            <Link
              href="/create"
              className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Create New Logo
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search logos by name, industry, or keywords..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
              <select className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                <option value="">All Categories</option>
                <option value="technology">Technology</option>
                <option value="healthcare">Healthcare</option>
                <option value="finance">Finance</option>
                <option value="education">Education</option>
                <option value="retail">Retail</option>
              </select>

              <select className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                <option value="">All Styles</option>
                <option value="minimalist">Minimalist</option>
                <option value="modern">Modern</option>
                <option value="classic">Classic</option>
                <option value="playful">Playful</option>
                <option value="professional">Professional</option>
              </select>

              <button className="flex items-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                <Filter className="h-4 w-4 mr-1" />
                More Filters
              </button>
            </div>

            {/* View Toggle */}
            <div className="flex border border-gray-300 rounded-md">
              <button className="p-2 bg-indigo-600 text-white rounded-l-md">
                <Grid className="h-4 w-4" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-r-md">
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Placeholder Logo Cards */}
          {[1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="aspect-square bg-gray-100 rounded-t-lg flex items-center justify-center">
                <div className="text-gray-400 text-sm">Logo Preview {index}</div>
              </div>
              <div className="p-4">
                <h3 className="font-medium text-gray-900">Sample Logo {index}</h3>
                <p className="text-sm text-gray-500 mt-1">Technology • Modern</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-gray-400">Added 2 days ago</span>
                  <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                    Use as Inspiration
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-12">
          <button className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 px-6 py-3 rounded-md font-medium transition-colors">
            Load More Logos
          </button>
        </div>

        {/* Empty State (hidden when logos exist) */}
        <div className="hidden text-center py-16">
          <div className="text-gray-400 text-6xl mb-4">🎨</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No logos found</h3>
          <p className="text-gray-600 mb-6">Try adjusting your search criteria or browse all categories.</p>
          <Link
            href="/admin"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Upload First Logo
          </Link>
        </div>
      </div>
    </div>
  );
} 