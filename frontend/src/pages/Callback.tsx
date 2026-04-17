import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import toast from 'react-hot-toast'
import { Loader2, Sparkles } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

export function CallbackPage() {
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading, error, getAccessTokenSilently } = useAuth0()
  const { setAuth } = useAuthStore()

  useEffect(() => {
    const handleCallback = async () => {
      if (isLoading) return

      if (error) {
        console.error('Auth0 error:', error)
        toast.error('Authentication failed: ' + error.message)
        navigate('/login')
        return
      }

      if (isAuthenticated && user) {
        try {
          console.log('Auth0 user:', user)
          
          // Get Auth0 token
          const auth0Token = await getAccessTokenSilently()
          console.log('Got Auth0 token, length:', auth0Token.length)

          // Verify with backend
          console.log('Calling backend verification...')
          const response = await authApi.auth0Verify({ access_token: auth0Token })
          console.log('Backend verification successful:', response.data)
          
          // Set auth in store
          setAuth(response.data.user, response.data.access_token)
          
          toast.success(`Welcome, ${user.name || user.email}!`)
          navigate('/app/dashboard')
        } catch (error: any) {
          console.error('Backend verification error:', error)
          console.error('Error response:', error.response?.data)
          toast.error(error.response?.data?.detail || 'Failed to complete authentication')
          navigate('/login')
        }
      }
    }

    handleCallback()
  }, [isAuthenticated, isLoading, error, user, navigate, getAccessTokenSilently, setAuth])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-card w-full max-w-md rounded-3xl p-10 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-500 to-orange-500 shadow-lg shadow-blue-200">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <h2 className="text-xl font-semibold text-slate-900">
          Completing authentication...
        </h2>
        <p className="text-slate-600">
          Please wait while we sign you in
        </p>
      </div>
    </div>
  )
}
