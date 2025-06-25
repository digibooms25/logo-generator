/**
 * Natural Language Parser Service Tests
 */

import { 
  naturalLanguageParserService, 
  EditCommandType,
  type ParsedCommand 
} from './natural-language-parser';
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

describe('NaturalLanguageParserService', () => {
  describe('Command Classification', () => {
    test('should classify color change commands', async () => {
      const commands = [
        'make it more blue',
        'change the color to red',
        'add some green',
        'make it brighter'
      ];

      for (const command of commands) {
        const result = await naturalLanguageParserService.parseEditingCommand(
          command,
          mockLogo
        );
        expect(result.type).toBe(EditCommandType.COLOR_CHANGE);
      }
    });

    test('should classify style change commands', async () => {
      const commands = [
        'make it more modern',
        'add a gradient effect',
        'style it as vintage',
        'make it more elegant'
      ];

      for (const command of commands) {
        const result = await naturalLanguageParserService.parseEditingCommand(
          command,
          mockLogo
        );
        expect(result.type).toBe(EditCommandType.STYLE_CHANGE);
      }
    });

    test('should classify text editing commands', async () => {
      const commands = [
        'change text to "NewName"',
        'make text bigger',
        'replace text with "Updated"',
        'text font serif'
      ];

      for (const command of commands) {
        const result = await naturalLanguageParserService.parseEditingCommand(
          command,
          mockLogo
        );
        expect(result.type).toBe(EditCommandType.TEXT_EDIT);
      }
    });

    test('should classify layout adjustment commands', async () => {
      const commands = [
        'move it to the center',
        'align to the left',
        'add more spacing',
        'stack vertically'
      ];

      for (const command of commands) {
        const result = await naturalLanguageParserService.parseEditingCommand(
          command,
          mockLogo
        );
        expect(result.type).toBe(EditCommandType.LAYOUT_ADJUST);
      }
    });

    test('should classify seasonal adaptation commands', async () => {
      const commands = [
        'make it christmas themed',
        'add holiday elements',
        'adapt for summer',
        'make it festive'
      ];

      for (const command of commands) {
        const result = await naturalLanguageParserService.parseEditingCommand(
          command,
          mockLogo
        );
        expect(result.type).toBe(EditCommandType.SEASONAL_ADAPT);
      }
    });
  });

  describe('Command Parsing', () => {
    test('should parse basic command and return structured result', async () => {
      const command = 'make it more blue';
      const result = await naturalLanguageParserService.parseEditingCommand(
        command,
        mockLogo
      );

      expect(result).toMatchObject({
        type: EditCommandType.COLOR_CHANGE,
        originalText: command,
        confidence: expect.any(Number),
        structuredCommand: expect.any(Object),
        fluxPrompt: expect.any(String),
        strength: expect.any(Number),
        metadata: {
          parsedAt: expect.any(Date),
          processingTime: expect.any(Number)
        }
      });

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.strength).toBeGreaterThan(0);
      expect(result.strength).toBeLessThanOrEqual(1);
    });

    test('should handle empty or invalid commands gracefully', async () => {
      const commands = ['', '   ', 'invalid gibberish command'];

      for (const command of commands) {
        const result = await naturalLanguageParserService.parseEditingCommand(
          command,
          mockLogo
        );

        expect(result).toMatchObject({
          type: expect.any(String),
          originalText: command,
          confidence: expect.any(Number),
          fluxPrompt: expect.any(String)
        });
      }
    });

    test('should include context in parsing when provided', async () => {
      const command = 'make it more professional';
      const context = 'This is for a law firm logo';
      
      const result = await naturalLanguageParserService.parseEditingCommand(
        command,
        mockLogo,
        context
      );

      expect(result.originalText).toBe(command);
      expect(result.fluxPrompt).toContain('professional');
    });
  });

  describe('Command Suggestions', () => {
    test('should provide relevant suggestions for logo', () => {
      const suggestions = naturalLanguageParserService.getCommandSuggestions(mockLogo);

      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.length).toBeLessThanOrEqual(8);
      
      suggestions.forEach(suggestion => {
        expect(typeof suggestion).toBe('string');
        expect(suggestion.length).toBeGreaterThan(0);
      });
    });

    test('should provide industry-specific suggestions for tech logos', () => {
      const techLogo = {
        ...mockLogo,
        metadata: {
          ...mockLogo.metadata,
          industry: 'technology'
        }
      };

      const suggestions = naturalLanguageParserService.getCommandSuggestions(techLogo);
      const techSuggestions = suggestions.filter(s => 
        s.includes('digital') || s.includes('futuristic') || s.includes('circuit')
      );

      expect(techSuggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed logo data gracefully', async () => {
      const malformedLogo = {
        ...mockLogo,
        metadata: {
          ...mockLogo.metadata,
          // @ts-ignore - intentionally malformed for testing
          styles: null,
          colors: undefined
        }
      };

      const result = await naturalLanguageParserService.parseEditingCommand(
        'make it blue',
        malformedLogo as any
      );

      expect(result).toMatchObject({
        type: expect.any(String),
        originalText: 'make it blue',
        confidence: expect.any(Number)
      });
    });

    test('should provide fallback when parsing fails', async () => {
      // Test with very complex or unusual command
      const complexCommand = 'transform this logo into a quantum-mechanical representation of consciousness while maintaining brand identity';
      
      const result = await naturalLanguageParserService.parseEditingCommand(
        complexCommand,
        mockLogo
      );

      expect(result).toMatchObject({
        type: expect.any(String),
        originalText: complexCommand,
        confidence: expect.any(Number),
        fluxPrompt: expect.any(String)
      });
    });
  });

  describe('Strength Calculation', () => {
    test('should assign appropriate strength based on command intensity', async () => {
      const intensityTests = [
        { command: 'make it slightly more blue', expectedRange: [0.1, 0.5] },
        { command: 'make it dramatically different', expectedRange: [0.8, 1.0] },
        { command: 'add a subtle shadow', expectedRange: [0.1, 0.5] },
        { command: 'completely change the style', expectedRange: [0.8, 1.0] }
      ];

      for (const test of intensityTests) {
        const result = await naturalLanguageParserService.parseEditingCommand(
          test.command,
          mockLogo
        );

        expect(result.strength).toBeGreaterThanOrEqual(test.expectedRange[0]);
        expect(result.strength).toBeLessThanOrEqual(test.expectedRange[1]);
      }
    });
  });

  describe('Performance', () => {
    test('should parse commands within reasonable time', async () => {
      const startTime = Date.now();
      
      await naturalLanguageParserService.parseEditingCommand(
        'make it more modern and professional',
        mockLogo
      );
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Should complete within 5 seconds for testing
      expect(processingTime).toBeLessThan(5000);
    });

    test('should handle multiple concurrent parsing requests', async () => {
      const commands = [
        'make it blue',
        'add shadow',
        'make it modern',
        'center the layout',
        'add gradient'
      ];

      const startTime = Date.now();
      
      const results = await Promise.all(
        commands.map(command => 
          naturalLanguageParserService.parseEditingCommand(command, mockLogo)
        )
      );
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      expect(results).toHaveLength(commands.length);
      results.forEach((result, index) => {
        expect(result.originalText).toBe(commands[index]);
      });
      
      // Should handle concurrent requests efficiently
      expect(totalTime).toBeLessThan(10000);
    });
  });
}); 