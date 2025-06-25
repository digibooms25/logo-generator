/**
 * Logo Generation Workflow Service
 * Orchestrates the complete logo generation process from business information to final designs
 */

import { fluxService } from './flux-integration';
import { promptEngineeringService, type PromptGenerationRequest, type GeneratedPrompt } from './prompt-engineering';
import type { BusinessFormData } from '@/components/BusinessInfoCollectionForm';
import type { StoredLogoFile } from './local-storage';

// Generation workflow states
export enum GenerationStatus {
  IDLE = 'idle',
  GENERATING_PROMPTS = 'generating_prompts',
  CREATING_LOGOS = 'creating_logos',
  PROCESSING_RESULTS = 'processing_results',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export interface LogoGenerationOptions {
  businessData: BusinessFormData;
  inspirationLogo?: StoredLogoFile;
  generateMultiple?: boolean;
  variationCount?: number;
  customPrompt?: string;
}

export interface GeneratedLogo {
  id: string;
  imageUrl: string;
  imageBase64?: string;
  prompt: GeneratedPrompt;
  fluxRequestId?: string;
  metadata: {
    createdAt: Date;
    generationType: 'new' | 'variation' | 'edit';
    companyName: string;
    industry: string;
    styles: string[];
    colors: string[];
    inspirationUsed: boolean;
    processingTime: number;
  };
  status: 'generating' | 'completed' | 'failed';
  error?: string;
}

export interface GenerationProgress {
  status: GenerationStatus;
  currentStep: string;
  completedSteps: number;
  totalSteps: number;
  percentage: number;
  estimatedTimeRemaining?: number;
  message: string;
  generatedLogos: GeneratedLogo[];
  error?: string;
}

export interface GenerationResult {
  success: boolean;
  logos: GeneratedLogo[];
  totalGenerated: number;
  failedCount: number;
  totalProcessingTime: number;
  error?: string;
}

export class LogoGenerationWorkflowService {
  private static instance: LogoGenerationWorkflowService;
  private activeGenerations = new Map<string, GenerationProgress>();
  private progressCallbacks = new Map<string, (progress: GenerationProgress) => void>();

  public static getInstance(): LogoGenerationWorkflowService {
    if (!LogoGenerationWorkflowService.instance) {
      LogoGenerationWorkflowService.instance = new LogoGenerationWorkflowService();
    }
    return LogoGenerationWorkflowService.instance;
  }

