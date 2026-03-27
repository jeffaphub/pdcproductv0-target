// Mock data generator for the Unit Cost Intelligence dashboard

export type FreshnessStatus = "Fresh" | "At Risk" | "Stale" | "Critical"
export type TriggerType = "Manual" | "Auto Threshold" | "Scheduled"
export type QuoteStatus = "Open" | "Won" | "Lost" | "Expired"
export type LaborType = "Build" | "Test" | "Rework" | "Troubleshoot" | "Engineering Support"
export type RFQStatus = "Open" | "RFQ Sent" | "Received" | "Cancelled" | "Closed"
export type QuoteRisk = "Low" | "Medium" | "High"

export type QuoteTrackerStatus = "In Process" | "Submitted" | "Converted" | "Cancelled" | "Closed"

export type QuoteFulfillment = {
  fulfillmentId: string
  quoteId: string
  fulfillmentDate: Date
  unitsRequired: number
  clientShipmentCode: string
  locationCity: string
  locationState: string
}

export type QuoteTrackerItem = {
  quoteId: string
  quoteName: string
  requestor: string // Added requestor field
  totalUnits: number
  bomQtyPerUnit: number
  totalQuoteCost: number
  unitCost: number
  salesOrderId: string | null
  crmId: string
  status: QuoteTrackerStatus
  dateSubmitted: Date
  dateConverted: Date | null
  fulfillments: QuoteFulfillment[]
  bom: { partNumber: string; requiredQty: number }[]
}

export type Component = {
  partNumber: string
  description: string
  commodity: string
  supplier: string
  lastRefreshDate: Date
  daysSinceRefresh: number
  standardCost: number
  avgRecentPOCost: number
  variancePct: number
  freshnessStatus: FreshnessStatus
  annualSpend: number
  inventoryAmount: number
  inventoryValue: number
  lastPODate: Date | null
  lastPOValue: number | null
  lastPOUnitCost: number | null
  rfqDate: Date | null
  lastRFQUnitCost: number | null
  rfqStatus: RFQStatus | null
  quoteRisk: QuoteRisk
  standardLeadTimeDays: number
  avgRecentPOLeadTime: number
  leadTimeVarianceDays: number
  supplierLeadTimeTrend: "Improving" | "Stable" | "Worsening"
  lastPOLeadTime: number | null
  rfqLeadTime: number | null
  historicalLeadTimeDays: number
  quotedLeadTimeDays: number | null
  selectedCostSource?: "std" | "avgPO" | "lastPO" | "lastRFQ"
  selectedLeadTimeSource?: "lastPO" | "historical" | "quoted"
}

export type ComponentCostHistory = {
  partNumber: string
  date: Date
  materialCost: number
  laborCost: number
  overheadCost: number
  totalUnitCost: number
}

export type RefreshEvent = {
  eventDate: Date
  triggerType: TriggerType
  initiatedBy: string
  numPartsRefreshed: number
  status: "Completed" | "In Progress" | "Pending"
}

export type Quote = {
  quoteId: string
  quoteDate: Date
  customer: string
  productFamily: string
  requestedQty: number
  targetLeadTimeDays: number
  pWin: number
  status: QuoteStatus
}

export type QuoteComponent = {
  quoteId: string
  partNumber: string
  qtyPerUnit: number
  quotedUnitCost: number
  actualUnitCost: number
  variancePct: number
}

export type WorkOrder = {
  workOrderId: string
  productFamily: string
  serialNumber: string
  buildStartDate: Date
  buildCompleteDate: Date | null
  buildDaysActual: number
  buildDaysPlanned: number
  materialCost: number
  laborCost: number
  reworkCost: number
  copqCost: number
  totalUnitCost: number
  bidUnitPrice: number
  actualMarginPct: number
  standardMarginPct: number
  testPassYieldPct: number
}

export type AssemblyQuote = {
  quoteId: string
  quoteName: string
  description: string
  totalParts: number
  partNumbers: string[]
  bom: { partNumber: string; requiredQty: number }[]
}

export type LaborProcess = {
  processId: string
  processName: string
  workstationId: string
  workstationName: string
  plant: string
  plantLocation: string
  targetTimePerUnitSecs: number
  laborRate: number
  headCountRequired: number
  costPerUnit: number
  bomPartsRequired: string[] // Part numbers needed for this process
  sequenceOrder: number
}

export function generateLaborAllocation(assemblyQuote: AssemblyQuote): LaborProcess[] {
  const processes: LaborProcess[] = []

  const processTemplates = [
    { name: "PCB Population", workstation: "WS-001", plant: "Plant A", location: "Bay 1-A" },
    { name: "PCB Testing", workstation: "WS-002", plant: "Plant A", location: "Bay 1-B" },
    { name: "Wire Harness Assembly", workstation: "WS-003", plant: "Plant A", location: "Bay 2-A" },
    { name: "RF Module Integration", workstation: "WS-004", plant: "Plant A", location: "Bay 2-B" },
    { name: "Component Integration", workstation: "WS-005", plant: "Plant B", location: "Bay 3-A" },
    { name: "Chassis Assembly", workstation: "WS-006", plant: "Plant B", location: "Bay 3-B" },
    { name: "Final Integration", workstation: "WS-007", plant: "Plant B", location: "Bay 4-A" },
    { name: "Functional Testing", workstation: "WS-008", plant: "Plant B", location: "Bay 4-B" },
    { name: "Quality Inspection", workstation: "WS-009", plant: "Plant C", location: "Bay 5-A" },
    { name: "Final Packaging", workstation: "WS-010", plant: "Plant C", location: "Bay 5-B" },
  ]

  // Determine how many processes this assembly needs (4-8)
  const numProcesses = randomInt(4, 8)

  // Divide BOM parts across processes
  const partsPerProcess = Math.ceil(assemblyQuote.partNumbers.length / numProcesses)

  for (let i = 0; i < numProcesses; i++) {
    const template = processTemplates[i % processTemplates.length]
    const targetTime = randomInt(60, 600) // 1-10 minutes in seconds
    const laborRate = randomFloat(18, 45) // $18-$45/hr
    const headCount = randomInt(1, 4)

    // Calculate cost per unit: (laborRate/3600) * targetTime * headCount
    const costPerUnit = (laborRate / 3600) * targetTime * headCount

    // Assign parts to this process
    const startIdx = i * partsPerProcess
    const endIdx = Math.min(startIdx + partsPerProcess, assemblyQuote.partNumbers.length)
    const bomParts = assemblyQuote.partNumbers.slice(startIdx, endIdx)

    processes.push({
      processId: `PROC-${String(i + 1).padStart(3, "0")}`,
      processName: template.name,
      workstationId: template.workstation,
      workstationName: template.name,
      plant: template.plant,
      plantLocation: template.location,
      targetTimePerUnitSecs: targetTime,
      laborRate: laborRate,
      headCountRequired: headCount,
      costPerUnit: costPerUnit,
      bomPartsRequired: bomParts,
      sequenceOrder: i + 1,
    })
  }

  return processes
}
// </CHANGE>

// Helper functions
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

const randomFloat = (min: number, max: number) => Math.random() * (max - min) + min

const randomDate = (start: Date, end: Date) =>
  new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))

const suppliers = [
  "TechCorp Industries",
  "RF Solutions Ltd",
  "Precision Components Inc",
  "MicroTech Systems",
  "Advanced Electronics Co",
  "Global Semiconductors",
  "AeroDef Supply",
  "Defense Tech Group",
]

