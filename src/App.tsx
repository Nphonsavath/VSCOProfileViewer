import { useState } from 'react'
import './App.css'

function App() {
  const [input, setInput] = useState('')
  const [profileImage, setProfileImage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setProfileImage('')
    
    try {
      // Extract username from VSCO URL or use direct input
      const username = input.includes('vsco.co/') 
        ? input.split('vsco.co/')[1].split('/')[0]
        : input

      // Fetch the profile image URL from our backend
      const response = await fetch(`http://localhost:3001/api/vsco/${username}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch profile')
      }

      const data = await response.json()
      setProfileImage(data.imageUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile image')
    } finally {
      setLoading(false)
    }
  }

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
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'View Profile Picture'}
          </button>
        </form>

        {error && (
          <div className="mt-4 text-red-600 text-sm text-center">
            {error}
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
