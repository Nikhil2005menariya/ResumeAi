import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import Lottie from 'lottie-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandWordmark } from '@/components/Brand';
import authAnimation from '@/assets/animations/auth.json';

// Use relative URLs so Vercel's middleware can rewrite /api/* to backend
const API_URL = import.meta.env.VITE_API_URL || '/api';

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
      await axios.post(`/api/auth/forgot-password`, {
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
      await axios.post(`/api/auth/forgot-password`, {
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
      await axios.post(`/api/auth/reset-password`, {
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
    <div className="relative min-h-screen px-4 py-10">
      <Link
        to="/login"
        className="absolute left-6 top-6 inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Login
      </Link>

      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-2">
        <div className="hidden lg:block">
          <div className="glass-card rounded-3xl p-6">
            <BrandWordmark size="sm" className="mb-4" />
            <Lottie animationData={authAnimation} loop className="h-[360px] w-full" />
            <p className="text-sm leading-relaxed text-slate-600">
              Secure password recovery with guided verification and protected account reset flow.
            </p>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="w-full">
          <Card className="mx-auto w-full max-w-md shadow-[0_20px_45px_-30px_rgba(15,23,42,0.45)]">
            <CardHeader className="text-center">
              <BrandWordmark size="sm" className="mx-auto mb-2 items-center" />
              <CardTitle className="text-2xl text-[#171717]">
                {step === 'email' && 'Reset Password'}
                {step === 'otp' && 'Enter Verification Code'}
                {step === 'password' && 'Set New Password'}
                {step === 'success' && 'Password Updated'}
              </CardTitle>
              <CardDescription>
                {step === 'email' && 'Enter your email to receive a secure reset code.'}
                {step === 'otp' && `A 6-digit code was sent to ${email}.`}
                {step === 'password' && 'Create a strong new password for your account.'}
                {step === 'success' && 'Your password has been reset successfully.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-red-700 shadow-[rgba(220,38,38,0.15)_0px_0px_0px_1px]"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="text-sm">{error}</span>
                </motion.div>
              )}

              {step === 'email' && (
                <form onSubmit={emailForm.handleSubmit(handleRequestReset)} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#4d4d4d]">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...emailForm.register('email')}
                        type="email"
                        placeholder="you@example.com"
                        className="pl-10"
                      />
                    </div>
                    {emailForm.formState.errors.email ? (
                      <p className="text-xs text-destructive">{emailForm.formState.errors.email.message}</p>
                    ) : null}
                  </div>

                  <Button type="submit" disabled={loading} className="dashboard-btn-dark h-11 w-full rounded-md font-semibold">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {loading ? 'Sending Code...' : 'Send Reset Code'}
                  </Button>
                </form>
              )}

              {step === 'otp' && (
                <form onSubmit={otpForm.handleSubmit(handleVerifyOTP)} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#4d4d4d]">Verification Code</label>
                    <Input
                      {...otpForm.register('code')}
                      type="text"
                      maxLength={6}
                      placeholder="000000"
                      className="text-center text-2xl tracking-widest"
                    />
                    {otpForm.formState.errors.code ? (
                      <p className="text-xs text-destructive">{otpForm.formState.errors.code.message}</p>
                    ) : null}
                  </div>

                  <div className="text-center text-sm text-slate-500">
                    Didn&apos;t receive the code?{' '}
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={resendTimer > 0 || loading}
                      className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend'}
                    </button>
                  </div>

                  <Button type="submit" disabled={loading} className="dashboard-btn-dark h-11 w-full rounded-md font-semibold">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {loading ? 'Verifying...' : 'Verify Code'}
                  </Button>
                </form>
              )}

              {step === 'password' && (
                <form onSubmit={passwordForm.handleSubmit(handleResetPassword)} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#4d4d4d]">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...passwordForm.register('password')}
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                      />
                    </div>
                    {passwordForm.formState.errors.password ? (
                      <p className="text-xs text-destructive">{passwordForm.formState.errors.password.message}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#4d4d4d]">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...passwordForm.register('confirmPassword')}
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                      />
                    </div>
                    {passwordForm.formState.errors.confirmPassword ? (
                      <p className="text-xs text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
                    ) : null}
                  </div>

                  <Button type="submit" disabled={loading} className="dashboard-btn-dark h-11 w-full rounded-md font-semibold">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </Button>
                </form>
              )}

              {step === 'success' && (
                <div className="space-y-5 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600">
                    Your password has been successfully reset. You can now sign in with your new password.
                  </p>
                  <Button
                    onClick={() => navigate('/login')}
                    className="dashboard-btn-dark h-11 w-full rounded-md font-semibold"
                  >
                    Go to Login
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
