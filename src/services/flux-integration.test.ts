/**
 * Unit tests for Flux Kontext Pro API Integration Service
 */

import { 
  FluxKontextProService, 
  fluxService,
  FluxAPIError,
  FluxTimeoutError,
  FluxModerationError,
  type FluxGenerationOptions,
  type FluxKontextProResult
} from './flux-integration';
import { config } from '@/lib/config';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock config
jest.mock('@/lib/config', () => ({
  config: {
    flux: {
      baseUrl: 'https://api.bfl.ai',
      apiKey: 'test-api-key',
    },
  },
}));

describe('FluxKontextProService', () => {
  let service: FluxKontextProService;

  beforeEach(() => {
    service = new FluxKontextProService();
    jest.clearAllMocks();
  });

  describe('generateImage', () => {
    it('should successfully generate an image', async () => {
      const mockCreateResponse = {
        id: 'test-id-123',
        polling_url: 'https://api.bfl.ai/v1/get_result?id=test-id-123',
      };

      const mockResult: FluxKontextProResult = {
        id: 'test-id-123',
        status: 'Ready',
        result: {
          sample: 'https://example.com/generated-image.png',
        },
      };

      const mockImageBuffer = new ArrayBuffer(1024);

      // Mock creation request
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCreateResponse),
        } as Response)
        // Mock polling request
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResult),
        } as Response)
        // Mock image download
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(mockImageBuffer),
          headers: new Headers({ 'content-type': 'image/png' }),
        } as Response);

      const options: FluxGenerationOptions = {
        prompt: 'A beautiful sunset',
        aspectRatio: '16:9',
        outputFormat: 'png',
        timeout: 10000, // 10 seconds for tests
        pollingInterval: 100, // Faster polling for tests
      };

      const result = await service.generateImage(options);

      expect(result.success).toBe(true);
      expect(result.imageUrl).toBe('https://example.com/generated-image.png');
      expect(result.imageData).toContain('data:image/png;base64,');
      expect(result.generationId).toBe('test-id-123');
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle API request failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: 'Invalid API key' }),
      } as Response);

      const options: FluxGenerationOptions = {
        prompt: 'Test prompt',
        timeout: 5000,
        pollingInterval: 100,
      };

      const result = await service.generateImage(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('API request failed: 401 Unauthorized');
    });

    it('should handle moderation errors', async () => {
      const mockCreateResponse = {
        id: 'test-id-123',
        polling_url: 'https://api.bfl.ai/v1/get_result?id=test-id-123',
      };

      const mockResult: FluxKontextProResult = {
        id: 'test-id-123',
        status: 'Content Moderated',
        error: 'Content violates safety guidelines',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCreateResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResult),
        } as Response);

      const options: FluxGenerationOptions = {
        prompt: 'Inappropriate content',
        timeout: 5000,
        pollingInterval: 100,
      };

      const result = await service.generateImage(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Content was moderated by safety filters');
      expect(result.generationId).toBe('test-id-123');
    });

    it('should handle generation failures', async () => {
      const mockCreateResponse = {
        id: 'test-id-123',
        polling_url: 'https://api.bfl.ai/v1/get_result?id=test-id-123',
      };

      const mockResult: FluxKontextProResult = {
        id: 'test-id-123',
        status: 'Failed',
        error: 'Generation failed due to server error',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCreateResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResult),
        } as Response);

      const options: FluxGenerationOptions = {
        prompt: 'Test prompt',
        timeout: 5000,
        pollingInterval: 100,
      };

      const result = await service.generateImage(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Generation failed due to server error');
    });

    it('should retry on transient failures', async () => {
      const mockCreateResponse = {
        id: 'test-id-123',
        polling_url: 'https://api.bfl.ai/v1/get_result?id=test-id-123',
      };

      // First attempt fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCreateResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'test-id-123',
            status: 'Ready',
            result: { sample: 'https://example.com/image.png' },
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
          headers: new Headers({ 'content-type': 'image/png' }),
        } as Response);

      const options: FluxGenerationOptions = {
        prompt: 'Test prompt',
        maxRetries: 2,
        timeout: 5000,
        pollingInterval: 100,
      };

      const result = await service.generateImage(options);

      expect(result.success).toBe(true);
      expect(result.retryCount).toBe(1);
    });

    it('should timeout after specified duration', async () => {
      const mockCreateResponse = {
        id: 'test-id-123',
        polling_url: 'https://api.bfl.ai/v1/get_result?id=test-id-123',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCreateResponse),
        } as Response)
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            id: 'test-id-123',
            status: 'Running',
          }),
        } as Response);

      const options: FluxGenerationOptions = {
        prompt: 'Test prompt',
        timeout: 100, // Very short timeout
        pollingInterval: 50,
      };

      const result = await service.generateImage(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Generation timed out');
    });

    it('should handle missing API key', async () => {
      // Create a service instance with no API key
      const serviceWithoutKey = new (class extends FluxKontextProService {
        constructor() {
          super();
          // @ts-ignore - accessing private property for testing
          this.apiKey = undefined;
        }
      })();

      const options: FluxGenerationOptions = {
        prompt: 'Test prompt',
        timeout: 5000,
        pollingInterval: 100,
      };

      const result = await serviceWithoutKey.generateImage(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Flux API key is not configured');
    });
  });

  describe('editImage', () => {
    it('should edit an existing image', async () => {
      const mockCreateResponse = {
        id: 'edit-id-123',
        polling_url: 'https://api.bfl.ai/v1/get_result?id=edit-id-123',
      };

      const mockResult: FluxKontextProResult = {
        id: 'edit-id-123',
        status: 'Ready',
        result: {
          sample: 'https://example.com/edited-image.png',
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCreateResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResult),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
          headers: new Headers({ 'content-type': 'image/png' }),
        } as Response);

      const inputImage = 'base64-encoded-image-data';
      const editPrompt = 'Change the background to blue';

      const result = await service.editImage(inputImage, editPrompt);

      expect(result.success).toBe(true);
      expect(result.imageUrl).toBe('https://example.com/edited-image.png');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.bfl.ai/v1/flux-kontext-pro',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"input_image":"base64-encoded-image-data"'),
        })
      );
    });
  });

  describe('generateLogoVariations', () => {
    it('should generate multiple logo variations', async () => {
      const basePrompt = 'Modern tech logo';
      const variations = ['in blue', 'in red', 'minimalist style'];

      // Mock responses for each variation
      variations.forEach((_, index) => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
              id: `var-${index}`,
              polling_url: `https://api.bfl.ai/v1/get_result?id=var-${index}`,
            }),
          } as Response)
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
              id: `var-${index}`,
              status: 'Ready',
              result: { sample: `https://example.com/variation-${index}.png` },
            }),
          } as Response)
          .mockResolvedValueOnce({
            ok: true,
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
            headers: new Headers({ 'content-type': 'image/png' }),
          } as Response);
      });

      const results = await service.generateLogoVariations(basePrompt, variations, {
        timeout: 5000,
        pollingInterval: 100,
      });

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.imageUrl).toBe(`https://example.com/variation-${index}.png`);
      });
    });
  });

  describe('utility methods', () => {
    it('should return supported aspect ratios', () => {
      const ratios = service.getSupportedAspectRatios();
      
      expect(ratios).toContain('1:1');
      expect(ratios).toContain('16:9');
      expect(ratios).toContain('9:16');
      expect(ratios.length).toBeGreaterThan(5);
    });

    it('should validate aspect ratios correctly', () => {
      expect(service.isValidAspectRatio('1:1')).toBe(true);
      expect(service.isValidAspectRatio('16:9')).toBe(true);
      expect(service.isValidAspectRatio('5:4')).toBe(false);
      expect(service.isValidAspectRatio('invalid')).toBe(false);
    });
  });

  describe('healthCheck', () => {
    it('should return available when API is working', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'health-check',
            polling_url: 'https://api.bfl.ai/v1/get_result?id=health-check',
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'health-check',
            status: 'Ready',
            result: { sample: 'https://example.com/health-check.png' },
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
          headers: new Headers({ 'content-type': 'image/png' }),
        } as Response);

      const health = await service.healthCheck();

      expect(health.available).toBe(true);
      expect(health.error).toBeUndefined();
    });

    it('should return unavailable when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const health = await service.healthCheck();

      expect(health.available).toBe(false);
      expect(health.error).toBe('Network error');
    });
  });

  describe('error classes', () => {
    it('should create FluxAPIError correctly', () => {
      const error = new FluxAPIError('Test error', 404, { detail: 'Not found' });
      
      expect(error.name).toBe('FluxAPIError');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(404);
      expect(error.response).toEqual({ detail: 'Not found' });
    });

    it('should create FluxTimeoutError correctly', () => {
      const error = new FluxTimeoutError('Timeout occurred', 'gen-123');
      
      expect(error.name).toBe('FluxTimeoutError');
      expect(error.message).toBe('Timeout occurred');
      expect(error.generationId).toBe('gen-123');
    });

    it('should create FluxModerationError correctly', () => {
      const error = new FluxModerationError('Content moderated', 'gen-123');
      
      expect(error.name).toBe('FluxModerationError');
      expect(error.message).toBe('Content moderated');
      expect(error.generationId).toBe('gen-123');
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(fluxService).toBeInstanceOf(FluxKontextProService);
    });
  });
}); 