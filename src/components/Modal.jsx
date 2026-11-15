import { useI18n } from '../lib/i18n.jsx'

export default function Modal({ title, onClose, children }) {
  const { t } = useI18n()
  return (
    <div className="fixed inset-0 bg-ink/40 flex items-start justify-center overflow-y-auto p-4 z-20" onClick={onClose}>
      <div className="bg-chalk rounded-md w-full max-w-lg mt-10 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">{t(title)}</h2>
          <button onClick={onClose} className="text-muted underline underline-offset-4 text-sm">{t('Close')}</button>
        </div>
        {children}
      </div>
    </div>
  )
}
