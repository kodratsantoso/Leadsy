"use client"

import * as React from "react"
import { format, isValid } from "date-fns"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/radix-select"
import { cn } from "@/lib/utils"

interface DateTimePickerProps {
  value?: string | Date | null
  onChange?: (date: Date | null) => void
  disabled?: boolean
  className?: string
}

export default function DateTimePicker({ value, onChange, disabled, className }: DateTimePickerProps) {
  const parsedValue = value ? new Date(value) : null
  const [date, setDate] = React.useState<Date | undefined>(isValid(parsedValue) ? parsedValue! : undefined)
  
  const [hour, setHour] = React.useState(() => {
    if (!parsedValue || !isValid(parsedValue)) return "12"
    let h = parsedValue.getHours()
    if (h === 0) h = 12
    if (h > 12) h -= 12
    return h.toString().padStart(2, "0")
  })
  
  const [minute, setMinute] = React.useState(() => {
    if (!parsedValue || !isValid(parsedValue)) return "00"
    const m = parsedValue.getMinutes()
    // Snap to nearest 15
    const snapped = Math.round(m / 15) * 15
    return (snapped === 60 ? 0 : snapped).toString().padStart(2, "0")
  })
  
  const [ampm, setAmpm] = React.useState(() => {
    if (!parsedValue || !isValid(parsedValue)) return "AM"
    return parsedValue.getHours() >= 12 ? "PM" : "AM"
  })

  // Final combined DateTime
  const selectedDateTime = React.useMemo(() => {
    if (!date) return null
    const d = new Date(date)
    let h = parseInt(hour)
    if (ampm === "PM" && h < 12) h += 12
    if (ampm === "AM" && h === 12) h = 0
    d.setHours(h, parseInt(minute), 0, 0)
    return d
  }, [date, hour, minute, ampm])

  const onChangeRef = React.useRef(onChange)
  React.useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  React.useEffect(() => {
    if (onChangeRef.current && selectedDateTime) {
      onChangeRef.current(selectedDateTime)
    }
  }, [selectedDateTime])

  React.useEffect(() => {
    if (value) {
      const d = new Date(value)
      if (isValid(d) && (!selectedDateTime || d.getTime() !== selectedDateTime.getTime())) {
        setDate(d)
        let h = d.getHours()
        setAmpm(h >= 12 ? "PM" : "AM")
        if (h === 0) h = 12
        if (h > 12) h -= 12
        setHour(h.toString().padStart(2, "0"))
        
        const m = d.getMinutes()
        const snapped = Math.round(m / 15) * 15
        setMinute((snapped === 60 ? 0 : snapped).toString().padStart(2, "0"))
      }
    }
  }, [value]) // removed selectedDateTime from deps to avoid looping

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(selectedDateTime || date, "PPP p") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-fit">
          <Calendar mode="single" selected={date} onSelect={setDate} />
        </PopoverContent>
      </Popover>

      {/* Time Picker */}
      {date && (
        <div className="flex items-center gap-2 mt-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <Select value={hour} onValueChange={setHour}>
            <SelectTrigger className="w-[62px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const h = i + 1
                return (
                  <SelectItem key={h} value={h.toString().padStart(2, "0")}>
                    {h.toString().padStart(2, "0")}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          <span>:</span>

          <Select value={minute} onValueChange={setMinute}>
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["00", "15", "30", "45"].map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={ampm} onValueChange={setAmpm}>
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AM">AM</SelectItem>
              <SelectItem value="PM">PM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
