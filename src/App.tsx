import { useState, useCallback } from 'react'
import './App.css'

function App() {
  const [input, setInput] = useState('')
  const [profileImage, setProfileImage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setProfileImage('')
    
    try {
      // Input validation
      if (!input.trim()) {
        throw new Error('Please enter a VSCO username or URL')
      }

      // Extract username from VSCO URL or use direct input
      const username = input.includes('vsco.co/') 
        ? input.split('vsco.co/')[1].split('/')[0].trim()
        : input.trim()

      if (username.length > 50) {
        throw new Error('Username is too long')
      }

      // Fetch the profile image URL from our backend
      const response = await fetch(`http://localhost:3001/api/vsco/${username}`, {
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch profile')
      }

      const data = await response.json()
      if (!data.imageUrl) {
        throw new Error('No image URL received')
      }

      setProfileImage(data.imageUrl)
      setRetryCount(0) // Reset retry count on success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch profile image'
      setError(errorMessage)
      
      // Auto-retry on network errors
      if (retryCount < 2 && (
        errorMessage.includes('network') || 
        errorMessage.includes('timeout') ||
        errorMessage.includes('unavailable')
      )) {
        setRetryCount(prev => prev + 1)
        setTimeout(() => handleSubmit(e), 2000) // Retry after 2 seconds
      }
    } finally {
      setLoading(false)
    }
  }, [input, retryCount])

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-6">VSCO Profile Picture Viewer</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="vsco-input" className="block text-sm font-medium text-gray-700">
              Enter VSCO Username or URL
            </label>
            <input
              type="text"
              id="vsco-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g., username or vsco.co/username"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              disabled={loading}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"></circle>
                </svg>
                <span>{retryCount > 0 ? `Retrying... (${retryCount}/2)` : 'Loading...'}</span>
              </span>
            ) : 'View Profile Picture'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600 text-center">{error}</p>
          </div>
        )}

        {profileImage && (
          <div className="mt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Profile Picture</h2>
            <img
              src={profileImage.replace('w=300', 'w=1500')}
              alt="VSCO Profile"
              className="w-full rounded-lg"
              onError={() => setError('Failed to load image. Please try again.')}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default App
