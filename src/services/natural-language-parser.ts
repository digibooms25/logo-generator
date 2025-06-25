/**
 * Natural Language Parser Service for Logo Editing
 * Parses natural language commands and converts them to logo editing operations
 */

import { promptEngineeringService, type PromptGenerationRequest } from './prompt-engineering';
import { fluxService } from './flux-integration';
import { llmService } from './llm-integration';
import type { GeneratedLogo } from './logo-generation-workflow';

// Command types and structures
export enum EditCommandType {
  COLOR_CHANGE = 'color_change',
  STYLE_CHANGE = 'style_change',
  TEXT_EDIT = 'text_edit',
  LAYOUT_ADJUST = 'layout_adjust',
  SIZE_CHANGE = 'size_change',
  SHAPE_MODIFY = 'shape_modify',
  EFFECT_ADD = 'effect_add',
  ELEMENT_REMOVE = 'element_remove',
  COMPOSITION = 'composition',
  SEASONAL_ADAPT = 'seasonal_adapt'
}

export interface ParsedCommand {
  type: EditCommandType;
  confidence: number;
  originalText: string;
  structuredCommand: {
    action: string;
    target?: string;
    value?: string;
    modifiers?: string[];
  };
  fluxPrompt: string;
  negativePrompt?: string;
  strength: number; // 0.1 to 1.0 for how much to change
  metadata: {
    parsedAt: Date;
    processingTime: number;
    alternatives?: string[];
  };
}

export interface EditingSession {
  id: string;
  originalLogo: GeneratedLogo;
  currentLogo: GeneratedLogo;
  editHistory: EditOperation[];
  createdAt: Date;
  lastModified: Date;
}

export interface EditOperation {
  id: string;
  command: ParsedCommand;
  beforeImage: string;
  afterImage?: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
}

// Natural language patterns for different command types
const COMMAND_PATTERNS = {
  color_change: [
    /make.*?(?:more|less)?\s*(red|blue|green|yellow|purple|orange|pink|black|white|gray|gold|silver)/i,
    /change.*?color.*?to\s*(red|blue|green|yellow|purple|orange|pink|black|white|gray|gold|silver)/i,
    /add.*?(red|blue|green|yellow|purple|orange|pink|black|white|gray|gold|silver)/i,
    /(darker|lighter|brighter|more vibrant|more muted)/i
  ],
  style_change: [
    /make.*?(more|less)?\s*(modern|vintage|classic|bold|elegant|minimalist|playful|professional)/i,
    /add.*?(gradient|shadow|outline|border|3d effect)/i,
    /style.*?(modern|vintage|classic|bold|elegant|minimalist|playful|professional)/i
  ],
  text_edit: [
    /change.*?text.*?to\s*["']([^"']+)["']/i,
    /replace.*?text.*?with\s*["']([^"']+)["']/i,
    /make.*?text\s*(bigger|smaller|larger|bolder|thinner)/i,
    /text.*?font.*?(serif|sans|script|display)/i
  ],
  layout_adjust: [
    /move.*?(left|right|up|down|center)/i,
    /align.*?(left|right|center|top|bottom)/i,
    /spacing.*?(more|less|tighter|looser)/i,
    /stack.*?(horizontally|vertically)/i
  ],
  size_change: [
    /make.*?(bigger|smaller|larger|tiny|huge|medium)/i,
    /resize.*?to\s*(\d+)\s*(?:px|percent|%)/i,
    /scale.*?(up|down)\s*(?:by\s*(\d+))?/i
  ],
  shape_modify: [
    /make.*?(rounder|sharper|more angular|more curved)/i,
    /add.*?(circle|square|triangle|star|diamond)/i,
    /remove.*?(corners|edges|sharp parts)/i
  ],
  effect_add: [
    /add.*?(glow|shadow|reflection|highlight|depth)/i,
    /make.*?(glossy|matte|metallic|textured)/i,
    /apply.*?(blur|sharpen|emboss|outline)/i
  ],
  element_remove: [
    /remove.*?(background|text|icon|shape|element)/i,
    /delete.*?(background|text|icon|shape|element)/i,
    /take away.*?(background|text|icon|shape|element)/i
  ],
  seasonal_adapt: [
    /make.*?(christmas|halloween|summer|winter|spring|fall|holiday)/i,
    /add.*?(snowflakes|leaves|flowers|hearts|stars)/i,
    /seasonal.*?(christmas|halloween|summer|winter|spring|fall)/i
  ]
};

// Strength mappings for different command intensities
const STRENGTH_MAPPINGS = {
  subtle: 0.3,
  slight: 0.4,
  moderate: 0.5,
  significant: 0.7,
  major: 0.8,
  complete: 0.9,
  dramatic: 1.0
};

export class NaturalLanguageParserService {
  private static instance: NaturalLanguageParserService;

  public static getInstance(): NaturalLanguageParserService {
    if (!NaturalLanguageParserService.instance) {
      NaturalLanguageParserService.instance = new NaturalLanguageParserService();
    }
    return NaturalLanguageParserService.instance;
  }

