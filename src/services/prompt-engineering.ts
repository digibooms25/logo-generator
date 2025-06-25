/**
 * Prompt Engineering Service for Logo Generation
 * Creates optimized prompts for Flux Kontext Pro based on business information and inspiration
 */

import type { BusinessFormData } from '@/components/BusinessInfoCollectionForm';
import type { StoredLogoFile } from '@/services/local-storage';

// Prompt templates and configurations
const LOGO_GENERATION_BASE_PROMPT = `Create a professional logo design for {companyName}. Style: {styleDescription}. Industry: {industryDescription}. Colors: {colorDescription}. Target audience: {audienceDescription}. Requirements: {requirements}. The logo should be clean, scalable, and suitable for both digital and print use.`;

const LOGO_EDITING_BASE_PROMPT = `Modify the existing logo design. Changes requested: {editingInstructions}. Maintain the core brand identity while implementing the requested modifications. Ensure the result remains professional and cohesive.`;

// Style descriptions for different logo styles
const STYLE_DESCRIPTIONS = {
  minimalist: 'clean, simple lines with plenty of whitespace, geometric shapes, modern typography',
  modern: 'contemporary design with bold shapes, gradient effects, sleek typography',
  classic: 'timeless design with traditional elements, serif fonts, elegant proportions',
  playful: 'fun and energetic with bright colors, whimsical elements, friendly typography',
  professional: 'sophisticated and trustworthy with balanced composition, corporate feel',
  creative: 'artistic and unique with custom illustrations, experimental typography',
  bold: 'strong visual impact with high contrast, thick lines, powerful typography',
  elegant: 'refined and luxurious with graceful curves, premium feel, sophisticated colors',
  vintage: 'retro-inspired with classic typography, aged effects, nostalgic elements',
  geometric: 'angular shapes, mathematical precision, structured composition',
  organic: 'natural flowing forms, curved lines, nature-inspired elements',
  abstract: 'conceptual design with symbolic elements, artistic interpretation'
};

// Industry-specific descriptors
const INDUSTRY_DESCRIPTIONS = {
  technology: 'tech-forward with digital elements, innovation-focused, forward-thinking',
  healthcare: 'trustworthy and caring with medical symbolism, healing colors, professional',
  finance: 'stable and secure with strong typography, conservative colors, trustworthy',
  education: 'knowledge-focused with learning symbols, approachable, inspiring',
  retail: 'customer-friendly with commercial appeal, attractive, accessible',
  food_beverage: 'appetizing and fresh with culinary elements, warm colors, inviting',
  automotive: 'dynamic and powerful with motion elements, strong lines, performance-oriented',
  real_estate: 'solid and reliable with architectural elements, stability, growth',
  entertainment: 'exciting and engaging with dynamic elements, vibrant colors, energetic',
  sports: 'active and competitive with athletic symbols, energetic, powerful',
  nonprofit: 'compassionate and hopeful with community elements, inspiring, trustworthy',
  professional_services: 'expert and reliable with clean design, professional, authoritative',
  beauty_fashion: 'stylish and attractive with elegant design, trendy, sophisticated',
  travel_hospitality: 'welcoming and adventurous with travel elements, inviting, global',
  other: 'unique and distinctive with custom approach, tailored to specific needs'
};

// Color combination descriptions
const COLOR_DESCRIPTIONS = {
  blue: 'trust and reliability with various blue tones',
  green: 'growth and nature with fresh green hues',
  red: 'energy and passion with bold red accents',
  purple: 'creativity and luxury with rich purple tones',
  orange: 'enthusiasm and warmth with vibrant orange',
  black: 'sophistication and power with black and dark tones',
  gray: 'professionalism and neutrality with gray palette',
  gold: 'luxury and success with golden accents',
  pink: 'creativity and compassion with pink hues',
  teal: 'balance and clarity with teal tones',
  indigo: 'wisdom and depth with deep blue-purple',
  yellow: 'optimism and energy with bright yellow',
  brown: 'reliability and earthiness with warm browns',
  white: 'purity and simplicity with clean white space'
};

