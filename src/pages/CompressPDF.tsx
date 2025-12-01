import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { PDFDocument } from 'pdf-lib'
import FileDropZone from '../components/FileDropZone/FileDropZone'

interface LoadedPDF {
  file: File
  name: string
  pages: number
  size: number
  sizeFormatted: string
}

type Quality = 'high' | 'medium' | 'low'

export default function CompressPDF() {
  const { t } = useTranslation()
  const [loadedPDF, setLoadedPDF] = useState<LoadedPDF | null>(null)
  const [quality, setQuality] = useState<Quality>('medium')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<{ size: number; reduction: number } | null>(null)

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
        size: file.size,
        sizeFormatted: formatFileSize(file.size),
      })
      setResult(null)
    } catch (err) {
      console.error('Error loading PDF:', err)
    }
  }, [])

  const handleCompress = async () => {
    if (!loadedPDF) return

    setIsProcessing(true)

    try {
      const arrayBuffer = await loadedPDF.file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
      })

      // Apply compression based on quality
      // Note: pdf-lib has limited compression options
      // For real compression we'd need a more specialized library
      const compressOptions: { useObjectStreams?: boolean } = {}

      if (quality === 'low') {
        compressOptions.useObjectStreams = true
      }

      const pdfBytes = await pdfDoc.save({
        useObjectStreams: quality !== 'high',
        addDefaultPage: false,
      })

      const newSize = pdfBytes.length
      const reduction = Math.round((1 - newSize / loadedPDF.size) * 100)

      setResult({ size: newSize, reduction: Math.max(0, reduction) })

      // Download
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `compressed_${loadedPDF.name}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error compressing PDF:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const clearAll = () => {
    setLoadedPDF(null)
    setResult(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('compress.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('compress.description')}</p>
      </div>

      {!loadedPDF ? (
        <FileDropZone
          onFilesAdded={handleFilesAdded}
          multiple={false}
          dropzoneText={t('compress.dropzone')}
        />
      ) : (
        <div className="space-y-4">
          {/* File info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-red-600 dark:text-red-400 font-bold">PDF</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{loadedPDF.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {loadedPDF.pages} {t('common.pages')} • {loadedPDF.sizeFormatted}
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

          {/* Quality selector */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
              {t('compress.quality')}
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['high', 'medium', 'low'] as Quality[]).map((q) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                    quality === q
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  {t(`compress.${q}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✓</span>
                <div>
                  <p className="font-medium text-green-800">
                    {t('compress.reduction')}: {result.reduction}%
                  </p>
                  <p className="text-sm text-green-600">
                    {formatFileSize(loadedPDF.size)} → {formatFileSize(result.size)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Compress button */}
          <button
            onClick={handleCompress}
            disabled={isProcessing}
            className="w-full py-4 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? t('common.processing') : t('compress.compressButton')}
          </button>
        </div>
      )}
    </div>
  )
}
