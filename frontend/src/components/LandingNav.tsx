import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Menu, X, Sparkles } from 'lucide-react';

export function LandingNav() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-slate-900/80 backdrop-blur-xl border-b border-purple-500/20 shadow-lg' 
          : 'bg-transparent'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Sparkles className="w-6 h-6 text-violet-400" />
            Resume.AI
          </motion.button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <a 
              href="#features" 
              className="text-gray-300 hover:text-white transition-colors"
            >
              Features
            </a>
            <a 
              href="#pricing" 
              className="text-gray-300 hover:text-white transition-colors"
            >
              Pricing
            </a>
            <motion.button
              onClick={() => navigate('/login')}
              className="text-gray-300 hover:text-white transition-colors"
              whileHover={{ scale: 1.05 }}
            >
              Sign In
            </motion.button>
            <motion.button
              onClick={() => navigate('/login?mode=signup')}
              className="px-6 py-2 bg-gradient-to-r from-violet-600 to-purple-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Get Started
            </motion.button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-gray-300 hover:text-white"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="md:hidden bg-slate-900/95 backdrop-blur-xl border-t border-purple-500/20"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 py-6 space-y-4">
              <a 
                href="#features" 
                className="block text-gray-300 hover:text-white transition-colors py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Features
              </a>
              <a 
                href="#pricing" 
                className="block text-gray-300 hover:text-white transition-colors py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Pricing
              </a>
              <button
                onClick={() => {
                  navigate('/login');
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full text-left text-gray-300 hover:text-white transition-colors py-2"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  navigate('/login?mode=signup');
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 rounded-lg font-semibold text-center hover:shadow-lg hover:shadow-purple-500/50 transition-all"
              >
                Get Started
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
