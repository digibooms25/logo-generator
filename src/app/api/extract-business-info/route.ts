import { NextRequest, NextResponse } from 'next/server';
import { llmService, type BusinessInfoExtractionRequest } from '@/services/llm-integration';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    if (!body.userInput || typeof body.userInput !== 'string') {
      return NextResponse.json(
        { error: 'userInput is required and must be a string' },
        { status: 400 }
      );
    }

    // Prepare the extraction request
    const extractionRequest: BusinessInfoExtractionRequest = {
      userInput: body.userInput,
      context: body.context,
      provider: body.provider,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
    };

    console.log('[API] Processing business info extraction request');
    
    // Call the LLM service (server-side only)
    const result = await llmService.extractBusinessInformation(extractionRequest);
    
    console.log('[API] Extraction result:', {
      success: result.success,
      provider: result.provider,
      processingTime: result.processingTime,
      confidence: result.confidence,
    });

    return NextResponse.json(result);
    
  } catch (error) {
    console.error('[API] Business info extraction error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        provider: 'openai',
        processingTime: 0,
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to extract business information.' },
    { status: 405 }
  );
} 