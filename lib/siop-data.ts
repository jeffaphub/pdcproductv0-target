// SIOP Data Types & Mock Data Generator

// ---- Core Entity Types ----
export type SeverityLevel = "Critical" | "High" | "Medium" | "Low"
export type RiskType = "Shortage" | "Capacity" | "Contract" | "Date" | "Supplier" | "Quality"
export type ActionStatus = "Open" | "In Progress" | "Resolved" | "Escalated"
export type Persona = "Enterprise SIOP Lead" | "Plant GM" | "Buyer/Commodity Manager" | "Production Control" | "Program Manager"
export type Horizon = "0-30" | "0-90" | "90d-24m" | "2-5y"
export type TimeBucket = "Week" | "Month" | "Quarter"
export type AllocationStrategy = "highest-revenue" | "earliest-need" | "highest-penalty" | "manual"

export interface SIOPOrder {
  orderId: string
  clin: string
  customer: string
  program: string
  subAssembly: string
  plant: string
  commodity: string
  supplier: string
  buyerCode: string
  workcell: string
  qty: number
  unitRevenue: number
  totalRevenue: number
  margin: number
  needDate: string
  promiseDate: string
  contractDate: string
  projectedDate: string
  severityDays: number
  revenueAtRisk: number
  penaltyExposure: number
  penaltyThresholdDays: number
  penaltyRate: number // $/day after threshold
  riskType: RiskType
  severity: SeverityLevel
  priorityRank: number
  recommendedAction: string
  estimatedMitigationCost: number
  penaltyAvoided: number
  netValuePreserved: number
  otifDelta: number
  owner: string
  status: ActionStatus
  rootCause: string
  impactedParts: string[]
}

export interface DemandBucket {
  period: string
  // -- Consensus Demand Plan composition --
  firmOrders: number            // Signed contracts, funded backlog, call-offs
  forecastBaseline: number      // Statistical forecast baseline
  pipelineUpside: number        // Sales/BD pipeline adjusted by win probability
  customerSharedFcst: number    // Framework demand / options / customer forecasts
  programRamp: number           // Program-specific volume ramps
  scenarioOverlay: number       // Strategic overlay: base / upside / downside delta
  totalDemand: number           // Sum of all demand components

  // -- END-ITEM FULFILLMENT SOURCES (executive supply stack) --
  internalFinishedOutput: number  // Finished units completed internally (after material + capacity constraints)
  fgWipRelease: number            // FG/converted WIP released as end-item equivalent units
  outsourcedFinishedOutput: number // Finished units from contract manufacturer / outsourced final assembly
  directBuyFinished: number       // Externally procured finished end-items (buyout assemblies)
  totalFeasibleSupply: number     // Sum of end-item fulfillment sources

  // -- INTERNAL PRODUCTION FEASIBILITY DRIVERS (causal inputs) --
  supplierReceipts: number        // Component/subassembly receipts (supports internal build)
  componentInventory: number      // Component inventory availability
  yieldScrapImpact: number        // Effective yield loss vs plan (units lost)
  capacityConstraintImpact: number // Capacity-constrained delta (test/tooling/labor/line)
  materialSupportedBuild: number  // Max build if only material constrained
  capacitySupportedBuild: number  // Max build if only capacity constrained

  // -- Legacy compat fields --
  inventoryRelease: number
  internalProduction: number
  outsourceContrib: number

  // -- Constraint / feasibility boundary --
  constrainedThroughput: number // Hard-constrained feasible fulfillment ceiling
  committedSupply: number       // Legacy: committed supply line
  quotedCapacity: number        // Supplier quoted capacity
  demonstratedMax: number       // Demonstrated max

  // -- Gap --
  gap: number                   // totalDemand - constrainedThroughput

  // -- Assumptions flags --
  demandAssumptions: string[]
  supplyAssumptions: string[]
  supplyConstraints: string[]

  // -- Demand confidence --
  demandFirmPct: number         // % of demand that is firm
  demandForecastPct: number     // % that is forecast
  demandAssumptionPct: number   // % that is assumption/pipeline
  movableDemand: number         // Units of demand that can be moved (last resort)
  nonMovableDemand: number      // Units of demand that cannot be moved

  plant: string

