// Operations / Unit Cost – Data Layer
// Merged from source: lib/data.ts, lib/drilldown-data.ts, lib/second-level-data.ts, lib/cost-waterfall-data.ts

// ---- Types ----
export type CostCategory = "labor" | "nonLabor"
export type SubsystemName = "Wing" | "Fuselage" | "Landing Gear" | "Avionics" | "Engine" | "Empennage"

export interface SubsystemCost {
  name: SubsystemName
  labor: number
  nonLabor: number
  total: number
}

export interface SubcomponentCost {
  name: string
  subsystem: SubsystemName
  labor: number
  nonLabor: number
  total: number
}

export interface BuildCostPoint {
  build: number
  labor: number
  nonLabor: number
  total: number
  expected: number
  laborVariance: number
  mixVariance: number
  priceVariance: number
  routingVariance: number
  totalVariance: number
}

export interface BOMRow {
  level: number
  partNumber: string
  description: string
  qty: number
  unitCost: number
  extCost: number
  children?: BOMRow[]
}

export interface DrilldownLaborOp {
  operation: string
  station: string
  hours: number
  rate: number
  cost: number
}

export interface DrilldownNonLaborItem {
  category: string
  description: string
  cost: number
  vendor?: string
  complexity?: "Low" | "Medium" | "High"
}

export interface WaterfallDriverRow {
  driver: string
  actual: number
  target: number
  delta: number
}

// ---- Core cost data ----
export const costsData: SubsystemCost[] = [
  { name: "Wing",         labor: 4200000, nonLabor: 3800000, total: 8000000 },
  { name: "Fuselage",     labor: 3600000, nonLabor: 4100000, total: 7700000 },
  { name: "Landing Gear", labor: 1800000, nonLabor: 2400000, total: 4200000 },
  { name: "Avionics",     labor: 2900000, nonLabor: 3500000, total: 6400000 },
  { name: "Engine",       labor: 5100000, nonLabor: 6200000, total: 11300000 },
  { name: "Empennage",    labor: 1400000, nonLabor: 1600000, total: 3000000 },
]

export const subcomponentMap: Record<SubsystemName, SubcomponentCost[]> = {
  Wing: [
    { name: "Spar Assembly", subsystem: "Wing", labor: 1200000, nonLabor: 900000, total: 2100000 },
    { name: "Skin Panels", subsystem: "Wing", labor: 800000, nonLabor: 1100000, total: 1900000 },
    { name: "Flap Mechanism", subsystem: "Wing", labor: 600000, nonLabor: 700000, total: 1300000 },
    { name: "Wing Tip", subsystem: "Wing", labor: 400000, nonLabor: 500000, total: 900000 },
    { name: "Fuel Tank Integration", subsystem: "Wing", labor: 1200000, nonLabor: 600000, total: 1800000 },
  ],
  Fuselage: [
    { name: "Forward Section", subsystem: "Fuselage", labor: 1100000, nonLabor: 1200000, total: 2300000 },
    { name: "Center Section", subsystem: "Fuselage", labor: 900000, nonLabor: 1400000, total: 2300000 },
    { name: "Aft Section", subsystem: "Fuselage", labor: 800000, nonLabor: 700000, total: 1500000 },
    { name: "Doors & Windows", subsystem: "Fuselage", labor: 800000, nonLabor: 800000, total: 1600000 },
  ],
  "Landing Gear": [
    { name: "Main Gear Assembly", subsystem: "Landing Gear", labor: 900000, nonLabor: 1200000, total: 2100000 },
    { name: "Nose Gear Assembly", subsystem: "Landing Gear", labor: 500000, nonLabor: 700000, total: 1200000 },
    { name: "Hydraulic System", subsystem: "Landing Gear", labor: 400000, nonLabor: 500000, total: 900000 },
  ],
  Avionics: [
    { name: "Flight Computer", subsystem: "Avionics", labor: 800000, nonLabor: 1400000, total: 2200000 },
    { name: "Navigation Suite", subsystem: "Avionics", labor: 700000, nonLabor: 900000, total: 1600000 },
    { name: "Comm Systems", subsystem: "Avionics", labor: 600000, nonLabor: 600000, total: 1200000 },
    { name: "Displays & HMI", subsystem: "Avionics", labor: 800000, nonLabor: 600000, total: 1400000 },
  ],
  Engine: [
    { name: "Turbine Assembly", subsystem: "Engine", labor: 2000000, nonLabor: 2800000, total: 4800000 },
    { name: "Nacelle", subsystem: "Engine", labor: 1200000, nonLabor: 1400000, total: 2600000 },
    { name: "Pylon Integration", subsystem: "Engine", labor: 900000, nonLabor: 1000000, total: 1900000 },
    { name: "Fuel System", subsystem: "Engine", labor: 1000000, nonLabor: 1000000, total: 2000000 },
  ],
  Empennage: [
    { name: "Vertical Stabilizer", subsystem: "Empennage", labor: 600000, nonLabor: 700000, total: 1300000 },
    { name: "Horizontal Stabilizer", subsystem: "Empennage", labor: 500000, nonLabor: 600000, total: 1100000 },
    { name: "Elevator & Rudder", subsystem: "Empennage", labor: 300000, nonLabor: 300000, total: 600000 },
  ],
}

