export interface Component {
  partNumber: string
  description: string
  commodity: string
  supplier: string
  lastRefreshDate: string
  daysSinceRefresh: number
  standardCost: number
  avgRecentPOCost: number
  variancePct: number
  annualSpend: number
  freshnessStatus: "Fresh" | "At Risk" | "Stale" | "Critical"
}

export interface Quote {
  quoteId: string
  customerName: string
  productFamily: string
  application: string
  requestedQuantity: number
  targetLeadTime: number
  quoteDate: string
  status: "Open" | "Won" | "Lost" | "Expired"
  pWin: number
}

export interface BOMLine {
  lineNumber: number
  partNumber: string
  description: string
  qtyPerUnit: number
  unitCost: number
  extendedCost: number
  lastRefreshDate: string
  costFreshnessStatus: "Fresh" | "At Risk" | "Stale" | "Missing"
  varianceAgainstOraclePct: number
  costSource: "Standard" | "Refreshed Vendor Quote" | "Inventory Override" | "Manual"
}

export interface WorkOrder {
  workOrderId: string
  productFamily: string
  assemblyName: string
  plant: string
  plannedLaborHours: number
  actualLaborHours: number
  varianceHours: number
  variancePct: number
  varianceStatus: "On-Track" | "Over" | "Under"
  buildStartDate: string
  buildCompleteDate: string | null
}

export type TabId = "standard-cost" | "cost-trend" | "pricing" | "quote-hub" | "cost-fidelity" | "labor" | "unit-cost"
