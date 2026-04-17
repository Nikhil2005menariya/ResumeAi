import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth0 } from '@auth0/auth0-react'
import toast from 'react-hot-toast'
import { Mail, Lock, User, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'
import Lottie from 'lottie-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import authAnimation from '@/assets/animations/auth.json'
import { BrandWordmark } from '@/components/Brand'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const signupSchema = loginSchema.extend({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
})

const otpSchema = z.object({
  code: z.string().length(6, 'OTP must be 6 digits'),
})

type LoginForm = z.infer<typeof loginSchema>
type SignupForm = z.infer<typeof signupSchema>
type OTPForm = z.infer<typeof otpSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const { loginWithRedirect } = useAuth0()
  const { setAuth } = useAuthStore()
  const [mode, setMode] = useState<'login' | 'signup' | 'otp'>('login')
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  })

  const otpForm = useForm<OTPForm>({
    resolver: zodResolver(otpSchema),
  })

  const handleLogin = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      const response = await authApi.login(data)
      setAuth(response.data.user, response.data.access_token)
      toast.success('Welcome back!')
      navigate('/app/dashboard')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (data: SignupForm) => {
    setIsLoading(true)
    try {
      await authApi.signup(data)
      setEmail(data.email)
      setMode('otp')
      toast.success('Verification code sent to your email!')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Signup failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async (data: OTPForm) => {
    setIsLoading(true)
    try {
      const response = await authApi.verifyOtp({ email, code: data.code })
      setAuth(response.data.user, response.data.access_token)
      toast.success('Email verified! Welcome!')
      navigate('/app/dashboard')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Invalid verification code')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOTP = async () => {
    try {
      await authApi.resendOtp({ email })
      toast.success('New verification code sent!')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to resend code')
    }
  }

  const handleGoogleLogin = async () => {
    try {
      await loginWithRedirect({
        authorizationParams: {
          connection: 'google-oauth2',
          redirect_uri: window.location.origin + '/callback',
        },
      })
    } catch (error) {
      console.error('Google login error:', error)
      toast.error('Failed to initiate Google login')
    }
  }

  return (
    <div className="relative min-h-screen px-4 py-10">
      <Link
        to="/"
        className="absolute left-6 top-6 inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-2">
        <div className="hidden lg:block">
          <div className="glass-card rounded-3xl p-6">
            <BrandWordmark size="sm" className="mb-4" />
            <Lottie animationData={authAnimation} loop className="h-[360px] w-full" />
            <p className="text-sm leading-relaxed text-slate-600">
              Secure sign-in, instant onboarding, and direct access to your resume workspace.
            </p>
          </div>
        </div>

        <Card className="mx-auto w-full max-w-md shadow-[0_20px_45px_-30px_rgba(15,23,42,0.45)]">
          <CardHeader className="text-center">
            <BrandWordmark size="sm" className="mx-auto mb-2 items-center" />
            <CardTitle className="text-2xl">
              {mode === 'login' && 'Welcome Back'}
              {mode === 'signup' && 'Create Account'}
              {mode === 'otp' && 'Verify Email'}
            </CardTitle>
            <CardDescription>
              {mode === 'login' && 'Sign in to continue building amazing resumes'}
              {mode === 'signup' && 'Start creating AI-powered resumes today'}
              {mode === 'otp' && `Enter the code sent to ${email}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mode === 'login' && (
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      {...loginForm.register('email')}
                      type="email"
                      placeholder="Email"
                      className="pl-10"
                    />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      {...loginForm.register('password')}
                      type="password"
                      placeholder="Password"
                      className="pl-10"
                    />
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>
                
                <div className="text-right -mt-1">
                  <Link
                    to="/forgot-password" 
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                
                <Button type="submit" className="dashboard-btn-dark h-11 w-full rounded-md font-semibold" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Sign In
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </form>
            )}

            {mode === 'signup' && (
              <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      {...signupForm.register('full_name')}
                      placeholder="Full Name"
                      className="pl-10"
                    />
                  </div>
                  {signupForm.formState.errors.full_name && (
                    <p className="text-xs text-destructive">{signupForm.formState.errors.full_name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      {...signupForm.register('email')}
                      type="email"
                      placeholder="Email"
                      className="pl-10"
                    />
                  </div>
                  {signupForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{signupForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      {...signupForm.register('password')}
                      type="password"
                      placeholder="Password"
                      className="pl-10"
                    />
                  </div>
                  {signupForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{signupForm.formState.errors.password.message}</p>
                  )}
                </div>
                <Button type="submit" className="dashboard-btn-dark h-11 w-full rounded-md font-semibold" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Account
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </form>
            )}

            {mode === 'otp' && (
              <form onSubmit={otpForm.handleSubmit(handleVerifyOTP)} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    {...otpForm.register('code')}
                    placeholder="Enter 6-digit code"
                    className="text-center text-2xl tracking-widest"
                    maxLength={6}
                  />
                  {otpForm.formState.errors.code && (
                    <p className="text-xs text-destructive text-center">{otpForm.formState.errors.code.message}</p>
                  )}
                </div>
                <Button type="submit" className="dashboard-btn-dark h-11 w-full rounded-md font-semibold" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Verify Email
                </Button>
                <Button type="button" className="dashboard-btn-light h-11 w-full rounded-md font-semibold" onClick={handleResendOTP}>
                  Resend Code
                </Button>
              </form>
            )}

            {mode !== 'otp' && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <Button variant="outline" className="dashboard-btn-light h-11 w-full rounded-md font-semibold" onClick={handleGoogleLogin}>
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>

                <div className="text-center text-sm">
                  {mode === 'login' ? (
                    <>
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setMode('signup')}
                        className="text-primary hover:underline font-medium"
                      >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setMode('login')}
                        className="text-primary hover:underline font-medium"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
