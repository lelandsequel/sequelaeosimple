import { z } from 'zod';
import { AEOCategory, FixType, Severity, AIModel, CodeLanguage } from '../types';

// URL validation schema
export const urlSchema = z.string().url().min(1);

// Client schemas
export const createClientSchema = z.object({
  companyName: z.string().min(1).max(100),
  websiteUrl: urlSchema,
  contactEmail: z.string().email().optional(),
});

export const pinAuthSchema = z.object({
  pin: z.string().length(6).regex(/^\d{6}$/, 'PIN must be 6 digits'),
  clientId: z.string().uuid().optional(),
});

// Analysis schemas
export const analyzeRequestSchema = z.object({
  url: urlSchema,
  clientId: z.string().uuid(),
  options: z.object({
    quick: z.boolean().optional(),
    categories: z.array(z.nativeEnum(AEOCategory)).optional(),
  }).optional(),
});

export const generateFixRequestSchema = z.object({
  analysisId: z.string().uuid(),
  category: z.nativeEnum(AEOCategory),
  fixType: z.nativeEnum(FixType),
  context: z.record(z.any()).optional(),
});

// Implementation tracking schemas
export const implementationSchema = z.object({
  fixId: z.string().uuid(),
  clientId: z.string().uuid(),
  notes: z.string().max(500).optional(),
});

// Dashboard schemas
export const dashboardRequestSchema = z.object({
  clientId: z.string().uuid(),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).optional(),
});

// AI service schemas
export const aiPromptSchema = z.object({
  template: z.string().min(1),
  variables: z.record(z.any()),
  model: z.nativeEnum(AIModel),
  maxTokens: z.number().min(100).max(8000).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

// Fix validation schemas
export const fixSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  fixCode: z.string().min(1),
  language: z.nativeEnum(CodeLanguage),
  severity: z.nativeEnum(Severity),
  estimatedImpact: z.number().min(0).max(100),
});

// Category score validation
export const categoryScoresSchema = z.object({
  faqSchema: z.number().min(0).max(100),
  schemaMarkup: z.number().min(0).max(100),
  contentStructure: z.number().min(0).max(100),
  featuredSnippets: z.number().min(0).max(100),
  entityOptimization: z.number().min(0).max(100),
  metaTags: z.number().min(0).max(100),
  semanticHtml: z.number().min(0).max(100),
  voiceSearch: z.number().min(0).max(100),
  knowledgeGraph: z.number().min(0).max(100),
  technicalSeo: z.number().min(0).max(100),
});

// Scraped data validation
export const scrapedDataSchema = z.object({
  url: urlSchema,
  title: z.string().min(1).max(200),
  metaDescription: z.string().max(500),
  headings: z.array(z.object({
    level: z.number().min(1).max(6),
    text: z.string().min(1),
    id: z.string().optional(),
  })),
  content: z.string().min(1),
  schemas: z.array(z.object({
    type: z.string(),
    data: z.record(z.any()),
    isValid: z.boolean(),
    errors: z.array(z.string()).optional(),
  })),
  metaTags: z.array(z.object({
    name: z.string().optional(),
    property: z.string().optional(),
    content: z.string(),
  })),
  openGraphTags: z.array(z.object({
    property: z.string(),
    content: z.string(),
  })),
  images: z.array(z.object({
    src: z.string().url(),
    alt: z.string().optional(),
    title: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  })),
  links: z.array(z.object({
    href: z.string(),
    text: z.string(),
    isInternal: z.boolean(),
    rel: z.string().optional(),
  })),
  performance: z.object({
    loadTime: z.number().min(0),
    pageSize: z.number().min(0),
    coreWebVitals: z.object({
      lcp: z.number().optional(),
      fid: z.number().optional(),
      cls: z.number().optional(),
    }).optional(),
  }),
});

// Export all schemas
export const schemas = {
  url: urlSchema,
  createClient: createClientSchema,
  pinAuth: pinAuthSchema,
  analyzeRequest: analyzeRequestSchema,
  generateFixRequest: generateFixRequestSchema,
  implementation: implementationSchema,
  dashboardRequest: dashboardRequestSchema,
  aiPrompt: aiPromptSchema,
  fix: fixSchema,
  categoryScores: categoryScoresSchema,
  scrapedData: scrapedDataSchema,
};
