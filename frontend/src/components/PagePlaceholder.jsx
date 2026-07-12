export default function PagePlaceholder({ title, description }) {
  return (
    <section>
      <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      <p className="mt-1 text-sm text-muted">{description}</p>
      <div className="mt-5 rounded-xl border border-dashed border-line bg-surface p-5 text-sm text-muted">
        Module scaffold ready for team implementation.
      </div>
    </section>
  )
}
