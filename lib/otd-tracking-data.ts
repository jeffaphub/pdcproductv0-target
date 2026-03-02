// OTD Tracking Data Types & Mock Data Generator

// ---- Core Types ----

export type OTDStatus = "On-Time" | "Late" | "At-Risk" | "Outstanding"
export type DriverCategory = "Supply" | "MRB/RI" | "Capacity" | "Planning"
export type SeverityLevel = "Critical" | "High" | "Medium" | "Low"
export type TimeBucket = "Week" | "Month" | "Quarter"
export type MRBStep = "Receiving Inspection" | "MRB Review" | "Disposition" | "Released"

export type OTDDelivery = {
  id: string
  program: string
  productLine: string
  site: string
  clin: string
  deliveryNumber: string
  supplier: string
  commodity: string
  poNumber: string
  poLine: string
  contractDate: Date
  promiseDate: Date
  expectedDate: Date
  actualDate: Date | null
  forecastDate: Date
  otdStatus: OTDStatus
  driver: DriverCategory
  severity: SeverityLevel
  owner: string
  escalateTo: string
  daysLate: number
  impactScore: number
  partNumber: string
  description: string
  quantity: number
  unitCost: number
  mrbHold: boolean
  riQueue: boolean
  capacityConstrained: boolean
  planningMisaligned: boolean
  iopDate: Date | null
  deliveryPlanDate: Date | null
  pdmForecastDate: Date | null
  deltaDays: number
  changeHistory: { date: Date; field: string; from: string; to: string }[]
}

export type OTDKPIs = {
  overallOTD: number
  forecastedOTD: number
  atRiskNext30: number
  atRiskNext60: number
  avgDaysLate: number
  mrbHoldsImpacting: number
  planMisalignments: number
  ytdOTD: number
  contractOTD: number
  aopOTD: number
  structuralGapCount: number
}

export type SupplierRisk = {
  supplier: string
  atRiskCount: number
  totalDeliveries: number
  riskScore: number
  avgDaysLate: number
  topCommodity: string
}

export type POLineRisk = {
  poNumber: string
  poLine: string
  supplier: string
  partNumber: string
  atRiskDeliveries: number
  urgency: SeverityLevel
  recommendedAction: string
  impactedClins: string[]
}

export type MRBQueueItem = {
  id: string
  partNumber: string
  lotNumber: string
  ncNumber: string
  currentStep: MRBStep
  clinsBlocked: string[]
  nearestContractDate: Date
  impactScore: number
  targetDispositionDate: Date
  queueAge: number
  quantity: number
}

export type TimeBucketData = {
  bucket: string
  startDate: Date
  endDate: Date
  contractRequirement: number
  plannedDeliveries: number
  aopTarget: number
  onTimeCount: number
  lateCount: number
  atRiskCount: number
  gapMagnitude: number
  dominantDriver: DriverCategory
  supplyDriverCount: number
  mrbDriverCount: number
  capacityDriverCount: number
  planningDriverCount: number
}

// ---- Data Generators ----

const programs = ["Manpack Radio", "Vehicle Mount", "Tactical HF Radio", "Base Station", "Maritime HF", "Airborne UHF"]
const productLines = ["AN/PRC-152", "AN/PRC-117G", "AN/VRC-110", "RT-1523", "AN/USC-61"]
const sites = ["Phoenix AZ", "Scottsdale AZ", "Rochester NY", "San Diego CA", "Melbourne FL"]
const suppliers = ["AeroSupply Inc", "Precision Parts Ltd", "FastConnect Co", "PowerTech Systems", "ElectroComponents", "RF Dynamics", "Northstar Components", "Allied Electronics"]
const commodities = ["Electronics", "RF Systems", "Power Systems", "Structural", "Wiring/Harness", "Enclosures", "Antennas", "Software/Firmware"]
const owners = ["J. Smith", "M. Rodriguez", "A. Chen", "K. Patel", "S. Johnson", "R. Williams", "T. Brown", "L. Davis"]

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function deriveDriver(delivery: Partial<OTDDelivery>): DriverCategory {
  if (delivery.mrbHold || delivery.riQueue) return "MRB/RI"
  if (delivery.capacityConstrained) return "Capacity"
  if (delivery.planningMisaligned) return "Planning"
  return "Supply"
}

