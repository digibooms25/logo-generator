/**
 * Unit tests for LLM Integration Service
 */

import {
  LLMIntegrationService,
  llmService,
  LLMAPIError,
  LLMParsingError,
  type BusinessInfoExtractionRequest,
  type BusinessInfoExtractionResponse,
} from './llm-integration';
import { BusinessType, LogoCategory, LogoStyle } from '@/types/logo';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock config
jest.mock('@/lib/config', () => ({
  config: {
    llm: {
      openai: {
        apiKey: 'test-openai-key',
        model: 'gpt-4o-mini',
      },
      anthropic: {
        apiKey: 'test-anthropic-key',
        model: 'claude-3-haiku-20240307',
      },
      google: {
        apiKey: 'test-google-key',
        model: 'gemini-pro',
      },
    },
  },
  getPreferredLLMProvider: jest.fn(() => 'openai'),
}));

describe('LLMIntegrationService', () => {
  let service: LLMIntegrationService;
  
  const mockBusinessInfo = {
    companyName: 'TechCorp',
    industry: 'technology',
    businessType: 'startup',
    targetAudience: 'tech entrepreneurs',
    brandPersonality: ['innovative', 'professional'],
    colorPreferences: ['blue', '#FF5722'],
    stylePreferences: ['modern', 'minimalist'],
    existingBranding: {
      hasLogo: false,
      brandColors: [],
      brandFonts: [],
      brandDescription: null,
    },
    additionalRequirements: 'Must be scalable',
  };

  beforeEach(() => {
    service = new LLMIntegrationService();
    jest.clearAllMocks();
  });

  describe('extractBusinessInformation', () => {

    describe('OpenAI provider', () => {
      it('should successfully extract business information from OpenAI', async () => {
        const mockResponse = {
          choices: [
            {
              message: {
                content: JSON.stringify(mockBusinessInfo),
              },
            },
          ],
          usage: {
            prompt_tokens: 150,
            completion_tokens: 85,
            total_tokens: 235,
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        } as Response);

        const request: BusinessInfoExtractionRequest = {
          userInput: 'My company is TechCorp, a technology startup for tech entrepreneurs',
          provider: 'openai',
        };

        const result = await service.extractBusinessInformation(request);

        expect(result.success).toBe(true);
        expect(result.extractedInfo?.companyName).toBe('TechCorp');
        expect(result.extractedInfo?.industry).toBe(LogoCategory.TECHNOLOGY);
        expect(result.extractedInfo?.businessType).toBe(BusinessType.STARTUP);
        expect(result.provider).toBe('openai');
        expect(result.confidence).toBeGreaterThan(0.8);
        expect(result.usage).toEqual({
          promptTokens: 150,
          completionTokens: 85,
          totalTokens: 235,
        });
      });

      it('should handle OpenAI API errors', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: () => Promise.resolve({ error: 'Invalid API key' }),
        } as Response);

        const request: BusinessInfoExtractionRequest = {
          userInput: 'Test input',
          provider: 'openai',
        };

        const result = await service.extractBusinessInformation(request);

        expect(result.success).toBe(false);
        expect(result.error).toContain('OpenAI API error: 401 Unauthorized');
        expect(result.provider).toBe('openai');
      });
    });

    describe('Anthropic provider', () => {
      it('should successfully extract business information from Anthropic', async () => {
        const mockResponse = {
          content: [
            {
              text: JSON.stringify(mockBusinessInfo),
            },
          ],
          usage: {
            input_tokens: 140,
            output_tokens: 75,
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        } as Response);

        const request: BusinessInfoExtractionRequest = {
          userInput: 'TechCorp startup in technology',
          provider: 'anthropic',
        };

        const result = await service.extractBusinessInformation(request);

        expect(result.success).toBe(true);
        expect(result.extractedInfo?.companyName).toBe('TechCorp');
        expect(result.provider).toBe('anthropic');
        expect(result.usage?.totalTokens).toBe(215);
      });

      it('should handle Anthropic API errors', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: () => Promise.resolve({ error: 'Invalid request' }),
        } as Response);

        const request: BusinessInfoExtractionRequest = {
          userInput: 'Test input',
          provider: 'anthropic',
        };

        const result = await service.extractBusinessInformation(request);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Anthropic API error: 400 Bad Request');
      });
    });

    describe('Google AI provider', () => {
      it('should successfully extract business information from Google AI', async () => {
        const mockResponse = {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify(mockBusinessInfo),
                  },
                ],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 160,
            candidatesTokenCount: 90,
            totalTokenCount: 250,
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        } as Response);

        const request: BusinessInfoExtractionRequest = {
          userInput: 'TechCorp tech startup',
          provider: 'google',
        };

        const result = await service.extractBusinessInformation(request);

        expect(result.success).toBe(true);
        expect(result.extractedInfo?.companyName).toBe('TechCorp');
        expect(result.provider).toBe('google');
        expect(result.usage?.totalTokens).toBe(250);
      });

      it('should handle Google AI API errors', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          json: () => Promise.resolve({ error: 'API key expired' }),
        } as Response);

        const request: BusinessInfoExtractionRequest = {
          userInput: 'Test input',
          provider: 'google',
        };

        const result = await service.extractBusinessInformation(request);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Google AI API error: 403 Forbidden');
      });
    });

    describe('Data parsing and validation', () => {
      it('should parse and validate complete business information', async () => {
        const completeBusinessInfo = {
          companyName: 'Complete Corp',
          industry: 'healthcare',
          businessType: 'enterprise',
          targetAudience: 'hospitals and clinics',
          brandPersonality: ['trustworthy', 'innovative', 'professional'],
          colorPreferences: ['blue', 'white', '#00FF00'],
          stylePreferences: ['professional', 'clean', 'modern'],
          existingBranding: {
            hasLogo: true,
            brandColors: ['#0066CC', '#FFFFFF'],
            brandFonts: ['Arial', 'Helvetica'],
            brandDescription: 'Current logo is outdated',
          },
          additionalRequirements: 'Must comply with medical regulations',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: JSON.stringify(completeBusinessInfo) } }],
            usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
          }),
        } as Response);

        const result = await service.extractBusinessInformation({
          userInput: 'Complete description',
          provider: 'openai',
        });

        expect(result.success).toBe(true);
        expect(result.extractedInfo?.companyName).toBe('Complete Corp');
        expect(result.extractedInfo?.industry).toBe(LogoCategory.HEALTHCARE);
        expect(result.extractedInfo?.businessType).toBe(BusinessType.ENTERPRISE);
        expect(result.extractedInfo?.existingBranding?.hasLogo).toBe(true);
        expect(result.confidence).toBe(1); // All fields present
        expect(result.missingFields).toEqual([]);
        expect(result.suggestions).toEqual([]);
      });

      it('should handle partial business information', async () => {
        const partialBusinessInfo = {
          companyName: 'Partial Corp',
          industry: 'tech',
          businessType: 'small_business',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: JSON.stringify(partialBusinessInfo) } }],
          }),
        } as Response);

        const result = await service.extractBusinessInformation({
          userInput: 'Partial description',
          provider: 'openai',
        });

        expect(result.success).toBe(true);
        expect(result.extractedInfo?.companyName).toBe('Partial Corp');
        expect(result.extractedInfo?.industry).toBe(LogoCategory.TECHNOLOGY);
        expect(result.extractedInfo?.businessType).toBe(BusinessType.SMALL_BUSINESS);
        expect(result.confidence).toBeLessThan(1);
        expect(result.missingFields).toEqual([]);
        expect(result.suggestions?.length).toBeGreaterThan(0);
      });

      it('should handle missing required fields', async () => {
        const incompleteBusinessInfo = {
          companyName: 'Incomplete Corp',
          // Missing industry and businessType
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: JSON.stringify(incompleteBusinessInfo) } }],
          }),
        } as Response);

        const result = await service.extractBusinessInformation({
          userInput: 'Incomplete description',
          provider: 'openai',
        });

        expect(result.success).toBe(true);
        expect(result.extractedInfo?.companyName).toBe('Incomplete Corp');
        expect(result.missingFields).toContain('industry');
        expect(result.missingFields).toContain('businessType');
        expect(result.confidence).toBeLessThan(0.5);
      });

      it('should normalize industry and business type values', async () => {
        const unnormalizedBusinessInfo = {
          companyName: 'Normalize Corp',
          industry: 'Software Development', // Should become 'technology'
          businessType: 'Small Company', // Should become 'small_business'
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: JSON.stringify(unnormalizedBusinessInfo) } }],
          }),
        } as Response);

        const result = await service.extractBusinessInformation({
          userInput: 'Normalize description',
          provider: 'openai',
        });

        expect(result.success).toBe(true);
        expect(result.extractedInfo?.industry).toBe(LogoCategory.TECHNOLOGY);
        expect(result.extractedInfo?.businessType).toBe(BusinessType.SMALL_BUSINESS);
      });

      it('should filter invalid style preferences', async () => {
        const invalidStylesBusinessInfo = {
          companyName: 'Style Corp',
          industry: 'technology',
          businessType: 'startup',
          stylePreferences: ['modern', 'invalid-style', 'minimalist', 'another-invalid'],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: JSON.stringify(invalidStylesBusinessInfo) } }],
          }),
        } as Response);

        const result = await service.extractBusinessInformation({
          userInput: 'Style description',
          provider: 'openai',
        });

        expect(result.success).toBe(true);
        expect(result.extractedInfo?.stylePreferences).toEqual([
          LogoStyle.MODERN,
          LogoStyle.MINIMALIST,
        ]);
      });

      it('should handle invalid JSON response', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'Invalid JSON response' } }],
          }),
        } as Response);

        const result = await service.extractBusinessInformation({
          userInput: 'Test input',
          provider: 'openai',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Failed to parse business information');
      });
    });

    describe('Provider configuration and validation', () => {
      it('should handle missing API key', async () => {
        // Create service instance with no API key for testing
        const serviceWithoutKey = new (class extends LLMIntegrationService {
          constructor() {
            super();
            // @ts-ignore - accessing private property for testing
            this.providers.openai.apiKey = '';
          }
        })();

        await expect(serviceWithoutKey.extractBusinessInformation({
          userInput: 'Test input',
          provider: 'openai',
        })).rejects.toThrow('Provider openai is not configured');
      });

      it('should use default provider when none specified', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: JSON.stringify(mockBusinessInfo) } }],
          }),
        } as Response);

        const result = await service.extractBusinessInformation({
          userInput: 'Test input',
          // No provider specified
        });

        expect(result.success).toBe(true);
        expect(result.provider).toBe('openai'); // Default from mock
      });

      it('should handle network errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const result = await service.extractBusinessInformation({
          userInput: 'Test input',
          provider: 'openai',
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Network error');
      });
    });
  });

  describe('Utility methods', () => {
    describe('getAvailableProviders', () => {
      it('should return providers with API keys', () => {
        const providers = service.getAvailableProviders();
        expect(providers).toContain('openai');
        expect(providers).toContain('anthropic');
        expect(providers).toContain('google');
      });
    });

    describe('getProviderInfo', () => {
      it('should return provider configuration without API key', () => {
        const info = service.getProviderInfo('openai');
        expect(info).toEqual({
          model: 'gpt-4o-mini',
          available: true,
          endpoint: 'https://api.openai.com/v1/chat/completions',
        });
      });

      it('should return null for unknown provider', () => {
        // @ts-ignore - testing invalid provider
        const info = service.getProviderInfo('unknown');
        expect(info).toBeNull();
      });
    });

    describe('healthCheck', () => {
      it('should check all providers health', async () => {
        // Mock successful responses for all providers
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
              choices: [{ message: { content: JSON.stringify(mockBusinessInfo) } }],
            }),
          } as Response)
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
              content: [{ text: JSON.stringify(mockBusinessInfo) }],
            }),
          } as Response)
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
              candidates: [{ content: { parts: [{ text: JSON.stringify(mockBusinessInfo) }] } }],
            }),
          } as Response);

        const health = await service.healthCheck();

        expect(health.openai.available).toBe(true);
        expect(health.anthropic.available).toBe(true);
        expect(health.google.available).toBe(true);
      });

      it('should handle provider failures in health check', async () => {
        mockFetch
          .mockRejectedValueOnce(new Error('OpenAI down'))
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: () => Promise.resolve({ error: 'Server error' }),
          } as Response)
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
              candidates: [{ content: { parts: [{ text: JSON.stringify(mockBusinessInfo) }] } }],
            }),
          } as Response);

        const health = await service.healthCheck();

        expect(health.openai.available).toBe(false);
        expect(health.openai.error).toBe('OpenAI down');
        expect(health.anthropic.available).toBe(false);
        expect(health.google.available).toBe(true);
      });
    });
  });

  describe('Error classes', () => {
    it('should create LLMAPIError correctly', () => {
      const error = new LLMAPIError('Test error', 'openai', 400, { detail: 'Bad request' });
      
      expect(error.name).toBe('LLMAPIError');
      expect(error.message).toBe('Test error');
      expect(error.provider).toBe('openai');
      expect(error.statusCode).toBe(400);
      expect(error.response).toEqual({ detail: 'Bad request' });
    });

    it('should create LLMParsingError correctly', () => {
      const error = new LLMParsingError('Parse error', 'openai', 'invalid json');
      
      expect(error.name).toBe('LLMParsingError');
      expect(error.message).toBe('Parse error');
      expect(error.provider).toBe('openai');
      expect(error.rawResponse).toBe('invalid json');
    });
  });

  describe('Singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(llmService).toBeInstanceOf(LLMIntegrationService);
    });
  });
}); 