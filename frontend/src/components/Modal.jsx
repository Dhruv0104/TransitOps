export default function Modal({ title, onClose, children, wide = false, xl = false }) {
  const width = xl ? 'max-w-4xl' : wide ? 'max-w-2xl' : 'max-w-lg'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className={`flex max-h-[90vh] w-full flex-col rounded-2xl border border-line bg-surface shadow-2xl shadow-black/40 ${width}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-6 py-4">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-panel hover:text-ink"
          >
            Close
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  )
}
