# AEO Platform Setup Guide

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Git

## Environment Setup

1. **Clone and navigate to the project:**
   ```bash
   cd SequelSimpleAEO
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:
   ```env
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/aeo_platform
   
   # AI Services
   OPENAI_API_KEY=your_openai_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   PERPLEXITY_API_KEY=your_perplexity_api_key
   
   # Server
   PORT=3001
   NODE_ENV=development
   
   # CORS
   CORS_ORIGIN=http://localhost:3000
   
   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   
   # Security
   JWT_SECRET=your_jwt_secret_key
   BCRYPT_ROUNDS=12
   ```

4. **Set up PostgreSQL database:**
   ```bash
   createdb aeo_platform
   ```

5. **Run database migrations:**
   ```bash
   npm run db:migrate
   ```

6. **Seed the database (optional):**
   ```bash
   npm run db:seed
   ```

## Development

1. **Start the development servers:**
   ```bash
   npm run dev
   ```

   This starts both the backend (port 3001) and frontend (port 3000) concurrently.

2. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - API Health Check: http://localhost:3001/api/health

## API Keys Setup

### OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Add it to your `.env` file as `OPENAI_API_KEY`

### Anthropic Claude API Key
1. Go to https://console.anthropic.com/
2. Create an API key
3. Add it to your `.env` file as `ANTHROPIC_API_KEY`

### Perplexity API Key
1. Go to https://www.perplexity.ai/settings/api
2. Generate an API key
3. Add it to your `.env` file as `PERPLEXITY_API_KEY`

## Usage Guide

### For Analysts

1. **Access the Analyst Portal:**
   - Go to http://localhost:3000/analyst
   - No authentication required for analysts

2. **Create a Client:**
   - Fill in company name, website URL, and optional contact email
   - System generates a unique Client ID and 6-digit PIN
   - Save these credentials securely - the PIN cannot be recovered

3. **Run Analysis:**
   - Switch to the "Run Analysis" tab
   - Enter the URL to analyze
   - Choose quick analysis for faster results or full analysis for comprehensive review
   - Analysis runs automatically and generates AI-powered fixes

### For Clients

1. **Login to Client Portal:**
   - Go to http://localhost:3000/client/login
   - Enter your Client ID and 6-digit PIN provided by your analyst

2. **View Dashboard:**
   - See your overall AEO score and recent analyses
   - Track implementation progress
   - View top issues that need attention

3. **Access Analysis Results:**
   - View detailed analysis results with category scores
   - Copy production-ready code fixes
   - Mark fixes as implemented when complete

## Project Structure

```
SequelSimpleAEO/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── contexts/       # React contexts
│   │   └── utils/          # Utility functions
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   ├── config/         # Configuration
│   │   └── utils/          # Utility functions
├── shared/                 # Shared TypeScript types
├── database/               # Database migrations and seeds
└── docs/                   # Documentation
```

## Key Features

### AEO Analysis Categories
1. **FAQ Schema Generation** - Structured data for Q&A content
2. **Schema Markup Suite** - Rich snippets and structured data
3. **Content Structure** - Optimized heading hierarchy and content organization
4. **Featured Snippets** - Content formatted for featured snippet capture
5. **Entity Optimization** - Named entity recognition and optimization
6. **Meta Tags** - Title, description, and Open Graph optimization
7. **Semantic HTML** - Proper HTML5 semantic structure
8. **Voice Search** - Natural language and conversational optimization
9. **Knowledge Graph** - Entity relationships and knowledge panel optimization
10. **Technical SEO** - Core Web Vitals, performance, and crawlability

### AI-Powered Code Generation
- **Multi-Model Approach**: Uses OpenAI GPT-4, Anthropic Claude, and Perplexity APIs
- **Production-Ready Code**: Generates immediately implementable fixes
- **Multiple Formats**: JSON-LD, HTML, CSS, JavaScript, and Markdown
- **Implementation Guides**: Step-by-step instructions for each fix

### Security Features
- **PIN-Based Authentication**: Secure 6-digit PIN system for clients
- **Rate Limiting**: API protection against abuse
- **Input Validation**: Comprehensive validation using Zod schemas
- **Secure Headers**: Helmet.js for security headers

## Troubleshooting

### Common Issues

1. **Database Connection Error:**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in .env file
   - Verify database exists and user has permissions

2. **API Key Errors:**
   - Verify all AI service API keys are valid
   - Check API key permissions and quotas
   - Ensure keys are properly set in .env file

3. **Port Conflicts:**
   - Default ports are 3000 (frontend) and 3001 (backend)
   - Change ports in package.json scripts if needed

4. **CORS Issues:**
   - Ensure CORS_ORIGIN matches your frontend URL
   - Check that both servers are running

### Logs and Debugging

- Server logs are written to `logs/` directory
- Use `npm run dev` for development with hot reload
- Check browser console for frontend errors
- API health check: http://localhost:3001/api/health/detailed

## Production Deployment

1. **Build the frontend:**
   ```bash
   npm run build:client
   ```

2. **Set production environment variables**

3. **Run database migrations in production:**
   ```bash
   NODE_ENV=production npm run db:migrate
   ```

4. **Start the production server:**
   ```bash
   npm run start:server
   ```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the API documentation at `/api/health/detailed`
3. Check application logs in the `logs/` directory
