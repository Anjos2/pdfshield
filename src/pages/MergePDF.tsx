import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useDropzone } from 'react-dropzone'
import { PDFDocument } from 'pdf-lib'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import FileDropZone from '../components/FileDropZone/FileDropZone'
import PDFThumbnail from '../components/PDFThumbnail/PDFThumbnail'

interface PDFFile {
  id: string
  file: File
  name: string
  pages: number
  size: string
  arrayBuffer: ArrayBuffer
}

// Sortable PDF Item Component
interface SortablePDFItemProps {
  file: PDFFile
  index: number
  totalFiles: number
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  t: (key: string) => string
}

function SortablePDFItem({
  file,
  index,
  totalFiles,
  onMoveUp,
  onMoveDown,
  onRemove,
  t,
}: SortablePDFItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: file.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 relative group ${
        isDragging ? 'shadow-2xl ring-2 ring-primary-500' : ''
      }`}
    >
      {/* Drag handle - the whole card is draggable */}
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing rounded-xl"
      />

      {/* Order number */}
      <div className="absolute -top-2 -left-2 w-6 h-6 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center font-bold z-20">
        {index + 1}
      </div>

      {/* Thumbnail */}
      <div className="mb-3 relative z-0">
        <PDFThumbnail
          pdfData={file.arrayBuffer}
          pageNumber={1}
          width={140}
          showPageNumber={false}
        />
      </div>

      {/* File info */}
      <div className="space-y-1 relative z-0">
        <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate" title={file.name}>
          {file.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {file.pages} {t('common.pages')} • {file.size}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 relative z-20">
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMoveUp()
            }}
            disabled={index === 0}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-30 disabled:hover:bg-transparent"
            title="Move left"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMoveDown()
            }}
            disabled={index === totalFiles - 1}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-30 disabled:hover:bg-transparent"
            title="Move right"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
          title={t('common.remove')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function MergePDF() {
  const { t } = useTranslation()
  const [files, setFiles] = useState<PDFFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle drag end for reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setFiles((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const handleFilesAdded = useCallback(async (newFiles: File[]) => {
    const processedFiles: PDFFile[] = []

    for (const file of newFiles) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const pdfDoc = await PDFDocument.load(arrayBuffer)
        const pages = pdfDoc.getPageCount()

        processedFiles.push({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          pages,
          size: formatFileSize(file.size),
          arrayBuffer,
        })
      } catch (error) {
        console.error(`Error loading ${file.name}:`, error)
      }
    }

    setFiles((prev) => [...prev, ...processedFiles])
  }, [])

  // Dropzone for the entire area when files exist
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFilesAdded,
    accept: { 'application/pdf': ['.pdf'] },
    noClick: true, // Don't open file dialog on click (we have explicit buttons for that)
  })

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const moveFile = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= files.length) return
    setFiles((prev) => {
      const newFiles = [...prev]
      const [removed] = newFiles.splice(fromIndex, 1)
      newFiles.splice(toIndex, 0, removed)
      return newFiles
    })
  }

  const handleMerge = async () => {
    if (files.length < 2) return

    setIsProcessing(true)
    setProgress(0)

    try {
      const mergedPdf = await PDFDocument.create()

      for (let i = 0; i < files.length; i++) {
        const pdfDoc = await PDFDocument.load(files[i].arrayBuffer)
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices())

        copiedPages.forEach((page) => {
          mergedPdf.addPage(page)
        })

        setProgress(Math.round(((i + 1) / files.length) * 100))
      }

      const mergedPdfBytes = await mergedPdf.save()

      // Download the merged PDF
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'merged.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Reset state
      setFiles([])
      setProgress(0)
    } catch (error) {
      console.error('Error merging PDFs:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const clearAll = () => {
    setFiles([])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('merge.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('merge.description')}</p>
      </div>

      {/* Drop zone - initial state */}
      {files.length === 0 ? (
        <FileDropZone
          onFilesAdded={handleFilesAdded}
          dropzoneText={t('merge.dropzone')}
        />
      ) : (
        // Wrap everything in a dropzone so users can always drag & drop more files
        <div
          {...getRootProps()}
          className={`space-y-4 relative ${
            isDragActive ? 'after:absolute after:inset-0 after:bg-primary-500/10 after:border-2 after:border-dashed after:border-primary-500 after:rounded-xl after:pointer-events-none' : ''
          }`}
        >
          <input {...getInputProps()} />

          {/* Drag overlay message */}
          {isDragActive && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="bg-primary-600 text-white px-6 py-3 rounded-xl shadow-lg">
                Drop PDF files here to add
              </div>
            </div>
          )}

          {/* Files header */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {files.length} {files.length === 1 ? 'file' : 'files'} • {t('merge.reorder')}
            </span>
            <button
              onClick={clearAll}
              className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              {t('common.clear')}
            </button>
          </div>

          {/* PDF Grid with drag and drop */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={files.map((f) => f.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {files.map((file, index) => (
                  <SortablePDFItem
                    key={file.id}
                    file={file}
                    index={index}
                    totalFiles={files.length}
                    onMoveUp={() => moveFile(index, index - 1)}
                    onMoveDown={() => moveFile(index, index + 1)}
                    onRemove={() => removeFile(file.id)}
                    t={t}
                  />
                ))}

                {/* Add more card */}
                <div
                  onClick={() => document.getElementById('add-more-input')?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all min-h-[200px]"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-2">
                    <span className="text-xl text-gray-400 dark:text-gray-500">+</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    {t('common.addMore')}
                    <br />
                    <span className="text-xs text-gray-400 dark:text-gray-500">or drag & drop</span>
                  </p>
                  <input
                    id="add-more-input"
                    type="file"
                    accept=".pdf,application/pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        handleFilesAdded(Array.from(e.target.files))
                      }
                      e.target.value = ''
                    }}
                  />
                </div>
              </div>
            </SortableContext>
          </DndContext>

          {/* Progress bar */}
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

          {/* Merge button */}
          <button
            onClick={handleMerge}
            disabled={files.length < 2 || isProcessing}
            className="w-full py-4 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? t('common.processing') : t('merge.mergeButton')}
          </button>
        </div>
      )}
    </div>
  )
}
