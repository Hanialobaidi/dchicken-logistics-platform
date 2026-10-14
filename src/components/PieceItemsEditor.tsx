import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { CHICKEN_TYPES } from '@/types'
import type { InvoiceItem } from '@/types'

export interface PieceItemDraft {
  chickenType: string
  unitSize: string
  pieces: string
  pricePerPiece: string
}

export function emptyPieceItem(defaultType = CHICKEN_TYPES[0]): PieceItemDraft {
  return { chickenType: defaultType, unitSize: '', pieces: '', pricePerPiece: '' }
}

export function pieceItemsTotal(items: PieceItemDraft[]): number {
  return items.reduce((sum, it) => sum + (Number(it.pieces) || 0) * (Number(it.pricePerPiece) || 0), 0)
}

export function pieceItemsValid(items: PieceItemDraft[]): boolean {
  return (
    items.length > 0 &&
    items.every(
      (it) =>
        !!it.chickenType.trim() &&
        !!it.unitSize.trim() &&
        (Number(it.pieces) || 0) > 0 &&
        (Number(it.pricePerPiece) || 0) > 0,
    )
  )
}

export function toInvoiceItems(items: PieceItemDraft[]): InvoiceItem[] {
  return items.map((it) => ({
    chickenType: it.chickenType.trim(),
    unitSize: it.unitSize.trim(),
    pieces: Number(it.pieces) || 0,
    pricePerPiece: Number(it.pricePerPiece) || 0,
  }))
}

export function pieceItemsLabel(items: InvoiceItem[]): string {
  const types = Array.from(new Set(items.map((it) => it.chickenType.trim()).filter(Boolean)))
  return types.join(' / ') || CHICKEN_TYPES[0]
}

export function pieceItemsFromRecord(record: {
  items?: InvoiceItem[] | null
  chickenType?: string
  unitSize?: string | null
  pieces?: number
  pricePerPiece?: number
}): PieceItemDraft[] {
  if (record.items && record.items.length > 0) {
    return record.items.map((it) => ({
      chickenType: it.chickenType || CHICKEN_TYPES[0],
      unitSize: it.unitSize || '',
      pieces: it.pieces ? String(it.pieces) : '',
      pricePerPiece: it.pricePerPiece ? String(it.pricePerPiece) : '',
    }))
  }
  return [{
    chickenType: record.chickenType || CHICKEN_TYPES[0],
    unitSize: record.unitSize || '',
    pieces: record.pieces ? String(record.pieces) : '',
    pricePerPiece: record.pricePerPiece ? String(record.pricePerPiece) : '',
  }]
}

export function PieceItemsEditor({
  items,
  onChange,
  allChickenTypes,
  allChickenSizes,
}: {
  items: PieceItemDraft[]
  onChange: (items: PieceItemDraft[]) => void
  allChickenTypes: string[]
  allChickenSizes: string[]
}) {
  const listId = 'piece-items-datalist'
  const sizeListId = 'piece-sizes-datalist'

  const update = (index: number, patch: Partial<PieceItemDraft>) =>
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)))

  const add = () => onChange([...items, emptyPieceItem()])

  const remove = (index: number) => {
    if (items.length <= 1) return
    onChange(items.filter((_, i) => i !== index))
  }

  const total = pieceItemsTotal(items)

  return (
    <div className="space-y-3">
      <datalist id={listId}>
        {allChickenTypes.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <datalist id={sizeListId}>
        {allChickenSizes.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {items.map((it, i) => (
        <div
          key={i}
          className="relative space-y-3 rounded-lg border bg-muted/20 p-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">صنف {i + 1}</span>
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => remove(i)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                aria-label="حذف الصنف"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">نوع الدجاج <span className="text-destructive">*</span></Label>
              <Input
                list={listId}
                placeholder="مثال: شاورما فريش"
                value={it.chickenType}
                onChange={(e) => update(i, { chickenType: e.target.value })}
                className="text-right h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">الحجم <span className="text-destructive">*</span></Label>
              <Input
                list={sizeListId}
                placeholder="مثال: وسط"
                value={it.unitSize}
                onChange={(e) => update(i, { unitSize: e.target.value })}
                className="text-right h-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">عدد الحبات <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                step="1"
                min="0"
                placeholder="0"
                value={it.pieces}
                onChange={(e) => update(i, { pieces: e.target.value })}
                className="text-right h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">سعر الحبة (ريال) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={it.pricePerPiece}
                onChange={(e) => update(i, { pricePerPiece: e.target.value })}
                className="text-right h-10"
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={add}
        className="w-full gap-2 min-h-[44px] border-dashed"
      >
        <Plus className="h-4 w-4" />
        إضافة صنف
      </Button>
    </div>
  )
}
