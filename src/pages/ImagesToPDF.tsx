import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
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

interface ImageFile {
  id: string
  file: File
  name: string
  size: string
  preview: string
}

// Sortable Image Item Component
interface SortableImageItemProps {
  image: ImageFile
  index: number
  totalImages: number
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}

function SortableImageItem({
  image,
  index,
  totalImages,
  onMoveUp,
  onMoveDown,
  onRemove,
}: SortableImageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id })

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
      className={`relative group border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 ${
        isDragging ? 'shadow-2xl ring-2 ring-primary-500' : ''
      }`}
    >
      {/* Drag handle - the whole card is draggable */}
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing"
      />

      <img
        src={image.preview}
        alt={image.name}
        className="w-full h-32 object-cover"
      />
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onMoveUp()
          }}
          disabled={index === 0}
          className="p-2 bg-white dark:bg-gray-800 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          ←
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600"
        >
          ✕
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onMoveDown()
          }}
          disabled={index === totalImages - 1}
          className="p-2 bg-white dark:bg-gray-800 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          →
        </button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 z-0">
        <p className="text-xs text-white truncate">{image.name}</p>
      </div>
      <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded z-0">
        {index + 1}
      </div>
    </div>
  )
}

export default function ImagesToPDF() {
  const { t } = useTranslation()
  const [images, setImages] = useState<ImageFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

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
      setImages((items) => {
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

  const handleFilesAdded = useCallback(async (files: File[]) => {
    const newImages: ImageFile[] = []

    for (const file of files) {
      const preview = URL.createObjectURL(file)
      newImages.push({
        id: crypto.randomUUID(),
        file,
        name: file.name,
        size: formatFileSize(file.size),
        preview,
      })
    }

    setImages((prev) => [...prev, ...newImages])
  }, [])

  const removeImage = (id: string) => {
    setImages((prev) => {
      const image = prev.find((img) => img.id === id)
      if (image) {
        URL.revokeObjectURL(image.preview)
      }
      return prev.filter((img) => img.id !== id)
    })
  }

  const moveImage = (fromIndex: number, toIndex: number) => {
    setImages((prev) => {
      const newImages = [...prev]
      const [removed] = newImages.splice(fromIndex, 1)
      newImages.splice(toIndex, 0, removed)
      return newImages
    })
  }

  const handleCreate = async () => {
    if (images.length === 0) return

    setIsProcessing(true)

    try {
      const pdfDoc = await PDFDocument.create()

      for (const image of images) {
        const arrayBuffer = await image.file.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)

        let img
        const extension = image.name.toLowerCase().split('.').pop()

        if (extension === 'png') {
          img = await pdfDoc.embedPng(uint8Array)
        } else if (extension === 'jpg' || extension === 'jpeg') {
          img = await pdfDoc.embedJpg(uint8Array)
        } else {
          // Try to detect from content
          try {
            img = await pdfDoc.embedPng(uint8Array)
          } catch {
            img = await pdfDoc.embedJpg(uint8Array)
          }
        }

        const page = pdfDoc.addPage([img.width, img.height])
        page.drawImage(img, {
          x: 0,
          y: 0,
          width: img.width,
          height: img.height,
        })
      }

      const pdfBytes = await pdfDoc.save()

      // Download
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'images.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Cleanup
      images.forEach((img) => URL.revokeObjectURL(img.preview))
      setImages([])
    } catch (err) {
      console.error('Error creating PDF:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const clearAll = () => {
    images.forEach((img) => URL.revokeObjectURL(img.preview))
    setImages([])
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('imagesToPdf.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('imagesToPdf.description')}</p>
      </div>

      {images.length === 0 ? (
        <FileDropZone
          onFilesAdded={handleFilesAdded}
          accept={{
            'image/png': ['.png'],
            'image/jpeg': ['.jpg', '.jpeg'],
          }}
          dropzoneText={t('imagesToPdf.dropzone')}
        />
      ) : (
        <div className="space-y-4">
          {/* Image grid */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {images.length} {images.length === 1 ? 'image' : 'images'}
              </span>
              <button
                onClick={clearAll}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-700"
              >
                {t('common.clear')}
              </button>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={images.map((img) => img.id)}
                strategy={rectSortingStrategy}
              >
                <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {images.map((image, index) => (
                    <SortableImageItem
                      key={image.id}
                      image={image}
                      index={index}
                      totalImages={images.length}
                      onMoveUp={() => moveImage(index, index - 1)}
                      onMoveDown={() => moveImage(index, index + 1)}
                      onRemove={() => removeImage(image.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* Add more */}
          <FileDropZone
            onFilesAdded={handleFilesAdded}
            accept={{
              'image/png': ['.png'],
              'image/jpeg': ['.jpg', '.jpeg'],
            }}
            dropzoneText={t('common.addMore')}
          />

          {/* Create button */}
          <button
            onClick={handleCreate}
            disabled={images.length === 0 || isProcessing}
            className="w-full py-4 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? t('common.processing') : t('imagesToPdf.createButton')}
          </button>
        </div>
      )}
    </div>
  )
}
