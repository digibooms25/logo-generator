/**
 * Flux Kontext Pro API Integration Service
 * Handles image generation and editing using the Flux Kontext Pro API
 */

import { config } from '@/lib/config';

// API Types based on Flux Kontext Pro documentation
export interface FluxKontextProRequest {
  prompt: string;
  input_image?: string; // base64 encoded image
  seed?: number;
  aspect_ratio?: string; // e.g., "16:9", "1:1", "3:4"
  output_format?: 'jpeg' | 'png';
  webhook_url?: string;
  webhook_secret?: string;
  prompt_upsampling?: boolean;
  safety_tolerance?: number; // 0-2, 0 being most strict
}

export interface FluxKontextProResponse {
  id: string;
  polling_url: string;
}

export interface FluxKontextProResult {
  id: string;
  status: 'Pending' | 'Request Moderated' | 'Content Moderated' | 'Running' | 'Ready' | 'Error' | 'Failed';
  result?: {
    sample: string; // URL to the generated image
  };
  error?: string;
  created_at?: string;
  started_at?: string;
  ended_at?: string;
}

export interface FluxGenerationOptions {
  prompt: string;
  inputImage?: string; // base64 encoded
  seed?: number;
  aspectRatio?: string;
  outputFormat?: 'jpeg' | 'png';
  promptUpsampling?: boolean;
  safetyTolerance?: number;
  maxRetries?: number;
  pollingInterval?: number; // milliseconds
  timeout?: number; // milliseconds
}

export interface FluxGenerationResult {
  success: boolean;
  imageUrl?: string;
  imageData?: string; // base64 encoded
  generationId: string;
  processingTime?: number;
  error?: string;
  retryCount?: number;
}

// Custom error types
export class FluxAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'FluxAPIError';
  }
}

export class FluxTimeoutError extends Error {
  constructor(message: string, public generationId: string) {
    super(message);
    this.name = 'FluxTimeoutError';
  }
}

export class FluxModerationError extends Error {
  constructor(message: string, public generationId: string) {
    super(message);
    this.name = 'FluxModerationError';
  }
}

/**
 * Flux Kontext Pro Integration Service
 */
class FluxKontextProService {
  private readonly baseUrl = config.flux.baseUrl;
  private readonly apiKey = config.flux.apiKey;
  private readonly defaultTimeout = 5 * 60 * 1000; // 5 minutes
  private readonly defaultPollingInterval = 2000; // 2 seconds
  private readonly maxRetries = 3;

  /**
   * Create a new image generation request
   */
  private async createRequest(options: FluxKontextProRequest): Promise<FluxKontextProResponse> {
    if (!this.apiKey) {
      throw new FluxAPIError('Flux API key is not configured');
    }

    const response = await fetch(`${this.baseUrl}/v1/flux-kontext-pro`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-key': this.apiKey,
        'accept': 'application/json',
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new FluxAPIError(
        `API request failed: ${response.status} ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return response.json();
  }

  /**
   * Poll for generation result
   */
  private async pollResult(pollingUrl: string): Promise<FluxKontextProResult> {
    if (!this.apiKey) {
      throw new FluxAPIError('Flux API key is not configured');
    }

    const response = await fetch(pollingUrl, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'x-key': this.apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new FluxAPIError(
        `Polling failed: ${response.status} ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return response.json();
  }

  /**
   * Wait for generation to complete with polling
   */
  private async waitForCompletion(
    pollingUrl: string,
    generationId: string,
    timeout: number = this.defaultTimeout,
    pollingInterval: number = this.defaultPollingInterval
  ): Promise<FluxKontextProResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const result = await this.pollResult(pollingUrl);

        switch (result.status) {
          case 'Ready':
            return result;
          
          case 'Error':
          case 'Failed':
            throw new FluxAPIError(
              result.error || 'Generation failed',
              undefined,
              result
            );
          
          case 'Request Moderated':
          case 'Content Moderated':
            throw new FluxModerationError(
              'Content was moderated by safety filters',
              generationId
            );
          
          case 'Pending':
          case 'Running':
            // Continue polling
            await new Promise(resolve => setTimeout(resolve, pollingInterval));
            break;
          
          default:
            console.warn(`Unknown status: ${result.status}`);
            await new Promise(resolve => setTimeout(resolve, pollingInterval));
        }
      } catch (error) {
        if (error instanceof FluxAPIError || error instanceof FluxModerationError) {
          throw error;
        }
        
        // Network or parsing error, continue polling
        console.warn('Polling error, retrying:', error);
        await new Promise(resolve => setTimeout(resolve, pollingInterval));
      }
    }

