import { ScrapedData, Severity } from '@aeo-platform/shared';
import { BaseAnalyzer, AnalyzerResult } from './BaseAnalyzer';

export class TechnicalSEOAnalyzer extends BaseAnalyzer {
  async analyze(data: ScrapedData, quick: boolean = false): Promise<AnalyzerResult> {
    const issues: any[] = [];
    const recommendations: any[] = [];
    let score = 60;

    // Analyze performance metrics
    if (data.performance.loadTime > 3000) {
      issues.push({
        severity: Severity.HIGH,
        title: 'Slow Page Load Time',
        description: `Page loads in ${data.performance.loadTime}ms. Target: <3000ms`,
        impact: 'Poor user experience and search rankings',
        fixable: true,
      });
      score -= 20;
    }

    // Check page size
    if (data.performance.pageSize > 3000000) { // 3MB
      issues.push({
        severity: Severity.MEDIUM,
        title: 'Large Page Size',
        description: `Page size: ${(data.performance.pageSize / 1024 / 1024).toFixed(1)}MB`,
        impact: 'Slower loading, especially on mobile',
        fixable: true,
      });
      score -= 10;
    }

    // Check Core Web Vitals if available
    if (data.performance.coreWebVitals) {
      const cwv = data.performance.coreWebVitals;
      if (cwv.lcp && cwv.lcp > 2500) {
        issues.push({
          severity: Severity.MEDIUM,
          title: 'Poor Largest Contentful Paint',
          description: `LCP: ${cwv.lcp}ms. Target: <2500ms`,
          impact: 'Poor Core Web Vitals score',
          fixable: true,
        });
        score -= 15;
      }
    }

    recommendations.push({
      priority: 2,
      title: 'Optimize Technical Performance',
      description: 'Improve page speed, Core Web Vitals, and mobile optimization',
      estimatedImpact: 20,
      implementationTime: 60,
    });

    return { score, issues, recommendations };
  }
}