export interface PromptGenerationRequest {
  businessData: BusinessFormData;
  inspirationLogo?: StoredLogoFile;
  generationType: 'new' | 'variation' | 'edit';
  editingInstructions?: string;
  additionalContext?: string;
}

export interface GeneratedPrompt {
  mainPrompt: string;
  negativePrompt?: string;
  styleModifiers: string[];
  aspectRatio: string;
  qualitySettings: {
    steps: number;
    guidance: number;
    strength?: number;
  };
  metadata: {
    companyName: string;
    industry: string;
    styles: string[];
    colors: string[];
    inspirationUsed: boolean;
  };
}

export class PromptEngineeringService {
  private static instance: PromptEngineeringService;

  public static getInstance(): PromptEngineeringService {
    if (!PromptEngineeringService.instance) {
      PromptEngineeringService.instance = new PromptEngineeringService();
    }
    return PromptEngineeringService.instance;
  }

  /**
   * Generate a comprehensive prompt for logo creation
   */
  public generateLogoPrompt(request: PromptGenerationRequest): GeneratedPrompt {
    const { businessData, inspirationLogo, generationType, editingInstructions } = request;

    let basePrompt: string;
    
    if (generationType === 'edit' && editingInstructions) {
      basePrompt = this.generateEditingPrompt(businessData, editingInstructions);
    } else {
      basePrompt = this.generateCreationPrompt(businessData, inspirationLogo);
    }

    const styleModifiers = this.generateStyleModifiers(businessData, inspirationLogo);
    const negativePrompt = this.generateNegativePrompt();
    const aspectRatio = this.determineAspectRatio(businessData);
    const qualitySettings = this.generateQualitySettings(generationType);

    return {
      mainPrompt: basePrompt,
      negativePrompt,
      styleModifiers,
      aspectRatio,
      qualitySettings,
      metadata: {
        companyName: businessData.companyName,
        industry: businessData.industry,
        styles: businessData.stylePreferences,
        colors: businessData.colorPreferences,
        inspirationUsed: !!inspirationLogo
      }
    };
  }

  /**
   * Generate prompt for creating new logos
   */
  private generateCreationPrompt(businessData: BusinessFormData, inspirationLogo?: StoredLogoFile): string {
    const styleDescription = this.buildStyleDescription(businessData.stylePreferences);
    const industryDescription = this.buildIndustryDescription(businessData.industry);
    const colorDescription = this.buildColorDescription(businessData.colorPreferences);
    const audienceDescription = businessData.targetAudience || 'general consumers';
    const requirements = this.buildRequirements(businessData, inspirationLogo);

    let prompt = LOGO_GENERATION_BASE_PROMPT
      .replace('{companyName}', businessData.companyName)
      .replace('{styleDescription}', styleDescription)
      .replace('{industryDescription}', industryDescription)
      .replace('{colorDescription}', colorDescription)
      .replace('{audienceDescription}', audienceDescription)
      .replace('{requirements}', requirements);

    // Add brand description context if provided
    if (businessData.brandDescription) {
      prompt += ` Brand essence: ${businessData.brandDescription}.`;
    }

    // Add inspiration context if provided
    if (inspirationLogo) {
      prompt += ` Use the provided inspiration logo as a base design, adapting its visual style and structure for "${businessData.companyName}". Maintain the ${inspirationLogo.category} ${inspirationLogo.style} aesthetic while replacing any existing text with the new company name.`;
    }

    // Add existing branding context if provided
    if (businessData.existingBranding?.hasLogo) {
      prompt += ` Integrate with existing brand elements: ${businessData.existingBranding.brandDescription || 'established brand identity'}.`;
      
      if (businessData.existingBranding.brandColors?.length) {
        prompt += ` Existing brand colors: ${businessData.existingBranding.brandColors.join(', ')}.`;
      }
    }

    return prompt;
  }

