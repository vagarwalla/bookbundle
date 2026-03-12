'use client'

// Demo page showing 4 shelf visual variants side by side.
// Visit /shelf-demo to compare. Delete this file when done.

const MOCK_BOOKS = [
  {
    id: '1',
    title: 'The Secret History',
    author: 'Donna Tartt',
    cover_url: 'https://covers.openlibrary.org/b/isbn/9780679410324-M.jpg',
    spineColor: '#2d4a3e',
  },
  {
    id: '2',
    title: 'Middlemarch',
    author: 'George Eliot',
    cover_url: 'https://covers.openlibrary.org/b/isbn/9780141439549-M.jpg',
    spineColor: '#5c3d2e',
  },
  {
    id: '3',
    title: 'Never Let Me Go',
    author: 'Kazuo Ishiguro',
    cover_url: 'https://covers.openlibrary.org/b/isbn/9781400078776-M.jpg',
    spineColor: '#3b3f6b',
  },
  {
    id: '4',
    title: 'Beloved',
    author: 'Toni Morrison',
    cover_url: 'https://covers.openlibrary.org/b/isbn/9781400033416-M.jpg',
    spineColor: '#7a3030',
  },
]

function BookCard({ book }: { book: typeof MOCK_BOOKS[0] }) {
  return (
    <div className="flex gap-3 p-3 rounded-lg border bg-card">
      <div className="shrink-0 w-14 h-20 rounded overflow-hidden bg-muted">
        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-base leading-tight">{book.title}</div>
        <div className="text-sm text-muted-foreground mt-0.5">{book.author}</div>
        <div className="flex gap-1 mt-2">
          <span className="text-xs px-2 py-0.5 rounded border text-muted-foreground">Good</span>
          <span className="text-xs px-2 py-0.5 rounded border text-muted-foreground">Fine</span>
        </div>
      </div>
    </div>
  )
}

// ─── Option A: Billy shelf — flat bold plank, light wall ─────────────────────
function ShelfA() {
  return (
    <div>
      {/* Bookcase wall */}
      <div
        style={{
          background: 'oklch(0.94 0.018 72)',
          border: '2px solid oklch(0.76 0.040 58)',
          borderBottom: 'none',
          borderRadius: '6px 6px 0 0',
          padding: '10px 10px 6px',
          boxShadow: 'inset 3px 0 8px -3px oklch(0 0 0 / 12%), inset -3px 0 8px -3px oklch(0 0 0 / 12%)',
        }}
      >
        <div className="space-y-2">
          {MOCK_BOOKS.map((b) => <BookCard key={b.id} book={b} />)}
        </div>
      </div>
      {/* Shelf plank — flat bold color, top-edge highlight */}
      <div
        style={{
          height: '18px',
          background: 'oklch(0.58 0.052 50)',
          borderLeft: '2px solid oklch(0.76 0.040 58)',
          borderRight: '2px solid oklch(0.76 0.040 58)',
          borderBottom: '2px solid oklch(0.48 0.045 48)',
          borderRadius: '0 0 4px 4px',
          position: 'relative',
          boxShadow: '0 5px 12px oklch(0 0 0 / 30%)',
        }}
      >
        {/* top-edge highlight */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '3px',
          background: 'oklch(0.74 0.048 58)',
          borderRadius: '0',
        }} />
      </div>
    </div>
  )
}

// ─── Option B: SVG bracket shelf ─────────────────────────────────────────────
function BracketSvg() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="5" height="18" rx="1.5" fill="oklch(0.58 0.052 50)" />
      <rect x="2" y="17" width="18" height="4" rx="1.5" fill="oklch(0.58 0.052 50)" />
      <rect x="2" y="2" width="5" height="18" rx="1.5" fill="oklch(0.72 0.040 55)" fillOpacity="0.35" />
    </svg>
  )
}
function BracketSvgFlip() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'scaleX(-1)' }}>
      <rect x="2" y="2" width="5" height="18" rx="1.5" fill="oklch(0.58 0.052 50)" />
      <rect x="2" y="17" width="18" height="4" rx="1.5" fill="oklch(0.58 0.052 50)" />
      <rect x="2" y="2" width="5" height="18" rx="1.5" fill="oklch(0.72 0.040 55)" fillOpacity="0.35" />
    </svg>
  )
}

function ShelfB() {
  return (
    <div>
      <div className="space-y-2 mb-0">
        {MOCK_BOOKS.map((b) => <BookCard key={b.id} book={b} />)}
      </div>
      {/* Shelf bar + brackets */}
      <div className="relative mt-1 flex items-end">
        <div style={{ position: 'absolute', left: '-4px', bottom: '0', zIndex: 1 }}>
          <BracketSvg />
        </div>
        <div style={{
          flex: 1,
          height: '8px',
          background: 'oklch(0.60 0.050 52)',
          borderRadius: '2px',
          boxShadow: '0 4px 10px oklch(0 0 0 / 28%)',
          margin: '0 14px',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: '2px',
            background: 'oklch(0.74 0.042 56)',
            borderRadius: '2px 2px 0 0',
          }} />
        </div>
        <div style={{ position: 'absolute', right: '-4px', bottom: '0', zIndex: 1 }}>
          <BracketSvgFlip />
        </div>
      </div>
    </div>
  )
}