function deriveEscalateTo(driver: DriverCategory): string {
  switch (driver) {
    case "Supply": return "Supply Chain / Buyer"
    case "MRB/RI": return "Quality / MRB"
    case "Capacity": return "Factory / Operations"
    case "Planning": return "Production Planner"
  }
}

function deriveSeverity(daysLate: number, contractDateDelta: number): SeverityLevel {
  if (daysLate > 14 || contractDateDelta < 7) return "Critical"
  if (daysLate > 7 || contractDateDelta < 14) return "High"
  if (daysLate > 3 || contractDateDelta < 30) return "Medium"
  return "Low"
}

export function generateOTDDeliveries(count: number = 150): OTDDelivery[] {
  const deliveries: OTDDelivery[] = []
  // Use current date as base so data is relevant
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const baseDate = today

  for (let i = 0; i < count; i++) {
    // Contract dates spread from -30 days (past due) to +90 days (upcoming)
    const contractDate = addDays(baseDate, randomInt(-30, 90))
    const promiseDate = addDays(contractDate, randomInt(-10, 15))
    const expectedDate = addDays(promiseDate, randomInt(-5, 20))
    const isComplete = Math.random() > 0.4
    const actualDate = isComplete ? addDays(expectedDate, randomInt(-5, 15)) : null
    const forecastDate = addDays(expectedDate, randomInt(-3, 10))

    const mrbHold = Math.random() < 0.15
    const riQueue = Math.random() < 0.12
    const capacityConstrained = Math.random() < 0.18
    const iopDate = addDays(contractDate, randomInt(-20, 30))
    const deliveryPlanDate = addDays(contractDate, randomInt(-15, 25))
    const planningMisaligned = Math.abs(iopDate.getTime() - contractDate.getTime()) > 7 * 24 * 60 * 60 * 1000

    const daysLate = actualDate
      ? Math.max(0, Math.floor((actualDate.getTime() - promiseDate.getTime()) / (24 * 60 * 60 * 1000)))
      : Math.max(0, Math.floor((expectedDate.getTime() - promiseDate.getTime()) / (24 * 60 * 60 * 1000)))

    const contractDateDelta = Math.floor((contractDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))

    let otdStatus: OTDStatus
    if (!actualDate && expectedDate < new Date()) {
      otdStatus = "Outstanding"
    } else if (daysLate === 0) {
      otdStatus = "On-Time"
    } else if (daysLate > 0 && actualDate) {
      otdStatus = "Late"
    } else {
      otdStatus = "At-Risk"
    }

    const partialDelivery: Partial<OTDDelivery> = { mrbHold, riQueue, capacityConstrained, planningMisaligned }
    const driver = deriveDriver(partialDelivery)
    const severity = deriveSeverity(daysLate, contractDateDelta)
    const program = randomChoice(programs)
    const owner = randomChoice(owners)

    deliveries.push({
      id: `DEL-${String(i + 1).padStart(5, "0")}`,
      program,
      productLine: randomChoice(productLines),
      site: randomChoice(sites),
      clin: `CLIN-${randomInt(1000, 9999)}`,
      deliveryNumber: `D-${randomInt(100, 999)}`,
      supplier: randomChoice(suppliers),
      commodity: randomChoice(commodities),
      poNumber: `PO-2024-${String(randomInt(1, 500)).padStart(3, "0")}`,
      poLine: `${randomInt(1, 10)}`,
      contractDate,
      promiseDate,
      expectedDate,
      actualDate,
      forecastDate,
      otdStatus,
      driver,
      severity,
      owner,
      escalateTo: deriveEscalateTo(driver),
      daysLate,
      impactScore: randomInt(1, 100),
      partNumber: `PN-${randomInt(1000, 9999)}-${String.fromCharCode(65 + randomInt(0, 5))}`,
      description: `${randomChoice(commodities)} Component`,
      quantity: randomInt(10, 500),
      unitCost: randomFloat(50, 5000),
      mrbHold,
      riQueue,
      capacityConstrained,
      planningMisaligned,
      iopDate,
      deliveryPlanDate,
      pdmForecastDate: addDays(contractDate, randomInt(-10, 20)),
      deltaDays: Math.floor((iopDate.getTime() - contractDate.getTime()) / (24 * 60 * 60 * 1000)),
      changeHistory: [
        { date: addDays(contractDate, -30), field: "promiseDate", from: addDays(promiseDate, -5).toISOString().split("T")[0], to: promiseDate.toISOString().split("T")[0] },
        { date: addDays(contractDate, -15), field: "expectedDate", from: addDays(expectedDate, -3).toISOString().split("T")[0], to: expectedDate.toISOString().split("T")[0] },
      ],
    })
  }

  return deliveries
}