const commodities = ["Processor", "RF Module", "PCB", "Connector", "Modem", "Harness", "Composite"]

// Generate Components
export function generateComponents(count = 200): Component[] {
  const components: Component[] = []
  const today = new Date()

  for (let i = 0; i < count; i++) {
    const commodity = commodities[randomInt(0, commodities.length - 1)]
    let baseCost = 100
    let baseLeadTime = 30

    if (commodity === "Processor") {
      baseCost = randomFloat(500, 1500)
      baseLeadTime = randomInt(45, 90)
    } else if (commodity === "RF Module") {
      baseCost = randomFloat(1000, 3000)
      baseLeadTime = randomInt(60, 120)
    } else if (commodity === "PCB") {
      baseCost = randomFloat(200, 800)
      baseLeadTime = randomInt(20, 60)
    } else if (commodity === "Connector") {
      baseCost = randomFloat(10, 200)
      baseLeadTime = randomInt(10, 30)
    } else if (commodity === "Modem") {
      baseCost = randomFloat(800, 2500)
      baseLeadTime = randomInt(50, 100)
    } else if (commodity === "Harness") {
      baseCost = randomFloat(150, 600)
      baseLeadTime = randomInt(25, 60)
    } else if (commodity === "Composite") {
      baseCost = randomFloat(300, 1200)
      baseLeadTime = randomInt(40, 90)
    }

    const daysSinceRefresh = randomInt(0, 400)
    const variancePct = randomFloat(-10, 25)
    const avgRecentPOCost = baseCost * (1 + variancePct / 100)

    const leadTimeVarianceDays = randomInt(-15, 30)
    const avgRecentPOLeadTime = baseLeadTime + leadTimeVarianceDays
    const leadTimeTrends: Array<"Improving" | "Stable" | "Worsening"> = ["Improving", "Stable", "Worsening"]
    const supplierLeadTimeTrend = leadTimeTrends[randomInt(0, 2)]

    let freshnessStatus: FreshnessStatus = "Fresh"
    if (daysSinceRefresh > 365 || Math.abs(variancePct) > 15) {
      freshnessStatus = "Critical"
    } else if (daysSinceRefresh > 180) {
      freshnessStatus = "Stale"
    } else if (daysSinceRefresh > 90) {
      freshnessStatus = "At Risk"
    }

    const hasInventory = Math.random() > 0.4
    const inventoryAmount = hasInventory ? randomInt(0, 50) : 0
    const inventoryValue = inventoryAmount * baseCost

    const hasLastPO = Math.random() > 0.2
    const lastPODate = hasLastPO ? randomDate(new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000), today) : null
    const lastPOQty = hasLastPO ? randomInt(10, 200) : null
    const lastPOUnitCost = hasLastPO ? baseCost * randomFloat(0.9, 1.1) : null
    const lastPOValue = hasLastPO && lastPOQty && lastPOUnitCost ? lastPOQty * lastPOUnitCost : null
    const lastPOLeadTime = hasLastPO ? baseLeadTime + randomInt(-10, 20) : null

    const hasRFQ = Math.random() > 0.6
    const rfqDate = hasRFQ ? randomDate(new Date(today.getTime() - 60 * 24 * 60 * 1000), today) : null
    const lastRFQUnitCost = hasRFQ ? baseCost * randomFloat(0.85, 1.15) : null
    const rfqLeadTime = hasRFQ ? baseLeadTime + randomInt(-5, 25) : null
    const rfqStatuses: RFQStatus[] = ["Open", "RFQ Sent", "Received", "Cancelled", "Closed"]
    const rfqStatus = hasRFQ ? rfqStatuses[randomInt(0, rfqStatuses.length - 1)] : null

    let quoteRisk: QuoteRisk = "Low"
    if (Math.abs(variancePct) > 15 || daysSinceRefresh > 180) {
      quoteRisk = "High"
    } else if (Math.abs(variancePct) > 8 || daysSinceRefresh > 90) {
      quoteRisk = "Medium"
    }

    const historicalLeadTimeDays = baseLeadTime + randomInt(-10, 15)
    const quotedLeadTimeDays = hasRFQ ? baseLeadTime + randomInt(-5, 20) : null

    components.push({
      partNumber: `HR-${commodity.substring(0, 3).toUpperCase()}-${String(i).padStart(4, "0")}`,
      description: `${commodity} Module ${i}`,
      commodity,
      supplier: suppliers[randomInt(0, suppliers.length - 1)],
      lastRefreshDate: new Date(today.getTime() - daysSinceRefresh * 24 * 60 * 60 * 1000),
      daysSinceRefresh,
      standardCost: baseCost,
      avgRecentPOCost,
      variancePct,
      freshnessStatus,
      annualSpend: baseCost * randomInt(100, 5000),
      inventoryAmount,
      inventoryValue,
      lastPODate,
      lastPOValue,
      lastPOUnitCost,
      rfqDate,
      lastRFQUnitCost,
      rfqStatus,
      quoteRisk,
      standardLeadTimeDays: baseLeadTime,
      avgRecentPOLeadTime,
      leadTimeVarianceDays,
      supplierLeadTimeTrend,
      lastPOLeadTime,
      rfqLeadTime,
      historicalLeadTimeDays,
      quotedLeadTimeDays,
    })
  }

  return components
}

// Generate Component Cost History
export function generateComponentCostHistory(components: Component[]): ComponentCostHistory[] {
  const history: ComponentCostHistory[] = []
  const monthsBack = 24
  const today = new Date()

  components.slice(0, 50).forEach((component) => {
    for (let i = 0; i < monthsBack; i++) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)

      const materialCost = component.standardCost * randomFloat(0.85, 1.15)
      const laborCost = materialCost * randomFloat(0.1, 0.25)
      const overheadCost = materialCost * randomFloat(0.05, 0.15)

      history.push({
        partNumber: component.partNumber,
        date,
        materialCost,
        laborCost,
        overheadCost,
        totalUnitCost: materialCost + laborCost + overheadCost,
      })
    }
  })

  return history
}

// Generate Refresh Events
export function generateRefreshEvents(count = 30): RefreshEvent[] {
  const events: RefreshEvent[] = []
  const today = new Date()
  const sixMonthsAgo = new Date(today)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const triggerTypes: TriggerType[] = ["Manual", "Auto Threshold", "Scheduled"]
  const initiators = ["System", "J. Smith", "M. Johnson", "A. Davis"]

  for (let i = 0; i < count; i++) {
    events.push({
      eventDate: randomDate(sixMonthsAgo, today),
      triggerType: triggerTypes[randomInt(0, triggerTypes.length - 1)],
      initiatedBy: initiators[randomInt(0, initiators.length - 1)],
      numPartsRefreshed: randomInt(5, 150),
      status: i < 3 ? "In Progress" : "Completed",
    })
  }

  return events.sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime())
}

// Generate Quotes
export function generateQuotes(count = 50): Quote[] {
  const quotes: Quote[] = []
  const today = new Date()
  const productFamilies = ["Manpack Radios", "Vehicle Radios", "Base Station Kits"]
  const customers = ["Program Falcon", "Program Atlas", "Program Phoenix"]
  const statuses: QuoteStatus[] = ["Open", "Won", "Lost", "Expired"]

  for (let i = 0; i < count; i++) {
    quotes.push({
      quoteId: `Q-2025-${String(i + 400).padStart(5, "0")}`,
      quoteDate: randomDate(new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000), today),
      customer: customers[randomInt(0, customers.length - 1)],
      productFamily: productFamilies[randomInt(0, productFamilies.length - 1)],
      requestedQty: randomInt(10, 500),
      targetLeadTimeDays: randomInt(30, 90),
      pWin: randomFloat(0.2, 0.95),
      status: statuses[randomInt(0, statuses.length - 1)],
    })
  }

  return quotes
}

