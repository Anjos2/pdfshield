import { useTranslation } from 'react-i18next'
import yapeQR from '/yape-qr.jpeg'

interface DonateModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function DonateModal({ isOpen, onClose }: DonateModalProps) {
  const { t } = useTranslation()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>❤️</span> {t('donate.title')}
            </h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-primary-100 text-sm mt-1">{t('donate.subtitle')}</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Yape QR */}
          <div className="text-center">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center justify-center gap-2">
              <span className="text-2xl">📱</span> Yape
            </h3>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 inline-block">
              <img
                src={yapeQR}
                alt="Yape QR Code"
                className="w-64 h-64 object-contain mx-auto rounded-lg"
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('donate.scanQR')}</p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
            <span className="text-sm text-gray-400">{t('donate.or')}</span>
            <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
          </div>

          {/* Patreon - abre en navegador externo */}
          <div className="text-center">
            <button
              onClick={() => window.open('http://patreon.com/Anjos604', '_blank')}
              className="inline-flex items-center gap-3 px-6 py-3 bg-[#FF424D] hover:bg-[#e63946] text-white font-medium rounded-xl transition-colors"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.386 2c-3.236 0-5.864 2.627-5.864 5.863 0 3.235 2.628 5.864 5.864 5.864 3.235 0 5.863-2.629 5.863-5.864C21.249 4.627 18.621 2 15.386 2zM2.75 22h3.727V2H2.75v20z"/>
              </svg>
              {t('donate.patreon')}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">{t('donate.thanks')}</p>
        </div>
      </div>
    </div>
  )
}
