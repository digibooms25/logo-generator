/**
 * Logo Variations Service
 * Generates automatic color, layout, and seasonal variations of logos
 */

import { fluxService } from './flux-integration';
import { promptEngineeringService, type PromptGenerationRequest } from './prompt-engineering';
import type { GeneratedLogo } from './logo-generation-workflow';

export enum VariationType {
  COLOR = 'color',
  LAYOUT = 'layout',
  SEASONAL = 'seasonal',
  STYLE = 'style',
  SIZE = 'size',
  EFFECT = 'effect'
}

export interface VariationConfig {
  type: VariationType;
  parameters: {
    [key: string]: any;
  };
  intensity: 'subtle' | 'moderate' | 'dramatic';
}

export interface VariationRequest {
  baseLogo: GeneratedLogo;
  variationType: VariationType;
  count?: number;
  customParameters?: Record<string, any>;
}

export interface VariationResult {
  id: string;
  type: VariationType;
  baseLogo: GeneratedLogo;
  variations: GeneratedLogo[];
  metadata: {
    generatedAt: Date;
    processingTime: number;
    successCount: number;
    failureCount: number;
    parameters: Record<string, any>;
  };
}

// Predefined variation configurations
const COLOR_VARIATIONS = {
  monochrome: { description: 'black and white monochrome version', intensity: 'moderate' },
  vibrant: { description: 'more vibrant and saturated colors', intensity: 'moderate' },
  muted: { description: 'muted and pastel color palette', intensity: 'moderate' },
  complementary: { description: 'complementary color scheme', intensity: 'dramatic' },
  analogous: { description: 'analogous color harmony', intensity: 'subtle' },
  triadic: { description: 'triadic color scheme', intensity: 'dramatic' },
  warm: { description: 'warm color palette (reds, oranges, yellows)', intensity: 'moderate' },
  cool: { description: 'cool color palette (blues, greens, purples)', intensity: 'moderate' },
  corporate: { description: 'professional corporate colors', intensity: 'subtle' },
  playful: { description: 'bright and playful colors', intensity: 'dramatic' }
};

const LAYOUT_VARIATIONS = {
  horizontal: { description: 'horizontal layout arrangement', intensity: 'moderate' },
  vertical: { description: 'vertical stacked layout', intensity: 'moderate' },
  circular: { description: 'circular or radial arrangement', intensity: 'dramatic' },
  centered: { description: 'centered symmetrical layout', intensity: 'subtle' },
  offset: { description: 'asymmetrical offset composition', intensity: 'moderate' },
  compact: { description: 'compact tightly spaced layout', intensity: 'moderate' },
  spread: { description: 'spread out spacious layout', intensity: 'moderate' },
  layered: { description: 'layered depth composition', intensity: 'dramatic' },
  grid: { description: 'grid-based structured layout', intensity: 'subtle' },
  organic: { description: 'organic flowing arrangement', intensity: 'dramatic' }
};

const SEASONAL_VARIATIONS = {
  spring: { 
    description: 'spring theme with fresh greens, flowers, and growth elements',
    colors: ['#90EE90', '#32CD32', '#FFB6C1', '#FFF8DC'],
    elements: ['flowers', 'leaves', 'growth', 'fresh'],
    intensity: 'moderate'
  },
  summer: {
    description: 'summer theme with bright warm colors and sunny elements',
    colors: ['#FFD700', '#FF6347', '#87CEEB', '#F0E68C'],
    elements: ['sun', 'beach', 'bright', 'energy'],
    intensity: 'dramatic'
  },
  autumn: {
    description: 'autumn theme with warm oranges, reds, and falling leaves',
    colors: ['#FF8C00', '#DC143C', '#DAA520', '#CD853F'],
    elements: ['leaves', 'harvest', 'warmth', 'cozy'],
    intensity: 'moderate'
  },
  winter: {
    description: 'winter theme with cool blues, whites, and snow elements',
    colors: ['#E6F3FF', '#B0C4DE', '#708090', '#F0F8FF'],
    elements: ['snow', 'ice', 'crystalline', 'calm'],
    intensity: 'moderate'
  },
  christmas: {
    description: 'Christmas theme with red, green, gold and festive elements',
    colors: ['#DC143C', '#228B22', '#FFD700', '#F5F5DC'],
    elements: ['holly', 'stars', 'festive', 'celebration'],
    intensity: 'dramatic'
  },
  halloween: {
    description: 'Halloween theme with orange, black, purple spooky elements',
    colors: ['#FF4500', '#000000', '#8A2BE2', '#696969'],
    elements: ['spooky', 'mystical', 'dark', 'mysterious'],
    intensity: 'dramatic'
  }
};