// Generate Work Orders
export function generateWorkOrders(count = 100): WorkOrder[] {
  const workOrders: WorkOrder[] = []
  const today = new Date()
  const productFamilies = ["Manpack Radios", "Vehicle Radios", "Base Station Kits"]

  for (let i = 0; i < count; i++) {
    const buildDaysPlanned = randomInt(3, 15)
    const buildDaysActual = buildDaysPlanned + randomInt(-3, 8)
    const materialCost = randomFloat(30000, 80000)
    const laborCost = randomFloat(5000, 15000)
    const reworkCost = randomFloat(0, laborCost * 0.3)
    const copqCost = reworkCost + randomFloat(0, materialCost * 0.05)
    const totalUnitCost = materialCost + laborCost + reworkCost + copqCost
    const standardMarginPct = randomFloat(18, 25)
    const bidUnitPrice = totalUnitCost * (1 + standardMarginPct / 100)
    const actualMarginPct = ((bidUnitPrice - totalUnitCost) / bidUnitPrice) * 100

    const buildStartDate = randomDate(new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000), today)
    const buildCompleteDate = new Date(buildStartDate.getTime() + buildDaysActual * 24 * 60 * 60 * 1000)

    workOrders.push({
      workOrderId: `WO-2025-${String(i + 800).padStart(4, "0")}`,
      productFamily: productFamilies[randomInt(0, productFamilies.length - 1)],
      serialNumber: `SN-2025${String(i + 800).padStart(4, "0")}-001`,
      buildStartDate,
      buildCompleteDate: buildCompleteDate > today ? null : buildCompleteDate,
      buildDaysActual,
      buildDaysPlanned,
      materialCost,
      laborCost,
      reworkCost,
      copqCost,
      totalUnitCost,
      bidUnitPrice,
      actualMarginPct,
      standardMarginPct,
      testPassYieldPct: randomFloat(0.45, 0.95),
    })
  }

  return workOrders.sort((a, b) => b.buildStartDate.getTime() - a.buildStartDate.getTime())
}

export function generateAssemblyQuotes(components: Component[]): AssemblyQuote[] {
  const quotes: AssemblyQuote[] = []

  // Ensure we have enough components of each type
  const modemParts = components.filter((c) => c.commodity === "Modem")
  const pcbParts = components.filter((c) => c.commodity === "PCB")
  const harnessParts = components.filter((c) => c.commodity === "Harness")
  const rfParts = components.filter((c) => c.commodity === "RF Module")
  const compositeParts = components.filter((c) => c.commodity === "Composite")
  const processorParts = components.filter((c) => c.commodity === "Processor")
  const connectorParts = components.filter((c) => c.commodity === "Connector")

  const quoteNames = [
    "ASY-SR-2025-001 (Manpack Radio Assembly)",
    "ASY-SR-2025-002 (Vehicle Radio Assembly)",
    "ASY-SR-2025-003 (Base Station Assembly)",
    "ASY-SR-2025-004 (Portable Comm Unit)",
    "ASY-SR-2025-005 (Airborne Radio System)",
    "ASY-SR-2025-006 (Naval Comm Assembly)",
    "ASY-SR-2025-007 (Tactical Radio Pack)",
    "ASY-SR-2025-008 (Mobile Command Unit)",
    "ASY-SR-2025-009 (Field Transceiver System)",
    "ASY-SR-2025-010 (Satellite Uplink Module)",
    "ASY-SR-2025-011 (Ground Control Radio)",
    "ASY-SR-2025-012 (Emergency Beacon System)",
    "ASY-SR-2025-013 (Aviation Comm Suite)",
    "ASY-SR-2025-014 (Marine Radio Assembly)",
    "ASY-SR-2025-015 (Handheld Transceiver)",
  ]

  quoteNames.forEach((name, idx) => {
    const partNumbers: string[] = []
    const bom: { partNumber: string; requiredQty: number }[] = []
    const numParts = randomInt(40, 80)

    // Add 1 Modem (required)
    if (modemParts.length > idx % modemParts.length) {
      const partNumber = modemParts[idx % modemParts.length].partNumber
      partNumbers.push(partNumber)
      bom.push({ partNumber, requiredQty: 1 }) // Modem typically qty 1
    }

    // Add at least one of each required commodity
    if (pcbParts.length > idx % pcbParts.length) {
      const partNumber = pcbParts[idx % pcbParts.length].partNumber
      partNumbers.push(partNumber)
      bom.push({ partNumber, requiredQty: randomInt(2, 6) }) // PCBs can have multiple
    }
    if (harnessParts.length > idx % harnessParts.length) {
      const partNumber = harnessParts[idx % harnessParts.length].partNumber
      partNumbers.push(partNumber)
      bom.push({ partNumber, requiredQty: randomInt(3, 12) }) // Multiple harnesses
    }
    if (rfParts.length > idx % rfParts.length) {
      const partNumber = rfParts[idx % rfParts.length].partNumber
      partNumbers.push(partNumber)
      bom.push({ partNumber, requiredQty: randomInt(1, 4) }) // RF modules
    }
    if (compositeParts.length > idx % compositeParts.length) {
      const partNumber = compositeParts[idx % compositeParts.length].partNumber
      partNumbers.push(partNumber)
      bom.push({ partNumber, requiredQty: randomInt(2, 8) }) // Composite parts
    }
    if (processorParts.length > idx % processorParts.length) {
      const partNumber = processorParts[idx % processorParts.length].partNumber
      partNumbers.push(partNumber)
      bom.push({ partNumber, requiredQty: randomInt(1, 3) }) // Processors
    }
    if (connectorParts.length > idx % connectorParts.length) {
      const partNumber = connectorParts[idx % connectorParts.length].partNumber
      partNumbers.push(partNumber)
      bom.push({ partNumber, requiredQty: randomInt(4, 20) }) // Many connectors
    }

    // Fill remaining parts randomly from all components
    const remainingParts = numParts - partNumbers.length
    const availableComponents = components.filter((c) => !partNumbers.includes(c.partNumber))

    for (let i = 0; i < remainingParts && i < availableComponents.length; i++) {
      const randomIdx = randomInt(0, availableComponents.length - 1)
      if (!partNumbers.includes(availableComponents[randomIdx].partNumber)) {
        const partNumber = availableComponents[randomIdx].partNumber
        const commodity = availableComponents[randomIdx].commodity

        // Determine qty based on commodity type
        let qty = 1
        if (commodity === "Connector") qty = randomInt(4, 20)
        else if (commodity === "Harness") qty = randomInt(3, 12)
        else if (commodity === "Composite") qty = randomInt(2, 8)
        else if (commodity === "PCB") qty = randomInt(2, 6)
        else if (commodity === "RF Module") qty = randomInt(1, 4)
        else if (commodity === "Processor") qty = randomInt(1, 3)
        else qty = randomInt(1, 5)

        partNumbers.push(partNumber)
        bom.push({ partNumber, requiredQty: qty })
      }
    }

    quotes.push({
      quoteId: `ASY-SR-2025-${String(idx + 1).padStart(3, "0")}`,
      quoteName: name,
      description: `Satellite radio assembly with ${partNumbers.length} components`,
      totalParts: partNumbers.length,
      partNumbers: partNumbers,
      bom: bom,
    })
  })

  return quotes
}

