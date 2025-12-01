import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { PDFDocument, degrees } from 'pdf-lib'
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

interface PageInfo {
  id: string
  pageIndex: number
  rotation: number
}

interface LoadedPDF {
  file: File
  name: string
  size: string
  arrayBuffer: ArrayBuffer
  pages: PageInfo[]
}

// Sortable Page Item Component
interface SortablePageItemProps {
  id: string
  pageInfo: PageInfo
  index: number
  pdfData: ArrayBuffer
  isSelected: boolean
  onToggle: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
  t: (key: string) => string
}

function SortablePageItem({
  id,
  pageInfo,
  index,
  pdfData,
  isSelected,
  onToggle,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  t,
}: SortablePageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Drag handle overlay */}
      <div
        {...attributes}
        {...listeners}
        className={`absolute inset-0 z-30 cursor-grab active:cursor-grabbing rounded-lg ${
          isDragging ? 'ring-2 ring-primary-500 ring-offset-2' : ''
        }`}
        onClick={(e) => {
          // Allow click through for selection
          if (!isDragging) {
            onToggle()
          }
        }}
      />

      {/* Page number badge */}
      <div className="absolute -top-3 -left-3 w-8 h-8 bg-primary-600 text-white text-sm rounded-full flex items-center justify-center font-bold z-40 shadow-lg">
        {index + 1}
      </div>

      {/* Rotation indicator */}
      {pageInfo.rotation !== 0 && (
        <div className="absolute top-1 right-1 z-40 bg-blue-500 text-white text-xs px-2 py-1 rounded font-medium">
          {pageInfo.rotation}°
        </div>
      )}

      {/* Thumbnail container */}
      <div
        className={`relative transition-transform ${isDragging ? 'scale-105 shadow-2xl' : ''}`}
        style={{
          transform: `rotate(${pageInfo.rotation}deg)`,
          transformOrigin: 'center',
        }}
      >
        <PDFThumbnail
          pdfData={pdfData}
          pageNumber={pageInfo.pageIndex + 1}
          width={120}
          selected={isSelected}
          onClick={onToggle}
          showPageNumber={false}
        />
      </div>

      {/* Order controls - always visible at bottom */}
      <div className="flex justify-center gap-2 mt-2 relative z-40">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onMoveUp()
          }}
          disabled={isFirst}
          className="flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-gray-700 hover:bg-primary-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-primary-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title={t('edit.moveLeft')}
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
          disabled={isLast}
          className="flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-gray-700 hover:bg-primary-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-primary-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title={t('edit.moveRight')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function EditPDF() {
  const { t } = useTranslation()
  const [loadedPDF, setLoadedPDF] = useState<LoadedPDF | null>(null)
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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
      const pageCount = pdfDoc.getPageCount()

      const pages: PageInfo[] = []
      for (let i = 0; i < pageCount; i++) {
        const page = pdfDoc.getPage(i)
        pages.push({
          id: `page-${i}-${Date.now()}`, // Unique ID for drag and drop
          pageIndex: i,
          rotation: page.getRotation().angle,
        })
      }

      setLoadedPDF({
        file,
        name: file.name,
        size: formatFileSize(file.size),
        arrayBuffer,
        pages,
      })
      setSelectedPages(new Set())
    } catch (err) {
      console.error('Error loading PDF:', err)
    }
  }, [])

  // Handle drag end for reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setLoadedPDF((prev) => {
        if (!prev) return prev

        const oldIndex = prev.pages.findIndex((p) => p.id === active.id)
        const newIndex = prev.pages.findIndex((p) => p.id === over.id)

        const newPages = arrayMove(prev.pages, oldIndex, newIndex)

        // Update selected pages to follow the moved items
        setSelectedPages((prevSelected) => {
          const newSelected = new Set<number>()
          prevSelected.forEach((selectedIdx) => {
            if (selectedIdx === oldIndex) {
              newSelected.add(newIndex)
            } else if (oldIndex < newIndex) {
              // Moving down
              if (selectedIdx > oldIndex && selectedIdx <= newIndex) {
                newSelected.add(selectedIdx - 1)
              } else {
                newSelected.add(selectedIdx)
              }
            } else {
              // Moving up
              if (selectedIdx >= newIndex && selectedIdx < oldIndex) {
                newSelected.add(selectedIdx + 1)
              } else {
                newSelected.add(selectedIdx)
              }
            }
          })
          return newSelected
        })

        return { ...prev, pages: newPages }
      })
    }
  }

  const togglePage = (pageIndex: number) => {
    setSelectedPages((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(pageIndex)) {
        newSet.delete(pageIndex)
      } else {
        newSet.add(pageIndex)
      }
      return newSet
    })
  }

  const selectAll = () => {
    if (!loadedPDF) return
    const allPages = new Set<number>()
    loadedPDF.pages.forEach((_, i) => allPages.add(i))
    setSelectedPages(allPages)
  }

  const deselectAll = () => {
    setSelectedPages(new Set())
  }

  const rotatePages = (direction: 'left' | 'right') => {
    if (!loadedPDF || selectedPages.size === 0) return

    const rotationAmount = direction === 'left' ? -90 : 90

    setLoadedPDF((prev) => {
      if (!prev) return prev
      const newPages = prev.pages.map((page, index) => {
        if (selectedPages.has(index)) {
          return {
            ...page,
            rotation: (page.rotation + rotationAmount + 360) % 360,
          }
        }
        return page
      })
      return { ...prev, pages: newPages }
    })
    setPdfVersion((v) => v + 1)
  }

  const deleteSelectedPages = () => {
    if (!loadedPDF || selectedPages.size === 0) return
    if (selectedPages.size >= loadedPDF.pages.length) {
      alert('Cannot delete all pages')
      return
    }

    setLoadedPDF((prev) => {
      if (!prev) return prev
      const newPages = prev.pages.filter((_, index) => !selectedPages.has(index))
      return { ...prev, pages: newPages }
    })
    setSelectedPages(new Set())
  }

  const movePageUp = (index: number) => {
    if (!loadedPDF || index === 0) return

    setLoadedPDF((prev) => {
      if (!prev) return prev
      const newPages = [...prev.pages]
      ;[newPages[index - 1], newPages[index]] = [newPages[index], newPages[index - 1]]
      return { ...prev, pages: newPages }
    })

    // Update selection
    setSelectedPages((prev) => {
      const newSet = new Set<number>()
      prev.forEach((i) => {
        if (i === index) newSet.add(i - 1)
        else if (i === index - 1) newSet.add(i + 1)
        else newSet.add(i)
      })
      return newSet
    })
  }

  const movePageDown = (index: number) => {
    if (!loadedPDF || index >= loadedPDF.pages.length - 1) return

    setLoadedPDF((prev) => {
      if (!prev) return prev
      const newPages = [...prev.pages]
      ;[newPages[index], newPages[index + 1]] = [newPages[index + 1], newPages[index]]
      return { ...prev, pages: newPages }
    })

    // Update selection
    setSelectedPages((prev) => {
      const newSet = new Set<number>()
      prev.forEach((i) => {
        if (i === index) newSet.add(i + 1)
        else if (i === index + 1) newSet.add(i - 1)
        else newSet.add(i)
      })
      return newSet
    })
  }

  const handleSave = async () => {
    if (!loadedPDF) return

    setIsProcessing(true)

    try {
      const sourcePdf = await PDFDocument.load(loadedPDF.arrayBuffer)
      const newPdf = await PDFDocument.create()

      for (const pageInfo of loadedPDF.pages) {
        const [copiedPage] = await newPdf.copyPages(sourcePdf, [pageInfo.pageIndex])

        // Apply rotation
        const currentRotation = copiedPage.getRotation().angle
        const newRotation = pageInfo.rotation
        if (currentRotation !== newRotation) {
          copiedPage.setRotation(degrees(newRotation))
        }

        newPdf.addPage(copiedPage)
      }

      const pdfBytes = await newPdf.save()

      // Download
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `edited_${loadedPDF.name}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Reset
      setLoadedPDF(null)
      setSelectedPages(new Set())
    } catch (err) {
      console.error('Error saving PDF:', err)
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('edit.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('edit.description')}</p>
      </div>

      {!loadedPDF ? (
        <FileDropZone
          onFilesAdded={handleFilesAdded}
          multiple={false}
          dropzoneText={t('edit.dropzone')}
        />
      ) : (
        <div className="space-y-4">
          {/* File info and toolbar */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-red-600 dark:text-red-400 font-bold text-sm">PDF</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{loadedPDF.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {loadedPDF.pages.length} {t('common.pages')} • {loadedPDF.size}
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

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                {selectedPages.size} selected
              </span>

              <button
                onClick={selectAll}
                className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
              >
                {t('edit.selectAll')}
              </button>
              <button
                onClick={deselectAll}
                className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
              >
                {t('edit.deselectAll')}
              </button>

              <div className="w-px h-6 bg-gray-200 dark:border-gray-700 mx-2" />

              <button
                onClick={() => rotatePages('left')}
                disabled={selectedPages.size === 0}
                className="px-3 py-1.5 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                {t('edit.rotateLeft')}
              </button>
              <button
                onClick={() => rotatePages('right')}
                disabled={selectedPages.size === 0}
                className="px-3 py-1.5 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <svg className="w-4 h-4 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                {t('edit.rotateRight')}
              </button>

              <div className="w-px h-6 bg-gray-200 dark:border-gray-700 mx-2" />

              <button
                onClick={deleteSelectedPages}
                disabled={selectedPages.size === 0}
                className="px-3 py-1.5 text-xs bg-red-100 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {t('edit.delete')}
              </button>
            </div>
          </div>

          {/* Page grid with drag and drop */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {t('edit.selectPages')}
              </p>
              <p className="text-xs text-gray-400">
                {t('edit.dragToReorder') || 'Arrastra para reordenar'}
              </p>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={loadedPDF.pages.map((p) => p.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {loadedPDF.pages.map((pageInfo, index) => (
                    <SortablePageItem
                      key={pageInfo.id}
                      id={pageInfo.id}
                      pageInfo={pageInfo}
                      index={index}
                      pdfData={loadedPDF.arrayBuffer}
                      isSelected={selectedPages.has(index)}
                      onToggle={() => togglePage(index)}
                      onMoveUp={() => movePageUp(index)}
                      onMoveDown={() => movePageDown(index)}
                      isFirst={index === 0}
                      isLast={index === loadedPDF.pages.length - 1}
                      t={t}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={isProcessing}
            className="w-full py-4 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? t('common.processing') : t('edit.saveButton')}
          </button>
        </div>
      )}
    </div>
  )
}
