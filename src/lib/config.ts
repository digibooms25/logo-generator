/**
 * Application configuration loaded from environment variables
 */

// Check if running on server side
const isServer = typeof window === 'undefined';

// Validate required environment variables (only on server)
const requiredEnvVars = {
  FLUX_KONTEXT_PRO_API_KEY: process.env.FLUX_KONTEXT_PRO_API_KEY,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
} as const;

// Check for missing required environment variables (only on server)
if (isServer) {
  const missingVars = Object.entries(requiredEnvVars)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.warn(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
    // Don't throw in development to allow for demo mode
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(', ')}`
      );
    }
  }
}

// Optional environment variables with defaults
const optionalEnvVars = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  NEXT_PUBLIC_APP_URL:
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
  ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES?.split(',') || [
    'jpg',
    'jpeg',
    'png',
    'svg',
    'webp',
  ],

  // LLM API Keys (at least one required)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
} as const;

// Validate that at least one LLM API key is provided (only on server)
if (isServer) {
  const llmKeys = [
    optionalEnvVars.OPENAI_API_KEY,
    optionalEnvVars.ANTHROPIC_API_KEY,
    optionalEnvVars.GOOGLE_AI_API_KEY,
  ].filter(Boolean);

  if (llmKeys.length === 0) {
    console.warn(
      'At least one LLM API key is required (OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_AI_API_KEY)'
    );
    // Don't throw in development to allow for demo mode
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'At least one LLM API key is required (OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_AI_API_KEY)'
      );
    }
  }
}

/**
 * Application configuration object
 */
export const config = {
  // API Keys
  flux: {
    apiKey: requiredEnvVars.FLUX_KONTEXT_PRO_API_KEY || 'demo_key_for_testing',
    baseUrl: 'https://api.bfl.ai',
  },

  llm: {
    openai: {
      apiKey: optionalEnvVars.OPENAI_API_KEY,
      model: 'gpt-3.5-turbo', // More reliable model for JSON response format
    },
    anthropic: {
      apiKey: optionalEnvVars.ANTHROPIC_API_KEY,
      model: 'claude-3-haiku-20240307',
    },
    google: {
      apiKey: optionalEnvVars.GOOGLE_AI_API_KEY,
      model: 'gemini-pro',
    },
  },

  // Application settings
  app: {
    env: optionalEnvVars.NODE_ENV,
    url: optionalEnvVars.NEXT_PUBLIC_APP_URL,
    adminPassword: requiredEnvVars.ADMIN_PASSWORD || 'admin123',
  },

  // Upload settings
  upload: {
    maxFileSizeMB: optionalEnvVars.MAX_FILE_SIZE_MB,
    allowedFileTypes: optionalEnvVars.ALLOWED_FILE_TYPES,
    maxFileSizeBytes: optionalEnvVars.MAX_FILE_SIZE_MB * 1024 * 1024,
  },
} as const;

/**
 * Type definitions for configuration
 */
export type Config = typeof config;
export type LLMProvider = 'openai' | 'anthropic' | 'google';

/**
 * Get the preferred LLM provider based on available API keys
 */
export function getPreferredLLMProvider(): LLMProvider {
  // Debug logging
  console.log('[CONFIG] getPreferredLLMProvider called');
  console.log('[CONFIG] Environment check:', {
    openai: !!process.env.OPENAI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    google: !!process.env.GOOGLE_AI_API_KEY,
  });
  console.log('[CONFIG] Config check:', {
    openai: !!config.llm.openai.apiKey,
    anthropic: !!config.llm.anthropic.apiKey,
    google: !!config.llm.google.apiKey,
  });
  
  // Check direct environment variables first (more reliable)
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
    console.log('[CONFIG] Using OpenAI from process.env');
    return 'openai';
  }
  
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('[CONFIG] Using Anthropic from process.env');
    return 'anthropic';
  }
  
  if (process.env.GOOGLE_AI_API_KEY) {
    console.log('[CONFIG] Using Google AI from process.env');
    return 'google';
  }
  
  // Fallback to config object
  if (config.llm.openai.apiKey && config.llm.openai.apiKey.startsWith('sk-')) {
    console.log('[CONFIG] Using OpenAI from config');
    return 'openai';
  }
  
  if (config.llm.anthropic.apiKey) {
    console.log('[CONFIG] Using Anthropic from config');
    return 'anthropic';
  }
  
  if (config.llm.google.apiKey) {
    console.log('[CONFIG] Using Google AI from config');
    return 'google';
  }

  console.error('[CONFIG] No LLM API key found in environment or config');
  // Throw error if no API key is available
  throw new Error('No LLM API key configured. Please set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_AI_API_KEY in your .env.local file');
}

/**
 * Validate if the application is in development mode
 */
export const isDevelopment = config.app.env === 'development';

/**
 * Validate if the application is in production mode
 */
export const isProduction = config.app.env === 'production';