export function generateQuoteTrackerItems(
  assemblyQuotes: AssemblyQuote[],
  components: Component[],
): QuoteTrackerItem[] {
  const items: QuoteTrackerItem[] = []
  const today = new Date()
  const statuses: QuoteTrackerStatus[] = ["In Process", "Submitted", "Converted", "Cancelled", "Closed"]
  const cities = ["Houston", "Los Angeles", "Dallas", "Phoenix", "San Diego", "Austin", "Seattle", "Denver"]
  const states = ["TX", "CA", "AZ", "WA", "CO"]
  const requestors = [
    "Sarah Johnson",
    "Michael Chen",
    "Emily Rodriguez",
    "David Kim",
    "Jessica Martinez",
    "Robert Taylor",
    "Amanda Wilson",
    "James Anderson",
    "Lisa Thompson",
    "Christopher Lee",
  ]

  // Convert assembly quotes to quote tracker items
  assemblyQuotes.forEach((quote, idx) => {
    const totalUnits = randomInt(10, 500)
    const bomQtyPerUnit = quote.totalParts

    // Calculate unit cost
    let unitCost = 0
    quote.bom.forEach((bomItem) => {
      const component = components.find((c) => c.partNumber === bomItem.partNumber)
      if (component) {
        unitCost += component.standardCost * bomItem.requiredQty
      }
    })

    const totalQuoteCost = unitCost * totalUnits

    const isConverted = Math.random() > 0.3
    const status: QuoteTrackerStatus = isConverted
      ? "Converted"
      : (["Submitted", "In Process", "Cancelled"][randomInt(0, 2)] as QuoteTrackerStatus)

    const dateSubmitted = new Date(2024, randomInt(0, 11), randomInt(1, 28))
    const dateConverted = isConverted ? new Date(dateSubmitted.getTime() + randomInt(7, 45) * 86400000) : null

    // Generate fulfillments only for converted quotes
    const fulfillments: QuoteFulfillment[] = []
    if (isConverted && Math.random() > 0.3) {
      const numFulfillments = randomInt(1, 3)
      for (let i = 0; i < numFulfillments; i++) {
        const unitsRequired = Math.floor(totalUnits / numFulfillments)
        fulfillments.push({
          fulfillmentId: `FUL-${quote.quoteId}-${String(i + 1).padStart(2, "0")}`,
          quoteId: quote.quoteId,
          fulfillmentDate: new Date(2025, randomInt(0, 11), randomInt(1, 28)),
          unitsRequired,
          clientShipmentCode: `SHP-${randomInt(10000, 99999)}`,
          locationCity: ["San Diego", "Norfolk", "Pearl Harbor", "Seattle", "Charleston"][randomInt(0, 4)],
          locationState: ["CA", "VA", "HI", "WA", "SC"][randomInt(0, 4)],
        })
      }
    }

    items.push({
      quoteId: quote.quoteId,
      quoteName: quote.quoteName,
      requestor: requestors[idx % requestors.length], // Added requestor
      totalUnits,
      bomQtyPerUnit,
      totalQuoteCost,
      unitCost,
      salesOrderId: isConverted ? `SO-2025-${randomInt(1000, 9999)}` : null, // Null for non-converted
      crmId: `CRM-${randomInt(100000, 999999)}`,
      status,
      dateSubmitted,
      dateConverted,
      fulfillments,
      bom: quote.bom,
    })
  })

  return items
}

// Export singleton instances
export const mockComponents = generateComponents(200)
export const mockComponentHistory = generateComponentCostHistory(mockComponents)
export const mockRefreshEvents = generateRefreshEvents(30)
export const mockQuotes = generateQuotes(50)
export const mockWorkOrders = generateWorkOrders(100)
export const mockAssemblyQuotes = generateAssemblyQuotes(mockComponents)
export const mockQuoteTrackerItems = generateQuoteTrackerItems(mockAssemblyQuotes, mockComponents)

export type OperationStatus = "On Track" | "At Risk" | "Delayed" | "Blocked"
export type OperationType = "Assembly" | "Testing" | "Procurement" | "Manufacturing"

export type MaterialShortage = {
  partNumber: string
  description: string
  supplier: string
  shortageQty: number
  requiredBy: Date
  expectedReceipt: Date | null
  daysLate: number
  rootCause: string
  impactDays: number
}

export type Operation = {
  operationId: string
  operationName: string
  operationType: OperationType
  startDate: Date
  endDate: Date
  duration: number
  status: OperationStatus
  isCriticalPath: boolean
  progress: number
  dependencies: string[] // operation IDs that must complete first
  materialShortages: MaterialShortage[]
  assignedTo: string
}

export type Subassembly = {
  subassemblyId: string
  subassemblyName: string
  operations: Operation[]
}

export type Program = {
  programId: string
  programName: string
  platform: string
  supplier: string
  programStartDate: Date
  programEndDate: Date
  subassemblies: Subassembly[]
}