// ---- Build cost trends (100 builds) ----
function generateBuildCosts(count: number, baseLaborMultiplier: number): BuildCostPoint[] {
  const result: BuildCostPoint[] = []
  for (let i = 1; i <= count; i++) {
    const learningFactor = Math.pow(i / count, -0.15)
    const noise = 0.95 + Math.random() * 0.1
    const labor = 6800000 * learningFactor * noise * baseLaborMultiplier
    const nonLabor = 5200000 * (0.98 + Math.random() * 0.04) * noise
    const total = labor + nonLabor
    const expected = (6800000 * learningFactor + 5200000) * baseLaborMultiplier
    const laborVar = (Math.random() - 0.5) * 200000
    const mixVar = (Math.random() - 0.5) * 150000
    const priceVar = (Math.random() - 0.5) * 180000
    const routingVar = (Math.random() - 0.5) * 120000
    result.push({
      build: i,
      labor: Math.round(labor),
      nonLabor: Math.round(nonLabor),
      total: Math.round(total),
      expected: Math.round(expected),
      laborVariance: Math.round(laborVar),
      mixVariance: Math.round(mixVar),
      priceVariance: Math.round(priceVar),
      routingVariance: Math.round(routingVar),
      totalVariance: Math.round(laborVar + mixVar + priceVar + routingVar),
    })
  }
  return result
}

export const buildCostData = generateBuildCosts(100, 1.0)

// ---- Drilldown data ----
const laborOps: Record<string, DrilldownLaborOp[]> = {
  Wing: [
    { operation: "Spar Machining", station: "CNC Bay 1", hours: 120, rate: 85, cost: 10200 },
    { operation: "Skin Layup", station: "Composite Bay", hours: 200, rate: 78, cost: 15600 },
    { operation: "Rib Assembly", station: "Assembly 3", hours: 90, rate: 72, cost: 6480 },
    { operation: "Fuel Tank Seal", station: "Sealant Bay", hours: 160, rate: 90, cost: 14400 },
    { operation: "Flap Assembly", station: "Assembly 5", hours: 80, rate: 75, cost: 6000 },
    { operation: "Wing Tip Install", station: "Final Assy 2", hours: 40, rate: 70, cost: 2800 },
    { operation: "Quality Inspect", station: "QC Bay 1", hours: 60, rate: 88, cost: 5280 },
  ],
  Fuselage: [
    { operation: "Frame Machining", station: "CNC Bay 2", hours: 140, rate: 85, cost: 11900 },
    { operation: "Panel Forming", station: "Press Bay", hours: 110, rate: 80, cost: 8800 },
    { operation: "Riveting", station: "Assembly 1", hours: 180, rate: 72, cost: 12960 },
    { operation: "Systems Install", station: "Systems Bay", hours: 200, rate: 82, cost: 16400 },
    { operation: "Door Fitment", station: "Assembly 4", hours: 70, rate: 75, cost: 5250 },
  ],
  "Landing Gear": [
    { operation: "Strut Machining", station: "CNC Bay 3", hours: 100, rate: 90, cost: 9000 },
    { operation: "Hydraulic Assembly", station: "Hydraulics Bay", hours: 120, rate: 85, cost: 10200 },
    { operation: "Gear Integration", station: "Assembly 6", hours: 80, rate: 78, cost: 6240 },
    { operation: "Retraction Test", station: "Test Bay 2", hours: 60, rate: 92, cost: 5520 },
  ],
}

