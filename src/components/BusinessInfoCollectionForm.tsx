/**
 * Business Information Collection Form with LLM-powered parsing
 * Allows users to input business information naturally and automatically extract structured data
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building, 
  Wand2, 
  CheckCircle, 
  AlertCircle, 
  Lightbulb, 
  Loader2,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowRight
} from 'lucide-react';
import type { BusinessInfoExtractionRequest, BusinessInfoExtractionResponse } from '@/services/llm-integration';
import type { BusinessInformation, LogoCategory, LogoStyle, BusinessType } from '@/types/logo';

// Form data interface that matches the page structure
export interface BusinessFormData {
  companyName: string;
  industry: string;
  businessType: string;
  brandDescription: string;
  targetAudience: string;
  stylePreferences: string[];
  colorPreferences: string[];
  existingBranding?: {
    hasLogo?: boolean;
    brandColors?: string[];
    brandFonts?: string[];
    brandDescription?: string;
  };
  additionalRequirements?: string;
}

interface BusinessInfoCollectionFormProps {
  initialData?: Partial<BusinessFormData>;
  onDataChange: (data: BusinessFormData) => void;
  onSubmit: (data: BusinessFormData) => void;
  showAdvancedOptions?: boolean;
  inspirationLogo?: any; // Selected inspiration logo
}

interface LLMExtractionState {
  isProcessing: boolean;
  lastExtraction?: Partial<BusinessInformation>;
  confidence?: number;
  suggestions?: string[];
  missingFields?: string[];
  error?: string;
}

export default function BusinessInfoCollectionForm({
  initialData = {},
  onDataChange,
  onSubmit,
  showAdvancedOptions = false,
  inspirationLogo
}: BusinessInfoCollectionFormProps) {
  // Form state
  const [formData, setFormData] = useState<BusinessFormData>({
    companyName: '',
    industry: '',
    businessType: '',
    brandDescription: '',
    targetAudience: '',
    stylePreferences: [],
    colorPreferences: [],
    ...initialData
  });

  // LLM processing state
  const [llmState, setLLMState] = useState<LLMExtractionState>({
    isProcessing: false
  });

  // UI state
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [showLLMSection, setShowLLMSection] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(showAdvancedOptions);
  const [autoFillApplied, setAutoFillApplied] = useState(false);

  // Options for form fields
  const industryOptions = [
    { value: 'technology', label: 'Technology' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'finance', label: 'Finance' },
    { value: 'education', label: 'Education' },
    { value: 'retail', label: 'Retail' },
    { value: 'food_beverage', label: 'Food & Beverage' },
    { value: 'automotive', label: 'Automotive' },
    { value: 'real_estate', label: 'Real Estate' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'sports', label: 'Sports' },
    { value: 'nonprofit', label: 'Nonprofit' },
    { value: 'professional_services', label: 'Professional Services' },
    { value: 'beauty_fashion', label: 'Beauty & Fashion' },
    { value: 'travel_hospitality', label: 'Travel & Hospitality' },
    { value: 'other', label: 'Other' }
  ];

  const businessTypeOptions = [
    { value: 'startup', label: 'Startup' },
    { value: 'small_business', label: 'Small Business' },
    { value: 'enterprise', label: 'Enterprise' },
    { value: 'nonprofit', label: 'Nonprofit' },
    { value: 'personal_brand', label: 'Personal Brand' },
    { value: 'ecommerce', label: 'E-commerce' },
    { value: 'service_provider', label: 'Service Provider' },
    { value: 'product_company', label: 'Product Company' }
  ];

  const styleOptions = [
    'minimalist', 'modern', 'classic', 'playful', 
    'professional', 'creative', 'bold', 'elegant',
    'vintage', 'geometric', 'organic', 'abstract'
  ];

  const colorOptions = [
    'blue', 'green', 'red', 'purple', 'orange', 
    'black', 'gray', 'gold', 'pink', 'teal', 
    'indigo', 'yellow', 'brown', 'white'
  ];

  // Update parent component when form data changes
  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  // Handle form field changes
  const handleInputChange = useCallback((field: keyof BusinessFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleCheckboxChange = useCallback((field: 'stylePreferences' | 'colorPreferences', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  }, []);

  // LLM extraction logic
  const extractBusinessInfo = useCallback(async (input: string) => {
    if (!input.trim()) return;

    setLLMState(prev => ({ ...prev, isProcessing: true, error: undefined }));

    try {
      const request: BusinessInfoExtractionRequest = {
        userInput: input,
        context: inspirationLogo ? `User has selected inspiration logo: ${inspirationLogo.file.name} (${inspirationLogo.category}, ${inspirationLogo.style})` : undefined
      };

      console.log('[CLIENT] Sending request to API:', request);

      const response = await fetch('/api/extract-business-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: BusinessInfoExtractionResponse = await response.json();

      console.log('[CLIENT] Received result:', result);

      if (result.success && result.extractedInfo) {
        setLLMState({
          isProcessing: false,
          lastExtraction: result.extractedInfo,
          confidence: result.confidence,
          suggestions: result.suggestions,
          missingFields: result.missingFields
        });
      } else {
        setLLMState({
          isProcessing: false,
          error: result.error || 'Failed to extract business information'
        });
      }
    } catch (error) {
      console.error('[CLIENT] Extraction error:', error);
      setLLMState({
        isProcessing: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    }
  }, [inspirationLogo]);

  // Auto-fill form with extracted data
  const applyLLMExtraction = useCallback(() => {
    if (!llmState.lastExtraction) return;

    const extraction = llmState.lastExtraction;
    
    setFormData(prev => ({
      ...prev,
      ...(extraction.companyName && { companyName: extraction.companyName }),
      ...(extraction.industry && { industry: extraction.industry }),
      ...(extraction.businessType && { businessType: extraction.businessType }),
      ...(extraction.targetAudience && { targetAudience: extraction.targetAudience }),
      ...(extraction.brandPersonality && { 
        brandDescription: prev.brandDescription || extraction.brandPersonality.join(', ') 
      }),
      ...(extraction.colorPreferences && { 
        colorPreferences: [...new Set([...prev.colorPreferences, ...extraction.colorPreferences])]
      }),
      ...(extraction.stylePreferences && { 
        stylePreferences: [...new Set([...prev.stylePreferences, ...extraction.stylePreferences])]
      }),
      ...(extraction.existingBranding && { existingBranding: extraction.existingBranding }),
      ...(extraction.additionalRequirements && { additionalRequirements: extraction.additionalRequirements })
    }));

    setAutoFillApplied(true);
    setTimeout(() => setAutoFillApplied(false), 3000);
  }, [llmState.lastExtraction]);

  // Handle natural language input
  const handleNaturalLanguageSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    extractBusinessInfo(naturalLanguageInput);
  }, [naturalLanguageInput, extractBusinessInfo]);

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    console.log('[BusinessInfoForm] Form submitted with data:', formData);
    console.log('[BusinessInfoForm] Has inspiration logo:', !!inspirationLogo);
    onSubmit(formData);
  }, [formData, onSubmit, inspirationLogo]);

  return (
    <div className="space-y-8">
      {/* Natural Language Input Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Sparkles className="h-5 w-5 text-indigo-600 mr-2" />
            <h3 className="text-lg font-semibold text-indigo-900">
              Smart Business Information Extraction
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowLLMSection(!showLLMSection)}
            className="text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            {showLLMSection ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>

        {showLLMSection && (
          <>
            <p className="text-indigo-700 text-sm mb-4">
              Describe your business in natural language and our AI will automatically extract and organize the information for you.
            </p>

            <form onSubmit={handleNaturalLanguageSubmit} className="space-y-4">
              <div>
                <textarea
                  value={naturalLanguageInput}
                  onChange={(e) => setNaturalLanguageInput(e.target.value)}
                  placeholder="e.g., 'I run TechCorp, a modern technology startup focused on helping small businesses. We target young entrepreneurs and prefer clean, professional designs with blue and white colors.'"
                  rows={4}
                  className="w-full px-3 py-2 border border-indigo-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
              </div>

              <div className="flex justify-between items-center">
                <button
                  type="submit"
                  disabled={!naturalLanguageInput.trim() || llmState.isProcessing}
                  className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {llmState.isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Extract Information
                    </>
                  )}
                </button>

                {naturalLanguageInput && (
                  <button
                    type="button"
                    onClick={() => setNaturalLanguageInput('')}
                    className="text-indigo-600 hover:text-indigo-800 text-sm transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>

            {/* LLM Results */}
            {llmState.error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                  <span className="text-red-700 text-sm">{llmState.error}</span>
                </div>
              </div>
            )}

            {llmState.lastExtraction && (
              <div className="mt-4 space-y-3">
                {/* Confidence Score */}
                <div className="flex items-center justify-between p-3 bg-white border border-indigo-200 rounded-md">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm font-medium text-gray-900">
                      Information extracted successfully
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 mr-2">Confidence:</span>
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(llmState.confidence || 0) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700">
                        {Math.round((llmState.confidence || 0) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Apply Extraction Button */}
                <button
                  type="button"
                  onClick={applyLLMExtraction}
                  className={`w-full flex items-center justify-center px-4 py-2 border-2 border-dashed rounded-md transition-all ${
                    autoFillApplied 
                      ? 'border-green-300 bg-green-50 text-green-700' 
                      : 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:border-indigo-400 hover:bg-indigo-100'
                  }`}
                >
                  {autoFillApplied ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Information Applied to Form
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Apply to Form Fields
                    </>
                  )}
                </button>

                {/* Suggestions */}
                {llmState.suggestions && llmState.suggestions.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <div className="flex items-start">
                      <Lightbulb className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium text-amber-800 mb-1">Suggestions for better results:</h4>
                        <ul className="text-sm text-amber-700 space-y-1">
                          {llmState.suggestions.map((suggestion, index) => (
                            <li key={index} className="flex items-start">
                              <span className="mr-2">•</span>
                              <span>{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Traditional Form Fields */}
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="flex items-center mb-6">
          <Building className="h-6 w-6 text-indigo-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Business Information</h2>
        </div>

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
              {industryOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
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
              {businessTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Brand Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Brand Description
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
              Target Audience
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
              {styleOptions.map((style) => (
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
              Color Preferences
            </label>
            <div className="flex flex-wrap gap-3">
              {colorOptions.map((color) => (
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

          {/* Advanced Options */}
          <div className="border-t pt-6">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center text-indigo-600 hover:text-indigo-800 transition-colors mb-4"
            >
              {showAdvanced ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
              <span className="text-sm font-medium">Advanced Options</span>
            </button>

            {showAdvanced && (
              <div className="space-y-6">
                {/* Existing Branding */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Do you have existing branding?
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.existingBranding?.hasLogo || false}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          existingBranding: {
                            ...prev.existingBranding,
                            hasLogo: e.target.checked
                          }
                        }))}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">We have an existing logo</span>
                    </label>

                    {formData.existingBranding?.hasLogo && (
                      <div className="ml-6 space-y-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Existing brand colors</label>
                          <input
                            type="text"
                            placeholder="e.g., #0066CC, blue, red"
                            value={formData.existingBranding.brandColors?.join(', ') || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              existingBranding: {
                                ...prev.existingBranding,
                                brandColors: e.target.value.split(',').map(c => c.trim()).filter(Boolean)
                              }
                            }))}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Existing brand description</label>
                          <textarea
                            rows={2}
                            placeholder="Describe your current branding"
                            value={formData.existingBranding.brandDescription || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              existingBranding: {
                                ...prev.existingBranding,
                                brandDescription: e.target.value
                              }
                            }))}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Requirements */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Requirements
                  </label>
                  <textarea
                    rows={3}
                    value={formData.additionalRequirements || ''}
                    onChange={(e) => handleInputChange('additionalRequirements', e.target.value)}
                    placeholder="Any specific requirements, restrictions, or notes for your logo design"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-6 border-t border-gray-200 gap-4">
            <div className="text-sm text-gray-600">
              {formData.companyName ? (
                <span className="text-green-600">✓ Ready to generate logos for {formData.companyName}</span>
              ) : (
                <span>Please fill in at least the company name and industry to continue</span>
              )}
            </div>
            <button
              type="submit"
              disabled={!formData.companyName || !formData.industry}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-lg shadow-lg"
              style={{ minHeight: '56px' }}
            >
              <Wand2 className="h-6 w-6" />
              <span>Continue to Logo Generation</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 