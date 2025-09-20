import { 
  AEOCategory, 
  FixType, 
  CodeLanguage, 
  Severity, 
  ScrapedData,
  Fix
} from '@aeo-platform/shared';
import { AIServiceManager } from './AIServiceManager';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface FixGenerationRequest {
  analysisId: string;
  category: AEOCategory;
  fixType: FixType;
  scrapedData: ScrapedData;
  context?: Record<string, any>;
  clientId: string;
}

export interface GeneratedFix {
  id: string;
  title: string;
  description: string;
  code: string;
  language: CodeLanguage;
  severity: Severity;
  estimatedImpact: number;
  implementationGuide: string;
  category: AEOCategory;
  fixType: FixType;
}

export class CodeFixGenerator {
  private aiService: AIServiceManager;

  constructor() {
    this.aiService = new AIServiceManager();
  }

  /**
   * Generate a specific code fix for an AEO issue
   */
  async generateFix(request: FixGenerationRequest): Promise<GeneratedFix> {
    try {
      logger.info('Generating code fix:', { 
        category: request.category, 
        fixType: request.fixType,
        url: request.scrapedData.url 
      });

      // Prepare context for AI generation
      const context = this.prepareContext(request);
      
      // Generate the fix using AI
      const aiResponse = await this.aiService.generateContent(
        request.category,
        request.fixType,
        context,
        request.clientId
      );

      // Parse and structure the AI response
      const fix = this.parseAIResponse(aiResponse.content, request);

      logger.info('Code fix generated successfully:', { 
        fixId: fix.id,
        category: request.category,
        language: fix.language 
      });

      return fix;

    } catch (error) {
      logger.error('Failed to generate code fix:', { error, request });
      throw new Error(`Fix generation failed: ${error.message}`);
    }
  }

  /**
   * Generate multiple fixes for a category
   */
  async generateCategoryFixes(
    analysisId: string,
    category: AEOCategory,
    scrapedData: ScrapedData,
    clientId: string
  ): Promise<GeneratedFix[]> {
    const fixes: GeneratedFix[] = [];
    const fixTypes = this.getFixTypesForCategory(category);

    for (const fixType of fixTypes) {
      try {
        const fix = await this.generateFix({
          analysisId,
          category,
          fixType,
          scrapedData,
          clientId,
        });
        fixes.push(fix);
      } catch (error) {
        logger.error(`Failed to generate ${fixType} fix for ${category}:`, error);
      }
    }

    return fixes;
  }

  /**
   * Prepare context data for AI generation
   */
  private prepareContext(request: FixGenerationRequest): Record<string, any> {
    const { scrapedData, category, fixType } = request;
    
    const baseContext = {
      url: scrapedData.url,
      title: scrapedData.title,
      metaDescription: scrapedData.metaDescription,
      content: this.truncateContent(scrapedData.content, 2000),
      headings: scrapedData.headings.slice(0, 10),
      category,
      fixType,
    };

    // Add category-specific context
    switch (category) {
      case AEOCategory.FAQ_SCHEMA:
        return {
          ...baseContext,
          existingSchemas: scrapedData.schemas,
          contentType: this.detectContentType(scrapedData),
        };

      case AEOCategory.SCHEMA_MARKUP:
        return {
          ...baseContext,
          existingSchemas: scrapedData.schemas,
          images: scrapedData.images.slice(0, 5),
          contentType: this.detectContentType(scrapedData),
          organization: this.extractOrganizationInfo(scrapedData),
        };

      case AEOCategory.META_TAGS:
        return {
          ...baseContext,
          existingMetaTags: scrapedData.metaTags,
          openGraphTags: scrapedData.openGraphTags,
          keywords: this.extractKeywords(scrapedData.content),
          businessType: this.detectBusinessType(scrapedData),
        };

      case AEOCategory.CONTENT_STRUCTURE:
        return {
          ...baseContext,
          wordCount: this.countWords(scrapedData.content),
          readabilityScore: this.calculateReadabilityScore(scrapedData.content),
          keywords: this.extractKeywords(scrapedData.content),
        };

      default:
        return baseContext;
    }
  }

