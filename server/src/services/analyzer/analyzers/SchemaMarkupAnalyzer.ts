import { ScrapedData, Severity } from '@aeo-platform/shared';
import { BaseAnalyzer, AnalyzerResult } from './BaseAnalyzer';

export class SchemaMarkupAnalyzer extends BaseAnalyzer {
  private readonly IMPORTANT_SCHEMA_TYPES = [
    'Article',
    'BlogPosting',
    'Product',
    'LocalBusiness',
    'Organization',
    'Person',
    'WebSite',
    'WebPage',
    'BreadcrumbList',
    'HowTo',
    'Recipe',
    'Event',
  ];

  async analyze(data: ScrapedData, quick: boolean = false): Promise<AnalyzerResult> {
    const issues: any[] = [];
    const recommendations: any[] = [];
    let score = 0;

    // Check for any schema markup
    if (data.schemas.length === 0) {
      score = 0;
      issues.push({
        severity: Severity.CRITICAL,
        title: 'No Schema Markup Found',
        description: 'No structured data markup detected on the page',
        impact: 'Reduced visibility in search results and AI platforms',
        fixable: true,
      });

      recommendations.push({
        priority: 1,
        title: 'Implement Basic Schema Markup',
        description: 'Add appropriate schema types based on content type',
        estimatedImpact: 30,
        implementationTime: 45,
      });

      return { score, issues, recommendations };
    }

    // Analyze existing schemas
    const validSchemas = data.schemas.filter(schema => schema.isValid);
    const invalidSchemas = data.schemas.filter(schema => !schema.isValid);

    // Score based on valid schemas
    if (validSchemas.length === 0) {
      score = 10;
      issues.push({
        severity: Severity.HIGH,
        title: 'Invalid Schema Markup',
        description: 'All schema markup contains errors and may not be recognized',
        impact: 'Schema benefits not realized due to validation errors',
        fixable: true,
      });
    } else {
      score = this.calculateSchemaScore(validSchemas, data);
    }

    // Check for invalid schemas
    if (invalidSchemas.length > 0) {
      issues.push({
        severity: Severity.MEDIUM,
        title: `${invalidSchemas.length} Invalid Schema(s)`,
        description: 'Some schema markup contains validation errors',
        impact: 'Partial loss of structured data benefits',
        fixable: true,
      });

      recommendations.push({
        priority: 2,
        title: 'Fix Schema Validation Errors',
        description: 'Correct errors in existing schema markup',
        estimatedImpact: 15,
        implementationTime: 20,
      });
    }

    // Check for missing important schemas
    const missingSchemas = this.findMissingSchemas(validSchemas, data);
    if (missingSchemas.length > 0) {
      recommendations.push({
        priority: 1,
        title: 'Add Missing Schema Types',
        description: `Consider adding: ${missingSchemas.join(', ')}`,
        estimatedImpact: 20,
        implementationTime: 30,
      });
    }

    // Check schema completeness
    if (!quick) {
      const completenessIssues = this.checkSchemaCompleteness(validSchemas);
      issues.push(...completenessIssues);
    }

    return {
      score: Math.min(100, score),
      issues,
      recommendations,
    };
  }

  private calculateSchemaScore(schemas: any[], data: ScrapedData): number {
    let baseScore = 30; // Base score for having valid schema

    // Score for schema variety
    const uniqueTypes = new Set(schemas.map(s => s.type));
    baseScore += Math.min(30, uniqueTypes.size * 10);

    // Score for important schema types
    const hasImportantSchema = schemas.some(s => 
      this.IMPORTANT_SCHEMA_TYPES.includes(s.type)
    );
    if (hasImportantSchema) {
      baseScore += 20;
    }

    // Score for schema completeness
    const completenessScore = this.evaluateSchemaCompleteness(schemas);
    baseScore += completenessScore;

    return Math.min(100, baseScore);
  }

  private findMissingSchemas(existingSchemas: any[], data: ScrapedData): string[] {
    const existingTypes = new Set(existingSchemas.map(s => s.type));
    const missing: string[] = [];

    // Check for content-based schema recommendations
    const content = data.content.toLowerCase();
    const title = data.title.toLowerCase();

    // Article/BlogPosting
    if (!existingTypes.has('Article') && !existingTypes.has('BlogPosting')) {
      if (this.isArticleContent(content, data.headings)) {
        missing.push('Article');
      }
    }

    // Organization
    if (!existingTypes.has('Organization')) {
      if (this.hasOrganizationInfo(data)) {
        missing.push('Organization');
      }
    }

    // WebSite
    if (!existingTypes.has('WebSite')) {
      missing.push('WebSite');
    }

    // BreadcrumbList
    if (!existingTypes.has('BreadcrumbList')) {
      if (this.hasBreadcrumbs(data)) {
        missing.push('BreadcrumbList');
      }
    }

    // HowTo
    if (!existingTypes.has('HowTo')) {
      if (this.isHowToContent(content, data.headings)) {
        missing.push('HowTo');
      }
    }

    // LocalBusiness
    if (!existingTypes.has('LocalBusiness')) {
      if (this.isLocalBusiness(content, data)) {
        missing.push('LocalBusiness');
      }
    }

    return missing;
  }

  private isArticleContent(content: string, headings: any[]): boolean {
    // Check for article indicators
    const articleIndicators = [
      'published', 'author', 'article', 'blog', 'post',
      'written by', 'published on', 'updated'
    ];

    const hasIndicators = articleIndicators.some(indicator => 
      content.includes(indicator)
    );

    // Check for proper heading structure
    const hasGoodStructure = headings.length >= 3;

    // Check content length (articles are typically longer)
    const wordCount = this.countWords(content);
    const hasGoodLength = wordCount >= 300;

    return hasIndicators && hasGoodStructure && hasGoodLength;
  }

