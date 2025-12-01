import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

// Configure pdf.js worker for Vite/Electron compatibility
// Using the recommended approach for pdfjs-dist v4
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

interface PDFThumbnailProps {
  pdfData: ArrayBuffer
  pageNumber: number
  width?: number
  selected?: boolean
  onClick?: () => void
  showPageNumber?: boolean
  className?: string
}

export default function PDFThumbnail({
  pdfData,
  pageNumber,
  width = 120,
  selected = false,
  onClick,
  showPageNumber = true,
  className = '',
}: PDFThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [dimensions, setDimensions] = useState({ width, height: width * 1.4 })

  useEffect(() => {
    let cancelled = false
    let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null

    const renderPage = async () => {
      if (!canvasRef.current || !pdfData) return

      try {
        setIsLoading(true)
        setError(false)

        // IMPORTANT: Create a copy of the ArrayBuffer to avoid detached buffer issues
        const dataCopy = pdfData.slice(0)

        // Load the PDF
        pdfDoc = await pdfjsLib.getDocument({
          data: dataCopy,
          disableAutoFetch: true,
          disableStream: true,
        }).promise

        if (cancelled) {
          pdfDoc.destroy()
          return
        }

        // Get the page
        const page = await pdfDoc.getPage(pageNumber)

        if (cancelled) {
          pdfDoc.destroy()
          return
        }

        // Calculate scale
        const viewport = page.getViewport({ scale: 1 })
        const scale = width / viewport.width
        const scaledViewport = page.getViewport({ scale })

        // Set dimensions for loading placeholder
        setDimensions({
          width: Math.floor(scaledViewport.width),
          height: Math.floor(scaledViewport.height),
        })

        const canvas = canvasRef.current
        const context = canvas.getContext('2d')

        if (!context || cancelled) {
          pdfDoc.destroy()
          return
        }

        canvas.width = Math.floor(scaledViewport.width)
        canvas.height = Math.floor(scaledViewport.height)

        // Render the page
        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
        }).promise

        if (!cancelled) {
          setIsLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error rendering PDF thumbnail:', err)
          setError(true)
          setIsLoading(false)
        }
      }
    }

    renderPage()

    return () => {
      cancelled = true
      if (pdfDoc) {
        pdfDoc.destroy()
      }
    }
  }, [pdfData, pageNumber, width])

  return (
    <div
      onClick={onClick}
      className={`relative rounded-lg overflow-hidden border-2 transition-all ${
        selected
          ? 'border-primary-500 ring-2 ring-primary-200'
          : 'border-gray-200 hover:border-gray-300'
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: dimensions.width, minHeight: dimensions.height }}
    >
      {/* Canvas for rendering */}
      <canvas
        ref={canvasRef}
        className={`block bg-white ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
      />

      {/* Loading state */}
      {isLoading && !error && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-100"
        >
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error state - show helpful placeholder with page number */}
      {error && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200"
        >
          <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center mb-2 border border-gray-100">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-gray-500 text-sm font-medium">Página {pageNumber}</span>
        </div>
      )}

      {/* Page number badge */}
      {showPageNumber && !isLoading && (
        <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
          {pageNumber}
        </div>
      )}

      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-1 right-1 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">✓</span>
        </div>
      )}
    </div>
  )
}
