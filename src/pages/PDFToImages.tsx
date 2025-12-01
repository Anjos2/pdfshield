import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import * as pdfjsLib from 'pdfjs-dist'
import FileDropZone from '../components/FileDropZone/FileDropZone'

// Set worker source - use CDN with fallback
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

// PDF accept configuration
const PDF_ACCEPT = { 'application/pdf': ['.pdf'] }

interface LoadedPDF {
  file: File
  name: string
  pages: number
  size: string
}

type ImageFormat = 'png' | 'jpeg'
type Resolution = 72 | 150 | 300

export default function PDFToImages() {
  const { t } = useTranslation()
  const [loadedPDF, setLoadedPDF] = useState<LoadedPDF | null>(null)
  const [format, setFormat] = useState<ImageFormat>('png')
  const [resolution, setResolution] = useState<Resolution>(150)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)

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
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

      setLoadedPDF({
        file,
        name: file.name,
        pages: pdf.numPages,
        size: formatFileSize(file.size),
      })
    } catch (err) {
      console.error('Error loading PDF:', err)
    }
  }, [])

  const handleConvert = async () => {
    if (!loadedPDF) return

    setIsProcessing(true)
    setProgress(0)

    try {
      const arrayBuffer = await loadedPDF.file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      const scale = resolution / 72

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const context = canvas.getContext('2d')!

        await page.render({
          canvasContext: context,
          viewport,
        }).promise

        // Convert to image and download
        const dataUrl = canvas.toDataURL(`image/${format}`, format === 'jpeg' ? 0.9 : undefined)
        const link = document.createElement('a')
        link.href = dataUrl
        link.download = `page_${i}.${format}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        setProgress(Math.round((i / pdf.numPages) * 100))

        // Small delay between downloads
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      // Reset
      setLoadedPDF(null)
      setProgress(0)
    } catch (err) {
      console.error('Error converting PDF:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const clearAll = () => {
    setLoadedPDF(null)
    setProgress(0)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('pdfToImages.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('pdfToImages.description')}</p>
      </div>

      {!loadedPDF ? (
        <FileDropZone
          onFilesAdded={handleFilesAdded}
          accept={PDF_ACCEPT}
          multiple={false}
          dropzoneText={t('pdfToImages.dropzone')}
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

          {/* Options */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
            {/* Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t('pdfToImages.format')}
              </label>
              <div className="flex gap-3">
                {(['png', 'jpeg'] as ImageFormat[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`py-2 px-6 rounded-lg border-2 text-sm font-medium uppercase transition-all ${
                      format === f
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t('pdfToImages.resolution')}
              </label>
              <div className="flex gap-3">
                {([72, 150, 300] as Resolution[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setResolution(r)}
                    className={`py-2 px-6 rounded-lg border-2 text-sm font-medium transition-all ${
                      resolution === r
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    {r} DPI
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Progress */}
          {isProcessing && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
                <span>{t('common.processing')}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Convert button */}
          <button
            onClick={handleConvert}
            disabled={isProcessing}
            className="w-full py-4 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? t('common.processing') : t('pdfToImages.convertButton')}
          </button>
        </div>
      )}
    </div>
  )
}
