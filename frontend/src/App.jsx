import { useState, useEffect } from 'react'

function App() {
  const [apiStatus, setApiStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/status')
      .then(res => res.json())
      .then(data => {
        setApiStatus(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('API connection error:', err)
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-indigo-900 mb-4">
            🔍 QC Vision
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Visual Quality Tests Tracking for Modern Manufacturing
          </p>
          
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              System Status
            </h2>
            
            {loading ? (
              <div className="animate-pulse text-gray-500">
                Connecting to backend...
              </div>
            ) : apiStatus ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-green-600 font-medium">
                    API Connected - {apiStatus.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6 text-left">
                  {apiStatus.services && Object.entries(apiStatus.services).map(([service, status]) => (
                    <div key={service} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <span className={`w-2 h-2 rounded-full ${
                        status === 'available' ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></span>
                      <span className="text-sm text-gray-700 capitalize">
                        {service.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-red-500">
                ⚠️ Unable to connect to backend API
              </div>
            )}
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow">
              <div className="text-3xl mb-3">📸</div>
              <h3 className="font-semibold text-gray-800">Photo Capture</h3>
              <p className="text-sm text-gray-500 mt-2">
                Upload product photos from camera or gallery
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow">
              <div className="text-3xl mb-3">🧪</div>
              <h3 className="font-semibold text-gray-800">Test Management</h3>
              <p className="text-sm text-gray-500 mt-2">
                Create and track quality tests with status workflow
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow">
              <div className="text-3xl mb-3">🔍</div>
              <h3 className="font-semibold text-gray-800">Defect Reporting</h3>
              <p className="text-sm text-gray-500 mt-2">
                Document defects with visual annotations
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
