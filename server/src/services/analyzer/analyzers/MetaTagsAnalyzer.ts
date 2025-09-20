import { ScrapedData, Severity } from '@aeo-platform/shared';
import { BaseAnalyzer, AnalyzerResult } from './BaseAnalyzer';

export class MetaTagsAnalyzer extends BaseAnalyzer {
  private readonly IMPORTANT_META_TAGS = [
    'description',
    'keywords',
    'author',
    'viewport',
    'robots',
  ];

  private readonly IMPORTANT_OG_TAGS = [
    'og:title',
    'og:description',
    'og:image',
    'og:url',
    'og:type',
  ];

  private readonly IMPORTANT_TWITTER_TAGS = [
    'twitter:card',
    'twitter:title',
    'twitter:description',
    'twitter:image',
  ];

  async analyze(data: ScrapedData, quick: boolean = false): Promise<AnalyzerResult> {
    const issues: any[] = [];
    const recommendations: any[] = [];
    let score = 0;

    // Analyze title tag
    const titleScore = this.analyzeTitleTag(data.title, issues);
    
    // Analyze meta description
    const descriptionScore = this.analyzeMetaDescription(data.metaDescription, issues);
    
    // Analyze meta tags
    const metaTagsScore = this.analyzeMetaTags(data.metaTags, issues);
    
    // Analyze Open Graph tags
    const ogScore = this.analyzeOpenGraphTags(data.openGraphTags, issues);
    
    // Analyze Twitter tags
    const twitterScore = this.analyzeTwitterTags(data.metaTags, issues);

    // Calculate overall score
    score = this.calculateScore([
      { weight: 30, score: titleScore },
      { weight: 25, score: descriptionScore },
      { weight: 20, score: metaTagsScore },
      { weight: 15, score: ogScore },
      { weight: 10, score: twitterScore },
    ]);

    // Add recommendations based on missing elements
    if (!quick) {
      this.addRecommendations(data, recommendations);
    }

    return {
      score: Math.min(100, score),
      issues,
      recommendations,
    };
  }

  private analyzeTitleTag(title: string, issues: any[]): number {
    if (!title || title.trim().length === 0) {
      issues.push({
        severity: Severity.CRITICAL,
        title: 'Missing Title Tag',
        description: 'No title tag found on the page',
        impact: 'Severely impacts search engine rankings and click-through rates',
        fixable: true,
      });
      return 0;
    }

    let score = 50; // Base score for having a title

    // Check title length
    const titleLength = title.length;
    if (titleLength < 30) {
      issues.push({
        severity: Severity.MEDIUM,
        title: 'Title Too Short',
        description: `Title is ${titleLength} characters. Recommended: 50-60 characters`,
        impact: 'May not fully utilize search result space',
        fixable: true,
      });
      score -= 15;
    } else if (titleLength > 60) {
      issues.push({
        severity: Severity.MEDIUM,
        title: 'Title Too Long',
        description: `Title is ${titleLength} characters. Recommended: 50-60 characters`,
        impact: 'Title may be truncated in search results',
        fixable: true,
      });
      score -= 10;
    } else {
      score += 20; // Good length
    }

    // Check for duplicate words
    const words = title.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > uniqueWords.size) {
      issues.push({
        severity: Severity.LOW,
        title: 'Duplicate Words in Title',
        description: 'Title contains repeated words',
        impact: 'Reduces title effectiveness',
        fixable: true,
      });
      score -= 5;
    }

    // Check for brand name
    if (this.containsBrandName(title)) {
      score += 10;
    }

