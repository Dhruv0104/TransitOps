export default function Modal({ title, onClose, children, wide = false, xl = false }) {
  const width = xl ? 'max-w-4xl' : wide ? 'max-w-2xl' : 'max-w-lg'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-2xl shadow-black/40 ${width}`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-panel hover:text-ink"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