const nonLaborItems: Record<string, DrilldownNonLaborItem[]> = {
  Wing: [
    { category: "Purchased Parts", description: "Titanium Fasteners (lot)", cost: 380000, vendor: "AeroFast Inc", complexity: "Medium" },
    { category: "Purchased Parts", description: "Hydraulic Actuators", cost: 520000, vendor: "HydroSys Corp", complexity: "High" },
    { category: "Raw Materials", description: "Carbon Fiber Pre-preg", cost: 290000, vendor: "CompositeTech", complexity: "Low" },
    { category: "Raw Materials", description: "Aluminum 7075 Sheet", cost: 180000, vendor: "MetalWorks LLC", complexity: "Low" },
    { category: "Special Processes", description: "Anodizing Treatment", cost: 95000, vendor: "SurfaceTech", complexity: "Medium" },
    { category: "Logistics", description: "Wing Transport Fixture", cost: 45000 },
    { category: "NRE/Tooling", description: "Wing Jig Amortization", cost: 120000 },
  ],
  Fuselage: [
    { category: "Purchased Parts", description: "Fuselage Frames", cost: 620000, vendor: "StructParts Co", complexity: "High" },
    { category: "Purchased Parts", description: "Window Assemblies", cost: 340000, vendor: "AeroGlass Ltd", complexity: "Medium" },
    { category: "Raw Materials", description: "Aluminum 2024 Sheet", cost: 280000, vendor: "MetalWorks LLC", complexity: "Low" },
    { category: "Special Processes", description: "Paint & Finish", cost: 150000, vendor: "AeroCoat", complexity: "Medium" },
    { category: "Logistics", description: "Section Transport", cost: 85000 },
  ],
  "Landing Gear": [
    { category: "Purchased Parts", description: "Forged Struts", cost: 780000, vendor: "ForgeWorks", complexity: "High" },
    { category: "Purchased Parts", description: "Brake Assemblies", cost: 350000, vendor: "BrakeTech", complexity: "High" },
    { category: "Raw Materials", description: "300M Steel Billet", cost: 220000, vendor: "SteelCo", complexity: "Medium" },
    { category: "Special Processes", description: "Shot Peening", cost: 65000, vendor: "PeenTech", complexity: "Low" },
  ],
}

export function getSubsystemDrilldown(subsystem: string) {
  return {
    laborOps: laborOps[subsystem] || [],
    nonLaborItems: nonLaborItems[subsystem] || [],
  }
}

// ---- Cost waterfall data ----
export function getCostDriverBreakdown(subsystem: string): WaterfallDriverRow[] {
  const baseDrivers: WaterfallDriverRow[] = [
    { driver: "Direct Labor", actual: 2800000, target: 2500000, delta: 300000 },
    { driver: "Purchased Parts", actual: 1900000, target: 1750000, delta: 150000 },
    { driver: "Raw Materials", actual: 850000, target: 900000, delta: -50000 },
    { driver: "Special Processes", actual: 420000, target: 380000, delta: 40000 },
    { driver: "Overhead Allocation", actual: 1100000, target: 1050000, delta: 50000 },
    { driver: "Logistics & Handling", actual: 280000, target: 250000, delta: 30000 },
    { driver: "NRE/Tooling Amort.", actual: 350000, target: 400000, delta: -50000 },
  ]
  // Scale based on subsystem
  const scale = (costsData.find(c => c.name === subsystem)?.total || 8000000) / 8000000
  return baseDrivers.map(d => ({
    ...d,
    actual: Math.round(d.actual * scale),
    target: Math.round(d.target * scale),
    delta: Math.round(d.delta * scale),
  }))
}