    return Math.max(0, score);
  }

  private analyzeMetaDescription(description: string, issues: any[]): number {
    if (!description || description.trim().length === 0) {
      issues.push({
        severity: Severity.HIGH,
        title: 'Missing Meta Description',
        description: 'No meta description found',
        impact: 'Search engines will generate description, reducing click-through rates',
        fixable: true,
      });
      return 0;
    }

    let score = 50; // Base score for having a description

    // Check description length
    const descLength = description.length;
    if (descLength < 120) {
      issues.push({
        severity: Severity.MEDIUM,
        title: 'Meta Description Too Short',
        description: `Description is ${descLength} characters. Recommended: 150-160 characters`,
        impact: 'Not fully utilizing search result space',
        fixable: true,
      });
      score -= 15;
    } else if (descLength > 160) {
      issues.push({
        severity: Severity.MEDIUM,
        title: 'Meta Description Too Long',
        description: `Description is ${descLength} characters. Recommended: 150-160 characters`,
        impact: 'Description may be truncated in search results',
        fixable: true,
      });
      score -= 10;
    } else {
      score += 25; // Good length
    }

    // Check for call-to-action
    if (this.hasCallToAction(description)) {
      score += 15;
    } else {
      issues.push({
        severity: Severity.LOW,
        title: 'No Call-to-Action in Description',
        description: 'Meta description lacks compelling call-to-action',
        impact: 'May reduce click-through rates',
        fixable: true,
      });
    }

    // Check for duplicate content with title
    if (this.hasDuplicateContent(description)) {
      issues.push({
        severity: Severity.LOW,
        title: 'Generic Meta Description',
        description: 'Meta description appears to be generic or duplicated',
        impact: 'Reduces uniqueness and effectiveness',
        fixable: true,
      });
      score -= 10;
    }

    return Math.max(0, score);
  }

  private analyzeMetaTags(metaTags: any[], issues: any[]): number {
    let score = 0;
    const tagMap = new Map();

    // Create map of meta tags
    metaTags.forEach(tag => {
      if (tag.name) {
        tagMap.set(tag.name.toLowerCase(), tag.content);
      }
    });

    // Check for important meta tags
    let foundTags = 0;
    for (const importantTag of this.IMPORTANT_META_TAGS) {
      if (tagMap.has(importantTag)) {
        foundTags++;
        score += 15;
      }
    }

    // Check for robots tag
    if (tagMap.has('robots')) {
      const robotsContent = tagMap.get('robots').toLowerCase();
      if (robotsContent.includes('noindex') || robotsContent.includes('nofollow')) {
        issues.push({
          severity: Severity.MEDIUM,
          title: 'Restrictive Robots Meta Tag',
          description: `Robots tag contains: ${robotsContent}`,
          impact: 'May prevent search engine indexing',
          fixable: true,
        });
      }
    } else {
      issues.push({
        severity: Severity.LOW,
        title: 'Missing Robots Meta Tag',
        description: 'No robots meta tag specified',
        impact: 'Search engines use default behavior',
        fixable: true,
      });
    }

    // Check viewport tag for mobile
    if (!tagMap.has('viewport')) {
      issues.push({
        severity: Severity.MEDIUM,
        title: 'Missing Viewport Meta Tag',
        description: 'No viewport meta tag for mobile optimization',
        impact: 'Poor mobile user experience',
        fixable: true,
      });
    }

    return Math.min(100, score);
  }

  private analyzeOpenGraphTags(ogTags: any[], issues: any[]): number {
    let score = 0;
    const ogMap = new Map();

    // Create map of OG tags
    ogTags.forEach(tag => {
      ogMap.set(tag.property.toLowerCase(), tag.content);
    });

    if (ogTags.length === 0) {
      issues.push({
        severity: Severity.MEDIUM,
        title: 'Missing Open Graph Tags',
        description: 'No Open Graph tags found for social media sharing',
        impact: 'Poor social media sharing appearance',
        fixable: true,
      });
      return 0;
    }

    // Check for important OG tags
    let foundOGTags = 0;
    for (const importantOG of this.IMPORTANT_OG_TAGS) {
      if (ogMap.has(importantOG)) {
        foundOGTags++;
        score += 20;
      }
    }

    // Check OG image
    if (ogMap.has('og:image')) {
      const imageUrl = ogMap.get('og:image');
      if (!this.isValidUrl(imageUrl)) {
        issues.push({
          severity: Severity.LOW,
          title: 'Invalid OG Image URL',
          description: 'Open Graph image URL is not valid',
          impact: 'Image may not display in social shares',
          fixable: true,
        });
        score -= 10;
      }
    }

    return Math.min(100, score);
  }

  private analyzeTwitterTags(metaTags: any[], issues: any[]): number {
    let score = 0;
    const twitterMap = new Map();

    // Find Twitter tags
    metaTags.forEach(tag => {
      if (tag.name && tag.name.startsWith('twitter:')) {
        twitterMap.set(tag.name.toLowerCase(), tag.content);
      }
    });

    if (twitterMap.size === 0) {
      issues.push({
        severity: Severity.LOW,
        title: 'Missing Twitter Card Tags',
        description: 'No Twitter Card tags found',
        impact: 'Suboptimal Twitter sharing appearance',
        fixable: true,
      });
      return 0;
    }

    // Check for important Twitter tags
    for (const importantTwitter of this.IMPORTANT_TWITTER_TAGS) {
      if (twitterMap.has(importantTwitter)) {
        score += 25;
      }
    }

    return Math.min(100, score);
  }

  private addRecommendations(data: ScrapedData, recommendations: any[]): void {
    // Title optimization
    if (!data.title || data.title.length < 50 || data.title.length > 60) {
      recommendations.push({
        priority: 1,
        title: 'Optimize Title Tag',
        description: 'Create compelling 50-60 character title with target keywords',
        estimatedImpact: 25,
        implementationTime: 10,
      });
    }

    // Meta description optimization
    if (!data.metaDescription || data.metaDescription.length < 150 || data.metaDescription.length > 160) {
      recommendations.push({
        priority: 1,
        title: 'Optimize Meta Description',
        description: 'Write compelling 150-160 character description with call-to-action',
        estimatedImpact: 20,
        implementationTime: 15,
      });
    }

    // Open Graph tags
    if (data.openGraphTags.length < 4) {
      recommendations.push({
        priority: 2,
        title: 'Add Complete Open Graph Tags',
        description: 'Implement full set of OG tags for social media optimization',
        estimatedImpact: 15,
        implementationTime: 20,
      });
    }

    // Twitter Cards
    const hasTwitterCards = data.metaTags.some(tag => 
      tag.name && tag.name.startsWith('twitter:')
    );
    if (!hasTwitterCards) {
      recommendations.push({
        priority: 3,
        title: 'Add Twitter Card Tags',
        description: 'Implement Twitter Card markup for better Twitter sharing',
        estimatedImpact: 10,
        implementationTime: 15,
      });
    }
  }

  private containsBrandName(title: string): boolean {
    // Simple check for brand indicators
    const brandIndicators = ['|', '-', ':', '•'];
    return brandIndicators.some(indicator => title.includes(indicator));
  }

  private hasCallToAction(description: string): boolean {
    const ctaWords = [
      'learn', 'discover', 'find', 'get', 'download', 'buy', 'shop',
      'read', 'explore', 'try', 'start', 'join', 'sign up', 'contact'
    ];
    const lowerDesc = description.toLowerCase();
    return ctaWords.some(word => lowerDesc.includes(word));
  }

  private hasDuplicateContent(description: string): boolean {
    // Check for generic descriptions
    const genericPhrases = [
      'welcome to our website',
      'this is the homepage',
      'default description',
      'lorem ipsum',
    ];
    const lowerDesc = description.toLowerCase();
    return genericPhrases.some(phrase => lowerDesc.includes(phrase));
  }
}
