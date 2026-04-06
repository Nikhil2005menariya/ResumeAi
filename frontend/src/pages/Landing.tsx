import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Target, Zap } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="w-full min-h-screen bg-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">Resume.AI</span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <button 
              onClick={() => navigate('/login')} 
              className="text-gray-700 hover:text-violet-600 font-medium transition-colors"
            >
              Sign In
            </button>
            <button 
              onClick={() => navigate('/login?mode=signup')}
              className="px-6 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Menu */}
          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu Content */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-3">
            <button 
              onClick={() => {
                navigate('/login');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left text-gray-700 hover:text-violet-600 font-medium py-2"
            >
              Sign In
            </button>
            <button 
              onClick={() => {
                navigate('/login?mode=signup');
                setMobileMenuOpen(false);
              }}
              className="block w-full px-6 py-2 bg-violet-600 text-white rounded-lg font-medium text-center"
            >
              Get Started
            </button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="w-full px-6 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight"
          >
            Create Professional Resumes
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <p className="text-3xl md:text-4xl font-bold">
              <span className="text-violet-600">Powered by AI</span>
            </p>
          </motion.div>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed"
          >
            Generate ATS-optimized resumes in seconds. Match jobs automatically. 
            Land interviews faster with intelligent resume optimization.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
          >
            <button 
              onClick={() => navigate('/login?mode=signup')}
              className="px-8 py-3 bg-violet-600 text-white rounded-lg font-semibold text-base hover:bg-violet-700 transition-colors"
            >
              Start Free
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold text-base hover:border-gray-400 transition-colors"
            >
              Sign In
            </button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-sm text-gray-500 pt-2"
          >
            No credit card required · Free forever plan
          </motion.p>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full px-6 py-20 md:py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Sparkles,
                title: "AI-Powered",
                description: "Generate professional resumes instantly with advanced AI technology"
              },
              {
                icon: Target,
                title: "ATS Optimized",
                description: "Beat applicant tracking systems with optimized formatting"
              },
              {
                icon: Zap,
                title: "Job Matching",
                description: "Find and match relevant jobs automatically with smart search"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-8 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center mb-4 flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-violet-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full px-6 py-20 md:py-24">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-gray-900"
          >
            Ready to Get Started?
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-600"
          >
            Join thousands of professionals using Resume.AI
          </motion.p>
          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            onClick={() => navigate('/login?mode=signup')}
            className="inline-block px-8 py-3 bg-violet-600 text-white rounded-lg font-semibold text-base hover:bg-violet-700 transition-colors"
          >
            Create Your Resume
          </motion.button>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-8 px-6 border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-violet-600 rounded flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">Resume.AI</span>
          </div>
          <div className="text-center md:text-right">© 2024 Resume.AI. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
