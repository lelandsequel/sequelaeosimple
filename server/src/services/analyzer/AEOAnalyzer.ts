import { 
  ScrapedData, 
  CategoryScores, 
  AEOCategory, 
  Severity,
  Analysis,
  AnalysisStatus
} from '@aeo-platform/shared';
import { calculateOverallScore, getSeverityFromScore } from '@aeo-platform/shared';
import { logger } from '../../utils/logger';
import { FAQSchemaAnalyzer } from './analyzers/FAQSchemaAnalyzer';
import { SchemaMarkupAnalyzer } from './analyzers/SchemaMarkupAnalyzer';
import { ContentStructureAnalyzer } from './analyzers/ContentStructureAnalyzer';
import { FeaturedSnippetsAnalyzer } from './analyzers/FeaturedSnippetsAnalyzer';
import { EntityOptimizationAnalyzer } from './analyzers/EntityOptimizationAnalyzer';
import { MetaTagsAnalyzer } from './analyzers/MetaTagsAnalyzer';
import { SemanticHTMLAnalyzer } from './analyzers/SemanticHTMLAnalyzer';
import { VoiceSearchAnalyzer } from './analyzers/VoiceSearchAnalyzer';
import { KnowledgeGraphAnalyzer } from './analyzers/KnowledgeGraphAnalyzer';
import { TechnicalSEOAnalyzer } from './analyzers/TechnicalSEOAnalyzer';

export interface AnalysisResult {
  overallScore: number;
  categoryScores: CategoryScores;
  issues: CategoryIssue[];
  recommendations: CategoryRecommendation[];
  status: AnalysisStatus;
}

export interface CategoryIssue {
  category: AEOCategory;
  severity: Severity;
  title: string;
  description: string;
  impact: string;
  fixable: boolean;
}

export interface CategoryRecommendation {
  category: AEOCategory;
  priority: number;
  title: string;
  description: string;
  estimatedImpact: number;
  implementationTime: number;
}

export interface AnalysisOptions {
  categories?: AEOCategory[];
  quick?: boolean;
  includeRecommendations?: boolean;
}

export class AEOAnalyzer {
  private analyzers: Map<AEOCategory, any>;

  constructor() {
    this.analyzers = new Map([
      [AEOCategory.FAQ_SCHEMA, new FAQSchemaAnalyzer()],
      [AEOCategory.SCHEMA_MARKUP, new SchemaMarkupAnalyzer()],
      [AEOCategory.CONTENT_STRUCTURE, new ContentStructureAnalyzer()],
      [AEOCategory.FEATURED_SNIPPETS, new FeaturedSnippetsAnalyzer()],
      [AEOCategory.ENTITY_OPTIMIZATION, new EntityOptimizationAnalyzer()],
      [AEOCategory.META_TAGS, new MetaTagsAnalyzer()],
      [AEOCategory.SEMANTIC_HTML, new SemanticHTMLAnalyzer()],
      [AEOCategory.VOICE_SEARCH, new VoiceSearchAnalyzer()],
      [AEOCategory.KNOWLEDGE_GRAPH, new KnowledgeGraphAnalyzer()],
      [AEOCategory.TECHNICAL_SEO, new TechnicalSEOAnalyzer()],
    ]);
  }

