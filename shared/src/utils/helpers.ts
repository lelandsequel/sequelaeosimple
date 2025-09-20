import { CategoryScores, AEOCategory, Severity } from '../types';
import { DEFAULT_CATEGORY_WEIGHTS, AEO_CATEGORY_CONFIG } from './constants';

/**
 * Calculate overall AEO score from category scores
 */
export function calculateOverallScore(categoryScores: CategoryScores): number {
  const scores = Object.entries(categoryScores);
  const weightedSum = scores.reduce((sum, [category, score]) => {
    const weight = DEFAULT_CATEGORY_WEIGHTS[category as AEOCategory] || 1;
    return sum + (score * weight);
  }, 0);
  
  const totalWeight = Object.values(DEFAULT_CATEGORY_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  return Math.round(weightedSum / totalWeight);
}

/**
 * Generate a secure 6-digit PIN
 */
export function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Validate URL format and accessibility
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Determine severity based on score
 */
export function getSeverityFromScore(score: number): Severity {
  if (score >= 80) return Severity.LOW;
  if (score >= 60) return Severity.MEDIUM;
  if (score >= 40) return Severity.HIGH;
  return Severity.CRITICAL;
}

/**
 * Format category name for display
 */
export function formatCategoryName(category: AEOCategory): string {
  return AEO_CATEGORY_CONFIG[category]?.name || category.replace(/_/g, ' ');
}

/**
 * Calculate estimated implementation time in minutes
 */
export function estimateImplementationTime(severity: Severity, complexity: 'simple' | 'medium' | 'complex'): number {
  const baseTime = {
    [Severity.CRITICAL]: 60,
    [Severity.HIGH]: 45,
    [Severity.MEDIUM]: 30,
    [Severity.LOW]: 15,
  };

  const multiplier = {
    simple: 1,
    medium: 1.5,
    complex: 2.5,
  };

  return Math.round(baseTime[severity] * multiplier[complexity]);
}

/**
 * Sanitize HTML content for safe display
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '');
}

/**
 * Extract text content from HTML
 */
export function extractTextFromHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate unique identifier
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength - 3) + '...';
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format duration in human readable format
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate color based on score
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return '#10B981'; // green
  if (score >= 60) return '#F59E0B'; // yellow
  if (score >= 40) return '#EF4444'; // red
  return '#DC2626'; // dark red
}

/**
 * Parse JSON safely
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  if (typeof obj === 'object') {
    const clonedObj = {} as any;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
}
