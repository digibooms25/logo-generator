/**
 * Debug utilities for environment variable validation
 */

import { config } from './config';

export function debugEnvironment() {
  if (typeof window !== 'undefined') {
    console.log('[DEBUG] Running on client side - environment variables may not be available');
    return;
  }

  console.log('[DEBUG] Environment variable debug info:');
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('- OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY);
  console.log('- OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length);
  console.log('- OPENAI_API_KEY starts with sk-:', process.env.OPENAI_API_KEY?.startsWith('sk-'));
  
  console.log('[DEBUG] Config values:');
  console.log('- config.llm.openai.apiKey present:', !!config.llm.openai.apiKey);
  console.log('- config.llm.openai.apiKey length:', config.llm.openai.apiKey?.length);
  console.log('- config.llm.openai.model:', config.llm.openai.model);
}

export function validateApiKey(apiKey: string | undefined): { valid: boolean; error?: string } {
  if (!apiKey) {
    return { valid: false, error: 'API key is not set' };
  }
  
  if (!apiKey.startsWith('sk-')) {
    return { valid: false, error: 'API key should start with "sk-"' };
  }
  
  if (apiKey.length < 40) {
    return { valid: false, error: 'API key appears to be too short' };
  }
  
  return { valid: true };
} 