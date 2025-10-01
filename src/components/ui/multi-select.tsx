"use client"

import * as React from "react"
import { Check, ChevronsUpDown, PlusCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

export type MultiSelectOption = {
  value: string
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onValueChange: (value: string[]) => void
  onCreate?: (value: string) => void
  placeholder?: string
  className?: string
}

export function MultiSelect({
  options,
  value,
  onValueChange,
  onCreate,
  placeholder = "Select...",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState('');

  const handleSelect = (currentValue: string) => {
    onValueChange(
      value.includes(currentValue)
        ? value.filter(item => item !== currentValue)
        : [...value, currentValue]
    )
    setInputValue('');
  }
  
  const handleRemove = (currentValue: string) => {
    onValueChange(value.filter(item => item !== currentValue));
  }

  const handleCreate = () => {
    if (onCreate && inputValue && !options.some(opt => opt.label.toLowerCase() === inputValue.toLowerCase())) {
      onCreate(inputValue);
      onValueChange([...value, inputValue]);
    }
    setInputValue('');
  }
  
  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-auto min-h-10", className)}
        >
          <div className="flex flex-wrap gap-1">
            {value.length > 0 ? (
              value.map(val => (
                <Badge
                  key={val}
                  variant="secondary"
                  className="mr-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(val);
                  }}
                >
                  {options.find(option => option.value === val)?.label || val}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>

          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command cmdk-dialog-content-wrapper="">
          <CommandInput 
            placeholder="Search..."
            value={inputValue}
            onValueChange={setInputValue}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inputValue) {
                handleCreate();
              }
            }}
          />
          <CommandEmpty>
            {onCreate && inputValue ? (
               <CommandItem
                onSelect={handleCreate}
                className="flex items-center gap-2 cursor-pointer"
               >
                <PlusCircle className="h-4 w-4" />
                Create &quot;{inputValue}&quot;
               </CommandItem>
            ) : (
              "No results found."
            )}
          </CommandEmpty>
          <CommandGroup>
            {filteredOptions.map(option => (
              <CommandItem
                key={option.value}
                onSelect={() => handleSelect(option.value)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value.includes(option.value) ? "opacity-100" : "opacity-0"
                  )}
                />
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
