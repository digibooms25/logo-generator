/**
 * Logo Variations Service Tests
 */

import { 
  logoVariationsService, 
  VariationType,
  type VariationRequest
} from './logo-variations';
import type { GeneratedLogo } from './logo-generation-workflow';

// Mock generated logo for testing
const mockLogo: GeneratedLogo = {
  id: 'test_logo_1',
  imageUrl: 'https://example.com/logo.png',
  imageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  prompt: {
    mainPrompt: 'Modern tech company logo for TechCorp',
    negativePrompt: 'blurry, low quality',
    styleModifiers: ['modern', 'minimalist'],
    aspectRatio: '1:1',
    qualitySettings: {
      steps: 30,
      guidance: 7.5
    },
    metadata: {
      companyName: 'TechCorp',
      industry: 'technology',
      styles: ['modern', 'minimalist'],
      colors: ['blue', 'gray'],
      inspirationUsed: false
    }
  },
  fluxRequestId: 'flux_123',
  metadata: {
    companyName: 'TechCorp',
    industry: 'technology',
    styles: ['modern', 'minimalist'],
    colors: ['blue', 'gray'],
    inspirationUsed: false,
    createdAt: new Date(),
    generationType: 'new',
    processingTime: 5000
  },
  status: 'completed'
};

// Mock Flux service for testing
jest.mock('./flux-integration', () => ({
  fluxService: {
    editImage: jest.fn().mockResolvedValue({
      success: true,
      imageUrl: 'https://example.com/variation.png',
      imageData: 'data:image/png;base64,mockvariation',
      generationId: 'var_123'
    })
  }
}));

