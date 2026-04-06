// This file is deprecated - use major-subassembly-details.tsx instead
// Keeping this for backwards compatibility during deployment

export interface MajorSubassembly {
  id: number
  name: string
  description?: string
  cumulativeUnits: number
  lobTarget: number
  type: string
  leadTime: number
}

// Re-export from the new location
export { MajorSubassemblyDetails } from "@/components/major-subassembly-details"
