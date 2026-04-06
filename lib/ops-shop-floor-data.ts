// Operations / Shop Floor – Data Layer
// Merged from source: lib/shop-floor-data.ts, lib/labor-mix-data.ts

// ---- Types ----
export interface OpActual {
  operation: string
  station: string
  availability: number  // 0-1
  performance: number   // 0-1
  quality: number       // 0-1
  oee: number           // availability * performance * quality
  plannedUnits: number
  actualUnits: number
  cycleTimeSec: number
  targetCycleTimeSec: number
}

export interface QualityEvent {
  id: string
  defectType: string
  station: string
  count: number
  severity: "Critical" | "Major" | "Minor"
  rootCause: string
}

export interface CapacitySlot {
  station: string
  shift: 1 | 2 | 3
  plannedUnits: number
  actualUnits: number
  utilization: number
  adherence: number
}

export interface WorkflowStation {
  id: string
  name: string
  type: "assembly" | "test" | "inspection" | "machining"
  employees: number
  status: "active" | "idle" | "maintenance"
}

export interface Employee {
  id: string
  name: string
  title: string
  shift: 1 | 2
  station: string
  skillLevel: number // 1-5
  seniority: number  // years
  certifications: string[]
  unitsPerHour: number
  qualityScore: number // 0-100
  attendance: number   // 0-100
}

// ---- OEE data ----
export const opActualsData: OpActual[] = [
  { operation: "Wing Spar Machining", station: "CNC Bay 1", availability: 0.92, performance: 0.88, quality: 0.97, oee: 0, plannedUnits: 120, actualUnits: 97, cycleTimeSec: 480, targetCycleTimeSec: 450 },
  { operation: "Skin Layup", station: "Composite Bay", availability: 0.85, performance: 0.91, quality: 0.95, oee: 0, plannedUnits: 80, actualUnits: 62, cycleTimeSec: 720, targetCycleTimeSec: 680 },
  { operation: "Fuselage Riveting", station: "Assembly 1", availability: 0.94, performance: 0.86, quality: 0.98, oee: 0, plannedUnits: 200, actualUnits: 158, cycleTimeSec: 360, targetCycleTimeSec: 340 },
  { operation: "Avionics Install", station: "Systems Bay", availability: 0.88, performance: 0.82, quality: 0.96, oee: 0, plannedUnits: 60, actualUnits: 42, cycleTimeSec: 900, targetCycleTimeSec: 840 },
  { operation: "Landing Gear Test", station: "Test Bay 2", availability: 0.96, performance: 0.90, quality: 0.99, oee: 0, plannedUnits: 40, actualUnits: 34, cycleTimeSec: 1200, targetCycleTimeSec: 1100 },
  { operation: "Final Assembly", station: "Final Assy 1", availability: 0.90, performance: 0.84, quality: 0.97, oee: 0, plannedUnits: 30, actualUnits: 23, cycleTimeSec: 1800, targetCycleTimeSec: 1650 },
  { operation: "Paint & Finish", station: "Paint Bay", availability: 0.87, performance: 0.93, quality: 0.94, oee: 0, plannedUnits: 25, actualUnits: 19, cycleTimeSec: 2400, targetCycleTimeSec: 2200 },
  { operation: "Engine Integration", station: "Engine Bay", availability: 0.91, performance: 0.87, quality: 0.98, oee: 0, plannedUnits: 20, actualUnits: 16, cycleTimeSec: 3600, targetCycleTimeSec: 3400 },
].map(o => ({ ...o, oee: +(o.availability * o.performance * o.quality).toFixed(3) }))

export function calculateWeightedOEE(): number {
  const totalPlanned = opActualsData.reduce((s, o) => s + o.plannedUnits, 0)
  return opActualsData.reduce((s, o) => s + o.oee * (o.plannedUnits / totalPlanned), 0)
}

// ---- Quality events ----
export const qualityEventsData: QualityEvent[] = [
  { id: "QE-001", defectType: "Delamination", station: "Composite Bay", count: 8, severity: "Critical", rootCause: "Autoclave temp drift" },
  { id: "QE-002", defectType: "Rivet Spacing", station: "Assembly 1", count: 15, severity: "Major", rootCause: "Fixture wear" },
  { id: "QE-003", defectType: "Paint Adhesion", station: "Paint Bay", count: 12, severity: "Minor", rootCause: "Surface prep" },
  { id: "QE-004", defectType: "Dimensional OOT", station: "CNC Bay 1", count: 5, severity: "Major", rootCause: "Tool deflection" },
  { id: "QE-005", defectType: "Sealant Void", station: "Final Assy 1", count: 9, severity: "Critical", rootCause: "Application technique" },
  { id: "QE-006", defectType: "Wire Harness Routing", station: "Systems Bay", count: 7, severity: "Minor", rootCause: "Drawing rev mismatch" },
  { id: "QE-007", defectType: "Torque OOT", station: "Engine Bay", count: 3, severity: "Critical", rootCause: "Calibration due" },
  { id: "QE-008", defectType: "Surface Scratch", station: "Assembly 1", count: 20, severity: "Minor", rootCause: "Handling" },
]

