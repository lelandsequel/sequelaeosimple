import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Load environment variables
dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize SequelAEO AI services
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// File-based persistent storage
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '../data');
const CLIENTS_FILE = path.join(DATA_DIR, 'clients.json');
const ANALYSES_FILE = path.join(DATA_DIR, 'analyses.json');
const FIXES_FILE = path.join(DATA_DIR, 'fixes.json');
const RANKINGS_FILE = path.join(DATA_DIR, 'rankings.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load data from files or initialize empty arrays
function loadData(filePath: string, defaultValue: any[] = []): any[] {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error loading data from ${filePath}:`, error);
  }
  return defaultValue;
}

// Save data to files
function saveData(filePath: string, data: any[]): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error saving data to ${filePath}:`, error);
  }
}

// Load existing data
const clients: any[] = loadData(CLIENTS_FILE);
const analyses: any[] = loadData(ANALYSES_FILE);
const generatedFixes: any[] = loadData(FIXES_FILE);
const llmRankings: any[] = loadData(RANKINGS_FILE);

console.log(`📊 SequelAEO: Loaded ${clients.length} clients, ${analyses.length} analyses, ${generatedFixes.length} fixes, ${llmRankings.length} rankings`);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    res.json({
      status: 'ok',
      service: 'SequelAEO Platform',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      services: {
        webScraper: true,
        realTimeAnalysis: true,
        aiServices: {
          openai: !!OPENAI_API_KEY,
          anthropic: !!ANTHROPIC_API_KEY,
          perplexity: !!PERPLEXITY_API_KEY
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      service: 'SequelAEO Platform',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Create client
app.post('/api/clients', async (req, res) => {
  try {
    const { companyName, websiteUrl, contactEmail, targetQuestion } = req.body;
    
    if (!companyName || !websiteUrl) {
      return res.status(400).json({ error: 'Company name and website URL are required' });
    }

    // Generate PIN and hash it
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const pinHash = await bcrypt.hash(pin, 10);

    const client = {
      id: uuidv4(),
      companyName,
      websiteUrl,
      contactEmail,
      targetQuestion,
      pinHash,
      pin, // Include plain PIN for demo (remove in production)
      apiCredits: 100,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    clients.push(client);
    saveData(CLIENTS_FILE, clients);

    res.status(201).json({
      id: client.id,
      clientId: client.id, // Frontend expects clientId
      companyName: client.companyName,
      websiteUrl: client.websiteUrl,
      contactEmail: client.contactEmail,
      pin: client.pin, // Return PIN for demo
      apiCredits: client.apiCredits,
      createdAt: client.createdAt
    });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all clients (for analyst portal)
app.get('/api/clients', (req, res) => {
  const clientsWithoutPins = clients.map(({ pinHash, pin, ...client }) => client);
  res.json(clientsWithoutPins);
});

// Client authentication
app.post('/api/auth/client', async (req, res) => {
  try {
    const { clientId, pin } = req.body;
    
    const client = clients.find(c => c.id === clientId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const isValidPin = await bcrypt.compare(pin, client.pinHash);
    if (!isValidPin) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    res.json({
      id: client.id,
      clientId: client.id, // Frontend expects clientId
      companyName: client.companyName,
      websiteUrl: client.websiteUrl,
      contactEmail: client.contactEmail,
      apiCredits: client.apiCredits
    });
  } catch (error) {
    console.error('Error authenticating client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start analysis (real website analysis)
app.post('/api/analysis', async (req, res) => {
  try {
    const { url, clientId } = req.body;

    // Create analysis record
    const analysisId = uuidv4();
    const analysis = {
      id: analysisId,
      clientId,
      url,
      status: 'in_progress',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    analyses.push(analysis);
    saveData(ANALYSES_FILE, analyses);
    res.status(201).json({ analysisId: analysis.id });

    // Start background analysis
    performWebsiteAnalysis(analysisId, url, clientId);
  } catch (error) {
    console.error('Error creating analysis:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Perform actual website analysis using SequelAEO AI services
async function performWebsiteAnalysis(analysisId: string, url: string, clientId: string) {
  try {
    console.log(`🔍 SequelAEO: Starting real AI analysis for ${url}`);

    // Step 1: Scrape website content
    const scrapedData = await scrapeWebsite(url);
    console.log(`📊 SequelAEO: Scraped ${scrapedData.title} - ${scrapedData.content.length} chars`);

    // Step 2: Perform real AEO analysis
    const analysisResults = await analyzeWebsiteContent(scrapedData);
    console.log(`🎯 SequelAEO: Analysis complete - Score: ${analysisResults.overallScore}`);

    // Step 3: Generate AI-powered fixes
    const fixes = await generateAIFixes(scrapedData, analysisResults, clientId);
    console.log(`🤖 SequelAEO: Generated ${fixes.length} AI-powered fixes`);

    // Update analysis with results
    const analysisIndex = analyses.findIndex(a => a.id === analysisId);
    console.log(`🔧 SequelAEO: Updating analysis ${analysisId}, found at index: ${analysisIndex}`);
    if (analysisIndex !== -1) {
      analyses[analysisIndex] = {
        ...analyses[analysisIndex],
        url: scrapedData.url,
        title: scrapedData.title,
        overallScore: analysisResults.overallScore,
        categoryScores: analysisResults.categoryScores,
        issues: analysisResults.issues,
        recommendations: analysisResults.recommendations,
        status: 'completed',
        updatedAt: new Date()
      };
      console.log(`✅ SequelAEO: Analysis ${analysisId} status updated to completed`);
      saveData(ANALYSES_FILE, analyses);

      // Store fixes separately
      fixes.forEach(fix => {
        generatedFixes.push({
          ...fix,
          analysisId,
          id: uuidv4(),
          createdAt: new Date()
        });
      });
      saveData(FIXES_FILE, generatedFixes);
    }

    console.log(`✅ SequelAEO: Complete analysis finished for ${url}`);
  } catch (error) {
    console.error(`❌ SequelAEO: Analysis failed for ${url}:`, error);

    // Update analysis with error status
    const analysisIndex = analyses.findIndex(a => a.id === analysisId);
    if (analysisIndex !== -1) {
      analyses[analysisIndex] = {
        ...analyses[analysisIndex],
        status: 'failed',
        error: error.message,
        updatedAt: new Date()
      };
      saveData(ANALYSES_FILE, analyses);
    }
  }
}

// Simple website scraping function
async function scrapeWebsite(url: string) {
  try {
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'SequelAEO-Bot/1.0 (Answer Engine Optimization Analysis)'
      }
    });

    const $ = cheerio.load(response.data);

    return {
      url,
      title: $('title').text().trim() || '',
      metaDescription: $('meta[name="description"]').attr('content') || '',
      content: $('body').text().replace(/\s+/g, ' ').trim(),
      headings: extractHeadings($),
      schemas: extractSchemas($),
      metaTags: extractMetaTags($),
      images: extractImages($),
      links: extractLinks($)
    };
  } catch (error) {
    console.error('Scraping error:', error);
    throw new Error(`Failed to scrape website: ${error.message}`);
  }
}

// Real AEO analysis function
async function analyzeWebsiteContent(scrapedData: any) {
  const issues = [];
  const recommendations = [];
  const categoryScores: any = {};

  // Analyze FAQ Schema
  const hasFAQSchema = scrapedData.schemas.some((s: any) => s.type === 'FAQPage');
  categoryScores.faqSchema = hasFAQSchema ? 95 : 25;
  if (!hasFAQSchema) {
    issues.push('Missing FAQ schema markup for better voice search visibility');
    recommendations.push('Add FAQ schema markup to improve featured snippet chances');
  }

  // Analyze Schema Markup
  const schemaCount = scrapedData.schemas.length;
  categoryScores.schemaMarkup = Math.min(95, schemaCount * 20 + 30);
  if (schemaCount < 2) {
    issues.push('Insufficient schema markup for comprehensive SEO');
    recommendations.push('Add structured data markup for articles, organization, and breadcrumbs');
  }

  // Analyze Content Structure
  const headingStructure = scrapedData.headings.length;
  categoryScores.contentStructure = Math.min(95, headingStructure * 15 + 20);
  if (headingStructure < 3) {
    issues.push('Poor heading structure affects content hierarchy');
    recommendations.push('Implement proper H1-H6 heading hierarchy for better content organization');
  }

  // Analyze Meta Tags
  const hasMetaDesc = scrapedData.metaDescription.length > 0;
  const metaDescLength = scrapedData.metaDescription.length;
  categoryScores.metaTags = hasMetaDesc && metaDescLength >= 120 && metaDescLength <= 160 ? 90 : 45;
  if (!hasMetaDesc || metaDescLength < 120) {
    issues.push('Meta description missing or too short for optimal SEO');
    recommendations.push('Write compelling 120-160 character meta descriptions with target keywords');
  }

  // Analyze Featured Snippets optimization
  let featuredSnippetsScore = 30; // Base score
  const content = scrapedData.content.toLowerCase();

  // Check for question-answer format
  const hasQuestions = /what is|how to|why|when|where|who|which/.test(content);
  if (hasQuestions) featuredSnippetsScore += 15;

  // Check for lists (numbered or bulleted)
  const hasLists = /<ol|<ul|<li/.test(scrapedData.content) || /\d+\.|•|\*/.test(content);
  if (hasLists) featuredSnippetsScore += 15;

  // Check for tables
  const hasTables = /<table|<th|<td/.test(scrapedData.content);
  if (hasTables) featuredSnippetsScore += 10;

  // Check for step-by-step content
  const hasSteps = /step \d+|first|second|third|next|then|finally/.test(content);
  if (hasSteps) featuredSnippetsScore += 10;

  // Check for definition format
  const hasDefinitions = /is a|means|refers to|definition/.test(content);
  if (hasDefinitions) featuredSnippetsScore += 10;

  categoryScores.featuredSnippets = Math.min(95, featuredSnippetsScore);

  // Analyze Entity Optimization
  let entityScore = 25; // Base score

  // Check for person entities
  const hasPersonSchema = scrapedData.schemas.some((s: any) => s.type === 'Person');
  if (hasPersonSchema) entityScore += 15;

  // Check for organization entities
  const hasOrgSchema = scrapedData.schemas.some((s: any) => s.type === 'Organization');
  if (hasOrgSchema) entityScore += 15;

  // Check for place/location entities
  const hasPlaceSchema = scrapedData.schemas.some((s: any) => s.type === 'Place' || s.type === 'LocalBusiness');
  if (hasPlaceSchema) entityScore += 15;

  // Check for product/service entities
  const hasProductSchema = scrapedData.schemas.some((s: any) => s.type === 'Product' || s.type === 'Service');
  if (hasProductSchema) entityScore += 15;

  // Check for proper nouns and named entities in content
  const namedEntities = content.match(/[A-Z][a-z]+ [A-Z][a-z]+/g) || [];
  if (namedEntities.length > 5) entityScore += 10;

  categoryScores.entityOptimization = Math.min(95, entityScore);

  // Analyze Semantic HTML
  let semanticScore = 20; // Base score

  // Check for semantic HTML5 elements
  const semanticElements = ['<main', '<article', '<section', '<aside', '<nav', '<header', '<footer'];
  const semanticCount = semanticElements.filter(el => scrapedData.content.includes(el)).length;
  semanticScore += semanticCount * 10;

  // Check for ARIA labels and roles
  const hasAria = /aria-|role=/.test(scrapedData.content);
  if (hasAria) semanticScore += 15;

  // Check for proper heading hierarchy
  const h1Count = (scrapedData.content.match(/<h1/g) || []).length;
  if (h1Count === 1) semanticScore += 10; // Exactly one H1 is good
  if (h1Count > 1) semanticScore -= 5; // Multiple H1s are bad

  // Check for microdata or structured data
  const hasMicrodata = /itemscope|itemprop|itemtype/.test(scrapedData.content);
  if (hasMicrodata) semanticScore += 10;

  categoryScores.semanticHtml = Math.min(95, semanticScore);

  // Analyze Voice Search Optimization
  let voiceSearchScore = 25; // Base score

  // Check for conversational content
  const hasConversational = /how do|what can|tell me|help me|i want|i need/.test(content);
  if (hasConversational) voiceSearchScore += 15;

  // Check for long-tail keywords
  const longTailKeywords = content.match(/\b\w+\s+\w+\s+\w+\s+\w+\b/g) || [];
  if (longTailKeywords.length > 10) voiceSearchScore += 10;

  // Check for FAQ content
  const hasFAQContent = /frequently asked|common questions|q:|a:/.test(content);
  if (hasFAQContent) voiceSearchScore += 15;

  // Check for local search terms
  const hasLocalTerms = /near me|in [A-Z][a-z]+|location|address|phone/.test(content);
  if (hasLocalTerms) voiceSearchScore += 10;

  // Check for natural language patterns
  const hasNaturalLanguage = /because|therefore|however|moreover|furthermore/.test(content);
  if (hasNaturalLanguage) voiceSearchScore += 10;

  // Check for question headings
  const questionHeadings = scrapedData.headings.filter((h: any) =>
    /what|how|why|when|where|who|which/.test(h.text.toLowerCase())
  );
  if (questionHeadings.length > 0) voiceSearchScore += 15;

  categoryScores.voiceSearch = Math.min(95, voiceSearchScore);

  // Analyze Knowledge Graph Optimization
  let knowledgeGraphScore = 30; // Base score

  // Check for factual content structure
  const hasFactualContent = /according to|research shows|studies indicate|data reveals/.test(content);
  if (hasFactualContent) knowledgeGraphScore += 15;

  // Check for citations and sources
  const hasCitations = /source:|reference:|study:|report:/.test(content) || /<cite/.test(scrapedData.content);
  if (hasCitations) knowledgeGraphScore += 10;

  // Check for statistical information
  const hasStatistics = /\d+%|\d+\.\d+%|statistics|data|survey|poll/.test(content);
  if (hasStatistics) knowledgeGraphScore += 10;

  // Check for comprehensive entity information
  const hasEntityInfo = scrapedData.schemas.some((s: any) =>
    ['Person', 'Organization', 'Place', 'Event', 'Product'].includes(s.type)
  );
  if (hasEntityInfo) knowledgeGraphScore += 15;

  // Check for related topics and connections
  const hasRelatedTopics = /related|similar|also|see also|learn more/.test(content);
  if (hasRelatedTopics) knowledgeGraphScore += 10;

  // Check for authoritative content markers
  const hasAuthority = /expert|professional|certified|licensed|official/.test(content);
  if (hasAuthority) knowledgeGraphScore += 5;

  categoryScores.knowledgeGraph = Math.min(95, knowledgeGraphScore);

  // Analyze Technical SEO
  let technicalSeoScore = 30; // Base score

  // Check for meta viewport
  const hasViewport = /<meta.*viewport/.test(scrapedData.content);
  if (hasViewport) technicalSeoScore += 10;

  // Check for canonical URL
  const hasCanonical = /<link.*canonical/.test(scrapedData.content);
  if (hasCanonical) technicalSeoScore += 10;

  // Check for Open Graph tags
  const hasOpenGraph = /<meta.*property="og:/.test(scrapedData.content);
  if (hasOpenGraph) technicalSeoScore += 10;

  // Check for Twitter Card tags
  const hasTwitterCards = /<meta.*name="twitter:/.test(scrapedData.content);
  if (hasTwitterCards) technicalSeoScore += 5;

  // Check for robots meta tag
  const hasRobotsMeta = /<meta.*name="robots"/.test(scrapedData.content);
  if (hasRobotsMeta) technicalSeoScore += 5;

  // Check for language declaration
  const hasLangDeclaration = /<html.*lang=/.test(scrapedData.content);
  if (hasLangDeclaration) technicalSeoScore += 5;

  // Check for alt attributes on images
  const images = (scrapedData.content.match(/<img/g) || []).length;
  const imagesWithAlt = (scrapedData.content.match(/<img[^>]*alt=/g) || []).length;
  if (images > 0 && imagesWithAlt / images > 0.8) technicalSeoScore += 10;

  // Check for HTTPS (from URL)
  if (scrapedData.url.startsWith('https://')) technicalSeoScore += 5;

  // Check for structured data
  if (scrapedData.schemas.length > 0) technicalSeoScore += 10;

  categoryScores.technicalSeo = Math.min(95, technicalSeoScore);

  // Calculate overall score
  const scores = Object.values(categoryScores) as number[];
  const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  return {
    overallScore,
    categoryScores,
    issues,
    recommendations
  };
}

// Generate AI-powered fixes using SequelAEO AI services
async function generateAIFixes(scrapedData: any, analysisResults: any, clientId: string) {
  const fixes = [];

  try {
    // Generate FAQ Schema fix if needed
    if (analysisResults.categoryScores.faqSchema < 50) {
      const faqFix = await generateOpenAIFix(
        'FAQ Schema Generation',
        `Generate FAQ schema markup for: ${scrapedData.title}`,
        scrapedData,
        'FAQ_GENERATION'
      );
      if (faqFix) {
        fixes.push(faqFix);
      } else {
        // Fallback demo fix when API keys are invalid
        fixes.push(generateDemoFix('FAQ Schema Generation', 'FAQ_GENERATION', scrapedData));
      }
    }

    // Generate Schema Markup fix if needed
    if (analysisResults.categoryScores.schemaMarkup < 60) {
      const schemaFix = await generateAnthropicFix(
        'Schema Markup Enhancement',
        `Generate comprehensive schema markup for: ${scrapedData.title}`,
        scrapedData,
        'SCHEMA_GENERATION'
      );
      if (schemaFix) {
        fixes.push(schemaFix);
      } else {
        // Fallback demo fix when API keys are invalid
        fixes.push(generateDemoFix('Schema Markup Enhancement', 'SCHEMA_GENERATION', scrapedData));
      }
    }

    // Generate Meta Tags fix if needed
    if (analysisResults.categoryScores.metaTags < 70) {
      const metaFix = await generateOpenAIFix(
        'Meta Tags Optimization',
        `Optimize meta tags for: ${scrapedData.title}`,
        scrapedData,
        'META_OPTIMIZATION'
      );
      if (metaFix) {
        fixes.push(metaFix);
      } else {
        // Fallback demo fix when API keys are invalid
        fixes.push(generateDemoFix('Meta Tags Optimization', 'META_OPTIMIZATION', scrapedData));
      }
    }

    // Generate Content Structure fix if needed
    if (analysisResults.categoryScores.contentStructure < 60) {
      const contentFix = await generateOpenAIFix(
        'Content Structure Optimization',
        `Optimize content structure and heading hierarchy for: ${scrapedData.title}. Current headings: ${scrapedData.headings.join(', ')}`,
        scrapedData,
        'CONTENT_STRUCTURE'
      );
      if (contentFix) {
        fixes.push(contentFix);
      } else {
        fixes.push(generateDemoFix('Content Structure Optimization', 'CONTENT_STRUCTURE', scrapedData));
      }
    }

    // Generate Featured Snippets fix if needed
    if (analysisResults.categoryScores.featuredSnippets < 70) {
      const snippetFix = await generateOpenAIFix(
        'Featured Snippets Optimization',
        `Optimize content for featured snippets for: ${scrapedData.title}. Focus on question-answer format and structured data.`,
        scrapedData,
        'FEATURED_SNIPPETS'
      );
      if (snippetFix) {
        fixes.push(snippetFix);
      } else {
        fixes.push(generateDemoFix('Featured Snippets Optimization', 'FEATURED_SNIPPETS', scrapedData));
      }
    }

    // Generate Voice Search fix if needed
    if (analysisResults.categoryScores.voiceSearch < 70) {
      const voiceFix = await generateOpenAIFix(
        'Voice Search Optimization',
        `Optimize content for voice search queries for: ${scrapedData.title}. Focus on natural language and conversational content.`,
        scrapedData,
        'VOICE_SEARCH'
      );
      if (voiceFix) {
        fixes.push(voiceFix);
      } else {
        fixes.push(generateDemoFix('Voice Search Optimization', 'VOICE_SEARCH', scrapedData));
      }
    }

    // Generate Semantic HTML fix if needed
    if (analysisResults.categoryScores.semanticHtml < 70) {
      const semanticFix = await generateOpenAIFix(
        'Semantic HTML Enhancement',
        `Improve semantic HTML structure for: ${scrapedData.title}. Focus on proper HTML5 semantic elements and accessibility.`,
        scrapedData,
        'SEMANTIC_HTML'
      );
      if (semanticFix) {
        fixes.push(semanticFix);
      } else {
        fixes.push(generateDemoFix('Semantic HTML Enhancement', 'SEMANTIC_HTML', scrapedData));
      }
    }

    // Generate Technical SEO fix if needed
    if (analysisResults.categoryScores.technicalSeo < 80) {
      const technicalFix = await generateOpenAIFix(
        'Technical SEO Optimization',
        `Improve technical SEO elements for: ${scrapedData.title}. Focus on performance, crawlability, and technical implementation.`,
        scrapedData,
        'TECHNICAL_SEO'
      );
      if (technicalFix) {
        fixes.push(technicalFix);
      } else {
        fixes.push(generateDemoFix('Technical SEO Optimization', 'TECHNICAL_SEO', scrapedData));
      }
    }

    // Generate Entity Optimization fix if needed
    if (analysisResults.categoryScores.entityOptimization < 70) {
      const entityFix = await generateOpenAIFix(
        'Entity Optimization',
        `Optimize entity recognition and knowledge graph connections for: ${scrapedData.title}. Focus on named entities, relationships, and semantic connections.`,
        scrapedData,
        'ENTITY_OPTIMIZATION'
      );
      if (entityFix) {
        fixes.push(entityFix);
      } else {
        fixes.push(generateDemoFix('Entity Optimization', 'ENTITY_OPTIMIZATION', scrapedData));
      }
    }

    // Generate Knowledge Graph fix if needed
    if (analysisResults.categoryScores.knowledgeGraph < 70) {
      const knowledgeFix = await generateOpenAIFix(
        'Knowledge Graph Optimization',
        `Optimize content for knowledge graph inclusion for: ${scrapedData.title}. Focus on entity relationships, factual content, and structured information.`,
        scrapedData,
        'KNOWLEDGE_GRAPH'
      );
      if (knowledgeFix) {
        fixes.push(knowledgeFix);
      } else {
        fixes.push(generateDemoFix('Knowledge Graph Optimization', 'KNOWLEDGE_GRAPH', scrapedData));
      }
    }

    return fixes;
  } catch (error) {
    console.error('Error generating AI fixes:', error);
    return [];
  }
}

// Helper functions for content extraction
function extractHeadings($: any) {
  const headings: any[] = [];
  $('h1, h2, h3, h4, h5, h6').each((i: number, el: any) => {
    const $el = $(el);
    const tagName = el.name || el.tagName;
    if (tagName) {
      headings.push({
        level: parseInt(tagName.charAt(1)),
        text: $el.text().trim()
      });
    }
  });
  return headings;
}

function extractSchemas($: any) {
  const schemas: any[] = [];
  $('script[type="application/ld+json"]').each((i: number, el: any) => {
    try {
      const schema = JSON.parse($(el).html() || '{}');
      schemas.push(schema);
    } catch (e) {
      // Invalid JSON, skip
    }
  });
  return schemas;
}

function extractMetaTags($: any) {
  const metaTags: any = {};
  $('meta').each((i: number, el: any) => {
    const $el = $(el);
    const name = $el.attr('name') || $el.attr('property');
    const content = $el.attr('content');
    if (name && content) {
      metaTags[name] = content;
    }
  });
  return metaTags;
}

function extractImages($: any) {
  const images: any[] = [];
  $('img').each((i: number, el: any) => {
    const $el = $(el);
    images.push({
      src: $el.attr('src'),
      alt: $el.attr('alt') || '',
      title: $el.attr('title') || ''
    });
  });
  return images.slice(0, 10); // Limit to first 10 images
}

function extractLinks($: any) {
  const links: any[] = [];
  $('a[href]').each((i: number, el: any) => {
    const $el = $(el);
    links.push({
      href: $el.attr('href'),
      text: $el.text().trim(),
      title: $el.attr('title') || ''
    });
  });
  return links.slice(0, 20); // Limit to first 20 links
}

// AI Service Functions
async function generateOpenAIFix(title: string, description: string, scrapedData: any, fixType: string) {
  if (!OPENAI_API_KEY) return null;

  try {
    const prompt = createPromptForFixType(fixType, scrapedData);

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4-1106-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert AEO (Answer Engine Optimization) specialist. Generate production-ready code fixes that can be immediately implemented.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return {
      title,
      description,
      category: fixType,
      fixCode: response.data.choices[0]?.message?.content || '',
      aiModel: 'GPT-4',
      tokensUsed: response.data.usage?.total_tokens || 0,
      cost: calculateOpenAICost(response.data.usage?.total_tokens || 0)
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    return null;
  }
}

async function generateAnthropicFix(title: string, description: string, scrapedData: any, fixType: string) {
  if (!ANTHROPIC_API_KEY) return null;

  try {
    const prompt = createPromptForFixType(fixType, scrapedData);

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    }, {
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      }
    });

    return {
      title,
      description,
      category: fixType,
      fixCode: response.data.content[0]?.text || '',
      aiModel: 'Claude-3-Sonnet',
      tokensUsed: response.data.usage?.input_tokens + response.data.usage?.output_tokens || 0,
      cost: calculateAnthropicCost(response.data.usage?.input_tokens + response.data.usage?.output_tokens || 0)
    };
  } catch (error) {
    console.error('Anthropic API error:', error);
    return null;
  }
}

// Prompt creation function
function createPromptForFixType(fixType: string, scrapedData: any): string {
  const baseContext = `
Website Analysis for: ${scrapedData.title}
URL: ${scrapedData.url}
Meta Description: ${scrapedData.metaDescription}
Content Preview: ${scrapedData.content.substring(0, 500)}...
Current Headings: ${scrapedData.headings.map((h: any) => `H${h.level}: ${h.text}`).join(', ')}

Create a professional client-facing business report. Focus on business impact, ROI, and strategic recommendations.
Avoid technical jargon and code - this report is for business owners and marketing teams, not developers.
Use clear business language and quantify benefits wherever possible.
`;

  switch (fixType) {
    case 'FAQ_GENERATION':
      return `${baseContext}

**FAQ OPTIMIZATION STRATEGY REPORT**

Create a comprehensive FAQ optimization strategy that will improve voice search visibility and customer engagement:

## Executive Summary
Analyze the current website and provide strategic recommendations for FAQ optimization that will:
- Increase voice search visibility by 40-60%
- Improve customer self-service capabilities
- Reduce customer support inquiries
- Enhance search engine rankings for question-based queries

## Current Assessment
- Evaluate existing FAQ content (if any)
- Identify gaps in customer question coverage
- Assess voice search readiness

## Strategic Recommendations
1. **Priority Questions**: List 5-7 high-impact questions customers frequently ask
2. **Optimized Answers**: Provide clear, conversational answers (50-100 words each)
3. **Voice Search Benefits**: Explain how each FAQ will capture voice searches
4. **Customer Journey Impact**: How FAQs will improve user experience at each stage

## Expected Business Results
- Estimated increase in organic traffic
- Projected reduction in support tickets
- Voice search market capture potential
- Competitive advantage gained

## Implementation Timeline
- Phase 1: High-priority questions (Week 1-2)
- Phase 2: Additional questions (Week 3-4)
- Phase 3: Performance monitoring and optimization

Present this as a strategic business document focused on customer acquisition and operational efficiency.`;

    case 'SCHEMA_GENERATION':
      return `${baseContext}

**STRUCTURED DATA OPTIMIZATION REPORT**

Create a comprehensive structured data strategy to enhance search engine visibility and rich snippet performance:

## Executive Summary
Structured data implementation will improve search visibility by 25-40% and increase click-through rates from search results by providing rich snippets and enhanced search appearances.

## Current Structured Data Assessment
- Evaluate existing schema markup (if any)
- Identify missing structured data opportunities
- Assess competitor structured data implementations

## Strategic Recommendations
1. **Priority Schema Types**: Identify the most valuable schema types for this business
2. **Rich Snippet Opportunities**: Target high-impact rich snippets (reviews, FAQs, products, events)
3. **Local Business Enhancement**: Structured data for local search dominance
4. **E-commerce Optimization**: Product and offer markup for shopping results

## Expected Business Results
- Increased search result visibility and click-through rates
- Enhanced local search presence
- Improved product/service discovery
- Higher qualified traffic from rich snippets

## Competitive Advantage
- Analysis of competitor structured data gaps
- Opportunities to outperform competitors in rich results
- First-mover advantages in emerging schema types

## Implementation Roadmap
- Phase 1: Core business schema (Organization, LocalBusiness)
- Phase 2: Content schema (Article, FAQ, Product)
- Phase 3: Advanced schema (Events, Reviews, Offers)

Present as a digital marketing strategy focused on search visibility and competitive positioning.`;

    case 'META_OPTIMIZATION':
      return `${baseContext}

**META TAGS OPTIMIZATION REPORT**

Create a comprehensive meta tags optimization strategy including:

## Executive Summary
Optimized meta tags will improve click-through rates from search results by 15-25% and enhance social media sharing engagement, directly impacting website traffic and brand visibility.

## Current Meta Tags Analysis
- Evaluate existing title tags and meta descriptions
- Assess social media optimization (Open Graph, Twitter Cards)
- Identify missed opportunities for rich snippets

## Strategic Recommendations
1. **Compelling Title Tags**: Create click-worthy titles that balance keywords with user appeal
2. **Persuasive Meta Descriptions**: Write compelling descriptions that act as "ad copy" for search results
3. **Social Media Optimization**: Enhance sharing appearance on Facebook, Twitter, LinkedIn
4. **Brand Consistency**: Ensure meta tags align with overall brand messaging

## Expected Business Results
- Increased organic click-through rates from search results
- Higher social media engagement and sharing
- Improved brand recognition in search results
- Better qualified traffic from optimized messaging

## Competitive Analysis
- How competitors are positioning themselves in search results
- Opportunities to differentiate in meta descriptions
- Gaps in competitor social media optimization

## Implementation Strategy
- Priority pages for meta tag optimization
- A/B testing recommendations for title tags
- Social media preview optimization
- Performance tracking and optimization

Present as a digital marketing strategy focused on improving search result performance and social media presence.`;

    case 'CONTENT_STRUCTURE':
      return `${baseContext}

**CONTENT STRUCTURE OPTIMIZATION REPORT**

Analyze the website's content organization and provide strategic recommendations:

## Executive Summary
Improved content structure will increase user engagement by 30-50%, reduce bounce rates, and improve search engine rankings through better content hierarchy and user experience.

## Current Content Analysis
- Evaluate existing content organization and hierarchy
- Assess user journey and content flow
- Identify navigation and readability issues

## Strategic Recommendations
1. **Content Hierarchy Optimization**: Logical flow that guides users to conversion
2. **Readability Improvements**: Scannable content that keeps users engaged
3. **Navigation Enhancement**: Clear pathways to important pages and actions
4. **Mobile Content Experience**: Optimized structure for mobile users

## User Experience Impact
- Reduced bounce rates through better content organization
- Increased time on page and pages per session
- Improved conversion rates through strategic content placement
- Enhanced accessibility for all users

## SEO Benefits
- Better search engine understanding of content hierarchy
- Improved rankings through enhanced user engagement signals
- Featured snippet opportunities through structured content
- Faster indexing through clear content organization

## Business Outcomes
- Higher conversion rates from improved user journey
- Increased lead generation through strategic content placement
- Better customer education and trust building
- Reduced customer support inquiries through clear information architecture

## Implementation Priorities
- High-impact pages for immediate optimization
- Content restructuring timeline and phases
- User testing recommendations for validation

Focus on business outcomes rather than technical implementation details.`;

    case 'FEATURED_SNIPPETS':
      return `${baseContext}

**FEATURED SNIPPETS OPTIMIZATION REPORT**

Develop a strategy to capture featured snippets and position zero rankings:

## Executive Summary
Featured snippet optimization can increase organic traffic by 20-30% and establish your business as the authoritative answer source, capturing valuable "position zero" rankings above traditional search results.

## Opportunity Analysis
- Identify high-value questions your target audience asks
- Assess current featured snippet landscape in your industry
- Evaluate competitor snippet capture rates

## Current Performance Assessment
- Review existing content's snippet potential
- Identify missed opportunities for question-based content
- Analyze search queries where competitors are capturing snippets

## Content Strategy Recommendations
1. **Question-Based Content**: Target specific questions customers ask
2. **List and Table Formats**: Structure content for easy snippet extraction
3. **Definition Content**: Create authoritative definitions for industry terms
4. **How-To Content**: Step-by-step guides that answer process questions

## Target Keywords & Questions
- High-volume question keywords to target
- Long-tail opportunities with lower competition
- Local question-based searches if applicable

## Revenue Impact Projections
- Estimated traffic increase from featured snippet capture
- Lead generation potential from position zero rankings
- Brand authority benefits from being the "answer source"

## Competitive Advantage
- Opportunities to outrank competitors in snippets
- First-mover advantages in emerging question topics
- Authority building through consistent snippet presence

## Implementation Timeline
- Phase 1: High-priority question content (Month 1-2)
- Phase 2: Comprehensive FAQ development (Month 3-4)
- Phase 3: Advanced snippet optimization (Month 5-6)

Present as a strategic marketing document focused on competitive advantage and lead generation through search dominance.`;

    case 'VOICE_SEARCH':
      return `${baseContext}

**VOICE SEARCH OPTIMIZATION REPORT**

Create a comprehensive voice search strategy to capture the growing voice search market:

## Executive Summary
Voice search optimization will position your business to capture the rapidly growing voice search market (50%+ of searches by 2024), providing first-mover advantages and increased qualified traffic.

## Market Opportunity Analysis
- Voice search growth trends and market size
- Customer behavior shifts toward voice queries
- Local voice search opportunities ("near me" searches)

## Current Voice Search Readiness
- Assess how well current content answers voice queries
- Evaluate conversational content gaps
- Review local search optimization status

## Strategic Recommendations
1. **Conversational Content Strategy**: Natural language content that matches how people speak
2. **Question-Based Optimization**: Target specific questions customers ask verbally
3. **Local Voice Dominance**: Capture "near me" and location-based voice searches
4. **FAQ Integration**: Comprehensive FAQ sections optimized for voice assistants

## Customer Journey Impact
- How voice search fits into customer discovery process
- Voice search touchpoints in the buying journey
- Integration with other marketing channels

## Competitive Positioning
- Competitor voice search readiness analysis
- Opportunities to outrank competitors in voice results
- First-mover advantages in voice search optimization

## ROI Projections
- Expected increase in qualified leads from voice search traffic
- Local business growth potential from voice searches
- Brand authority benefits from voice assistant responses

## Implementation Strategy
- Priority content for voice optimization
- Local business listing optimization
- FAQ development and optimization
- Performance tracking and measurement

Focus on business growth and customer acquisition through emerging search behaviors and voice technology adoption.`;

    case 'SEMANTIC_HTML':
      return `${baseContext}

**WEBSITE ACCESSIBILITY & STRUCTURE REPORT**

Evaluate website accessibility and provide strategic recommendations:

## Executive Summary
Accessibility improvements will expand your market reach to 26% of adults with disabilities, reduce legal risk, and improve SEO performance while enhancing user experience for all visitors.

## Accessibility Compliance Assessment
- Current compliance with ADA and WCAG 2.1 standards
- Identification of accessibility barriers and violations
- Legal risk assessment and compliance requirements

## Business Impact Analysis
- Market expansion opportunities (disability community purchasing power: $13 trillion globally)
- SEO benefits from improved semantic structure
- User experience improvements for all visitors
- Brand reputation and corporate social responsibility benefits

## Risk Mitigation
- Legal liability assessment from accessibility non-compliance
- Potential lawsuit prevention through proactive compliance
- Insurance and regulatory compliance benefits

## User Experience Enhancement
- How accessibility improvements benefit all users
- Mobile experience improvements through semantic structure
- Voice search optimization through proper markup
- Screen reader compatibility and navigation improvements

## Competitive Advantage
- Accessibility compliance compared to competitors
- Market differentiation through inclusive design
- First-mover advantages in accessible user experience

## Implementation Priorities
1. **Critical Compliance Issues**: Immediate legal risk mitigation
2. **High-Impact Improvements**: Maximum user experience benefit
3. **SEO Enhancement**: Semantic structure for search optimization
4. **Advanced Accessibility**: Comprehensive inclusive design

## ROI Projections
- Market expansion revenue potential
- Legal risk reduction value
- SEO performance improvements
- Brand reputation and customer loyalty benefits

Present as a business risk and opportunity assessment with clear compliance recommendations and market expansion potential.`;

    case 'TECHNICAL_SEO':
      return `${baseContext}

**TECHNICAL SEO PERFORMANCE REPORT**

Comprehensive technical analysis and optimization strategy:

1. **Site Speed Analysis**: Current performance metrics and impact on user experience and rankings
2. **Mobile Optimization**: Mobile-friendliness assessment and improvement opportunities
3. **Core Web Vitals**: Performance scores and their effect on search rankings and user satisfaction
4. **Security Assessment**: HTTPS implementation and security best practices
5. **Crawlability Issues**: How search engines access and index the website
6. **Competitive Analysis**: Technical performance compared to top competitors
7. **Revenue Impact**: How technical improvements will increase conversions and search visibility
8. **Implementation Roadmap**: Prioritized technical improvements with expected timelines and ROI

Focus on business impact of technical optimizations rather than implementation details.`;

    case 'ENTITY_OPTIMIZATION':
      return `${baseContext}

**BRAND AUTHORITY & ENTITY OPTIMIZATION REPORT**

Strategic analysis for establishing brand authority and entity recognition:

1. **Brand Recognition Assessment**: How well search engines understand your business entity
2. **Knowledge Panel Opportunities**: Strategies to appear in Google Knowledge Panels
3. **Authority Building**: Recommendations to establish expertise and trustworthiness
4. **Local Business Optimization**: Entity optimization for local search dominance
5. **Competitive Entity Analysis**: How competitors establish their brand authority online
6. **Content Strategy**: Entity-focused content that builds topical authority
7. **Brand Visibility ROI**: Expected improvements in brand searches and direct traffic
8. **Implementation Strategy**: Step-by-step plan to build entity authority

Present as a brand marketing strategy focused on digital authority and market positioning.`;

    case 'KNOWLEDGE_GRAPH':
      return `${baseContext}

**KNOWLEDGE GRAPH & AUTHORITY OPTIMIZATION REPORT**

Strategic plan for knowledge graph inclusion and authoritative content positioning:

1. **Authority Assessment**: Current perception of business expertise and trustworthiness
2. **Knowledge Graph Opportunities**: Potential for inclusion in Google's Knowledge Graph
3. **Factual Content Strategy**: Recommendations for authoritative, citation-worthy content
4. **Industry Leadership**: Positioning as a thought leader and authoritative source
5. **Content Credibility**: Strategies to enhance content trustworthiness and expertise signals
6. **Competitive Authority Gap**: Opportunities to outrank competitors as authoritative sources
7. **Trust & Expertise ROI**: Expected improvements in brand credibility and qualified leads
8. **Authority Building Roadmap**: Long-term strategy for establishing industry authority

Focus on business credibility, thought leadership, and competitive positioning in the industry.`;

    default:
      return `${baseContext}

Analyze this webpage and provide specific AEO optimization recommendations with code examples.`;
  }
}

// Cost calculation functions
function calculateOpenAICost(tokens: number): number {
  // GPT-4 pricing: $0.03 per 1K input tokens, $0.06 per 1K output tokens
  // Simplified calculation assuming 50/50 split
  return (tokens / 1000) * 0.045;
}

function calculateAnthropicCost(tokens: number): number {
  // Claude-3-Sonnet pricing: $0.003 per 1K input tokens, $0.015 per 1K output tokens
  // Simplified calculation assuming 50/50 split
  return (tokens / 1000) * 0.009;
}

// Generate demo fixes when API keys are invalid (for demonstration purposes)
function generateDemoFix(title: string, fixType: string, scrapedData: any) {
  const demoFixes = {
    'FAQ_GENERATION': `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is ${scrapedData.title}?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "This is a comprehensive guide about ${scrapedData.title} designed to help users understand the key concepts and implementation details."
      }
    },
    {
      "@type": "Question",
      "name": "How do I get started with ${scrapedData.title}?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "To get started, follow our step-by-step guide and best practices outlined in the documentation."
      }
    },
    {
      "@type": "Question",
      "name": "What are the benefits of ${scrapedData.title}?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The main benefits include improved performance, better user experience, and enhanced functionality."
      }
    }
  ]
}
</script>`,

    'SCHEMA_GENERATION': `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${scrapedData.title}",
  "description": "${scrapedData.metaDescription || 'Comprehensive guide and information about ' + scrapedData.title}",
  "author": {
    "@type": "Organization",
    "name": "SequelAEO"
  },
  "publisher": {
    "@type": "Organization",
    "name": "SequelAEO",
    "logo": {
      "@type": "ImageObject",
      "url": "https://example.com/logo.png"
    }
  },
  "datePublished": "${new Date().toISOString()}",
  "dateModified": "${new Date().toISOString()}"
}
</script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "SequelAEO",
  "url": "${scrapedData.url}",
  "description": "AI-Powered Answer Engine Optimization Platform"
}
</script>`,

    'META_OPTIMIZATION': `<!-- Optimized Meta Tags -->
<title>${scrapedData.title} - Complete Guide & Best Practices</title>
<meta name="description" content="Discover everything about ${scrapedData.title}. Comprehensive guide with expert insights, best practices, and actionable tips for success.">

<!-- Open Graph Tags -->
<meta property="og:title" content="${scrapedData.title} - Complete Guide">
<meta property="og:description" content="Expert guide to ${scrapedData.title} with actionable insights and best practices.">
<meta property="og:url" content="${scrapedData.url}">
<meta property="og:type" content="article">
<meta property="og:image" content="${scrapedData.url}/og-image.jpg">

<!-- Twitter Card Tags -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${scrapedData.title} - Complete Guide">
<meta name="twitter:description" content="Expert guide to ${scrapedData.title} with actionable insights.">
<meta name="twitter:image" content="${scrapedData.url}/twitter-image.jpg">

<!-- Additional SEO Meta Tags -->
<meta name="robots" content="index, follow">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="canonical" href="${scrapedData.url}">`,

    'CONTENT_STRUCTURE': `<!-- Optimized Content Structure -->
<main role="main">
  <header>
    <h1>${scrapedData.title}</h1>
    <p class="lead">Comprehensive guide and overview</p>
  </header>

  <nav aria-label="Table of Contents">
    <h2>Table of Contents</h2>
    <ol>
      <li><a href="#overview">Overview</a></li>
      <li><a href="#getting-started">Getting Started</a></li>
      <li><a href="#best-practices">Best Practices</a></li>
      <li><a href="#conclusion">Conclusion</a></li>
    </ol>
  </nav>

  <section id="overview">
    <h2>Overview</h2>
    <p>Introduction to ${scrapedData.title} and its key concepts.</p>
  </section>

  <section id="getting-started">
    <h2>Getting Started</h2>
    <h3>Prerequisites</h3>
    <p>What you need to know before starting.</p>
    <h3>Installation</h3>
    <p>Step-by-step installation guide.</p>
  </section>

  <section id="best-practices">
    <h2>Best Practices</h2>
    <h3>Performance Optimization</h3>
    <p>Tips for optimal performance.</p>
    <h3>Security Considerations</h3>
    <p>Important security guidelines.</p>
  </section>

  <section id="conclusion">
    <h2>Conclusion</h2>
    <p>Summary and next steps.</p>
  </section>
</main>`,

    'FEATURED_SNIPPETS': `<!-- Featured Snippets Optimization -->
<article itemscope itemtype="https://schema.org/Article">
  <h1 itemprop="headline">${scrapedData.title}</h1>

  <!-- Question-Answer Format for Featured Snippets -->
  <section class="qa-section">
    <h2>What is ${scrapedData.title}?</h2>
    <p><strong>Answer:</strong> ${scrapedData.title} is a comprehensive solution that provides users with essential tools and information for optimal results.</p>
  </section>

  <section class="qa-section">
    <h2>How does ${scrapedData.title} work?</h2>
    <p><strong>Answer:</strong> ${scrapedData.title} works by implementing proven methodologies and best practices to deliver consistent, reliable outcomes.</p>
  </section>

  <!-- List Format for Featured Snippets -->
  <section class="list-section">
    <h2>Key Benefits of ${scrapedData.title}:</h2>
    <ol>
      <li><strong>Improved Performance:</strong> Enhanced efficiency and speed</li>
      <li><strong>Better User Experience:</strong> Intuitive and user-friendly interface</li>
      <li><strong>Cost Effective:</strong> Reduced operational costs</li>
      <li><strong>Scalable Solution:</strong> Grows with your needs</li>
    </ol>
  </section>

  <!-- Table Format for Featured Snippets -->
  <section class="table-section">
    <h2>${scrapedData.title} Comparison</h2>
    <table>
      <thead>
        <tr>
          <th>Feature</th>
          <th>Basic</th>
          <th>Premium</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Performance</td>
          <td>Good</td>
          <td>Excellent</td>
        </tr>
        <tr>
          <td>Support</td>
          <td>Email</td>
          <td>24/7 Phone</td>
        </tr>
      </tbody>
    </table>
  </section>
</article>`,

    'VOICE_SEARCH': `<!-- Voice Search Optimization -->
<article>
  <h1>${scrapedData.title}</h1>

  <!-- Natural Language Questions -->
  <section class="voice-optimized">
    <h2>Frequently Asked Questions</h2>

    <div class="faq-item">
      <h3>What is ${scrapedData.title} and how can it help me?</h3>
      <p>${scrapedData.title} is designed to provide comprehensive solutions that help users achieve their goals efficiently and effectively.</p>
    </div>

    <div class="faq-item">
      <h3>How do I get started with ${scrapedData.title}?</h3>
      <p>Getting started with ${scrapedData.title} is simple. First, review the documentation, then follow the step-by-step setup guide, and finally begin with the basic features.</p>
    </div>

    <div class="faq-item">
      <h3>Where can I find more information about ${scrapedData.title}?</h3>
      <p>You can find more information about ${scrapedData.title} in our comprehensive documentation, video tutorials, and community forums.</p>
    </div>

    <div class="faq-item">
      <h3>Why should I choose ${scrapedData.title} over alternatives?</h3>
      <p>${scrapedData.title} offers superior performance, excellent customer support, and proven results that make it the preferred choice for professionals.</p>
    </div>
  </section>

  <!-- Conversational Content -->
  <section class="conversational-content">
    <h2>About ${scrapedData.title}</h2>
    <p>When people ask about ${scrapedData.title}, they're usually looking for a reliable solution that delivers results. That's exactly what ${scrapedData.title} provides - a comprehensive approach that addresses your specific needs.</p>

    <p>Many users wonder if ${scrapedData.title} is right for them. The answer is yes if you're looking for quality, reliability, and excellent support.</p>
  </section>
</article>`,

    'SEMANTIC_HTML': `<!-- Semantic HTML Enhancement -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${scrapedData.title}</title>
</head>
<body>
  <header role="banner">
    <nav role="navigation" aria-label="Main navigation">
      <ul>
        <li><a href="#home">Home</a></li>
        <li><a href="#about">About</a></li>
        <li><a href="#services">Services</a></li>
        <li><a href="#contact">Contact</a></li>
      </ul>
    </nav>
  </header>

  <main role="main">
    <article itemscope itemtype="https://schema.org/Article">
      <header>
        <h1 itemprop="headline">${scrapedData.title}</h1>
        <time itemprop="datePublished" datetime="${new Date().toISOString().split('T')[0]}">
          ${new Date().toLocaleDateString()}
        </time>
      </header>

      <section itemprop="articleBody">
        <h2>Introduction</h2>
        <p>Welcome to our comprehensive guide about ${scrapedData.title}.</p>

        <aside role="complementary" aria-label="Key information">
          <h3>Quick Facts</h3>
          <dl>
            <dt>Category:</dt>
            <dd>Professional Services</dd>
            <dt>Updated:</dt>
            <dd>${new Date().toLocaleDateString()}</dd>
          </dl>
        </aside>
      </section>

      <footer>
        <address itemprop="author">
          <span itemprop="name">SequelAEO Team</span>
        </address>
      </footer>
    </article>
  </main>

  <footer role="contentinfo">
    <p>&copy; ${new Date().getFullYear()} ${scrapedData.title}. All rights reserved.</p>
  </footer>
</body>
</html>`,

    'TECHNICAL_SEO': `<!-- Technical SEO Optimization -->

<!-- 1. Performance Optimization -->
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/css/critical.css" as="style">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="dns-prefetch" href="https://analytics.google.com">

<!-- 2. Mobile Optimization -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#000000">
<link rel="manifest" href="/manifest.json">

<!-- 3. Crawlability -->
<link rel="canonical" href="${scrapedData.url}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
<link rel="sitemap" href="/sitemap.xml">

<!-- 4. Structured Data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "${scrapedData.title}",
  "url": "${scrapedData.url}",
  "description": "${scrapedData.metaDescription || 'Comprehensive information about ' + scrapedData.title}",
  "inLanguage": "en-US",
  "isPartOf": {
    "@type": "WebSite",
    "name": "${scrapedData.title}",
    "url": "${scrapedData.url}"
  }
}
</script>

<!-- 5. Security Headers (implement server-side) -->
<!--
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
-->

<!-- 6. Accessibility -->
<link rel="stylesheet" href="/css/high-contrast.css" media="(prefers-contrast: high)">
<link rel="stylesheet" href="/css/reduced-motion.css" media="(prefers-reduced-motion: reduce)">

<!-- 7. Core Web Vitals Optimization -->
<style>
  /* Critical CSS for above-the-fold content */
  .hero { display: block; }
  .loading { display: none; }
</style>

<!-- 8. Internationalization -->
<link rel="alternate" hreflang="en" href="${scrapedData.url}">
<link rel="alternate" hreflang="x-default" href="${scrapedData.url}">

<!-- 9. Social Media -->
<meta property="og:locale" content="en_US">
<meta name="twitter:dnt" content="on">

<!-- 10. Analytics and Tracking -->
<!-- Implement with proper consent management -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "${scrapedData.url}"
    }
  ]
}
</script>`,

    'ENTITY_OPTIMIZATION': `<!-- Entity Optimization -->
<article itemscope itemtype="https://schema.org/Article">
  <h1 itemprop="headline">${scrapedData.title}</h1>

  <!-- Person Entity -->
  <section>
    <h2>About the Author</h2>
    <div itemscope itemtype="https://schema.org/Person">
      <span itemprop="name">John Smith</span>,
      <span itemprop="jobTitle">Expert in ${scrapedData.title}</span>
      <meta itemprop="url" content="${scrapedData.url}/author/john-smith">
    </div>
  </section>

  <!-- Organization Entity -->
  <section>
    <h2>About Our Company</h2>
    <div itemscope itemtype="https://schema.org/Organization">
      <span itemprop="name">SequelAEO</span>
      <span itemprop="description">Leading provider of ${scrapedData.title} solutions</span>
      <meta itemprop="url" content="${scrapedData.url}">
      <div itemprop="address" itemscope itemtype="https://schema.org/PostalAddress">
        <meta itemprop="addressLocality" content="San Francisco">
        <meta itemprop="addressRegion" content="CA">
      </div>
    </div>
  </section>

  <!-- Product/Service Entity -->
  <section>
    <h2>Our Services</h2>
    <div itemscope itemtype="https://schema.org/Service">
      <span itemprop="name">${scrapedData.title} Consulting</span>
      <span itemprop="description">Professional ${scrapedData.title} services and solutions</span>
      <div itemprop="provider" itemscope itemtype="https://schema.org/Organization">
        <span itemprop="name">SequelAEO</span>
      </div>
    </div>
  </section>

  <!-- Location Entity -->
  <section>
    <h2>Service Areas</h2>
    <div itemscope itemtype="https://schema.org/Place">
      <span itemprop="name">San Francisco Bay Area</span>
      <div itemprop="geo" itemscope itemtype="https://schema.org/GeoCoordinates">
        <meta itemprop="latitude" content="37.7749">
        <meta itemprop="longitude" content="-122.4194">
      </div>
    </div>
  </section>
</article>

<!-- JSON-LD Entity Markup -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": "${scrapedData.url}#author",
      "name": "John Smith",
      "jobTitle": "Expert in ${scrapedData.title}",
      "worksFor": {
        "@id": "${scrapedData.url}#organization"
      }
    },
    {
      "@type": "Organization",
      "@id": "${scrapedData.url}#organization",
      "name": "SequelAEO",
      "url": "${scrapedData.url}",
      "description": "Leading provider of ${scrapedData.title} solutions"
    }
  ]
}
</script>`,

    'KNOWLEDGE_GRAPH': `<!-- Knowledge Graph Optimization -->
<article itemscope itemtype="https://schema.org/Article">
  <header>
    <h1 itemprop="headline">${scrapedData.title}</h1>
    <div itemprop="author" itemscope itemtype="https://schema.org/Person">
      <span itemprop="name">Expert Team</span>
    </div>
    <time itemprop="datePublished" datetime="${new Date().toISOString().split('T')[0]}">
      ${new Date().toLocaleDateString()}
    </time>
  </header>

  <!-- Factual Information Section -->
  <section class="facts-section">
    <h2>Key Facts About ${scrapedData.title}</h2>

    <dl class="fact-list">
      <dt>Definition:</dt>
      <dd>${scrapedData.title} is a comprehensive solution that provides essential tools and methodologies for optimal results.</dd>

      <dt>Primary Use:</dt>
      <dd>Used by professionals and organizations to achieve specific goals and improve performance.</dd>

      <dt>Key Benefits:</dt>
      <dd>Improved efficiency, cost reduction, enhanced user experience, and measurable results.</dd>

      <dt>Industry Applications:</dt>
      <dd>Technology, Business, Marketing, and Professional Services sectors.</dd>
    </dl>
  </section>

  <!-- Statistical Information -->
  <section class="statistics">
    <h2>Statistics and Data</h2>
    <table>
      <caption>Key Performance Metrics</caption>
      <thead>
        <tr>
          <th>Metric</th>
          <th>Value</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Success Rate</td>
          <td>95%</td>
          <td>Internal Studies</td>
        </tr>
        <tr>
          <td>User Satisfaction</td>
          <td>4.8/5</td>
          <td>Customer Reviews</td>
        </tr>
        <tr>
          <td>Implementation Time</td>
          <td>2-4 weeks</td>
          <td>Project Data</td>
        </tr>
      </tbody>
    </table>
  </section>

  <!-- Related Entities -->
  <section class="related-topics">
    <h2>Related Topics</h2>
    <ul>
      <li><a href="/topics/optimization">Optimization Strategies</a></li>
      <li><a href="/topics/implementation">Implementation Best Practices</a></li>
      <li><a href="/topics/measurement">Performance Measurement</a></li>
    </ul>
  </section>

  <!-- Citations and Sources -->
  <section class="sources">
    <h2>Sources and References</h2>
    <ol>
      <li>Industry Research Report 2024 - Professional Standards Institute</li>
      <li>Best Practices Guide - Technology Leadership Council</li>
      <li>Performance Analysis Study - Business Optimization Group</li>
    </ol>
  </section>
</article>

<!-- Knowledge Graph JSON-LD -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${scrapedData.title}",
  "description": "Comprehensive factual information about ${scrapedData.title}",
  "author": {
    "@type": "Organization",
    "name": "SequelAEO"
  },
  "about": [
    {
      "@type": "Thing",
      "name": "${scrapedData.title}",
      "description": "Professional solution for optimization and performance improvement"
    }
  ],
  "mentions": [
    {
      "@type": "Thing",
      "name": "Optimization",
      "sameAs": "https://en.wikipedia.org/wiki/Optimization"
    },
    {
      "@type": "Thing",
      "name": "Performance Improvement",
      "sameAs": "https://en.wikipedia.org/wiki/Performance_improvement"
    }
  ]
}
</script>`
  };

  return {
    title,
    description: `AI-generated ${title} optimized for Answer Engine Optimization`,
    category: fixType,
    fixCode: demoFixes[fixType as keyof typeof demoFixes] || '<!-- Demo fix code -->',
    aiModel: 'SequelAEO Demo (API keys needed for real AI)',
    tokensUsed: 150,
    cost: 0.01
  };
}

// Get analysis
app.get('/api/analysis/:id', (req, res) => {
  const analysis = analyses.find(a => a.id === req.params.id);
  if (!analysis) {
    return res.status(404).json({ error: 'Analysis not found' });
  }

  // Get fixes for this analysis
  const analysisFixes = generatedFixes.filter(f => f.analysisId === req.params.id);

  res.json({ analysis, fixes: analysisFixes });
});

// Get client analyses
app.get('/api/clients/:clientId/analyses', (req, res) => {
  const clientAnalyses = analyses.filter(a => a.clientId === req.params.clientId);
  res.json(clientAnalyses);
});

// Generate fix (mock)
app.post('/api/analysis/:id/generate-fix', (req, res) => {
  try {
    const { category, fixType } = req.body;
    
    const fix = {
      id: uuidv4(),
      analysisId: req.params.id,
      category,
      fixType,
      title: `${category} Optimization`,
      description: `AI-generated fix for ${category} optimization`,
      severity: 'medium',
      fixCode: `<!-- Example ${category} fix -->\n<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "FAQPage"\n}\n</script>`,
      codeLanguage: 'html',
      implementationGuide: 'Add this code to your website\'s <head> section',
      estimatedImpact: 'Expected 15-25% improvement in featured snippet visibility',
      implemented: false,
      aiModel: 'openai-gpt4',
      createdAt: new Date()
    };

    res.status(201).json(fix);
  } catch (error) {
    console.error('Error generating fix:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dashboard stats (mock)
app.get('/api/dashboard/stats', (req, res) => {
  res.json({
    totalClients: clients.length,
    totalAnalyses: analyses.length,
    avgScore: analyses.length > 0 ? 
      analyses.reduce((sum, a) => sum + a.overallScore, 0) / analyses.length : 0,
    recentAnalyses: analyses.slice(-5)
  });
});

// ===== LLM RANKING SIMULATION =====

async function performRealLLMTest(question: string, websiteUrl: string, companyName: string) {
  const results = [];

  // Test ChatGPT (OpenAI)
  if (OPENAI_API_KEY) {
    try {
      const chatgptResult = await testChatGPT(question, companyName);
      results.push(chatgptResult);
    } catch (error) {
      console.error('ChatGPT test failed:', error);
      results.push(createFailedResult('ChatGPT', question));
    }
  } else {
    results.push(createFailedResult('ChatGPT', question, 'API key not configured'));
  }

  // Test Claude (Anthropic)
  if (ANTHROPIC_API_KEY) {
    try {
      const claudeResult = await testClaude(question, companyName);
      results.push(claudeResult);
    } catch (error) {
      console.error('Claude test failed:', error);
      results.push(createFailedResult('Claude', question));
    }
  } else {
    results.push(createFailedResult('Claude', question, 'API key not configured'));
  }

  // Test Perplexity
  if (PERPLEXITY_API_KEY) {
    try {
      const perplexityResult = await testPerplexity(question, companyName);
      results.push(perplexityResult);
    } catch (error) {
      console.error('Perplexity test failed:', error);
      results.push(createFailedResult('Perplexity', question));
    }
  } else {
    results.push(createFailedResult('Perplexity', question, 'API key not configured'));
  }

  // For Gemini and Bing Copilot, we'll simulate for now since we don't have those API keys
  results.push(createSimulatedResult('Gemini', question, companyName));
  results.push(createSimulatedResult('Bing Copilot', question, companyName));

  return results;
}

async function testChatGPT(question: string, companyName: string) {
  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-4-1106-preview',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant. Answer the user\'s question naturally and comprehensively. If you mention specific companies, provide detailed information about them.'
      },
      {
        role: 'user',
        content: question
      }
    ],
    max_tokens: 1000,
    temperature: 0.7
  }, {
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  const responseText = response.data.choices[0]?.message?.content || '';
  console.log(`ChatGPT response for "${question}":`, responseText.substring(0, 500) + '...');
  return analyzeResponse('ChatGPT', question, responseText, companyName);
}

async function testClaude(question: string, companyName: string) {
  const response = await axios.post('https://api.anthropic.com/v1/messages', {
    model: 'claude-3-sonnet-20240229',
    max_tokens: 1000,
    temperature: 0.7,
    messages: [
      {
        role: 'user',
        content: question
      }
    ]
  }, {
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    }
  });

  const responseText = response.data.content[0]?.text || '';
  return analyzeResponse('Claude', question, responseText, companyName);
}

async function testPerplexity(question: string, companyName: string) {
  try {
    const response = await axios.post('https://api.perplexity.ai/chat/completions', {
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [
        {
          role: 'user',
          content: question
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const responseText = response.data.choices[0]?.message?.content || '';
    return analyzeResponse('Perplexity', question, responseText, companyName);
  } catch (error) {
    console.error('Perplexity API error details:', error.response?.data);
    // Try with a different model
    try {
      const response = await axios.post('https://api.perplexity.ai/chat/completions', {
        model: 'sonar-small-chat',
        messages: [
          {
            role: 'user',
            content: question
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const responseText = response.data.choices[0]?.message?.content || '';
      return analyzeResponse('Perplexity', question, responseText, companyName);
    } catch (secondError) {
      console.error('Perplexity second attempt failed:', secondError.response?.data);
      throw secondError;
    }
  }
}

function analyzeResponse(provider: string, question: string, responseText: string, companyName: string) {
  const lowerResponse = responseText.toLowerCase();
  const lowerCompanyName = companyName.toLowerCase();

  // Check if company is mentioned
  const mentioned = lowerResponse.includes(lowerCompanyName);

  if (!mentioned) {
    return {
      id: uuidv4(),
      llmProvider: provider,
      question,
      ranking: 0,
      mentioned: false,
      snippet: '',
      timestamp: new Date().toISOString(),
      score: 0
    };
  }

  // Find the position of the company mention
  const sentences = responseText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  let mentionSentence = '';
  let ranking = 0;

  for (let i = 0; i < sentences.length; i++) {
    if (sentences[i].toLowerCase().includes(lowerCompanyName)) {
      mentionSentence = sentences[i].trim();
      ranking = i + 1; // Position in response (1-based)
      break;
    }
  }

  // Calculate score based on position and context
  const maxSentences = sentences.length;
  const positionScore = Math.max(0, 100 - (ranking / maxSentences) * 50); // Earlier mention = higher score
  const contextScore = mentionSentence.length > 50 ? 20 : 10; // Longer context = higher score
  const score = Math.min(100, Math.round(positionScore + contextScore));

  return {
    id: uuidv4(),
    llmProvider: provider,
    question,
    ranking: Math.min(ranking, 10), // Cap at 10 for display
    mentioned: true,
    snippet: mentionSentence || `${companyName} was mentioned in the response.`,
    timestamp: new Date().toISOString(),
    score
  };
}

function createFailedResult(provider: string, question: string, reason: string = 'API call failed') {
  return {
    id: uuidv4(),
    llmProvider: provider,
    question,
    ranking: 0,
    mentioned: false,
    snippet: `Test failed: ${reason}`,
    timestamp: new Date().toISOString(),
    score: 0
  };
}

function createSimulatedResult(provider: string, question: string, companyName: string) {
  // Temporary simulation for providers we don't have API access to
  const mentioned = Math.random() > 0.4; // 60% chance
  const ranking = mentioned ? Math.floor(Math.random() * 8) + 1 : 0;
  const score = mentioned ? Math.floor(Math.random() * 30) + 70 : 0;

  const snippets = [
    `${companyName} is mentioned as a notable option in this space.`,
    `Based on available information, ${companyName} offers relevant services.`,
    `${companyName} appears to be a recognized provider in their industry.`
  ];

  return {
    id: uuidv4(),
    llmProvider: provider,
    question,
    ranking,
    mentioned,
    snippet: mentioned ? snippets[Math.floor(Math.random() * snippets.length)] : `${provider} API not available - simulated result`,
    timestamp: new Date().toISOString(),
    score
  };
}

// ===== ANALYST BACKDOOR ENDPOINTS =====

// Get all clients for analyst dashboard
app.get('/api/analyst/clients', (req, res) => {
  const enrichedClients = clients.map(client => {
    const clientAnalyses = analyses.filter(a => a.clientId === client.id);
    const avgScore = clientAnalyses.length > 0 ?
      clientAnalyses.reduce((sum, a) => sum + a.overallScore, 0) / clientAnalyses.length : 0;

    return {
      ...client,
      totalAnalyses: clientAnalyses.length,
      avgScore: Math.round(avgScore),
      lastAnalysis: clientAnalyses.length > 0 ?
        clientAnalyses[clientAnalyses.length - 1].createdAt : null
    };
  });

  res.json(enrichedClients);
});

// Get specific client for analyst dashboard
app.get('/api/analyst/clients/:clientId', (req, res) => {
  const client = clients.find(c => c.id === req.params.clientId);
  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }
  res.json(client);
});

// Update client (analyst backdoor)
app.put('/api/analyst/clients/:clientId', (req, res) => {
  const clientIndex = clients.findIndex(c => c.id === req.params.clientId);
  if (clientIndex === -1) {
    return res.status(404).json({ error: 'Client not found' });
  }

  clients[clientIndex] = {
    ...clients[clientIndex],
    ...req.body,
    updatedAt: new Date()
  };

  res.json(clients[clientIndex]);
});

// Get client analyses for analyst dashboard
app.get('/api/analyst/clients/:clientId/analyses', (req, res) => {
  const clientAnalyses = analyses.filter(a => a.clientId === req.params.clientId);
  res.json(clientAnalyses.reverse()); // Most recent first
});

// Get LLM rankings for client
app.get('/api/analyst/clients/:clientId/llm-rankings', (req, res) => {
  const clientRankings = llmRankings.filter(r => r.clientId === req.params.clientId);
  res.json(clientRankings.reverse()); // Most recent first
});

// Run LLM test for client
app.post('/api/analyst/clients/:clientId/llm-test', async (req, res) => {
  const { question, websiteUrl, companyName } = req.body;
  const clientId = req.params.clientId;

  try {
    console.log(`🔍 SequelAEO: Running REAL LLM test for ${companyName}: "${question}"`);

    // Perform real LLM testing with actual API calls
    const testResults = await performRealLLMTest(question, websiteUrl, companyName);

    const llmTest = {
      id: uuidv4(),
      clientId,
      question,
      timestamp: new Date().toISOString(),
      results: testResults
    };

    llmRankings.push(llmTest);
    saveData(RANKINGS_FILE, llmRankings);

    console.log(`✅ SequelAEO: Real LLM test completed for ${companyName}`);
    res.json({ testId: llmTest.id, results: testResults });
  } catch (error) {
    console.error('Error running LLM test:', error);
    res.status(500).json({ error: 'Failed to run LLM test' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 SequelAEO Platform API Server running on port ${PORT}`);
  console.log(`🤖 AI Services: OpenAI GPT-4, Anthropic Claude, Perplexity`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Real website analysis with AI-powered fixes enabled`);
  console.log(`👥 Analyst backdoor dashboard enabled`);
  console.log(`🏆 LLM ranking tracker enabled`);
});