  /**
   * Parse AI response and create structured fix
   */
  private parseAIResponse(aiContent: string, request: FixGenerationRequest): GeneratedFix {
    // Extract code blocks from AI response
    const codeBlocks = this.extractCodeBlocks(aiContent);
    const mainCodeBlock = codeBlocks[0] || { code: '', language: 'html' };

    // Extract title and description
    const lines = aiContent.split('\n');
    const title = this.extractTitle(lines, request);
    const description = this.extractDescription(lines, request);
    const implementationGuide = this.extractImplementationGuide(lines);

    return {
      id: uuidv4(),
      title,
      description,
      code: mainCodeBlock.code,
      language: this.mapLanguage(mainCodeBlock.language),
      severity: this.determineSeverity(request.category),
      estimatedImpact: this.estimateImpact(request.category, request.fixType),
      implementationGuide,
      category: request.category,
      fixType: request.fixType,
    };
  }

  /**
   * Extract code blocks from AI response
   */
  private extractCodeBlocks(content: string): Array<{ code: string; language: string }> {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks: Array<{ code: string; language: string }> = [];
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2].trim(),
      });
    }

    return blocks;
  }

  /**
   * Extract title from AI response
   */
  private extractTitle(lines: string[], request: FixGenerationRequest): string {
    // Look for title patterns in the response
    for (const line of lines) {
      if (line.startsWith('# ') || line.startsWith('## ')) {
        return line.replace(/^#+\s*/, '').trim();
      }
    }

    // Fallback to generated title
    return this.generateDefaultTitle(request.category, request.fixType);
  }

  /**
   * Extract description from AI response
   */
  private extractDescription(lines: string[], request: FixGenerationRequest): string {
    const descriptionLines: string[] = [];
    let inDescription = false;

    for (const line of lines) {
      if (line.startsWith('#') || line.startsWith('```')) {
        inDescription = false;
        continue;
      }

      if (inDescription || (!line.startsWith('```') && line.trim().length > 0)) {
        inDescription = true;
        descriptionLines.push(line.trim());
        
        if (descriptionLines.length >= 3) break; // Limit description length
      }
    }

    return descriptionLines.join(' ').substring(0, 500) || 
           this.generateDefaultDescription(request.category, request.fixType);
  }

  /**
   * Extract implementation guide from AI response
   */
  private extractImplementationGuide(lines: string[]): string {
    const guideLines: string[] = [];
    let inGuide = false;

    for (const line of lines) {
      if (line.toLowerCase().includes('implementation') || 
          line.toLowerCase().includes('how to') ||
          line.toLowerCase().includes('steps')) {
        inGuide = true;
        continue;
      }

      if (inGuide && line.trim().length > 0) {
        guideLines.push(line.trim());
        if (guideLines.length >= 5) break;
      }
    }

    return guideLines.join('\n') || 'Add the generated code to your page\'s <head> section.';
  }

  /**
   * Map AI language to CodeLanguage enum
   */
  private mapLanguage(aiLanguage: string): CodeLanguage {
    const mapping: Record<string, CodeLanguage> = {
      'json': CodeLanguage.JSON_LD,
      'json-ld': CodeLanguage.JSON_LD,
      'html': CodeLanguage.HTML,
      'css': CodeLanguage.CSS,
      'javascript': CodeLanguage.JAVASCRIPT,
      'js': CodeLanguage.JAVASCRIPT,
      'markdown': CodeLanguage.MARKDOWN,
      'md': CodeLanguage.MARKDOWN,
    };

    return mapping[aiLanguage.toLowerCase()] || CodeLanguage.HTML;
  }

  /**
   * Get appropriate fix types for a category
   */
  private getFixTypesForCategory(category: AEOCategory): FixType[] {
    const mapping: Record<AEOCategory, FixType[]> = {
      [AEOCategory.FAQ_SCHEMA]: [FixType.FAQ_GENERATION],
      [AEOCategory.SCHEMA_MARKUP]: [FixType.SCHEMA_GENERATION],
      [AEOCategory.META_TAGS]: [FixType.META_OPTIMIZATION],
      [AEOCategory.CONTENT_STRUCTURE]: [FixType.CONTENT_REWRITE],
      [AEOCategory.FEATURED_SNIPPETS]: [FixType.CONTENT_REWRITE],
      [AEOCategory.ENTITY_OPTIMIZATION]: [FixType.CONTENT_REWRITE],
      [AEOCategory.SEMANTIC_HTML]: [FixType.HTML_RESTRUCTURE],
      [AEOCategory.VOICE_SEARCH]: [FixType.CONTENT_REWRITE],
      [AEOCategory.KNOWLEDGE_GRAPH]: [FixType.SCHEMA_GENERATION],
      [AEOCategory.TECHNICAL_SEO]: [FixType.TECHNICAL_FIX],
    };

    return mapping[category] || [FixType.TECHNICAL_FIX];
  }

  /**
   * Utility methods
   */
  private truncateContent(content: string, maxLength: number): string {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private detectContentType(data: ScrapedData): string {
    const content = data.content.toLowerCase();
    const title = data.title.toLowerCase();

    if (content.includes('recipe') || title.includes('recipe')) return 'Recipe';
    if (content.includes('product') || title.includes('product')) return 'Product';
    if (content.includes('article') || data.headings.length > 3) return 'Article';
    if (content.includes('business') || content.includes('company')) return 'LocalBusiness';
    
    return 'WebPage';
  }

  private extractOrganizationInfo(data: ScrapedData): Record<string, any> {
    // Simple extraction - in production, this would be more sophisticated
    return {
      name: this.extractDomain(data.url),
      url: data.url,
    };
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  }

  private extractKeywords(content: string): string[] {
    // Simple keyword extraction - in production, use NLP
    const words = content.toLowerCase().split(/\s+/);
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    
    return words
      .filter(word => word.length > 3 && !commonWords.has(word))
      .slice(0, 10);
  }

  private detectBusinessType(data: ScrapedData): string {
    const content = data.content.toLowerCase();
    
    if (content.includes('restaurant') || content.includes('food')) return 'Restaurant';
    if (content.includes('store') || content.includes('shop')) return 'Store';
    if (content.includes('service')) return 'Service';
    
    return 'Business';
  }

  private calculateReadabilityScore(content: string): number {
    // Simplified readability calculation
    const sentences = content.split(/[.!?]+/).length;
    const words = this.countWords(content);
    const avgWordsPerSentence = words / sentences;
    
    return Math.max(0, 100 - (avgWordsPerSentence * 2));
  }

  private determineSeverity(category: AEOCategory): Severity {
    const severityMap: Record<AEOCategory, Severity> = {
      [AEOCategory.FAQ_SCHEMA]: Severity.HIGH,
      [AEOCategory.SCHEMA_MARKUP]: Severity.CRITICAL,
      [AEOCategory.META_TAGS]: Severity.HIGH,
      [AEOCategory.CONTENT_STRUCTURE]: Severity.MEDIUM,
      [AEOCategory.FEATURED_SNIPPETS]: Severity.MEDIUM,
      [AEOCategory.ENTITY_OPTIMIZATION]: Severity.MEDIUM,
      [AEOCategory.SEMANTIC_HTML]: Severity.MEDIUM,
      [AEOCategory.VOICE_SEARCH]: Severity.LOW,
      [AEOCategory.KNOWLEDGE_GRAPH]: Severity.LOW,
      [AEOCategory.TECHNICAL_SEO]: Severity.HIGH,
    };

    return severityMap[category] || Severity.MEDIUM;
  }

  private estimateImpact(category: AEOCategory, fixType: FixType): number {
    const impactMap: Record<string, number> = {
      [`${AEOCategory.FAQ_SCHEMA}_${FixType.FAQ_GENERATION}`]: 25,
      [`${AEOCategory.SCHEMA_MARKUP}_${FixType.SCHEMA_GENERATION}`]: 30,
      [`${AEOCategory.META_TAGS}_${FixType.META_OPTIMIZATION}`]: 20,
      [`${AEOCategory.CONTENT_STRUCTURE}_${FixType.CONTENT_REWRITE}`]: 18,
    };

    return impactMap[`${category}_${fixType}`] || 15;
  }

  private generateDefaultTitle(category: AEOCategory, fixType: FixType): string {
    return `${category.replace(/_/g, ' ')} - ${fixType.replace(/_/g, ' ')}`;
  }

  private generateDefaultDescription(category: AEOCategory, fixType: FixType): string {
    return `Generated fix for ${category.replace(/_/g, ' ')} optimization using ${fixType.replace(/_/g, ' ')}.`;
  }
}
