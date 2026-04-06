// Operations / Enterprise Intelligence – Data Layer
// Merged from: lib/enterprise-intelligence-data.ts, lib/capability-maturity-data.ts, lib/plant-capacity-data.ts, lib/plant-capability-matrix-data.ts

// ---- Types ----
export type MaturityLevel = 1 | 2 | 3 | 4 | 5
export type CapabilityName = "Composite Layup" | "CNC Machining" | "Wire Harness" | "Avionics Integration" | "Final Assembly" | "Paint & Finish" | "NDT/Inspection" | "Hydraulic Systems"
export type PlantId = "PLT-A" | "PLT-B" | "PLT-C" | "PLT-D" | "PLT-E"
export type ResourceType = "Labor" | "Machine" | "Tooling" | "Floor Space" | "Test Equipment" | "Material Handling"

export interface CapabilityMaturityCell {
  plant: PlantId
  plantName: string
  capability: CapabilityName
  maturity: MaturityLevel
  notes: string
}

export interface PlantRecord {
  id: PlantId
  name: string
  location: string
  businessUnit: string
  capabilities: Partial<Record<CapabilityName, boolean>>
  headcount: number
  sqft: number
}

export interface CapacityHeatmapCell {
  plant: PlantId
  resource: ResourceType
  month: string
  utilization: number // 0-1
  available: number
  required: number
}

export interface CapacityTrendPoint {
  month: string
  theoretical: number
  efficiency: number
  availability: number
  actual: number
}

export interface BidOpportunity {
  id: string
  program: string
  customer: string
  value: number
  probability: number
  weightedValue: number
  requiredCapabilities: CapabilityName[]
  targetPlant: PlantId
  status: "Prospect" | "RFP" | "Proposal" | "Shortlist" | "Awarded"
  startDate: string
  peakUnitsPerMonth: number
}

export interface MarketIntelItem {
  id: string
  category: "Competitor" | "Technology" | "Regulation" | "Supply Chain"
  title: string
  impact: "High" | "Medium" | "Low"
  summary: string
  source: string
  date: string
}

export interface ScenarioInput {
  demandMultiplier: number    // 0.5-2.0
  laborEfficiency: number     // 0.7-1.2
  scrapRate: number           // 0-0.15
  outsourceCapacity: number   // 0-0.5
}

// ---- Capability maturity heatmap data ----
const plants: PlantRecord[] = [
  { id: "PLT-A", name: "Mesa, AZ", location: "Mesa, AZ", businessUnit: "Aerostructures", capabilities: { "Composite Layup": true, "CNC Machining": true, "Final Assembly": true, "Paint & Finish": true, "NDT/Inspection": true }, headcount: 1200, sqft: 350000 },
  { id: "PLT-B", name: "Wichita, KS", location: "Wichita, KS", businessUnit: "Aerostructures", capabilities: { "CNC Machining": true, "Wire Harness": true, "Final Assembly": true, "Hydraulic Systems": true, "NDT/Inspection": true }, headcount: 950, sqft: 280000 },
  { id: "PLT-C", name: "St. Louis, MO", location: "St. Louis, MO", businessUnit: "Avionics", capabilities: { "Avionics Integration": true, "Wire Harness": true, "NDT/Inspection": true, "CNC Machining": true }, headcount: 650, sqft: 180000 },
  { id: "PLT-D", name: "Savannah, GA", location: "Savannah, GA", businessUnit: "Final Assembly", capabilities: { "Final Assembly": true, "Paint & Finish": true, "Avionics Integration": true, "Composite Layup": true }, headcount: 1800, sqft: 520000 },
  { id: "PLT-E", name: "Everett, WA", location: "Everett, WA", businessUnit: "Engines & Systems", capabilities: { "CNC Machining": true, "Hydraulic Systems": true, "NDT/Inspection": true, "Final Assembly": true, "Composite Layup": true }, headcount: 1400, sqft: 410000 },
]

export { plants }

const capabilityNames: CapabilityName[] = ["Composite Layup", "CNC Machining", "Wire Harness", "Avionics Integration", "Final Assembly", "Paint & Finish", "NDT/Inspection", "Hydraulic Systems"]