  private hasOrganizationInfo(data: ScrapedData): boolean {
    const content = data.content.toLowerCase();
    const orgIndicators = [
      'company', 'corporation', 'organization', 'business',
      'founded', 'headquarters', 'contact us', 'about us'
    ];

    return orgIndicators.some(indicator => content.includes(indicator));
  }

  private hasBreadcrumbs(data: ScrapedData): boolean {
    // Check for breadcrumb-like link patterns
    const breadcrumbIndicators = [
      'home >', 'home /', 'breadcrumb', 'navigation'
    ];

    const content = data.content.toLowerCase();
    return breadcrumbIndicators.some(indicator => content.includes(indicator)) ||
           data.links.some(link => link.text.includes('>') || link.text.includes('/'));
  }

  private isHowToContent(content: string, headings: any[]): boolean {
    const howToIndicators = [
      'how to', 'step', 'steps', 'tutorial', 'guide',
      'instructions', 'method', 'process'
    ];

    const hasIndicators = howToIndicators.some(indicator => 
      content.toLowerCase().includes(indicator)
    );

    // Check for numbered or step-like headings
    const hasStepHeadings = headings.some(h => 
      /step \d+|^\d+\.|first|second|third|next|finally/i.test(h.text)
    );

    return hasIndicators && hasStepHeadings;
  }

  private isLocalBusiness(content: string, data: ScrapedData): boolean {
    const localIndicators = [
      'address', 'phone', 'hours', 'location', 'visit us',
      'directions', 'map', 'contact', 'call us'
    ];

    return localIndicators.some(indicator => 
      content.toLowerCase().includes(indicator)
    );
  }

  private evaluateSchemaCompleteness(schemas: any[]): number {
    let completenessScore = 0;

    for (const schema of schemas) {
      const data = schema.data;
      let schemaScore = 0;

      // Check for required properties based on schema type
      switch (schema.type) {
        case 'Article':
        case 'BlogPosting':
          schemaScore = this.evaluateArticleSchema(data);
          break;
        case 'Organization':
          schemaScore = this.evaluateOrganizationSchema(data);
          break;
        case 'LocalBusiness':
          schemaScore = this.evaluateLocalBusinessSchema(data);
          break;
        case 'Product':
          schemaScore = this.evaluateProductSchema(data);
          break;
        default:
          schemaScore = this.evaluateGenericSchema(data);
      }

      completenessScore += schemaScore;
    }

    return Math.min(20, completenessScore / schemas.length);
  }

  private evaluateArticleSchema(data: any): number {
    let score = 0;
    
    if (data.headline) score += 3;
    if (data.author) score += 3;
    if (data.datePublished) score += 3;
    if (data.image) score += 2;
    if (data.publisher) score += 2;
    if (data.description) score += 2;
    if (data.mainEntityOfPage) score += 2;
    if (data.dateModified) score += 1;
    if (data.wordCount) score += 1;
    if (data.articleSection) score += 1;

    return score;
  }

  private evaluateOrganizationSchema(data: any): number {
    let score = 0;
    
    if (data.name) score += 4;
    if (data.url) score += 3;
    if (data.logo) score += 3;
    if (data.address) score += 3;
    if (data.telephone) score += 2;
    if (data.email) score += 2;
    if (data.sameAs) score += 2;
    if (data.description) score += 1;

    return score;
  }

  private evaluateLocalBusinessSchema(data: any): number {
    let score = 0;
    
    if (data.name) score += 3;
    if (data.address) score += 4;
    if (data.telephone) score += 3;
    if (data.openingHours) score += 3;
    if (data.geo) score += 3;
    if (data.url) score += 2;
    if (data.priceRange) score += 1;
    if (data.image) score += 1;

    return score;
  }

  private evaluateProductSchema(data: any): number {
    let score = 0;
    
    if (data.name) score += 4;
    if (data.description) score += 3;
    if (data.image) score += 3;
    if (data.offers) score += 4;
    if (data.brand) score += 2;
    if (data.sku) score += 2;
    if (data.aggregateRating) score += 2;

    return score;
  }

  private evaluateGenericSchema(data: any): number {
    let score = 0;
    const properties = Object.keys(data);
    
    // Basic scoring for having properties
    score += Math.min(10, properties.length);
    
    // Bonus for important properties
    if (data.name) score += 2;
    if (data.description) score += 2;
    if (data.url) score += 1;
    if (data.image) score += 1;

    return score;
  }

  private checkSchemaCompleteness(schemas: any[]): any[] {
    const issues: any[] = [];

    for (const schema of schemas) {
      const missingProps = this.findMissingProperties(schema);
      if (missingProps.length > 0) {
        issues.push({
          severity: Severity.LOW,
          title: `Incomplete ${schema.type} Schema`,
          description: `Missing recommended properties: ${missingProps.join(', ')}`,
          impact: 'Reduced schema effectiveness',
          fixable: true,
        });
      }
    }

    return issues;
  }

  private findMissingProperties(schema: any): string[] {
    const missing: string[] = [];
    const data = schema.data;

    switch (schema.type) {
      case 'Article':
      case 'BlogPosting':
        if (!data.headline) missing.push('headline');
        if (!data.author) missing.push('author');
        if (!data.datePublished) missing.push('datePublished');
        if (!data.image) missing.push('image');
        break;
      
      case 'Organization':
        if (!data.name) missing.push('name');
        if (!data.url) missing.push('url');
        if (!data.logo) missing.push('logo');
        break;
      
      case 'LocalBusiness':
        if (!data.address) missing.push('address');
        if (!data.telephone) missing.push('telephone');
        if (!data.openingHours) missing.push('openingHours');
        break;
    }

    return missing;
  }
}
