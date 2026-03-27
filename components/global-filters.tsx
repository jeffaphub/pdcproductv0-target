"use client"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, Check, X } from "lucide-react"
import { format } from "date-fns/format"
import { cn } from "@/lib/utils"

const COMMODITIES = ["Processor", "RF Module", "PCB", "Connector", "Labor"]
const SUPPLIERS = ["TechCorp Industries", "RF Solutions Ltd", "Precision Components Inc", "MicroTech Systems"]

type GlobalFiltersProps = {
  dateRange: { from: Date; to: Date }
  onDateRangeChange: (range: { from: Date; to: Date }) => void
  selectedCommodities: string[]
  onCommoditiesChange: (commodities: string[]) => void
  selectedSuppliers: string[]
  onSuppliersChange: (suppliers: string[]) => void
}

export function GlobalFilters({
  dateRange,
  onDateRangeChange,
  selectedCommodities,
  onCommoditiesChange,
  selectedSuppliers,
  onSuppliersChange,
}: GlobalFiltersProps) {
  const handleReset = () => {
    onDateRangeChange({
      from: new Date(new Date().setMonth(new Date().getMonth() - 12)),
      to: new Date(),
    })
    onCommoditiesChange([])
    onSuppliersChange([])
  }

  const toggleCommodity = (value: string) => {
    const updated = selectedCommodities.includes(value)
      ? selectedCommodities.filter((v) => v !== value)
      : [...selectedCommodities, value]
    onCommoditiesChange(updated)
  }

  const toggleSupplier = (value: string) => {
    const updated = selectedSuppliers.includes(value)
      ? selectedSuppliers.filter((v) => v !== value)
      : [...selectedSuppliers, value]
    onSuppliersChange(updated)
  }

  return (
    <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-4 flex-wrap">
      {/* Date Range */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Date Range:</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[280px] justify-start text-left font-normal bg-transparent">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{
                from: dateRange.from,
                to: dateRange.to,
              }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  onDateRangeChange({ from: range.from, to: range.to })
                }
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Commodity */}
      <MultiSelect label="Commodity" options={COMMODITIES} selected={selectedCommodities} onToggle={toggleCommodity} />

      {/* Supplier */}
      <MultiSelect label="Supplier" options={SUPPLIERS} selected={selectedSuppliers} onToggle={toggleSupplier} />

      {/* Reset button */}
      <Button variant="ghost" onClick={handleReset} className="ml-auto text-sm text-gray-600 hover:text-gray-900">
        <X className="h-4 w-4 mr-1" />
        Reset filters
      </Button>
    </div>
  )
}

function MultiSelect({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start bg-transparent">
          {label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.includes(option)
                return (
                  <CommandItem key={option} onSelect={() => onToggle(option)}>
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible",
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </div>
                    <span>{option}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
