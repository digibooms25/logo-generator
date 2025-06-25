import { NextRequest, NextResponse } from 'next/server';
import { logoGenerationWorkflowService, type LogoGenerationOptions } from '@/services/logo-generation-workflow';
import type { BusinessFormData } from '@/components/BusinessInfoCollectionForm';
import type { StoredLogoFile } from '@/services/local-storage';

export interface LogoGenerationRequest {
  businessData: BusinessFormData;
  inspirationLogo?: {
    file: File;
    category?: string;
    style?: string;
    keywords?: string[];
    imageData?: string; // base64 encoded image
  };
  generateMultiple?: boolean;
  variationCount?: number;
  customPrompt?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    if (!body.businessData || !body.businessData.companyName) {
      return NextResponse.json(
        { error: 'businessData with companyName is required' },
        { status: 400 }
      );
    }

    console.log('[API] Processing logo generation request for:', body.businessData.companyName);
    
    // Prepare the generation options
    const options: LogoGenerationOptions = {
      businessData: body.businessData,
      generateMultiple: body.generateMultiple ?? true,
      variationCount: body.variationCount ?? 3,
      customPrompt: body.customPrompt,
    };

    // Add inspiration logo if provided
    if (body.inspirationLogo) {
      options.inspirationLogo = body.inspirationLogo as StoredLogoFile;
      console.log('[API] Using inspiration logo:', body.inspirationLogo.file?.name);
    }

    // Generate logos
    const result = await logoGenerationWorkflowService.generateLogos(options);
    
    console.log('[API] Generation result:', {
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
    console.error('[API] Logo generation error:', error);
    
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
    { error: 'Method not allowed. Use POST to generate logos.' },
    { status: 405 }
  );
} 