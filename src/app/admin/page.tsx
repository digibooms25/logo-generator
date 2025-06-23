import Link from 'next/link';
import { ArrowLeft, Upload, Plus, Trash2, Edit, Eye, FileImage } from 'lucide-react';

export default function AdminPage() {
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
              <h1 className="text-xl font-semibold text-gray-900">Admin Panel</h1>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/gallery"
                className="text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                View Gallery
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Auth Notice (temporary for MVP) */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
          <div className="flex">
            <div className="text-yellow-600 text-sm">
              <strong>Admin Access:</strong> This is a protected area for uploading and managing logos. 
              Authentication will be implemented in future versions.
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-sm border p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Upload New Content</h2>
              <p className="text-gray-600 mt-1">Add logos and SVG icons to the gallery</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Logo Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
              <FileImage className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Logos</h3>
              <p className="text-gray-600 mb-4">
                Add high-quality logo examples to inspire users
              </p>
              <div className="space-y-4">
                <button className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
                  <Upload className="mr-2 h-4 w-4" />
                  Choose Logo Files
                </button>
                <p className="text-xs text-gray-500">
                  Supported: PNG, JPEG, SVG (max 5MB each)
                </p>
              </div>
            </div>

            {/* SVG Icon Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
              <Plus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Upload SVG Icons</h3>
              <p className="text-gray-600 mb-4">
                Add vector icons for logo generation elements
              </p>
              <div className="space-y-4">
                <button className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                  <Upload className="mr-2 h-4 w-4" />
                  Choose SVG Files
                </button>
                <p className="text-xs text-gray-500">
                  Supported: SVG only (max 1MB each)
                </p>
              </div>
            </div>
          </div>

          {/* Bulk Upload Options */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Bulk Upload Options</h4>
            <div className="flex space-x-4">
              <button className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
                <Upload className="mr-2 h-4 w-4" />
                Upload Multiple Files
              </button>
              <button className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
                Import from URL
              </button>
            </div>
          </div>
        </div>

        {/* Management Section */}
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Manage Content</h2>
              <p className="text-gray-600 mt-1">View, edit, and organize uploaded content</p>
            </div>
            <div className="flex space-x-3">
              <select className="px-3 py-1 border border-gray-300 rounded-md text-sm">
                <option>All Categories</option>
                <option>Technology</option>
                <option>Healthcare</option>
                <option>Finance</option>
              </select>
              <select className="px-3 py-1 border border-gray-300 rounded-md text-sm">
                <option>All Types</option>
                <option>Logos</option>
                <option>Icons</option>
              </select>
            </div>
          </div>

          {/* Content Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preview
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Style
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Sample Data */}
                {[1, 2, 3, 4, 5].map((index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-xs text-gray-500">Logo</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">Sample Logo {index}</div>
                      <div className="text-sm text-gray-500">logo-{index}.png</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                        Technology
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Modern
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      2 days ago
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button className="text-indigo-600 hover:text-indigo-900">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="text-green-600 hover:text-green-900">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State (hidden when content exists) */}
          <div className="hidden text-center py-16">
            <FileImage className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No content uploaded yet</h3>
            <p className="text-gray-600 mb-6">Start by uploading your first logo or icon above.</p>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-6">
            <div className="text-sm text-gray-700">
              Showing <strong>1</strong> to <strong>5</strong> of <strong>12</strong> results
            </div>
            <div className="flex space-x-2">
              <button className="px-3 py-1 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm">
                Previous
              </button>
              <button className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm">
                1
              </button>
              <button className="px-3 py-1 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm">
                2
              </button>
              <button className="px-3 py-1 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 