describe('LogoVariationsService', () => {
  describe('Variation Generation', () => {
    test('should generate color variations', async () => {
      const request: VariationRequest = {
        baseLogo: mockLogo,
        variationType: VariationType.COLOR,
        count: 3
      };

      const result = await logoVariationsService.generateVariations(request);

      expect(result).toMatchObject({
        id: expect.any(String),
        type: VariationType.COLOR,
        baseLogo: mockLogo,
        variations: expect.any(Array),
        metadata: {
          generatedAt: expect.any(Date),
          processingTime: expect.any(Number),
          successCount: expect.any(Number),
          failureCount: expect.any(Number)
        }
      });

      expect(result.variations.length).toBeLessThanOrEqual(3);
      expect(result.metadata.successCount).toBeGreaterThanOrEqual(0);
    });

    test('should generate layout variations', async () => {
      const request: VariationRequest = {
        baseLogo: mockLogo,
        variationType: VariationType.LAYOUT,
        count: 4
      };

      const result = await logoVariationsService.generateVariations(request);

      expect(result.type).toBe(VariationType.LAYOUT);
      expect(result.variations.length).toBeLessThanOrEqual(4);
      result.variations.forEach(variation => {
        expect(variation).toMatchObject({
          id: expect.stringMatching(/^layout_variation_/),
          imageUrl: expect.any(String),
          prompt: expect.any(Object),
          metadata: expect.any(Object),
          status: 'completed'
        });
      });
    });

    test('should generate seasonal variations', async () => {
      const request: VariationRequest = {
        baseLogo: mockLogo,
        variationType: VariationType.SEASONAL,
        count: 2
      };

      const result = await logoVariationsService.generateVariations(request);

      expect(result.type).toBe(VariationType.SEASONAL);
      expect(result.variations.length).toBeLessThanOrEqual(2);
      result.variations.forEach(variation => {
        expect(variation.id).toMatch(/^seasonal_variation_/);
        expect(variation.prompt.mainPrompt).toContain('adapted for');
      });
    });

    test('should generate style variations', async () => {
      const request: VariationRequest = {
        baseLogo: mockLogo,
        variationType: VariationType.STYLE,
        count: 3
      };

      const result = await logoVariationsService.generateVariations(request);

      expect(result.type).toBe(VariationType.STYLE);
      result.variations.forEach(variation => {
        expect(variation.id).toMatch(/^style_variation_/);
        expect(variation.prompt.mainPrompt).toContain('reimagined in');
      });
    });

    test('should generate size variations', async () => {
      const request: VariationRequest = {
        baseLogo: mockLogo,
        variationType: VariationType.SIZE,
        count: 4
      };

      const result = await logoVariationsService.generateVariations(request);

      expect(result.type).toBe(VariationType.SIZE);
      result.variations.forEach(variation => {
        expect(variation.id).toMatch(/^size_variation_/);
        expect(variation.prompt.mainPrompt).toMatch(/(optimized|designed|adapted|configured)/);
      });
    });

    test('should generate effect variations', async () => {
      const request: VariationRequest = {
        baseLogo: mockLogo,
        variationType: VariationType.EFFECT,
        count: 3
      };

      const result = await logoVariationsService.generateVariations(request);

      expect(result.type).toBe(VariationType.EFFECT);
      result.variations.forEach(variation => {
        expect(variation.id).toMatch(/^effect_variation_/);
        expect(variation.prompt.mainPrompt).toMatch(/(shadow|metallic|glowing|embossed)/);
      });
    });
  });

  describe('Batch Variations', () => {
    test('should generate multiple variation types', async () => {
      const types = [VariationType.COLOR, VariationType.LAYOUT, VariationType.STYLE];
      const countPerType = 2;

      const results = await logoVariationsService.generateBatchVariations(
        mockLogo,
        types,
        countPerType
      );

      expect(results).toHaveLength(types.length);
      results.forEach((result, index) => {
        expect(result.type).toBe(types[index]);
        expect(result.baseLogo).toBe(mockLogo);
        expect(result.variations.length).toBeLessThanOrEqual(countPerType);
      });
    });

    test('should handle mixed success and failure in batch generation', async () => {
      // Mock partial failure
      const { fluxService } = require('./flux-integration');
      let callCount = 0;
      fluxService.editImage.mockImplementation(() => {
        callCount++;
        if (callCount % 3 === 0) {
          return Promise.reject(new Error('Mock failure'));
        }
        return Promise.resolve({
          success: true,
          imageUrl: 'https://example.com/variation.png',
          imageData: 'data:image/png;base64,mockvariation',
          generationId: 'var_123'
        });
      });

      const types = [VariationType.COLOR, VariationType.LAYOUT];
      const results = await logoVariationsService.generateBatchVariations(
        mockLogo,
        types,
        3
      );

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.metadata.failureCount).toBeGreaterThanOrEqual(0);
        expect(result.metadata.successCount + result.metadata.failureCount).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('Variation Options and Descriptions', () => {
    test('should return available variation options', () => {
      const options = logoVariationsService.getVariationOptions();

      expect(options).toMatchObject({
        color: expect.any(Array),
        layout: expect.any(Array),
        seasonal: expect.any(Array),
        style: expect.any(Array)
      });

      expect(options.color.length).toBeGreaterThan(0);
      expect(options.layout.length).toBeGreaterThan(0);
      expect(options.seasonal.length).toBeGreaterThan(0);
      expect(options.style.length).toBeGreaterThan(0);
    });

    test('should return color variation descriptions', () => {
      const descriptions = logoVariationsService.getVariationDescriptions(VariationType.COLOR);

      expect(Object.keys(descriptions).length).toBeGreaterThan(0);
      Object.entries(descriptions).forEach(([key, description]) => {
        expect(typeof key).toBe('string');
        expect(typeof description).toBe('string');
        expect(description.length).toBeGreaterThan(0);
      });
    });

    test('should return layout variation descriptions', () => {
      const descriptions = logoVariationsService.getVariationDescriptions(VariationType.LAYOUT);

      expect(Object.keys(descriptions).length).toBeGreaterThan(0);
      Object.values(descriptions).forEach(description => {
        expect(typeof description).toBe('string');
        expect(description).toMatch(/(layout|arrangement|composition|position)/i);
      });
    });

    test('should return seasonal variation descriptions', () => {
      const descriptions = logoVariationsService.getVariationDescriptions(VariationType.SEASONAL);

      expect(Object.keys(descriptions).length).toBeGreaterThan(0);
      Object.values(descriptions).forEach(description => {
        expect(typeof description).toBe('string');
        expect(description).toMatch(/(spring|summer|autumn|winter|christmas|halloween)/i);
      });
    });

    test('should return style variation descriptions', () => {
      const descriptions = logoVariationsService.getVariationDescriptions(VariationType.STYLE);

      expect(Object.keys(descriptions).length).toBeGreaterThan(0);
      Object.values(descriptions).forEach(description => {
        expect(typeof description).toBe('string');
        expect(description).toMatch(/(style|design|appearance)/i);
      });
    });

    test('should return empty object for unknown variation type', () => {
      const descriptions = logoVariationsService.getVariationDescriptions('unknown' as VariationType);
      expect(descriptions).toEqual({});
    });
  });

  describe('Error Handling', () => {
    test('should handle API failures gracefully', async () => {
      // Mock API failure
      const { fluxService } = require('./flux-integration');
      fluxService.editImage.mockRejectedValueOnce(new Error('API Error'));

      const request: VariationRequest = {
        baseLogo: mockLogo,
        variationType: VariationType.COLOR,
        count: 1
      };

      const result = await logoVariationsService.generateVariations(request);

      expect(result.metadata.failureCount).toBe(1);
      expect(result.metadata.successCount).toBe(0);
      expect(result.variations).toHaveLength(0);
    });

    test('should handle invalid variation type', async () => {
      const request: VariationRequest = {
        baseLogo: mockLogo,
        variationType: 'invalid' as VariationType,
        count: 1
      };

      const result = await logoVariationsService.generateVariations(request);

      expect(result.metadata.failureCount).toBe(1);
      expect(result.metadata.successCount).toBe(0);
    });

    test('should handle malformed logo data', async () => {
      const malformedLogo = {
        ...mockLogo,
        prompt: {
          // @ts-ignore - intentionally malformed
          mainPrompt: null
        }
      };

      const request: VariationRequest = {
        baseLogo: malformedLogo as any,
        variationType: VariationType.COLOR,
        count: 1
      };

      const result = await logoVariationsService.generateVariations(request);

      expect(result).toMatchObject({
        type: VariationType.COLOR,
        baseLogo: malformedLogo,
        metadata: expect.any(Object)
      });
    });
  });

  describe('Performance', () => {
    test('should complete variation generation within reasonable time', async () => {
      const startTime = Date.now();

      const request: VariationRequest = {
        baseLogo: mockLogo,
        variationType: VariationType.COLOR,
        count: 2
      };

      await logoVariationsService.generateVariations(request);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should complete within 5 seconds for testing
      expect(processingTime).toBeLessThan(5000);
    });

    test('should handle large batch requests efficiently', async () => {
      const startTime = Date.now();

      const types = [
        VariationType.COLOR,
        VariationType.LAYOUT,
        VariationType.STYLE,
        VariationType.SEASONAL
      ];

      await logoVariationsService.generateBatchVariations(mockLogo, types, 2);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should handle batch efficiently
      expect(processingTime).toBeLessThan(10000);
    });
  });

  describe('Variation Quality', () => {
    test('should maintain base logo information in variations', async () => {
      const request: VariationRequest = {
        baseLogo: mockLogo,
        variationType: VariationType.COLOR,
        count: 2
      };

      const result = await logoVariationsService.generateVariations(request);

      result.variations.forEach(variation => {
        expect(variation.metadata.companyName).toBe(mockLogo.metadata.companyName);
        expect(variation.metadata.industry).toBe(mockLogo.metadata.industry);
        expect(variation.metadata.generationType).toBe('variation');
        expect(variation.status).toBe('completed');
      });
    });

    test('should include variation-specific modifications in prompts', async () => {
      const request: VariationRequest = {
        baseLogo: mockLogo,
        variationType: VariationType.COLOR,
        count: 1
      };

      const result = await logoVariationsService.generateVariations(request);

      if (result.variations.length > 0) {
        const variation = result.variations[0];
        expect(variation.prompt.mainPrompt).not.toBe(mockLogo.prompt.mainPrompt);
        expect(variation.prompt.mainPrompt).toContain('with');
      }
    });
  });
}); 