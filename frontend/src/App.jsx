import { useState, useEffect } from 'react'

function App() {
  const [apiStatus, setApiStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [testId, setTestId] = useState(1)
  const [uploading, setUploading] = useState(false)

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

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      setUploadStatus(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus({ success: false, message: 'Please select a file' })
      return
    }

    setUploading(true)
    setUploadStatus(null)

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const response = await fetch(`/api/v1/photos/upload?test_id=${testId}`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setUploadStatus({ 
          success: true, 
          message: `Photo uploaded successfully! ID: ${data.id}`,
          data 
        })
        setSelectedFile(null)
        // Reset file input
        document.getElementById('fileInput').value = ''
      } else {
        setUploadStatus({ 
          success: false, 
          message: `Upload failed: ${data.detail || JSON.stringify(data)}` 
        })
      }
    } catch (err) {
      setUploadStatus({ 
        success: false, 
        message: `Upload error: ${err.message}` 
      })
    } finally {
      setUploading(false)
    }
  }

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

          {/* Photo Upload Section */}
          <div className="mt-12 bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              📸 Photo Upload Test
            </h2>
            
            <div className="space-y-4">
              {/* Test ID Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test ID
                </label>
                <input
                  type="number"
                  value={testId}
                  onChange={(e) => setTestId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter test ID"
                />
              </div>

              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Photo
                </label>
                <input
                  id="fileInput"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                />
                {selectedFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? 'Uploading...' : 'Upload Photo'}
              </button>

              {/* Status Message */}
              {uploadStatus && (
                <div className={`p-4 rounded-lg ${
                  uploadStatus.success 
                    ? 'bg-green-50 text-green-800 border border-green-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  <p className="font-medium">
                    {uploadStatus.success ? '✅' : '❌'} {uploadStatus.message}
                  </p>
                  {uploadStatus.data && (
                    <div className="mt-2 text-sm">
                      <p>File Path: {uploadStatus.data.file_path}</p>
                      <p>Uploaded: {new Date(uploadStatus.data.time_stamp).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
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
