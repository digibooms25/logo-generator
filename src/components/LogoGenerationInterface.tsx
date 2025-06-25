/**
 * Logo Generation Interface Component
 * Integrates business information collection with AI logo generation workflow
 */

import React, { useState, useCallback } from 'react';
import { ChevronRight, Wand2, Download, RefreshCw, Heart, Eye, AlertTriangle, CheckCircle, Save } from 'lucide-react';
import BusinessInfoCollectionForm, { type BusinessFormData } from './BusinessInfoCollectionForm';
import { type GenerationProgress, type GeneratedLogo, type GenerationResult } from '@/services/logo-generation-workflow';
import { LocalStorageService, type StoredLogoFile } from '@/services/local-storage';

interface LogoGenerationInterfaceProps {
  inspirationLogo?: StoredLogoFile;
  onComplete?: (generatedLogos: GeneratedLogo[]) => void;
  onBack?: () => void;
}

interface GenerationSettings {
  generateMultiple: boolean;
  variationCount: number;
  customPrompt?: string;
}

export default function LogoGenerationInterface({
  inspirationLogo,
  onComplete,
  onBack
}: LogoGenerationInterfaceProps) {
  const [businessData, setBusinessData] = useState<BusinessFormData>({
    companyName: '',
    industry: '',
    businessType: '',
    brandDescription: '',
    targetAudience: '',
    stylePreferences: [],
    colorPreferences: [],
    existingBranding: {
      hasLogo: false
    },
    additionalRequirements: ''
  });

  const [generationSettings, setGenerationSettings] = useState<GenerationSettings>({
    generateMultiple: true,
    variationCount: 3
  });

  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [selectedLogo, setSelectedLogo] = useState<GeneratedLogo | null>(null);
  const [currentStep, setCurrentStep] = useState<'collect' | 'generate' | 'preview'>('collect');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // New state for save functionality
  const [savedLogos, setSavedLogos] = useState<Set<string>>(new Set());
  const [savingLogo, setSavingLogo] = useState<string | null>(null);

  const localStorageService = LocalStorageService.getInstance();

  // Convert URL to File object for saving
  const urlToFile = async (url: string, filename: string): Promise<File> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type });
  };

  // Save generated logo to My Assets
  const handleSaveLogo = useCallback(async (logo: GeneratedLogo) => {
    if (!logo.imageUrl) return;
    
    setSavingLogo(logo.id);
    
    try {
      // Convert URL to File
      const filename = `${logo.metadata.companyName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${logo.id}.png`;
      const file = await urlToFile(logo.imageUrl, filename);
      
      // Save to localStorage with metadata
      await localStorageService.saveToMyAssets(file, {
        category: 'other' as any,
        style: 'modern' as any,
        keywords: [
          logo.metadata.companyName,
          logo.metadata.industry,
          ...logo.metadata.styles,
          ...logo.metadata.colors,
          'ai-generated'
        ],
        description: `AI-generated logo for ${logo.metadata.companyName} (${logo.metadata.industry})`
      });
      
      setSavedLogos(prev => new Set([...prev, logo.id]));
      
      console.log('Logo saved successfully to My Assets');
      
    } catch (error) {
      console.error('Failed to save logo:', error);
    } finally {
      setSavingLogo(null);
    }
  }, [localStorageService]);

  // Handle business data form submission
  const handleBusinessDataSubmit = useCallback((data: BusinessFormData) => {
    setBusinessData(data);
    setCurrentStep('generate');
  }, []);

  // Handle generation settings change
  const handleSettingsChange = useCallback((settings: Partial<GenerationSettings>) => {
    setGenerationSettings(prev => ({ ...prev, ...settings }));
  }, []);

  // Start logo generation process
  const handleStartGeneration = useCallback(async () => {
    if (!businessData.companyName) {
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(null);
    setGenerationResult(null);
    setCurrentStep('generate');

    try {
      console.log('[CLIENT] Starting logo generation with inspiration:', !!inspirationLogo);
      
      const requestBody = {
        businessData,
        inspirationLogo,
        generateMultiple: generationSettings.generateMultiple,
        variationCount: generationSettings.variationCount,
        customPrompt: generationSettings.customPrompt
      };
      
      console.log('[CLIENT] Request body:', {
        companyName: requestBody.businessData.companyName,
        hasInspiration: !!requestBody.inspirationLogo,
        generateMultiple: requestBody.generateMultiple,
        variationCount: requestBody.variationCount
      });
      
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const response = await fetch('/api/generate-logo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      console.log('[CLIENT] Response status:', response.status);
      console.log('[CLIENT] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CLIENT] Response error text:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('[CLIENT] Response result:', {
        success: result.success,
        totalGenerated: result.totalGenerated,
        failedCount: result.failedCount,
        logoCount: result.logos?.length
      });
      
      console.log('[CLIENT] Logo generation result:', {
        success: result.success,
        totalGenerated: result.totalGenerated,
        failedCount: result.failedCount,
      });

      setGenerationResult(result);
      setIsGenerating(false);

      if (result.success && result.logos.length > 0) {
        setCurrentStep('preview');
        // Auto-select first successful logo
        const firstSuccessful = result.logos.find((logo: GeneratedLogo) => logo.status === 'completed');
        if (firstSuccessful) {
          setSelectedLogo(firstSuccessful);
        }
      }
    } catch (error) {
      console.error('[CLIENT] Generation failed:', error);
      setIsGenerating(false);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Network error - please check your connection and try again';
      } else if (error instanceof Error && error.name === 'AbortError') {
        errorMessage = 'Request timed out - generation may be taking too long';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setGenerationProgress({
        status: 'error' as any,
        currentStep: 'Error',
        completedSteps: 0,
        totalSteps: 0,
        percentage: 0,
        message: 'Generation failed',
        generatedLogos: [],
        error: errorMessage
      });
    }
  }, [businessData, inspirationLogo, generationSettings]);

  // Handle logo selection
  const handleLogoSelect = useCallback((logo: GeneratedLogo) => {
    setSelectedLogo(logo);
  }, []);

  // Generate variations of selected logo
  const handleGenerateVariations = useCallback(async () => {
    if (!selectedLogo) return;

    setIsGenerating(true);
    
    // Clear any previous error states
    setGenerationProgress(null);
    
    try {
      console.log('[CLIENT] Starting variation generation for logo:', selectedLogo.id);
      
      // Show progress immediately
      setGenerationProgress({
        status: 'generating_prompts' as any,
        currentStep: 'Starting variation generation',
        completedSteps: 0,
        totalSteps: 3,
        percentage: 10,
        message: 'Preparing to generate logo variations...',
        generatedLogos: []
      });
      
      // Create an AbortController for timeout (increased to 3 minutes for variations)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('[CLIENT] Variation request timed out after 3 minutes');
        controller.abort();
      }, 180000); // 3 minutes timeout for variations
      
      const response = await fetch('/api/generate-variations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalLogo: selectedLogo,
          variationCount: 3
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      console.log('[CLIENT] Variation response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CLIENT] Variation response error text:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const variationResult = await response.json();
      console.log('[CLIENT] Variation result:', {
        success: variationResult.success,
        totalGenerated: variationResult.totalGenerated,
        failedCount: variationResult.failedCount,
        logoCount: variationResult.logos?.length
      });

      if (variationResult.success) {
        setGenerationResult(prev => prev ? {
          ...prev,
          logos: [...prev.logos, ...variationResult.logos],
          totalGenerated: prev.totalGenerated + variationResult.totalGenerated
        } : variationResult);
        
        // Clear progress after success
        setGenerationProgress(null);
      } else {
        // Set error progress to show user-friendly message
        setGenerationProgress({
          status: 'error' as any,
          currentStep: 'Error generating variations',
          completedSteps: 0,
          totalSteps: 1,
          percentage: 0,
          message: 'Failed to generate variations',
          generatedLogos: [],
          error: variationResult.error || 'Unknown error during variation generation'
        });
      }

    } catch (error) {
      console.error('[CLIENT] Variation generation failed:', error);
      
      let errorMessage = 'Unknown error occurred during variation generation';
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Network error - please check your connection and try again';
      } else if (error instanceof Error && error.name === 'AbortError') {
        errorMessage = 'Variation generation timed out - this may take a few minutes';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setGenerationProgress({
        status: 'error' as any,
        currentStep: 'Error',
        completedSteps: 0,
        totalSteps: 3,
        percentage: 0,
        message: 'Variation generation failed',
        generatedLogos: [],
        error: errorMessage
      });
    } finally {
      setIsGenerating(false);
    }
  }, [selectedLogo]);

  // Retry generation
  const handleRetryGeneration = useCallback(() => {
    setGenerationProgress(null);
    handleStartGeneration();
  }, [handleStartGeneration]);

  // Complete workflow
  const handleComplete = useCallback(() => {
    if (onComplete && generationResult) {
      onComplete(generationResult.logos);
    }
  }, [onComplete, generationResult]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI Logo Generator
          </h1>
          <p className="text-gray-600">
            Create professional logos with artificial intelligence
          </p>
          {inspirationLogo && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                Generating logos inspired by: <span className="font-medium">{inspirationLogo.file.name}</span>
              </p>
            </div>
          )}
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4 mb-8">
          <div className={`flex items-center space-x-2 ${currentStep === 'collect' ? 'text-blue-600' : currentStep === 'generate' || currentStep === 'preview' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 'collect' ? 'bg-blue-100 text-blue-600' : currentStep === 'generate' || currentStep === 'preview' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
              1
            </div>
            <span className="text-sm font-medium">Business Info</span>
          </div>
          
          <ChevronRight className="w-4 h-4 text-gray-400" />
          
          <div className={`flex items-center space-x-2 ${currentStep === 'generate' ? 'text-blue-600' : currentStep === 'preview' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 'generate' ? 'bg-blue-100 text-blue-600' : currentStep === 'preview' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
              2
            </div>
            <span className="text-sm font-medium">Generate</span>
          </div>
          
          <ChevronRight className="w-4 h-4 text-gray-400" />
          
          <div className={`flex items-center space-x-2 ${currentStep === 'preview' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 'preview' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
              3
            </div>
            <span className="text-sm font-medium">Preview</span>
          </div>
        </div>

        {/* Step 1: Business Information Collection */}
        {currentStep === 'collect' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <BusinessInfoCollectionForm
              initialData={businessData}
              inspirationLogo={inspirationLogo}
              onDataChange={setBusinessData}
              onSubmit={handleBusinessDataSubmit}
              showAdvancedOptions={true}
            />
          </div>
        )}

        {/* Step 2: Generation Settings and Progress */}
        {currentStep === 'generate' && (
          <div className="space-y-6">
            {/* Generation Settings */}
            {!isGenerating && !generationResult && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Generation Settings
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="generateMultiple"
                      checked={generationSettings.generateMultiple}
                      onChange={(e) => handleSettingsChange({ generateMultiple: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="generateMultiple" className="text-sm font-medium text-gray-700">
                      Generate multiple logo variations
                    </label>
                  </div>

                  {generationSettings.generateMultiple && (
                    <div className="ml-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Number of variations
                      </label>
                      <select
                        value={generationSettings.variationCount}
                        onChange={(e) => handleSettingsChange({ variationCount: parseInt(e.target.value) })}
                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={5}>5</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom prompt (optional)
                    </label>
                    <textarea
                      value={generationSettings.customPrompt || ''}
                      onChange={(e) => handleSettingsChange({ customPrompt: e.target.value })}
                      placeholder="Add specific requirements or style directions..."
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={handleStartGeneration}
                    disabled={!businessData.companyName}
                    className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Wand2 className="w-5 h-5" />
                    <span>Generate Logos</span>
                  </button>
                  
                  {onBack && (
                    <button
                      onClick={onBack}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Generation Progress */}
            {isGenerating && generationProgress && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Generating Your Logos
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {generationProgress.currentStep}
                    </span>
                    <span className="text-sm text-gray-500">
                      {generationProgress.percentage}%
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-blue-700 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${generationProgress.percentage}%` }}
                    />
                  </div>
                  
                  <p className="text-sm text-gray-600">
                    {generationProgress.message}
                  </p>

                  {generationProgress.estimatedTimeRemaining && (
                    <p className="text-xs text-gray-500">
                      Estimated time remaining: {Math.ceil(generationProgress.estimatedTimeRemaining / 1000)}s
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Generation Error */}
            {generationProgress?.status === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center space-x-2 text-red-800 mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="font-medium">Generation Failed</h3>
                </div>
                <p className="text-sm text-red-700 mb-4">
                  {generationProgress.error || 'An unknown error occurred during generation.'}
                </p>
                <button
                  onClick={handleRetryGeneration}
                  className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retry Generation</span>
                </button>
              </div>
            )}

            {/* Generation Complete */}
            {generationResult && !isGenerating && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center space-x-2 text-green-800 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <h3 className="font-medium">Generation Complete!</h3>
                </div>
                <p className="text-sm text-green-700 mb-4">
                  Successfully generated {generationResult.totalGenerated} logos
                  {generationResult.failedCount > 0 && ` (${generationResult.failedCount} failed)`}
                </p>
                <button
                  onClick={() => setCurrentStep('preview')}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Results</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Logo Preview and Selection */}
        {currentStep === 'preview' && generationResult && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Generated Logos
                </h2>
                <div className="flex space-x-3">
                  <button
                    onClick={handleGenerateVariations}
                    disabled={!selectedLogo || isGenerating}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Generate Variations</span>
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={!selectedLogo}
                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    <span>Continue with Selection</span>
                  </button>
                </div>
              </div>

              {/* Logo Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {generationResult.logos
                  .filter(logo => logo.status === 'completed')
                  .map((logo) => (
                    <div
                      key={logo.id}
                      onClick={() => handleLogoSelect(logo)}
                      className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                        selectedLogo?.id === logo.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {/* Save Button */}
                      <div className="absolute top-2 left-2 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveLogo(logo);
                          }}
                          disabled={savingLogo === logo.id || savedLogos.has(logo.id)}
                          className={`p-2 rounded-full shadow-md transition-all ${
                            savedLogos.has(logo.id)
                              ? 'bg-green-500 text-white'
                              : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                          title={savedLogos.has(logo.id) ? 'Saved to My Assets' : 'Save to My Assets'}
                        >
                          {savingLogo === logo.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : savedLogos.has(logo.id) ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                        {logo.imageUrl ? (
                          <img
                            src={logo.imageUrl}
                            alt={`Logo for ${logo.metadata.companyName}`}
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <div className="text-gray-400 text-sm">No image</div>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p className="font-medium">{logo.metadata.companyName}</p>
                        <p className="text-xs">
                          {logo.metadata.styles.join(', ')} • {logo.metadata.colors.join(', ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          Generated in {Math.round(logo.metadata.processingTime / 1000)}s
                        </p>
                      </div>

                      {selectedLogo?.id === logo.id && (
                        <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                          <CheckCircle className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}
              </div>

              {/* Failed Logos */}
              {generationResult.logos.some(logo => logo.status === 'failed') && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    Failed Generations
                  </h3>
                  <div className="space-y-2">
                    {generationResult.logos
                      .filter(logo => logo.status === 'failed')
                      .map((logo) => (
                        <div key={logo.id} className="text-sm text-red-600">
                          {logo.error || 'Generation failed'}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
