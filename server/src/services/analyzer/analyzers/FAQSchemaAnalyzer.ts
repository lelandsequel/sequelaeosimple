import { ScrapedData, Severity } from '@aeo-platform/shared';
import { BaseAnalyzer, AnalyzerResult } from './BaseAnalyzer';

export class FAQSchemaAnalyzer extends BaseAnalyzer {
  async analyze(data: ScrapedData, quick: boolean = false): Promise<AnalyzerResult> {
    const issues: any[] = [];
    const recommendations: any[] = [];
    let score = 0;

    // Check for existing FAQ schema
    const faqSchemas = data.schemas.filter(schema => 
      schema.type === 'FAQPage' || 
      (schema.data['@type'] && schema.data['@type'].includes('FAQPage'))
    );

    if (faqSchemas.length === 0) {
      // No FAQ schema found
      score = 0;
      issues.push({
        severity: Severity.HIGH,
        title: 'Missing FAQ Schema',
        description: 'No FAQ schema markup found on the page',
        impact: 'Reduced visibility in voice search and featured snippets',
        fixable: true,
      });

      recommendations.push({
        priority: 1,
        title: 'Add FAQ Schema Markup',
        description: 'Generate and implement FAQ schema based on page content',
        estimatedImpact: 25,
        implementationTime: 30,
      });
    } else {
      // FAQ schema exists, validate it
      const validSchemas = faqSchemas.filter(schema => schema.isValid);
      
      if (validSchemas.length === 0) {
        score = 20;
        issues.push({
          severity: Severity.HIGH,
          title: 'Invalid FAQ Schema',
          description: 'FAQ schema markup contains errors',
          impact: 'Schema may not be recognized by search engines',
          fixable: true,
        });
      } else {
        // Validate FAQ quality
        const faqData = validSchemas[0].data;
        const mainEntity = faqData.mainEntity || [];
        
        if (mainEntity.length === 0) {
          score = 30;
          issues.push({
            severity: Severity.MEDIUM,
            title: 'Empty FAQ Schema',
            description: 'FAQ schema exists but contains no questions',
            impact: 'No benefit from FAQ schema implementation',
            fixable: true,
          });
        } else if (mainEntity.length < 3) {
          score = 50;
          issues.push({
            severity: Severity.MEDIUM,
            title: 'Insufficient FAQ Content',
            description: `Only ${mainEntity.length} FAQ entries found. Recommended: 5-8 entries`,
            impact: 'Limited coverage for voice search queries',
            fixable: true,
          });

          recommendations.push({
            priority: 2,
            title: 'Expand FAQ Content',
            description: 'Add more relevant FAQ entries to improve coverage',
            estimatedImpact: 15,
            implementationTime: 20,
          });
        } else {
          // Good FAQ schema, check quality
          score = this.evaluateFAQQuality(mainEntity);
          
          if (score < 80) {
            recommendations.push({
              priority: 3,
              title: 'Optimize FAQ Content',
              description: 'Improve FAQ answers for better voice search optimization',
              estimatedImpact: 10,
              implementationTime: 15,
            });
          }
        }
      }
    }

    // Check for FAQ-like content in the page
    if (!quick) {
      const faqIndicators = this.findFAQIndicators(data);
      if (faqIndicators.length > 0 && faqSchemas.length === 0) {
        recommendations.push({
          priority: 1,
          title: 'Convert Existing FAQ Content',
          description: `Found ${faqIndicators.length} potential FAQ sections that could be structured as schema`,
          estimatedImpact: 20,
          implementationTime: 25,
        });
      }
    }

    return {
      score: Math.min(100, score),
      issues,
      recommendations,
    };
  }

  private evaluateFAQQuality(faqEntries: any[]): number {
    let qualityScore = 70; // Base score for having FAQ schema
    
    for (const entry of faqEntries) {
      const question = entry.name || '';
      const answer = entry.acceptedAnswer?.text || '';
      
      // Check question quality
      if (this.isGoodQuestion(question)) {
        qualityScore += 3;
      }
      
      // Check answer quality
      if (this.isGoodAnswer(answer)) {
        qualityScore += 2;
      }
    }
    
    return Math.min(100, qualityScore);
  }

  private isGoodQuestion(question: string): boolean {
    if (!question || question.length < 10) return false;
    
    // Check for question words
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'is', 'are', 'do', 'does'];
    const lowerQuestion = question.toLowerCase();
    
    return questionWords.some(word => lowerQuestion.includes(word)) && 
           question.endsWith('?');
  }

  private isGoodAnswer(answer: string): boolean {
    if (!answer) return false;
    
    // Good answers are 40-60 words for voice search
    const wordCount = answer.split(/\s+/).length;
    return wordCount >= 20 && wordCount <= 80;
  }

  private findFAQIndicators(data: ScrapedData): string[] {
    const indicators: string[] = [];
    const content = data.content.toLowerCase();
    
    // Look for FAQ-like patterns in headings
    for (const heading of data.headings) {
      const headingText = heading.text.toLowerCase();
      
      if (headingText.includes('faq') || 
          headingText.includes('frequently asked') ||
          headingText.includes('common questions') ||
          this.isQuestionHeading(headingText)) {
        indicators.push(heading.text);
      }
    }
    
    // Look for question patterns in content
    const questionPatterns = [
      /what is .+\?/gi,
      /how to .+\?/gi,
      /why .+\?/gi,
      /when .+\?/gi,
      /where .+\?/gi,
    ];
    
    for (const pattern of questionPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        indicators.push(...matches.slice(0, 3)); // Limit to 3 matches per pattern
      }
    }
    
    return indicators;
  }

  private isQuestionHeading(heading: string): boolean {
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'is', 'are', 'do', 'does'];
    return questionWords.some(word => heading.startsWith(word)) && heading.includes('?');
  }
}