  /**
   * Generate prompt for editing existing logos
   */
  private generateEditingPrompt(businessData: BusinessFormData, editingInstructions: string): string {
    let prompt = LOGO_EDITING_BASE_PROMPT
      .replace('{editingInstructions}', editingInstructions);

    // Add context from business data
    prompt += ` Company: ${businessData.companyName}. Industry: ${businessData.industry}.`;
    
    if (businessData.stylePreferences.length > 0) {
      prompt += ` Maintain ${businessData.stylePreferences.join(', ')} style characteristics.`;
    }

    if (businessData.colorPreferences.length > 0) {
      prompt += ` Consider color preferences: ${businessData.colorPreferences.join(', ')}.`;
    }

    return prompt;
  }

  /**
   * Build style description from preferences
   */
  private buildStyleDescription(stylePreferences: string[]): string {
    if (stylePreferences.length === 0) {
      return 'modern and professional';
    }

    const descriptions = stylePreferences
      .map(style => STYLE_DESCRIPTIONS[style as keyof typeof STYLE_DESCRIPTIONS])
      .filter(Boolean);

    return descriptions.join(', combining ') || 'modern and professional';
  }

  /**
   * Build industry-specific description
   */
  private buildIndustryDescription(industry: string): string {
    return INDUSTRY_DESCRIPTIONS[industry as keyof typeof INDUSTRY_DESCRIPTIONS] || 'professional and modern';
  }

  /**
   * Build color description from preferences
   */
  private buildColorDescription(colorPreferences: string[]): string {
    if (colorPreferences.length === 0) {
      return 'professional color palette';
    }

    if (colorPreferences.length === 1) {
      return COLOR_DESCRIPTIONS[colorPreferences[0] as keyof typeof COLOR_DESCRIPTIONS] || 'professional colors';
    }

    const colorDescs = colorPreferences
      .map(color => COLOR_DESCRIPTIONS[color as keyof typeof COLOR_DESCRIPTIONS])
      .filter(Boolean);

    return `harmonious palette combining ${colorDescs.join(' with ')}`;
  }

  /**
   * Build additional requirements string
   */
  private buildRequirements(businessData: BusinessFormData, inspirationLogo?: StoredLogoFile): string {
    const requirements: string[] = [];

    // Add business type specific requirements
    if (businessData.businessType) {
      switch (businessData.businessType) {
        case 'startup':
          requirements.push('innovative and disruptive feel');
          break;
        case 'enterprise':
          requirements.push('corporate and established presence');
          break;
        case 'nonprofit':
          requirements.push('compassionate and trustworthy appeal');
          break;
        case 'ecommerce':
          requirements.push('commercial and customer-friendly');
          break;
        case 'personal_brand':
          requirements.push('personal and authentic character');
          break;
      }
    }

    // Add custom requirements
    if (businessData.additionalRequirements) {
      requirements.push(businessData.additionalRequirements);
    }

    // Add technical requirements
    requirements.push('vector-style design suitable for scalability');
    requirements.push('works in both color and monochrome');

    return requirements.join(', ');
  }

  /**
   * Generate style modifiers for the prompt
   */
  private generateStyleModifiers(businessData: BusinessFormData, inspirationLogo?: StoredLogoFile): string[] {
    const modifiers: string[] = [
      'logo design',
      'professional',
      'clean',
      'scalable',
      'vector art',
      'brand identity'
    ];

    // Add style-specific modifiers
    businessData.stylePreferences.forEach(style => {
      switch (style) {
        case 'minimalist':
          modifiers.push('minimal', 'simple', 'clean lines');
          break;
        case 'modern':
          modifiers.push('contemporary', 'sleek', 'current');
          break;
        case 'vintage':
          modifiers.push('retro', 'classic', 'timeless');
          break;
        case 'bold':
          modifiers.push('strong', 'impactful', 'powerful');
          break;
        case 'elegant':
          modifiers.push('refined', 'sophisticated', 'graceful');
          break;
      }
    });

    // Add industry-specific modifiers
    switch (businessData.industry) {
      case 'technology':
        modifiers.push('tech', 'digital', 'innovative');
        break;
      case 'healthcare':
        modifiers.push('medical', 'caring', 'trustworthy');
        break;
      case 'finance':
        modifiers.push('financial', 'secure', 'stable');
        break;
      case 'creative':
        modifiers.push('artistic', 'creative', 'unique');
        break;
    }

    return [...new Set(modifiers)]; // Remove duplicates
  }

