// @ts-nocheck
"use client"

import * as React from "react"
import { Check, ChevronDown, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface MultiSelectOption {
  id: string | number
  nom: string
  actif?: boolean
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Sélectionner...",
  disabled = false,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const filtered = React.useMemo(() => {
    if (!search.trim()) return options
    const q = search.toLowerCase()
    return options.filter((o) => o.nom.toLowerCase().includes(q))
  }, [options, search])

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id],
    )
  }

  const clear = () => {
    onChange([])
    setSearch("")
  }

  const label = selected.length === 0
    ? placeholder
    : `${selected.length} zone(s) sélectionnée(s)`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-between px-3 font-normal",
            !selected.length && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-h-72 w-[var(--radix-popover-trigger-width)] overflow-y-auto p-0" align="start">
        <div className="sticky top-0 z-10 flex items-center border-b bg-popover px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            placeholder="Rechercher une zone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="ml-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Aucune zone trouvée
          </div>
        ) : (
          <div className="p-1">
            {selected.length > 0 && (
              <button
                type="button"
                onClick={clear}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent"
              >
                <X className="h-3.5 w-3.5" />
                Effacer la sélection
              </button>
            )}
            {filtered.map((option) => {
              const checked = selected.includes(String(option.id))
              return (
                <label
                  key={option.id}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-foreground hover:bg-accent/70",
                    checked && "bg-amber-50 font-medium",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggle(String(option.id))}
                  />
                  <span className="flex-1 text-left">{option.nom}</span>
                  {checked && <Check className="h-4 w-4 text-primary" />}
                </label>
              )
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
