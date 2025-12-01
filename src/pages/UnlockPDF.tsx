import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { PDFDocument } from 'pdf-lib'
import FileDropZone from '../components/FileDropZone/FileDropZone'

interface LoadedPDF {
  file: File
  name: string
  size: string
  arrayBuffer: ArrayBuffer
  isEncrypted: boolean
}

export default function UnlockPDF() {
  const { t } = useTranslation()
  const [loadedPDF, setLoadedPDF] = useState<LoadedPDF | null>(null)
  const [password, setPassword] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const handleFilesAdded = useCallback(async (files: File[]) => {
    if (files.length === 0) return
    const file = files[0]

    try {
      const arrayBuffer = await file.arrayBuffer()

      // Try to check if PDF is encrypted
      let isEncrypted = false
      try {
        await PDFDocument.load(arrayBuffer)
      } catch {
        // If loading fails, it might be encrypted
        isEncrypted = true
      }

      setLoadedPDF({
        file,
        name: file.name,
        size: formatFileSize(file.size),
        arrayBuffer,
        isEncrypted,
      })
      setError(null)
      setSuccess(false)
    } catch (err) {
      console.error('Error loading PDF:', err)
      setError(t('unlock.errorLoading'))
    }
  }, [t])

  const handleUnlock = async () => {
    if (!loadedPDF) return

    setIsProcessing(true)
    setError(null)

    try {
      // Try to load the PDF with the password
      const pdfDoc = await PDFDocument.load(loadedPDF.arrayBuffer, {
        password: password || undefined,
        ignoreEncryption: !password,
      })

      // Save without encryption
      const pdfBytes = await pdfDoc.save()

      // Download
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `unlocked_${loadedPDF.name}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setSuccess(true)
    } catch (err) {
      console.error('Error unlocking PDF:', err)
      if (password) {
        setError(t('unlock.wrongPassword'))
      } else {
        setError(t('unlock.passwordRequired'))
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const clearAll = () => {
    setLoadedPDF(null)
    setPassword('')
    setError(null)
    setSuccess(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('unlock.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('unlock.description')}</p>
      </div>

      {!loadedPDF ? (
        <FileDropZone
          onFilesAdded={handleFilesAdded}
          multiple={false}
          dropzoneText={t('unlock.dropzone')}
        />
      ) : (
        <div className="space-y-4">
          {/* File info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-red-600 dark:text-red-400 font-bold">PDF</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{loadedPDF.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {loadedPDF.size}
                    {loadedPDF.isEncrypted && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">
                        {t('unlock.encrypted')}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={clearAll}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-700"
              >
                {t('common.clear')}
              </button>
            </div>
          </div>

          {/* Password input */}
          {loadedPDF.isEncrypted && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t('unlock.password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('unlock.passwordPlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t('unlock.passwordHint')}
              </p>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-green-600 dark:text-green-400 font-medium">{t('unlock.success')}</p>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Unlock button */}
          <button
            onClick={handleUnlock}
            disabled={isProcessing || (loadedPDF.isEncrypted && !password)}
            className="w-full py-4 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? t('common.processing') : t('unlock.unlockButton')}
          </button>
        </div>
      )}
    </div>
  )
}
