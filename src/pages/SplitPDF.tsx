import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { PDFDocument } from 'pdf-lib'
import FileDropZone from '../components/FileDropZone/FileDropZone'
import PDFThumbnail from '../components/PDFThumbnail/PDFThumbnail'

interface LoadedPDF {
  file: File
  name: string
  pages: number
  size: string
  arrayBuffer: ArrayBuffer
}

export default function SplitPDF() {
  const { t } = useTranslation()
  const [loadedPDF, setLoadedPDF] = useState<LoadedPDF | null>(null)
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set())
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
      setSelectedPages(new Set())
    } catch (err) {
      console.error('Error loading PDF:', err)
    }
  }, [])

  const togglePage = (pageNumber: number) => {
    setSelectedPages((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(pageNumber)) {
        newSet.delete(pageNumber)
      } else {
        newSet.add(pageNumber)
      }
      return newSet
    })
  }

  const selectAll = () => {
    if (!loadedPDF) return
    const allPages = new Set<number>()
    for (let i = 1; i <= loadedPDF.pages; i++) {
      allPages.add(i)
    }
    setSelectedPages(allPages)
  }

  const deselectAll = () => {
    setSelectedPages(new Set())
  }

  const handleSplit = async () => {
    if (!loadedPDF || selectedPages.size === 0) return

    setIsProcessing(true)

    try {
      const sourcePdf = await PDFDocument.load(loadedPDF.arrayBuffer)
      const newPdf = await PDFDocument.create()

      const sortedPages = Array.from(selectedPages).sort((a, b) => a - b)
      const pageIndices = sortedPages.map((p) => p - 1) // Convert to 0-based

      const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices)
      copiedPages.forEach((page) => {
        newPdf.addPage(page)
      })

      const pdfBytes = await newPdf.save()

      // Download
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `split_${loadedPDF.name}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Reset
      setLoadedPDF(null)
      setSelectedPages(new Set())
    } catch (err) {
      console.error('Error splitting PDF:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const clearAll = () => {
    setLoadedPDF(null)
    setSelectedPages(new Set())
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('split.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('split.description')}</p>
      </div>

      {!loadedPDF ? (
        <FileDropZone
          onFilesAdded={handleFilesAdded}
          multiple={false}
          dropzoneText={t('split.dropzone')}
        />
      ) : (
        <div className="space-y-4">
          {/* File info header */}
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

          {/* Page selection controls */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {t('split.selectPages')} ({selectedPages.size} / {loadedPDF.pages})
              </p>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-gray-600 dark:text-gray-300"
                >
                  Select all
                </button>
                <button
                  onClick={deselectAll}
                  className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-gray-600 dark:text-gray-300"
                >
                  Deselect all
                </button>
              </div>
            </div>

            {/* Page thumbnails grid */}
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {Array.from({ length: loadedPDF.pages }, (_, i) => i + 1).map(
                (pageNum) => (
                  <PDFThumbnail
                    key={pageNum}
                    pdfData={loadedPDF.arrayBuffer}
                    pageNumber={pageNum}
                    width={100}
                    selected={selectedPages.has(pageNum)}
                    onClick={() => togglePage(pageNum)}
                    showPageNumber={true}
                  />
                )
              )}
            </div>
          </div>

          {/* Split button */}
          <button
            onClick={handleSplit}
            disabled={selectedPages.size === 0 || isProcessing}
            className="w-full py-4 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing
              ? t('common.processing')
              : `${t('split.splitButton')} (${selectedPages.size} ${t('common.pages')})`}
          </button>
        </div>
      )}
    </div>
  )
}