const STYLE_VARIATIONS = {
  minimalist: { description: 'clean minimalist style with simple forms', intensity: 'dramatic' },
  vintage: { description: 'retro vintage style with aged effects', intensity: 'dramatic' },
  modern: { description: 'contemporary modern design', intensity: 'moderate' },
  elegant: { description: 'sophisticated elegant styling', intensity: 'moderate' },
  bold: { description: 'strong bold visual impact', intensity: 'dramatic' },
  playful: { description: 'fun and whimsical character', intensity: 'moderate' },
  professional: { description: 'corporate professional appearance', intensity: 'subtle' },
  artistic: { description: 'creative artistic interpretation', intensity: 'dramatic' },
  geometric: { description: 'geometric structured forms', intensity: 'moderate' },
  organic: { description: 'natural flowing organic shapes', intensity: 'moderate' }
};

export class LogoVariationsService {
  private static instance: LogoVariationsService;

  public static getInstance(): LogoVariationsService {
    if (!LogoVariationsService.instance) {
      LogoVariationsService.instance = new LogoVariationsService();
    }
    return LogoVariationsService.instance;
  }

  /**
   * Generate automatic variations based on type
   */
  public async generateVariations(request: VariationRequest): Promise<VariationResult> {
    const startTime = Date.now();
    const { baseLogo, variationType, count = 4 } = request;

    try {
      let variations: GeneratedLogo[] = [];

      switch (variationType) {
        case VariationType.COLOR:
          variations = await this.generateColorVariations(baseLogo, count);
          break;
        case VariationType.LAYOUT:
          variations = await this.generateLayoutVariations(baseLogo, count);
          break;
        case VariationType.SEASONAL:
          variations = await this.generateSeasonalVariations(baseLogo, count);
          break;
        case VariationType.STYLE:
          variations = await this.generateStyleVariations(baseLogo, count);
          break;
        case VariationType.SIZE:
          variations = await this.generateSizeVariations(baseLogo, count);
          break;
        case VariationType.EFFECT:
          variations = await this.generateEffectVariations(baseLogo, count);
          break;
        default:
          throw new Error(`Unsupported variation type: ${variationType}`);
      }

      const successCount = variations.filter(v => v.status === 'completed').length;
      const failureCount = variations.length - successCount;

      return {
        id: `variation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: variationType,
        baseLogo,
        variations,
        metadata: {
          generatedAt: new Date(),
          processingTime: Date.now() - startTime,
          successCount,
          failureCount,
          parameters: request.customParameters || {}
        }
      };

    } catch (error) {
      console.error('Failed to generate variations:', error);
      return {
        id: `variation_error_${Date.now()}`,
        type: variationType,
        baseLogo,
        variations: [],
        metadata: {
          generatedAt: new Date(),
          processingTime: Date.now() - startTime,
          successCount: 0,
          failureCount: count,
          parameters: {}
        }
      };
    }
  }

  /**
   * Generate color variations
   */
  private async generateColorVariations(baseLogo: GeneratedLogo, count: number): Promise<GeneratedLogo[]> {
    const variations: GeneratedLogo[] = [];
    const colorVariationKeys = Object.keys(COLOR_VARIATIONS);
    
    for (let i = 0; i < count; i++) {
      try {
        const variationKey = colorVariationKeys[i % colorVariationKeys.length];
        const variation = COLOR_VARIATIONS[variationKey as keyof typeof COLOR_VARIATIONS];
        
        const prompt = `${baseLogo.prompt.mainPrompt} with ${variation.description}. Maintain the same composition and design elements but change the color scheme.`;
        
        const result = await fluxService.editImage(
          baseLogo.imageUrl,
          prompt,
          {
            aspectRatio: '1:1',
            outputFormat: 'png'
          }
        );

        if (result.success && result.imageUrl) {
          variations.push({
            id: `color_variation_${variationKey}_${Date.now()}`,
            imageUrl: result.imageUrl,
            imageBase64: result.imageData,
            prompt: {
              ...baseLogo.prompt,
              mainPrompt: prompt
            },
            fluxRequestId: result.generationId,
            metadata: {
              ...baseLogo.metadata,
              createdAt: new Date(),
              generationType: 'variation',
              processingTime: 0
            },
            status: 'completed'
          });
        }
      } catch (error) {
        console.error(`Failed to generate color variation ${i}:`, error);
      }
    }

    return variations;
  }

  /**
   * Generate layout variations
   */
  private async generateLayoutVariations(baseLogo: GeneratedLogo, count: number): Promise<GeneratedLogo[]> {
    const variations: GeneratedLogo[] = [];
    const layoutVariationKeys = Object.keys(LAYOUT_VARIATIONS);
    
    for (let i = 0; i < count; i++) {
      try {
        const variationKey = layoutVariationKeys[i % layoutVariationKeys.length];
        const variation = LAYOUT_VARIATIONS[variationKey as keyof typeof LAYOUT_VARIATIONS];
        
        const prompt = `${baseLogo.prompt.mainPrompt} with ${variation.description}. Keep the same visual elements and colors but change the layout and composition.`;
        
        const result = await fluxService.editImage(
          baseLogo.imageUrl,
          prompt,
          {
            aspectRatio: '1:1',
            outputFormat: 'png'
          }
        );

        if (result.success && result.imageUrl) {
          variations.push({
            id: `layout_variation_${variationKey}_${Date.now()}`,
            imageUrl: result.imageUrl,
            imageBase64: result.imageData,
            prompt: {
              ...baseLogo.prompt,
              mainPrompt: prompt
            },
            fluxRequestId: result.generationId,
            metadata: {
              ...baseLogo.metadata,
              createdAt: new Date(),
              generationType: 'variation',
              processingTime: 0
            },
            status: 'completed'
          });
        }
      } catch (error) {
        console.error(`Failed to generate layout variation ${i}:`, error);
      }
    }

    return variations;
  }

  /**
   * Generate seasonal variations
   */
  private async generateSeasonalVariations(baseLogo: GeneratedLogo, count: number): Promise<GeneratedLogo[]> {
    const variations: GeneratedLogo[] = [];
    const seasonalKeys = Object.keys(SEASONAL_VARIATIONS);
    
    for (let i = 0; i < count; i++) {
      try {
        const seasonKey = seasonalKeys[i % seasonalKeys.length];
        const season = SEASONAL_VARIATIONS[seasonKey as keyof typeof SEASONAL_VARIATIONS];
        
        const prompt = `${baseLogo.prompt.mainPrompt} adapted for ${season.description}. Incorporate ${season.elements.join(', ')} while maintaining the core logo design.`;
        
        const result = await fluxService.editImage(
          baseLogo.imageUrl,
          prompt,
          {
            aspectRatio: '1:1',
            outputFormat: 'png'
          }
        );

        if (result.success && result.imageUrl) {
          variations.push({
            id: `seasonal_variation_${seasonKey}_${Date.now()}`,
            imageUrl: result.imageUrl,
            imageBase64: result.imageData,
            prompt: {
              ...baseLogo.prompt,
              mainPrompt: prompt
            },
            fluxRequestId: result.generationId,
            metadata: {
              ...baseLogo.metadata,
              createdAt: new Date(),
              generationType: 'variation',
              processingTime: 0
            },
            status: 'completed'
          });
        }
      } catch (error) {
        console.error(`Failed to generate seasonal variation ${i}:`, error);
      }
    }

    return variations;
  }

  /**
   * Generate style variations
   */
  private async generateStyleVariations(baseLogo: GeneratedLogo, count: number): Promise<GeneratedLogo[]> {
    const variations: GeneratedLogo[] = [];
    const styleKeys = Object.keys(STYLE_VARIATIONS);
    
    for (let i = 0; i < count; i++) {
      try {
        const styleKey = styleKeys[i % styleKeys.length];
        const style = STYLE_VARIATIONS[styleKey as keyof typeof STYLE_VARIATIONS];
        
        const prompt = `${baseLogo.prompt.mainPrompt} reimagined in ${style.description}. Maintain the core concept but transform the visual style.`;
        
        const result = await fluxService.editImage(
          baseLogo.imageUrl,
          prompt,
          {
            aspectRatio: '1:1',
            outputFormat: 'png'
          }
        );

        if (result.success && result.imageUrl) {
          variations.push({
            id: `style_variation_${styleKey}_${Date.now()}`,
            imageUrl: result.imageUrl,
            imageBase64: result.imageData,
            prompt: {
              ...baseLogo.prompt,
              mainPrompt: prompt
            },
            fluxRequestId: result.generationId,
            metadata: {
              ...baseLogo.metadata,
              createdAt: new Date(),
              generationType: 'variation',
              processingTime: 0
            },
            status: 'completed'
          });
        }
      } catch (error) {
        console.error(`Failed to generate style variation ${i}:`, error);
      }
    }

    return variations;
  }

  /**
   * Generate size variations
   */
  private async generateSizeVariations(baseLogo: GeneratedLogo, count: number): Promise<GeneratedLogo[]> {
    const variations: GeneratedLogo[] = [];
    const sizeVariations = [
      'optimized for small icon usage with increased thickness and simplified details',
      'designed for large scale application with enhanced fine details',
      'adapted for horizontal banner format with extended width',
      'configured for vertical usage with stacked elements'
    ];
    
    for (let i = 0; i < count; i++) {
      try {
        const sizeVariation = sizeVariations[i % sizeVariations.length];
        const prompt = `${baseLogo.prompt.mainPrompt} ${sizeVariation}`;
        
        const result = await fluxService.editImage(
          baseLogo.imageUrl,
          prompt,
          {
            aspectRatio: i % 2 === 0 ? '1:1' : (i % 4 < 2 ? '16:9' : '9:16'),
            outputFormat: 'png'
          }
        );

        if (result.success && result.imageUrl) {
          variations.push({
            id: `size_variation_${i}_${Date.now()}`,
            imageUrl: result.imageUrl,
            imageBase64: result.imageData,
            prompt: {
              ...baseLogo.prompt,
              mainPrompt: prompt
            },
            fluxRequestId: result.generationId,
            metadata: {
              ...baseLogo.metadata,
              createdAt: new Date(),
              generationType: 'variation',
              processingTime: 0
            },
            status: 'completed'
          });
        }
      } catch (error) {
        console.error(`Failed to generate size variation ${i}:`, error);
      }
    }

    return variations;
  }

  /**
   * Generate effect variations
   */
  private async generateEffectVariations(baseLogo: GeneratedLogo, count: number): Promise<GeneratedLogo[]> {
    const variations: GeneratedLogo[] = [];
    const effectVariations = [
      'with subtle shadow and depth effects',
      'with metallic gradient and shine',
      'with glowing outline and luminous effect',
      'with embossed 3D appearance'
    ];
    
    for (let i = 0; i < count; i++) {
      try {
        const effect = effectVariations[i % effectVariations.length];
        const prompt = `${baseLogo.prompt.mainPrompt} ${effect}. Enhance the visual impact while preserving the core design.`;
        
        const result = await fluxService.editImage(
          baseLogo.imageUrl,
          prompt,
          {
            aspectRatio: '1:1',
            outputFormat: 'png'
          }
        );

        if (result.success && result.imageUrl) {
          variations.push({
            id: `effect_variation_${i}_${Date.now()}`,
            imageUrl: result.imageUrl,
            imageBase64: result.imageData,
            prompt: {
              ...baseLogo.prompt,
              mainPrompt: prompt
            },
            fluxRequestId: result.generationId,
            metadata: {
              ...baseLogo.metadata,
              createdAt: new Date(),
              generationType: 'variation',
              processingTime: 0
            },
            status: 'completed'
          });
        }
      } catch (error) {
        console.error(`Failed to generate effect variation ${i}:`, error);
      }
    }

    return variations;
  }

  /**
   * Generate batch variations of multiple types
   */
  public async generateBatchVariations(
    baseLogo: GeneratedLogo,
    types: VariationType[],
    countPerType: number = 2
  ): Promise<VariationResult[]> {
    const results: VariationResult[] = [];
    
    for (const type of types) {
      try {
        const result = await this.generateVariations({
          baseLogo,
          variationType: type,
          count: countPerType
        });
        results.push(result);
      } catch (error) {
        console.error(`Failed to generate ${type} variations:`, error);
      }
    }

    return results;
  }

  /**
   * Get available variation options
   */
  public getVariationOptions() {
    return {
      color: Object.keys(COLOR_VARIATIONS),
      layout: Object.keys(LAYOUT_VARIATIONS),
      seasonal: Object.keys(SEASONAL_VARIATIONS),
      style: Object.keys(STYLE_VARIATIONS)
    };
  }

  /**
   * Get variation preview descriptions
   */
  public getVariationDescriptions(type: VariationType): Record<string, string> {
    switch (type) {
      case VariationType.COLOR:
        return Object.fromEntries(
          Object.entries(COLOR_VARIATIONS).map(([key, value]) => [key, value.description])
        );
      case VariationType.LAYOUT:
        return Object.fromEntries(
          Object.entries(LAYOUT_VARIATIONS).map(([key, value]) => [key, value.description])
        );
      case VariationType.SEASONAL:
        return Object.fromEntries(
          Object.entries(SEASONAL_VARIATIONS).map(([key, value]) => [key, value.description])
        );
      case VariationType.STYLE:
        return Object.fromEntries(
          Object.entries(STYLE_VARIATIONS).map(([key, value]) => [key, value.description])
        );
      default:
        return {};
    }
  }
}

// Export singleton instance
export const logoVariationsService = LogoVariationsService.getInstance(); 