  /**
   * Parse natural language command into structured editing instruction
   */
  public async parseEditingCommand(
    command: string,
    currentLogo: GeneratedLogo,
    context?: string
  ): Promise<ParsedCommand> {
    const startTime = Date.now();

    try {
      // Step 1: Classify command type using pattern matching
      const commandType = this.classifyCommand(command);
      
      // Step 2: Use LLM for detailed parsing and validation
      const llmAnalysis = await this.analyzCommandWithLLM(command, currentLogo, context);
      
      // Step 3: Generate Flux-compatible editing prompt
      const fluxPrompt = await this.generateEditingPrompt(command, commandType, currentLogo);
      
      // Step 4: Determine editing strength
      const strength = this.calculateEditingStrength(command, commandType);

      const parsedCommand: ParsedCommand = {
        type: commandType,
        confidence: llmAnalysis.confidence,
        originalText: command,
        structuredCommand: llmAnalysis.structuredCommand,
        fluxPrompt: fluxPrompt.prompt,
        negativePrompt: fluxPrompt.negativePrompt,
        strength,
        metadata: {
          parsedAt: new Date(),
          processingTime: Date.now() - startTime,
          alternatives: llmAnalysis.alternatives
        }
      };

      return parsedCommand;

    } catch (error) {
      console.error('Failed to parse editing command:', error);
      
      // Return fallback parsed command
      return {
        type: EditCommandType.STYLE_CHANGE,
        confidence: 0.1,
        originalText: command,
        structuredCommand: {
          action: 'modify',
          target: 'overall_style',
          value: command
        },
        fluxPrompt: `Modify the logo design: ${command}`,
        strength: 0.5,
        metadata: {
          parsedAt: new Date(),
          processingTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Execute parsed editing command on logo
   */
  public async executeEditingCommand(
    command: ParsedCommand,
    currentLogo: GeneratedLogo
  ): Promise<{ success: boolean; editedLogo?: GeneratedLogo; error?: string }> {
    try {
      // Use Flux to edit the logo based on the parsed command
      const editResult = await fluxService.editImage(
        currentLogo.imageUrl,
        command.fluxPrompt,
        {
          aspectRatio: '1:1',
          outputFormat: 'png'
        }
      );

      if (editResult.success && editResult.imageUrl) {
        const editedLogo: GeneratedLogo = {
          id: `edited_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          imageUrl: editResult.imageUrl,
          imageBase64: editResult.imageData,
          prompt: {
            ...currentLogo.prompt,
            mainPrompt: command.fluxPrompt,
            negativePrompt: command.negativePrompt
          },
          fluxRequestId: editResult.generationId,
          metadata: {
            ...currentLogo.metadata,
            createdAt: new Date(),
            generationType: 'edit',
            processingTime: Date.now() - new Date(command.metadata.parsedAt).getTime()
          },
          status: 'completed'
        };

        return { success: true, editedLogo };
      } else {
        return { 
          success: false, 
          error: editResult.error || 'Failed to edit logo'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during editing'
      };
    }
  }

  /**
   * Generate automatic variations based on command type
   */
  public async generateEditingVariations(
    command: ParsedCommand,
    currentLogo: GeneratedLogo,
    variationCount: number = 3
  ): Promise<GeneratedLogo[]> {
    const variations: GeneratedLogo[] = [];
    
    for (let i = 0; i < variationCount; i++) {
      try {
        // Create variation of the editing prompt
        const variationPrompt = this.createVariationPrompt(command, i);
        
        const editResult = await fluxService.editImage(
          currentLogo.imageUrl,
          variationPrompt,
          {
            aspectRatio: '1:1',
            outputFormat: 'png'
          }
        );

        if (editResult.success && editResult.imageUrl) {
          const variation: GeneratedLogo = {
            id: `variation_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            imageUrl: editResult.imageUrl,
            imageBase64: editResult.imageData,
            prompt: {
              ...currentLogo.prompt,
              mainPrompt: variationPrompt
            },
            fluxRequestId: editResult.generationId,
            metadata: {
              ...currentLogo.metadata,
              createdAt: new Date(),
              generationType: 'variation',
              processingTime: 0
            },
            status: 'completed'
          };

          variations.push(variation);
        }
      } catch (error) {
        console.error(`Failed to generate variation ${i}:`, error);
      }
    }

    return variations;
  }

  /**
   * Classify command type using pattern matching
   */
  private classifyCommand(command: string): EditCommandType {
    const lowercaseCommand = command.toLowerCase();
    
    for (const [type, patterns] of Object.entries(COMMAND_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(lowercaseCommand)) {
          return type as EditCommandType;
        }
      }
    }
    
    // Default to style change if no specific pattern matches
    return EditCommandType.STYLE_CHANGE;
  }

  /**
   * Use LLM to analyze and structure the command
   */
  private async analyzCommandWithLLM(
    command: string,
    currentLogo: GeneratedLogo,
    context?: string
  ): Promise<{
    confidence: number;
    structuredCommand: ParsedCommand['structuredCommand'];
    alternatives?: string[];
  }> {
    try {
      const analysisPrompt = `
        Analyze this logo editing command: "${command}"
        
        Current logo context:
        - Company: ${currentLogo.metadata.companyName}
        - Industry: ${currentLogo.metadata.industry}
        - Styles: ${currentLogo.metadata.styles.join(', ')}
        - Colors: ${currentLogo.metadata.colors.join(', ')}
        
        ${context ? `Additional context: ${context}` : ''}
        
        Extract:
        1. Main action (what to do)
        2. Target element (what to change)
        3. Specific value/parameter (how to change it)
        4. Confidence level (0.0-1.0)
        5. Alternative interpretations
        
        Return as JSON.
      `;

      const result = await llmService.extractBusinessInformation({
        userInput: analysisPrompt,
        context: 'logo_editing_command_analysis'
      });

      if (result.success) {
        return {
          confidence: result.confidence || 0.7,
          structuredCommand: {
            action: 'modify', // Default, would be parsed from LLM response
            target: 'style',
            value: command
          },
          alternatives: result.suggestions
        };
      }
    } catch (error) {
      console.error('LLM analysis failed:', error);
    }

    // Fallback analysis
    return {
      confidence: 0.5,
      structuredCommand: {
        action: 'modify',
        target: 'overall',
        value: command
      }
    };
  }

  /**
   * Generate Flux-compatible editing prompt
   */
  private async generateEditingPrompt(
    command: string,
    commandType: EditCommandType,
    currentLogo: GeneratedLogo
  ): Promise<{ prompt: string; negativePrompt?: string }> {
    // Create editing request for prompt engineering service
    const editingRequest: PromptGenerationRequest = {
      businessData: {
        companyName: currentLogo.metadata.companyName,
        industry: currentLogo.metadata.industry,
        businessType: '',
        brandDescription: '',
        targetAudience: '',
        stylePreferences: currentLogo.metadata.styles,
        colorPreferences: currentLogo.metadata.colors
      },
      generationType: 'edit',
      editingInstructions: command
    };

    const generatedPrompt = promptEngineeringService.generateLogoPrompt(editingRequest);
    
    return {
      prompt: generatedPrompt.mainPrompt,
      negativePrompt: generatedPrompt.negativePrompt
    };
  }

  /**
   * Calculate editing strength based on command intensity
   */
  private calculateEditingStrength(command: string, commandType: EditCommandType): number {
    const lowercaseCommand = command.toLowerCase();
    
    // Check for intensity modifiers
    for (const [modifier, strength] of Object.entries(STRENGTH_MAPPINGS)) {
      if (lowercaseCommand.includes(modifier)) {
        return strength;
      }
    }

    // Command type defaults
    switch (commandType) {
      case EditCommandType.COLOR_CHANGE:
        return 0.6;
      case EditCommandType.STYLE_CHANGE:
        return 0.7;
      case EditCommandType.TEXT_EDIT:
        return 0.8;
      case EditCommandType.LAYOUT_ADJUST:
        return 0.5;
      case EditCommandType.SIZE_CHANGE:
        return 0.4;
      case EditCommandType.SHAPE_MODIFY:
        return 0.6;
      case EditCommandType.EFFECT_ADD:
        return 0.5;
      case EditCommandType.ELEMENT_REMOVE:
        return 0.8;
      case EditCommandType.SEASONAL_ADAPT:
        return 0.7;
      default:
        return 0.5;
    }
  }

  /**
   * Create variation of editing prompt
   */
  private createVariationPrompt(command: ParsedCommand, variationIndex: number): string {
    const basePrompt = command.fluxPrompt;
    
    const variationModifiers = [
      'with subtle differences',
      'with a slightly different approach',
      'with alternative styling',
      'with enhanced details',
      'with refined execution'
    ];

    const modifier = variationModifiers[variationIndex % variationModifiers.length];
    return `${basePrompt} ${modifier}`;
  }

  /**
   * Get command suggestions based on current logo
   */
  public getCommandSuggestions(currentLogo: GeneratedLogo): string[] {
    const suggestions = [
      // Color suggestions
      'Make it more blue',
      'Add a gradient effect',
      'Make the colors more vibrant',
      
      // Style suggestions
      'Make it more modern',
      'Add a subtle shadow',
      'Make it more minimalist',
      
      // Layout suggestions
      'Center the elements',
      'Make the text bigger',
      'Add more spacing',
      
      // Industry-specific suggestions
      ...(currentLogo.metadata.industry === 'technology' ? [
        'Add a digital effect',
        'Make it more futuristic',
        'Add circuit-like patterns'
      ] : []),
      
      // Seasonal suggestions
      'Add holiday elements',
      'Make it more festive',
      'Add seasonal colors'
    ];

    return suggestions.slice(0, 8); // Return top 8 suggestions
  }
}

// Export singleton instance
export const naturalLanguageParserService = NaturalLanguageParserService.getInstance(); 