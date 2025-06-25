'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, X } from 'lucide-react';
import { NavigationHeader, ProgressSteps, LogoGenerationInterface } from '@/components';
import { navigationConfigs } from '@/components/NavigationHeader';
import { progressConfigs } from '@/components/ProgressSteps';
import { LocalStorageService, type StoredLogoFile } from '@/services/local-storage';
export default function CreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedInspiration, setSelectedInspiration] = useState<StoredLogoFile | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    // Check if we have inspiration parameter and load selected logo
    const hasInspiration = searchParams.get('inspiration') === 'true';
    
    if (hasInspiration && typeof window !== 'undefined') {
      try {
        const storageService = LocalStorageService.getInstance();
        const inspiration = storageService.getSelectedLogo();
        if (inspiration) {
          setSelectedInspiration(inspiration);
        }
      } catch (error) {
        console.error('Failed to load inspiration:', error);
      }
    }
  }, [isMounted, searchParams]);

  const removeInspiration = () => {
    try {
      if (typeof window !== 'undefined') {
        const storageService = LocalStorageService.getInstance();
        storageService.clearSelectedLogo();
        setSelectedInspiration(null);
        // Update URL to remove inspiration parameter
        router.replace('/create');
      }
    } catch (error) {
      console.error('Failed to remove inspiration:', error);
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <NavigationHeader {...navigationConfigs.create(!!selectedInspiration)} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Inspiration Banner */}
        {selectedInspiration && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6 mb-8">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <img
                    src={selectedInspiration.dataUrl}
                    alt={selectedInspiration.file.name}
                    className="w-16 h-16 object-contain rounded-lg border border-gray-200 bg-white"
                  />
                </div>
                <div className="flex-grow">
                  <h3 className="text-lg font-semibold text-indigo-900 mb-1">
                    ✨ Using as Inspiration
                  </h3>
                  <p className="text-indigo-700 mb-2">
                    {selectedInspiration.file.name}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedInspiration.category && (
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                        {selectedInspiration.category}
                      </span>
                    )}
                    {selectedInspiration.style && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                        {selectedInspiration.style}
                      </span>
                    )}
                    {selectedInspiration.keywords?.slice(0, 3).map((keyword) => (
                      <span key={keyword} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={removeInspiration}
                className="flex-shrink-0 p-1 text-indigo-400 hover:text-indigo-600 transition-colors"
                title="Remove inspiration"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Progress Steps */}
        <div className="mb-8">
          <ProgressSteps 
            steps={progressConfigs.logoCreation('business-info', !!selectedInspiration)}
            currentStepId="business-info"
            variant="horizontal"
            className="max-w-3xl mx-auto"
          />
        </div>

        {/* Logo Generation Interface */}
        <LogoGenerationInterface
          inspirationLogo={selectedInspiration || undefined}
          onComplete={(generatedLogos) => {
            console.log('Generation complete:', generatedLogos);
            // Navigate to logo editor or export page
            // router.push('/editor');
          }}
          onBack={() => {
            router.push('/gallery');
          }}
        />
      </div>
    </div>
  );
} 