export function generateOTDKPIs(deliveries: OTDDelivery[]): OTDKPIs {
  const total = deliveries.length
  const onTime = deliveries.filter(d => d.otdStatus === "On-Time").length
  const atRisk = deliveries.filter(d => d.otdStatus === "At-Risk")
  const late = deliveries.filter(d => d.otdStatus === "Late")
  const now = new Date()
  const in30Days = addDays(now, 30)
  const in60Days = addDays(now, 60)

  const atRiskNext30 = atRisk.filter(d => d.expectedDate <= in30Days).length
  const atRiskNext60 = atRisk.filter(d => d.expectedDate <= in60Days).length
  const avgDaysLate = late.length > 0 ? late.reduce((sum, d) => sum + d.daysLate, 0) / late.length : 0
  const mrbHolds = deliveries.filter(d => d.mrbHold || d.riQueue).length
  const planMisaligned = deliveries.filter(d => d.planningMisaligned).length

  return {
    overallOTD: total > 0 ? Math.round((onTime / total) * 1000) / 10 : 0,
    forecastedOTD: randomFloat(85, 95),
    atRiskNext30,
    atRiskNext60,
    avgDaysLate: Math.round(avgDaysLate * 10) / 10,
    mrbHoldsImpacting: mrbHolds,
    planMisalignments: planMisaligned,
    ytdOTD: randomFloat(86, 92),
    contractOTD: randomFloat(88, 94),
    aopOTD: randomFloat(90, 96),
    structuralGapCount: randomInt(5, 20),
  }
}

