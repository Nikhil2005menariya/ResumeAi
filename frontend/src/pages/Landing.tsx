import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
import { Menu, X, ArrowRight, CheckCircle2 } from 'lucide-react';
import heroAnimation from '@/assets/animations/hero.json';
import { BrandWordmark } from '@/components/Brand';

export default function Landing() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="w-full min-h-screen overflow-x-hidden">
      <nav className="sticky top-0 z-50 w-full border-b border-white/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <BrandWordmark size="sm" />

          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={() => navigate('/login')} 
              className="dashboard-btn-light h-10 cursor-pointer rounded-md px-4 text-sm font-medium"
            >
              Sign In
            </button>
            <button 
              onClick={() => navigate('/login?mode=signup')}
              className="dashboard-btn-dark inline-flex h-10 cursor-pointer items-center gap-2 rounded-md px-4 text-sm font-semibold"
            >
              Get Started
            </button>
          </div>

          <button 
            className="md:hidden p-2 rounded-md hover:bg-slate-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden border-t border-white/70 bg-white px-6 py-4 space-y-3"
          >
            <button 
              onClick={() => {
                navigate('/login');
                setMobileMenuOpen(false);
              }}
              className="dashboard-btn-light block h-10 w-full cursor-pointer rounded-md px-4 py-2 text-left text-sm font-medium"
            >
              Sign In
            </button>
            <button 
              onClick={() => {
                navigate('/login?mode=signup');
                setMobileMenuOpen(false);
              }}
              className="dashboard-btn-dark block h-10 w-full cursor-pointer rounded-md px-4 py-2 text-center text-sm font-semibold"
            >
              Get Started
            </button>
          </motion.div>
        )}
      </nav>

      <section className="w-full px-6 pb-12 pt-14 md:pt-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700"
            >
              Built for interview outcomes
            </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-extrabold leading-tight text-slate-900 md:text-5xl lg:text-6xl"
          >
            Build role-ready resumes with{' '}
            <span className="brand-gradient">Resum.Ai</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="max-w-xl text-lg leading-relaxed text-slate-600"
          >
            Generate ATS-optimized resumes, refine with AI chat, tailor per job, and PDF and LaTeX in minutes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <button 
              onClick={() => navigate('/login?mode=signup')}
              className="dashboard-btn-dark inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-md px-7 text-base font-semibold"
            >
              Start Building
              <ArrowRight className="h-4 w-4" />
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="dashboard-btn-light h-12 cursor-pointer rounded-md px-7 text-base font-semibold"
            >
              Sign In
            </button>
          </motion.div>

          <div className="grid gap-2 pt-1 text-sm text-slate-600 md:grid-cols-2">
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> ATS-ready output</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Job-fit scoring</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> AI refinement chat</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> PDF + LaTeX export</div>
          </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass-card rounded-3xl p-5"
          >
            <Lottie animationData={heroAnimation} loop className="h-[360px] w-full" />
            <div className="mt-2 rounded-2xl border border-blue-100 bg-white/90 p-4">
              <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Live pipeline</p>
              <p className="mt-1 text-sm text-slate-700">Profile + Projects + Job Description → AI-crafted resume draft with instant preview.</p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="w-full px-6 py-40">
      </section>

      <section className="w-full px-6 pb-16 pt-6">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-white p-1 shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,rgba(0,0,0,0.04)_0px_12px_24px_-18px,#fafafa_0px_0px_0px_1px]">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,_rgba(10,114,239,0.16)_0%,_rgba(10,114,239,0)_70%)]" />
          <div className="pointer-events-none absolute -bottom-20 -left-14 h-56 w-56 rounded-full bg-[radial-gradient(circle,_rgba(222,29,141,0.12)_0%,_rgba(222,29,141,0)_70%)]" />

          <div className="relative rounded-[22px] bg-white/95 px-8 py-12 text-center md:px-14">
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mx-auto max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.03em] text-[#171717] md:text-5xl"
            >
              Ready to launch your next role with confidence?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 }}
              className="mx-auto mt-4 max-w-2xl text-base text-[#4d4d4d] md:text-lg"
            >
              Join professionals using Resum.Ai to ship better resumes with a faster, more reliable workflow.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.16 }}
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <button
                onClick={() => navigate('/login?mode=signup')}
                className="dashboard-btn-dark inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-md px-8 text-base font-semibold"
              >
                Create Your Resume
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="dashboard-btn-light inline-flex h-12 cursor-pointer items-center justify-center rounded-md px-8 text-base font-semibold"
              >
                Sign In
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      <footer className="w-full border-t border-white/70 bg-white/70 px-6 py-7 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-sm text-slate-600 md:flex-row">
          <BrandWordmark size="sm" />
          <div>© 2026 Resum.Ai. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
