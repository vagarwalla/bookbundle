'use client'

import { useState, useEffect } from 'react'
import { Loader2, Check } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { BookSearchResult, Edition, Format } from '@/lib/types'

interface Props {
  book: BookSearchResult | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: (edition: Edition) => void
}

const FORMAT_LABELS: Record<Format, string> = {
  any: 'All',
  hardcover: 'Hardcover',
  paperback: 'Paperback',
}

export function EditionPicker({ book, open, onOpenChange, onConfirm }: Props) {
  const [editions, setEditions] = useState<Edition[]>([])
  const [loading, setLoading] = useState(false)
  const [formatFilter, setFormatFilter] = useState<Format>('any')
  const [selected, setSelected] = useState<Edition | null>(null)

  useEffect(() => {
    if (!book || !open) return
    setLoading(true)
    setEditions([])
    setSelected(null)
    fetch(`/api/editions?workId=${encodeURIComponent(book.work_id)}`)
      .then((r) => r.json())
      .then((data) => {
        setEditions(data)
        setLoading(false)
      })
  }, [book, open])

  const filtered = editions.filter((e) =>
    formatFilter === 'any' ? true : e.format === formatFilter || e.format === 'any'
  )

  function handleConfirm() {
    if (!selected) return
    onConfirm(selected)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose edition — {book?.title}</DialogTitle>
        </DialogHeader>

        {/* Format filter */}
        <div className="flex gap-2 shrink-0">
          {(['any', 'hardcover', 'paperback'] as Format[]).map((f) => (
            <Button
              key={f}
              variant={formatFilter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFormatFilter(f)}
            >
              {FORMAT_LABELS[f]}
            </Button>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No editions found for this filter.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 py-2">
              {filtered.map((edition) => (
                <button
                  key={edition.isbn}
                  onClick={() => setSelected(edition)}
                  className={`relative rounded-lg p-1.5 text-left transition-all border-2 ${
                    selected?.isbn === edition.isbn
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent hover:border-border'
                  }`}
                >
                  {selected?.isbn === edition.isbn && (
                    <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                  <div className="aspect-[2/3] bg-muted rounded overflow-hidden mb-1.5">
                    {edition.cover_url ? (
                      <img
                        src={edition.cover_url}
                        alt={edition.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-1 text-center">
                        No cover
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-tight">
                    <div className="font-medium text-foreground truncate">{edition.publisher || 'Unknown'}</div>
                    <div>{edition.publish_year || '?'}</div>
                    {edition.format !== 'any' && (
                      <div className="capitalize">{edition.format}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 shrink-0 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selected} className="flex-1">
            {selected ? `Add "${selected.publisher || selected.isbn}"` : 'Select an edition'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