  // -- Scenario variants --
  firmOrdersUpside: number
  firmOrdersDownside: number
  totalDemandUpside: number
  totalDemandDownside: number
  totalSupplyUpside: number
  totalSupplyDownside: number
}

export interface PlantRisk {
  plant: string
  period: string
  riskScore: number
  gapUnits: number
  otifRisk: number
  constraintType: string
}

export interface ConstraintDriver {
  driver: string
  unitsAtRisk: number
  revenueAtRisk: number
  plant: string
}

export interface ShortageRow {
  partNumber: string
  description: string
  commodity: string
  supplier: string
  buyerCode: string
  subAssembly: string
  weeklyShortages: number[] // 12 weeks
  weeklyDemand: number[]
  weeklySupply: number[]
  onHand: number
  leadTimeDays: number
  severity: SeverityLevel
  impactedOrders: string[]
}

export interface SupplierProfile {
  supplierId: string
  supplierName: string
  commodity: string
  spend: number
  currentOrders: number[]  // 12 periods
  quotedCapacity: number[] // 12 periods
  demonstratedMax: number[] // 12 periods
  gapSeverity: number
  revenueAtRisk: number
  riskStatus: SeverityLevel
  leadTimeDays: number
  coverageDays: number
  carryingCost: number
  impactedOrderCount: number
}

export interface CapacityBucket {
  period: string
  plant: string
  line: string
  plannedLoad: number
  availableCapacity: number
  maxCapacity: number
  laborLimit: number
  toolingLimit: number
  machineLimit: number
  utilization: number
  bindingConstraint: string
}

export interface ContractRule {
  contractId: string
  customer: string
  clin: string
  program: string
  gracePeriodDays: number
  penaltyPerDay: number
  maxPenaltyCap: number
  effectiveDate: string
  expiryDate: string
  ldRuleDescription: string
}

export interface ScenarioAction {
  id: string
  type: string
  description: string
  parameter: string
  value: number
}

export interface ScenarioResult {
  name: string
  projectedOtif: number
  revenueAtRisk: number
  penaltyExposure: number
  mitigationCost: number
  netBenefit: number
  ordersMoved: number
  avgPromiseDateShift: number
  capacityUtilization: number
}

// ---- Data Generators ----
const plants = ["Plant A - Cedar Rapids", "Plant B - Melbourne", "Plant C - San Diego"]
const customers = ["US Army PEO C3T", "USMC MARCORSYSCOM", "US Navy SPAWAR", "SOCOM", "Allied NATO"]
const programs = ["Manpack Radio", "Vehicle Mount System", "Tactical HF Radio", "Base Station Program"]
const subAssemblies = ["RF Module", "Baseband Processor", "Power Supply", "Antenna Assembly", "Chassis/Enclosure", "Display Module"]
const commodities = ["Semiconductors", "Passive Components", "RF Components", "Connectors", "Mechanical Parts", "PCB/Substrates"]
const suppliers = ["AeroSupply Inc", "Precision Parts Ltd", "FastConnect Co", "PowerTech Systems", "ElectroComponents", "MechParts Co", "SignalTech Inc", "TechSource Ltd"]
const buyerCodes = ["BUY-001", "BUY-002", "BUY-003", "BUY-004", "BUY-005"]
const workcells = ["SMT Line 1", "SMT Line 2", "Final Assy A", "Final Assy B", "Test Cell 1", "Test Cell 2", "RF Calibration", "Power Integration"]
const owners = ["M. Torres", "J. Chen", "R. Patel", "K. Williams", "D. Johnson", "S. Garcia", "A. Lee", "B. Martinez"]
const actions = [
  "Expedite supplier shipment", "Pull forward alternate PO", "Authorize overtime shift",
  "Reallocate partial supply", "Engage alternate supplier", "Accept delay + notify customer",
  "Add weekend shift capacity", "Outsource plating operation", "Renegotiate delivery window",
  "Split lot across programs", "Escalate to VP Supply Chain", "Request contract waiver"
]
const rootCauses = [
  "Supplier capacity constraint on semiconductor fab",
  "Raw material allocation conflict with commercial customers",
  "Quality hold on incoming lot - MRB pending",
  "Labor shortage in test cell - 2 techs on leave",
  "Tooling maintenance overrun - jig #7 delayed",
  "Subcontractor plating house at capacity",
  "Long-lead component (26-week) order placed late",
  "Engineering change order ECO-2026-044 impact",
  "Customs delay on imported RF substrate",
  "Demand spike from contract modification",
]
const partNumbers = [
  "IC-DSP-09112", "C-RF-003421", "XFMR-PWR-7702", "CONN-MIL-3304", "PCB-MAIN-001",
  "IC-FPGA-4401", "R-PREC-00221", "FILTER-SAW-012", "IC-ADC-16B-03", "CAP-MLCC-100N",
  "RELAY-PWR-005", "CRYS-TCXO-40M", "IC-PA-RF-028", "DIODE-SCH-44", "IND-RF-220N",
  "MOD-GPS-L1L2", "SENSOR-TEMP-03", "SWITCH-RF-SP4T", "AMP-LNA-003", "TRANS-IF-050",
]

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function randF(min: number, max: number) { return +(Math.random() * (max - min) + min).toFixed(2) }

