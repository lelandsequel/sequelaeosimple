import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { db } from '../config/database';
import { WebScraper } from '../services/scraper/WebScraper';
import { AEOAnalyzer } from '../services/analyzer/AEOAnalyzer';
import { CodeFixGenerator } from '../services/ai/CodeFixGenerator';
import {
  AnalysisStatus,
  AEOCategory,
  FixType,
  schemas
} from '../types';

const router = express.Router();
const scraper = new WebScraper();
const analyzer = new AEOAnalyzer();
const fixGenerator = new CodeFixGenerator();

/**
 * POST /api/analysis/analyze
 * Perform full AEO analysis on a URL
 */
router.post('/analyze', async (req, res) => {
  try {
    // Validate request
    const validation = schemas.analyzeRequest.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.errors,
      });
    }

    const { url, clientId, options = {} } = validation.data;

    // Check if client exists
    const client = await db('clients').where('id', clientId).first();
    if (!client) {
      return res.status(404).json({
        error: 'Client not found',
      });
    }

    // Create analysis record
    const analysisId = uuidv4();
    await db('analyses').insert({
      id: analysisId,
      client_id: clientId,
      url,
      overall_score: 0,
      category_scores: {},
      status: AnalysisStatus.PENDING,
    });

    // Start analysis asynchronously
    performAnalysis(analysisId, url, clientId, options).catch(error => {
      logger.error('Analysis failed:', { error, analysisId, url });
    });

    res.json({
      analysisId,
      status: AnalysisStatus.PENDING,
      message: 'Analysis started successfully',
    });

  } catch (error) {
    logger.error('Analysis request failed:', error);
    return res.status(500).json({
      error: 'Analysis request failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/analysis/:id
 * Get analysis results
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const analysis = await db('analyses')
      .where('id', id)
      .first();

    if (!analysis) {
      return res.status(404).json({
        error: 'Analysis not found',
      });
    }

    // Get associated fixes
    const fixes = await db('fixes')
      .where('analysis_id', id)
      .orderBy('severity', 'asc')
      .orderBy('estimated_impact', 'desc');

    res.json({
      analysis: {
        id: analysis.id,
        url: analysis.url,
        overallScore: analysis.overall_score,
        categoryScores: analysis.category_scores,
        status: analysis.status,
        createdAt: analysis.created_at,
        updatedAt: analysis.updated_at,
      },
      fixes,
    });

  } catch (error) {
    logger.error('Failed to get analysis:', error);
    return res.status(500).json({
      error: 'Failed to get analysis',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/analysis/:id/fixes
 * Get all fixes for an analysis
 */
router.get('/:id/fixes', async (req, res) => {
  try {
    const { id } = req.params;

    const fixes = await db('fixes')
      .where('analysis_id', id)
      .orderBy('severity', 'asc')
      .orderBy('estimated_impact', 'desc');

    res.json({ fixes });

  } catch (error) {
    logger.error('Failed to get fixes:', error);
    return res.status(500).json({
      error: 'Failed to get fixes',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/analysis/:id/generate-fix
 * Generate a specific fix for an analysis
 */
router.post('/:id/generate-fix', async (req, res) => {
  try {
    const { id } = req.params;
    const { category, fixType } = req.body;

    // Get analysis
    const analysis = await db('analyses').where('id', id).first();
    if (!analysis) {
      return res.status(404).json({
        error: 'Analysis not found',
      });
    }

    if (!analysis.scraped_data) {
      return res.status(400).json({
        error: 'No scraped data available for fix generation',
      });
    }

    // Generate fix
    const fix = await fixGenerator.generateFix({
      analysisId: id,
      category,
      fixType,
      scrapedData: analysis.scraped_data,
      clientId: analysis.client_id,
    });

    // Save fix to database
    await db('fixes').insert({
      id: fix.id,
      analysis_id: id,
      category: fix.category,
      fix_type: fix.fixType,
      title: fix.title,
      description: fix.description,
      fix_code: fix.code,
      language: fix.language,
      severity: fix.severity,
      ai_model_used: 'openai_gpt4', // This should come from the fix generator
      estimated_impact: fix.estimatedImpact,
      implementation_guide: fix.implementationGuide,
    });

    res.json({ fix });

  } catch (error) {
    logger.error('Failed to generate fix:', error);
    return res.status(500).json({
      error: 'Failed to generate fix',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Perform the actual analysis (async function)
 */
async function performAnalysis(
  analysisId: string, 
  url: string, 
  clientId: string, 
  options: any
) {
  try {
    // Update status to in_progress
    await db('analyses')
      .where('id', analysisId)
      .update({ 
        status: AnalysisStatus.IN_PROGRESS,
        updated_at: new Date(),
      });

    // Initialize scraper if needed
    await scraper.initialize();

    // Scrape the webpage
    logger.info('Starting web scraping:', { url, analysisId });
    const scrapedData = await scraper.scrapeUrl(url);

    // Perform AEO analysis
    logger.info('Starting AEO analysis:', { url, analysisId });
    const analysisResult = await analyzer.analyzeWebpage(scrapedData, {
      quick: options.quick || false,
      categories: options.categories,
      includeRecommendations: true,
    });

    // Update analysis with results
    await db('analyses')
      .where('id', analysisId)
      .update({
        overall_score: analysisResult.overallScore,
        category_scores: analysisResult.categoryScores,
        scraped_data: scrapedData,
        status: AnalysisStatus.COMPLETED,
        updated_at: new Date(),
      });

    // Generate fixes for critical and high severity issues
    const criticalCategories = Object.entries(analysisResult.categoryScores)
      .filter(([_, score]) => (score as number) < 60)
      .map(([category, _]) => category as AEOCategory);

    for (const category of criticalCategories.slice(0, 3)) { // Limit to 3 categories
      try {
        const fixes = await fixGenerator.generateCategoryFixes(
          analysisId,
          category,
          scrapedData,
          clientId
        );

        // Save fixes to database
        for (const fix of fixes) {
          await db('fixes').insert({
            id: fix.id,
            analysis_id: analysisId,
            category: fix.category,
            fix_type: fix.fixType,
            title: fix.title,
            description: fix.description,
            fix_code: fix.code,
            language: fix.language,
            severity: fix.severity,
            ai_model_used: 'openai_gpt4',
            estimated_impact: fix.estimatedImpact,
            implementation_guide: fix.implementationGuide,
          });
        }
      } catch (error) {
        logger.error(`Failed to generate fixes for ${category}:`, error);
      }
    }

    logger.info('Analysis completed successfully:', { 
      analysisId, 
      url, 
      overallScore: analysisResult.overallScore 
    });

  } catch (error) {
    logger.error('Analysis failed:', { error, analysisId, url });
    
    // Update analysis with error
    await db('analyses')
      .where('id', analysisId)
      .update({
        status: AnalysisStatus.FAILED,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date(),
      });
  } finally {
    // Clean up scraper
    await scraper.close();
  }
}

export default router;