// Generate comprehensive program data for Gantt chart
export function generateProgramData(): Program[] {
  const today = new Date()
  const programs: Program[] = []

  // Program 1: Manpack Radio System
  const manpackStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const manpackEnd = new Date(today.getFullYear(), today.getMonth() + 5, 30)

  programs.push({
    programId: "PROG-001",
    programName: "Manpack Radio System",
    platform: "Ground Communications",
    supplier: "TechCorp Industries",
    programStartDate: manpackStart,
    programEndDate: manpackEnd,
    subassemblies: [
      {
        subassemblyId: "SUB-001-A",
        subassemblyName: "Main PCB Assembly",
        operations: [
          {
            operationId: "OP-001",
            operationName: "PCB Fabrication",
            operationType: "Manufacturing",
            startDate: new Date(today.getFullYear(), today.getMonth() - 1, 1),
            endDate: new Date(today.getFullYear(), today.getMonth(), 15),
            duration: 45,
            status: "On Track",
            isCriticalPath: true,
            progress: 85,
            dependencies: [],
            materialShortages: [],
            assignedTo: "PCB Division",
          },
          {
            operationId: "OP-002",
            operationName: "Component Assembly",
            operationType: "Assembly",
            startDate: new Date(today.getFullYear(), today.getMonth(), 16),
            endDate: new Date(today.getFullYear(), today.getMonth() + 1, 10),
            duration: 25,
            status: "At Risk",
            isCriticalPath: true,
            progress: 0,
            dependencies: ["OP-001"],
            materialShortages: [
              {
                partNumber: "HR-PRO-0015",
                description: "Processor Module 15",
                supplier: "MicroTech Systems",
                shortageQty: 5,
                requiredBy: new Date(today.getFullYear(), today.getMonth(), 20),
                expectedReceipt: new Date(today.getFullYear(), today.getMonth() + 1, 5),
                daysLate: 15,
                rootCause: "Late PO",
                impactDays: 11,
              },
            ],
            assignedTo: "Assembly Line 1",
          },
          {
            operationId: "OP-003",
            operationName: "PCB Testing",
            operationType: "Testing",
            startDate: new Date(today.getFullYear(), today.getMonth() + 1, 11),
            endDate: new Date(today.getFullYear(), today.getMonth() + 1, 20),
            duration: 10,
            status: "On Track",
            isCriticalPath: true,
            progress: 0,
            dependencies: ["OP-002"],
            materialShortages: [],
            assignedTo: "QA Team",
          },
        ],
      },
      {
        subassemblyId: "SUB-001-B",
        subassemblyName: "RF Module Integration",
        operations: [
          {
            operationId: "OP-004",
            operationName: "RF Component Procurement",
            operationType: "Procurement",
            startDate: new Date(today.getFullYear(), today.getMonth() - 1, 5),
            endDate: new Date(today.getFullYear(), today.getMonth(), 20),
            duration: 45,
            status: "Delayed",
            isCriticalPath: false,
            progress: 60,
            dependencies: [],
            materialShortages: [
              {
                partNumber: "HR-RFM-0023",
                description: "RF Module 23",
                supplier: "RF Solutions Ltd",
                shortageQty: 12,
                requiredBy: new Date(today.getFullYear(), today.getMonth(), 5),
                expectedReceipt: new Date(today.getFullYear(), today.getMonth(), 25),
                daysLate: 20,
                rootCause: "Supplier Capacity",
                impactDays: 8,
              },
            ],
            assignedTo: "Procurement Team",
          },
          {
            operationId: "OP-005",
            operationName: "RF Assembly",
            operationType: "Assembly",
            startDate: new Date(today.getFullYear(), today.getMonth(), 21),
            endDate: new Date(today.getFullYear(), today.getMonth() + 1, 15),
            duration: 25,
            status: "On Track",
            isCriticalPath: false,
            progress: 0,
            dependencies: ["OP-004"],
            materialShortages: [],
            assignedTo: "RF Integration Team",
          },
        ],
      },
      {
        subassemblyId: "SUB-001-C",
        subassemblyName: "Final Integration",
        operations: [
          {
            operationId: "OP-006",
            operationName: "System Integration",
            operationType: "Assembly",
            startDate: new Date(today.getFullYear(), today.getMonth() + 1, 21),
            endDate: new Date(today.getFullYear(), today.getMonth() + 2, 15),
            duration: 25,
            status: "On Track",
            isCriticalPath: true,
            progress: 0,
            dependencies: ["OP-003", "OP-005"],
            materialShortages: [],
            assignedTo: "Integration Team",
          },
          {
            operationId: "OP-007",
            operationName: "Final Testing & QA",
            operationType: "Testing",
            startDate: new Date(today.getFullYear(), today.getMonth() + 2, 16),
            endDate: new Date(today.getFullYear(), today.getMonth() + 3, 10),
            duration: 25,
            status: "On Track",
            isCriticalPath: true,
            progress: 0,
            dependencies: ["OP-006"],
            materialShortages: [],
            assignedTo: "QA Team",
          },
        ],
      },
    ],
  })

  // Program 2: Base Station Assembly
  const baseStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const baseEnd = new Date(today.getFullYear(), today.getMonth() + 6, 30)

  programs.push({
    programId: "PROG-002",
    programName: "Base Station Assembly",
    platform: "Fixed Infrastructure",
    supplier: "Defense Tech Group",
    programStartDate: baseStart,
    programEndDate: baseEnd,
    subassemblies: [
      {
        subassemblyId: "SUB-002-A",
        subassemblyName: "Power Supply Module",
        operations: [
          {
            operationId: "OP-008",
            operationName: "Power PCB Manufacturing",
            operationType: "Manufacturing",
            startDate: new Date(today.getFullYear(), today.getMonth(), 1),
            endDate: new Date(today.getFullYear(), today.getMonth() + 1, 15),
            duration: 45,
            status: "Blocked",
            isCriticalPath: true,
            progress: 30,
            dependencies: [],
            materialShortages: [
              {
                partNumber: "HR-CON-0042",
                description: "Connector Module 42",
                supplier: "Precision Components Inc",
                shortageQty: 25,
                requiredBy: new Date(today.getFullYear(), today.getMonth(), 10),
                expectedReceipt: null,
                daysLate: 35,
                rootCause: "No PO Placed",
                impactDays: 35,
              },
            ],
            assignedTo: "Power Systems",
          },
          {
            operationId: "OP-009",
            operationName: "Power Testing",
            operationType: "Testing",
            startDate: new Date(today.getFullYear(), today.getMonth() + 1, 16),
            endDate: new Date(today.getFullYear(), today.getMonth() + 2, 5),
            duration: 20,
            status: "On Track",
            isCriticalPath: true,
            progress: 0,
            dependencies: ["OP-008"],
            materialShortages: [],
            assignedTo: "QA Team",
          },
        ],
      },
      {
        subassemblyId: "SUB-002-B",
        subassemblyName: "Communication Module",
        operations: [
          {
            operationId: "OP-010",
            operationName: "Modem Integration",
            operationType: "Assembly",
            startDate: new Date(today.getFullYear(), today.getMonth(), 15),
            endDate: new Date(today.getFullYear(), today.getMonth() + 1, 25),
            duration: 40,
            status: "At Risk",
            isCriticalPath: false,
            progress: 45,
            dependencies: [],
            materialShortages: [
              {
                partNumber: "HR-MOD-0008",
                description: "Modem Module 8",
                supplier: "Advanced Electronics Co",
                shortageQty: 8,
                requiredBy: new Date(today.getFullYear(), today.getMonth(), 25),
                expectedReceipt: new Date(today.getFullYear(), today.getMonth() + 1, 10),
                daysLate: 16,
                rootCause: "Manufacturing Delay",
                impactDays: 12,
              },
            ],
            assignedTo: "Comm Team",
          },
        ],
      },
    ],
  })

  return programs
}

export const mockProgramData = generateProgramData()

export type ProductInProduction = {
  id: string // Added id field
  partNumber: string // Added partNumber field
  name: string // Renamed from partDescription
  partDescription: string // Added partDescription field
  plant: string
  totalUnits: number
  unitsProduced: number
  targetUnits: number // Added targetUnits field
  remainingUnits: number
  targetCostPerUnit: number
  avgCostPerUnit: number
  totalCostCurrent: number // Added totalCostCurrent field
  totalCostVariance: number
  totalCostVariancePct: number
  varianceToTarget: number // Added varianceToTarget field
  quotePrice: number // Added quotePrice field
  startDate: Date
  estimatedCompletionDate: Date // Renamed from estimatedEndDate
  status: "On Track" | "At Risk" | "Behind" // Added status field
  costHistory: { date: Date; costPerUnit: number }[]
  subAssemblies: SubAssemblyBreakdown[]
}

export type SubAssemblyBreakdown = {
  name: string
  laborCost: number
  nonLaborCost: number
  laborBreakdown: LaborBreakdown
  nonLaborBreakdown: NonLaborBreakdown
  directLaborWorkstations?: WorkstationBreakdown[]
  indirectLaborTypes?: { type: string; cost: number }[]
  reworkCategories?: { category: string; cost: number }[]
  materialCategories?: { category: string; cost: number }[]
  overheadTypes?: { type: string; cost: number }[]
  costHistory?: CostComponentHistory[]
}

export type LaborBreakdown = {
  directLabor: number
  indirectLabor: number
  rework: number
  benefits: number
  target: number
}

