import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle({ className = '' }) {
  const { theme, setTheme } = useTheme()

  return (
    <div
      className={`inline-flex rounded-lg border border-line bg-surface p-0.5 text-xs font-semibold ${className}`}
      role="group"
      aria-label="Color theme"
    >
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`rounded-md px-3 py-1.5 transition-colors ${
          theme === 'light'
            ? 'bg-accent text-white'
            : 'text-muted hover:text-ink'
        }`}
      >
        Light
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={`rounded-md px-3 py-1.5 transition-colors ${
          theme === 'dark'
            ? 'bg-accent text-white'
            : 'text-muted hover:text-ink'
        }`}
      >
        Dark
      </button>
    </div>
  )
}
