import { useCallback } from 'react'
import { useDropzone, Accept } from 'react-dropzone'
import { useTranslation } from 'react-i18next'

interface FileDropZoneProps {
  onFilesAdded: (files: File[]) => void
  accept?: Accept
  multiple?: boolean
  dropzoneText?: string
}

export default function FileDropZone({
  onFilesAdded,
  accept = { 'application/pdf': ['.pdf'] },
  multiple = true,
  dropzoneText,
}: FileDropZoneProps) {
  const { t } = useTranslation()

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesAdded(acceptedFiles)
    },
    [onFilesAdded]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple,
  })

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
        isDragActive
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
            {dropzoneText || t('common.selectFiles')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('common.dragDrop')}
          </p>
        </div>
      </div>
    </div>
  )
}