// ---- Capacity & utilization ----
export const capacityData: CapacitySlot[] = [
  { station: "CNC Bay 1", shift: 1, plannedUnits: 60, actualUnits: 52, utilization: 0.87, adherence: 0.92 },
  { station: "CNC Bay 1", shift: 2, plannedUnits: 60, actualUnits: 48, utilization: 0.80, adherence: 0.88 },
  { station: "Composite Bay", shift: 1, plannedUnits: 40, actualUnits: 35, utilization: 0.88, adherence: 0.90 },
  { station: "Composite Bay", shift: 2, plannedUnits: 40, actualUnits: 30, utilization: 0.75, adherence: 0.82 },
  { station: "Assembly 1", shift: 1, plannedUnits: 100, actualUnits: 88, utilization: 0.88, adherence: 0.94 },
  { station: "Assembly 1", shift: 2, plannedUnits: 100, actualUnits: 76, utilization: 0.76, adherence: 0.85 },
  { station: "Systems Bay", shift: 1, plannedUnits: 30, actualUnits: 24, utilization: 0.80, adherence: 0.86 },
  { station: "Test Bay 2", shift: 1, plannedUnits: 40, actualUnits: 34, utilization: 0.85, adherence: 0.91 },
  { station: "Final Assy 1", shift: 1, plannedUnits: 15, actualUnits: 12, utilization: 0.80, adherence: 0.88 },
  { station: "Paint Bay", shift: 1, plannedUnits: 25, actualUnits: 19, utilization: 0.76, adherence: 0.84 },
  { station: "Engine Bay", shift: 1, plannedUnits: 20, actualUnits: 16, utilization: 0.80, adherence: 0.87 },
]

// ---- Workflow stations (for Labor Mix tab) ----
export const workflowStations: WorkflowStation[] = [
  { id: "WS-CNC1", name: "CNC Bay 1", type: "machining", employees: 8, status: "active" },
  { id: "WS-COMP", name: "Composite Bay", type: "assembly", employees: 12, status: "active" },
  { id: "WS-ASM1", name: "Assembly 1", type: "assembly", employees: 16, status: "active" },
  { id: "WS-SYS", name: "Systems Bay", type: "assembly", employees: 10, status: "active" },
  { id: "WS-TST2", name: "Test Bay 2", type: "test", employees: 6, status: "active" },
  { id: "WS-FASM", name: "Final Assembly 1", type: "assembly", employees: 14, status: "active" },
  { id: "WS-PNT", name: "Paint Bay", type: "assembly", employees: 8, status: "maintenance" },
  { id: "WS-ENG", name: "Engine Bay", type: "assembly", employees: 10, status: "active" },
  { id: "WS-QC", name: "QC Bay 1", type: "inspection", employees: 6, status: "active" },
]

// ---- Employee data (APU Installation Station) ----
const firstNames = ["James","Maria","Robert","Linda","Michael","Patricia","David","Jennifer","William","Susan","Richard","Jessica","Joseph","Sarah","Thomas","Karen","Charles","Nancy","Daniel","Betty"]
const lastNames = ["Anderson","Martinez","Thompson","Garcia","Wilson","Brown","Davis","Miller","Johnson","Taylor","Thomas","Moore","Jackson","Martin","Lee","Harris","Clark","Lewis","Robinson","Walker"]
const titles = ["Assembler I","Assembler II","Senior Assembler","Lead Technician","Quality Inspector"]
const certs = ["IPC-620","IPC-610","AS9100","FOD Prevention","ESD Control","Soldering J-STD-001","Torque Certification","Crane Operator"]

function generateEmployees(): Employee[] {
  const employees: Employee[] = []
  for (let i = 0; i < 40; i++) {
    const shift = i < 20 ? 1 : 2 as 1 | 2
    const seniority = +(Math.random() * 25).toFixed(1)
    const skillLevel = Math.min(5, Math.max(1, Math.round(seniority / 5) + Math.round(Math.random())))
    const numCerts = Math.min(certs.length, Math.max(1, Math.round(skillLevel * 1.2)))
    const empCerts = [...certs].sort(() => Math.random() - 0.5).slice(0, numCerts)
    employees.push({
      id: `EMP-${String(i + 1).padStart(3, "0")}`,
      name: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
      title: titles[Math.min(titles.length - 1, Math.floor(skillLevel * titles.length / 6))],
      shift,
      station: workflowStations[i % workflowStations.length].name,
      skillLevel,
      seniority,
      certifications: empCerts,
      unitsPerHour: +(1.5 + skillLevel * 0.4 + Math.random() * 0.5).toFixed(1),
      qualityScore: Math.round(70 + skillLevel * 5 + Math.random() * 10),
      attendance: Math.round(85 + Math.random() * 15),
    })
  }
  return employees
}

export const employeesData = generateEmployees()