export function getCapabilityMaturityData(): CapabilityMaturityCell[] {
  const cells: CapabilityMaturityCell[] = []
  const maturityMap: Record<string, MaturityLevel> = {
    "PLT-A|Composite Layup": 5, "PLT-A|CNC Machining": 4, "PLT-A|Final Assembly": 4, "PLT-A|Paint & Finish": 3, "PLT-A|NDT/Inspection": 5,
    "PLT-B|CNC Machining": 5, "PLT-B|Wire Harness": 4, "PLT-B|Final Assembly": 3, "PLT-B|Hydraulic Systems": 5, "PLT-B|NDT/Inspection": 4,
    "PLT-C|Avionics Integration": 5, "PLT-C|Wire Harness": 5, "PLT-C|NDT/Inspection": 3, "PLT-C|CNC Machining": 2,
    "PLT-D|Final Assembly": 5, "PLT-D|Paint & Finish": 5, "PLT-D|Avionics Integration": 3, "PLT-D|Composite Layup": 4,
    "PLT-E|CNC Machining": 5, "PLT-E|Hydraulic Systems": 4, "PLT-E|NDT/Inspection": 4, "PLT-E|Final Assembly": 3, "PLT-E|Composite Layup": 3,
  }
  for (const plant of plants) {
    for (const cap of capabilityNames) {
      const key = `${plant.id}|${cap}`
      if (maturityMap[key]) {
        cells.push({
          plant: plant.id,
          plantName: plant.name,
          capability: cap,
          maturity: maturityMap[key],
          notes: `Level ${maturityMap[key]} - ${maturityMap[key] >= 4 ? "Production ready" : maturityMap[key] >= 3 ? "Qualified" : "Development"}`,
        })
      }
    }
  }
  return cells
}

// ---- Multi-dimension plant capacity ----
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const resourceTypes: ResourceType[] = ["Labor", "Machine", "Tooling", "Floor Space", "Test Equipment", "Material Handling"]

export function getCapacityHeatmapData(): CapacityHeatmapCell[] {
  const cells: CapacityHeatmapCell[] = []
  for (const plant of plants) {
    for (const resource of resourceTypes) {
      for (const month of months) {
        const baseUtil = 0.6 + Math.random() * 0.35
        const available = Math.round(500 + Math.random() * 1500)
        cells.push({
          plant: plant.id,
          resource,
          month,
          utilization: +baseUtil.toFixed(2),
          available,
          required: Math.round(available * baseUtil),
        })
      }
    }
  }
  return cells
}

export function getCapacityTrendData(plantId: PlantId): CapacityTrendPoint[] {
  return months.map(month => {
    const theoretical = 2000 + Math.round(Math.random() * 500)
    const efficiency = Math.round(theoretical * (0.85 + Math.random() * 0.1))
    const availability = Math.round(efficiency * (0.88 + Math.random() * 0.08))
    const actual = Math.round(availability * (0.9 + Math.random() * 0.08))
    return { month, theoretical, efficiency, availability, actual }
  })
}

export function getCapacityKPIs(plantId: PlantId) {
  const trend = getCapacityTrendData(plantId)
  const totalTheoretical = trend.reduce((s, t) => s + t.theoretical, 0)
  const totalActual = trend.reduce((s, t) => s + t.actual, 0)
  return {
    overallUtilization: +(totalActual / totalTheoretical).toFixed(2),
    peakMonth: trend.reduce((max, t) => t.actual > max.actual ? t : max, trend[0]).month,
    avgActual: Math.round(totalActual / trend.length),
    avgTheoretical: Math.round(totalTheoretical / trend.length),
  }
}

// ---- Bid pipeline ----
export const bidPipelineData: BidOpportunity[] = [
  { id: "BID-001", program: "F-35 Block 5", customer: "USAF", value: 45000000, probability: 0.75, weightedValue: 33750000, requiredCapabilities: ["Composite Layup", "CNC Machining", "Final Assembly"], targetPlant: "PLT-A", status: "Shortlist", startDate: "2026-Q1", peakUnitsPerMonth: 12 },
  { id: "BID-002", program: "MQ-25A Lot 3", customer: "USN", value: 28000000, probability: 0.60, weightedValue: 16800000, requiredCapabilities: ["Avionics Integration", "Wire Harness"], targetPlant: "PLT-C", status: "Proposal", startDate: "2026-Q2", peakUnitsPerMonth: 4 },
  { id: "BID-003", program: "T-7A Red Hawk", customer: "USAF", value: 62000000, probability: 0.45, weightedValue: 27900000, requiredCapabilities: ["Final Assembly", "Paint & Finish", "CNC Machining"], targetPlant: "PLT-D", status: "RFP", startDate: "2026-Q3", peakUnitsPerMonth: 8 },
  { id: "BID-004", program: "AH-64E Upgrade", customer: "US Army", value: 35000000, probability: 0.85, weightedValue: 29750000, requiredCapabilities: ["Hydraulic Systems", "CNC Machining", "NDT/Inspection"], targetPlant: "PLT-B", status: "Awarded", startDate: "2025-Q4", peakUnitsPerMonth: 6 },
  { id: "BID-005", program: "KC-46 Tanker Mod", customer: "USAF", value: 18000000, probability: 0.55, weightedValue: 9900000, requiredCapabilities: ["Final Assembly", "Composite Layup"], targetPlant: "PLT-E", status: "Prospect", startDate: "2027-Q1", peakUnitsPerMonth: 2 },
  { id: "BID-006", program: "P-8A Follow-on", customer: "USN", value: 55000000, probability: 0.70, weightedValue: 38500000, requiredCapabilities: ["Final Assembly", "Avionics Integration", "Paint & Finish"], targetPlant: "PLT-D", status: "Proposal", startDate: "2026-Q4", peakUnitsPerMonth: 3 },
]

