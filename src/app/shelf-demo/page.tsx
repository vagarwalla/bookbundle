'use client'

// Demo page — shelf visual explorations. Delete when done.

const MOCK_BOOKS = [
  {
    id: '1',
    title: 'The Secret History',
    author: 'Donna Tartt',
    cover_url: 'https://covers.openlibrary.org/b/isbn/9780679410324-M.jpg',
  },
  {
    id: '2',
    title: 'Middlemarch',
    author: 'George Eliot',
    cover_url: 'https://covers.openlibrary.org/b/isbn/9780141439549-M.jpg',
  },
  {
    id: '3',
    title: 'Never Let Me Go',
    author: 'Kazuo Ishiguro',
    cover_url: 'https://covers.openlibrary.org/b/isbn/9781400078776-M.jpg',
  },
  {
    id: '4',
    title: 'Beloved',
    author: 'Toni Morrison',
    cover_url: 'https://covers.openlibrary.org/b/isbn/9781400033416-M.jpg',
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

// ─── A: 3D plank — visible top face + front face ─────────────────────────────
// The shelf has real thickness: a lighter "lit top surface" sits above
// a darker "front face", giving an isometric sense of depth.
function ShelfA() {
  return (
    <div>
      {/* Back wall — warm linen with side walls hinted by inner shadow */}
      <div style={{
        background: 'oklch(0.93 0.020 72)',
        border: '2px solid oklch(0.74 0.040 56)',
        borderBottom: 'none',
        borderRadius: '6px 6px 0 0',
        padding: '10px 10px 8px',
        boxShadow:
          'inset 5px 0 10px -4px oklch(0 0 0 / 14%), inset -5px 0 10px -4px oklch(0 0 0 / 14%), inset 0 6px 14px -4px oklch(0 0 0 / 16%)',
      }}>
        <div className="space-y-2">
          {MOCK_BOOKS.map((b) => <BookCard key={b.id} book={b} />)}
        </div>
      </div>

      {/* Top face of plank — lit surface */}
      <div style={{
        height: '7px',
        background: 'oklch(0.73 0.046 58)',
        borderLeft: '2px solid oklch(0.74 0.040 56)',
        borderRight: '2px solid oklch(0.74 0.040 56)',
        borderTop: '1px solid oklch(0.80 0.042 60)',
      }} />

      {/* Front face of plank — darker, the "face" you see head-on */}
      <div style={{
        height: '16px',
        background: 'oklch(0.54 0.058 50)',
        borderLeft: '2px solid oklch(0.50 0.052 48)',
        borderRight: '2px solid oklch(0.50 0.052 48)',
        borderBottom: '2px solid oklch(0.44 0.046 46)',
        borderRadius: '0 0 4px 4px',
        boxShadow: '0 7px 16px oklch(0 0 0 / 32%)',
      }} />
    </div>
  )
}

// ─── B: Wood grain plank ──────────────────────────────────────────────────────
// Subtle grain lines via layered repeating-linear-gradient. Still flat-ish
// but reads clearly as wood. Side walls more prominent here.
function ShelfB() {
  const grain = `
    repeating-linear-gradient(90deg, transparent 0, transparent 43px, oklch(0 0 0 / 5%) 43px, oklch(0 0 0 / 5%) 44px),
    repeating-linear-gradient(90deg, transparent 0, transparent 69px, oklch(0 0 0 / 3%) 69px, oklch(0 0 0 / 3%) 70.5px),
    repeating-linear-gradient(90deg, transparent 0, transparent 28px, oklch(0 0 0 / 3%) 28px, oklch(0 0 0 / 3%) 29px),
    repeating-linear-gradient(90deg, transparent 0, transparent 91px, oklch(1 0 0 / 6%) 91px, oklch(1 0 0 / 6%) 92.5px),
    oklch(0.59 0.054 51)
  `
  const wallGrain = `
    repeating-linear-gradient(180deg, transparent 0, transparent 28px, oklch(0 0 0 / 4%) 28px, oklch(0 0 0 / 4%) 29px),
    oklch(0.93 0.020 72)
  `

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
      {/* Left wall panel */}
      <div style={{
        width: '14px',
        background: wallGrain,
        border: '2px solid oklch(0.72 0.038 56)',
        borderRight: '1px solid oklch(0.68 0.035 54)',
        borderBottom: 'none',
        borderRadius: '6px 0 0 0',
        flexShrink: 0,
        boxShadow: 'inset -3px 0 6px oklch(0 0 0 / 14%)',
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Back wall */}
        <div style={{
          background: 'oklch(0.945 0.016 73)',
          borderTop: '2px solid oklch(0.72 0.038 56)',
          borderBottom: 'none',
          padding: '10px 10px 8px',
          boxShadow: 'inset 0 5px 12px oklch(0 0 0 / 10%)',
        }}>
          <div className="space-y-2">
            {MOCK_BOOKS.map((b) => <BookCard key={b.id} book={b} />)}
          </div>
        </div>

        {/* Grain plank */}
        <div style={{
          height: '22px',
          background: grain,
          borderTop: '2px solid oklch(0.70 0.044 57)',
          borderBottom: '2px solid oklch(0.44 0.046 46)',
          boxShadow: '0 6px 14px oklch(0 0 0 / 30%)',
          position: 'relative',
        }}>
          {/* Highlight streak */}
          <div style={{
            position: 'absolute',
            top: '3px',
            left: '5%',
            width: '18%',
            height: '2px',
            background: 'oklch(1 0 0 / 18%)',
            borderRadius: '2px',
          }} />
        </div>
      </div>

      {/* Right wall panel */}
      <div style={{
        width: '14px',
        background: wallGrain,
        border: '2px solid oklch(0.72 0.038 56)',
        borderLeft: '1px solid oklch(0.68 0.035 54)',
        borderBottom: 'none',
        borderRadius: '0 6px 0 0',
        flexShrink: 0,
        boxShadow: 'inset 3px 0 6px oklch(0 0 0 / 14%)',
      }} />
    </div>
  )
}

// ─── C: Overhanging plank with book shadows ───────────────────────────────────
// The shelf plank is wider than the content area — it extends beyond the
// sides. Books cast a gradient shadow down onto the shelf surface.
// No explicit walls; the overhang reads immediately as a physical shelf.
function ShelfC() {
  return (
    <div style={{ padding: '0 0px' }}>
      {/* Book list — no walls, open feel */}
      <div style={{
        background: 'oklch(0.955 0.013 74)',
        border: '1px solid oklch(0.84 0.020 68)',
        borderBottom: 'none',
        borderRadius: '6px 6px 0 0',
        padding: '10px 10px 0',
      }}>
        <div className="space-y-2">
          {MOCK_BOOKS.map((b) => <BookCard key={b.id} book={b} />)}
        </div>

        {/* Shadow the books cast onto the shelf below them */}
        <div style={{
          height: '12px',
          background: 'linear-gradient(to bottom, oklch(0 0 0 / 12%), transparent)',
          marginTop: '6px',
          marginLeft: '-10px',
          marginRight: '-10px',
        }} />
      </div>

      {/* Shelf plank — wider than the container (overhangs on both sides) */}
      <div style={{ margin: '0 -10px' }}>
        {/* Top surface */}
        <div style={{
          height: '6px',
          background: 'oklch(0.72 0.048 58)',
          borderTop: '1px solid oklch(0.80 0.044 60)',
        }} />
        {/* Front face */}
        <div style={{
          height: '18px',
          background: 'oklch(0.57 0.056 51)',
          borderBottom: '2px solid oklch(0.46 0.048 47)',
          borderRadius: '0 0 3px 3px',
          boxShadow: '0 8px 18px oklch(0 0 0 / 36%)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* subtle highlight streak */}
          <div style={{
            position: 'absolute',
            top: '3px', left: '8%', width: '12%', height: '2px',
            background: 'oklch(1 0 0 / 15%)', borderRadius: '2px',
          }} />
          <div style={{
            position: 'absolute',
            top: '3px', left: '60%', width: '8%', height: '1.5px',
            background: 'oklch(1 0 0 / 10%)', borderRadius: '2px',
          }} />
        </div>
      </div>
    </div>
  )
}

// ─── D: Heavy bookcase — deep walls, thick plank, routed edge ─────────────────
// Thick side panels, visible back wall, a substantial plank with a
// routed/rounded front edge detail. Looks like a real piece of furniture.
function ShelfD() {
  const plankFront = `
    linear-gradient(to bottom,
      oklch(0.70 0.048 57) 0%,
      oklch(0.58 0.056 51) 15%,
      oklch(0.55 0.058 50) 60%,
      oklch(0.50 0.055 48) 85%,
      oklch(0.44 0.048 46) 100%
    )
  `

  return (
    <div style={{ display: 'flex', alignItems: 'stretch' }}>
      {/* Left thick wall */}
      <div style={{
        width: '22px',
        flexShrink: 0,
        background: `
          linear-gradient(to right, oklch(0.60 0.050 50), oklch(0.72 0.044 56) 40%, oklch(0.68 0.042 54))
        `,
        border: '2px solid oklch(0.56 0.050 48)',
        borderRight: '1px solid oklch(0.64 0.044 52)',
        borderBottom: 'none',
        borderRadius: '8px 0 0 0',
        boxShadow: 'inset -4px 0 8px oklch(0 0 0 / 20%)',
      }}>
        {/* Shelf peg holes for realism */}
        {[30, 80, 130].map((top) => (
          <div key={top} style={{
            width: '5px', height: '5px',
            borderRadius: '50%',
            background: 'oklch(0.42 0.040 46)',
            margin: `${top}px auto 0`,
            boxShadow: 'inset 0 1px 2px oklch(0 0 0 / 40%)',
          }} />
        ))}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Back wall / interior */}
        <div style={{
          background: 'oklch(0.938 0.018 72)',
          borderTop: '2px solid oklch(0.56 0.050 48)',
          borderBottom: 'none',
          padding: '12px 10px 10px',
          boxShadow: 'inset 0 6px 16px oklch(0 0 0 / 14%)',
        }}>
          <div className="space-y-2">
            {MOCK_BOOKS.map((b) => <BookCard key={b.id} book={b} />)}
          </div>
        </div>

        {/* Thick shelf plank with gradient front face */}
        <div>
          {/* Routed top edge — slight rounded bevel */}
          <div style={{
            height: '5px',
            background: 'linear-gradient(to bottom, oklch(0.78 0.044 60), oklch(0.70 0.048 57))',
            borderTop: '1px solid oklch(0.80 0.042 60)',
          }} />
          {/* Main plank face */}
          <div style={{
            height: '22px',
            background: plankFront,
            borderBottom: '2px solid oklch(0.40 0.044 45)',
            boxShadow: '0 8px 20px oklch(0 0 0 / 38%)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Grain highlights */}
            <div style={{ position: 'absolute', top: '4px', left: '7%', width: '20%', height: '1.5px', background: 'oklch(1 0 0 / 14%)', borderRadius: '2px' }} />
            <div style={{ position: 'absolute', top: '8px', left: '7%', width: '13%', height: '1px', background: 'oklch(1 0 0 / 8%)', borderRadius: '2px' }} />
            <div style={{ position: 'absolute', top: '4px', left: '55%', width: '10%', height: '1.5px', background: 'oklch(1 0 0 / 10%)', borderRadius: '2px' }} />
          </div>
        </div>
      </div>

      {/* Right thick wall */}
      <div style={{
        width: '22px',
        flexShrink: 0,
        background: `
          linear-gradient(to left, oklch(0.60 0.050 50), oklch(0.72 0.044 56) 40%, oklch(0.68 0.042 54))
        `,
        border: '2px solid oklch(0.56 0.050 48)',
        borderLeft: '1px solid oklch(0.64 0.044 52)',
        borderBottom: 'none',
        borderRadius: '0 8px 0 0',
        boxShadow: 'inset 4px 0 8px oklch(0 0 0 / 20%)',
      }}>
        {[30, 80, 130].map((top) => (
          <div key={top} style={{
            width: '5px', height: '5px',
            borderRadius: '50%',
            background: 'oklch(0.42 0.040 46)',
            margin: `${top}px auto 0`,
            boxShadow: 'inset 0 1px 2px oklch(0 0 0 / 40%)',
          }} />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ShelfDemoPage() {
  return (
    <main className="min-h-screen bg-background py-10 px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-serif text-3xl font-bold mb-1">Shelf variants — round 2</h1>
        <p className="text-muted-foreground mb-10">All four are more shelf-like than before. A/B are the cleanest; C/D are more illustrative.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14">
          <div>
            <h2 className="font-serif text-xl font-semibold mb-1">A — 3D plank</h2>
            <p className="text-sm text-muted-foreground mb-4">Visible top-face + front-face split on the plank, giving real depth. Walls via shadow only.</p>
            <ShelfA />
          </div>

          <div>
            <h2 className="font-serif text-xl font-semibold mb-1">B — Wood grain + side walls</h2>
            <p className="text-sm text-muted-foreground mb-4">CSS grain lines on the plank, actual rendered side wall panels on left/right.</p>
            <ShelfB />
          </div>

          <div>
            <h2 className="font-serif text-xl font-semibold mb-1">C — Overhang + book shadows</h2>
            <p className="text-sm text-muted-foreground mb-4">Plank is wider than the content area (overhangs). Books cast a soft shadow down onto the shelf surface.</p>
            <ShelfC />
          </div>

          <div>
            <h2 className="font-serif text-xl font-semibold mb-1">D — Heavy bookcase</h2>
            <p className="text-sm text-muted-foreground mb-4">Thick side panels with shelf peg holes, gradient wall faces, thick plank with bevel edge. Most realistic/furniture-like.</p>
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