// Seeded random for consistency
let _seed = 42
function seededRand() {
  _seed = (_seed * 16807 + 0) % 2147483647
  return (_seed - 1) / 2147483646
}
function sPick<T>(arr: T[]): T { return arr[Math.floor(seededRand() * arr.length)] }
function sRand(min: number, max: number) { return Math.floor(seededRand() * (max - min + 1)) + min }
function sRandF(min: number, max: number) { return +(seededRand() * (max - min) + min).toFixed(2) }

export function generateSIOPOrders(): SIOPOrder[] {
  _seed = 42
  const orders: SIOPOrder[] = []
  for (let i = 0; i < 40; i++) {
    const plant = sPick(plants)
    const customer = sPick(customers)
    const program = sPick(programs)
    const qty = sRand(5, 120)
    const unitRev = sRand(8000, 45000)
    const totalRev = qty * unitRev
    const margin = sRandF(0.08, 0.28)
    const baseMonth = sRand(2, 6)
    const baseDay = sRand(5, 28)
    const needDate = `2026-0${baseMonth}-${String(baseDay).padStart(2, "0")}`
    const sevDays = sRand(-5, 35)
    const projDay = Math.min(28, baseDay + sevDays)
    const projMonth = sevDays > 20 ? Math.min(9, baseMonth + 1) : baseMonth
    const projectedDate = `2026-0${projMonth}-${String(Math.max(1, projDay)).padStart(2, "0")}`
    const penaltyThreshold = sPick([0, 15, 30, 30, 30])
    const penaltyRate = sRand(500, 5000)
    const penaltyExp = sevDays > penaltyThreshold ? (sevDays - penaltyThreshold) * penaltyRate : 0
    const riskType = sPick(["Shortage", "Capacity", "Contract", "Date", "Supplier", "Quality"] as RiskType[])
    const severity: SeverityLevel = sevDays > 20 ? "Critical" : sevDays > 10 ? "High" : sevDays > 0 ? "Medium" : "Low"
    const mitCost = penaltyExp > 0 ? sRand(2000, Math.max(3000, Math.floor(penaltyExp * 0.6))) : 0
    const revAtRisk = sevDays > 0 ? Math.floor(totalRev * sRandF(0.1, 0.5)) : 0
    orders.push({
      orderId: `ORD-2026-${String(1001 + i).padStart(4, "0")}`,
      clin: `CLIN-${String(sRand(1, 18)).padStart(4, "0")}`,
      customer,
      program,
      subAssembly: sPick(subAssemblies),
      plant,
      commodity: sPick(commodities),
      supplier: sPick(suppliers),
      buyerCode: sPick(buyerCodes),
      workcell: sPick(workcells),
      qty,
      unitRevenue: unitRev,
      totalRevenue: totalRev,
      margin,
      needDate,
      promiseDate: needDate,
      contractDate: needDate,
      projectedDate,
      severityDays: Math.max(0, sevDays),
      revenueAtRisk: revAtRisk,
      penaltyExposure: penaltyExp,
      penaltyThresholdDays: penaltyThreshold,
      penaltyRate,
      riskType,
      severity,
      priorityRank: i + 1,
      recommendedAction: sPick(actions),
      estimatedMitigationCost: mitCost,
      penaltyAvoided: Math.floor(penaltyExp * sRandF(0.5, 0.9)),
      netValuePreserved: revAtRisk - mitCost,
      otifDelta: sevDays > 0 ? -sRandF(0.5, 4.0) : sRandF(0, 1.0),
      owner: sPick(owners),
      status: sPick(["Open", "In Progress", "Resolved", "Escalated"] as ActionStatus[]),
      rootCause: sPick(rootCauses),
      impactedParts: Array.from({ length: sRand(1, 4) }, () => sPick(partNumbers)),
    })
  }
  // Sort by severity days desc, then revenue at risk desc
  orders.sort((a, b) => b.severityDays - a.severityDays || b.revenueAtRisk - a.revenueAtRisk)
  orders.forEach((o, i) => { o.priorityRank = i + 1 })
  return orders
}