  /**
   * Perform comprehensive AEO analysis on scraped data
   */
  async analyzeWebpage(
    scrapedData: ScrapedData,
    options: AnalysisOptions = {}
  ): Promise<AnalysisResult> {
    try {
      logger.info('Starting AEO analysis:', { url: scrapedData.url });

      const categoriesToAnalyze = options.categories || Object.values(AEOCategory);
      const categoryScores: Partial<CategoryScores> = {};
      const issues: CategoryIssue[] = [];
      const recommendations: CategoryRecommendation[] = [];

      // Analyze each category
      for (const category of categoriesToAnalyze) {
        try {
          const analyzer = this.analyzers.get(category);
          if (!analyzer) {
            logger.warn(`No analyzer found for category: ${category}`);
            continue;
          }

          const result = await analyzer.analyze(scrapedData, options.quick);
          
          // Store category score
          categoryScores[this.getCategoryScoreKey(category)] = result.score;
          
          // Collect issues
          issues.push(...result.issues.map((issue: any) => ({
            ...issue,
            category,
          })));

          // Collect recommendations if requested
          if (options.includeRecommendations) {
            recommendations.push(...result.recommendations.map((rec: any) => ({
              ...rec,
              category,
            })));
          }

        } catch (error) {
          logger.error(`Analysis failed for category ${category}:`, error);
          // Set a low score for failed analysis
          categoryScores[this.getCategoryScoreKey(category)] = 0;
        }
      }

      // Fill in missing category scores with 0
      const fullCategoryScores = this.fillMissingScores(categoryScores);
      
      // Calculate overall score
      const overallScore = calculateOverallScore(fullCategoryScores);

      // Sort issues by severity
      issues.sort((a, b) => this.getSeverityPriority(a.severity) - this.getSeverityPriority(b.severity));

      // Sort recommendations by priority
      recommendations.sort((a, b) => a.priority - b.priority);

      const result: AnalysisResult = {
        overallScore,
        categoryScores: fullCategoryScores,
        issues,
        recommendations,
        status: AnalysisStatus.COMPLETED,
      };

      logger.info('AEO analysis completed:', { 
        url: scrapedData.url, 
        overallScore,
        issueCount: issues.length 
      });

      return result;

    } catch (error) {
      logger.error('AEO analysis failed:', { error, url: scrapedData.url });
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  /**
   * Perform quick analysis with basic checks only
   */
  async quickAnalyze(scrapedData: ScrapedData): Promise<AnalysisResult> {
    return this.analyzeWebpage(scrapedData, { 
      quick: true, 
      includeRecommendations: false 
    });
  }

  /**
   * Analyze specific categories only
   */
  async analyzeCategoriesOnly(
    scrapedData: ScrapedData,
    categories: AEOCategory[]
  ): Promise<AnalysisResult> {
    return this.analyzeWebpage(scrapedData, { 
      categories, 
      includeRecommendations: true 
    });
  }

  /**
   * Get category score key for CategoryScores interface
   */
  private getCategoryScoreKey(category: AEOCategory): keyof CategoryScores {
    const mapping: Record<AEOCategory, keyof CategoryScores> = {
      [AEOCategory.FAQ_SCHEMA]: 'faqSchema',
      [AEOCategory.SCHEMA_MARKUP]: 'schemaMarkup',
      [AEOCategory.CONTENT_STRUCTURE]: 'contentStructure',
      [AEOCategory.FEATURED_SNIPPETS]: 'featuredSnippets',
      [AEOCategory.ENTITY_OPTIMIZATION]: 'entityOptimization',
      [AEOCategory.META_TAGS]: 'metaTags',
      [AEOCategory.SEMANTIC_HTML]: 'semanticHtml',
      [AEOCategory.VOICE_SEARCH]: 'voiceSearch',
      [AEOCategory.KNOWLEDGE_GRAPH]: 'knowledgeGraph',
      [AEOCategory.TECHNICAL_SEO]: 'technicalSeo',
    };
    return mapping[category];
  }

  /**
   * Fill missing category scores with default values
   */
  private fillMissingScores(scores: Partial<CategoryScores>): CategoryScores {
    return {
      faqSchema: scores.faqSchema ?? 0,
      schemaMarkup: scores.schemaMarkup ?? 0,
      contentStructure: scores.contentStructure ?? 0,
      featuredSnippets: scores.featuredSnippets ?? 0,
      entityOptimization: scores.entityOptimization ?? 0,
      metaTags: scores.metaTags ?? 0,
      semanticHtml: scores.semanticHtml ?? 0,
      voiceSearch: scores.voiceSearch ?? 0,
      knowledgeGraph: scores.knowledgeGraph ?? 0,
      technicalSeo: scores.technicalSeo ?? 0,
    };
  }

  /**
   * Get severity priority for sorting
   */
  private getSeverityPriority(severity: Severity): number {
    const priorities = {
      [Severity.CRITICAL]: 1,
      [Severity.HIGH]: 2,
      [Severity.MEDIUM]: 3,
      [Severity.LOW]: 4,
    };
    return priorities[severity];
  }

  /**
   * Get analysis summary for a specific category
   */
  async getCategorySummary(
    scrapedData: ScrapedData,
    category: AEOCategory
  ): Promise<{
    score: number;
    severity: Severity;
    issues: CategoryIssue[];
    recommendations: CategoryRecommendation[];
  }> {
    const analyzer = this.analyzers.get(category);
    if (!analyzer) {
      throw new Error(`No analyzer found for category: ${category}`);
    }

    const result = await analyzer.analyze(scrapedData, false);
    const severity = getSeverityFromScore(result.score);

    return {
      score: result.score,
      severity,
      issues: result.issues.map((issue: any) => ({ ...issue, category })),
      recommendations: result.recommendations.map((rec: any) => ({ ...rec, category })),
    };
  }

  /**
   * Validate analysis result
   */
  private validateAnalysisResult(result: AnalysisResult): boolean {
    // Check if overall score is within valid range
    if (result.overallScore < 0 || result.overallScore > 100) {
      return false;
    }

    // Check if all category scores are within valid range
    for (const score of Object.values(result.categoryScores)) {
      if (score < 0 || score > 100) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get analyzer health status
   */
  async getHealthStatus(): Promise<Record<AEOCategory, boolean>> {
    const status: Record<AEOCategory, boolean> = {} as any;

    for (const [category, analyzer] of this.analyzers) {
      try {
        // Test analyzer with minimal data
        const testData: ScrapedData = {
          url: 'https://example.com',
          title: 'Test',
          metaDescription: 'Test description',
          headings: [],
          content: 'Test content',
          schemas: [],
          metaTags: [],
          openGraphTags: [],
          images: [],
          links: [],
          performance: { loadTime: 0, pageSize: 0 },
        };

        await analyzer.analyze(testData, true);
        status[category] = true;
      } catch (error) {
        logger.error(`Analyzer health check failed for ${category}:`, error);
        status[category] = false;
      }
    }

    return status;
  }

  /**
   * Get analysis statistics
   */
  getAnalysisStats(): {
    totalAnalyzers: number;
    availableCategories: AEOCategory[];
    version: string;
  } {
    return {
      totalAnalyzers: this.analyzers.size,
      availableCategories: Array.from(this.analyzers.keys()),
      version: '1.0.0',
    };
  }
}
