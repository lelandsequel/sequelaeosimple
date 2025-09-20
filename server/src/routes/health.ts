import express from 'express';
import { logger } from '../utils/logger';
import { db } from '../config/database';
import { AIServiceManager } from '../services/ai/AIServiceManager';
import { WebScraper } from '../services/scraper/WebScraper';
import { AEOAnalyzer } from '../services/analyzer/AEOAnalyzer';

const router = express.Router();

/**
 * GET /api/health
 * Basic health check
 */
router.get('/', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };

    res.json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

/**
 * GET /api/health/detailed
 * Detailed health check including all services
 */
router.get('/detailed', async (req, res) => {
  try {
    const health: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {},
    };

    // Check database
    try {
      await db.raw('SELECT 1');
      health.services.database = { status: 'healthy' };
    } catch (error) {
      health.services.database = { 
        status: 'unhealthy', 
        error: error.message 
      };
      health.status = 'degraded';
    }

    // Check AI services
    try {
      const aiService = new AIServiceManager();
      const aiHealth = await aiService.healthCheck();
      health.services.ai = {
        status: Object.values(aiHealth).every(Boolean) ? 'healthy' : 'degraded',
        details: aiHealth,
      };
      
      if (health.services.ai.status === 'degraded') {
        health.status = 'degraded';
      }
    } catch (error) {
      health.services.ai = { 
        status: 'unhealthy', 
        error: error.message 
      };
      health.status = 'degraded';
    }

    // Check web scraper
    try {
      const scraper = new WebScraper();
      const scraperHealthy = await scraper.healthCheck();
      health.services.scraper = { 
        status: scraperHealthy ? 'healthy' : 'unhealthy' 
      };
      
      if (!scraperHealthy) {
        health.status = 'degraded';
      }
      
      await scraper.close();
    } catch (error) {
      health.services.scraper = { 
        status: 'unhealthy', 
        error: error.message 
      };
      health.status = 'degraded';
    }

    // Check analyzer
    try {
      const analyzer = new AEOAnalyzer();
      const analyzerHealth = await analyzer.getHealthStatus();
      const allAnalyzersHealthy = Object.values(analyzerHealth).every(Boolean);
      
      health.services.analyzer = {
        status: allAnalyzersHealthy ? 'healthy' : 'degraded',
        details: analyzerHealth,
      };
      
      if (!allAnalyzersHealthy) {
        health.status = 'degraded';
      }
    } catch (error) {
      health.services.analyzer = { 
        status: 'unhealthy', 
        error: error.message 
      };
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);

  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/health/database
 * Database-specific health check
 */
router.get('/database', async (req, res) => {
  try {
    const start = Date.now();
    await db.raw('SELECT 1');
    const responseTime = Date.now() - start;

    // Get database stats
    const stats = await db.raw(`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
    `);

    res.json({
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      tables: stats.rows,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Database health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/health/ai
 * AI services health check
 */
router.get('/ai', async (req, res) => {
  try {
    const aiService = new AIServiceManager();
    const aiHealth = await aiService.healthCheck();

    const allHealthy = Object.values(aiHealth).every(Boolean);

    res.json({
      status: allHealthy ? 'healthy' : 'degraded',
      services: aiHealth,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('AI health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
