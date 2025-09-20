import { ScrapedData, Severity } from '@aeo-platform/shared';

export interface AnalyzerResult {
  score: number;
  issues: AnalyzerIssue[];
  recommendations: AnalyzerRecommendation[];
}

export interface AnalyzerIssue {
  severity: Severity;
  title: string;
  description: string;
  impact: string;
  fixable: boolean;
}

export interface AnalyzerRecommendation {
  priority: number;
  title: string;
  description: string;
  estimatedImpact: number;
  implementationTime: number;
}

export abstract class BaseAnalyzer {
  abstract analyze(data: ScrapedData, quick?: boolean): Promise<AnalyzerResult>;

  /**
   * Calculate score based on multiple factors
   */
  protected calculateScore(factors: { weight: number; score: number }[]): number {
    const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
    const weightedSum = factors.reduce((sum, factor) => sum + (factor.score * factor.weight), 0);
    
    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  /**
   * Determine severity based on score
   */
  protected getSeverityFromScore(score: number): Severity {
    if (score >= 80) return Severity.LOW;
    if (score >= 60) return Severity.MEDIUM;
    if (score >= 40) return Severity.HIGH;
    return Severity.CRITICAL;
  }

  /**
   * Extract text content from HTML
   */
  protected extractTextFromHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Count words in text
   */
  protected countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Check if text contains keywords
   */
  protected containsKeywords(text: string, keywords: string[]): boolean {
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
  }

  /**
   * Calculate keyword density
   */
  protected calculateKeywordDensity(text: string, keyword: string): number {
    const words = text.toLowerCase().split(/\s+/);
    const keywordWords = keyword.toLowerCase().split(/\s+/);
    let matches = 0;

    for (let i = 0; i <= words.length - keywordWords.length; i++) {
      const phrase = words.slice(i, i + keywordWords.length).join(' ');
      if (phrase === keyword.toLowerCase()) {
        matches++;
      }
    }

    return words.length > 0 ? (matches / words.length) * 100 : 0;
  }

  /**
   * Validate URL format
   */
  protected isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract domain from URL
   */
  protected extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }

  /**
   * Check if content is optimized for featured snippets
   */
  protected isSnippetOptimized(text: string): boolean {
    const wordCount = this.countWords(text);
    return wordCount >= 40 && wordCount <= 60;
  }

  /**
   * Find sentences that could be featured snippets
   */
  protected findSnippetCandidates(text: string): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences.filter(sentence => {
      const wordCount = this.countWords(sentence);
      return wordCount >= 40 && wordCount <= 60;
    });
  }

  /**
   * Check if heading structure is logical
   */
  protected validateHeadingStructure(headings: { level: number; text: string }[]): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    let isValid = true;

    if (headings.length === 0) {
      issues.push('No headings found');
      isValid = false;
      return { isValid, issues };
    }

    // Check for H1
    const h1Count = headings.filter(h => h.level === 1).length;
    if (h1Count === 0) {
      issues.push('Missing H1 tag');
      isValid = false;
    } else if (h1Count > 1) {
      issues.push('Multiple H1 tags found');
      isValid = false;
    }

    // Check heading hierarchy
    for (let i = 1; i < headings.length; i++) {
      const current = headings[i];
      const previous = headings[i - 1];
      
      if (current.level > previous.level + 1) {
        issues.push(`Heading level jumps from H${previous.level} to H${current.level}`);
        isValid = false;
      }
    }

    return { isValid, issues };
  }

  /**
   * Analyze content readability
   */
  protected analyzeReadability(text: string): {
    score: number;
    avgWordsPerSentence: number;
    avgSyllablesPerWord: number;
  } {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    
    const avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 0;
    
    // Simple syllable counting (approximation)
    const avgSyllablesPerWord = words.length > 0 
      ? words.reduce((sum, word) => sum + this.countSyllables(word), 0) / words.length 
      : 0;

    // Simplified Flesch Reading Ease score
    const score = sentences.length > 0 && words.length > 0
      ? 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord)
      : 0;

    return {
      score: Math.max(0, Math.min(100, score)),
      avgWordsPerSentence,
      avgSyllablesPerWord,
    };
  }

  /**
   * Simple syllable counting
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    
    const vowels = 'aeiouy';
    let syllables = 0;
    let previousWasVowel = false;
    
    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i]);
      if (isVowel && !previousWasVowel) {
        syllables++;
      }
      previousWasVowel = isVowel;
    }
    
    // Handle silent e
    if (word.endsWith('e')) {
      syllables--;
    }
    
    return Math.max(1, syllables);
  }

  /**
   * Check if content answers common questions
   */
  protected answersCommonQuestions(content: string): boolean {
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who'];
    const lowerContent = content.toLowerCase();
    
    return questionWords.some(word => 
      lowerContent.includes(word + ' is') ||
      lowerContent.includes(word + ' are') ||
      lowerContent.includes(word + ' to') ||
      lowerContent.includes(word + ' can')
    );
  }
}