// ─── Option C: Book spines ────────────────────────────────────────────────────
const SPINE_COLORS = [
  { bg: '#2d4a3e', text: '#c8e6c9' },
  { bg: '#5c3d2e', text: '#f5e6d3' },
  { bg: '#3b3f6b', text: '#cfd3f5' },
  { bg: '#7a3030', text: '#f5d0d0' },
]

function ShelfC() {
  return (
    <div>
      {/* Shelf wall */}
      <div
        style={{
          background: 'oklch(0.94 0.018 72)',
          border: '2px solid oklch(0.76 0.040 58)',
          borderBottom: 'none',
          borderRadius: '6px 6px 0 0',
          padding: '24px 16px 0',
          minHeight: '160px',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '6px',
          boxShadow: 'inset 0 6px 14px oklch(0 0 0 / 12%)',
        }}
      >
        {MOCK_BOOKS.map((b, i) => {
          const c = SPINE_COLORS[i % SPINE_COLORS.length]
          const heights = [148, 136, 160, 142]
          return (
            <div
              key={b.id}
              title={`${b.title} — ${b.author}`}
              style={{
                width: '46px',
                height: `${heights[i]}px`,
                background: c.bg,
                borderRadius: '2px 2px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '2px 0 4px oklch(0 0 0 / 20%), inset 1px 0 0 oklch(1 0 0 / 10%)',
                flexShrink: 0,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <span style={{
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
                color: c.text,
                fontSize: '10px',
                fontFamily: 'var(--font-serif, Georgia, serif)',
                fontWeight: '600',
                letterSpacing: '0.04em',
                padding: '6px 0',
                lineHeight: 1.2,
                textAlign: 'center',
                overflow: 'hidden',
                maxHeight: '90%',
              }}>
                {b.title}
              </span>
            </div>
          )
        })}
        {/* Leaning gap filler */}
        <div style={{
          flex: 1,
          height: '100px',
          borderRadius: '2px 2px 0 0',
          background: 'oklch(0.90 0.020 70)',
          opacity: 0.4,
        }} />
      </div>
      {/* Plank */}
      <div style={{
        height: '18px',
        background: 'oklch(0.58 0.052 50)',
        border: '2px solid oklch(0.76 0.040 58)',
        borderTop: '3px solid oklch(0.74 0.048 58)',
        borderRadius: '0 0 4px 4px',
        boxShadow: '0 5px 12px oklch(0 0 0 / 30%)',
      }} />
      <p className="text-xs text-muted-foreground mt-2 text-center">Hover for title · Click to expand</p>
    </div>
  )
}

// ─── Option D: Floating shelf shadow ─────────────────────────────────────────
function ShelfD() {
  return (
    <div>
      <div
        style={{
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 16px 32px -8px oklch(0.42 0.032 55 / 0.45), 0 4px 8px oklch(0 0 0 / 10%)',
        }}
      >
        <div className="space-y-2 p-3 bg-card">
          {MOCK_BOOKS.map((b) => <BookCard key={b.id} book={b} />)}
        </div>
      </div>
      {/* Shelf surface edge visible below */}
      <div style={{
        margin: '0 8px',
        height: '10px',
        background: 'oklch(0.78 0.030 65)',
        borderRadius: '0 0 6px 6px',
        boxShadow: '0 6px 14px oklch(0 0 0 / 20%)',
      }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ShelfDemoPage() {
  return (
    <main className="min-h-screen bg-background py-10 px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-serif text-3xl font-bold mb-2">Shelf variants</h1>
        <p className="text-muted-foreground mb-10">Four approaches — pick your favourite.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <h2 className="font-serif text-xl font-semibold mb-1">A — Billy shelf</h2>
            <p className="text-sm text-muted-foreground mb-4">Bookcase walls + bold flat plank with highlight edge. Confident & solid.</p>
            <ShelfA />
          </div>

          <div>
            <h2 className="font-serif text-xl font-semibold mb-1">B — Bracket shelf</h2>
            <p className="text-sm text-muted-foreground mb-4">No walls — just a clean bar with illustrated L-brackets at each end. Minimal & design-forward.</p>
            <ShelfB />
          </div>

          <div>
            <h2 className="font-serif text-xl font-semibold mb-1">C — Book spines</h2>
            <p className="text-sm text-muted-foreground mb-4">Books shown as upright spines. Most literal, most whimsical. Hover to see title.</p>
            <ShelfC />
          </div>

          <div>
            <h2 className="font-serif text-xl font-semibold mb-1">D — Floating shadow</h2>
            <p className="text-sm text-muted-foreground mb-4">No explicit shelf — just a warm drop shadow and a surface edge. Clean, implied depth.</p>
            <ShelfD />
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-16 text-center">
          Delete <code className="text-xs bg-muted px-1 py-0.5 rounded">src/app/shelf-demo/page.tsx</code> once you&apos;ve decided.
        </p>
      </div>
    </main>
  )
}