    throw new FluxTimeoutError(
      `Generation timed out after ${timeout}ms`,
      generationId
    );
  }

  /**
   * Download image from URL and convert to base64
   */
  private async downloadImageAsBase64(imageUrl: string): Promise<string> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      
      // Get content type from response headers
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      return `data:${contentType};base64,${base64}`;
    } catch (error) {
      console.error('Failed to download image:', error);
      throw new FluxAPIError('Failed to download generated image');
    }
  }

  /**
   * Generate a new image using text prompt
   */
  async generateImage(options: FluxGenerationOptions): Promise<FluxGenerationResult> {
    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = options.maxRetries ?? this.maxRetries;

    while (retryCount <= maxRetries) {
      try {
        // Prepare request payload
        const requestPayload: FluxKontextProRequest = {
          prompt: options.prompt,
          ...(options.inputImage && { input_image: options.inputImage }),
          ...(options.seed && { seed: options.seed }),
          ...(options.aspectRatio && { aspect_ratio: options.aspectRatio }),
          output_format: options.outputFormat || 'png',
          prompt_upsampling: options.promptUpsampling || false,
          safety_tolerance: options.safetyTolerance ?? 2,
        };

        // Create generation request
        const response = await this.createRequest(requestPayload);
        
        // Wait for completion
        const result = await this.waitForCompletion(
          response.polling_url,
          response.id,
          options.timeout,
          options.pollingInterval
        );

        if (!result.result?.sample) {
          throw new FluxAPIError('No image URL in result', undefined, result);
        }

        // Download image as base64
        const imageData = await this.downloadImageAsBase64(result.result.sample);
        
        const processingTime = Date.now() - startTime;

        return {
          success: true,
          imageUrl: result.result.sample,
          imageData,
          generationId: response.id,
          processingTime,
          retryCount,
        };

      } catch (error) {
        retryCount++;
        
        if (error instanceof FluxModerationError || error instanceof FluxTimeoutError) {
          // Don't retry moderation errors or timeouts
          return {
            success: false,
            error: error.message,
            generationId: error.generationId,
            retryCount,
          };
        }

        if (retryCount > maxRetries) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            generationId: 'unknown',
            retryCount,
          };
        }

        // Wait before retrying
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      error: 'Maximum retries exceeded',
      generationId: 'unknown',
      retryCount,
    };
  }

  /**
   * Edit an existing image using text prompt
   */
  async editImage(
    inputImage: string,
    editPrompt: string,
    options: Partial<FluxGenerationOptions> = {}
  ): Promise<FluxGenerationResult> {
    return this.generateImage({
      prompt: editPrompt,
      inputImage,
      ...options,
    });
  }

  /**
   * Create logo variations using different prompts
   */
  async generateLogoVariations(
    basePrompt: string,
    variations: string[],
    options: Partial<FluxGenerationOptions> = {}
  ): Promise<FluxGenerationResult[]> {
    const promises = variations.map(variation => 
      this.generateImage({
        prompt: `${basePrompt} ${variation}`,
        ...options,
      })
    );

    return Promise.all(promises);
  }

  /**
   * Get supported aspect ratios
   */
  getSupportedAspectRatios(): string[] {
    return [
      '1:1',   // Square
      '16:9',  // Landscape
      '9:16',  // Portrait
      '4:3',   // Traditional
      '3:4',   // Traditional portrait
      '21:9',  // Ultra-wide
      '9:21',  // Ultra-tall
      '2:3',   // Photo
      '3:2',   // Photo landscape
    ];
  }

  /**
   * Validate aspect ratio
   */
  isValidAspectRatio(aspectRatio: string): boolean {
    return this.getSupportedAspectRatios().includes(aspectRatio);
  }

  /**
   * Health check for the Flux API
   */
  async healthCheck(): Promise<{ available: boolean; error?: string }> {
    try {
      // Simple test generation with minimal prompt
      const result = await this.generateImage({
        prompt: 'simple test image',
        outputFormat: 'jpeg',
        timeout: 30000, // 30 seconds for health check
        maxRetries: 1,
      });

      return { available: result.success };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const fluxService = new FluxKontextProService();

// Export class for testing
export { FluxKontextProService };

// Error types are already exported above 