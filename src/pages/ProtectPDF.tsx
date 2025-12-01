import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { PDFDocument } from 'pdf-lib'
import FileDropZone from '../components/FileDropZone/FileDropZone'

interface LoadedPDF {
  file: File
  name: string
  pages: number
  size: string
  arrayBuffer: ArrayBuffer
}

export default function ProtectPDF() {
  const { t } = useTranslation()
  const [loadedPDF, setLoadedPDF] = useState<LoadedPDF | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      const pdfDoc = await PDFDocument.load(arrayBuffer)

      setLoadedPDF({
        file,
        name: file.name,
        pages: pdfDoc.getPageCount(),
        size: formatFileSize(file.size),
        arrayBuffer,
      })
      setError(null)
    } catch (err) {
      console.error('Error loading PDF:', err)
      setError(t('protect.errorLoading'))
    }
  }, [t])

  const handleProtect = async () => {
    if (!loadedPDF || !password) return

    if (password !== confirmPassword) {
      setError(t('protect.passwordMismatch'))
      return
    }

    if (password.length < 4) {
      setError(t('protect.passwordTooShort'))
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Copiar el ArrayBuffer para evitar problemas de "detached buffer"
      const arrayBufferCopy = loadedPDF.arrayBuffer.slice(0)
      const pdfDoc = await PDFDocument.load(arrayBufferCopy)

      // Encrypt the PDF with password
      pdfDoc.encrypt({
        userPassword: password,
        ownerPassword: password,
        permissions: {
          printing: 'highResolution',
          modifying: false,
          copying: false,
          annotating: true,
          fillingForms: true,
          contentAccessibility: true,
          documentAssembly: false,
        },
      })

      const pdfBytes = await pdfDoc.save()

      // Download
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `protected_${loadedPDF.name}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Reset
      setLoadedPDF(null)
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error('Error protecting PDF:', err)
      setError(t('protect.errorProtecting'))
    } finally {
      setIsProcessing(false)
    }
  }

  const clearAll = () => {
    setLoadedPDF(null)
    setPassword('')
    setConfirmPassword('')
    setError(null)
  }

  const isValid = password.length >= 4 && password === confirmPassword

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('protect.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('protect.description')}</p>
      </div>

      {!loadedPDF ? (
        <FileDropZone
          onFilesAdded={handleFilesAdded}
          multiple={false}
          dropzoneText={t('protect.dropzone')}
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
                    {loadedPDF.pages} {t('common.pages')} • {loadedPDF.size}
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
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t('protect.password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('protect.passwordPlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t('protect.confirmPassword')}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('protect.confirmPlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Password strength indicator */}
            {password && (
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${password.length >= 4 ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={password.length >= 4 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  {password.length >= 4 ? t('protect.passwordStrong') : t('protect.passwordWeak')}
                </span>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Protect button */}
          <button
            onClick={handleProtect}
            disabled={!isValid || isProcessing}
            className="w-full py-4 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? t('common.processing') : t('protect.protectButton')}
          </button>
        </div>
      )}
    </div>
  )
}
