'use client'

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface FlowiseBotProps {
  flowiseId: string | undefined
  onChange: (flowiseId: string) => void
}

export function FlowiseBot({ flowiseId, onChange }: FlowiseBotProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="flowiseId">Flowise Flow ID</Label>
        <Input
          id="flowiseId"
          value={flowiseId || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Flow ID eingeben"
        />
      </div>
    </div>
  )
} 