  /**
   * Start logo generation workflow
   */
  public async generateLogos(
    options: LogoGenerationOptions,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<GenerationResult> {
    const workflowId = this.generateWorkflowId();
    const startTime = Date.now();

    try {
      // Initialize progress tracking
      const totalSteps = this.calculateTotalSteps(options);
      const progress: GenerationProgress = {
        status: GenerationStatus.GENERATING_PROMPTS,
        currentStep: 'Generating AI prompts',
        completedSteps: 0,
        totalSteps,
        percentage: 0,
        message: 'Preparing logo generation prompts...',
        generatedLogos: []
      };

      this.activeGenerations.set(workflowId, progress);
      if (onProgress) {
        this.progressCallbacks.set(workflowId, onProgress);
        onProgress(progress);
      }

      // Step 1: Generate prompts
      const prompts = await this.generatePrompts(workflowId, options);
      this.updateProgress(workflowId, {
        completedSteps: 1,
        percentage: 25,
        message: `Generated ${prompts.length} prompt variations`
      });

      // Step 2: Create logos using Flux Kontext Pro
      await this.updateProgress(workflowId, {
        status: GenerationStatus.CREATING_LOGOS,
        currentStep: 'Creating logo designs',
        message: 'Generating logos with AI...'
      });

      const generatedLogos = await this.createLogosFromPrompts(workflowId, prompts, options);
      
      // Step 3: Process results
      await this.updateProgress(workflowId, {
        status: GenerationStatus.PROCESSING_RESULTS,
        currentStep: 'Processing results',
        completedSteps: 3,
        percentage: 75,
        message: 'Processing generated logos...'
      });

      const processedLogos = await this.processGenerationResults(workflowId, generatedLogos);

      // Step 4: Complete
      const totalTime = Date.now() - startTime;
      const finalProgress: GenerationProgress = {
        status: GenerationStatus.COMPLETED,
        currentStep: 'Completed',
        completedSteps: totalSteps,
        totalSteps,
        percentage: 100,
        message: `Successfully generated ${processedLogos.filter(l => l.status === 'completed').length} logos`,
        generatedLogos: processedLogos
      };

      this.activeGenerations.set(workflowId, finalProgress);
      if (onProgress) {
        onProgress(finalProgress);
      }

      const result: GenerationResult = {
        success: true,
        logos: processedLogos,
        totalGenerated: processedLogos.filter(l => l.status === 'completed').length,
        failedCount: processedLogos.filter(l => l.status === 'failed').length,
        totalProcessingTime: totalTime
      };

      // Cleanup
      this.cleanup(workflowId);
      return result;

    } catch (error) {
      console.error('Logo generation workflow failed:', error);
      
      const errorProgress: GenerationProgress = {
        status: GenerationStatus.ERROR,
        currentStep: 'Error',
        completedSteps: 0,
        totalSteps: this.calculateTotalSteps(options),
        percentage: 0,
        message: 'Logo generation failed',
        generatedLogos: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };

      this.activeGenerations.set(workflowId, errorProgress);
      if (onProgress) {
        onProgress(errorProgress);
      }

      this.cleanup(workflowId);
      return {
        success: false,
        logos: [],
        totalGenerated: 0,
        failedCount: 1,
        totalProcessingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate logo variations from existing logo
   */
  public async generateVariations(
    originalLogo: GeneratedLogo,
    variationCount: number = 3,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<GenerationResult> {
    const workflowId = this.generateWorkflowId();
    const startTime = Date.now();

    try {
      // Initialize progress tracking
      const progress: GenerationProgress = {
        status: GenerationStatus.GENERATING_PROMPTS,
        currentStep: 'Creating logo variations',
        completedSteps: 0,
        totalSteps: 3,
        percentage: 0,
        message: 'Creating distinct variations of your selected logo...',
        generatedLogos: []
      };

      this.activeGenerations.set(workflowId, progress);
      if (onProgress) {
        this.progressCallbacks.set(workflowId, onProgress);
        onProgress(progress);
      }

      // Create variation prompts based on the original logo
      const basePrompt = originalLogo.prompt;
      const variations: GeneratedLogo[] = [];

      // Define three specific variation types
      const variationPrompts = [
        {
          name: 'Layout Variation',
          prompt: `RESTRUCTURE this logo layout completely. Move the text "${originalLogo.metadata.companyName}" from its current position to the OPPOSITE side (if it's on left, move to right; if on top, move to bottom; if centered, move to corner). Rotate or flip the entire design orientation. Change the text from horizontal to vertical or vice versa. Make the layout transformation OBVIOUS and DRAMATIC. Keep exact same colors, fonts, and design elements - ONLY change spatial positioning and orientation. The layout must look noticeably different.`
        },
        {
          name: 'Inverted Colors',
          prompt: `Create an inverted color version of this logo by reversing all colors - make light colors dark and dark colors light. If there's white background make it black, if there's black text make it white, etc. Keep the company name "${originalLogo.metadata.companyName}" and exact same layout and design elements, only invert the color scheme completely.`
        },
        {
          name: 'Christmas Edition',
          prompt: `Add festive Christmas decorations to this logo while keeping the company name "${originalLogo.metadata.companyName}" and core design intact. Add Christmas elements like: Santa hat on any characters/icons, holly leaves, Christmas tree decorations, snowflakes, or red and green festive accents. Make it clearly Christmas-themed but maintain the logo's professional appearance.`
        }
      ];

      for (let i = 0; i < Math.min(variationCount, 3); i++) {
        const variationInfo = variationPrompts[i];
        
        this.updateProgress(workflowId, {
          percentage: (i / 3) * 80,
          message: `Creating ${variationInfo.name}...`
        });

        console.log(`[WORKFLOW] Variation ${i + 1} (${variationInfo.name}) prompt:`, variationInfo.prompt);
        console.log(`[WORKFLOW] Using original logo URL:`, originalLogo.imageUrl);

        // Use Flux's image editing capabilities with the original logo as input
        let fluxResult;
        
        if (originalLogo.imageUrl) {
          // Convert URL to base64 if needed, or use existing base64 data
          let inputImageData = originalLogo.imageBase64;
          
          if (!inputImageData) {
            console.log(`[WORKFLOW] Converting image URL to base64 for Flux editing...`);
            try {
              const response = await fetch(originalLogo.imageUrl);
              if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status}`);
              }
              const buffer = await response.arrayBuffer();
              const base64 = Buffer.from(buffer).toString('base64');
              const contentType = response.headers.get('content-type') || 'image/png';
              inputImageData = `data:${contentType};base64,${base64}`;
            } catch (error) {
              console.error(`[WORKFLOW] Failed to convert image URL to base64:`, error);
              throw new Error(`Failed to prepare image for editing: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
          
          // Use the base64 data for editing
          fluxResult = await fluxService.editImage(
            inputImageData,
            variationInfo.prompt,
            {
              aspectRatio: basePrompt.aspectRatio,
              outputFormat: 'png',
              promptUpsampling: true,
              safetyTolerance: 2,
            }
          );
        } else {
          // Fallback to generation if no image URL (shouldn't happen)
          const fallbackPrompt = `${basePrompt.mainPrompt}. ${variationInfo.prompt}`;
          fluxResult = await fluxService.generateImage({
            prompt: fallbackPrompt,
            aspectRatio: basePrompt.aspectRatio,
            outputFormat: 'png'
          });
        }

        if (fluxResult.success && fluxResult.imageUrl) {
          const variation: GeneratedLogo = {
            id: this.generateLogoId(),
            imageUrl: fluxResult.imageUrl,
            imageBase64: fluxResult.imageData,
            prompt: {
              ...basePrompt,
              mainPrompt: variationInfo.prompt
            },
            fluxRequestId: fluxResult.generationId,
            metadata: {
              ...originalLogo.metadata,
              createdAt: new Date(),
              generationType: 'variation',
              processingTime: Date.now() - startTime
            },
            status: 'completed'
          };
          variations.push(variation);
          console.log(`[WORKFLOW] Successfully created ${variationInfo.name}`);
        } else {
          const failedVariation: GeneratedLogo = {
            id: this.generateLogoId(),
            imageUrl: '',
            prompt: basePrompt,
            metadata: {
              ...originalLogo.metadata,
              createdAt: new Date(),
              generationType: 'variation',
              processingTime: Date.now() - startTime
            },
            status: 'failed',
            error: fluxResult.error || `Failed to generate ${variationInfo.name}`
          };
          variations.push(failedVariation);
          console.error(`[WORKFLOW] Failed to create ${variationInfo.name}:`, fluxResult.error);
        }
      }

      // Complete
      const finalProgress: GenerationProgress = {
        status: GenerationStatus.COMPLETED,
        currentStep: 'Completed',
        completedSteps: 3,
        totalSteps: 3,
        percentage: 100,
        message: `Generated ${variations.filter(v => v.status === 'completed').length} logo variations`,
        generatedLogos: variations
      };

      this.activeGenerations.set(workflowId, finalProgress);
      if (onProgress) {
        onProgress(finalProgress);
      }

      const result: GenerationResult = {
        success: true,
        logos: variations,
        totalGenerated: variations.filter(v => v.status === 'completed').length,
        failedCount: variations.filter(v => v.status === 'failed').length,
        totalProcessingTime: Date.now() - startTime
      };

      this.cleanup(workflowId);
      return result;

    } catch (error) {
      console.error('Logo variations generation failed:', error);
      
      const errorProgress: GenerationProgress = {
        status: GenerationStatus.ERROR,
        currentStep: 'Error',
        completedSteps: 0,
        totalSteps: 3,
        percentage: 0,
        message: 'Variation generation failed',
        generatedLogos: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };

      this.activeGenerations.set(workflowId, errorProgress);
      if (onProgress) {
        onProgress(errorProgress);
      }

      this.cleanup(workflowId);
      return {
        success: false,
        logos: [],
        totalGenerated: 0,
        failedCount: 1,
        totalProcessingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Edit existing logo with natural language instructions
   */
  public async editLogo(
    originalLogo: GeneratedLogo,
    editingInstructions: string,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<GenerationResult> {
    const workflowId = this.generateWorkflowId();
    const startTime = Date.now();

    try {
      // Create editing prompt
      const promptRequest: PromptGenerationRequest = {
        businessData: {
          companyName: originalLogo.metadata.companyName,
          industry: originalLogo.metadata.industry,
          businessType: '',
          brandDescription: '',
          targetAudience: '',
          stylePreferences: originalLogo.metadata.styles,
          colorPreferences: originalLogo.metadata.colors
        },
        generationType: 'edit',
        editingInstructions
      };

      const editPrompt = promptEngineeringService.generateLogoPrompt(promptRequest);
      const optimizedPrompt = promptEngineeringService.optimizePromptForFlux(editPrompt);

              // Use Flux's image editing capabilities
        // Convert URL to base64 if needed, or use existing base64 data
        let inputImageData = originalLogo.imageBase64;
        
        if (!inputImageData) {
          console.log(`[WORKFLOW] Converting image URL to base64 for Flux editing...`);
          try {
            const response = await fetch(originalLogo.imageUrl);
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.status}`);
            }
            const buffer = await response.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            const contentType = response.headers.get('content-type') || 'image/png';
            inputImageData = `data:${contentType};base64,${base64}`;
          } catch (error) {
            console.error(`[WORKFLOW] Failed to convert image URL to base64:`, error);
            throw new Error(`Failed to prepare image for editing: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        
        const editResult = await fluxService.editImage(
          inputImageData,
          optimizedPrompt.mainPrompt,
          {
            aspectRatio: optimizedPrompt.aspectRatio,
            outputFormat: 'png'
          }
        );

              if (editResult.success && editResult.imageUrl) {
          const editedLogo: GeneratedLogo = {
            id: this.generateLogoId(),
            imageUrl: editResult.imageUrl,
            imageBase64: editResult.imageData,
            prompt: optimizedPrompt,
            fluxRequestId: editResult.generationId,
            metadata: {
              ...originalLogo.metadata,
              createdAt: new Date(),
              generationType: 'edit',
              processingTime: Date.now() - startTime
            },
            status: 'completed'
          };

        return {
          success: true,
          logos: [editedLogo],
          totalGenerated: 1,
          failedCount: 0,
          totalProcessingTime: Date.now() - startTime
        };
      } else {
        throw new Error(editResult.error || 'Failed to edit logo');
      }

    } catch (error) {
      return {
        success: false,
        logos: [],
        totalGenerated: 0,
        failedCount: 1,
        totalProcessingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get current progress for active generation
   */
  public getGenerationProgress(workflowId: string): GenerationProgress | null {
    return this.activeGenerations.get(workflowId) || null;
  }

  /**
   * Cancel active generation
   */
  public cancelGeneration(workflowId: string): boolean {
    const progress = this.activeGenerations.get(workflowId);
    if (progress && progress.status !== GenerationStatus.COMPLETED && progress.status !== GenerationStatus.ERROR) {
      this.cleanup(workflowId);
      return true;
    }
    return false;
  }

  /**
   * Generate prompts for logo creation
   */
  private async generatePrompts(workflowId: string, options: LogoGenerationOptions): Promise<GeneratedPrompt[]> {
    const { businessData, inspirationLogo, generateMultiple, variationCount, customPrompt } = options;

    const promptRequest: PromptGenerationRequest = {
      businessData,
      inspirationLogo,
      generationType: 'new',
      additionalContext: customPrompt
    };

    if (generateMultiple && variationCount && variationCount > 1) {
      // Generate multiple prompt variations
      const variations = promptEngineeringService.generatePromptVariations(promptRequest, variationCount);
      return variations.map(prompt => promptEngineeringService.optimizePromptForFlux(prompt));
    } else {
      // Generate single prompt
      const prompt = promptEngineeringService.generateLogoPrompt(promptRequest);
      return [promptEngineeringService.optimizePromptForFlux(prompt)];
    }
  }

  /**
   * Create logos from generated prompts
   */
  private async createLogosFromPrompts(
    workflowId: string,
    prompts: GeneratedPrompt[],
    options: LogoGenerationOptions
  ): Promise<GeneratedLogo[]> {
    const generatedLogos: GeneratedLogo[] = [];
    const startTime = Date.now();

    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      
      try {
        // Update progress
        this.updateProgress(workflowId, {
          percentage: 25 + ((i / prompts.length) * 40), // 25-65% range
          message: `Generating logo ${i + 1} of ${prompts.length}...`
        });

        // Create logo using Flux Kontext Pro
        let fluxResult;
        
        if (options.inspirationLogo?.dataUrl) {
          // Use context editing with inspiration image
          console.log(`[WORKFLOW] Using context editing with inspiration logo for ${options.businessData.companyName}`);
          
          // Create a context-aware editing prompt for the inspiration logo
          const styleDescription = options.businessData.stylePreferences.join(', ') || 'modern';
          const colorDescription = options.businessData.colorPreferences.join(', ') || 'professional colors';
          const industryDescription = options.businessData.industry || 'business';
          
          const contextEditPrompt = `Edit this existing logo design. MODIFY it for the company "${options.businessData.companyName}". Replace any existing company name or text with "${options.businessData.companyName}". Adapt the design for a ${industryDescription} business with ${styleDescription} style and ${colorDescription}. KEEP the overall visual structure, layout, and design elements but customize the text and refine details to match the new business requirements. Maintain the same artistic style and composition.`;
          
          fluxResult = await fluxService.editImage(
            options.inspirationLogo.dataUrl,
            contextEditPrompt,
            {
              aspectRatio: prompt.aspectRatio,
              outputFormat: 'png',
              promptUpsampling: true,
              safetyTolerance: 2,
            }
          );
        } else {
          // Generate new logo from scratch
          console.log(`[WORKFLOW] Generating new logo from scratch for ${options.businessData.companyName}`);
          
          fluxResult = await fluxService.generateImage({
            prompt: prompt.mainPrompt,
            aspectRatio: prompt.aspectRatio,
            outputFormat: 'png'
          });
        }

        if (fluxResult.success && fluxResult.imageUrl) {
          const logo: GeneratedLogo = {
            id: this.generateLogoId(),
            imageUrl: fluxResult.imageUrl,
            imageBase64: fluxResult.imageData,
            prompt,
            fluxRequestId: fluxResult.generationId,
            metadata: {
              createdAt: new Date(),
              generationType: 'new',
              companyName: options.businessData.companyName,
              industry: options.businessData.industry,
              styles: options.businessData.stylePreferences,
              colors: options.businessData.colorPreferences,
              inspirationUsed: !!options.inspirationLogo,
              processingTime: Date.now() - startTime
            },
            status: 'completed'
          };

          generatedLogos.push(logo);
        } else {
          // Handle failed generation
          const failedLogo: GeneratedLogo = {
            id: this.generateLogoId(),
            imageUrl: '',
            prompt,
            fluxRequestId: fluxResult.generationId,
            metadata: {
              createdAt: new Date(),
              generationType: 'new',
              companyName: options.businessData.companyName,
              industry: options.businessData.industry,
              styles: options.businessData.stylePreferences,
              colors: options.businessData.colorPreferences,
              inspirationUsed: !!options.inspirationLogo,
              processingTime: Date.now() - startTime
            },
            status: 'failed',
            error: fluxResult.error || 'Unknown generation error'
          };

          generatedLogos.push(failedLogo);
        }

      } catch (error) {
        console.error(`Failed to generate logo ${i + 1}:`, error);
        
        const failedLogo: GeneratedLogo = {
          id: this.generateLogoId(),
          imageUrl: '',
          prompt,
          metadata: {
            createdAt: new Date(),
            generationType: 'new',
            companyName: options.businessData.companyName,
            industry: options.businessData.industry,
            styles: options.businessData.stylePreferences,
            colors: options.businessData.colorPreferences,
            inspirationUsed: !!options.inspirationLogo,
            processingTime: Date.now() - startTime
          },
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        };

        generatedLogos.push(failedLogo);
      }
    }

    return generatedLogos;
  }

  /**
   * Process generation results and prepare final output
   */
  private async processGenerationResults(workflowId: string, logos: GeneratedLogo[]): Promise<GeneratedLogo[]> {
    // Update progress to show processing
    this.updateProgress(workflowId, {
      message: 'Processing and optimizing generated logos...'
    });

    // Sort logos by success status, then by processing time
    logos.sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return -1;
      if (a.status !== 'completed' && b.status === 'completed') return 1;
      return a.metadata.processingTime - b.metadata.processingTime;
    });

    // Update final progress with generated logos
    this.updateProgress(workflowId, {
      generatedLogos: logos,
      percentage: 95,
      message: 'Finalizing results...'
    });

    return logos;
  }

  /**
   * Calculate total steps for progress tracking
   */
  private calculateTotalSteps(options: LogoGenerationOptions): number {
    const baseSteps = 4; // Prompt generation, creation, processing, completion
    const logoCount = options.variationCount || 1;
    return baseSteps + logoCount;
  }

  /**
   * Update generation progress
   */
  private updateProgress(workflowId: string, updates: Partial<GenerationProgress>): void {
    const currentProgress = this.activeGenerations.get(workflowId);
    if (currentProgress) {
      const updatedProgress = { ...currentProgress, ...updates };
      this.activeGenerations.set(workflowId, updatedProgress);
      
      const callback = this.progressCallbacks.get(workflowId);
      if (callback) {
        callback(updatedProgress);
      }
    }
  }

  /**
   * Generate unique workflow ID
   */
  private generateWorkflowId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique logo ID
   */
  private generateLogoId(): string {
    return `logo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup workflow resources
   */
  private cleanup(workflowId: string): void {
    this.activeGenerations.delete(workflowId);
    this.progressCallbacks.delete(workflowId);
  }

  /**
   * Get workflow statistics
   */
  public getWorkflowStats(): {
    activeGenerations: number;
    totalWorkflowsProcessed: number;
  } {
    return {
      activeGenerations: this.activeGenerations.size,
      totalWorkflowsProcessed: 0 // Could be tracked in persistent storage
    };
  }
}

// Export singleton instance
export const logoGenerationWorkflowService = LogoGenerationWorkflowService.getInstance(); 