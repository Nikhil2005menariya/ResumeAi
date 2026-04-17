import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowLeft, CheckCircle2, AlertCircle, Sparkles, CarFront } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Validation schemas
const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const otpSchema = z.object({
  code: z.string().min(6, 'OTP must be 6 digits').max(6, 'OTP must be 6 digits'),
});

const passwordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type EmailForm = z.infer<typeof emailSchema>;
type OTPForm = z.infer<typeof otpSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

type Step = 'email' | 'otp' | 'password' | 'success';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
  });

  const otpForm = useForm<OTPForm>({
    resolver: zodResolver(otpSchema),
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleRequestReset = async (data: EmailForm) => {
    setLoading(true);
    setError('');
    
    try {
      await axios.post(`${API_URL}/api/auth/forgot-password`, {
        email: data.email,
      });
      
      setEmail(data.email);
      setStep('otp');
      setResendTimer(30);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    
    setLoading(true);
    setError('');
    
    try {
      await axios.post(`${API_URL}/api/auth/forgot-password`, {
        email,
      });
      
      setResendTimer(30);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (data: OTPForm) => {
    setLoading(true);
    setError('');
    
    // Store OTP for next step
    sessionStorage.setItem('reset_otp', data.code);
    setStep('password');
    setLoading(false);
  };

  const handleResetPassword = async (data: PasswordForm) => {
    setLoading(true);
    setError('');
    
    const otp = sessionStorage.getItem('reset_otp');
    
    try {
      await axios.post(`${API_URL}/api/auth/reset-password`, {
        email,
        code: otp,
        new_password: data.password,
      });
      
      sessionStorage.removeItem('reset_otp');
      setStep('success');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Link
          to="/login"
          className="mb-6 inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>

        <div className="glass-card rounded-3xl p-8 shadow-[0_22px_50px_-30px_rgba(15,23,42,0.4)]">
          <div className="text-center mb-8">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-500 to-orange-500 shadow-lg shadow-blue-200">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h1 className="mb-2 text-3xl font-bold brand-gradient">
              {step === 'email' && 'Reset Password'}
              {step === 'otp' && 'Enter Code'}
              {step === 'password' && 'New Password'}
              {step === 'success' && 'Success!'}
            </h1>
            <p className="text-sm text-slate-600">
              {step === 'email' && "Enter your email to receive a reset code"}
              {step === 'otp' && `We sent a 6-digit code to ${email}`}
              {step === 'password' && 'Create a strong password'}
              {step === 'success' && 'Your password has been reset'}
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}

          {step === 'email' && (
            <form onSubmit={emailForm.handleSubmit(handleRequestReset)} className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    {...emailForm.register('email')}
                    type="email"
                    className="input-elevated w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-slate-800 placeholder-slate-400 focus:outline-none"
                    placeholder="you@example.com"
                  />
                </div>
                {emailForm.formState.errors.email && (
                  <p className="mt-2 text-sm text-red-600">{emailForm.formState.errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-liquid btn-runway w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 py-3 font-semibold text-white shadow-lg shadow-blue-200 transition-all disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Code'}
                <CarFront aria-hidden="true" className="btn-runner h-4 w-4" />
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={otpForm.handleSubmit(handleVerifyOTP)} className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Verification Code
                </label>
                <input
                  {...otpForm.register('code')}
                  type="text"
                  maxLength={6}
                  className="input-elevated w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-2xl tracking-widest text-slate-800 focus:outline-none"
                  placeholder="000000"
                />
                {otpForm.formState.errors.code && (
                  <p className="mt-2 text-sm text-red-600">{otpForm.formState.errors.code.message}</p>
                )}
              </div>

              <div className="text-center text-sm text-slate-500">
                Didn't receive the code?{' '}
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={resendTimer > 0 || loading}
                  className="text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend'}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-liquid btn-runway w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 py-3 font-semibold text-white shadow-lg shadow-blue-200 transition-all disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
                <CarFront aria-hidden="true" className="btn-runner h-4 w-4" />
              </button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={passwordForm.handleSubmit(handleResetPassword)} className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    {...passwordForm.register('password')}
                    type="password"
                    className="input-elevated w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-slate-800 focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>
                {passwordForm.formState.errors.password && (
                  <p className="mt-2 text-sm text-red-600">{passwordForm.formState.errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    {...passwordForm.register('confirmPassword')}
                    type="password"
                    className="input-elevated w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-slate-800 focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-liquid btn-runway w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 py-3 font-semibold text-white shadow-lg shadow-blue-200 transition-all disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
                <CarFront aria-hidden="true" className="btn-runner h-4 w-4" />
              </button>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              
              <p className="text-slate-600">
                Your password has been successfully reset. You can now log in with your new password.
              </p>

              <button
                onClick={() => navigate('/login')}
                className="btn-liquid btn-runway w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 py-3 font-semibold text-white shadow-lg shadow-blue-200 transition-all"
              >
                Go to Login
                <CarFront aria-hidden="true" className="btn-runner h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