  /**
   * Generate negative prompt to avoid unwanted elements
   */
  private generateNegativePrompt(): string {
    return [
      'blurry',
      'low quality',
      'pixelated',
      'distorted',
      'text',
      'letters',
      'words',
      'cluttered',
      'messy',
      'unprofessional',
      'amateur',
      'cartoon character',
      'realistic photo',
      'human face',
      'complex details',
      'too many elements'
    ].join(', ');
  }

  /**
   * Determine appropriate aspect ratio
   */
  private determineAspectRatio(businessData: BusinessFormData): string {
    // Most logos work best in square or slightly horizontal format
    if (businessData.businessType === 'ecommerce') {
      return '16:9'; // Better for web headers
    }
    
    return '1:1'; // Square format for most use cases
  }

  /**
   * Generate quality settings based on generation type
   */
  private generateQualitySettings(generationType: string): GeneratedPrompt['qualitySettings'] {
    switch (generationType) {
      case 'edit':
        return {
          steps: 20,
          guidance: 7.5,
          strength: 0.7 // Lower strength to preserve original elements
        };
      case 'variation':
        return {
          steps: 25,
          guidance: 8.0,
          strength: 0.5 // Moderate changes
        };
      default: // 'new'
        return {
          steps: 30,
          guidance: 9.0 // Higher guidance for more control
        };
    }
  }

  /**
   * Generate multiple prompt variations for better results
   */
  public generatePromptVariations(request: PromptGenerationRequest, count: number = 3): GeneratedPrompt[] {
    const variations: GeneratedPrompt[] = [];
    
    for (let i = 0; i < count; i++) {
      // Create slight variations in the prompt
      const modifiedRequest = {
        ...request,
        additionalContext: `Variation ${i + 1}: ${this.getVariationModifier(i)}`
      };
      
      const prompt = this.generateLogoPrompt(modifiedRequest);
      
      // Modify quality settings for variations
      prompt.qualitySettings.guidance += (i * 0.5);
      if (prompt.qualitySettings.strength) {
        prompt.qualitySettings.strength += (i * 0.1);
      }
      
      variations.push(prompt);
    }
    
    return variations;
  }

  /**
   * Get variation modifier for different approaches
   */
  private getVariationModifier(index: number): string {
    const modifiers = [
      'emphasize symbolism and meaning',
      'focus on typography and text treatment',
      'highlight geometric shapes and structure',
      'incorporate subtle gradients and depth',
      'maximize simplicity and clarity'
    ];
    
    return modifiers[index % modifiers.length];
  }

  /**
   * Validate and optimize prompt for Flux Kontext Pro
   */
  public optimizePromptForFlux(prompt: GeneratedPrompt): GeneratedPrompt {
    // Ensure prompt length is within Flux limits
    if (prompt.mainPrompt.length > 1000) {
      prompt.mainPrompt = prompt.mainPrompt.substring(0, 997) + '...';
    }

    // Optimize quality settings for Flux Kontext Pro
    prompt.qualitySettings.steps = Math.min(prompt.qualitySettings.steps, 50);
    prompt.qualitySettings.guidance = Math.min(prompt.qualitySettings.guidance, 15);
    
    if (prompt.qualitySettings.strength) {
      prompt.qualitySettings.strength = Math.min(prompt.qualitySettings.strength, 1.0);
    }

    return prompt;
  }
}

// Export singleton instance
export const promptEngineeringService = PromptEngineeringService.getInstance(); 