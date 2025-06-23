// Core logo data structures and types for the AI Logo Generator

export interface Logo {
  id: string;
  name: string;
  description?: string;
  category: LogoCategory;
  style: LogoStyle;
  keywords: string[];
  imageUrl: string;
  imageData?: string; // base64 encoded image data
  svgData?: string; // SVG source code if available
  metadata: LogoMetadata;
  variations?: LogoVariation[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LogoMetadata {
  fileSize: number;
  dimensions: {
    width: number;
    height: number;
  };
  format: ImageFormat;
  colorPalette?: string[]; // hex color codes
  dominantColors?: string[];
  isVector: boolean;
  uploadedBy?: string; // admin user identifier
}

export interface LogoVariation {
  id: string;
  parentLogoId: string;
  type: VariationType;
  name: string;
  imageUrl: string;
  imageData?: string;
  parameters: VariationParameters;
  createdAt: Date;
}

export interface VariationParameters {
  colorScheme?: ColorScheme;
  layout?: LayoutType;
  season?: SeasonalTheme;
  customPrompt?: string;
}

// Business information collected from users
export interface BusinessInformation {
  companyName: string;
  industry: string;
  businessType: BusinessType;
  targetAudience?: string;
  brandPersonality?: string[];
  colorPreferences?: string[];
  stylePreferences?: LogoStyle[];
  existingBranding?: {
    hasLogo: boolean;
    brandColors?: string[];
    brandFonts?: string[];
    brandDescription?: string;
  };
  additionalRequirements?: string;
}

// Logo generation request and response
export interface LogoGenerationRequest {
  businessInfo: BusinessInformation;
  inspirationLogoId?: string; // reference logo from gallery
  customPrompt?: string;
  parameters: GenerationParameters;
}

export interface GenerationParameters {
  style: LogoStyle;
  colorScheme: ColorScheme;
  layout: LayoutType;
  complexity: ComplexityLevel;
  includeText: boolean;
  textContent?: string;
  dimensions: {
    width: number;
    height: number;
  };
}

export interface LogoGenerationResponse {
  success: boolean;
  logoId?: string;
  imageUrl?: string;
  imageData?: string;
  processingTime?: number;
  error?: string;
  variations?: LogoVariation[];
}

// Natural language editing
export interface EditingCommand {
  id: string;
  logoId: string;
  command: string;
  timestamp: Date;
  result?: EditingResult;
  status: CommandStatus;
}

export interface EditingResult {
  success: boolean;
  newImageUrl?: string;
  newImageData?: string;
  changes: string[];
  error?: string;
  processingTime?: number;
}

// Export functionality
export interface ExportOptions {
  format: ExportFormat;
  dimensions: {
    width: number;
    height: number;
  };
  quality?: number; // for JPEG/PNG (0-100)
  backgroundColor?: string;
  transparent?: boolean;
  dpi?: number;
}

export interface ExportResult {
  success: boolean;
  fileUrl?: string;
  fileData?: string; // base64 encoded
  fileName: string;
  fileSize: number;
  error?: string;
}

// File upload structures
export interface UploadedFile {
  id: string;
  originalName: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  metadata?: FileMetadata;
}

export interface FileMetadata {
  dimensions?: {
    width: number;
    height: number;
  };
  colorProfile?: string;
  hasTransparency?: boolean;
  isAnimated?: boolean;
}

// Gallery and filtering
export interface GalleryFilter {
  categories?: LogoCategory[];
  styles?: LogoStyle[];
  keywords?: string[];
  sortBy: SortOption;
  sortOrder: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface GallerySearchResult {
  logos: Logo[];
  totalCount: number;
  hasMore: boolean;
  facets?: {
    categories: { name: LogoCategory; count: number }[];
    styles: { name: LogoStyle; count: number }[];
  };
}

// API integration types
export interface FluxKontextProRequest {
  prompt: string;
  parameters: {
    width: number;
    height: number;
    style?: string;
    guidance_scale?: number;
    num_inference_steps?: number;
    seed?: number;
  };
}

export interface FluxKontextProResponse {
  success: boolean;
  image_url?: string;
  image_data?: string;
  generation_id?: string;
  error?: string;
  processing_time?: number;
}

export interface LLMRequest {
  prompt: string;
  context?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  success: boolean;
  text?: string;
  extractedData?: Partial<BusinessInformation>;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Enums and constants
export enum LogoCategory {
  TECHNOLOGY = 'technology',
  HEALTHCARE = 'healthcare',
  FINANCE = 'finance',
  EDUCATION = 'education',
  RETAIL = 'retail',
  FOOD_BEVERAGE = 'food_beverage',
  AUTOMOTIVE = 'automotive',
  REAL_ESTATE = 'real_estate',
  ENTERTAINMENT = 'entertainment',
  SPORTS = 'sports',
  NONPROFIT = 'nonprofit',
  PROFESSIONAL_SERVICES = 'professional_services',
  BEAUTY_FASHION = 'beauty_fashion',
  TRAVEL_HOSPITALITY = 'travel_hospitality',
  OTHER = 'other'
}

export enum LogoStyle {
  MINIMALIST = 'minimalist',
  MODERN = 'modern',
  CLASSIC = 'classic',
  PLAYFUL = 'playful',
  PROFESSIONAL = 'professional',
  CREATIVE = 'creative',
  BOLD = 'bold',
  ELEGANT = 'elegant',
  VINTAGE = 'vintage',
  GEOMETRIC = 'geometric',
  ORGANIC = 'organic',
  ABSTRACT = 'abstract'
}

export enum BusinessType {
  STARTUP = 'startup',
  SMALL_BUSINESS = 'small_business',
  ENTERPRISE = 'enterprise',
  NONPROFIT = 'nonprofit',
  PERSONAL_BRAND = 'personal_brand',
  ECOMMERCE = 'ecommerce',
  SERVICE_PROVIDER = 'service_provider',
  PRODUCT_COMPANY = 'product_company'
}

export enum VariationType {
  COLOR = 'color',
  LAYOUT = 'layout',
  SEASONAL = 'seasonal',
  STYLE = 'style',
  CUSTOM = 'custom'
}

export enum ColorScheme {
  MONOCHROME = 'monochrome',
  COMPLEMENTARY = 'complementary',
  ANALOGOUS = 'analogous',
  TRIADIC = 'triadic',
  WARM = 'warm',
  COOL = 'cool',
  VIBRANT = 'vibrant',
  MUTED = 'muted',
  CUSTOM = 'custom'
}

export enum LayoutType {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical',
  SQUARE = 'square',
  CIRCULAR = 'circular',
  ICON_ONLY = 'icon_only',
  TEXT_ONLY = 'text_only',
  STACKED = 'stacked',
  SIDE_BY_SIDE = 'side_by_side'
}

export enum SeasonalTheme {
  SPRING = 'spring',
  SUMMER = 'summer',
  FALL = 'fall',
  WINTER = 'winter',
  HOLIDAY = 'holiday',
  VALENTINE = 'valentine',
  HALLOWEEN = 'halloween',
  CHRISTMAS = 'christmas'
}

export enum ComplexityLevel {
  SIMPLE = 'simple',
  MODERATE = 'moderate',
  DETAILED = 'detailed',
  COMPLEX = 'complex'
}

export enum ImageFormat {
  PNG = 'png',
  JPEG = 'jpeg',
  SVG = 'svg',
  WEBP = 'webp',
  GIF = 'gif'
}

export enum ExportFormat {
  PNG = 'png',
  JPEG = 'jpeg',
  SVG = 'svg',
  PDF = 'pdf',
  WEBP = 'webp'
}

export enum CommandStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum SortOption {
  CREATED_AT = 'createdAt',
  NAME = 'name',
  CATEGORY = 'category',
  STYLE = 'style',
  POPULARITY = 'popularity'
}

// Utility types
export type LogoSize = 'thumbnail' | 'medium' | 'large' | 'original';
export type ApiStatus = 'idle' | 'loading' | 'success' | 'error';
export type UserRole = 'admin' | 'user';

// Project state management
export interface ProjectState {
  currentLogo?: Logo;
  businessInfo?: BusinessInformation;
  selectedInspiration?: Logo;
  generationInProgress: boolean;
  editingHistory: EditingCommand[];
  exportQueue: ExportOptions[];
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
} 