export default function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-ink/40 flex items-start justify-center overflow-y-auto p-4 z-20" onClick={onClose}>
      <div className="bg-chalk rounded-md w-full max-w-lg mt-10 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted underline underline-offset-4 text-sm">Close</button>
        </div>
        {children}
      </div>
    </div>
  )
}
