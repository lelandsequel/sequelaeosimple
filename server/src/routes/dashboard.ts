import express from 'express';
import { logger } from '../utils/logger';
import { db } from '../config/database';

const router = express.Router();

/**
 * GET /api/dashboard/:clientId
 * Get dashboard data for a client
 */
router.get('/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;

    // Check if client exists
    const client = await db('clients').where('id', clientId).first();
    if (!client) {
      return res.status(404).json({
        error: 'Client not found',
      });
    }

    // Get recent analyses
    const recentAnalyses = await db('analyses')
      .where('client_id', clientId)
      .orderBy('created_at', 'desc')
      .limit(5)
      .select('id', 'url', 'overall_score', 'status', 'created_at');

    // Get fix statistics
    const fixStats = await db('fixes')
      .join('analyses', 'fixes.analysis_id', 'analyses.id')
      .where('analyses.client_id', clientId)
      .select(
        db.raw('COUNT(*) as total_fixes'),
        db.raw('COUNT(CASE WHEN fixes.implemented = true THEN 1 END) as implemented_fixes')
      )
      .first();

    // Get average score
    const avgScore = await db('analyses')
      .where('client_id', clientId)
      .where('status', 'completed')
      .avg('overall_score as avg_score')
      .first();

    // Get score history (last 30 days)
    const scoreHistory = await db('analyses')
      .where('client_id', clientId)
      .where('status', 'completed')
      .where('created_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
      .orderBy('created_at', 'asc')
      .select('overall_score as score', 'created_at as date');

    // Get top issues by category
    const topIssues = await db('fixes')
      .join('analyses', 'fixes.analysis_id', 'analyses.id')
      .where('analyses.client_id', clientId)
      .where('fixes.implemented', false)
      .select('fixes.category', 'fixes.severity')
      .count('* as fix_count')
      .groupBy('fixes.category', 'fixes.severity')
      .orderBy('fix_count', 'desc')
      .limit(5);

    const dashboardData = {
      client: {
        id: client.id,
        companyName: client.company_name,
        websiteUrl: client.website_url,
        apiCredits: client.api_credits,
      },
      recentAnalyses,
      totalFixes: parseInt(fixStats?.total_fixes || '0'),
      implementedFixes: parseInt(fixStats?.implemented_fixes || '0'),
      averageScore: Math.round(parseFloat(avgScore?.avg_score || '0')),
      scoreHistory: scoreHistory.map(item => ({
        date: item.date,
        score: item.score,
      })),
      topIssues: topIssues.map(item => ({
        category: item.category,
        severity: item.severity,
        fixCount: parseInt(item.fix_count),
      })),
    };

    res.json(dashboardData);

  } catch (error) {
    logger.error('Failed to get dashboard data:', error);
    res.status(500).json({
      error: 'Failed to get dashboard data',
      message: error.message,
    });
  }
});

/**
 * GET /api/dashboard/:clientId/stats
 * Get detailed statistics for a client
 */
router.get('/:clientId/stats', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { days = 30 } = req.query;

    // Get analysis stats
    const analysisStats = await db('analyses')
      .where('client_id', clientId)
      .where('created_at', '>=', db.raw(`NOW() - INTERVAL '${days} days'`))
      .select(
        db.raw('COUNT(*) as total_analyses'),
        db.raw('COUNT(CASE WHEN status = \'completed\' THEN 1 END) as completed_analyses'),
        db.raw('AVG(CASE WHEN status = \'completed\' THEN overall_score END) as avg_score')
      )
      .first();

    // Get category performance
    const categoryPerformance = await db('analyses')
      .where('client_id', clientId)
      .where('status', 'completed')
      .where('created_at', '>=', db.raw(`NOW() - INTERVAL '${days} days'`))
      .select(db.raw(`
        AVG((category_scores->>'faqSchema')::int) as faq_schema_avg,
        AVG((category_scores->>'schemaMarkup')::int) as schema_markup_avg,
        AVG((category_scores->>'contentStructure')::int) as content_structure_avg,
        AVG((category_scores->>'featuredSnippets')::int) as featured_snippets_avg,
        AVG((category_scores->>'entityOptimization')::int) as entity_optimization_avg,
        AVG((category_scores->>'metaTags')::int) as meta_tags_avg,
        AVG((category_scores->>'semanticHtml')::int) as semantic_html_avg,
        AVG((category_scores->>'voiceSearch')::int) as voice_search_avg,
        AVG((category_scores->>'knowledgeGraph')::int) as knowledge_graph_avg,
        AVG((category_scores->>'technicalSeo')::int) as technical_seo_avg
      `))
      .first();

    // Get implementation rate
    const implementationStats = await db('fixes')
      .join('analyses', 'fixes.analysis_id', 'analyses.id')
      .where('analyses.client_id', clientId)
      .where('fixes.created_at', '>=', db.raw(`NOW() - INTERVAL '${days} days'`))
      .select(
        db.raw('COUNT(*) as total_fixes'),
        db.raw('COUNT(CASE WHEN fixes.implemented = true THEN 1 END) as implemented_fixes'),
        db.raw('COUNT(CASE WHEN fixes.severity = \'critical\' THEN 1 END) as critical_fixes'),
        db.raw('COUNT(CASE WHEN fixes.severity = \'high\' THEN 1 END) as high_fixes')
      )
      .first();

    const stats = {
      period: `${days} days`,
      analyses: {
        total: parseInt(analysisStats?.total_analyses || '0'),
        completed: parseInt(analysisStats?.completed_analyses || '0'),
        averageScore: Math.round(parseFloat(analysisStats?.avg_score || '0')),
      },
      categoryPerformance: {
        faqSchema: Math.round(parseFloat(categoryPerformance?.faq_schema_avg || '0')),
        schemaMarkup: Math.round(parseFloat(categoryPerformance?.schema_markup_avg || '0')),
        contentStructure: Math.round(parseFloat(categoryPerformance?.content_structure_avg || '0')),
        featuredSnippets: Math.round(parseFloat(categoryPerformance?.featured_snippets_avg || '0')),
        entityOptimization: Math.round(parseFloat(categoryPerformance?.entity_optimization_avg || '0')),
        metaTags: Math.round(parseFloat(categoryPerformance?.meta_tags_avg || '0')),
        semanticHtml: Math.round(parseFloat(categoryPerformance?.semantic_html_avg || '0')),
        voiceSearch: Math.round(parseFloat(categoryPerformance?.voice_search_avg || '0')),
        knowledgeGraph: Math.round(parseFloat(categoryPerformance?.knowledge_graph_avg || '0')),
        technicalSeo: Math.round(parseFloat(categoryPerformance?.technical_seo_avg || '0')),
      },
      fixes: {
        total: parseInt(implementationStats?.total_fixes || '0'),
        implemented: parseInt(implementationStats?.implemented_fixes || '0'),
        critical: parseInt(implementationStats?.critical_fixes || '0'),
        high: parseInt(implementationStats?.high_fixes || '0'),
        implementationRate: implementationStats?.total_fixes > 0 
          ? Math.round((implementationStats.implemented_fixes / implementationStats.total_fixes) * 100)
          : 0,
      },
    };

    res.json(stats);

  } catch (error) {
    logger.error('Failed to get dashboard stats:', error);
    res.status(500).json({
      error: 'Failed to get dashboard stats',
      message: error.message,
    });
  }
});

export default router;
