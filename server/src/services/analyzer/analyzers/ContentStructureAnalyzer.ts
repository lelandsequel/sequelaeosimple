import { ScrapedData, Severity } from '@aeo-platform/shared';
import { BaseAnalyzer, AnalyzerResult } from './BaseAnalyzer';

export class ContentStructureAnalyzer extends BaseAnalyzer {
  async analyze(data: ScrapedData, quick: boolean = false): Promise<AnalyzerResult> {
    const issues: any[] = [];
    const recommendations: any[] = [];
    let score = 0;

    // Analyze heading structure
    const headingScore = this.analyzeHeadingStructure(data.headings, issues);
    
    // Analyze content readability
    const readabilityScore = this.analyzeContentReadability(data.content, issues);
    
    // Analyze content length and structure
    const structureScore = this.analyzeContentStructure(data.content, issues);

    score = this.calculateScore([
      { weight: 40, score: headingScore },
      { weight: 30, score: readabilityScore },
      { weight: 30, score: structureScore },
    ]);

    if (!quick) {
      this.addContentRecommendations(data, recommendations);
    }

    return { score, issues, recommendations };
  }

  private analyzeHeadingStructure(headings: any[], issues: any[]): number {
    const validation = this.validateHeadingStructure(headings);
    
    if (!validation.isValid) {
      issues.push({
        severity: Severity.MEDIUM,
        title: 'Poor Heading Structure',
        description: validation.issues.join(', '),
        impact: 'Reduced content comprehension for AI systems',
        fixable: true,
      });
      return 30;
    }

    return 80;
  }

  private analyzeContentReadability(content: string, issues: any[]): number {
    const readability = this.analyzeReadability(content);
    
    if (readability.score < 60) {
      issues.push({
        severity: Severity.MEDIUM,
        title: 'Poor Content Readability',
        description: `Readability score: ${readability.score.toFixed(1)}`,
        impact: 'Difficult for AI systems to understand and extract information',
        fixable: true,
      });
      return 40;
    }

    return 80;
  }

  private analyzeContentStructure(content: string, issues: any[]): number {
    const wordCount = this.countWords(content);
    
    if (wordCount < 300) {
      issues.push({
        severity: Severity.HIGH,
        title: 'Insufficient Content Length',
        description: `Content has ${wordCount} words. Recommended: 300+ words`,
        impact: 'Limited information for AI systems to process',
        fixable: true,
      });
      return 20;
    }

    return 70;
  }

  private addContentRecommendations(data: ScrapedData, recommendations: any[]): void {
    recommendations.push({
      priority: 1,
      title: 'Optimize Content Structure',
      description: 'Restructure content with clear headings and concise paragraphs',
      estimatedImpact: 20,
      implementationTime: 45,
    });
  }
}
