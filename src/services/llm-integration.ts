/**
 * LLM Integration Service for Business Information Extraction
 * Supports multiple LLM providers: OpenAI, Anthropic, and Google AI
 */

import { config, getPreferredLLMProvider, type LLMProvider } from '@/lib/config';
import type { 
  BusinessInformation, 
  LLMRequest, 
  LLMResponse
} from '@/types/logo';
import { LogoCategory, LogoStyle, BusinessType } from '@/types/logo';

// Extended interfaces for business information extraction
export interface BusinessInfoExtractionRequest {
  userInput: string;
  context?: string;
  provider?: LLMProvider;
  temperature?: number;
  maxTokens?: number;
}

export interface BusinessInfoExtractionResponse {
  success: boolean;
  extractedInfo?: Partial<BusinessInformation>;
  confidence?: number; // 0-1 confidence score
  suggestions?: string[];
  missingFields?: string[];
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  provider: LLMProvider;
  processingTime: number;
}

export interface LLMProviderConfig {
  apiKey: string;
  model: string;
  endpoint?: string;
  headers?: Record<string, string>;
}

// Custom error types
export class LLMAPIError extends Error {
  constructor(
    message: string,
    public provider: LLMProvider,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'LLMAPIError';
  }
}

export class LLMParsingError extends Error {
  constructor(
    message: string,
    public provider: LLMProvider,
    public rawResponse?: string
  ) {
    super(message);
    this.name = 'LLMParsingError';
  }
}

/**
 * LLM Integration Service
 */
class LLMIntegrationService {
  private readonly providers: Record<LLMProvider, LLMProviderConfig> = {
    openai: {
      apiKey: config.llm.openai.apiKey || '',
      model: config.llm.openai.model,
      endpoint: 'https://api.openai.com/v1/chat/completions',
    },
    anthropic: {
      apiKey: config.llm.anthropic.apiKey || '',
      model: config.llm.anthropic.model,
      endpoint: 'https://api.anthropic.com/v1/messages',
    },
    google: {
      apiKey: config.llm.google.apiKey || '',
      model: config.llm.google.model,
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    },
  };

