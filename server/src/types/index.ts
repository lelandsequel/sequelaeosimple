import { z } from 'zod';

// Enums
export enum AnalysisStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum AEOCategory {
  FAQ_SCHEMA = 'faqSchema',
  SCHEMA_MARKUP = 'schemaMarkup',
  CONTENT_STRUCTURE = 'contentStructure',
  FEATURED_SNIPPETS = 'featuredSnippets',
  ENTITY_OPTIMIZATION = 'entityOptimization',
  META_TAGS = 'metaTags',
  SEMANTIC_HTML = 'semanticHtml',
  VOICE_SEARCH = 'voiceSearch',
  KNOWLEDGE_GRAPH = 'knowledgeGraph',
  TECHNICAL_SEO = 'technicalSeo',
}

export enum FixType {
  CODE_GENERATION = 'codeGeneration',
  CONTENT_OPTIMIZATION = 'contentOptimization',
  TECHNICAL_FIX = 'technicalFix',
  SCHEMA_IMPLEMENTATION = 'schemaImplementation',
}

export enum Severity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum CodeLanguage {
  HTML = 'html',
  CSS = 'css',
  JAVASCRIPT = 'javascript',
  JSON_LD = 'json-ld',
  MARKDOWN = 'markdown',
}

export enum AIModel {
  OPENAI_GPT4 = 'openai-gpt4',
  ANTHROPIC_CLAUDE = 'anthropic-claude',
  PERPLEXITY = 'perplexity',
}

// Validation schemas
export const schemas = {
  analyzeRequest: z.object({
    url: z.string().url(),
    clientId: z.string().uuid(),
    options: z.object({
      quick: z.boolean().optional(),
    }).optional(),
  }),

  generateFixRequest: z.object({
    category: z.nativeEnum(AEOCategory),
    fixType: z.nativeEnum(FixType),
  }),

  createClientRequest: z.object({
    companyName: z.string().min(1),
    websiteUrl: z.string().url(),
    contactEmail: z.string().email().optional(),
  }),

  clientAuthRequest: z.object({
    clientId: z.string().uuid(),
    pin: z.string().length(6),
  }),
};

// Interfaces
export interface ScrapedData {
  url: string;
  title?: string;
  description?: string;
  content: string;
  headings: Array<{ level: number; text: string }>;
  images: Array<{ src: string; alt?: string }>;
  links: Array<{ href: string; text: string }>;
  schemas: any[];
  metaTags: Record<string, string>;
  coreWebVitals?: {
    lcp?: number;
    fid?: number;
    cls?: number;
  };
}

export interface CategoryScores {
  [AEOCategory.FAQ_SCHEMA]: number;
  [AEOCategory.SCHEMA_MARKUP]: number;
  [AEOCategory.CONTENT_STRUCTURE]: number;
  [AEOCategory.FEATURED_SNIPPETS]: number;
  [AEOCategory.ENTITY_OPTIMIZATION]: number;
  [AEOCategory.META_TAGS]: number;
  [AEOCategory.SEMANTIC_HTML]: number;
  [AEOCategory.VOICE_SEARCH]: number;
  [AEOCategory.KNOWLEDGE_GRAPH]: number;
  [AEOCategory.TECHNICAL_SEO]: number;
}

export interface Analysis {
  id: string;
  clientId: string;
  url: string;
  status: AnalysisStatus;
  overallScore: number;
  categoryScores: CategoryScores;
  scrapedData: ScrapedData;
  issues: string[];
  recommendations: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Fix {
  id: string;
  analysisId: string;
  category: AEOCategory;
  fixType: FixType;
  title: string;
  description: string;
  severity: Severity;
  fixCode: string;
  codeLanguage: CodeLanguage;
  implementationGuide: string;
  estimatedImpact: string;
  implemented: boolean;
  aiModel: AIModel;
  createdAt: Date;
}

export interface Client {
  id: string;
  companyName: string;
  websiteUrl: string;
  contactEmail?: string;
  pinHash: string;
  apiCredits: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Implementation {
  id: string;
  clientId: string;
  fixId: string;
  notes?: string;
  createdAt: Date;
}

export interface APIUsage {
  id: string;
  clientId: string;
  aiModel: AIModel;
  tokensUsed: number;
  cost: number;
  requestType: string;
  createdAt: Date;
}

// Additional interfaces for WebScraper
export interface MetaTag {
  name?: string;
  property?: string;
  content: string;
}

export interface OpenGraphTag {
  property: string;
  content: string;
}

export interface SchemaData {
  type: string;
  data: any;
}

export interface HeadingData {
  level: number;
  text: string;
}

export interface ImageData {
  src: string;
  alt?: string;
  title?: string;
}

export interface LinkData {
  href: string;
  text: string;
  rel?: string;
}

export interface PerformanceMetrics {
  lcp?: number;
  fid?: number;
  cls?: number;
}

// Utility functions
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}