export type NonLaborBreakdown = {
  material: number
  freight: number
  scrap: number
  overhead: number
  quality: number
  materialBySupplier?: { supplier: string; cost: number; parts: string[] }[]
  scrapByMaterial?: { material: string; supplier: string; cost: number }[]
}

export type WorkstationBreakdown = {
  workstationId: string
  workstationName: string
  cost: number
  targetTimePerUnit: number // Expected time per unit in seconds
  actualCycleTime: number // Actual time per unit in seconds
  efficiency: number
}

export type CostComponentHistory = {
  date: Date
  directLabor: number
  indirectLabor: number
  rework: number
  benefits: number
  material: number
  freight: number
  scrap: number
  overhead: number
  quality: number
}

export function generateProductsInProduction(
  assemblyQuotes: AssemblyQuote[],
  components: Component[],
): ProductInProduction[] {
  const products: ProductInProduction[] = []
  const plants = ["Plant A - Houston", "Plant B - Los Angeles", "Plant C - Dallas", "Plant D - Phoenix"]
  const today = new Date()

  // Take converted quotes (those with sales orders)
  const convertedQuotes = assemblyQuotes.filter((_, idx) => idx % 3 !== 0) // ~67% converted

  convertedQuotes.forEach((quote, idx) => {
    const startDate = new Date(2024, 0, 1)
    startDate.setMonth(startDate.getMonth() + idx)

    const totalUnits = randomInt(100, 1000)
    const unitsProduced = randomInt(Math.floor(totalUnits * 0.3), Math.floor(totalUnits * 0.9))
    const targetCostPerUnit = randomFloat(800, 3000)
    const avgCostPerUnit = targetCostPerUnit * randomFloat(0.85, 1.15)

    // Generate 12 months of cost history
    const costHistory: { date: Date; costPerUnit: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const variance = randomFloat(-0.15, 0.15)
      costHistory.push({
        date,
        costPerUnit: targetCostPerUnit * (1 + variance),
      })
    }

    const numSubAssemblies = randomInt(2, 4)
    const subAssemblies: SubAssemblyBreakdown[] = []

    for (let i = 0; i < numSubAssemblies; i++) {
      const assemblyNames = ["Chassis Assembly", "Main PCB Assembly", "Software Module", "Power Supply Module"]
      const name = assemblyNames[i] || `Assembly ${i + 1}`

      // Generate labor costs per unit
      const directLaborPerUnit = randomFloat(20, 80)
      const indirectLaborPerUnit = randomFloat(5, 25)
      const reworkPerUnit = randomFloat(2, 15)
      const benefitsPerUnit = randomFloat(3, 12)
      const totalLaborPerUnit = directLaborPerUnit + indirectLaborPerUnit + reworkPerUnit + benefitsPerUnit

      // Generate non-labor costs per unit
      const materialPerUnit = randomFloat(100, 400)
      const freightPerUnit = randomFloat(10, 40)
      const scrapPerUnit = randomFloat(5, 30)
      const overheadPerUnit = randomFloat(10, 35)
      const qualityPerUnit = randomFloat(3, 15)
      const totalNonLaborPerUnit = materialPerUnit + freightPerUnit + scrapPerUnit + overheadPerUnit + qualityPerUnit

      // Break down direct labor into workstations (sum to directLaborPerUnit)
      const numWorkstations = randomInt(2, 4)
      const workstationPercentages = Array.from({ length: numWorkstations }, () => Math.random())
      const totalPercentage = workstationPercentages.reduce((a, b) => a + b, 0)
      const directLaborWorkstations: WorkstationBreakdown[] = workstationPercentages.map((pct, idx) => ({
        workstationId: `WS-${String(i * 10 + idx + 1).padStart(3, "0")}`,
        workstationName:
          [
            "Drill Press",
            "Welding Station",
            "CNC Mill",
            "Assembly Line",
            "Programming Workstation",
            "Debugging Station",
            "Test Bench",
            "QC Station",
          ][idx] || `Workstation ${idx + 1}`,
        cost: (pct / totalPercentage) * directLaborPerUnit,
        targetTimePerUnit: randomInt(45, 180), // Target: 45-180 seconds per unit
        actualCycleTime: randomInt(50, 200), // Actual: 50-200 seconds per unit
        efficiency: randomFloat(0.8, 1.0),
      }))

      // Break down indirect labor (sum to indirectLaborPerUnit)
      const indirectTypes = ["Supervision", "Quality Assurance", "Material Handling", "Setup & Teardown"]
      const indirectPercentages = Array.from({ length: 2 }, () => Math.random())
      const totalIndirectPct = indirectPercentages.reduce((a, b) => a + b, 0)
      const indirectLaborTypes = indirectPercentages.map((pct, idx) => ({
        type: indirectTypes[idx] || `Indirect ${idx + 1}`,
        cost: (pct / totalIndirectPct) * indirectLaborPerUnit,
      }))

      // Break down rework (sum to reworkPerUnit)
      const reworkTypes = ["Design Errors", "Manufacturing Defects", "Code Errors", "Assembly Errors"]
      const reworkPercentages = Array.from({ length: 2 }, () => Math.random())
      const totalReworkPct = reworkPercentages.reduce((a, b) => a + b, 0)
      const reworkCategories = reworkPercentages.map((pct, idx) => ({
        category: reworkTypes[idx] || `Rework ${idx + 1}`,
        cost: (pct / totalReworkPct) * reworkPerUnit,
      }))

      // Break down material by supplier (sum to materialPerUnit)
      const numSuppliers = randomInt(2, 4)
      const supplierPercentages = Array.from({ length: numSuppliers }, () => Math.random())
      const totalSupplierPct = supplierPercentages.reduce((a, b) => a + b, 0)
      const supplierNames = ["Acme Electronics", "TechSupply Corp", "Global Components", "Precision Parts Inc"]
      const materialBySupplier = supplierPercentages.map((pct, idx) => ({
        supplier: supplierNames[idx] || `Supplier ${idx + 1}`,
        cost: (pct / totalSupplierPct) * materialPerUnit,
        parts: [`Part ${idx * 2 + 1}`, `Part ${idx * 2 + 2}`],
      }))

      // Break down material into categories (sum to materialPerUnit)
      const categoryPercentages = Array.from({ length: 2 }, () => Math.random())
      const totalCategoryPct = categoryPercentages.reduce((a, b) => a + b, 0)
      const materialCategories = categoryPercentages.map((pct, idx) => ({
        category: ["Structural Materials", "Electrical Components"][idx] || `Category ${idx + 1}`,
        cost: (pct / totalCategoryPct) * materialPerUnit,
      }))

      // Break down overhead (sum to overheadPerUnit)
      const overheadPercentages = Array.from({ length: 2 }, () => Math.random())
      const totalOverheadPct = overheadPercentages.reduce((a, b) => a + b, 0)
      const overheadTypes = overheadPercentages.map((pct, idx) => ({
        type: ["Utilities", "Facility Maintenance"][idx] || `Overhead ${idx + 1}`,
        cost: (pct / totalOverheadPct) * overheadPerUnit,
      }))

      // Scrap by material (subset of scrapPerUnit)
      const scrapPercentages = Array.from({ length: 2 }, () => Math.random())
      const totalScrapPct = scrapPercentages.reduce((a, b) => a + b, 0)
      const scrapByMaterial = scrapPercentages.map((pct, idx) => ({
        material: materialBySupplier[idx]?.parts[0] || `Material ${idx + 1}`,
        supplier: materialBySupplier[idx]?.supplier || `Supplier ${idx + 1}`,
        cost: (pct / totalScrapPct) * scrapPerUnit,
      }))

      // Generate cost history for trends (per unit over time)
      const subCostHistory = []
      for (let month = 11; month >= 0; month--) {
        const date = new Date()
        date.setMonth(date.getMonth() - month)
        const variance = randomFloat(0.85, 1.15)
        subCostHistory.push({
          date,
          directLabor: directLaborPerUnit * variance,
          indirectLabor: indirectLaborPerUnit * variance,
          rework: reworkPerUnit * variance,
          benefits: benefitsPerUnit * variance,
          material: materialPerUnit * variance,
          freight: freightPerUnit * variance,
          scrap: scrapPerUnit * variance,
          overhead: overheadPerUnit * variance,
          quality: qualityPerUnit * variance,
        })
      }

      subAssemblies.push({
        name,
        laborCost: totalLaborPerUnit,
        nonLaborCost: totalNonLaborPerUnit,
        laborBreakdown: {
          directLabor: directLaborPerUnit,
          indirectLabor: indirectLaborPerUnit,
          rework: reworkPerUnit,
          benefits: benefitsPerUnit,
          target: totalLaborPerUnit * 0.9,
        },
        nonLaborBreakdown: {
          material: materialPerUnit,
          freight: freightPerUnit,
          scrap: scrapPerUnit,
          overhead: overheadPerUnit,
          quality: qualityPerUnit,
          materialBySupplier,
          scrapByMaterial,
        },
        directLaborWorkstations,
        indirectLaborTypes,
        reworkCategories,
        materialCategories,
        overheadTypes,
        costHistory: subCostHistory,
      })
    }

    products.push({
      id: quote.quoteId, // Added id field
      partNumber: quote.quoteId.replace("ASY-SR", "PART"), // Example part number generation
      name: quote.quoteName, // Renamed from partDescription
      partDescription: `Assembly for ${quote.quoteName}`, // Added partDescription field
      plant: plants[idx % plants.length],
      totalUnits,
      unitsProduced,
      targetUnits: totalUnits, // Added targetUnits field
      remainingUnits: totalUnits - unitsProduced,
      targetCostPerUnit,
      avgCostPerUnit,
      totalCostCurrent: avgCostPerUnit * unitsProduced, // Added totalCostCurrent field
      totalCostVariance: (avgCostPerUnit - targetCostPerUnit) * unitsProduced, // Added
      totalCostVariancePct: ((avgCostPerUnit - targetCostPerUnit) / targetCostPerUnit) * 100, // Added
      varianceToTarget: ((avgCostPerUnit - targetCostPerUnit) / targetCostPerUnit) * 100, // Added varianceToTarget field
      quotePrice: targetCostPerUnit * 1.25 * (1 + randomFloat(-0.05, 0.05)), // Added quotePrice field (example)
      startDate,
      estimatedCompletionDate: new Date(startDate.getTime() + 180 * 24 * 60 * 60 * 1000), // Renamed from estimatedEndDate
      status: unitsProduced / totalUnits > 0.8 ? "On Track" : unitsProduced / totalUnits > 0.5 ? "At Risk" : "Behind", // Added status field
      costHistory,
      subAssemblies,
    })
  })

  return products
}

