import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
import { Sparkles, Target, Zap, Menu, X, ArrowRight, CheckCircle2, CarFront } from 'lucide-react';
import heroAnimation from '@/assets/animations/hero.json';
import { Brand } from '@/components/Brand';

export default function Landing() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="w-full min-h-screen overflow-x-hidden">
      <nav className="sticky top-0 z-50 w-full border-b border-white/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Brand size="sm" />

          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={() => navigate('/login')} 
              className="cursor-pointer rounded-lg px-3 py-2 text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              Sign In
            </button>
            <button 
              onClick={() => navigate('/login?mode=signup')}
              className="btn-liquid btn-runway cursor-pointer rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-all duration-200 hover:brightness-105"
            >
              Get Started
              <CarFront aria-hidden="true" className="btn-runner h-4 w-4" />
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
              className="block w-full cursor-pointer rounded-lg py-2 text-left text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              Sign In
            </button>
            <button 
              onClick={() => {
                navigate('/login?mode=signup');
                setMobileMenuOpen(false);
              }}
              className="btn-liquid block w-full cursor-pointer rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 px-6 py-2.5 text-center text-sm font-semibold text-white"
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
            Generate ATS-optimized resumes, refine with AI chat, tailor per job, and export production-grade PDF and LaTeX in minutes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <button 
              onClick={() => navigate('/login?mode=signup')}
              className="btn-liquid btn-runway inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-200 transition-all duration-200 hover:brightness-105"
            >
              Start Building
              <ArrowRight className="h-4 w-4" />
              <CarFront aria-hidden="true" className="btn-runner h-4 w-4" />
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-7 py-3.5 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-50"
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

      <section className="w-full px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                icon: Sparkles,
                title: "AI-Powered Creation",
                description: "Generate professional resume drafts from role context and your profile data."
              },
              {
                icon: Target,
                title: "ATS Optimization",
                description: "Keep structure and keywords aligned with recruiter and ATS expectations."
              },
              {
                icon: Zap,
                title: "Job Matching",
                description: "Search opportunities and instantly craft job-specific resume versions."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass-card p-7 rounded-2xl"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-600">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full px-6 pb-16 pt-8">
        <div className="glass-card mx-auto max-w-4xl space-y-6 rounded-3xl p-10 text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-extrabold text-slate-900 md:text-4xl"
          >
            Ready to launch your next role with confidence?
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-600"
          >
            Join professionals using Resum.Ai to ship better resumes, faster.
          </motion.p>
          <motion.button 
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            onClick={() => navigate('/login?mode=signup')}
            className="btn-liquid btn-runway inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-blue-200 transition-all duration-200 hover:brightness-105"
          >
            Create Your Resume
            <ArrowRight className="h-4 w-4" />
            <CarFront aria-hidden="true" className="btn-runner h-4 w-4" />
          </motion.button>
        </div>
      </section>

      <footer className="w-full border-t border-white/70 bg-white/70 px-6 py-7 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-sm text-slate-600 md:flex-row">
          <Brand size="sm" />
          <div>© 2026 Resum.Ai. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
