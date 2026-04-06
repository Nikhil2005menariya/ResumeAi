import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Back Button */}
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>

        {/* Card */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent mb-2">
              {step === 'email' && 'Reset Password'}
              {step === 'otp' && 'Enter Code'}
              {step === 'password' && 'New Password'}
              {step === 'success' && 'Success!'}
            </h1>
            <p className="text-gray-400 text-sm">
              {step === 'email' && "Enter your email to receive a reset code"}
              {step === 'otp' && `We sent a 6-digit code to ${email}`}
              {step === 'password' && 'Create a strong password'}
              {step === 'success' && 'Your password has been reset'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 text-red-400"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}

          {/* Email Step */}
          {step === 'email' && (
            <form onSubmit={emailForm.handleSubmit(handleRequestReset)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    {...emailForm.register('email')}
                    type="email"
                    className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-purple-500/20 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-500"
                    placeholder="you@example.com"
                  />
                </div>
                {emailForm.formState.errors.email && (
                  <p className="mt-2 text-sm text-red-400">{emailForm.formState.errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Reset Code'}
              </button>
            </form>
          )}

          {/* OTP Step */}
          {step === 'otp' && (
            <form onSubmit={otpForm.handleSubmit(handleVerifyOTP)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Verification Code
                </label>
                <input
                  {...otpForm.register('code')}
                  type="text"
                  maxLength={6}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/20 rounded-lg focus:outline-none focus:border-purple-500 text-white text-center text-2xl tracking-widest"
                  placeholder="000000"
                />
                {otpForm.formState.errors.code && (
                  <p className="mt-2 text-sm text-red-400">{otpForm.formState.errors.code.message}</p>
                )}
              </div>

              <div className="text-center text-sm text-gray-400">
                Didn't receive the code?{' '}
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={resendTimer > 0 || loading}
                  className="text-purple-400 hover:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend'}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>
          )}

          {/* Password Step */}
          {step === 'password' && (
            <form onSubmit={passwordForm.handleSubmit(handleResetPassword)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    {...passwordForm.register('password')}
                    type="password"
                    className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-purple-500/20 rounded-lg focus:outline-none focus:border-purple-500 text-white"
                    placeholder="••••••••"
                  />
                </div>
                {passwordForm.formState.errors.password && (
                  <p className="mt-2 text-sm text-red-400">{passwordForm.formState.errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    {...passwordForm.register('confirmPassword')}
                    type="password"
                    className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-purple-500/20 rounded-lg focus:outline-none focus:border-purple-500 text-white"
                    placeholder="••••••••"
                  />
                </div>
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-400">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              
              <p className="text-gray-300">
                Your password has been successfully reset. You can now log in with your new password.
              </p>

              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
              >
                Go to Login
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
