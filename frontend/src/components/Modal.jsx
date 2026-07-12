export default function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-[0_18px_40px_rgba(28,36,48,0.16)] ${
          wide ? 'max-w-2xl' : 'max-w-lg'
        }`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-canvas"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
