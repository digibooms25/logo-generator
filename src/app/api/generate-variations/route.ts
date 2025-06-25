import { NextRequest, NextResponse } from 'next/server';
import { logoGenerationWorkflowService, type GeneratedLogo } from '@/services/logo-generation-workflow';

export interface VariationGenerationRequest {
  originalLogo: GeneratedLogo;
  variationCount?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    if (!body.originalLogo || !body.originalLogo.id) {
      return NextResponse.json(
        { error: 'originalLogo with id is required' },
        { status: 400 }
      );
    }

    console.log('[API] Processing variation generation request for logo:', body.originalLogo.id);
    
    const variationCount = body.variationCount ?? 3;

    // Generate variations
    const result = await logoGenerationWorkflowService.generateVariations(
      body.originalLogo,
      variationCount
    );
    
    console.log('[API] Variation generation result:', {
      success: result.success,
      totalGenerated: result.totalGenerated,
      failedCount: result.failedCount,
      processingTime: result.totalProcessingTime,
    });

    // Remove base64 data to reduce response size
    const optimizedResult = {
      ...result,
      logos: result.logos.map(logo => ({
        ...logo,
        imageBase64: undefined // Remove large base64 data from response
      }))
    };

    return NextResponse.json(optimizedResult);
    
  } catch (error) {
    console.error('[API] Variation generation error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        logos: [],
        totalGenerated: 0,
        failedCount: 1,
        totalProcessingTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to generate variations.' },
    { status: 405 }
  );
} 