import { ScrapedData, Severity } from '@aeo-platform/shared';
import { BaseAnalyzer, AnalyzerResult } from './BaseAnalyzer';

export class VoiceSearchAnalyzer extends BaseAnalyzer {
  async analyze(data: ScrapedData, quick: boolean = false): Promise<AnalyzerResult> {
    const issues: any[] = [];
    const recommendations: any[] = [];
    
    const hasConversationalContent = this.answersCommonQuestions(data.content);
    const score = hasConversationalContent ? 70 : 30;

    if (!hasConversationalContent) {
      issues.push({
        severity: Severity.MEDIUM,
        title: 'Not Optimized for Voice Search',
        description: 'Content lacks conversational, question-answering format',
        impact: 'Reduced visibility in voice search results',
        fixable: true,
      });
    }

    recommendations.push({
      priority: 3,
      title: 'Optimize for Voice Search',
      description: 'Add natural language answers to common questions',
      estimatedImpact: 12,
      implementationTime: 25,
    });

    return { score, issues, recommendations };
  }
}
