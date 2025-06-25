'use client';

import { useState, useEffect } from 'react';
// import Link from 'next/link';
import { ArrowLeft, Upload, Plus, Trash2, Edit, Eye, FileImage, LogOut } from 'lucide-react';
import AdminAuth from '../../components/AdminAuth';
import LogoUpload from '../../components/LogoUpload';
import SVGIconUpload from '../../components/SVGIconUpload';
import AdminDashboard from '../../components/AdminDashboard';
import { NavigationHeader } from '@/components';
import { navigationConfigs } from '@/components/NavigationHeader';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const authenticated = sessionStorage.getItem('admin-authenticated') === 'true';
    setIsAuthenticated(authenticated);
    setIsLoading(false);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('admin-authenticated');
    setIsAuthenticated(false);
  };

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Show authentication form if not authenticated
  if (!isAuthenticated) {
    return <AdminAuth onAuthenticated={handleAuthenticated} />;
  }

  // Show admin panel if authenticated
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <NavigationHeader {...navigationConfigs.admin()} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Notice */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
          <div className="flex">
            <div className="text-green-600 text-sm">
              <strong>✅ Authenticated Successfully!</strong> You now have access to upload and manage logos. 
              Your session will remain active until you logout or close the browser.
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
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Logos</h3>
              <p className="text-gray-600 mb-4">
                Add high-quality logo examples to inspire users
              </p>
              <LogoUpload 
                maxFiles={5}
                onFilesUploaded={(files) => {
                  console.log('Uploaded files:', files);
                  // Here you would typically save to database or state management
                }}
              />
            </div>

            {/* SVG Icon Upload */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Upload SVG Icons</h3>
              <p className="text-gray-600 mb-4">
                Add vector icons for logo generation elements
              </p>
              <SVGIconUpload 
                maxFiles={20}
                maxSize={1024 * 1024} // 1MB for SVG icons
                onFilesUploaded={(files) => {
                  console.log('SVG icons uploaded:', files);
                  // Here you would typically save to database or state management
                }}
              />
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
        <AdminDashboard />
      </div>
    </div>
  );
} 