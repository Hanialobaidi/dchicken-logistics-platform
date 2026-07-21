import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function SearchInput({
  value,
  onChange,
  placeholder = 'بحث...',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="relative">
      <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 pr-9 pl-9 text-sm"
        dir="rtl"
      />
      {value && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
          onClick={() => onChange('')}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}
