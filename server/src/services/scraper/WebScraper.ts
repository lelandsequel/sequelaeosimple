import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import axios from 'axios';
import {
  ScrapedData,
  Heading,
  SchemaMarkup,
  MetaTag,
  OpenGraphTag,
  ImageData,
  LinkData,
  PerformanceMetrics
} from '../../types';
import { logger } from '../../utils/logger';

export interface ScrapingOptions {
  timeout?: number;
  waitForSelector?: string;
  userAgent?: string;
  viewport?: { width: number; height: number };
  javascript?: boolean;
  maxPageSize?: number;
}

export class WebScraper {
  private browser: Browser | null = null;
  private defaultOptions: ScrapingOptions = {
    timeout: 10000,
    userAgent: 'AEO-Platform-Bot/1.0 (SEO Analysis)',
    viewport: { width: 1920, height: 1080 },
    javascript: true,
    maxPageSize: 5000000, // 5MB
  };

  /**
   * Initialize the browser instance
   */
  async initialize(): Promise<void> {
    try {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      });
      logger.info('Web scraper initialized');
    } catch (error) {
      logger.error('Failed to initialize web scraper:', error);
      throw error;
    }
  }

  /**
   * Close the browser instance
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Web scraper closed');
    }
  }

  /**
   * Scrape a webpage and extract all relevant data
   */
  async scrapeUrl(url: string, options: ScrapingOptions = {}): Promise<ScrapedData> {
    if (!isValidUrl(url)) {
      throw new Error('Invalid URL provided');
    }

    const mergedOptions = { ...this.defaultOptions, ...options };
    
    try {
      // Try JavaScript-enabled scraping first
      if (mergedOptions.javascript) {
        return await this.scrapeWithPuppeteer(url, mergedOptions);
      } else {
        return await this.scrapeWithAxios(url, mergedOptions);
      }
    } catch (error) {
      logger.error('Scraping failed:', { url, error });
      
      // Fallback to simple HTTP request if Puppeteer fails
      if (mergedOptions.javascript) {
        logger.info('Falling back to simple HTTP scraping');
        return await this.scrapeWithAxios(url, mergedOptions);
      }
      
      throw error;
    }
  }

  /**
   * Scrape using Puppeteer for JavaScript-heavy sites
   */
  private async scrapeWithPuppeteer(url: string, options: ScrapingOptions): Promise<ScrapedData> {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage();
    
    try {
      // Set user agent and viewport
      await page.setUserAgent(options.userAgent!);
      await page.setViewport(options.viewport!);

      // Set request interception to block unnecessary resources
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      // Navigate to the page
      const startTime = Date.now();
      const response = await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: options.timeout,
      });

      if (!response || !response.ok()) {
        throw new Error(`HTTP ${response?.status()}: Failed to load page`);
      }

      // Wait for specific selector if provided
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, { timeout: 5000 });
      }

      // Get page content and performance metrics
      const content = await page.content();
      const loadTime = Date.now() - startTime;
      
      // Get Core Web Vitals
      const coreWebVitals = await this.getCoreWebVitals(page);
      
      // Parse the content
      const scrapedData = await this.parseHtmlContent(content, url);
      
      // Add performance metrics
      scrapedData.performance = {
        loadTime,
        pageSize: Buffer.byteLength(content, 'utf8'),
        coreWebVitals,
      };

      return scrapedData;
    } finally {
      await page.close();
    }
  }

  /**
   * Scrape using Axios for simple HTTP requests
   */
  private async scrapeWithAxios(url: string, options: ScrapingOptions): Promise<ScrapedData> {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(url, {
        timeout: options.timeout,
        headers: {
          'User-Agent': options.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        },
        maxContentLength: options.maxPageSize,
      });

      const loadTime = Date.now() - startTime;
      const content = response.data;

      const scrapedData = await this.parseHtmlContent(content, url);
      
      // Add performance metrics
      scrapedData.performance = {
        loadTime,
        pageSize: Buffer.byteLength(content, 'utf8'),
      };

      return scrapedData;
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Parse HTML content and extract structured data
   */
  private async parseHtmlContent(html: string, url: string): Promise<ScrapedData> {
    const $ = cheerio.load(html);
    
    return {
      url,
      title: this.extractTitle($),
      metaDescription: this.extractMetaDescription($),
      headings: this.extractHeadings($),
      content: this.extractContent($),
      schemas: this.extractSchemas($),
      metaTags: this.extractMetaTags($),
      openGraphTags: this.extractOpenGraphTags($),
      images: this.extractImages($, url),
      links: this.extractLinks($, url),
      performance: { loadTime: 0, pageSize: 0 }, // Will be set by caller
    };
  }

  /**
   * Extract page title
   */
  private extractTitle($: cheerio.CheerioAPI): string {
    return $('title').first().text().trim() || '';
  }

  /**
   * Extract meta description
   */
  private extractMetaDescription($: cheerio.CheerioAPI): string {
    return $('meta[name="description"]').attr('content') || '';
  }

  /**
   * Extract all headings with hierarchy
   */
  private extractHeadings($: cheerio.CheerioAPI): Heading[] {
    const headings: Heading[] = [];
    
    $('h1, h2, h3, h4, h5, h6').each((_, element) => {
      const $el = $(element);
      const level = parseInt(element.tagName.charAt(1));
      const text = $el.text().trim();
      const id = $el.attr('id');
      
      if (text) {
        headings.push({ level, text, id });
      }
    });
    
    return headings;
  }

  /**
   * Extract main content text
   */
  private extractContent($: cheerio.CheerioAPI): string {
    // Remove script and style elements
    $('script, style, nav, header, footer, aside').remove();
    
    // Try to find main content area
    const contentSelectors = [
      'main',
      '[role="main"]',
      '.content',
      '.main-content',
      '.post-content',
      '.entry-content',
      'article',
      '.article-body',
    ];
    
    for (const selector of contentSelectors) {
      const content = $(selector).first().text();
      if (content && content.length > 100) {
        return content.trim();
      }
    }
    
    // Fallback to body content
    return $('body').text().replace(/\s+/g, ' ').trim();
  }

  /**
   * Extract JSON-LD schema markup
   */
  private extractSchemas($: cheerio.CheerioAPI): SchemaMarkup[] {
    const schemas: SchemaMarkup[] = [];
    
    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        const jsonText = $(element).html();
        if (jsonText) {
          const data = JSON.parse(jsonText);
          const type = data['@type'] || 'Unknown';
          
          schemas.push({
            type,
            data,
            isValid: true,
          });
        }
      } catch (error) {
        schemas.push({
          type: 'Invalid',
          data: {},
          isValid: false,
          errors: [error.message],
        });
      }
    });
    
    return schemas;
  }

  /**
   * Extract meta tags
   */
  private extractMetaTags($: cheerio.CheerioAPI): MetaTag[] {
    const metaTags: MetaTag[] = [];
    
    $('meta').each((_, element) => {
      const $el = $(element);
      const name = $el.attr('name');
      const property = $el.attr('property');
      const content = $el.attr('content');
      
      if (content && (name || property)) {
        metaTags.push({ name, property, content });
      }
    });
    
    return metaTags;
  }

  /**
   * Extract Open Graph tags
   */
  private extractOpenGraphTags($: cheerio.CheerioAPI): OpenGraphTag[] {
    const ogTags: OpenGraphTag[] = [];
    
    $('meta[property^="og:"]').each((_, element) => {
      const $el = $(element);
      const property = $el.attr('property');
      const content = $el.attr('content');
      
      if (property && content) {
        ogTags.push({ property, content });
      }
    });
    
    return ogTags;
  }

  /**
   * Extract image information
   */
  private extractImages($: cheerio.CheerioAPI, baseUrl: string): ImageData[] {
    const images: ImageData[] = [];
    
    $('img').each((_, element) => {
      const $el = $(element);
      let src = $el.attr('src');
      
      if (src) {
        // Convert relative URLs to absolute
        if (src.startsWith('/')) {
          const domain = extractDomain(baseUrl);
          src = `https://${domain}${src}`;
        } else if (!src.startsWith('http')) {
          src = new URL(src, baseUrl).href;
        }
        
        images.push({
          src,
          alt: $el.attr('alt'),
          title: $el.attr('title'),
          width: parseInt($el.attr('width') || '0') || undefined,
          height: parseInt($el.attr('height') || '0') || undefined,
        });
      }
    });
    
    return images;
  }

  /**
   * Extract link information
   */
  private extractLinks($: cheerio.CheerioAPI, baseUrl: string): LinkData[] {
    const links: LinkData[] = [];
    const domain = extractDomain(baseUrl);
    
    $('a[href]').each((_, element) => {
      const $el = $(element);
      let href = $el.attr('href');
      const text = $el.text().trim();
      
      if (href && text) {
        // Convert relative URLs to absolute
        if (href.startsWith('/')) {
          href = `https://${domain}${href}`;
        } else if (!href.startsWith('http') && !href.startsWith('mailto:')) {
          href = new URL(href, baseUrl).href;
        }
        
        const isInternal = href.includes(domain);
        const rel = $el.attr('rel');
        
        links.push({ href, text, isInternal, rel });
      }
    });
    
    return links;
  }

  /**
   * Get Core Web Vitals metrics
   */
  private async getCoreWebVitals(page: Page): Promise<{ lcp?: number; fid?: number; cls?: number }> {
    try {
      return await page.evaluate(() => {
        return new Promise((resolve) => {
          const metrics: any = {};
          
          // LCP (Largest Contentful Paint)
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            metrics.lcp = lastEntry.startTime;
          }).observe({ entryTypes: ['largest-contentful-paint'] });
          
          // CLS (Cumulative Layout Shift)
          let clsValue = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
            metrics.cls = clsValue;
          }).observe({ entryTypes: ['layout-shift'] });
          
          // Resolve after a short delay to collect metrics
          setTimeout(() => resolve(metrics), 2000);
        });
      });
    } catch (error) {
      logger.warn('Failed to get Core Web Vitals:', error);
      return {};
    }
  }

  /**
   * Health check for the scraper
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testUrl = 'https://example.com';
      const result = await this.scrapeUrl(testUrl, { timeout: 5000 });
      return result.title.length > 0;
    } catch (error) {
      logger.error('Scraper health check failed:', error);
      return false;
    }
  }
}
