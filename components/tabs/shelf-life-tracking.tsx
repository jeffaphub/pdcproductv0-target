"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertTriangle, Calendar, Clock, Package, Thermometer, MapPin, Search, X, RefreshCw, FileText, Users, Clipboard, Target } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts"

// ===== TYPES =====
type LocationBucket = "Warehouse" | "WIP" | "Shop Floor" | "MRB-Hold" | "Cold Storage"
type RiskType = "All" | "Expires before use" | "Expires during build" | "Near-expiry pegged" | "Near-expiry unpegged" | "Expired"
type Persona = "Planner / Production Control" | "Stores / Warehousing" | "Quality / MRB" | "Program / PDM"
type MRBStatus = "None" | "Pending Review" | "Disposition Required" | "Rework" | "Scrap Pending"

type LotRecord = {
  id: string
  partNumber: string
  partDescription: string
  materialFamily: string
  lotBatch: string
  quantity: number
  uom: string
  receiptDate: Date
  manufactureDate: Date
  expiryDate: Date
  daysToExpiry: number
  temperatureReq: string
  location: LocationBucket
  subInventory: string
  site: string
  program: string
  mrbStatus: MRBStatus
  mrbStep: string | null
  mrbAge: number | null
  recertAllowed: boolean
  recertCyclesRemaining: number
  linkedDemand: { woNumber: string; clin: string; plannedUseDate: Date; qty: number }[]
  riskType: RiskType
  riskSentence: string
}