export function generateSupplierRisks(deliveries: OTDDelivery[]): SupplierRisk[] {
  const supplierMap = new Map<string, OTDDelivery[]>()
  deliveries.forEach(d => {
    const list = supplierMap.get(d.supplier) || []
    list.push(d)
    supplierMap.set(d.supplier, list)
  })

  return Array.from(supplierMap.entries()).map(([supplier, dels]) => {
    const atRisk = dels.filter(d => d.otdStatus === "At-Risk" || d.otdStatus === "Late")
    const late = dels.filter(d => d.otdStatus === "Late")
    const avgDaysLate = late.length > 0 ? late.reduce((sum, d) => sum + d.daysLate, 0) / late.length : 0
    const commodityCounts = new Map<string, number>()
    dels.forEach(d => commodityCounts.set(d.commodity, (commodityCounts.get(d.commodity) || 0) + 1))
    const topCommodity = Array.from(commodityCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A"

    return {
      supplier,
      atRiskCount: atRisk.length,
      totalDeliveries: dels.length,
      riskScore: Math.round((atRisk.length / dels.length) * 100),
      avgDaysLate: Math.round(avgDaysLate * 10) / 10,
      topCommodity,
    }
  }).sort((a, b) => b.riskScore - a.riskScore)
}

export function generatePOLineRisks(deliveries: OTDDelivery[]): POLineRisk[] {
  const poMap = new Map<string, OTDDelivery[]>()
  deliveries.forEach(d => {
    const key = `${d.poNumber}-${d.poLine}`
    const list = poMap.get(key) || []
    list.push(d)
    poMap.set(key, list)
  })

  return Array.from(poMap.entries())
    .filter(([, dels]) => dels.some(d => d.otdStatus === "At-Risk" || d.otdStatus === "Late"))
    .map(([key, dels]) => {
      const atRisk = dels.filter(d => d.otdStatus === "At-Risk" || d.otdStatus === "Late")
      const urgency = atRisk.some(d => d.severity === "Critical") ? "Critical" : atRisk.some(d => d.severity === "High") ? "High" : "Medium"
      const actions = ["Expedite", "Renegotiate delivery", "Find alternate source", "Split order"]

      return {
        poNumber: dels[0].poNumber,
        poLine: dels[0].poLine,
        supplier: dels[0].supplier,
        partNumber: dels[0].partNumber,
        atRiskDeliveries: atRisk.length,
        urgency: urgency as SeverityLevel,
        recommendedAction: randomChoice(actions),
        impactedClins: dels.map(d => d.clin),
      }
    })
    .sort((a, b) => b.atRiskDeliveries - a.atRiskDeliveries)
    .slice(0, 30)
}

export function generateMRBQueue(deliveries: OTDDelivery[]): MRBQueueItem[] {
  const mrbDeliveries = deliveries.filter(d => d.mrbHold || d.riQueue)
  const steps: MRBStep[] = ["Receiving Inspection", "MRB Review", "Disposition", "Released"]

  return mrbDeliveries.slice(0, 25).map((d, i) => ({
    id: `MRB-${String(i + 1).padStart(4, "0")}`,
    partNumber: d.partNumber,
    lotNumber: `LOT-${randomInt(10000, 99999)}`,
    ncNumber: `NC-${randomInt(1000, 9999)}`,
    currentStep: randomChoice(steps.slice(0, 3)),
    clinsBlocked: [d.clin],
    nearestContractDate: d.contractDate,
    impactScore: d.impactScore,
    targetDispositionDate: addDays(new Date(), randomInt(3, 21)),
    queueAge: randomInt(1, 30),
    quantity: d.quantity,
  })).sort((a, b) => b.impactScore - a.impactScore)
}

export function generateTimeBuckets(deliveries: OTDDelivery[], bucket: TimeBucket): TimeBucketData[] {
  const buckets: TimeBucketData[] = []
  const now = new Date()
  const bucketCount = bucket === "Week" ? 12 : bucket === "Month" ? 6 : 4

  for (let i = 0; i < bucketCount; i++) {
    let startDate: Date, endDate: Date, label: string
    if (bucket === "Week") {
      startDate = addDays(now, i * 7)
      endDate = addDays(startDate, 6)
      label = `W${i + 1}`
    } else if (bucket === "Month") {
      startDate = new Date(now.getFullYear(), now.getMonth() + i, 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 0)
      label = startDate.toLocaleString("default", { month: "short" })
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth() + i * 3, 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + i * 3 + 3, 0)
      label = `Q${Math.floor((startDate.getMonth() / 3) + 1)}`
    }

    const bucketDeliveries = deliveries.filter(d => d.expectedDate >= startDate && d.expectedDate <= endDate)
    const onTime = bucketDeliveries.filter(d => d.otdStatus === "On-Time").length
    const late = bucketDeliveries.filter(d => d.otdStatus === "Late").length
    const atRisk = bucketDeliveries.filter(d => d.otdStatus === "At-Risk").length

    const driverCounts = { Supply: 0, "MRB/RI": 0, Capacity: 0, Planning: 0 }
    bucketDeliveries.forEach(d => driverCounts[d.driver]++)
    const dominantDriver = Object.entries(driverCounts).sort((a, b) => b[1] - a[1])[0][0] as DriverCategory

    buckets.push({
      bucket: label,
      startDate,
      endDate,
      contractRequirement: randomInt(80, 150),
      plannedDeliveries: bucketDeliveries.length,
      aopTarget: randomInt(90, 140),
      onTimeCount: onTime,
      lateCount: late,
      atRiskCount: atRisk,
      gapMagnitude: randomInt(-20, 30),
      dominantDriver,
      supplyDriverCount: driverCounts.Supply,
      mrbDriverCount: driverCounts["MRB/RI"],
      capacityDriverCount: driverCounts.Capacity,
      planningDriverCount: driverCounts.Planning,
    })
  }

  return buckets
}

// Pre-generated singleton data
let _deliveries: OTDDelivery[] | null = null
export function getOTDDeliveries(): OTDDelivery[] {
  if (!_deliveries) _deliveries = generateOTDDeliveries(150)
  return _deliveries
}