const demandAssumptionPool = [
  "Win rate 60% on SOCOM pipeline", "Ramp Q2 +20% per contract mod", "Customer shared forecast +15 units",
  "Downside: 30% probability of order deferral", "Framework option exercise expected", "ECO-044 mix change impact",
  "Retirement of legacy variant reduces vol by 8%", "Allied NATO LOI expected Q2",
]
const supplyAssumptionPool = [
  "Supplier X at 90% of quoted capacity", "OT shift approved through March", "Subcontractor plating at 85% yield",
  "New tooling online W3 Mar (+12 units/wk)", "2nd shift labor hired, ramp-up in progress",
  "In-transit inventory ETA 5 business days", "Safety stock draw-down authorized",
]
const supplyConstraintPool = [
  "Supplier Capacity", "Labor (Test Cell)", "Tooling (Jig #7)", "Machine Uptime (SMT-2)",
  "Yield / Scrap (RF Module)", "Export Compliance Hold", "Space / Layout", "Obsolescence Risk",
]

export function generateDemandBuckets(): DemandBucket[] {
  _seed = 100
  const buckets: DemandBucket[] = []
  const periods = ["W1 Feb", "W2 Feb", "W3 Feb", "W4 Feb", "W1 Mar", "W2 Mar", "W3 Mar", "W4 Mar", "W1 Apr", "W2 Apr", "W3 Apr", "W4 Apr"]
  for (const plant of plants) {
    for (const period of periods) {
      // Demand composition
      const firm = sRand(30, 90)
      const forecastBase = sRand(10, 40)
      const pipeline = sRand(5, 25)
      const custShared = sRand(3, 15)
      const ramp = sRand(0, 12)
      const overlay = sRand(-5, 10)
      const totalDem = firm + forecastBase + pipeline + custShared + ramp + Math.max(0, overlay)

      // END-ITEM FULFILLMENT SOURCES
      const internalFinished = sRand(25, 70)
      const fgWip = sRand(3, 18)
      const outsourcedFinished = sRand(0, 12)
      const directBuy = sRand(0, 4)
      const totalSup = internalFinished + fgWip + outsourcedFinished + directBuy

      // INTERNAL PRODUCTION FEASIBILITY DRIVERS
      const supReceipts = sRand(40, 100) // component receipts
      const compInventory = sRand(20, 60)
      const yieldLoss = sRand(2, 12)
      const capConstraint = sRand(3, 15)
      const matSupBuild = sRand(internalFinished, internalFinished + 20)
      const capSupBuild = sRand(internalFinished, internalFinished + 15)

      // Legacy compat
      const invRelease = fgWip
      const internal = internalFinished
      const outsource = outsourcedFinished

      // Feasibility ceiling
      const constrained = Math.min(totalSup, sRand(Math.floor(totalSup * 0.7), totalSup))
      const committed = sRand(25, 80)
      const quoted = sRand(60, 120)
      const demoMax = sRand(80, 150)

      // Scenario variants
      const firmUp = firm + sRand(5, 20)
      const firmDown = Math.max(10, firm - sRand(5, 20))
      const totalDemUp = totalDem + sRand(10, 30)
      const totalDemDown = Math.max(20, totalDem - sRand(10, 25))
      const totalSupUp = totalSup + sRand(5, 20)
      const totalSupDown = Math.max(15, totalSup - sRand(5, 15))

      // Demand confidence
      const firmPct = Math.round((firm / Math.max(1, totalDem)) * 100)
      const fcstPct = Math.round((forecastBase / Math.max(1, totalDem)) * 100)
      const assumPct = 100 - firmPct - fcstPct
      const movable = sRand(Math.floor(totalDem * 0.1), Math.floor(totalDem * 0.35))

      buckets.push({
        period,
        firmOrders: firm,
        forecastBaseline: forecastBase,
        pipelineUpside: pipeline,
        customerSharedFcst: custShared,
        programRamp: ramp,
        scenarioOverlay: overlay,
        totalDemand: totalDem,

        // End-item fulfillment sources
        internalFinishedOutput: internalFinished,
        fgWipRelease: fgWip,
        outsourcedFinishedOutput: outsourcedFinished,
        directBuyFinished: directBuy,
        totalFeasibleSupply: totalSup,

        // Internal production feasibility drivers
        supplierReceipts: supReceipts,
        componentInventory: compInventory,
        yieldScrapImpact: yieldLoss,
        capacityConstraintImpact: capConstraint,
        materialSupportedBuild: matSupBuild,
        capacitySupportedBuild: capSupBuild,

        // Legacy compat
        inventoryRelease: invRelease,
        internalProduction: internal,
        outsourceContrib: outsource,

        constrainedThroughput: constrained,
        committedSupply: committed,
        quotedCapacity: quoted,
        demonstratedMax: demoMax,
        gap: totalDem - constrained,
        demandAssumptions: Array.from({ length: sRand(1, 3) }, () => sPick(demandAssumptionPool)),
        supplyAssumptions: Array.from({ length: sRand(1, 3) }, () => sPick(supplyAssumptionPool)),
        supplyConstraints: Array.from({ length: sRand(1, 3) }, () => sPick(supplyConstraintPool)),

        // Demand confidence
        demandFirmPct: firmPct,
        demandForecastPct: fcstPct,
        demandAssumptionPct: assumPct,
        movableDemand: movable,
        nonMovableDemand: totalDem - movable,

        plant,
        firmOrdersUpside: firmUp,
        firmOrdersDownside: firmDown,
        totalDemandUpside: totalDemUp,
        totalDemandDownside: totalDemDown,
        totalSupplyUpside: totalSupUp,
        totalSupplyDownside: totalSupDown,
      })
    }
  }
  return buckets
}