// ===== DATA GENERATION =====
const sites = ["Phoenix AZ", "Rochester NY", "Dallas TX", "San Diego CA"]
const programs = ["Manpack Radio", "Vehicle Mount", "Tactical HF Radio", "Base Station", "Maritime HF", "Airborne UHF"]
const materialFamilies = ["Adhesives/Sealants", "Coatings", "Conformal Coatings", "Batteries", "Thermal Interface", "Flux", "Lubricants", "Potting Compounds", "Primers", "Solders"]
const locations: LocationBucket[] = ["Warehouse", "WIP", "Shop Floor", "MRB-Hold", "Cold Storage"]
const tempReqs = ["Ambient (15-25°C)", "Refrigerated (2-8°C)", "Frozen (-18°C)", "Controlled (20±2°C)"]
const mrbStatuses: MRBStatus[] = ["None", "Pending Review", "Disposition Required", "Rework", "Scrap Pending"]

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function generateLotRecords(count: number = 200): LotRecord[] {
  const records: LotRecord[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < count; i++) {
    const receiptDate = addDays(today, -randomInt(30, 365))
    const manufactureDate = addDays(receiptDate, -randomInt(7, 60))
    // Shelf life ranges from 30 days to 2 years from manufacture
    const shelfLifeDays = randomInt(30, 730)
    const expiryDate = addDays(manufactureDate, shelfLifeDays)
    const daysToExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
    
    const location = randomChoice(locations)
    const mrbStatus = location === "MRB-Hold" ? randomChoice(mrbStatuses.slice(1)) : (Math.random() < 0.1 ? randomChoice(mrbStatuses.slice(1)) : "None")
    const mrbStep = mrbStatus !== "None" ? randomChoice(["Receiving Inspection", "MRB Review", "Disposition"]) : null
    const mrbAge = mrbStatus !== "None" ? randomInt(1, 45) : null
    
    // Generate linked demand
    const demandCount = randomInt(0, 4)
    const linkedDemand: LotRecord["linkedDemand"] = []
    for (let j = 0; j < demandCount; j++) {
      linkedDemand.push({
        woNumber: `WO-${randomInt(10000, 99999)}`,
        clin: `CLIN-${randomInt(1000, 9999)}`,
        plannedUseDate: addDays(today, randomInt(5, 120)),
        qty: randomInt(1, 50)
      })
    }
    
    // Determine risk type
    let riskType: RiskType = "All"
    let riskSentence = ""
    
    if (daysToExpiry < 0) {
      riskType = "Expired"
      riskSentence = `This lot expired ${Math.abs(daysToExpiry)} days ago and cannot be used.`
    } else if (linkedDemand.length > 0) {
      const earliestUse = linkedDemand.reduce((min, d) => d.plannedUseDate < min ? d.plannedUseDate : min, linkedDemand[0].plannedUseDate)
      const daysToUse = Math.floor((earliestUse.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
      
      if (daysToExpiry < daysToUse) {
        riskType = "Expires before use"
        riskSentence = `This lot expires ${daysToExpiry} days before planned use on ${earliestUse.toLocaleDateString()}.`
      } else if (daysToExpiry < daysToUse + 14) {
        riskType = "Expires during build"
        riskSentence = `Expires during build window — only ${daysToExpiry} days remaining, build completes in ${daysToUse + 14} days.`
      } else if (daysToExpiry <= 30) {
        riskType = "Near-expiry pegged"
        riskSentence = `Near expiry (${daysToExpiry} days) but pegged to ${linkedDemand.length} work order(s).`
      }
    } else if (daysToExpiry <= 30) {
      riskType = "Near-expiry unpegged"
      riskSentence = `Near expiry (${daysToExpiry} days) but unpegged — decision needed: expedite allocation or disposition.`
    }
    
    const materialFamily = randomChoice(materialFamilies)
    
    records.push({
      id: `LOT-${String(i + 1).padStart(5, "0")}`,
      partNumber: `PN-${randomInt(1000, 9999)}-${String.fromCharCode(65 + randomInt(0, 5))}`,
      partDescription: `${materialFamily} - ${randomChoice(["Type A", "Type B", "Grade 1", "Grade 2", "Standard", "Premium"])}`,
      materialFamily,
      lotBatch: `${randomChoice(["L", "B", "M"])}${randomInt(100000, 999999)}`,
      quantity: randomInt(1, 500),
      uom: randomChoice(["EA", "KG", "L", "ML", "G", "FT", "M"]),
      receiptDate,
      manufactureDate,
      expiryDate,
      daysToExpiry,
      temperatureReq: randomChoice(tempReqs),
      location,
      subInventory: `${randomChoice(["A", "B", "C", "D"])}-${randomInt(1, 20)}-${randomInt(1, 50)}`,
      site: randomChoice(sites),
      program: randomChoice(programs),
      mrbStatus,
      mrbStep,
      mrbAge,
      recertAllowed: Math.random() < 0.4,
      recertCyclesRemaining: randomInt(0, 3),
      linkedDemand,
      riskType: riskType === "All" ? "All" : riskType,
      riskSentence
    })
  }
  
  return records
}

// Generate data once
const allLots = generateLotRecords(200)

// ===== COMPONENT =====
export function ShelfLifeTracking() {
  // Persona state
  const [activePersona, setActivePersona] = useState<Persona>("Planner / Production Control")
  
  // Filter state
  const [selectedSite, setSelectedSite] = useState<string>("all")
  const [selectedProgram, setSelectedProgram] = useState<string>("all")
  const [selectedFamily, setSelectedFamily] = useState<string>("all")
  const [selectedPartNumber, setSelectedPartNumber] = useState<string>("")
  const [selectedLocation, setSelectedLocation] = useState<string>("all")
  const [selectedHorizon, setSelectedHorizon] = useState<number>(30)
  const [selectedRiskType, setSelectedRiskType] = useState<RiskType>("All")
  const [searchQuery, setSearchQuery] = useState<string>("")
  
  // Drawer state
  const [selectedLot, setSelectedLot] = useState<LotRecord | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  
  // Filtered data
  const filteredLots = useMemo(() => {
    let result = [...allLots]
    
    if (selectedSite !== "all") result = result.filter(l => l.site === selectedSite)
    if (selectedProgram !== "all") result = result.filter(l => l.program === selectedProgram)
    if (selectedFamily !== "all") result = result.filter(l => l.materialFamily === selectedFamily)
    if (selectedPartNumber) result = result.filter(l => l.partNumber.toLowerCase().includes(selectedPartNumber.toLowerCase()))
    if (selectedLocation !== "all") result = result.filter(l => l.location === selectedLocation)
    if (selectedRiskType !== "All") result = result.filter(l => l.riskType === selectedRiskType)
    
    // Horizon filter - show lots expiring within horizon days
    result = result.filter(l => l.daysToExpiry <= selectedHorizon || l.daysToExpiry < 0)
    
    // Search query (part/lot/WO/CLIN)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(l => 
        l.partNumber.toLowerCase().includes(q) ||
        l.lotBatch.toLowerCase().includes(q) ||
        l.linkedDemand.some(d => d.woNumber.toLowerCase().includes(q) || d.clin.toLowerCase().includes(q))
      )
    }
    
    // Sort by days to expiry (most urgent first)
    return result.sort((a, b) => a.daysToExpiry - b.daysToExpiry)
  }, [selectedSite, selectedProgram, selectedFamily, selectedPartNumber, selectedLocation, selectedHorizon, selectedRiskType, searchQuery])
  
  // KPIs
  const kpis = useMemo(() => {
    const expired = filteredLots.filter(l => l.daysToExpiry < 0).length
    const expiresBeforeUse = filteredLots.filter(l => l.riskType === "Expires before use").length
    const expiresDuringBuild = filteredLots.filter(l => l.riskType === "Expires during build").length
    const nearExpiryPegged = filteredLots.filter(l => l.riskType === "Near-expiry pegged").length
    const nearExpiryUnpegged = filteredLots.filter(l => l.riskType === "Near-expiry unpegged").length
    const mrbHeld = filteredLots.filter(l => l.mrbStatus !== "None").length
    const coldStorage = filteredLots.filter(l => l.location === "Cold Storage").length
    
    return { expired, expiresBeforeUse, expiresDuringBuild, nearExpiryPegged, nearExpiryUnpegged, mrbHeld, coldStorage, total: filteredLots.length }
  }, [filteredLots])
  
  // Chart data - Risk distribution
  const riskDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredLots.forEach(l => {
      const key = l.riskType === "All" ? "On-track" : l.riskType
      counts[key] = (counts[key] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [filteredLots])
  
  // Chart data - By material family
  const byFamilyData = useMemo(() => {
    const familyCounts: Record<string, { atRisk: number; ok: number }> = {}
    filteredLots.forEach(l => {
      if (!familyCounts[l.materialFamily]) familyCounts[l.materialFamily] = { atRisk: 0, ok: 0 }
      if (l.riskType !== "All") familyCounts[l.materialFamily].atRisk++
      else familyCounts[l.materialFamily].ok++
    })
    return Object.entries(familyCounts)
      .map(([family, data]) => ({ family, ...data }))
      .sort((a, b) => b.atRisk - a.atRisk)
      .slice(0, 10)
  }, [filteredLots])
  
  // Chart data - By location
  const byLocationData = useMemo(() => {
    const locCounts: Record<string, number> = {}
    filteredLots.filter(l => l.riskType !== "All").forEach(l => {
      locCounts[l.location] = (locCounts[l.location] || 0) + 1
    })
    return Object.entries(locCounts).map(([location, count]) => ({ location, count }))
  }, [filteredLots])
  
  // ===== PLANNER PERSONA DATA =====
  // KPIs for Planner view
  const plannerKpis = useMemo(() => {
    const nearExpiryThreshold = 14 // days
    const lotsExpireBeforeUse = filteredLots.filter(l => l.riskType === "Expires before use").length
    const lotsExpireDuringBuild = filteredLots.filter(l => l.riskType === "Expires during build").length
    const peggedNearExpiry = filteredLots.filter(l => l.riskType === "Near-expiry pegged").length
    const nearExpiryInMrb = filteredLots.filter(l => l.mrbStatus !== "None" && l.daysToExpiry <= 30 && l.daysToExpiry > 0).length
    
    // False coverage: demand looks covered but becomes uncovered when enforcing expiry
    // Count lots that have demand but expiry is before planned use
    const falseCoverage = filteredLots.filter(l => 
      l.linkedDemand.length > 0 && 
      l.linkedDemand.some(d => {
        const daysToUse = Math.floor((d.plannedUseDate.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000))
        return l.daysToExpiry < daysToUse
      })
    ).length
    
    return { lotsExpireBeforeUse, lotsExpireDuringBuild, peggedNearExpiry, nearExpiryInMrb, falseCoverage }
  }, [filteredLots])
  
  // Timeline data: top 20 most urgent lots (sorted by earliest expiry and earliest planned use)
  const timelineData = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Filter to lots with risk and sort by urgency
    const urgentLots = filteredLots
      .filter(l => l.riskType !== "All" || l.linkedDemand.length > 0)
      .map(l => {
        const earliestUse = l.linkedDemand.length > 0
          ? l.linkedDemand.reduce((min, d) => d.plannedUseDate < min ? d.plannedUseDate : min, l.linkedDemand[0].plannedUseDate)
          : null
        const daysToEarliestUse = earliestUse 
          ? Math.floor((earliestUse.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
          : 999
        return { ...l, earliestUse, daysToEarliestUse }
      })
      .sort((a, b) => {
        // Sort by earliest expiry first, then by earliest planned use
        if (a.daysToExpiry !== b.daysToExpiry) return a.daysToExpiry - b.daysToExpiry
        return a.daysToEarliestUse - b.daysToEarliestUse
      })
      .slice(0, 20)
    
    return urgentLots
  }, [filteredLots])
  
  // Worklist data: lot-demand conflicts with explicit actions
  const plannerWorklist = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Build a map of part numbers to available in-life lots
    const partToInLifeLots = new Map<string, LotRecord[]>()
    filteredLots.forEach(lot => {
      if (lot.daysToExpiry > 14) { // In-life = more than 14 days to expiry
        const existing = partToInLifeLots.get(lot.partNumber) || []
        existing.push(lot)
        partToInLifeLots.set(lot.partNumber, existing)
      }
    })
    
    const conflicts: Array<{
      lotId: string
      lot: LotRecord
      program: string
      woClin: string
      partNumber: string
      lotBatch: string
      location: LocationBucket
      qtyAtRisk: number
      earliestPeggedUse: Date | null
      plannedUseDate: Date
      expiryDate: Date
      deltaDays: number
      riskType: RiskType
      recertAllowed: boolean
      recertCycles: number
      alternateLotsAvailable: number
      actionOwner: "Planner" | "Quality" | "Buyer" | "Stores"
      recommendedAction: string
      secondaryAction: string | null
    }> = []
    
    filteredLots.forEach(lot => {
      // Calculate earliest pegged use date for this lot
      const earliestPeggedUse = lot.linkedDemand.length > 0
        ? lot.linkedDemand.reduce((min, d) => d.plannedUseDate < min ? d.plannedUseDate : min, lot.linkedDemand[0].plannedUseDate)
        : null
      
      // Count alternate in-life lots for this part (excluding current lot)
      const alternateLots = (partToInLifeLots.get(lot.partNumber) || []).filter(l => l.id !== lot.id)
      const alternateLotsAvailable = alternateLots.length
      
      // For lots with linked demand, create a row per conflict
      if (lot.linkedDemand.length > 0) {
        lot.linkedDemand.forEach(demand => {
          const daysToUse = Math.floor((demand.plannedUseDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
          const deltaDays = daysToUse - lot.daysToExpiry // positive = lot expires before planned use
          
          // Rule-based recommendations with owner assignment
          let recommendedAction = "Monitor"
          let secondaryAction: string | null = null
          let actionOwner: "Planner" | "Quality" | "Buyer" | "Stores" = "Planner"
          
          const hasConflict = deltaDays > 0 || lot.riskType === "Expires before use"
          const canResequence = lot.linkedDemand.some(d => {
            const otherDaysToUse = Math.floor((d.plannedUseDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
            return otherDaysToUse < lot.daysToExpiry && d.woNumber !== demand.woNumber
          })
          
          if (hasConflict) {
            if (lot.recertAllowed && lot.recertCyclesRemaining > 0) {
              // Recert is possible
              recommendedAction = "Start recert / extension decision"
              secondaryAction = "Replace buy if recert not feasible"
              actionOwner = "Quality"
            } else if (canResequence) {
              // Can pull in to earlier job
              recommendedAction = "Resequence / pull-in to earlier job"
              actionOwner = "Planner"
            } else {
              // No recert, no resequence option
              recommendedAction = "Replace buy + segregate/scrap"
              actionOwner = alternateLotsAvailable > 0 ? "Stores" : "Buyer"
            }
          } else if (lot.riskType === "Near-expiry pegged") {
            recommendedAction = "Prioritize consumption (use-first)"
            actionOwner = "Planner"
          } else if (lot.riskType === "Expires during build") {
            if (lot.recertAllowed && lot.recertCyclesRemaining > 0) {
              recommendedAction = "Coordinate mid-build recert"
              secondaryAction = "Pull-in operation if feasible"
              actionOwner = "Quality"
            } else {
              recommendedAction = "Pull-in operation or split lot"
              actionOwner = "Planner"
            }
          }
          
          conflicts.push({
            lotId: lot.id,
            lot,
            program: lot.program,
            woClin: `${demand.woNumber} / ${demand.clin}`,
            partNumber: lot.partNumber,
            lotBatch: lot.lotBatch,
            location: lot.location,
            qtyAtRisk: Math.min(demand.qty, lot.quantity),
            earliestPeggedUse,
            plannedUseDate: demand.plannedUseDate,
            expiryDate: lot.expiryDate,
            deltaDays,
            riskType: deltaDays > 0 ? "Expires before use" : lot.riskType,
            recertAllowed: lot.recertAllowed,
            recertCycles: lot.recertCyclesRemaining,
            alternateLotsAvailable,
            actionOwner,
            recommendedAction,
            secondaryAction
          })
        })
      } else if (lot.riskType === "Near-expiry unpegged") {
        // Unpegged near-expiry lots
        conflicts.push({
          lotId: lot.id,
          lot,
          program: lot.program,
          woClin: "Unpegged",
          partNumber: lot.partNumber,
          lotBatch: lot.lotBatch,
          location: lot.location,
          qtyAtRisk: lot.quantity,
          earliestPeggedUse: null,
          plannedUseDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), // placeholder
          expiryDate: lot.expiryDate,
          deltaDays: -lot.daysToExpiry,
          riskType: "Near-expiry unpegged",
          recertAllowed: lot.recertAllowed,
          recertCycles: lot.recertCyclesRemaining,
          alternateLotsAvailable,
          actionOwner: "Stores",
          recommendedAction: "Reallocate to demand or flag for move/scrap",
          secondaryAction: null
        })
      }
    })
    
    // Sort by delta (worst first - positive delta means expires before use)
    return conflicts.sort((a, b) => b.deltaDays - a.deltaDays)
  }, [filteredLots])
  
  // Use-first opportunities: lots expiring soon that could be consumed before expiry
  const useFirstOpportunities = useMemo(() => {
    return plannerWorklist.filter(row => {
      // Include if: near-expiry pegged with use before expiry, OR can be pulled in
      return (row.riskType === "Near-expiry pegged" && row.deltaDays <= 0) ||
             (row.deltaDays > 0 && row.recommendedAction.includes("Resequence"))
    })
  }, [plannerWorklist])
  
  // Conflicts: use after expiry
  const conflictWorklist = useMemo(() => {
    return plannerWorklist.filter(row => row.deltaDays > 0 || row.riskType === "Expires before use")
  }, [plannerWorklist])
  
  // State for timeline row selection
  const [selectedTimelineLot, setSelectedTimelineLot] = useState<string | null>(null)
  
  // Planner view mode toggle
  const [plannerViewMode, setPlannerViewMode] = useState<"conflicts" | "use-first">("conflicts")
  
  // Open drawer
  const handleLotClick = (lot: LotRecord) => {
    setSelectedLot(lot)
    setDrawerOpen(true)
  }
  
  // Risk colors
  const getRiskColor = (risk: RiskType) => {
    switch (risk) {
      case "Expired": return "bg-gray-800 text-white"
      case "Expires before use": return "bg-red-600 text-white"
      case "Expires during build": return "bg-orange-500 text-white"
      case "Near-expiry pegged": return "bg-amber-500 text-white"
      case "Near-expiry unpegged": return "bg-yellow-500 text-gray-900"
      default: return "bg-green-100 text-green-800"
    }
  }
  
  const RISK_COLORS: Record<string, string> = {
    "Expired": "#1f2937",
    "Expires before use": "#dc2626",
    "Expires during build": "#f97316",
    "Near-expiry pegged": "#f59e0b",
    "Near-expiry unpegged": "#eab308",
    "On-track": "#22c55e"
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Part Shelf-Life Tracking</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monitor expiring materials and lots to prevent scrap and production delays</p>
        </div>
      </div>
      
      {/* Persona Switch */}
      <Card className="border border-gray-200">
        <CardContent className="p-3">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(["Planner / Production Control", "Stores / Warehousing", "Quality / MRB", "Program / PDM"] as Persona[]).map(persona => (
              <button
                key={persona}
                onClick={() => setActivePersona(persona)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                  activePersona === persona
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {persona === "Planner / Production Control" && <Clipboard className="w-4 h-4" />}
                {persona === "Stores / Warehousing" && <Package className="w-4 h-4" />}
                {persona === "Quality / MRB" && <FileText className="w-4 h-4" />}
                {persona === "Program / PDM" && <Target className="w-4 h-4" />}
                {persona}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Sticky Filter Bar */}
      <Card className="border border-gray-200 sticky top-0 z-20 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-12 gap-3 items-end">
            {/* Site */}
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Site</label>
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Sites" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {sites.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            {/* Program */}
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Program</label>
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Programs" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {programs.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            {/* Material Family */}
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Material Family</label>
              <Select value={selectedFamily} onValueChange={setSelectedFamily}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Families" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Families</SelectItem>
                  {materialFamilies.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            {/* Location Bucket */}
            <div className="col-span-1">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Location</label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            {/* Horizon */}
            <div className="col-span-1">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Horizon</label>
              <Select value={String(selectedHorizon)} onValueChange={(v) => setSelectedHorizon(Number(v))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Risk Type */}
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Risk Type</label>
              <Select value={selectedRiskType} onValueChange={(v) => setSelectedRiskType(v as RiskType)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                  <SelectItem value="Expires before use">Expires before use</SelectItem>
                  <SelectItem value="Expires during build">Expires during build</SelectItem>
                  <SelectItem value="Near-expiry pegged">Near-expiry pegged</SelectItem>
                  <SelectItem value="Near-expiry unpegged">Near-expiry unpegged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Search */}
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Part/Lot/WO/CLIN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-8 text-sm"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* ===== PLANNER / PRODUCTION CONTROL PERSONA ===== */}
      {activePersona === "Planner / Production Control" && (
        <TooltipProvider>
        <div className="space-y-5">
          {/* Mode Toggle */}
          <Card className="border border-gray-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
                <button
                  onClick={() => setPlannerViewMode("conflicts")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    plannerViewMode === "conflicts"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  Conflicts: Use after expiry
                </button>
                <button
                  onClick={() => setPlannerViewMode("use-first")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    plannerViewMode === "use-first"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Clock className="w-4 h-4 inline mr-2" />
                  Use-first opportunities
                </button>
              </div>
            </CardContent>
          </Card>
          
          {/* ZONE A: KPI Strip - 5 Large Tiles */}
          <div className="grid grid-cols-12 gap-4">
            {[
              { label: "Expires Before Planned Use", value: plannerKpis.lotsExpireBeforeUse, color: "text-red-700", bg: "bg-red-50", border: "border-red-200", desc: "Lots expiring before WO use date" },
              { label: "Expires During Build", value: plannerKpis.lotsExpireDuringBuild, color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", desc: "Expiry falls within build window" },
              { label: "Pegged Near-Expiry", value: plannerKpis.peggedNearExpiry, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", desc: "Use within 14 days of expiry" },
              { label: "Near-Expiry in MRB", value: plannerKpis.nearExpiryInMrb, color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200", desc: "At-risk and stuck in MRB" },
              { label: "False Coverage", value: plannerKpis.falseCoverage, color: "text-gray-800", bg: "bg-gray-100", border: "border-gray-300", desc: "Covered but uncovered if expiry enforced" },
            ].map((kpi, i) => (
              <Card key={i} className={`col-span-12 lg:col-span-2 ${i === 4 ? "lg:col-span-4" : ""} border-2 ${kpi.border} ${kpi.bg}`}>
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{kpi.label}</p>
                  <p className={`text-4xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{kpi.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Explanation Banner */}
          <div className={`rounded-lg px-4 py-3 border ${plannerViewMode === "conflicts" ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"}`}>
            <p className={`text-sm font-medium ${plannerViewMode === "conflicts" ? "text-red-800" : "text-blue-800"}`}>
              {plannerViewMode === "conflicts" ? (
                <>
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  <strong>Red markers</strong> indicate the work order planned use date is <strong>after</strong> the lot expiry date. These are false-coverage conflicts that require action: resequence, reallocate, recert, or replace.
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 inline mr-2" />
                  <strong>Use-first opportunities</strong> are lots expiring soon that have pegged demand <strong>before</strong> expiry. Prioritize consumption to prevent scrap. Blue markers show safe use windows.
                </>
              )}
            </p>
          </div>
          
          {/* ZONE B: Pegging Conflict Timeline (Gantt-like) */}
          <Card className="border-2 border-gray-300">
            <CardHeader className="py-4 px-5 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-gray-900">
                    {plannerViewMode === "conflicts" ? "Pegging Conflict Timeline" : "Use-First Opportunity Timeline"}
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {plannerViewMode === "conflicts" 
                      ? "Lots where planned use is after expiry — click a row to filter worklist and open details"
                      : "Lots expiring soon with demand before expiry — prioritize consumption"
                    }
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5"><span className="w-4 h-2 bg-green-500 rounded" /> Life remaining</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-600 rounded-full" /> Use before expiry</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-600 rounded-full ring-2 ring-red-200" /> Use after expiry</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                {/* Timeline header */}
                <div className="flex border-b border-gray-200 bg-gray-100">
                  <div className="w-48 flex-shrink-0 p-3 text-xs font-bold text-gray-700">Lot / Part</div>
                  <div className="flex-1 relative h-10">
                    {/* Day markers */}
                    {[0, 30, 60, 90, 120, 150, 180].map(day => (
                      <div key={day} className="absolute top-0 bottom-0 flex flex-col items-center justify-center text-xs text-gray-500" style={{ left: `${(day / 180) * 100}%` }}>
                        <span className="font-medium">{day === 0 ? "Today" : `+${day}d`}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Timeline rows */}
                <div className="divide-y divide-gray-100">
                  {timelineData
                    .filter(lot => {
                      if (plannerViewMode === "conflicts") {
                        // Show lots with use after expiry
                        return lot.linkedDemand.some(d => {
                          const daysToUse = Math.floor((d.plannedUseDate.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000))
                          return daysToUse > lot.daysToExpiry
                        })
                      } else {
                        // Show lots with use before expiry (opportunities)
                        return lot.linkedDemand.some(d => {
                          const daysToUse = Math.floor((d.plannedUseDate.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000))
                          return daysToUse <= lot.daysToExpiry && lot.daysToExpiry <= 30
                        })
                      }
                    })
                    .map(lot => {
                    const maxDays = 180
                    const expiryPct = Math.min(Math.max(lot.daysToExpiry / maxDays * 100, 0), 100)
                    const isSelected = selectedTimelineLot === lot.id
                    
                    return (
                      <div 
                        key={lot.id} 
                        className={`flex items-center cursor-pointer transition-colors ${isSelected ? "bg-blue-100" : "hover:bg-gray-50"}`}
                        onClick={() => {
                          setSelectedTimelineLot(isSelected ? null : lot.id)
                          handleLotClick(lot)
                        }}
                      >
                        <div className="w-48 flex-shrink-0 p-3">
                          <p className="text-sm font-semibold text-gray-900 truncate">{lot.lotBatch}</p>
                          <p className="text-xs text-gray-500 truncate">{lot.partNumber}</p>
                        </div>
                        <div className="flex-1 relative h-14 py-2">
                          {/* Life bar from today to expiry - ALWAYS green */}
                          {lot.daysToExpiry > 0 && (
                            <UITooltip>
                              <TooltipTrigger asChild>
                                <div 
                                  className="absolute top-1/2 -translate-y-1/2 h-3 rounded bg-green-500 cursor-help"
                                  style={{ left: "0%", width: `${expiryPct}%` }}
                                >
                                  {/* Expiry marker */}
                                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-gray-800 rounded" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-gray-900 text-white p-2 text-xs">
                                <p><strong>Lot:</strong> {lot.lotBatch}</p>
                                <p><strong>Expiry:</strong> {lot.expiryDate.toLocaleDateString()}</p>
                                <p><strong>Days remaining:</strong> {lot.daysToExpiry}</p>
                              </TooltipContent>
                            </UITooltip>
                          )}
                          
                          {/* Already expired indicator */}
                          {lot.daysToExpiry <= 0 && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-gray-800 text-white text-xs font-bold rounded">
                              EXPIRED
                            </div>
                          )}
                          
                          {/* Demand markers with tooltips */}
                          {lot.linkedDemand.map((d, i) => {
                            const daysToUse = Math.floor((d.plannedUseDate.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000))
                            const usePct = Math.min(Math.max(daysToUse / maxDays * 100, 0), 100)
                            const isAfterExpiry = daysToUse > lot.daysToExpiry
                            const deltaDays = daysToUse - lot.daysToExpiry
                            
                            return (
                              <UITooltip key={i}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 cursor-help ${
                                      isAfterExpiry 
                                        ? "bg-red-600 border-red-300 ring-2 ring-red-200" 
                                        : "bg-blue-600 border-blue-300"
                                    }`}
                                    style={{ left: `${usePct}%` }}
                                  />
                                </TooltipTrigger>
                                <TooltipContent side="top" className={`p-2 text-xs ${isAfterExpiry ? "bg-red-900 text-white" : "bg-gray-900 text-white"}`}>
                                  <p><strong>WO/CLIN:</strong> {d.woNumber} / {d.clin}</p>
                                  <p><strong>Planned use:</strong> {d.plannedUseDate.toLocaleDateString()}</p>
                                  <p><strong>Expiry:</strong> {lot.expiryDate.toLocaleDateString()}</p>
                                  <p><strong>Delta:</strong> <span className={isAfterExpiry ? "text-red-300 font-bold" : "text-green-300"}>{isAfterExpiry ? `+${deltaDays}d (USE AFTER EXPIRY)` : `${deltaDays}d (safe)`}</span></p>
                                </TooltipContent>
                              </UITooltip>
                            )
                          })}
                        </div>
                        <div className="w-32 flex-shrink-0 p-3 text-right">
                          <Badge variant="outline" className={`text-xs ${getRiskColor(lot.riskType)}`}>
                            {lot.riskType === "All" ? "OK" : lot.riskType.replace("Near-expiry ", "").replace("Expires ", "")}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                  {timelineData.length === 0 && (
                    <div className="p-8 text-center text-gray-400">No lots with conflicts in current filters</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* ZONE C: Planner Exception Worklist */}
          <Card className="border-2 border-gray-300">
            <CardHeader className="py-4 px-5 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-gray-900">
                    {plannerViewMode === "conflicts" ? "False-Coverage Conflicts" : "Use-First Opportunities"}
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {plannerViewMode === "conflicts" 
                      ? `${conflictWorklist.length} conflicts where planned use is after expiry`
                      : `${useFirstOpportunities.length} lots that can be consumed before expiry`
                    }
                    {selectedTimelineLot && " — filtered to selected lot"}
                  </p>
                </div>
                {selectedTimelineLot && (
                  <Button variant="outline" size="sm" onClick={() => setSelectedTimelineLot(null)}>
                    Clear Filter
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[450px]">
                <table className="w-full">
                  <thead className="sticky top-0 bg-gray-100 z-10">
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Program</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">WO / CLIN</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Part</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Lot</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Location</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Qty</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Earliest Pegged</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Planned Use</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Expiry</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Delta</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Alt Lots</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Owner</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap min-w-[220px]">Recommended Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(() => {
                      const displayData = plannerViewMode === "conflicts" ? conflictWorklist : useFirstOpportunities
                      const filteredData = selectedTimelineLot 
                        ? displayData.filter(w => w.lotId === selectedTimelineLot)
                        : displayData
                      
                      return filteredData.slice(0, 50).map((row, i) => (
                        <tr 
                          key={`${row.lotId}-${i}`} 
                          className="hover:bg-blue-50 cursor-pointer transition-colors"
                          onClick={() => handleLotClick(row.lot)}
                        >
                          <td className="p-3 text-sm font-medium text-gray-900">{row.program}</td>
                          <td className="p-3 text-sm font-mono text-blue-600">{row.woClin}</td>
                          <td className="p-3 text-sm text-gray-700">{row.partNumber}</td>
                          <td className="p-3 text-sm font-mono text-gray-700">{row.lotBatch}</td>
                          <td className="p-3 text-sm text-gray-600">{row.location}</td>
                          <td className="p-3 text-sm font-bold text-gray-900">{row.qtyAtRisk}</td>
                          <td className="p-3 text-sm text-gray-600 whitespace-nowrap">
                            {row.earliestPeggedUse ? row.earliestPeggedUse.toLocaleDateString() : "—"}
                          </td>
                          <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{row.plannedUseDate.toLocaleDateString()}</td>
                          <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{row.expiryDate.toLocaleDateString()}</td>
                          <td className={`p-3 text-sm font-bold whitespace-nowrap ${row.deltaDays > 0 ? "text-red-600" : row.deltaDays > -14 ? "text-orange-600" : "text-green-600"}`}>
                            {row.deltaDays > 0 ? `+${row.deltaDays}d` : `${row.deltaDays}d`}
                            {row.deltaDays > 0 && <AlertTriangle className="inline w-3 h-3 ml-1" />}
                          </td>
                          <td className="p-3 text-sm">
                            {row.alternateLotsAvailable > 0 ? (
                              <Badge variant="outline" className="text-[10px] text-green-700 border-green-300">
                                Yes ({row.alternateLotsAvailable})
                              </Badge>
                            ) : (
                              <span className="text-gray-400">No</span>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className={`text-[10px] ${
                              row.actionOwner === "Quality" ? "text-purple-700 border-purple-300 bg-purple-50" :
                              row.actionOwner === "Buyer" ? "text-blue-700 border-blue-300 bg-blue-50" :
                              row.actionOwner === "Stores" ? "text-orange-700 border-orange-300 bg-orange-50" :
                              "text-gray-700 border-gray-300 bg-gray-50"
                            }`}>
                              {row.actionOwner}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="text-sm font-medium text-blue-700">{row.recommendedAction}</div>
                            {row.secondaryAction && (
                              <div className="text-xs text-gray-500 mt-0.5">{row.secondaryAction}</div>
                            )}
                          </td>
                        </tr>
                      ))
                    })()}
                    {(plannerViewMode === "conflicts" ? conflictWorklist : useFirstOpportunities).length === 0 && (
                      <tr>
                        <td colSpan={13} className="p-8 text-center text-gray-400">
                          {plannerViewMode === "conflicts" 
                            ? "No false-coverage conflicts in current filters" 
                            : "No use-first opportunities in current filters"
                          }
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {(plannerViewMode === "conflicts" ? conflictWorklist : useFirstOpportunities).length > 50 && (
                <div className="py-3 px-5 border-t border-gray-100 text-center bg-gray-50">
                  <span className="text-sm text-gray-500">
                    Showing 50 of {(plannerViewMode === "conflicts" ? conflictWorklist : useFirstOpportunities).length} items
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </TooltipProvider>
      )}
      
      {/* ===== OTHER PERSONAS: Show default KPIs, charts, and worklist ===== */}
      {activePersona !== "Planner / Production Control" && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-12 gap-3">
            {[
              { label: "Total in Scope", value: kpis.total, color: "text-gray-800", bg: "bg-gray-50" },
              { label: "Expired", value: kpis.expired, color: "text-gray-800", bg: "bg-gray-200" },
              { label: "Expires Before Use", value: kpis.expiresBeforeUse, color: "text-red-700", bg: "bg-red-50" },
              { label: "Expires During Build", value: kpis.expiresDuringBuild, color: "text-orange-700", bg: "bg-orange-50" },
              { label: "Near-Expiry Pegged", value: kpis.nearExpiryPegged, color: "text-amber-700", bg: "bg-amber-50" },
              { label: "Near-Expiry Unpegged", value: kpis.nearExpiryUnpegged, color: "text-yellow-700", bg: "bg-yellow-50" },
            ].map((kpi, i) => (
              <Card key={i} className={`col-span-2 border border-gray-200 ${kpi.bg}`}>
                <CardContent className="p-3">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{kpi.label}</p>
                  <p className={`text-2xl font-bold mt-0.5 ${kpi.color}`}>{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Charts Row - 12 column grid */}
          <div className="grid grid-cols-12 gap-4">
            {/* Risk Distribution Pie */}
            <Card className="col-span-4 border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-800">Risk Distribution</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={riskDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {riskDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.name] || "#6b7280"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value} lots`, "Count"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* At-Risk by Material Family */}
            <Card className="col-span-4 border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-800">At-Risk Lots by Material Family</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byFamilyData} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="family" type="category" width={100} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="atRisk" name="At-Risk" fill="#dc2626" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* At-Risk by Location */}
            <Card className="col-span-4 border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-800">At-Risk Lots by Location</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byLocationData} margin={{ left: 10, right: 20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="location" tick={{ fontSize: 10, angle: -20, textAnchor: 'end' }} height={60} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="At-Risk Lots" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Persona-specific content header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              {activePersona === "Stores / Warehousing" && "Inventory Action Queue"}
              {activePersona === "Quality / MRB" && "MRB & Disposition Queue"}
              {activePersona === "Program / PDM" && "Program Exposure Summary"}
            </h2>
            <Badge variant="outline" className="text-sm">{filteredLots.length} lots</Badge>
          </div>
          
          {/* Main Worklist Table */}
          <Card className="border border-gray-200">
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full">
                  <thead className="sticky top-0 bg-gray-100 z-10">
                    <tr className="border-b border-gray-200">
                      {activePersona === "Stores / Warehousing" && (
                    <>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Part Number</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Lot/Batch</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Location</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Sub-Inv</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Qty</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Temp Req</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Days to Expiry</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Risk</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Action</th>
                    </>
                  )}
                  {activePersona === "Quality / MRB" && (
                    <>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Part Number</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Lot/Batch</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">MRB Status</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">MRB Step</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">MRB Age</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Days to Expiry</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Risk</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Recert Cycles</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Linked CLINs</th>
                    </>
                  )}
                  {activePersona === "Program / PDM" && (
                    <>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Program</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Part Number</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Lot/Batch</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Material Family</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Days to Expiry</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Risk</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">Affected CLINs</th>
                      <th className="text-left p-3 text-xs font-bold text-gray-700 whitespace-nowrap">$ Exposure</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLots.slice(0, 50).map(lot => (
                  <tr 
                    key={lot.id} 
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => handleLotClick(lot)}
                  >
                    {activePersona === "Stores / Warehousing" && (
                      <>
                        <td className="p-3 text-sm font-semibold text-gray-900">{lot.partNumber}</td>
                        <td className="p-3 text-sm font-mono text-blue-600">{lot.lotBatch}</td>
                        <td className="p-3 text-sm text-gray-700">{lot.location}</td>
                        <td className="p-3 text-sm font-mono text-gray-600">{lot.subInventory}</td>
                        <td className="p-3 text-sm text-gray-700">{lot.quantity} {lot.uom}</td>
                        <td className="p-3 text-sm text-gray-600">{lot.temperatureReq}</td>
                        <td className={`p-3 text-sm font-bold ${lot.daysToExpiry < 0 ? "text-gray-800" : lot.daysToExpiry <= 14 ? "text-red-600" : "text-orange-600"}`}>
                          {lot.daysToExpiry < 0 ? `${Math.abs(lot.daysToExpiry)}d ago` : `${lot.daysToExpiry}d`}
                        </td>
                        <td className="p-3"><Badge className={`text-[10px] ${getRiskColor(lot.riskType)}`}>{lot.riskType === "All" ? "On-track" : lot.riskType}</Badge></td>
                        <td className="p-3 text-sm text-blue-600 font-medium">{lot.daysToExpiry < 0 ? "Disposition" : lot.daysToExpiry <= 14 ? "Expedite" : "Monitor"}</td>
                      </>
                    )}
                    {activePersona === "Quality / MRB" && (
                      <>
                        <td className="p-3 text-sm font-semibold text-gray-900">{lot.partNumber}</td>
                        <td className="p-3 text-sm font-mono text-blue-600">{lot.lotBatch}</td>
                        <td className="p-3"><Badge variant={lot.mrbStatus === "None" ? "secondary" : "destructive"} className="text-[10px]">{lot.mrbStatus}</Badge></td>
                        <td className="p-3 text-sm text-gray-600">{lot.mrbStep || "—"}</td>
                        <td className="p-3 text-sm text-orange-600 font-medium">{lot.mrbAge ? `${lot.mrbAge}d` : "—"}</td>
                        <td className={`p-3 text-sm font-bold ${lot.daysToExpiry < 0 ? "text-gray-800" : lot.daysToExpiry <= 14 ? "text-red-600" : "text-orange-600"}`}>
                          {lot.daysToExpiry < 0 ? `${Math.abs(lot.daysToExpiry)}d ago` : `${lot.daysToExpiry}d`}
                        </td>
                        <td className="p-3"><Badge className={`text-[10px] ${getRiskColor(lot.riskType)}`}>{lot.riskType === "All" ? "On-track" : lot.riskType}</Badge></td>
                        <td className="p-3 text-sm">{lot.recertAllowed ? <span className="text-green-600 font-medium">{lot.recertCyclesRemaining}</span> : <span className="text-gray-400">N/A</span>}</td>
                        <td className="p-3 text-sm text-gray-600">{lot.linkedDemand.map(d => d.clin).join(", ") || "—"}</td>
                      </>
                    )}
                    {activePersona === "Program / PDM" && (
                      <>
                        <td className="p-3 text-sm font-semibold text-gray-900">{lot.program}</td>
                        <td className="p-3 text-sm font-medium text-gray-700">{lot.partNumber}</td>
                        <td className="p-3 text-sm font-mono text-blue-600">{lot.lotBatch}</td>
                        <td className="p-3 text-sm text-gray-600">{lot.materialFamily}</td>
                        <td className={`p-3 text-sm font-bold ${lot.daysToExpiry < 0 ? "text-gray-800" : lot.daysToExpiry <= 14 ? "text-red-600" : "text-orange-600"}`}>
                          {lot.daysToExpiry < 0 ? `${Math.abs(lot.daysToExpiry)}d ago` : `${lot.daysToExpiry}d`}
                        </td>
                        <td className="p-3"><Badge className={`text-[10px] ${getRiskColor(lot.riskType)}`}>{lot.riskType === "All" ? "On-track" : lot.riskType}</Badge></td>
                        <td className="p-3 text-sm text-gray-600">{lot.linkedDemand.length > 0 ? lot.linkedDemand.map(d => d.clin).slice(0, 2).join(", ") + (lot.linkedDemand.length > 2 ? ` +${lot.linkedDemand.length - 2}` : "") : "—"}</td>
                        <td className="p-3 text-sm font-medium text-red-600">${(lot.quantity * 150).toLocaleString()}</td>
                      </>
                    )}
                  </tr>
                ))}
                {filteredLots.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-gray-400">No lots match the current filters</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredLots.length > 50 && (
            <div className="py-3 px-5 border-t border-gray-100 text-center bg-gray-50">
              <span className="text-sm text-gray-500">Showing 50 of {filteredLots.length} lots</span>
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}
      
      {/* Lot Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[700px] sm:w-[800px] lg:w-[900px] max-w-[90vw] overflow-y-auto">
          {selectedLot && (
            <>
              <SheetHeader className="pb-4 border-b border-gray-200">
                <SheetTitle className="flex items-center gap-3">
                  <span className="text-xl font-bold text-gray-900">{selectedLot.partNumber}</span>
                  <Badge className={`${getRiskColor(selectedLot.riskType)}`}>
                    {selectedLot.riskType === "All" ? "On-track" : selectedLot.riskType}
                  </Badge>
                </SheetTitle>
              </SheetHeader>
              
              {/* Risk Sentence - Plain English at top */}
              {selectedLot.riskSentence && (
                <div className={`mt-4 p-4 rounded-lg border-l-4 ${
                  selectedLot.riskType === "Expired" ? "bg-gray-100 border-gray-800" :
                  selectedLot.riskType === "Expires before use" ? "bg-red-50 border-red-600" :
                  selectedLot.riskType === "Expires during build" ? "bg-orange-50 border-orange-500" :
                  selectedLot.riskType === "Near-expiry pegged" ? "bg-amber-50 border-amber-500" :
                  "bg-yellow-50 border-yellow-500"
                }`}>
                  <p className="text-sm font-medium text-gray-800">{selectedLot.riskSentence}</p>
                </div>
              )}
              
              <div className="mt-6 space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" /> Lot Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500">Part Number</p>
                        <p className="text-sm font-medium text-gray-900">{selectedLot.partNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Lot/Batch</p>
                        <p className="text-sm font-mono font-medium text-blue-600">{selectedLot.lotBatch}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Quantity</p>
                        <p className="text-sm font-medium text-gray-900">{selectedLot.quantity} {selectedLot.uom}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Material Family</p>
                        <p className="text-sm font-medium text-gray-900">{selectedLot.materialFamily}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500">Receipt Date</p>
                        <p className="text-sm font-medium text-gray-900">{selectedLot.receiptDate.toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Manufacture Date</p>
                        <p className="text-sm font-medium text-gray-900">{selectedLot.manufactureDate.toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Expiry Date</p>
                        <p className={`text-sm font-bold ${selectedLot.daysToExpiry < 0 ? "text-gray-800" : selectedLot.daysToExpiry <= 14 ? "text-red-600" : "text-gray-900"}`}>
                          {selectedLot.expiryDate.toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Days to Expiry</p>
                        <p className={`text-lg font-bold ${selectedLot.daysToExpiry < 0 ? "text-gray-800" : selectedLot.daysToExpiry <= 14 ? "text-red-600" : selectedLot.daysToExpiry <= 30 ? "text-orange-600" : "text-green-600"}`}>
                          {selectedLot.daysToExpiry < 0 ? `Expired ${Math.abs(selectedLot.daysToExpiry)} days ago` : `${selectedLot.daysToExpiry} days`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Storage & Location */}
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Storage & Location
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Temperature Requirement</p>
                      <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                        <Thermometer className="w-4 h-4 text-blue-500" /> {selectedLot.temperatureReq}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="text-sm font-medium text-gray-900">{selectedLot.location}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Sub-Inventory</p>
                      <p className="text-sm font-mono font-medium text-gray-900">{selectedLot.subInventory}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Site</p>
                      <p className="text-sm font-medium text-gray-900">{selectedLot.site}</p>
                    </div>
                  </div>
                </div>
                
                {/* MRB Status */}
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> MRB Status
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <Badge variant={selectedLot.mrbStatus === "None" ? "secondary" : "destructive"} className="mt-1">
                        {selectedLot.mrbStatus}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Step</p>
                      <p className="text-sm font-medium text-gray-900">{selectedLot.mrbStep || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Age</p>
                      <p className="text-sm font-medium text-orange-600">{selectedLot.mrbAge ? `${selectedLot.mrbAge} days` : "—"}</p>
                    </div>
                  </div>
                </div>
                
                {/* Recertification */}
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Recertification
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Recert Allowed</p>
                      <p className={`text-sm font-medium ${selectedLot.recertAllowed ? "text-green-600" : "text-gray-500"}`}>
                        {selectedLot.recertAllowed ? "Yes" : "No"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Cycles Remaining</p>
                      <p className={`text-sm font-medium ${selectedLot.recertCyclesRemaining > 0 ? "text-green-600" : "text-gray-500"}`}>
                        {selectedLot.recertAllowed ? selectedLot.recertCyclesRemaining : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Linked Demand */}
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Linked Demand ({selectedLot.linkedDemand.length})
                  </h3>
                  {selectedLot.linkedDemand.length > 0 ? (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left p-2 text-xs font-bold text-gray-600">WO Number</th>
                            <th className="text-left p-2 text-xs font-bold text-gray-600">CLIN</th>
                            <th className="text-left p-2 text-xs font-bold text-gray-600">Planned Use Date</th>
                            <th className="text-left p-2 text-xs font-bold text-gray-600">Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedLot.linkedDemand.map((d, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="p-2 text-sm font-mono text-blue-600">{d.woNumber}</td>
                              <td className="p-2 text-sm text-gray-700">{d.clin}</td>
                              <td className="p-2 text-sm text-gray-600">{d.plannedUseDate.toLocaleDateString()}</td>
                              <td className="p-2 text-sm text-gray-700">{d.qty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No linked demand — lot is unpegged</p>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                    <Clock className="w-4 h-4 mr-2" /> Request Recert
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <AlertTriangle className="w-4 h-4 mr-2" /> Create MRB
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Users className="w-4 h-4 mr-2" /> Reassign
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