// ---- Market intelligence ----
export const marketIntelData: MarketIntelItem[] = [
  { id: "MI-001", category: "Competitor", title: "Competitor X awarded $2B UAV contract", impact: "High", summary: "Major competitor secured large UAV production contract, increasing demand for composite technicians in the labor market.", source: "Defense News", date: "2025-11-15" },
  { id: "MI-002", category: "Technology", title: "Additive manufacturing certified for Class II structures", impact: "Medium", summary: "FAA certified AM process for secondary structures, potential 30% cost reduction on select components.", source: "Aviation Week", date: "2025-10-28" },
  { id: "MI-003", category: "Regulation", title: "ITAR reform expands allied access", impact: "Medium", summary: "New ITAR exemptions for AUKUS partners may open subcontracting options in Australia and UK.", source: "Federal Register", date: "2025-12-01" },
  { id: "MI-004", category: "Supply Chain", title: "Titanium supply disruption risk elevated", impact: "High", summary: "Geopolitical tensions impacting titanium sponge availability; 6-month buffer recommended.", source: "Reuters", date: "2025-11-20" },
  { id: "MI-005", category: "Technology", title: "Digital thread adoption accelerating", impact: "Low", summary: "Industry survey shows 68% of Tier-1 OEMs plan full digital thread implementation by 2027.", source: "Deloitte Report", date: "2025-09-15" },
  { id: "MI-006", category: "Competitor", title: "Competitor Y expanding Wichita facility", impact: "Medium", summary: "50,000 sqft expansion for composite capability, directly competing with PLT-B skillsets.", source: "Wichita Eagle", date: "2025-10-05" },
]

// ---- Scenario forecast ----
export function calculateScenarioCapacity(input: ScenarioInput) {
  const baseMonthly = 24 // base units/month
  const effectiveYield = 1 - input.scrapRate
  const internal = Math.round(baseMonthly * input.laborEfficiency * effectiveYield)
  const outsourced = Math.round(baseMonthly * input.outsourceCapacity)
  const totalSupply = internal + outsourced
  const demand = Math.round(baseMonthly * input.demandMultiplier)
  return months.map((m, i) => {
    const seasonality = 1 + 0.08 * Math.sin((i / 12) * 2 * Math.PI)
    return {
      month: m,
      demand: Math.round(demand * seasonality),
      internalSupply: Math.round(internal * seasonality),
      outsourcedSupply: Math.round(outsourced * seasonality * 0.9),
      totalSupply: Math.round(totalSupply * seasonality),
      gap: Math.round((totalSupply - demand) * seasonality),
    }
  })
}

export function detectConflicts(bids: BidOpportunity[]) {
  const conflicts: { bid1: string; bid2: string; resource: string; severity: "High" | "Medium" }[] = []
  for (let i = 0; i < bids.length; i++) {
    for (let j = i + 1; j < bids.length; j++) {
      if (bids[i].targetPlant === bids[j].targetPlant) {
        const sharedCaps = bids[i].requiredCapabilities.filter(c => bids[j].requiredCapabilities.includes(c))
        if (sharedCaps.length > 0) {
          conflicts.push({
            bid1: bids[i].program,
            bid2: bids[j].program,
            resource: sharedCaps.join(", "),
            severity: sharedCaps.length > 1 ? "High" : "Medium",
          })
        }
      }
    }
  }
  return conflicts
}