export function generatePlantRisks(): PlantRisk[] {
  _seed = 200
  const risks: PlantRisk[] = []
  const periods = ["W1 Feb", "W2 Feb", "W3 Feb", "W4 Feb", "W1 Mar", "W2 Mar", "W3 Mar", "W4 Mar", "W1 Apr", "W2 Apr", "W3 Apr", "W4 Apr"]
  const constraints = ["Supplier", "Labor", "Tooling", "Material", "Machine"]
  for (const plant of plants) {
    for (const period of periods) {
      risks.push({
        plant,
        period,
        riskScore: sRandF(0, 100),
        gapUnits: sRand(-20, 40),
        otifRisk: sRandF(70, 100),
        constraintType: sPick(constraints),
      })
    }
  }
  return risks
}

export function generateConstraintDrivers(): ConstraintDriver[] {
  _seed = 300
  const drivers = ["Supplier Capacity", "Inventory Shortage", "Floor Capacity", "Labor", "Tooling", "Lead-Time"]
  return drivers.map(d => ({
    driver: d,
    unitsAtRisk: sRand(10, 200),
    revenueAtRisk: sRand(200000, 3000000),
    plant: "All",
  }))
}

export function generateShortages(): ShortageRow[] {
  _seed = 400
  return partNumbers.slice(0, 14).map((pn, i) => ({
    partNumber: pn,
    description: `Component ${pn}`,
    commodity: sPick(commodities),
    supplier: sPick(suppliers),
    buyerCode: sPick(buyerCodes),
    subAssembly: sPick(subAssemblies),
    weeklyShortages: Array.from({ length: 12 }, () => sRand(-50, 20)),
    weeklyDemand: Array.from({ length: 12 }, () => sRand(20, 80)),
    weeklySupply: Array.from({ length: 12 }, () => sRand(10, 70)),
    onHand: sRand(0, 200),
    leadTimeDays: sRand(14, 180),
    severity: sPick(["Critical", "High", "Medium", "Low"] as SeverityLevel[]),
    impactedOrders: Array.from({ length: sRand(1, 5) }, () => `ORD-2026-${sRand(1001, 1040)}`),
  }))
}

