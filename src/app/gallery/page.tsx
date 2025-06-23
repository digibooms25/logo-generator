"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogoGallery } from '@/components';
import { LocalStorageService, type StoredLogoFile } from '@/services/local-storage';

export default function GalleryPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogoSelect = (logo: StoredLogoFile) => {
    try {
      setIsLoading(true);
      // Only access localStorage in browser environment
      if (typeof window !== 'undefined') {
        const storageService = LocalStorageService.getInstance();
        storageService.setSelectedLogo(logo);
        router.push('/create?inspiration=true');
      }
    } catch (error) {
      console.error('Failed to select logo:', error);
      // Fallback navigation even if storage fails
      router.push('/create');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Selecting logo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="text-center mb-8 lg:mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Logo Gallery
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Browse through our collection of beautiful logos. Click on any logo to use it as inspiration for your new creation.
          </p>
        </div>

        <LogoGallery onLogoSelect={handleLogoSelect} />
      </div>
    </div>
  );
} 