// Core entity types
export interface Client {
  id: string;
  companyName: string;
  websiteUrl: string;
  pinHash: string;
  apiCredits: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Analysis {
  id: string;
  clientId: string;
  url: string;
  overallScore: number;
  categoryScores: CategoryScores;
  status: AnalysisStatus;
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
  fixCode: string;
  language: CodeLanguage;
  severity: Severity;
  aiModelUsed: AIModel;
  implemented: boolean;
  estimatedImpact: number;
  createdAt: Date;
}

export interface Implementation {
  id: string;
  clientId: string;
  fixId: string;
  implementedAt: Date;
  impactScore?: number;
  notes?: string;
}

export interface APIUsage {
  id: string;
  clientId: string;
  apiService: AIModel;
  tokensUsed: number;
  cost: number;
  endpoint: string;
  createdAt: Date;
}

// Enums and constants
export enum AnalysisStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum AEOCategory {
  FAQ_SCHEMA = 'faq_schema',
  SCHEMA_MARKUP = 'schema_markup',
  CONTENT_STRUCTURE = 'content_structure',
  FEATURED_SNIPPETS = 'featured_snippets',
  ENTITY_OPTIMIZATION = 'entity_optimization',
  META_TAGS = 'meta_tags',
  SEMANTIC_HTML = 'semantic_html',
  VOICE_SEARCH = 'voice_search',
  KNOWLEDGE_GRAPH = 'knowledge_graph',
  TECHNICAL_SEO = 'technical_seo'
}

export enum FixType {
  FAQ_GENERATION = 'faq_generation',
  SCHEMA_GENERATION = 'schema_generation',
  CONTENT_REWRITE = 'content_rewrite',
  META_OPTIMIZATION = 'meta_optimization',
  HTML_RESTRUCTURE = 'html_restructure',
  TECHNICAL_FIX = 'technical_fix'
}

export enum CodeLanguage {
  JSON_LD = 'json-ld',
  HTML = 'html',
  CSS = 'css',
  JAVASCRIPT = 'javascript',
  MARKDOWN = 'markdown'
}

export enum Severity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum AIModel {
  OPENAI_GPT4 = 'openai_gpt4',
  ANTHROPIC_CLAUDE = 'anthropic_claude',
  PERPLEXITY = 'perplexity'
}

// Complex types
export interface CategoryScores {
  faqSchema: number;
  schemaMarkup: number;
  contentStructure: number;
  featuredSnippets: number;
  entityOptimization: number;
  metaTags: number;
  semanticHtml: number;
  voiceSearch: number;
  knowledgeGraph: number;
  technicalSeo: number;
}

export interface ScrapedData {
  url: string;
  title: string;
  metaDescription: string;
  headings: Heading[];
  content: string;
  schemas: SchemaMarkup[];
  metaTags: MetaTag[];
  openGraphTags: OpenGraphTag[];
  images: ImageData[];
  links: LinkData[];
  performance: PerformanceMetrics;
}

export interface Heading {
  level: number;
  text: string;
  id?: string;
}

export interface SchemaMarkup {
  type: string;
  data: Record<string, any>;
  isValid: boolean;
  errors?: string[];
}

export interface MetaTag {
  name?: string;
  property?: string;
  content: string;
}

export interface OpenGraphTag {
  property: string;
  content: string;
}

export interface ImageData {
  src: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
}

export interface LinkData {
  href: string;
  text: string;
  isInternal: boolean;
  rel?: string;
}

export interface PerformanceMetrics {
  loadTime: number;
  pageSize: number;
  coreWebVitals?: {
    lcp?: number;
    fid?: number;
    cls?: number;
  };
}

// API Request/Response types
export interface AnalyzeRequest {
  url: string;
  clientId: string;
  options?: {
    quick?: boolean;
    categories?: AEOCategory[];
  };
}

export interface AnalyzeResponse {
  analysisId: string;
  status: AnalysisStatus;
  message: string;
}

export interface GenerateFixRequest {
  analysisId: string;
  category: AEOCategory;
  fixType: FixType;
  context?: Record<string, any>;
}

export interface GenerateFixResponse {
  fixId: string;
  code: string;
  language: CodeLanguage;
  title: string;
  description: string;
  estimatedImpact: number;
}

export interface DashboardData {
  client: Client;
  recentAnalyses: Analysis[];
  totalFixes: number;
  implementedFixes: number;
  averageScore: number;
  scoreHistory: ScoreHistoryPoint[];
  topIssues: CategoryIssue[];
}

export interface ScoreHistoryPoint {
  date: Date;
  score: number;
  category?: AEOCategory;
}

export interface CategoryIssue {
  category: AEOCategory;
  score: number;
  fixCount: number;
  severity: Severity;
}
