import express from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { db } from '../config/database';
import { generatePin } from '@aeo-platform/shared';
import { schemas } from '../types';

const router = express.Router();

/**
 * POST /api/clients
 * Create a new client account
 */
router.post('/', async (req, res) => {
  try {
    // Validate request
    const validation = schemas.createClient.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.errors,
      });
    }

    const { companyName, websiteUrl, contactEmail } = validation.data;

    // Check if client already exists
    const existingClient = await db('clients')
      .where('website_url', websiteUrl)
      .first();

    if (existingClient) {
      return res.status(409).json({
        error: 'Client already exists',
        message: 'A client with this website URL already exists',
      });
    }

    // Generate PIN and hash it
    const pin = generatePin();
    const pinHash = await bcrypt.hash(pin, 12);

    // Create client
    const clientId = uuidv4();
    await db('clients').insert({
      id: clientId,
      company_name: companyName,
      website_url: websiteUrl,
      pin_hash: pinHash,
      contact_email: contactEmail,
      api_credits: 1000, // Default credits
    });

    logger.info('New client created:', { 
      clientId, 
      companyName, 
      websiteUrl 
    });

    res.status(201).json({
      clientId,
      companyName,
      websiteUrl,
      pin, // Return PIN only once during creation
      apiCredits: 1000,
      message: 'Client created successfully. Please save your PIN securely.',
    });

  } catch (error) {
    logger.error('Failed to create client:', error);
    res.status(500).json({
      error: 'Failed to create client',
      message: error.message,
    });
  }
});

/**
 * POST /api/clients/auth
 * Authenticate client with PIN
 */
router.post('/auth', async (req, res) => {
  try {
    // Validate request
    const validation = schemas.pinAuth.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.errors,
      });
    }

    const { pin, clientId } = validation.data;

    // Find client
    let client;
    if (clientId) {
      client = await db('clients').where('id', clientId).first();
    } else {
      // If no clientId provided, we'd need additional identifier
      return res.status(400).json({
        error: 'Client ID required',
      });
    }

    if (!client) {
      return res.status(404).json({
        error: 'Client not found',
      });
    }

    // Verify PIN
    const isValidPin = await bcrypt.compare(pin, client.pin_hash);
    if (!isValidPin) {
      return res.status(401).json({
        error: 'Invalid PIN',
      });
    }

    // Check if client is active
    if (!client.is_active) {
      return res.status(403).json({
        error: 'Account deactivated',
      });
    }

    logger.info('Client authenticated:', { clientId: client.id });

    res.json({
      clientId: client.id,
      companyName: client.company_name,
      websiteUrl: client.website_url,
      apiCredits: client.api_credits,
      authenticated: true,
    });

  } catch (error) {
    logger.error('Authentication failed:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/clients/:id
 * Get client information
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const client = await db('clients')
      .where('id', id)
      .select('id', 'company_name', 'website_url', 'api_credits', 'is_active', 'created_at')
      .first();

    if (!client) {
      return res.status(404).json({
        error: 'Client not found',
      });
    }

    res.json({
      clientId: client.id,
      companyName: client.company_name,
      websiteUrl: client.website_url,
      apiCredits: client.api_credits,
      isActive: client.is_active,
      createdAt: client.created_at,
    });

  } catch (error) {
    logger.error('Failed to get client:', error);
    res.status(500).json({
      error: 'Failed to get client',
      message: error.message,
    });
  }
});

/**
 * PUT /api/clients/:id
 * Update client information
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { companyName, contactEmail } = req.body;

    // Check if client exists
    const client = await db('clients').where('id', id).first();
    if (!client) {
      return res.status(404).json({
        error: 'Client not found',
      });
    }

    // Update client
    const updateData: any = { updated_at: new Date() };
    if (companyName) updateData.company_name = companyName;
    if (contactEmail) updateData.contact_email = contactEmail;

    await db('clients')
      .where('id', id)
      .update(updateData);

    logger.info('Client updated:', { clientId: id });

    res.json({
      message: 'Client updated successfully',
    });

  } catch (error) {
    logger.error('Failed to update client:', error);
    res.status(500).json({
      error: 'Failed to update client',
      message: error.message,
    });
  }
});

/**
 * GET /api/clients/:id/analyses
 * Get client's analysis history
 */
router.get('/:id/analyses', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    // Check if client exists
    const client = await db('clients').where('id', id).first();
    if (!client) {
      return res.status(404).json({
        error: 'Client not found',
      });
    }

    // Get analyses
    const analyses = await db('analyses')
      .where('client_id', id)
      .orderBy('created_at', 'desc')
      .limit(Number(limit))
      .offset(Number(offset))
      .select('id', 'url', 'overall_score', 'status', 'created_at');

    // Get total count
    const totalCount = await db('analyses')
      .where('client_id', id)
      .count('id as count')
      .first();

    res.json({
      analyses,
      pagination: {
        total: Number(totalCount?.count || 0),
        limit: Number(limit),
        offset: Number(offset),
      },
    });

  } catch (error) {
    logger.error('Failed to get client analyses:', error);
    res.status(500).json({
      error: 'Failed to get analyses',
      message: error.message,
    });
  }
});

export default router;
