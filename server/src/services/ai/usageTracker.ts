import { AIModel } from '@aeo-platform/shared';
import { logger } from '../../utils/logger';
import { db } from '../../config/database';

export interface UsageRecord {
  clientId: string;
  model: AIModel;
  tokensUsed: number;
  cost: number;
  endpoint: string;
}

export interface UsageStats {
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  averageTokensPerRequest: number;
  costByModel: Record<AIModel, number>;
}

export class AIUsageTracker {
  /**
   * Track AI API usage for billing and monitoring
   */
  async trackUsage(usage: UsageRecord): Promise<void> {
    try {
      await db('api_usage').insert({
        client_id: usage.clientId,
        api_service: usage.model,
        tokens_used: usage.tokensUsed,
        cost: usage.cost,
        endpoint: usage.endpoint,
        created_at: new Date(),
      });

      logger.info('AI usage tracked:', {
        clientId: usage.clientId,
        model: usage.model,
        tokensUsed: usage.tokensUsed,
        cost: usage.cost,
      });
    } catch (error) {
      logger.error('Failed to track AI usage:', { error, usage });
      throw error;
    }
  }

  /**
   * Get usage statistics for a client
   */
  async getClientUsage(
    clientId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<UsageStats> {
    try {
      let query = db('api_usage').where('client_id', clientId);

      if (startDate) {
        query = query.where('created_at', '>=', startDate);
      }

      if (endDate) {
        query = query.where('created_at', '<=', endDate);
      }

      const records = await query.select('*');

      const stats: UsageStats = {
        totalTokens: 0,
        totalCost: 0,
        requestCount: records.length,
        averageTokensPerRequest: 0,
        costByModel: {
          [AIModel.OPENAI_GPT4]: 0,
          [AIModel.ANTHROPIC_CLAUDE]: 0,
          [AIModel.PERPLEXITY]: 0,
        },
      };

      for (const record of records) {
        stats.totalTokens += record.tokens_used;
        stats.totalCost += record.cost;
        stats.costByModel[record.api_service as AIModel] += record.cost;
      }

      stats.averageTokensPerRequest = stats.requestCount > 0 
        ? stats.totalTokens / stats.requestCount 
        : 0;

      return stats;
    } catch (error) {
      logger.error('Failed to get client usage:', { error, clientId });
      throw error;
    }
  }

  /**
   * Get usage statistics for all clients
   */
  async getGlobalUsage(startDate?: Date, endDate?: Date): Promise<UsageStats> {
    try {
      let query = db('api_usage');

      if (startDate) {
        query = query.where('created_at', '>=', startDate);
      }

      if (endDate) {
        query = query.where('created_at', '<=', endDate);
      }

      const records = await query.select('*');

      const stats: UsageStats = {
        totalTokens: 0,
        totalCost: 0,
        requestCount: records.length,
        averageTokensPerRequest: 0,
        costByModel: {
          [AIModel.OPENAI_GPT4]: 0,
          [AIModel.ANTHROPIC_CLAUDE]: 0,
          [AIModel.PERPLEXITY]: 0,
        },
      };

      for (const record of records) {
        stats.totalTokens += record.tokens_used;
        stats.totalCost += record.cost;
        stats.costByModel[record.api_service as AIModel] += record.cost;
      }

      stats.averageTokensPerRequest = stats.requestCount > 0 
        ? stats.totalTokens / stats.requestCount 
        : 0;

      return stats;
    } catch (error) {
      logger.error('Failed to get global usage:', { error });
      throw error;
    }
  }

  /**
   * Check if client has exceeded usage limits
   */
  async checkUsageLimits(clientId: string): Promise<{
    withinLimits: boolean;
    currentUsage: number;
    limit: number;
    resetDate: Date;
  }> {
    try {
      // Get client's current plan limits
      const client = await db('clients')
        .where('id', clientId)
        .first();

      if (!client) {
        throw new Error('Client not found');
      }

      const limit = client.api_credits || 1000; // Default limit
      
      // Get current month usage
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const currentUsage = await db('api_usage')
        .where('client_id', clientId)
        .where('created_at', '>=', startOfMonth)
        .sum('tokens_used as total')
        .first();

      const totalUsage = currentUsage?.total || 0;

      // Calculate reset date (first day of next month)
      const resetDate = new Date(startOfMonth);
      resetDate.setMonth(resetDate.getMonth() + 1);

      return {
        withinLimits: totalUsage < limit,
        currentUsage: totalUsage,
        limit,
        resetDate,
      };
    } catch (error) {
      logger.error('Failed to check usage limits:', { error, clientId });
      throw error;
    }
  }

  /**
   * Get top clients by usage
   */
  async getTopClientsByUsage(limit: number = 10): Promise<Array<{
    clientId: string;
    companyName: string;
    totalTokens: number;
    totalCost: number;
    requestCount: number;
  }>> {
    try {
      const results = await db('api_usage')
        .join('clients', 'api_usage.client_id', 'clients.id')
        .select(
          'clients.id as clientId',
          'clients.company_name as companyName'
        )
        .sum('api_usage.tokens_used as totalTokens')
        .sum('api_usage.cost as totalCost')
        .count('api_usage.id as requestCount')
        .groupBy('clients.id', 'clients.company_name')
        .orderBy('totalTokens', 'desc')
        .limit(limit);

      return results.map(row => ({
        clientId: row.clientId,
        companyName: row.companyName,
        totalTokens: parseInt(row.totalTokens) || 0,
        totalCost: parseFloat(row.totalCost) || 0,
        requestCount: parseInt(row.requestCount) || 0,
      }));
    } catch (error) {
      logger.error('Failed to get top clients by usage:', { error });
      throw error;
    }
  }

  /**
   * Get usage trends over time
   */
  async getUsageTrends(
    clientId?: string,
    days: number = 30
  ): Promise<Array<{
    date: string;
    tokens: number;
    cost: number;
    requests: number;
  }>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = db('api_usage')
        .select(
          db.raw('DATE(created_at) as date'),
          db.raw('SUM(tokens_used) as tokens'),
          db.raw('SUM(cost) as cost'),
          db.raw('COUNT(*) as requests')
        )
        .where('created_at', '>=', startDate)
        .groupBy(db.raw('DATE(created_at)'))
        .orderBy('date', 'asc');

      if (clientId) {
        query = query.where('client_id', clientId);
      }

      const results = await query;

      return results.map(row => ({
        date: row.date,
        tokens: parseInt(row.tokens) || 0,
        cost: parseFloat(row.cost) || 0,
        requests: parseInt(row.requests) || 0,
      }));
    } catch (error) {
      logger.error('Failed to get usage trends:', { error });
      throw error;
    }
  }

  /**
   * Clean up old usage records
   */
  async cleanupOldRecords(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deletedCount = await db('api_usage')
        .where('created_at', '<', cutoffDate)
        .del();

      logger.info(`Cleaned up ${deletedCount} old usage records`);
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old records:', { error });
      throw error;
    }
  }
}
