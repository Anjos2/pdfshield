import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import FileDropZone from '../components/FileDropZone/FileDropZone'

interface LoadedPDF {
  file: File
  name: string
  pages: number
  size: string
  arrayBuffer: ArrayBuffer
}

type WatermarkType = 'text' | 'image'
type Position = 'center' | 'diagonal' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'

export default function AddWatermark() {
  const { t } = useTranslation()
  const [loadedPDF, setLoadedPDF] = useState<LoadedPDF | null>(null)
  const [watermarkType, setWatermarkType] = useState<WatermarkType>('text')
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL')
  const [position, setPosition] = useState<Position>('diagonal')
  const [opacity, setOpacity] = useState(30)
  const [fontSize, setFontSize] = useState(48)
  const [isProcessing, setIsProcessing] = useState(false)

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
    } catch (err) {
      console.error('Error loading PDF:', err)
    }
  }, [])

  const handleAddWatermark = async () => {
    if (!loadedPDF || !watermarkText.trim()) return

    setIsProcessing(true)

    try {
      const pdfDoc = await PDFDocument.load(loadedPDF.arrayBuffer)
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const pages = pdfDoc.getPages()

      const opacityValue = opacity / 100

      for (const page of pages) {
        const { width, height } = page.getSize()

        // Calculate text dimensions
        const textWidth = helveticaFont.widthOfTextAtSize(watermarkText, fontSize)
        const textHeight = fontSize

        let x = 0
        let y = 0
        let rotation = 0

        switch (position) {
          case 'center':
            x = (width - textWidth) / 2
            y = (height - textHeight) / 2
            break
          case 'diagonal':
            x = width / 2 - textWidth / 2
            y = height / 2 - textHeight / 2
            rotation = -45
            break
          case 'topLeft':
            x = 50
            y = height - 50 - textHeight
            break
          case 'topRight':
            x = width - textWidth - 50
            y = height - 50 - textHeight
            break
          case 'bottomLeft':
            x = 50
            y = 50
            break
          case 'bottomRight':
            x = width - textWidth - 50
            y = 50
            break
        }

        if (position === 'diagonal') {
          // For diagonal, we need to calculate position differently
          const diagonalLength = Math.sqrt(width * width + height * height)
          const textScale = Math.min(diagonalLength / textWidth * 0.6, 1)
          const adjustedFontSize = fontSize * textScale

          page.drawText(watermarkText, {
            x: width / 2,
            y: height / 2,
            size: adjustedFontSize,
            font: helveticaFont,
            color: rgb(0.5, 0.5, 0.5),
            opacity: opacityValue,
            rotate: { type: 'degrees' as const, angle: -45 },
          })
        } else {
          page.drawText(watermarkText, {
            x,
            y,
            size: fontSize,
            font: helveticaFont,
            color: rgb(0.5, 0.5, 0.5),
            opacity: opacityValue,
          })
        }
      }

      const pdfBytes = await pdfDoc.save()

      // Download
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `watermarked_${loadedPDF.name}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Reset
      setLoadedPDF(null)
    } catch (err) {
      console.error('Error adding watermark:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const clearAll = () => {
    setLoadedPDF(null)
  }

  const positions: { value: Position; labelKey: string }[] = [
    { value: 'center', labelKey: 'watermark.center' },
    { value: 'diagonal', labelKey: 'watermark.diagonal' },
    { value: 'topLeft', labelKey: 'watermark.topLeft' },
    { value: 'topRight', labelKey: 'watermark.topRight' },
    { value: 'bottomLeft', labelKey: 'watermark.bottomLeft' },
    { value: 'bottomRight', labelKey: 'watermark.bottomRight' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('watermark.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('watermark.description')}</p>
      </div>

      {!loadedPDF ? (
        <FileDropZone
          onFilesAdded={handleFilesAdded}
          multiple={false}
          dropzoneText={t('watermark.dropzone')}
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

          {/* Watermark options */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-6">
            {/* Watermark type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t('watermark.type')}
              </label>
              <div className="flex gap-3">
                {(['text'] as WatermarkType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setWatermarkType(type)}
                    className={`py-2 px-6 rounded-lg border-2 text-sm font-medium transition-all ${
                      watermarkType === type
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    {t(`watermark.${type}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Text input */}
            {watermarkType === 'text' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  {t('watermark.textPlaceholder')}
                </label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder={t('watermark.textPlaceholder')}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            )}

            {/* Position */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t('watermark.position')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {positions.map((pos) => (
                  <button
                    key={pos.value}
                    onClick={() => setPosition(pos.value)}
                    className={`py-2 px-3 rounded-lg border-2 text-xs font-medium transition-all ${
                      position === pos.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    {t(pos.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Font size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t('watermark.fontSize')}: {fontSize}px
              </label>
              <input
                type="range"
                min="12"
                max="120"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>12px</span>
                <span>120px</span>
              </div>
            </div>

            {/* Opacity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t('watermark.opacity')}: {opacity}%
              </label>
              <input
                type="range"
                min="5"
                max="100"
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>5%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-6 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Preview</p>
              <div
                className="inline-block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-4 min-w-[200px] min-h-[150px] relative overflow-hidden"
              >
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    opacity: opacity / 100,
                    transform: position === 'diagonal' ? 'rotate(-45deg)' : 'none',
                  }}
                >
                  <span
                    className="text-gray-400 font-bold whitespace-nowrap"
                    style={{ fontSize: Math.min(fontSize / 3, 24) }}
                  >
                    {watermarkText || 'WATERMARK'}
                  </span>
                </div>
                <div className="relative z-10 text-xs text-gray-300">
                  <p>PDF Content</p>
                  <p>Lorem ipsum...</p>
                </div>
              </div>
            </div>
          </div>

          {/* Add button */}
          <button
            onClick={handleAddWatermark}
            disabled={isProcessing || !watermarkText.trim()}
            className="w-full py-4 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? t('common.processing') : t('watermark.addButton')}
          </button>
        </div>
      )}
    </div>
  )
}
