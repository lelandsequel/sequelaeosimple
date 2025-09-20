import { AEOCategory, Severity } from '../types';

// AEO Category configurations
export const AEO_CATEGORY_CONFIG = {
  [AEOCategory.FAQ_SCHEMA]: {
    name: 'FAQ Schema',
    description: 'Structured FAQ data for voice search and featured snippets',
    weight: 15,
    maxScore: 100,
  },
  [AEOCategory.SCHEMA_MARKUP]: {
    name: 'Schema Markup Suite',
    description: 'Complete structured data implementation',
    weight: 20,
    maxScore: 100,
  },
  [AEOCategory.CONTENT_STRUCTURE]: {
    name: 'AI-Optimized Content Structure',
    description: 'Content formatted for LLM comprehension',
    weight: 15,
    maxScore: 100,
  },
  [AEOCategory.FEATURED_SNIPPETS]: {
    name: 'Featured Snippet Optimization',
    description: 'Content optimized for snippet capture',
    weight: 12,
    maxScore: 100,
  },
  [AEOCategory.ENTITY_OPTIMIZATION]: {
    name: 'Entity & Keyword Optimization',
    description: 'Semantic entity coverage and relationships',
    weight: 10,
    maxScore: 100,
  },
  [AEOCategory.META_TAGS]: {
    name: 'Meta & Open Graph Tags',
    description: 'Optimized meta tags for AI platforms',
    weight: 8,
    maxScore: 100,
  },
  [AEOCategory.SEMANTIC_HTML]: {
    name: 'Semantic HTML Enhancement',
    description: 'Proper HTML structure and accessibility',
    weight: 8,
    maxScore: 100,
  },
  [AEOCategory.VOICE_SEARCH]: {
    name: 'Voice Search Optimization',
    description: 'Conversational query optimization',
    weight: 5,
    maxScore: 100,
  },
  [AEOCategory.KNOWLEDGE_GRAPH]: {
    name: 'Knowledge Graph Enhancement',
    description: 'Entity relationships and authority signals',
    weight: 4,
    maxScore: 100,
  },
  [AEOCategory.TECHNICAL_SEO]: {
    name: 'Technical SEO for AI Crawlers',
    description: 'Technical optimization for AI systems',
    weight: 3,
    maxScore: 100,
  },
};

// Severity configurations
export const SEVERITY_CONFIG = {
  [Severity.CRITICAL]: {
    name: 'Critical',
    color: '#DC2626',
    priority: 1,
    description: 'Immediate attention required',
  },
  [Severity.HIGH]: {
    name: 'High',
    color: '#EA580C',
    priority: 2,
    description: 'High impact on AEO performance',
  },
  [Severity.MEDIUM]: {
    name: 'Medium',
    color: '#D97706',
    priority: 3,
    description: 'Moderate impact on optimization',
  },
  [Severity.LOW]: {
    name: 'Low',
    color: '#65A30D',
    priority: 4,
    description: 'Minor optimization opportunity',
  },
};

// AI Model configurations
export const AI_MODEL_CONFIG = {
  openai_gpt4: {
    name: 'OpenAI GPT-4',
    maxTokens: 8000,
    costPer1kTokens: 0.03,
    strengths: ['Content generation', 'FAQ creation', 'General optimization'],
  },
  anthropic_claude: {
    name: 'Anthropic Claude',
    maxTokens: 100000,
    costPer1kTokens: 0.015,
    strengths: ['Schema generation', 'Technical SEO', 'Complex analysis'],
  },
  perplexity: {
    name: 'Perplexity',
    maxTokens: 4000,
    costPer1kTokens: 0.02,
    strengths: ['Real-time data', 'Competitor analysis', 'Trend research'],
  },
};

// Default scoring weights
export const DEFAULT_CATEGORY_WEIGHTS = Object.fromEntries(
  Object.entries(AEO_CATEGORY_CONFIG).map(([key, config]) => [key, config.weight])
);

// API rate limits
export const RATE_LIMITS = {
  ANALYSIS_PER_HOUR: 10,
  AI_REQUESTS_PER_MINUTE: 20,
  SCRAPING_PER_MINUTE: 5,
};

// Cache TTL values (in seconds)
export const CACHE_TTL = {
  ANALYSIS_RESULT: 24 * 60 * 60, // 24 hours
  SCRAPED_DATA: 6 * 60 * 60, // 6 hours
  AI_RESPONSE: 7 * 24 * 60 * 60, // 7 days
  CLIENT_DATA: 60 * 60, // 1 hour
};

// Validation constants
export const VALIDATION_LIMITS = {
  MAX_URL_LENGTH: 2048,
  MAX_COMPANY_NAME_LENGTH: 100,
  MAX_CONTENT_LENGTH: 1000000, // 1MB
  MAX_FIXES_PER_ANALYSIS: 50,
  MIN_PIN_LENGTH: 6,
  MAX_PIN_LENGTH: 6,
};

// Schema types for validation
export const SUPPORTED_SCHEMA_TYPES = [
  'Article',
  'BlogPosting',
  'Product',
  'LocalBusiness',
  'Organization',
  'Person',
  'FAQ',
  'HowTo',
  'Recipe',
  'Event',
  'BreadcrumbList',
  'WebSite',
  'WebPage',
];

// Common meta tag names
export const IMPORTANT_META_TAGS = [
  'title',
  'description',
  'keywords',
  'author',
  'viewport',
  'robots',
  'canonical',
  'og:title',
  'og:description',
  'og:image',
  'og:url',
  'og:type',
  'twitter:card',
  'twitter:title',
  'twitter:description',
  'twitter:image',
];

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  GOOD_LCP: 2500, // milliseconds
  GOOD_FID: 100, // milliseconds
  GOOD_CLS: 0.1, // score
  MAX_PAGE_SIZE: 3000000, // 3MB
  MAX_LOAD_TIME: 5000, // 5 seconds
};