export const mockProductsInProduction = generateProductsInProduction(mockAssemblyQuotes, mockComponents)

export function generateDrillDownData(category: string, parentCost: number): any[] {
  const categoryLower = category.toLowerCase().replace(/\s+/g, "")

  // Direct Labor - workstation breakdown
  if (categoryLower === "directlabor") {
    const workstations = [
      { name: "PCB Assembly Station", portion: 0.35, efficiency: 94, targetTime: 120, actualTime: 128 },
      { name: "Component Integration", portion: 0.28, efficiency: 91, targetTime: 95, actualTime: 104 },
      { name: "Wire Harness Assembly", portion: 0.22, efficiency: 96, targetTime: 75, actualTime: 78 },
      { name: "Final Integration", portion: 0.15, efficiency: 89, targetTime: 60, actualTime: 67 },
    ]
    return workstations.map((ws, idx) => ({
      id: `WS-${String(idx + 1).padStart(3, "0")}`,
      name: ws.name,
      cost: parentCost * ws.portion,
      targetTimePerUnit: ws.targetTime,
      actualCycleTime: ws.actualTime,
      efficiency: ws.efficiency,
    }))
  }

  // Indirect Labor breakdown
  if (categoryLower === "indirectlabor") {
    const categories = [
      { name: "Supervision", portion: 0.4, description: "Production oversight and coordination" },
      { name: "Quality Inspection", portion: 0.35, description: "In-process and final QC checks" },
      { name: "Material Handling", portion: 0.15, description: "Kitting and logistics support" },
      { name: "Setup & Teardown", portion: 0.1, description: "Line configuration and changeover" },
    ]
    return categories.map((cat) => ({
      name: cat.name,
      cost: parentCost * cat.portion,
      description: cat.description,
    }))
  }

  // Rework breakdown
  if (categoryLower === "rework") {
    const categories = [
      { name: "Soldering Defects", portion: 0.45, frequency: "High" },
      { name: "Assembly Errors", portion: 0.3, frequency: "Medium" },
      { name: "Component Damage", portion: 0.15, frequency: "Low" },
      { name: "Other Rework", portion: 0.1, frequency: "Low" },
    ]
    return categories.map((cat) => ({
      name: cat.name,
      cost: parentCost * cat.portion,
      frequency: cat.frequency,
    }))
  }

  // Benefits breakdown
  if (categoryLower === "benefits") {
    const categories = [
      { name: "Health Insurance", portion: 0.45 },
      { name: "Retirement/401k", portion: 0.3 },
      { name: "Payroll Taxes", portion: 0.15 },
      { name: "Other Benefits", portion: 0.1 },
    ]
    return categories.map((cat) => ({
      name: cat.name,
      cost: parentCost * cat.portion,
    }))
  }

  // Material breakdown by supplier
  if (categoryLower === "material") {
    const suppliers = [
      { name: "Acme Electronics", portion: 0.4, parts: ["PCB-001", "CAP-200", "RES-150", "IC-450"] },
      { name: "TechSupply Corp", portion: 0.28, parts: ["CONN-100", "CABLE-50", "WIRE-300"] },
      { name: "Global Components", portion: 0.2, parts: ["MCU-001", "PROC-200", "MEM-100"] },
      { name: "Precision Parts Inc", portion: 0.12, parts: ["SCREW-500", "NUT-400", "WASHER-300"] },
    ]
    return suppliers.map((sup) => ({
      supplier: sup.name,
      name: sup.name,
      cost: parentCost * sup.portion,
      parts: sup.parts,
    }))
  }

  // Overhead breakdown
  if (categoryLower === "overhead") {
    const categories = [
      { name: "Facility Costs", portion: 0.4, description: "Rent, maintenance, utilities" },
      { name: "Equipment Depreciation", portion: 0.3, description: "Tooling and machinery" },
      { name: "IT & Software", portion: 0.18, description: "ERP, CAD, MES systems" },
      { name: "Administrative", portion: 0.12, description: "Management and support staff" },
    ]
    return categories.map((cat) => ({
      name: cat.name,
      cost: parentCost * cat.portion,
      description: cat.description,
    }))
  }

  // Scrap breakdown
  if (categoryLower === "scrap") {
    const categories = [
      { name: "Material Scrap", portion: 0.5, description: "2.3% scrap rate" },
      { name: "Obsolete Components", portion: 0.3, description: "EOL parts writeoff" },
      { name: "Process Waste", portion: 0.2, description: "Trim and cutoffs" },
    ]
    return categories.map((cat) => ({
      name: cat.name,
      cost: parentCost * cat.portion,
      description: cat.description,
    }))
  }

  // Quality breakdown
  if (categoryLower === "quality") {
    const categories = [
      { name: "Incoming Inspection", portion: 0.4, description: "Vendor quality checks" },
      { name: "In-Process Testing", portion: 0.35, description: "Production line testing" },
      { name: "Final QA", portion: 0.25, description: "End-of-line validation" },
    ]
    return categories.map((cat) => ({
      name: cat.name,
      cost: parentCost * cat.portion,
      description: cat.description,
    }))
  }

  // Freight breakdown
  if (categoryLower === "freight") {
    const categories = [
      { name: "Inbound Freight", portion: 0.6, description: "Supplier to factory" },
      { name: "Outbound Freight", portion: 0.3, description: "Factory to customer" },
      { name: "Expedited Shipping", portion: 0.1, description: "Rush orders" },
    ]
    return categories.map((cat) => ({
      name: cat.name,
      cost: parentCost * cat.portion,
      description: cat.description,
    }))
  }

  // Engineering breakdown
  if (categoryLower === "engineering") {
    const categories = [
      { name: "Design Engineering", portion: 0.45, description: "Product design and development" },
      { name: "Test Engineering", portion: 0.3, description: "Validation and testing protocols" },
      { name: "Process Engineering", portion: 0.25, description: "Manufacturing process optimization" },
    ]
    return categories.map((cat) => ({
      name: cat.name,
      cost: parentCost * cat.portion,
      description: cat.description,
    }))
  }

  // Default fallback - generic breakdown
  return [
    { name: "Category A", cost: parentCost * 0.4, description: "Primary category" },
    { name: "Category B", cost: parentCost * 0.35, description: "Secondary category" },
    { name: "Category C", cost: parentCost * 0.25, description: "Tertiary category" },
  ]
}

