import { Link } from 'react-router-dom'
import { 
  Search, 
  Zap, 
  Code, 
  BarChart3, 
  CheckCircle, 
  ArrowRight,
  Sparkles,
  Target,
  Cpu
} from 'lucide-react'

export default function HomePage() {
  const features = [
    {
      icon: Search,
      title: 'Comprehensive AEO Analysis',
      description: 'Analyze 10 key categories including FAQ schema, meta tags, content structure, and technical SEO.',
    },
    {
      icon: Cpu,
      title: 'AI-Powered Code Generation',
      description: 'Get production-ready fixes using OpenAI, Claude, and Perplexity APIs for immediate implementation.',
    },
    {
      icon: Code,
      title: 'One-Click Implementation',
      description: 'Copy and paste generated code directly into your website with detailed implementation guides.',
    },
    {
      icon: BarChart3,
      title: 'Performance Tracking',
      description: 'Monitor your AEO score improvements and track implementation success over time.',
    },
  ]

  const categories = [
    'FAQ Schema Generation',
    'Schema Markup Suite',
    'AI-Optimized Content Structure',
    'Featured Snippet Optimization',
    'Entity & Keyword Optimization',
    'Meta & Open Graph Tags',
    'Semantic HTML Enhancement',
    'Voice Search Optimization',
    'Knowledge Graph Enhancement',
    'Technical SEO for AI Crawlers',
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Sparkles className="w-8 h-8 text-primary-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">SequelAEO</h1>
            </div>
            <div className="flex space-x-4">
              <Link
                to="/analyst"
                className="btn btn-secondary"
              >
                Analyst Portal
              </Link>
              <Link
                to="/client/login"
                className="btn btn-primary"
              >
                Client Login
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-primary-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              SequelAEO
              <span className="text-primary-600"> Platform</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Advanced AI-powered Answer Engine Optimization platform that analyzes your website with
              real-time intelligence and provides production-ready code fixes using GPT-4, Claude, and Perplexity.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/analyst"
                className="btn btn-primary text-lg px-8 py-3"
              >
                Start Analysis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link
                to="/client/login"
                className="btn btn-secondary text-lg px-8 py-3"
              >
                Client Portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Powerful AEO Analysis & Optimization
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our platform combines advanced AI with comprehensive analysis to optimize 
              your content for the next generation of search engines.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="text-center">
                  <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* AEO Categories */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              10 AEO Categories Analyzed
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Comprehensive analysis across all critical areas of Answer Engine Optimization
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category, index) => (
              <div key={index} className="flex items-center bg-white p-4 rounded-lg shadow-sm">
                <CheckCircle className="w-5 h-5 text-success-600 mr-3 flex-shrink-0" />
                <span className="text-gray-900 font-medium">{category}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-600 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Optimize for AI Search?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Get started with our comprehensive AEO analysis and receive 
            AI-generated code fixes that you can implement immediately.
          </p>
          <Link
            to="/analyst"
            className="btn bg-white text-primary-600 hover:bg-gray-100 text-lg px-8 py-3"
          >
            Start Your Analysis
            <Target className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-primary-400 mr-2" />
              <span className="text-xl font-bold text-white">AEO Platform</span>
            </div>
            <p className="text-gray-400">
              © 2024 AEO Platform. Optimizing for the future of search.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
