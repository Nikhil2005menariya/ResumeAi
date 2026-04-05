import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
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
          navigate('/dashboard')
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <h2 className="text-xl font-semibold text-gray-900">
          Completing authentication...
        </h2>
        <p className="text-gray-600">
          Please wait while we sign you in
        </p>
      </div>
    </div>
  )
}