export function generateSupplierProfiles(): SupplierProfile[] {
  _seed = 500
  return suppliers.map(s => ({
    supplierId: `SUP-${s.replace(/\s/g, "-").substring(0, 8)}`,
    supplierName: s,
    commodity: sPick(commodities),
    spend: sRand(500000, 8000000),
    currentOrders: Array.from({ length: 12 }, () => sRand(10, 60)),
    quotedCapacity: Array.from({ length: 12 }, () => sRand(40, 80)),
    demonstratedMax: Array.from({ length: 12 }, () => sRand(60, 100)),
    gapSeverity: sRandF(0, 100),
    revenueAtRisk: sRand(100000, 5000000),
    riskStatus: sPick(["Critical", "High", "Medium", "Low"] as SeverityLevel[]),
    leadTimeDays: sRand(14, 120),
    coverageDays: sRand(5, 90),
    carryingCost: sRand(5000, 200000),
    impactedOrderCount: sRand(2, 15),
  }))
}

export function generateCapacityBuckets(): CapacityBucket[] {
  _seed = 600
  const buckets: CapacityBucket[] = []
  const periods = ["W1 Feb", "W2 Feb", "W3 Feb", "W4 Feb", "W1 Mar", "W2 Mar", "W3 Mar", "W4 Mar", "W1 Apr", "W2 Apr", "W3 Apr", "W4 Apr"]
  const lines = ["SMT Line 1", "SMT Line 2", "Final Assy A", "Final Assy B", "Test Cell 1", "RF Calibration"]
  const constraints = ["None", "Labor", "Tooling", "Machine", "Outsource"]
  for (const plant of plants) {
    for (const line of lines) {
      for (const period of periods) {
        const avail = sRand(100, 200)
        const maxCap = sRand(avail, avail + 60)
        const load = sRand(60, maxCap + 20)
        const labor = sRand(avail - 20, avail + 10)
        const tooling = sRand(avail - 10, avail + 30)
        const machine = sRand(avail, avail + 40)
        buckets.push({
          period, plant, line,
          plannedLoad: load,
          availableCapacity: avail,
          maxCapacity: maxCap,
          laborLimit: labor,
          toolingLimit: tooling,
          machineLimit: machine,
          utilization: Math.round((load / avail) * 100),
          bindingConstraint: load > avail ? sPick(constraints.slice(1)) : "None",
        })
      }
    }
  }
  return buckets
}

export function generateContractRules(): ContractRule[] {
  _seed = 700
  const rules: ContractRule[] = []
  for (let i = 0; i < 12; i++) {
    const customer = sPick(customers)
    const program = sPick(programs)
    rules.push({
      contractId: `CTR-2026-${String(100 + i)}`,
      customer,
      clin: `CLIN-${String(sRand(1, 18)).padStart(4, "0")}`,
      program,
      gracePeriodDays: sPick([0, 15, 30, 30]),
      penaltyPerDay: sRand(500, 8000),
      maxPenaltyCap: sRand(50000, 500000),
      effectiveDate: "2026-01-01",
      expiryDate: "2027-12-31",
      ldRuleDescription: `${sPick(["$X/day after", "X% of order value after"])} ${sPick([15, 30])} day grace; capped at ${sPick(["5%", "10%", "15%"])} of CLIN value`,
    })
  }
  return rules
}

export const baselineScenario: ScenarioResult = {
  name: "Baseline",
  projectedOtif: 82.4,
  revenueAtRisk: 12400000,
  penaltyExposure: 3200000,
  mitigationCost: 0,
  netBenefit: 0,
  ordersMoved: 0,
  avgPromiseDateShift: 0,
  capacityUtilization: 78.5,
}

export { plants, customers, programs, subAssemblies, commodities, suppliers, buyerCodes, workcells, owners }