// ---- Indented BOM ----
export function generateBOM(): BOMRow[] {
  return [
    { level: 0, partNumber: "PN-1001", description: "Airplane Assembly", qty: 1, unitCost: 40600000, extCost: 40600000, children: [
      { level: 1, partNumber: "PN-1001-W", description: "Wing Assembly", qty: 2, unitCost: 4000000, extCost: 8000000, children: [
        { level: 2, partNumber: "PN-1001-W-SP", description: "Spar Assembly", qty: 2, unitCost: 1050000, extCost: 2100000 },
        { level: 2, partNumber: "PN-1001-W-SK", description: "Skin Panels", qty: 4, unitCost: 475000, extCost: 1900000 },
        { level: 2, partNumber: "PN-1001-W-FL", description: "Flap Mechanism", qty: 2, unitCost: 650000, extCost: 1300000 },
        { level: 2, partNumber: "PN-1001-W-WT", description: "Wing Tip", qty: 2, unitCost: 450000, extCost: 900000 },
        { level: 2, partNumber: "PN-1001-W-FT", description: "Fuel Tank Integration", qty: 2, unitCost: 900000, extCost: 1800000 },
      ]},
      { level: 1, partNumber: "PN-1001-F", description: "Fuselage Assembly", qty: 1, unitCost: 7700000, extCost: 7700000, children: [
        { level: 2, partNumber: "PN-1001-F-FW", description: "Forward Section", qty: 1, unitCost: 2300000, extCost: 2300000 },
        { level: 2, partNumber: "PN-1001-F-CT", description: "Center Section", qty: 1, unitCost: 2300000, extCost: 2300000 },
        { level: 2, partNumber: "PN-1001-F-AF", description: "Aft Section", qty: 1, unitCost: 1500000, extCost: 1500000 },
        { level: 2, partNumber: "PN-1001-F-DW", description: "Doors & Windows", qty: 1, unitCost: 1600000, extCost: 1600000 },
      ]},
      { level: 1, partNumber: "PN-1001-LG", description: "Landing Gear Assembly", qty: 1, unitCost: 4200000, extCost: 4200000, children: [
        { level: 2, partNumber: "PN-1001-LG-MN", description: "Main Gear Assembly", qty: 2, unitCost: 1050000, extCost: 2100000 },
        { level: 2, partNumber: "PN-1001-LG-NS", description: "Nose Gear Assembly", qty: 1, unitCost: 1200000, extCost: 1200000 },
        { level: 2, partNumber: "PN-1001-LG-HY", description: "Hydraulic System", qty: 1, unitCost: 900000, extCost: 900000 },
      ]},
      { level: 1, partNumber: "PN-1001-AV", description: "Avionics Suite", qty: 1, unitCost: 6400000, extCost: 6400000 },
      { level: 1, partNumber: "PN-1001-EN", description: "Engine Package", qty: 2, unitCost: 5650000, extCost: 11300000 },
      { level: 1, partNumber: "PN-1001-EM", description: "Empennage Assembly", qty: 1, unitCost: 3000000, extCost: 3000000 },
    ]},
  ]
}

// ---- Flat data table ----
export interface FlatCostRow {
  partNumber: string
  subsystem: SubsystemName
  subcomponent: string
  labor: number
  nonLabor: number
  total: number
}

export function getFlatCostTable(): FlatCostRow[] {
  const rows: FlatCostRow[] = []
  for (const [subsystem, subs] of Object.entries(subcomponentMap)) {
    for (const sc of subs) {
      rows.push({
        partNumber: `PN-${subsystem.replace(/\s/g, "").substring(0, 3).toUpperCase()}-${sc.name.replace(/\s/g, "").substring(0, 4).toUpperCase()}`,
        subsystem: subsystem as SubsystemName,
        subcomponent: sc.name,
        labor: sc.labor,
        nonLabor: sc.nonLabor,
        total: sc.total,
      })
    }
  }
  return rows
}
