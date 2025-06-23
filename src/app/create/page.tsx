'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Sparkles, Building, Palette, Download, X, Eye } from 'lucide-react';
import { LocalStorageService, type StoredLogoFile } from '@/services/local-storage';

export default function CreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedInspiration, setSelectedInspiration] = useState<StoredLogoFile | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    businessType: '',
    brandDescription: '',
    targetAudience: '',
    stylePreferences: [] as string[],
    colorPreferences: [] as string[]
  });

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
          // Pre-fill form based on inspiration
          setFormData(prev => ({
            ...prev,
            industry: inspiration.category || '',
            stylePreferences: inspiration.style ? [inspiration.style] : []
          }));
        }
      } catch (error) {
        console.error('Failed to load inspiration:', error);
      }
    }
  }, [isMounted, searchParams]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCheckboxChange = (field: 'stylePreferences' | 'colorPreferences', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Handle form submission for AI generation
    console.log('Form data:', formData);
    console.log('Selected inspiration:', selectedInspiration);
    
    // For now, just show a placeholder
    alert('AI generation feature coming soon! This will generate logos based on your input.');
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
              <h1 className="text-xl font-semibold text-gray-900">Create Logo</h1>
            </div>
            <Link
              href="/gallery"
              className="text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Browse Gallery
            </Link>
          </div>
        </div>
      </header>

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
          <div className="flex items-center justify-center space-x-8">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 bg-indigo-600 text-white rounded-full text-sm font-medium">
                1
              </div>
              <span className="ml-2 text-sm font-medium text-indigo-600">Business Info</span>
            </div>
            
            <div className="w-16 h-0.5 bg-gray-300"></div>
            
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                selectedInspiration 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-300 text-gray-600'
              }`}>
                {selectedInspiration ? '✓' : '2'}
              </div>
              <span className={`ml-2 text-sm font-medium ${
                selectedInspiration ? 'text-green-600' : 'text-gray-500'
              }`}>
                Inspiration {selectedInspiration ? '✓' : ''}
              </span>
            </div>
            
            <div className="w-16 h-0.5 bg-gray-300"></div>
            
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-300 text-gray-600 rounded-full text-sm font-medium">
                3
              </div>
              <span className="ml-2 text-sm font-medium text-gray-500">Generate</span>
            </div>
            
            <div className="w-16 h-0.5 bg-gray-300"></div>
            
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-300 text-gray-600 rounded-full text-sm font-medium">
                4
              </div>
              <span className="ml-2 text-sm font-medium text-gray-500">Customize</span>
            </div>
          </div>
        </div>

        {/* Step 1: Business Information */}
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="flex items-center mb-6">
            <Building className="h-6 w-6 text-indigo-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">Tell us about your business</h2>
          </div>
          
          <p className="text-gray-600 mb-8">
            Help our AI understand your brand by providing some basic information about your business.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                placeholder="Enter your company name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Industry */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry *
              </label>
              <select 
                required
                value={formData.industry}
                onChange={(e) => handleInputChange('industry', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select your industry</option>
                <option value="technology">Technology</option>
                <option value="healthcare">Healthcare</option>
                <option value="finance">Finance</option>
                <option value="education">Education</option>
                <option value="retail">Retail</option>
                <option value="food_beverage">Food & Beverage</option>
                <option value="automotive">Automotive</option>
                <option value="real_estate">Real Estate</option>
                <option value="entertainment">Entertainment</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Business Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Type
              </label>
              <select 
                value={formData.businessType}
                onChange={(e) => handleInputChange('businessType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select business type</option>
                <option value="startup">Startup</option>
                <option value="small_business">Small Business</option>
                <option value="enterprise">Enterprise</option>
                <option value="nonprofit">Nonprofit</option>
                <option value="personal_brand">Personal Brand</option>
                <option value="ecommerce">E-commerce</option>
              </select>
            </div>

            {/* Brand Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Describe your brand (optional)
              </label>
              <textarea
                rows={4}
                value={formData.brandDescription}
                onChange={(e) => handleInputChange('brandDescription', e.target.value)}
                placeholder="What does your company do? What makes it unique? What values does it represent?"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Audience (optional)
              </label>
              <input
                type="text"
                value={formData.targetAudience}
                onChange={(e) => handleInputChange('targetAudience', e.target.value)}
                placeholder="Who are your customers? (e.g., young professionals, families, businesses)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Style Preferences */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Preferred Style (select all that apply)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['minimalist', 'modern', 'classic', 'playful', 'professional', 'creative', 'bold', 'elegant'].map((style) => (
                  <label key={style} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.stylePreferences.includes(style)}
                      onChange={() => handleCheckboxChange('stylePreferences', style)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 capitalize">{style}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Color Preferences */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Color Preferences (optional)
              </label>
              <div className="flex flex-wrap gap-3">
                {['blue', 'green', 'red', 'purple', 'orange', 'black', 'gray', 'gold'].map((color) => (
                  <label key={color} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.colorPreferences.includes(color)}
                      onChange={() => handleCheckboxChange('colorPreferences', color)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 capitalize">{color}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-6">
              <Link
                href="/"
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              
              <button
                type="submit"
                className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                {selectedInspiration ? 'Continue to Generate' : 'Continue to Inspiration'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 