export type QuoteForReview = {
  quoteId: string
  quoteName: string
  requestor: string
  customerName: string
  productFamily: string
  application: string
  requestedQuantity: number
  createdDate: Date
  totalMaterialCost: number
  totalDirectLabor: number
  totalIndirectLabor: number
  standardMargin: number
  suggestedMargin: number
  otherCosts: { name: string; cost: number }[]
  bom: {
    partNumber: string
    description: string
    supplier: string
    costSource: string
    requiredQty: number
    unitCost: number
  }[]
  laborOperations: {
    operationName: string
    workstationId: string
    plantLocation: string
    targetTimePerUnit: number
    laborRate: number
    headCount: number
    directLaborCost: number
    indirectLaborCost: number
  }[]
  maxLeadTime: number
  longLeadItems: {
    partNumber: string
    description: string
    supplier: string
    leadTime: number
  }[]
}

export type LaborAllocation = {
  processId: string
  processName: string
  workstationId: string
  workstationName: string
  plant: string
  plantLocation: string
  targetTimePerUnitSecs: number
  laborRate: number
  headCountRequired: number
  costPerUnit: number
  bomPartsRequired: string[]
  sequenceOrder: number
}

export function createQuoteForReview(
  assemblyQuote: AssemblyQuote,
  components: Component[],
  laborAllocation: LaborAllocation[], // Renamed from laborAllocation to match the type
): QuoteForReview {
  // Calculate max lead time and long lead items
  let maxLeadTime = 0
  const longLeadItems: {
    partNumber: string
    description: string
    supplier: string
    leadTime: number
  }[] = []

  assemblyQuote.bom.forEach((bomItem) => {
    const component = components.find((c) => c.partNumber === bomItem.partNumber)
    if (component) {
      // Determine lead time based on selected lead time source
      let leadTime = component.standardLeadTimeDays
      if (component.selectedLeadTimeSource === "lastPO") {
        leadTime = component.lastPOLeadTime || leadTime
      } else if (component.selectedLeadTimeSource === "historical") {
        leadTime = component.historicalLeadTimeDays
      } else if (component.selectedLeadTimeSource === "quoted") {
        leadTime = component.quotedLeadTimeDays || leadTime
      }

      if (leadTime > maxLeadTime) {
        maxLeadTime = leadTime
      }

      if (leadTime > 30) {
        longLeadItems.push({
          partNumber: bomItem.partNumber,
          description: component.description,
          supplier: component.supplier,
          leadTime: leadTime,
        })
      }
    }
  })

  const laborOperations = laborAllocation.map((labor) => {
    const directCost = (labor.targetTimePerUnitSecs / 3600) * labor.laborRate * labor.headCountRequired
    const indirectCost = directCost * 0.15 // 15% of direct labor for indirect
    return {
      operationName: labor.processName,
      workstationId: labor.workstationId,
      plantLocation: labor.plantLocation,
      targetTimePerUnit: labor.targetTimePerUnitSecs,
      laborRate: labor.laborRate,
      headCount: labor.headCountRequired,
      directLaborCost: directCost,
      indirectLaborCost: indirectCost,
    }
  })

  const totalDirectLabor = laborOperations.reduce((sum, op) => sum + op.directLaborCost, 0)
  const totalIndirectLabor = laborOperations.reduce((sum, op) => sum + op.indirectLaborCost, 0)

  const bom = assemblyQuote.bom.map((bomItem) => {
    const component = components.find((c) => c.partNumber === bomItem.partNumber)
    const costSource = component?.selectedCostSource || "std"
    const costSourceLabel =
      costSource === "std"
        ? "Std Cost"
        : costSource === "avgPO"
          ? "Avg PO"
          : costSource === "lastPO"
            ? "Last PO"
            : "Last RFQ"

    let unitCost = component?.standardCost || 0
    if (costSource === "avgPO") unitCost = component?.avgRecentPOCost || 0
    if (costSource === "lastPO") unitCost = component?.lastPOUnitCost || 0
    if (costSource === "lastRFQ") unitCost = component?.lastRFQUnitCost || 0

    return {
      partNumber: bomItem.partNumber,
      description: component?.description || bomItem.partNumber,
      supplier: component?.supplier || "Unknown",
      costSource: costSourceLabel,
      requiredQty: bomItem.requiredQty,
      unitCost: unitCost,
    }
  })

  const totalMaterialCost = bom.reduce((sum, item) => sum + item.requiredQty * item.unitCost, 0)

  return {
    quoteId: assemblyQuote.quoteId, // Corrected from assemblyQuote.id
    quoteName: assemblyQuote.quoteName,
    requestor: "Jane Doe", // Placeholder, would come from context or CRM
    customerName: "Aerospace Systems Corp", // Would come from CRM
    productFamily: "Satellite Radio Systems",
    application: "Military Communications",
    requestedQuantity: assemblyQuote.totalParts, // Assuming totalParts represents requested quantity here
    createdDate: new Date(),
    totalMaterialCost,
    totalDirectLabor,
    totalIndirectLabor,
    standardMargin: 25, // Placeholder, could be derived
    suggestedMargin: 25, // Placeholder, could be derived
    otherCosts: [], // Placeholder, could be calculated
    bom,
    laborOperations,
    maxLeadTime,
    longLeadItems,
  }
}