  constructor() {
    // Log initialization status for debugging
    console.log('[LLM] Initializing LLM service with providers:', {
      openai: !!this.providers.openai.apiKey,
      anthropic: !!this.providers.anthropic.apiKey,
      google: !!this.providers.google.apiKey,
    });
    
    // Debug environment loading
    if (typeof window === 'undefined') {
      console.log('[LLM] Environment debug:');
      console.log('- process.env.OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY);
      console.log('- process.env.OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length);
      console.log('- config.llm.openai.apiKey present:', !!config.llm.openai.apiKey);
      console.log('- config.llm.openai.apiKey length:', config.llm.openai.apiKey?.length);
      console.log('- config.llm.openai.model:', config.llm.openai.model);
    }
  }

  /**
   * Get the business information extraction prompt
   */
  private getExtractionPrompt(userInput: string, context?: string): string {
    const contextText = context ? `\nAdditional context: ${context}` : '';
    
    return `You are an expert business analyst. Extract business information from the following user input and return it as a valid JSON object.

User Input: "${userInput}"${contextText}

Extract the following information and return ONLY a valid JSON object with these fields:
{
  "companyName": "string (required - company/business name)",
  "industry": "string (required - business industry, must be one of: technology, healthcare, finance, education, retail, food_beverage, automotive, real_estate, entertainment, sports, nonprofit, professional_services, beauty_fashion, travel_hospitality, other)",
  "businessType": "string (required - must be one of: startup, small_business, enterprise, nonprofit, personal_brand, ecommerce, service_provider, product_company)",
  "targetAudience": "string (optional - who are the customers/target audience)",
  "brandPersonality": ["array of strings (optional - personality traits like 'professional', 'friendly', 'innovative', etc.)"],
  "colorPreferences": ["array of color names or hex codes (optional)"],
  "stylePreferences": ["array of style preferences - must be from: minimalist, modern, classic, playful, professional, creative, bold, elegant, vintage, geometric, organic, abstract"],
  "existingBranding": {
    "hasLogo": boolean,
    "brandColors": ["array of existing brand colors (optional)"],
    "brandFonts": ["array of existing fonts (optional)"],
    "brandDescription": "string (optional - description of existing branding)"
  },
  "additionalRequirements": "string (optional - any special requirements or notes)"
}

Rules:
1. Return ONLY valid JSON, no explanations or markdown
2. Use null for missing optional fields
3. Infer reasonable values when possible
4. If industry/businessType/stylePreferences don't match the allowed values, choose the closest match
5. Extract color preferences from any color mentions
6. Be conservative - only include information you're confident about

JSON Response:`;
  }

  /**
   * Send request to OpenAI
   */
  private async callOpenAI(prompt: string, options: LLMRequest): Promise<any> {
    const providerConfig = this.providers.openai;
    
    if (!providerConfig.apiKey) {
      throw new LLMAPIError('OpenAI API key is not configured', 'openai');
    }
    
    // Validate API key format
    if (!providerConfig.apiKey.startsWith('sk-')) {
      throw new LLMAPIError('Invalid OpenAI API key format. Keys should start with "sk-"', 'openai');
    }
    
    console.log(`[LLM] Making OpenAI request with model: ${providerConfig.model}`);
    
    const requestBody = {
      model: providerConfig.model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts business information and returns valid JSON.'
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: options.maxTokens || 1500,
      temperature: options.temperature || 0.3,
    };

    // Only add response_format for models that support it
    if (providerConfig.model === 'gpt-4' || providerConfig.model.includes('gpt-4') || providerConfig.model === 'gpt-3.5-turbo') {
      (requestBody as any).response_format = { type: 'json_object' };
    }
    
    const response = await fetch(providerConfig.endpoint!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerConfig.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch (e) {
        // Response is not JSON
      }
      
      console.error(`[LLM] OpenAI API error:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      throw new LLMAPIError(
        `OpenAI API error: ${response.status} ${response.statusText}${errorData.error?.message ? ` - ${errorData.error.message}` : ''}`,
        'openai',
        response.status,
        errorData
      );
    }

    return response.json();
  }

  /**
   * Send request to Anthropic
   */
  private async callAnthropic(prompt: string, options: LLMRequest): Promise<any> {
    const providerConfig = this.providers.anthropic;
    
    if (!providerConfig.apiKey) {
      throw new LLMAPIError('Anthropic API key is not configured', 'anthropic');
    }
    
    const response = await fetch(providerConfig.endpoint!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': providerConfig.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: providerConfig.model,
        max_tokens: options.maxTokens || 1500,
        temperature: options.temperature || 0.3,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new LLMAPIError(
        `Anthropic API error: ${response.status} ${response.statusText}`,
        'anthropic',
        response.status,
        errorData
      );
    }

    return response.json();
  }

  /**
   * Send request to Google AI
   */
  private async callGoogleAI(prompt: string, options: LLMRequest): Promise<any> {
    const providerConfig = this.providers.google;
    
    if (!providerConfig.apiKey) {
      throw new LLMAPIError('Google AI API key is not configured', 'google');
    }
    
    const url = `${providerConfig.endpoint}?key=${providerConfig.apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: options.maxTokens || 1500,
          temperature: options.temperature || 0.3,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new LLMAPIError(
        `Google AI API error: ${response.status} ${response.statusText}`,
        'google',
        response.status,
        errorData
      );
    }

    return response.json();
  }

  /**
   * Extract text response from provider-specific response format
   */
  private extractTextFromResponse(response: any, provider: LLMProvider): string {
    switch (provider) {
      case 'openai':
        return response.choices?.[0]?.message?.content || '';
      
      case 'anthropic':
        return response.content?.[0]?.text || '';
      
      case 'google':
        return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Extract usage information from provider response
   */
  private extractUsage(response: any, provider: LLMProvider) {
    switch (provider) {
      case 'openai':
        return response.usage ? {
          promptTokens: response.usage.prompt_tokens || 0,
          completionTokens: response.usage.completion_tokens || 0,
          totalTokens: response.usage.total_tokens || 0,
        } : undefined;
      
      case 'anthropic':
        return response.usage ? {
          promptTokens: response.usage.input_tokens || 0,
          completionTokens: response.usage.output_tokens || 0,
          totalTokens: (response.usage.input_tokens || 0) + (response.usage.output_tokens || 0),
        } : undefined;
      
      case 'google':
        return response.usageMetadata ? {
          promptTokens: response.usageMetadata.promptTokenCount || 0,
          completionTokens: response.usageMetadata.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata.totalTokenCount || 0,
        } : undefined;
      
      default:
        return undefined;
    }
  }

  /**
   * Parse and validate extracted business information
   */
  private parseBusinessInformation(jsonText: string): Partial<BusinessInformation> {
    try {
      const parsed = JSON.parse(jsonText);
      
      // Validate and clean the data
      const businessInfo: Partial<BusinessInformation> = {};
      
      // Required fields
      if (parsed.companyName && typeof parsed.companyName === 'string') {
        businessInfo.companyName = parsed.companyName.trim();
      }
      
      if (parsed.industry && typeof parsed.industry === 'string') {
        businessInfo.industry = this.validateIndustry(parsed.industry);
      }
      
      if (parsed.businessType && typeof parsed.businessType === 'string') {
        businessInfo.businessType = this.validateBusinessType(parsed.businessType);
      }
      
      // Optional fields
      if (parsed.targetAudience && typeof parsed.targetAudience === 'string') {
        businessInfo.targetAudience = parsed.targetAudience.trim();
      }
      
      if (Array.isArray(parsed.brandPersonality)) {
        businessInfo.brandPersonality = parsed.brandPersonality
          .filter((p: any) => typeof p === 'string')
          .map((p: any) => p.trim());
      }
      
      if (Array.isArray(parsed.colorPreferences)) {
        businessInfo.colorPreferences = parsed.colorPreferences
          .filter((c: any) => typeof c === 'string')
          .map((c: any) => c.trim());
      }
      
      if (Array.isArray(parsed.stylePreferences)) {
        businessInfo.stylePreferences = parsed.stylePreferences
          .filter((s: any) => this.isValidLogoStyle(s))
          .map((s: any) => s as LogoStyle);
      }
      
      if (parsed.existingBranding && typeof parsed.existingBranding === 'object') {
        businessInfo.existingBranding = {
          hasLogo: Boolean(parsed.existingBranding.hasLogo),
          ...(Array.isArray(parsed.existingBranding.brandColors) && {
            brandColors: parsed.existingBranding.brandColors
              .filter((c: any) => typeof c === 'string')
              .map((c: string) => c.trim())
          }),
          ...(Array.isArray(parsed.existingBranding.brandFonts) && {
            brandFonts: parsed.existingBranding.brandFonts
              .filter((f: any) => typeof f === 'string')
              .map((f: string) => f.trim())
          }),
          ...(parsed.existingBranding.brandDescription && 
             typeof parsed.existingBranding.brandDescription === 'string' && {
            brandDescription: parsed.existingBranding.brandDescription.trim()
          }),
        };
      }
      
      if (parsed.additionalRequirements && typeof parsed.additionalRequirements === 'string') {
        businessInfo.additionalRequirements = parsed.additionalRequirements.trim();
      }
      
      return businessInfo;
    } catch (error) {
      throw new LLMParsingError(
        `Failed to parse business information: ${error instanceof Error ? error.message : 'Unknown error'}`,
        getPreferredLLMProvider(),
        jsonText
      );
    }
  }

  /**
   * Validate and normalize industry
   */
  private validateIndustry(industry: string): LogoCategory {
    const normalized = industry.toLowerCase().replace(/[_\s-]/g, '_');
    const industryMap: Record<string, LogoCategory> = {
      tech: LogoCategory.TECHNOLOGY,
      technology: LogoCategory.TECHNOLOGY,
      software: LogoCategory.TECHNOLOGY,
      software_development: LogoCategory.TECHNOLOGY,
      it: LogoCategory.TECHNOLOGY,
      healthcare: LogoCategory.HEALTHCARE,
      health: LogoCategory.HEALTHCARE,
      medical: LogoCategory.HEALTHCARE,
      finance: LogoCategory.FINANCE,
      financial: LogoCategory.FINANCE,
      banking: LogoCategory.FINANCE,
      education: LogoCategory.EDUCATION,
      educational: LogoCategory.EDUCATION,
      retail: LogoCategory.RETAIL,
      ecommerce: LogoCategory.RETAIL,
      food: LogoCategory.FOOD_BEVERAGE,
      beverage: LogoCategory.FOOD_BEVERAGE,
      food_beverage: LogoCategory.FOOD_BEVERAGE,
      restaurant: LogoCategory.FOOD_BEVERAGE,
      automotive: LogoCategory.AUTOMOTIVE,
      car: LogoCategory.AUTOMOTIVE,
      real_estate: LogoCategory.REAL_ESTATE,
      realestate: LogoCategory.REAL_ESTATE,
      property: LogoCategory.REAL_ESTATE,
      entertainment: LogoCategory.ENTERTAINMENT,
      sports: LogoCategory.SPORTS,
      nonprofit: LogoCategory.NONPROFIT,
      professional_services: LogoCategory.PROFESSIONAL_SERVICES,
      consulting: LogoCategory.PROFESSIONAL_SERVICES,
      beauty: LogoCategory.BEAUTY_FASHION,
      fashion: LogoCategory.BEAUTY_FASHION,
      beauty_fashion: LogoCategory.BEAUTY_FASHION,
      travel: LogoCategory.TRAVEL_HOSPITALITY,
      hospitality: LogoCategory.TRAVEL_HOSPITALITY,
      travel_hospitality: LogoCategory.TRAVEL_HOSPITALITY,
    };
    
    return industryMap[normalized] || LogoCategory.OTHER;
  }

  /**
   * Validate and normalize business type
   */
  private validateBusinessType(businessType: string): BusinessType {
    const normalized = businessType.toLowerCase().replace(/[_\s-]/g, '_');
    const typeMap: Record<string, BusinessType> = {
      startup: BusinessType.STARTUP,
      small_business: BusinessType.SMALL_BUSINESS,
      smallbusiness: BusinessType.SMALL_BUSINESS,
      small: BusinessType.SMALL_BUSINESS,
      small_company: BusinessType.SMALL_BUSINESS,
      enterprise: BusinessType.ENTERPRISE,
      large: BusinessType.ENTERPRISE,
      corporation: BusinessType.ENTERPRISE,
      nonprofit: BusinessType.NONPROFIT,
      non_profit: BusinessType.NONPROFIT,
      personal_brand: BusinessType.PERSONAL_BRAND,
      personalbrand: BusinessType.PERSONAL_BRAND,
      personal: BusinessType.PERSONAL_BRAND,
      ecommerce: BusinessType.ECOMMERCE,
      e_commerce: BusinessType.ECOMMERCE,
      service_provider: BusinessType.SERVICE_PROVIDER,
      serviceprovider: BusinessType.SERVICE_PROVIDER,
      service: BusinessType.SERVICE_PROVIDER,
      product_company: BusinessType.PRODUCT_COMPANY,
      productcompany: BusinessType.PRODUCT_COMPANY,
      product: BusinessType.PRODUCT_COMPANY,
    };
    
    return typeMap[normalized] || BusinessType.SMALL_BUSINESS;
  }

  /**
   * Check if style is valid
   */
  private isValidLogoStyle(style: string): boolean {
    const validStyles = Object.values(LogoStyle);
    return validStyles.includes(style as LogoStyle);
  }

  /**
   * Calculate confidence score based on extracted information
   */
  private calculateConfidence(businessInfo: Partial<BusinessInformation>): number {
    let score = 0;
    let maxScore = 0;
    
    // Required fields (higher weight)
    maxScore += 30; // companyName
    if (businessInfo.companyName) score += 30;
    
    maxScore += 25; // industry
    if (businessInfo.industry) score += 25;
    
    maxScore += 25; // businessType
    if (businessInfo.businessType) score += 25;
    
    // Optional fields (lower weight)
    maxScore += 5; // targetAudience
    if (businessInfo.targetAudience) score += 5;
    
    maxScore += 5; // brandPersonality
    if (businessInfo.brandPersonality?.length) score += 5;
    
    maxScore += 5; // colorPreferences
    if (businessInfo.colorPreferences?.length) score += 5;
    
    maxScore += 5; // stylePreferences
    if (businessInfo.stylePreferences?.length) score += 5;
    
    return Math.min(score / maxScore, 1);
  }

  /**
   * Get missing required fields
   */
  private getMissingFields(businessInfo: Partial<BusinessInformation>): string[] {
    const missing: string[] = [];
    
    if (!businessInfo.companyName) missing.push('companyName');
    if (!businessInfo.industry) missing.push('industry');
    if (!businessInfo.businessType) missing.push('businessType');
    
    return missing;
  }

  /**
   * Generate suggestions for improvement
   */
  private generateSuggestions(businessInfo: Partial<BusinessInformation>): string[] {
    const suggestions: string[] = [];
    
    if (!businessInfo.targetAudience) {
      suggestions.push('Consider specifying your target audience for better logo design');
    }
    
    if (!businessInfo.colorPreferences?.length) {
      suggestions.push('Adding color preferences will help create a more targeted logo');
    }
    
    if (!businessInfo.stylePreferences?.length) {
      suggestions.push('Specifying style preferences (modern, classic, etc.) will improve results');
    }
    
    if (!businessInfo.brandPersonality?.length) {
      suggestions.push('Describing your brand personality helps create logos that match your values');
    }
    
    return suggestions;
  }

  /**
   * Extract business information from user input
   */
  async extractBusinessInformation(
    request: BusinessInfoExtractionRequest
  ): Promise<BusinessInfoExtractionResponse> {
    const startTime = Date.now();
    
    // Try to get preferred provider with error handling
    let provider: LLMProvider;
    try {
      provider = request.provider || getPreferredLLMProvider();
    } catch (error) {
      console.error('[LLM] Failed to get preferred provider:', error);
      // Try to find any available provider
      const available = this.getAvailableProviders();
      if (available.length === 0) {
        return {
          success: false,
          error: 'No LLM providers are configured with valid API keys',
          provider: 'openai',
          processingTime: Date.now() - startTime,
        };
      }
      provider = available[0];
      console.log(`[LLM] Using fallback provider: ${provider}`);
    }
    
    console.log(`[LLM] Starting extraction with provider: ${provider}`);
    console.log(`[LLM] User input: "${request.userInput}"`);
    
    // Check if provider is available
    if (!this.providers[provider]?.apiKey) {
      const error = `Provider ${provider} is not configured. Available providers: ${this.getAvailableProviders().join(', ')}`;
      console.error(`[LLM] ${error}`);
      throw new LLMAPIError(error, provider);
    }
    
    try {
      const prompt = this.getExtractionPrompt(request.userInput, request.context);
      const llmRequest: LLMRequest = {
        prompt,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
      };
      
      console.log(`[LLM] Generated prompt length: ${prompt.length} characters`);
      
      // Call the appropriate LLM provider
      let response: any;
      switch (provider) {
        case 'openai':
          response = await this.callOpenAI(prompt, llmRequest);
          break;
        case 'anthropic':
          response = await this.callAnthropic(prompt, llmRequest);
          break;
        case 'google':
          response = await this.callGoogleAI(prompt, llmRequest);
          break;
      }
      
      console.log(`[LLM] Received response from ${provider}`);
      
      // Extract text from response
      const responseText = this.extractTextFromResponse(response, provider);
      console.log(`[LLM] Extracted text length: ${responseText.length} characters`);
      
      // Parse business information
      const extractedInfo = this.parseBusinessInformation(responseText);
      console.log(`[LLM] Parsed info:`, extractedInfo);
      
      // Calculate metrics
      const confidence = this.calculateConfidence(extractedInfo);
      const missingFields = this.getMissingFields(extractedInfo);
      const suggestions = this.generateSuggestions(extractedInfo);
      const usage = this.extractUsage(response, provider);
      const processingTime = Date.now() - startTime;
      
      console.log(`[LLM] Extraction completed successfully in ${processingTime}ms with confidence ${confidence}`);
      
      return {
        success: true,
        extractedInfo,
        confidence,
        suggestions,
        missingFields,
        usage,
        provider,
        processingTime,
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error(`[LLM] Extraction failed after ${processingTime}ms:`, error);
      
      if (error instanceof LLMAPIError || error instanceof LLMParsingError) {
        return {
          success: false,
          error: error.message,
          provider,
          processingTime,
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        provider,
        processingTime,
      };
    }
  }

  /**
   * Health check for available LLM providers
   */
  async healthCheck(): Promise<Record<LLMProvider, { available: boolean; error?: string }>> {
    const results: Record<LLMProvider, { available: boolean; error?: string }> = {
      openai: { available: false },
      anthropic: { available: false },
      google: { available: false },
    };
    
    const checks = Object.keys(this.providers).map(async (providerKey) => {
      const provider = providerKey as LLMProvider;
      
      try {
        if (!this.providers[provider]?.apiKey) {
          results[provider] = { available: false, error: 'API key not configured' };
          return;
        }
        
        // Simple test extraction
        const testResult = await this.extractBusinessInformation({
          userInput: 'My company is TechCorp and we are a technology startup',
          provider,
          maxTokens: 100,
        });
        
        results[provider] = { available: testResult.success };
        if (!testResult.success) {
          results[provider].error = testResult.error;
        }
      } catch (error) {
        results[provider] = {
          available: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });
    
    await Promise.allSettled(checks);
    return results;
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): LLMProvider[] {
    const available = Object.entries(this.providers)
      .filter(([provider, config]) => {
        // Check both config and environment for API keys
        const envKey = provider === 'openai' ? process.env.OPENAI_API_KEY :
                      provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY :
                      provider === 'google' ? process.env.GOOGLE_AI_API_KEY : null;
        
        const hasConfigKey = config.apiKey && config.apiKey !== '';
        const hasEnvKey = envKey && envKey !== '';
        
        console.log(`[LLM] Provider ${provider}: config=${hasConfigKey}, env=${hasEnvKey}`);
        
        return hasConfigKey || hasEnvKey;
      })
      .map(([provider]) => provider as LLMProvider);
    
    console.log(`[LLM] Available providers: ${available.join(', ')}`);
    return available;
  }

  /**
   * Get provider configuration (without sensitive data)
   */
  getProviderInfo(provider: LLMProvider) {
    const config = this.providers[provider];
    if (!config) return null;
    
    return {
      model: config.model,
      available: Boolean(config.apiKey),
      endpoint: config.endpoint,
    };
  }
}

// Export singleton instance
export const llmService = new LLMIntegrationService();

// Export class for testing
export { LLMIntegrationService };

// Error types are already exported above 