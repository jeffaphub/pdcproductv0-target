"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertTriangle, Calendar, Clock, Package, Thermometer, MapPin, Search, X, RefreshCw, FileText, Users, Clipboard, Target, Info, ChevronRight, TrendingUp, Layers, Snowflake, BarChart3, ArrowRight } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, ScatterChart, Scatter, ZAxis, LineChart, Line, ComposedChart, Area } from "recharts"

// ===== TYPES =====
type LocationBucket = "Warehouse" | "WIP" | "Shop Floor" | "MRB-Hold" | "Cold Storage"
type RiskLens = "Expiring Soon" | "Use-First" | "False Coverage"
type Persona = "Planner / Production Control" | "Stores / Warehousing" | "Quality / MRB" | "Program / PDM"
type MRBStatus = "None" | "Pending Review" | "Disposition Required" | "Rework" | "Scrap Pending"
type RecertStatus = "Due for recert" | "In lab" | "Passed" | "Failed" | "Not eligible"

type LinkedDemand = { 
  woNumber: string
  clin: string
  plannedUseDate: Date
  qty: number
  program: string
}

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
  // Two-clock model
  shelfExpiryDate: Date
  openedDate: Date | null
  serviceLifeDays: number | null
  removedFromColdDate: Date | null
  thawLifeDays: number | null
  serviceExpiryDate: Date | null
  effectiveExpiryDate: Date
  daysToEffectiveExpiry: number
  // Other fields
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
  recertStatus: RecertStatus
  labLeadTimeDays: number | null
  linkedDemand: LinkedDemand[]
  // Computed risk
  riskType: "Healthy" | "Expires before use" | "Near-expiry pegged" | "Near-expiry unpegged" | "False coverage" | "Expired"
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

function generateLotRecords(count: number = 250): LotRecord[] {
  const records: LotRecord[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < count; i++) {
    const receiptDate = addDays(today, -randomInt(30, 365))
    const manufactureDate = addDays(receiptDate, -randomInt(7, 60))
    // Shelf life ranges from 30 days to 2 years from manufacture
    const shelfLifeDays = randomInt(30, 730)
    const shelfExpiryDate = addDays(manufactureDate, shelfLifeDays)
    
    const location = randomChoice(locations)
    const temperatureReq = randomChoice(tempReqs)
    
    // Service-life fields: only for cold-storage materials or opened containers
    let openedDate: Date | null = null
    let serviceLifeDays: number | null = null
    let removedFromColdDate: Date | null = null
    let thawLifeDays: number | null = null
    let serviceExpiryDate: Date | null = null
    
    // ~30% of lots have service-life tracking (opened or thawed)
    if (Math.random() < 0.3) {
      if (temperatureReq.includes("Frozen") || temperatureReq.includes("Refrigerated")) {
        // Thaw clock scenario
        if (location !== "Cold Storage" && Math.random() < 0.6) {
          removedFromColdDate = addDays(today, -randomInt(1, 30))
          thawLifeDays = randomInt(7, 45)
          serviceExpiryDate = addDays(removedFromColdDate, thawLifeDays)
        }
      } else if (Math.random() < 0.4) {
        // Opened container scenario
        openedDate = addDays(today, -randomInt(1, 60))
        serviceLifeDays = randomInt(30, 180)
        serviceExpiryDate = addDays(openedDate, serviceLifeDays)
      }
    }
    
    // Effective Expiry = minimum of Shelf Expiry and Service Expiry (ignoring nulls)
    const effectiveExpiryDate = serviceExpiryDate 
      ? (serviceExpiryDate < shelfExpiryDate ? serviceExpiryDate : shelfExpiryDate)
      : shelfExpiryDate
    const daysToEffectiveExpiry = Math.floor((effectiveExpiryDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
    
    const mrbStatus = location === "MRB-Hold" ? randomChoice(mrbStatuses.slice(1)) : (Math.random() < 0.1 ? randomChoice(mrbStatuses.slice(1)) : "None")
    const mrbStep = mrbStatus !== "None" ? randomChoice(["Receiving Inspection", "MRB Review", "Disposition"]) : null
    const mrbAge = mrbStatus !== "None" ? randomInt(1, 45) : null
    
    const recertAllowed = Math.random() < 0.4
    const recertCyclesRemaining = recertAllowed ? randomInt(0, 3) : 0
    let recertStatus: RecertStatus = "Not eligible"
    if (recertAllowed) {
      if (recertCyclesRemaining === 0) recertStatus = "Not eligible"
      else if (Math.random() < 0.15) recertStatus = "In lab"
      else if (Math.random() < 0.1) recertStatus = "Failed"
      else if (Math.random() < 0.1) recertStatus = "Passed"
      else recertStatus = "Due for recert"
    }
    const labLeadTimeDays = recertAllowed ? randomInt(5, 21) : null
    
    // Generate linked demand
    const demandCount = randomInt(0, 4)
    const linkedDemand: LinkedDemand[] = []
    for (let j = 0; j < demandCount; j++) {
      linkedDemand.push({
        woNumber: `WO-${randomInt(10000, 99999)}`,
        clin: `CLIN-${randomInt(1000, 9999)}`,
        plannedUseDate: addDays(today, randomInt(5, 120)),
        qty: randomInt(1, 50),
        program: randomChoice(programs)
      })
    }
    
    // Determine risk type using effective expiry and planned_use_date
    let riskType: LotRecord["riskType"] = "Healthy"
    let riskSentence = ""
    const nearExpiryThreshold = 14 // days
    
    if (daysToEffectiveExpiry < 0) {
      // Already expired
      if (linkedDemand.length > 0) {
        riskType = "False coverage"
        riskSentence = `EXPIRED: This lot expired ${Math.abs(daysToEffectiveExpiry)} days ago but is still pegged to ${linkedDemand.length} future demand(s). This is false coverage.`
      } else {
        riskType = "Expired"
        riskSentence = `This lot expired ${Math.abs(daysToEffectiveExpiry)} days ago and cannot be used.`
      }
    } else if (linkedDemand.length > 0) {
      const earliestUse = linkedDemand.reduce((min, d) => d.plannedUseDate < min ? d.plannedUseDate : min, linkedDemand[0].plannedUseDate)
      const daysToUse = Math.floor((earliestUse.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
      const delta = daysToUse - daysToEffectiveExpiry // positive = use after expiry
      
      if (delta > 0) {
        // Planned use is AFTER effective expiry = Expires before use = False coverage
        riskType = "False coverage"
        riskSentence = `This lot becomes unusable on ${effectiveExpiryDate.toLocaleDateString()}. Next planned use is ${earliestUse.toLocaleDateString()} (Δ = +${delta} days after expiry). This is FALSE COVERAGE.`
      } else if (daysToEffectiveExpiry <= nearExpiryThreshold) {
        // Near-expiry but use is before expiry
        riskType = "Near-expiry pegged"
        riskSentence = `This lot becomes unusable on ${effectiveExpiryDate.toLocaleDateString()}. Next planned use is ${earliestUse.toLocaleDateString()} (Δ = ${delta} days). Near expiry but usable if consumed promptly.`
      } else if (daysToEffectiveExpiry <= 30 && Math.abs(delta) <= nearExpiryThreshold) {
        // Expires within 30 days and use is close to expiry
        riskType = "Near-expiry pegged"
        riskSentence = `This lot becomes unusable on ${effectiveExpiryDate.toLocaleDateString()}. Next planned use is ${earliestUse.toLocaleDateString()} (Δ = ${delta} days). Use-first candidate.`
      }
    } else if (daysToEffectiveExpiry <= 30) {
      riskType = "Near-expiry unpegged"
      riskSentence = `This lot becomes unusable on ${effectiveExpiryDate.toLocaleDateString()}. No planned use (unpegged). Decision needed: allocate to demand or disposition.`
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
      shelfExpiryDate,
      openedDate,
      serviceLifeDays,
      removedFromColdDate,
      thawLifeDays,
      serviceExpiryDate,
      effectiveExpiryDate,
      daysToEffectiveExpiry,
      temperatureReq,
      location,
      subInventory: `${randomChoice(["A", "B", "C", "D"])}-${randomInt(1, 20)}-${randomInt(1, 50)}`,
      site: randomChoice(sites),
      program: randomChoice(programs),
      mrbStatus,
      mrbStep,
      mrbAge,
      recertAllowed,
      recertCyclesRemaining,
      recertStatus,
      labLeadTimeDays,
      linkedDemand,
      riskType,
      riskSentence
    })
  }
  
  return records
}

// Generate data once
const allLots = generateLotRecords(250)

// Risk colors
const RISK_COLORS: Record<string, string> = {
  "Healthy": "#22c55e",
  "Near-expiry pegged": "#f59e0b",
  "Near-expiry unpegged": "#eab308",
  "Expires before use": "#ef4444",
  "False coverage": "#dc2626",
  "Expired": "#6b7280"
}

// ===== DEFINITIONS COMPONENT =====
function DefinitionsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 gap-1">
          <Info className="w-4 h-4" />
          Definitions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Shelf-Life Definitions</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 text-sm">
          <div>
            <h3 className="font-bold text-gray-900 mb-2">Two-Clock Model</h3>
            <div className="space-y-3 text-gray-700">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="font-semibold text-blue-900">Shelf Expiry</p>
                <p>The lot expiry date in qualified storage. This is the standard expiration date from manufacture.</p>
                <p className="text-xs text-blue-700 mt-1 font-mono">= expiry_date (from lot record)</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <p className="font-semibold text-orange-900">Service Expiry (Open/Thaw Clock)</p>
                <p>Once removed from cold storage or once a container is opened, a shorter clock starts.</p>
                <p className="text-xs text-orange-700 mt-1 font-mono">= min(opened_date + service_life_days, removed_from_cold_date + thaw_life_days)</p>
                <p className="text-xs text-gray-500 mt-1">If not applicable, Service Expiry = null</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="font-semibold text-green-900">Effective Expiry</p>
                <p>The date when the lot becomes unusable, regardless of which clock expires first.</p>
                <p className="text-xs text-green-700 mt-1 font-mono">= min(Shelf Expiry, Service Expiry) ignoring nulls</p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-bold text-gray-900 mb-2">Risk Types</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Badge className="bg-red-100 text-red-800 border-red-300 shrink-0">Expires before use</Badge>
                <span>planned_use_date {">"} Effective Expiry — lot will be unusable before scheduled consumption</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 shrink-0">Near-expiry pegged</Badge>
                <span>planned_use_date ≤ Effective Expiry AND (Effective Expiry - planned_use_date) ≤ 14 days</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 shrink-0">Near-expiry unpegged</Badge>
                <span>Effective Expiry within horizon AND no linked demand — decision needed</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge className="bg-red-200 text-red-900 border-red-400 shrink-0">False coverage</Badge>
                <span>(a) lot already expired AND still pegged to future use, OR (b) planned_use_date {">"} Effective Expiry</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-bold text-gray-900 mb-2">Recertification</h3>
            <p className="text-gray-700">Some materials can be recertified to extend shelf-life. This involves lab testing with pass/fail uncertainty and lead time. Cycles remaining indicates how many recerts are allowed per manufacturer spec.</p>
          </div>
          
          <div>
            <h3 className="font-bold text-gray-900 mb-2">Planning Tradeoff ("Shelf-Life Chicken")</h3>
            <p className="text-gray-700">Order too early → risk expiry before use (scrap). Order too late → shortage, premium freight, OTD hit. Inventory "on paper" is not usable if it will be out-of-life at time of use (false coverage).</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ===== LOT DETAIL DRAWER =====
function LotDetailDrawer({ lot, open, onClose }: { lot: LotRecord | null; open: boolean; onClose: () => void }) {
  if (!lot) return null
  
  const earliestDemand = lot.linkedDemand.length > 0
    ? lot.linkedDemand.reduce((min, d) => d.plannedUseDate < min.plannedUseDate ? d : min, lot.linkedDemand[0])
    : null
  const daysToNextUse = earliestDemand
    ? Math.floor((earliestDemand.plannedUseDate.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000))
    : null
  const delta = daysToNextUse !== null ? daysToNextUse - lot.daysToEffectiveExpiry : null
  
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-lg font-bold text-gray-900">Lot / Demand Detail</SheetTitle>
        </SheetHeader>
        
        {/* Risk Sentence Banner */}
        <div className={`p-4 rounded-lg mb-6 ${
          lot.riskType === "False coverage" || lot.riskType === "Expires before use" ? "bg-red-50 border-2 border-red-300" :
          lot.riskType === "Near-expiry pegged" || lot.riskType === "Near-expiry unpegged" ? "bg-amber-50 border-2 border-amber-300" :
          lot.riskType === "Expired" ? "bg-gray-100 border-2 border-gray-400" :
          "bg-green-50 border-2 border-green-300"
        }`}>
          <p className={`text-sm font-medium ${
            lot.riskType === "False coverage" || lot.riskType === "Expires before use" ? "text-red-800" :
            lot.riskType === "Near-expiry pegged" || lot.riskType === "Near-expiry unpegged" ? "text-amber-800" :
            lot.riskType === "Expired" ? "text-gray-800" :
            "text-green-800"
          }`}>
            {lot.riskSentence || `This lot becomes unusable on ${lot.effectiveExpiryDate.toLocaleDateString()}. ${earliestDemand ? `Next planned use is ${earliestDemand.plannedUseDate.toLocaleDateString()} (Δ = ${delta} days).` : "No planned use."}`}
          </p>
        </div>
        
        {/* Lot Info Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-xs font-medium text-gray-500">Part Number</p>
            <p className="text-sm font-semibold text-gray-900">{lot.partNumber}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Lot / Batch</p>
            <p className="text-sm font-mono text-gray-900">{lot.lotBatch}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Quantity</p>
            <p className="text-sm font-semibold text-gray-900">{lot.quantity} {lot.uom}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Material Family</p>
            <p className="text-sm text-gray-900">{lot.materialFamily}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Temperature Requirement</p>
            <p className="text-sm text-gray-900 flex items-center gap-1">
              <Thermometer className="w-3 h-3" />
              {lot.temperatureReq}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Current Location</p>
            <p className="text-sm text-gray-900 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {lot.location} ({lot.subInventory})
            </p>
          </div>
        </div>
        
        {/* Expiry Info */}
        <div className="border-t border-gray-200 pt-4 mb-6">
          <h4 className="text-sm font-bold text-gray-900 mb-3">Expiry Information</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs font-medium text-blue-700">Shelf Expiry</p>
              <p className="text-sm font-semibold text-blue-900">{lot.shelfExpiryDate.toLocaleDateString()}</p>
            </div>
            <div className={`p-3 rounded-lg ${lot.serviceExpiryDate ? "bg-orange-50" : "bg-gray-50"}`}>
              <p className={`text-xs font-medium ${lot.serviceExpiryDate ? "text-orange-700" : "text-gray-500"}`}>Service Expiry (Open/Thaw)</p>
              <p className={`text-sm font-semibold ${lot.serviceExpiryDate ? "text-orange-900" : "text-gray-400"}`}>
                {lot.serviceExpiryDate ? lot.serviceExpiryDate.toLocaleDateString() : "Unknown / N/A"}
              </p>
              {lot.openedDate && <p className="text-xs text-orange-600 mt-1">Opened: {lot.openedDate.toLocaleDateString()}</p>}
              {lot.removedFromColdDate && <p className="text-xs text-orange-600 mt-1">Removed from cold: {lot.removedFromColdDate.toLocaleDateString()}</p>}
            </div>
            <div className="col-span-2 p-3 bg-green-50 rounded-lg border-2 border-green-300">
              <p className="text-xs font-medium text-green-700">Effective Expiry</p>
              <p className="text-lg font-bold text-green-900">{lot.effectiveExpiryDate.toLocaleDateString()}</p>
              <p className="text-sm text-green-700">{lot.daysToEffectiveExpiry < 0 ? `Expired ${Math.abs(lot.daysToEffectiveExpiry)} days ago` : `${lot.daysToEffectiveExpiry} days remaining`}</p>
            </div>
          </div>
        </div>
        
        {/* MRB Status */}
        {lot.mrbStatus !== "None" && (
          <div className="border-t border-gray-200 pt-4 mb-6">
            <h4 className="text-sm font-bold text-gray-900 mb-3">MRB Status</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500">Status</p>
                <Badge variant="outline" className="text-orange-700 border-orange-300">{lot.mrbStatus}</Badge>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Step</p>
                <p className="text-sm text-gray-900">{lot.mrbStep || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Age (days)</p>
                <p className="text-sm font-semibold text-gray-900">{lot.mrbAge || "—"}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Recert Info */}
        <div className="border-t border-gray-200 pt-4 mb-6">
          <h4 className="text-sm font-bold text-gray-900 mb-3">Recertification</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs font-medium text-gray-500">Eligible?</p>
              <p className={`text-sm font-semibold ${lot.recertAllowed ? "text-green-700" : "text-gray-400"}`}>{lot.recertAllowed ? "Yes" : "No"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Cycles Remaining</p>
              <p className="text-sm font-semibold text-gray-900">{lot.recertAllowed ? lot.recertCyclesRemaining : "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Lab Lead Time</p>
              <p className="text-sm text-gray-900">{lot.labLeadTimeDays ? `${lot.labLeadTimeDays} days` : "Unknown"}</p>
            </div>
          </div>
        </div>
        
        {/* Linked Demand */}
        <div className="border-t border-gray-200 pt-4 mb-6">
          <h4 className="text-sm font-bold text-gray-900 mb-3">Linked Demand ({lot.linkedDemand.length})</h4>
          {lot.linkedDemand.length > 0 ? (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {lot.linkedDemand.map((d, i) => {
                const daysToUse = Math.floor((d.plannedUseDate.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000))
                const isConflict = daysToUse > lot.daysToEffectiveExpiry
                return (
                  <div key={i} className={`p-3 rounded-lg border ${isConflict ? "bg-red-50 border-red-300" : "bg-gray-50 border-gray-200"}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-mono text-blue-700">{d.woNumber} / {d.clin}</p>
                        <p className="text-xs text-gray-500">{d.program}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-900">{d.qty} {lot.uom}</p>
                        <p className={`text-xs font-medium ${isConflict ? "text-red-600" : "text-gray-500"}`}>
                          Use: {d.plannedUseDate.toLocaleDateString()}
                          {isConflict && " (AFTER EXPIRY)"}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No linked demand (unpegged)</p>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-bold text-gray-900 mb-3">Recommended Actions</h4>
          <div className="flex flex-wrap gap-2">
            {lot.linkedDemand.length > 0 && lot.riskType !== "Expired" && (
              <Button variant="outline" size="sm" className="gap-1">
                <RefreshCw className="w-3 h-3" />
                Resequence / Use-first
              </Button>
            )}
            {lot.linkedDemand.length > 0 && (
              <Button variant="outline" size="sm" className="gap-1">
                <ArrowRight className="w-3 h-3" />
                Reallocate
              </Button>
            )}
            {lot.recertAllowed && lot.recertCyclesRemaining > 0 && (
              <Button variant="outline" size="sm" className="gap-1 text-purple-700 border-purple-300 hover:bg-purple-50">
                <FileText className="w-3 h-3" />
                Request recert
              </Button>
            )}
            {(lot.riskType === "False coverage" || lot.riskType === "Expires before use") && (
              <Button variant="outline" size="sm" className="gap-1 text-blue-700 border-blue-300 hover:bg-blue-50">
                <Package className="w-3 h-3" />
                Trigger replacement buy
              </Button>
            )}
            {(lot.riskType === "Expired" || lot.riskType === "False coverage") && (
              <Button variant="outline" size="sm" className="gap-1 text-red-700 border-red-300 hover:bg-red-50">
                <X className="w-3 h-3" />
                Segregate / Scrap
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ===== MAIN COMPONENT =====
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
  const [selectedRiskLens, setSelectedRiskLens] = useState<RiskLens>("Expiring Soon")
  const [searchQuery, setSearchQuery] = useState<string>("")
  
  // Drawer state
  const [selectedLot, setSelectedLot] = useState<LotRecord | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  
  // Chart click filter state
  const [chartFilter, setChartFilter] = useState<{ type: string; value: string } | null>(null)
  
  // Filtered data
  const filteredLots = useMemo(() => {
    let result = [...allLots]
    
    if (selectedSite !== "all") result = result.filter(l => l.site === selectedSite)
    if (selectedProgram !== "all") result = result.filter(l => l.program === selectedProgram)
    if (selectedFamily !== "all") result = result.filter(l => l.materialFamily === selectedFamily)
    if (selectedPartNumber) result = result.filter(l => l.partNumber.toLowerCase().includes(selectedPartNumber.toLowerCase()))
    if (selectedLocation !== "all") result = result.filter(l => l.location === selectedLocation)
    
    // Risk lens filter
    if (selectedRiskLens === "Expiring Soon") {
      // Default: show lots expiring within horizon (not already expired, or expired but pegged)
      result = result.filter(l => 
        (l.daysToEffectiveExpiry <= selectedHorizon && l.daysToEffectiveExpiry > 0) ||
        l.riskType === "Near-expiry pegged" ||
        l.riskType === "Near-expiry unpegged"
      )
    } else if (selectedRiskLens === "Use-First") {
      // Use-First: near-expiry pegged lots that can still be consumed
      result = result.filter(l => l.riskType === "Near-expiry pegged")
    } else if (selectedRiskLens === "False Coverage") {
      // False Coverage: lots where planned use > effective expiry
      result = result.filter(l => l.riskType === "False coverage" || l.riskType === "Expires before use")
    }
    
    // Apply chart click filter
    if (chartFilter) {
      if (chartFilter.type === "location") result = result.filter(l => l.location === chartFilter.value)
      if (chartFilter.type === "family") result = result.filter(l => l.materialFamily === chartFilter.value)
      if (chartFilter.type === "risk") result = result.filter(l => l.riskType === chartFilter.value)
    }
    
    // Search query (part/lot/WO/CLIN)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(l => 
        l.partNumber.toLowerCase().includes(q) ||
        l.lotBatch.toLowerCase().includes(q) ||
        l.linkedDemand.some(d => d.woNumber.toLowerCase().includes(q) || d.clin.toLowerCase().includes(q))
      )
    }
    
    return result
  }, [selectedSite, selectedProgram, selectedFamily, selectedPartNumber, selectedLocation, selectedHorizon, selectedRiskLens, searchQuery, chartFilter])
  
  // Handle lot click
  const handleLotClick = (lot: LotRecord) => {
    setSelectedLot(lot)
    setDrawerOpen(true)
  }
  
  // Clear chart filter
  const clearChartFilter = () => setChartFilter(null)
  
  // ===== PLANNER KPIs =====
  const plannerKpis = useMemo(() => {
    const lotsInHorizon = allLots.filter(l => l.daysToEffectiveExpiry <= selectedHorizon && l.daysToEffectiveExpiry > 0).length
    const peggedBeforeExpiry = allLots.filter(l => l.riskType === "Near-expiry pegged").length
    const conflicts = allLots.filter(l => l.riskType === "False coverage" || l.riskType === "Expires before use").length
    const nearExpiryUnpegged = allLots.filter(l => l.riskType === "Near-expiry unpegged").length
    const nearExpiryInMrb = allLots.filter(l => l.mrbStatus !== "None" && l.daysToEffectiveExpiry <= 30 && l.daysToEffectiveExpiry > 0).length
    return { lotsInHorizon, peggedBeforeExpiry, conflicts, nearExpiryUnpegged, nearExpiryInMrb }
  }, [selectedHorizon])
  
  // ===== STORES KPIs =====
  const storesKpis = useMemo(() => {
    const nearExpiryWarehouse = allLots.filter(l => l.location === "Warehouse" && l.daysToEffectiveExpiry <= 30 && l.daysToEffectiveExpiry > 0).length
    const nearExpiryCold = allLots.filter(l => l.location === "Cold Storage" && l.daysToEffectiveExpiry <= 30 && l.daysToEffectiveExpiry > 0).length
    const nearExpiryFloor = allLots.filter(l => (l.location === "Shop Floor" || l.location === "WIP") && l.daysToEffectiveExpiry <= 30 && l.daysToEffectiveExpiry > 0).length
    const expiredToSegregate = allLots.filter(l => l.daysToEffectiveExpiry < 0).length
    const useFirst = allLots.filter(l => l.riskType === "Near-expiry pegged").length
    return { nearExpiryWarehouse, nearExpiryCold, nearExpiryFloor, expiredToSegregate, useFirst }
  }, [])
  
  // ===== QUALITY/MRB KPIs =====
  const qualityKpis = useMemo(() => {
    const nearExpiryMrb = allLots.filter(l => l.mrbStatus !== "None" && l.daysToEffectiveExpiry <= 30 && l.daysToEffectiveExpiry > 0).length
    const expiring30Mrb = allLots.filter(l => l.mrbStatus !== "None" && l.daysToEffectiveExpiry <= 30).length
    const mrbBlockingDemand = allLots.filter(l => l.mrbStatus !== "None" && l.linkedDemand.length > 0).length
    const recertDueSoon = allLots.filter(l => l.recertAllowed && l.recertCyclesRemaining > 0 && l.daysToEffectiveExpiry <= 30 && l.daysToEffectiveExpiry > 0).length
    return { nearExpiryMrb, expiring30Mrb, mrbBlockingDemand, recertDueSoon }
  }, [])
  
  // ===== PROGRAM/PDM KPIs =====
  const programKpis = useMemo(() => {
    // Count unique demands in horizon
    const demandInHorizon = new Set<string>()
    const atRiskDemands = new Set<string>()
    let totalDemandQty = 0
    let coveredQty = 0
    let usableCoveredQty = 0
    
    allLots.forEach(lot => {
      lot.linkedDemand.forEach(d => {
        const daysToUse = Math.floor((d.plannedUseDate.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000))
        if (daysToUse <= selectedHorizon) {
          demandInHorizon.add(`${d.woNumber}-${d.clin}`)
          totalDemandQty += d.qty
          coveredQty += d.qty
          if (lot.daysToEffectiveExpiry >= daysToUse) {
            usableCoveredQty += d.qty
          } else {
            atRiskDemands.add(`${d.woNumber}-${d.clin}`)
          }
        }
      })
    })
    
    const paperCoverage = totalDemandQty > 0 ? Math.round((coveredQty / totalDemandQty) * 100) : 100
    const usableCoverage = totalDemandQty > 0 ? Math.round((usableCoveredQty / totalDemandQty) * 100) : 100
    
    return { 
      demandInHorizon: demandInHorizon.size, 
      paperCoverage, 
      usableCoverage, 
      exposedJobs: atRiskDemands.size,
      qtyAtRisk: coveredQty - usableCoveredQty
    }
  }, [selectedHorizon])
  
  // ===== TIMELINE DATA (Planner) =====
  const timelineData = useMemo(() => {
    return filteredLots
      .filter(l => l.linkedDemand.length > 0)
      .map(l => {
        const earliestDemand = l.linkedDemand.reduce((min, d) => d.plannedUseDate < min.plannedUseDate ? d : min, l.linkedDemand[0])
        const daysToUse = Math.floor((earliestDemand.plannedUseDate.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000))
        return { ...l, earliestDemand, daysToUse }
      })
      .sort((a, b) => a.daysToEffectiveExpiry - b.daysToEffectiveExpiry)
      .slice(0, 20)
  }, [filteredLots])
  
  // ===== STORES: Location Health Chart Data =====
  const locationHealthData = useMemo(() => {
    const data: { location: string; Healthy: number; "Near-expiry": number; Expired: number }[] = []
    locations.forEach(loc => {
      const lotsInLoc = allLots.filter(l => l.location === loc)
      data.push({
        location: loc,
        Healthy: lotsInLoc.filter(l => l.daysToEffectiveExpiry > 30).length,
        "Near-expiry": lotsInLoc.filter(l => l.daysToEffectiveExpiry > 0 && l.daysToEffectiveExpiry <= 30).length,
        Expired: lotsInLoc.filter(l => l.daysToEffectiveExpiry <= 0).length
      })
    })
    return data
  }, [])
  
  // ===== STORES: Near-expiry by Family =====
  const nearExpiryByFamily = useMemo(() => {
    const data: { family: string; count: number }[] = []
    materialFamilies.forEach(fam => {
      const count = allLots.filter(l => l.materialFamily === fam && l.daysToEffectiveExpiry <= 30 && l.daysToEffectiveExpiry > 0).length
      if (count > 0) data.push({ family: fam, count })
    })
    return data.sort((a, b) => b.count - a.count).slice(0, 8)
  }, [])
  
  // ===== QUALITY: MRB Age vs Days to Expiry Scatter =====
  const mrbScatterData = useMemo(() => {
    return allLots
      .filter(l => l.mrbStatus !== "None" && l.mrbAge !== null)
      .map(l => ({
        id: l.id,
        lot: l,
        mrbAge: l.mrbAge!,
        daysToExpiry: l.daysToEffectiveExpiry,
        qty: l.quantity
      }))
  }, [])
  
  // ===== QUALITY: Recert Pipeline =====
  const recertPipeline = useMemo(() => {
    const statuses: RecertStatus[] = ["Due for recert", "In lab", "Passed", "Failed", "Not eligible"]
    return statuses.map(s => ({
      status: s,
      count: allLots.filter(l => l.recertStatus === s).length
    }))
  }, [])
  
  // ===== PROGRAM: Coverage Over Time =====
  const coverageOverTime = useMemo(() => {
    const today = new Date()
    const weeks: { week: string; demand: number; paperCoverage: number; usableCoverage: number }[] = []
    
    for (let w = 0; w < 12; w++) {
      const weekStart = new Date(today.getTime() + w * 7 * 24 * 60 * 60 * 1000)
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      
      let demandQty = 0
      let paperQty = 0
      let usableQty = 0
      
      allLots.forEach(lot => {
        lot.linkedDemand.forEach(d => {
          if (d.plannedUseDate >= weekStart && d.plannedUseDate < weekEnd) {
            demandQty += d.qty
            paperQty += d.qty
            const daysToUse = Math.floor((d.plannedUseDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
            if (lot.daysToEffectiveExpiry >= daysToUse) {
              usableQty += d.qty
            }
          }
        })
      })
      
      weeks.push({
        week: `W${w + 1}`,
        demand: demandQty,
        paperCoverage: demandQty > 0 ? Math.round((paperQty / demandQty) * 100) : 100,
        usableCoverage: demandQty > 0 ? Math.round((usableQty / demandQty) * 100) : 100
      })
    }
    
    return weeks
  }, [])
  
  // ===== PROGRAM: Top Exposed CLINs =====
  const exposedClins = useMemo(() => {
    const clinMap = new Map<string, { program: string; clin: string; woNumber: string; needDate: Date; atRiskParts: string[]; lots: LotRecord[]; conflictType: string }>()
    
    allLots.forEach(lot => {
      if (lot.riskType === "False coverage" || lot.riskType === "Expires before use") {
        lot.linkedDemand.forEach(d => {
          const key = `${d.woNumber}-${d.clin}`
          if (!clinMap.has(key)) {
            clinMap.set(key, {
              program: d.program,
              clin: d.clin,
              woNumber: d.woNumber,
              needDate: d.plannedUseDate,
              atRiskParts: [],
              lots: [],
              conflictType: lot.riskType
            })
          }
          const entry = clinMap.get(key)!
          if (!entry.atRiskParts.includes(lot.partNumber)) entry.atRiskParts.push(lot.partNumber)
          entry.lots.push(lot)
        })
      }
    })
    
    return Array.from(clinMap.values())
      .sort((a, b) => a.needDate.getTime() - b.needDate.getTime())
      .slice(0, 20)
  }, [])

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-gray-50">
        {/* Header with Persona Tabs */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Part Shelf-Life Tracking</h1>
            <DefinitionsDialog />
          </div>
          
          {/* Persona Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
            {(["Planner / Production Control", "Stores / Warehousing", "Quality / MRB", "Program / PDM"] as Persona[]).map(persona => (
              <button
                key={persona}
                onClick={() => { setActivePersona(persona); clearChartFilter(); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activePersona === persona
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {persona}
              </button>
            ))}
          </div>
        </div>
        
        {/* Sticky Filter Bar */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-6 py-3 shadow-sm">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-1">
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {sites.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Program" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {programs.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Select value={selectedFamily} onValueChange={setSelectedFamily}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Material Family" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Families</SelectItem>
                  {materialFamilies.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1">
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1">
              <Select value={String(selectedHorizon)} onValueChange={v => setSelectedHorizon(Number(v))}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Horizon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Select value={selectedRiskLens} onValueChange={v => setSelectedRiskLens(v as RiskLens)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Risk Lens" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Expiring Soon">Expiring Soon</SelectItem>
                  <SelectItem value="Use-First">Use-First</SelectItem>
                  <SelectItem value="False Coverage">False Coverage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input
                  placeholder="Part / Lot / WO / CLIN"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-9 pl-8 text-xs"
                />
              </div>
            </div>
            <div className="col-span-1 flex items-center gap-1">
              {chartFilter && (
                <Button variant="ghost" size="sm" onClick={clearChartFilter} className="h-9 text-xs gap-1">
                  <X className="w-3 h-3" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* ===== PLANNER / PRODUCTION CONTROL ===== */}
          {activePersona === "Planner / Production Control" && (
            <>
              {/* KPI Strip */}
              <div className="grid grid-cols-12 gap-4">
                {[
                  { label: "Lots Expiring in Horizon", value: plannerKpis.lotsInHorizon, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
                  { label: "Pegged Before Expiry", value: plannerKpis.peggedBeforeExpiry, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
                  { label: "Conflicts (Expires Before Use)", value: plannerKpis.conflicts, color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
                  { label: "Near-Expiry Unpegged", value: plannerKpis.nearExpiryUnpegged, color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200" },
                  { label: "Near-Expiry in MRB", value: plannerKpis.nearExpiryInMrb, color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
                ].map((kpi, i) => (
                  <Card key={i} className={`col-span-12 lg:col-span-2 ${i === 4 ? "lg:col-span-4" : ""} border-2 ${kpi.border} ${kpi.bg}`}>
                    <CardContent className="p-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{kpi.label}</p>
                      <p className={`text-4xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Pegging Timeline */}
              <Card className="border-2 border-gray-300">
                <CardHeader className="py-4 px-5 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold text-gray-900">Pegged Use vs Effective Expiry (Timeline)</CardTitle>
                      <p className="text-sm text-gray-500 mt-0.5">Top 20 lots by soonest effective expiry — click row to open details</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1.5"><span className="w-4 h-2 bg-green-500 rounded" /> Life remaining</span>
                      <span className="flex items-center gap-1.5"><span className="w-1.5 h-5 bg-gray-800 rounded" /> Effective Expiry</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-600 rounded-full" /> Use before expiry</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-600 rounded-full ring-2 ring-red-200" /> Use after expiry</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    {/* Header */}
                    <div className="flex border-b border-gray-200 bg-gray-100">
                      <div className="w-48 flex-shrink-0 p-3 text-xs font-bold text-gray-700">Lot / Part</div>
                      <div className="flex-1 relative h-10">
                        {[0, 30, 60, 90, 120, 150, 180].map(day => (
                          <div key={day} className="absolute top-0 bottom-0 flex items-center justify-center text-xs text-gray-500" style={{ left: `${(day / 180) * 100}%` }}>
                            <span className="font-medium">{day === 0 ? "Today" : `+${day}d`}</span>
                          </div>
                        ))}
                      </div>
                      <div className="w-24 flex-shrink-0 p-3 text-xs font-bold text-gray-700 text-right">Risk</div>
                    </div>
                    
                    {/* Rows */}
                    <div className="divide-y divide-gray-100">
                      {timelineData.map(lot => {
                        const maxDays = 180
                        const expiryPct = Math.min(Math.max(lot.daysToEffectiveExpiry / maxDays * 100, 0), 100)
                        
                        return (
                          <div
                            key={lot.id}
                            className="flex items-center cursor-pointer hover:bg-blue-50 transition-colors"
                            onClick={() => handleLotClick(lot)}
                          >
                            <div className="w-48 flex-shrink-0 p-3">
                              <p className="text-sm font-semibold text-gray-900 truncate">{lot.lotBatch}</p>
                              <p className="text-xs text-gray-500 truncate">{lot.partNumber}</p>
                            </div>
                            <div className="flex-1 relative h-14 py-2">
                              {/* Life bar */}
                              {lot.daysToEffectiveExpiry > 0 && (
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
                                    <p><strong>Effective Expiry:</strong> {lot.effectiveExpiryDate.toLocaleDateString()}</p>
                                    <p><strong>Days remaining:</strong> {lot.daysToEffectiveExpiry}</p>
                                    {lot.serviceExpiryDate && <p className="text-orange-300"><strong>Open/Thaw clock active</strong></p>}
                                  </TooltipContent>
                                </UITooltip>
                              )}
                              
                              {lot.daysToEffectiveExpiry <= 0 && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-gray-800 text-white text-xs font-bold rounded">
                                  EXPIRED
                                </div>
                              )}
                              
                              {/* Demand markers */}
                              {lot.linkedDemand.map((d, i) => {
                                const daysToUse = Math.floor((d.plannedUseDate.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000))
                                const usePct = Math.min(Math.max(daysToUse / maxDays * 100, 0), 100)
                                const isAfterExpiry = daysToUse > lot.daysToEffectiveExpiry
                                const delta = daysToUse - lot.daysToEffectiveExpiry
                                
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
                                      <p><strong>Effective Expiry:</strong> {lot.effectiveExpiryDate.toLocaleDateString()}</p>
                                      <p><strong>Delta:</strong> {isAfterExpiry ? <span className="text-red-300 font-bold">+{delta}d (USE AFTER EXPIRY)</span> : <span className="text-green-300">{delta}d (usable)</span>}</p>
                                      <p className="text-gray-400 mt-1 text-[10px]">Delta = planned_use_date - effective_expiry</p>
                                    </TooltipContent>
                                  </UITooltip>
                                )
                              })}
                            </div>
                            <div className="w-24 flex-shrink-0 p-3 text-right">
                              <Badge className={`text-[10px] ${
                                lot.riskType === "False coverage" ? "bg-red-100 text-red-800 border-red-300" :
                                lot.riskType === "Near-expiry pegged" ? "bg-amber-100 text-amber-800 border-amber-300" :
                                lot.riskType === "Near-expiry unpegged" ? "bg-yellow-100 text-yellow-800 border-yellow-300" :
                                "bg-green-100 text-green-800 border-green-300"
                              }`}>
                                {lot.riskType === "Healthy" ? "OK" : lot.riskType.replace("Near-expiry ", "")}
                              </Badge>
                            </div>
                          </div>
                        )
                      })}
                      {timelineData.length === 0 && (
                        <div className="p-8 text-center text-gray-400">No pegged lots in current filters</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Planner Worklist */}
              <Card className="border-2 border-gray-300">
                <CardHeader className="py-4 px-5 border-b border-gray-200 bg-gray-50">
                  <CardTitle className="text-lg font-bold text-gray-900">Planner Worklist (Exceptions)</CardTitle>
                  <p className="text-sm text-gray-500">{filteredLots.length} lots — click row for details</p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-[450px]">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-gray-100 z-10">
                        <tr className="border-b border-gray-200">
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Program</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">WO / CLIN</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Part</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Lot</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Location</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Qty</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">
                            <UITooltip>
                              <TooltipTrigger className="flex items-center gap-1 cursor-help">
                                Planned Use
                                <Info className="w-3 h-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>Earliest planned use date from linked demand</TooltipContent>
                            </UITooltip>
                          </th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">
                            <UITooltip>
                              <TooltipTrigger className="flex items-center gap-1 cursor-help">
                                Effective Expiry
                                <Info className="w-3 h-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>min(Shelf Expiry, Service Expiry)</TooltipContent>
                            </UITooltip>
                          </th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">
                            <UITooltip>
                              <TooltipTrigger className="flex items-center gap-1 cursor-help">
                                Δ days
                                <Info className="w-3 h-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>planned_use_date - effective_expiry (+ = use after expiry)</TooltipContent>
                            </UITooltip>
                          </th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Recert</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Owner</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700 min-w-[180px]">Recommended Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredLots.slice(0, 50).map(lot => {
                          const earliestDemand = lot.linkedDemand.length > 0
                            ? lot.linkedDemand.reduce((min, d) => d.plannedUseDate < min.plannedUseDate ? d : min, lot.linkedDemand[0])
                            : null
                          const daysToUse = earliestDemand ? Math.floor((earliestDemand.plannedUseDate.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)) : null
                          const delta = daysToUse !== null ? daysToUse - lot.daysToEffectiveExpiry : null
                          
                          // Rule-based recommendation
                          let owner = "Planner"
                          let action = "Monitor"
                          let actionTooltip = ""
                          
                          if (lot.riskType === "False coverage" || lot.riskType === "Expires before use") {
                            if (lot.recertAllowed && lot.recertCyclesRemaining > 0) {
                              owner = "Quality"
                              action = "Request recert decision"
                              actionTooltip = "If recert eligible → Request recert decision (Owner: Quality) + backup: Replacement buy"
                            } else {
                              owner = "Buyer/Stores"
                              action = "Replacement buy + segregate"
                              actionTooltip = "If NOT recert eligible → Replacement buy + segregate (Owner: Buyer/Stores)"
                            }
                          } else if (lot.riskType === "Near-expiry pegged") {
                            owner = "Planner/Stores"
                            action = "Use-first / resequence earlier"
                            actionTooltip = "If Near-expiry pegged → Use-first / resequence earlier (Owner: Planner/Stores)"
                          } else if (lot.riskType === "Near-expiry unpegged") {
                            owner = "Planner/Stores"
                            action = "Reallocate or evaluate scrap"
                            actionTooltip = "If Near-expiry unpegged → Reallocate or avoid ordering / evaluate scrap (Owner: Planner/Stores)"
                          }
                          
                          return (
                            <tr
                              key={lot.id}
                              className="hover:bg-blue-50 cursor-pointer transition-colors"
                              onClick={() => handleLotClick(lot)}
                            >
                              <td className="p-3 text-sm font-medium text-gray-900">{lot.program}</td>
                              <td className="p-3 text-sm font-mono text-blue-600">
                                {earliestDemand ? `${earliestDemand.woNumber} / ${earliestDemand.clin}` : "—"}
                              </td>
                              <td className="p-3 text-sm text-gray-700">{lot.partNumber}</td>
                              <td className="p-3 text-sm font-mono text-gray-700">{lot.lotBatch}</td>
                              <td className="p-3 text-sm text-gray-600">{lot.location}</td>
                              <td className="p-3 text-sm font-bold text-gray-900">{lot.quantity}</td>
                              <td className="p-3 text-sm text-gray-600 whitespace-nowrap">
                                {earliestDemand ? earliestDemand.plannedUseDate.toLocaleDateString() : "—"}
                              </td>
                              <td className="p-3 text-sm text-gray-600 whitespace-nowrap">
                                {lot.effectiveExpiryDate.toLocaleDateString()}
                                {lot.serviceExpiryDate && <Snowflake className="inline w-3 h-3 ml-1 text-blue-500" />}
                              </td>
                              <td className={`p-3 text-sm font-bold whitespace-nowrap ${delta !== null && delta > 0 ? "text-red-600" : delta !== null && delta > -14 ? "text-orange-600" : "text-green-600"}`}>
                                {delta !== null ? (delta > 0 ? `+${delta}d` : `${delta}d`) : "—"}
                                {delta !== null && delta > 0 && <AlertTriangle className="inline w-3 h-3 ml-1" />}
                              </td>
                              <td className="p-3 text-xs">
                                {lot.recertAllowed ? (
                                  <Badge variant="outline" className="text-[10px] text-green-700 border-green-300">
                                    {lot.recertCyclesRemaining} cycles
                                  </Badge>
                                ) : (
                                  <span className="text-gray-400">No</span>
                                )}
                              </td>
                              <td className="p-3">
                                <Badge variant="outline" className={`text-[10px] ${
                                  owner === "Quality" ? "text-purple-700 border-purple-300" :
                                  owner.includes("Buyer") ? "text-blue-700 border-blue-300" :
                                  "text-gray-700 border-gray-300"
                                }`}>
                                  {owner}
                                </Badge>
                              </td>
                              <td className="p-3">
                                <UITooltip>
                                  <TooltipTrigger className="text-sm font-medium text-blue-700 text-left cursor-help">
                                    {action}
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="max-w-xs text-xs">
                                    {actionTooltip}
                                  </TooltipContent>
                                </UITooltip>
                              </td>
                            </tr>
                          )
                        })}
                        {filteredLots.length === 0 && (
                          <tr>
                            <td colSpan={12} className="p-8 text-center text-gray-400">No lots match current filters</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
          
          {/* ===== STORES / WAREHOUSING ===== */}
          {activePersona === "Stores / Warehousing" && (
            <>
              {/* KPI Strip */}
              <div className="grid grid-cols-12 gap-4">
                {[
                  { label: "Near-Expiry in Warehouse", value: storesKpis.nearExpiryWarehouse, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
                  { label: "Near-Expiry in Cold Storage", value: storesKpis.nearExpiryCold, color: "text-cyan-700", bg: "bg-cyan-50", border: "border-cyan-200", icon: Snowflake },
                  { label: "Near-Expiry on Floor/WIP", value: storesKpis.nearExpiryFloor, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
                  { label: "Expired to Segregate", value: storesKpis.expiredToSegregate, color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
                  { label: "Lots Requiring Use-First", value: storesKpis.useFirst, color: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
                ].map((kpi, i) => (
                  <Card key={i} className={`col-span-12 lg:col-span-2 ${i === 4 ? "lg:col-span-4" : ""} border-2 ${kpi.border} ${kpi.bg}`}>
                    <CardContent className="p-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                        {kpi.icon && <kpi.icon className="w-3 h-3" />}
                        {kpi.label}
                      </p>
                      <p className={`text-4xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Charts Row */}
              <div className="grid grid-cols-12 gap-4">
                {/* Health by Location */}
                <Card className="col-span-6 border border-gray-200">
                  <CardHeader className="py-3 px-4 border-b border-gray-100">
                    <CardTitle className="text-sm font-bold text-gray-800">Health by Location</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={locationHealthData} layout="vertical" margin={{ left: 20, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis dataKey="location" type="category" width={100} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="Healthy" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} onClick={(data) => setChartFilter({ type: "location", value: data.location })} className="cursor-pointer" />
                          <Bar dataKey="Near-expiry" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} onClick={(data) => setChartFilter({ type: "location", value: data.location })} className="cursor-pointer" />
                          <Bar dataKey="Expired" stackId="a" fill="#6b7280" radius={[0, 4, 4, 0]} onClick={(data) => setChartFilter({ type: "location", value: data.location })} className="cursor-pointer" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Near-Expiry by Family */}
                <Card className="col-span-6 border border-gray-200">
                  <CardHeader className="py-3 px-4 border-b border-gray-100">
                    <CardTitle className="text-sm font-bold text-gray-800">Near-Expiry by Material Family</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={nearExpiryByFamily} layout="vertical" margin={{ left: 20, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis dataKey="family" type="category" width={120} tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey="count" name="Near-Expiry Lots" fill="#f59e0b" radius={[0, 4, 4, 0]} onClick={(data) => setChartFilter({ type: "family", value: data.family })} className="cursor-pointer" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Use-First & Move Queue */}
              <Card className="border-2 border-gray-300">
                <CardHeader className="py-4 px-5 border-b border-gray-200 bg-gray-50">
                  <CardTitle className="text-lg font-bold text-gray-900">Use-First & Move Queue</CardTitle>
                  <p className="text-sm text-gray-500">{filteredLots.length} lots requiring action — click row for details</p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-[400px]">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-gray-100 z-10">
                        <tr className="border-b border-gray-200">
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Action</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Part</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Lot</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Qty</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Effective Expiry</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Days Left</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Location</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Temp Req</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Pegged Next Use</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Programs Impacted</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredLots.slice(0, 50).map(lot => {
                          // Determine action
                          let action = "Monitor"
                          let actionColor = "text-gray-600"
                          if (lot.daysToEffectiveExpiry < 0) {
                            action = "Segregate expired"
                            actionColor = "text-red-700"
                          } else if (lot.riskType === "Near-expiry pegged") {
                            action = "Pick first / Use-first"
                            actionColor = "text-green-700"
                          } else if (lot.serviceExpiryDate && lot.location !== "Cold Storage" && lot.temperatureReq.includes("Frozen")) {
                            action = "Move to cold"
                            actionColor = "text-cyan-700"
                          } else if (lot.openedDate) {
                            action = "Verify opened container"
                            actionColor = "text-orange-700"
                          }
                          
                          const earliestDemand = lot.linkedDemand.length > 0
                            ? lot.linkedDemand.reduce((min, d) => d.plannedUseDate < min.plannedUseDate ? d : min, lot.linkedDemand[0])
                            : null
                          const programsImpacted = [...new Set(lot.linkedDemand.map(d => d.program))]
                          
                          return (
                            <tr
                              key={lot.id}
                              className="hover:bg-blue-50 cursor-pointer transition-colors"
                              onClick={() => handleLotClick(lot)}
                            >
                              <td className={`p-3 text-sm font-semibold ${actionColor}`}>{action}</td>
                              <td className="p-3 text-sm text-gray-700">{lot.partNumber}</td>
                              <td className="p-3 text-sm font-mono text-gray-700">{lot.lotBatch}</td>
                              <td className="p-3 text-sm font-bold text-gray-900">{lot.quantity} {lot.uom}</td>
                              <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{lot.effectiveExpiryDate.toLocaleDateString()}</td>
                              <td className={`p-3 text-sm font-bold ${lot.daysToEffectiveExpiry < 0 ? "text-gray-600" : lot.daysToEffectiveExpiry <= 14 ? "text-red-600" : lot.daysToEffectiveExpiry <= 30 ? "text-orange-600" : "text-green-600"}`}>
                                {lot.daysToEffectiveExpiry < 0 ? `${Math.abs(lot.daysToEffectiveExpiry)}d ago` : `${lot.daysToEffectiveExpiry}d`}
                              </td>
                              <td className="p-3 text-sm text-gray-600">{lot.location}</td>
                              <td className="p-3 text-sm text-gray-600 flex items-center gap-1">
                                {lot.temperatureReq.includes("Frozen") && <Snowflake className="w-3 h-3 text-cyan-500" />}
                                {lot.temperatureReq}
                              </td>
                              <td className="p-3 text-sm text-gray-600 whitespace-nowrap">
                                {earliestDemand ? earliestDemand.plannedUseDate.toLocaleDateString() : "—"}
                              </td>
                              <td className="p-3 text-sm text-gray-600">
                                {programsImpacted.length > 0 ? programsImpacted.slice(0, 2).join(", ") + (programsImpacted.length > 2 ? ` +${programsImpacted.length - 2}` : "") : "—"}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
          
          {/* ===== QUALITY / MRB ===== */}
          {activePersona === "Quality / MRB" && (
            <>
              {/* KPI Strip */}
              <div className="grid grid-cols-12 gap-4">
                {[
                  { label: "Near-Expiry in MRB", value: qualityKpis.nearExpiryMrb, color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
                  { label: "Expiring ≤30d in MRB", value: qualityKpis.expiring30Mrb, color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
                  { label: "MRB Lots Blocking Demand", value: qualityKpis.mrbBlockingDemand, color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
                  { label: "Recert Candidates Due Soon", value: qualityKpis.recertDueSoon, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
                ].map((kpi, i) => (
                  <Card key={i} className={`col-span-3 border-2 ${kpi.border} ${kpi.bg}`}>
                    <CardContent className="p-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{kpi.label}</p>
                      <p className={`text-4xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Charts Row */}
              <div className="grid grid-cols-12 gap-4">
                {/* MRB Age vs Days to Expiry */}
                <Card className="col-span-6 border border-gray-200">
                  <CardHeader className="py-3 px-4 border-b border-gray-100">
                    <CardTitle className="text-sm font-bold text-gray-800">MRB Age vs Days to Effective Expiry</CardTitle>
                    <p className="text-xs text-gray-500">Priority quadrant: high age + low days remaining (top-left)</p>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ left: 10, right: 20, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis type="number" dataKey="daysToExpiry" name="Days to Expiry" tick={{ fontSize: 11 }} label={{ value: 'Days to Effective Expiry', position: 'bottom', fontSize: 11 }} />
                          <YAxis type="number" dataKey="mrbAge" name="MRB Age" tick={{ fontSize: 11 }} label={{ value: 'MRB Age (days)', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                          <ZAxis type="number" dataKey="qty" range={[50, 400]} />
                          <Tooltip content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload
                              return (
                                <div className="bg-white p-2 border border-gray-200 rounded shadow-lg text-xs">
                                  <p className="font-bold">{data.lot.lotBatch}</p>
                                  <p>MRB Age: {data.mrbAge} days</p>
                                  <p>Days to Expiry: {data.daysToExpiry}</p>
                                  <p>Qty: {data.qty}</p>
                                </div>
                              )
                            }
                            return null
                          }} />
                          <Scatter
                            data={mrbScatterData}
                            fill="#f97316"
                            onClick={(data) => handleLotClick(data.lot)}
                            className="cursor-pointer"
                          />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Recert Pipeline */}
                <Card className="col-span-6 border border-gray-200">
                  <CardHeader className="py-3 px-4 border-b border-gray-100">
                    <CardTitle className="text-sm font-bold text-gray-800">Recert Pipeline</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={recertPipeline} margin={{ left: 10, right: 20, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="status" tick={{ fontSize: 10, angle: -20, textAnchor: 'end' }} height={60} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="count" name="Lots" radius={[4, 4, 0, 0]}>
                            {recertPipeline.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={
                                  entry.status === "Due for recert" ? "#3b82f6" :
                                  entry.status === "In lab" ? "#f59e0b" :
                                  entry.status === "Passed" ? "#22c55e" :
                                  entry.status === "Failed" ? "#ef4444" :
                                  "#9ca3af"
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* MRB/Recert Worklist */}
              <Card className="border-2 border-gray-300">
                <CardHeader className="py-4 px-5 border-b border-gray-200 bg-gray-50">
                  <CardTitle className="text-lg font-bold text-gray-900">MRB / Recert Priority Worklist</CardTitle>
                  <p className="text-sm text-gray-500">Lots in MRB or requiring recert — click row for details</p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-[400px]">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-gray-100 z-10">
                        <tr className="border-b border-gray-200">
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Part</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Lot</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Qty</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Effective Expiry</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Days Left</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">MRB Step</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">MRB Age</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Linked Demand</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Recert</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Lab Lead</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700 min-w-[150px]">Recommended Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {allLots
                          .filter(l => l.mrbStatus !== "None" || (l.recertAllowed && l.recertCyclesRemaining > 0 && l.daysToEffectiveExpiry <= 30))
                          .sort((a, b) => a.daysToEffectiveExpiry - b.daysToEffectiveExpiry)
                          .slice(0, 50)
                          .map(lot => {
                            const nearestUse = lot.linkedDemand.length > 0
                              ? lot.linkedDemand.reduce((min, d) => d.plannedUseDate < min ? d.plannedUseDate : min, lot.linkedDemand[0].plannedUseDate)
                              : null
                            
                            // Recommendation
                            let action = "Monitor"
                            if (lot.mrbStatus !== "None" && lot.daysToEffectiveExpiry <= 14) {
                              action = "Expedite disposition"
                            } else if (lot.recertAllowed && lot.recertCyclesRemaining > 0 && lot.daysToEffectiveExpiry <= 30) {
                              action = "Initiate recert"
                            } else if (lot.mrbStatus !== "None" && lot.linkedDemand.length > 0) {
                              action = "Prioritize for demand"
                            }
                            
                            return (
                              <tr
                                key={lot.id}
                                className="hover:bg-blue-50 cursor-pointer transition-colors"
                                onClick={() => handleLotClick(lot)}
                              >
                                <td className="p-3 text-sm text-gray-700">{lot.partNumber}</td>
                                <td className="p-3 text-sm font-mono text-gray-700">{lot.lotBatch}</td>
                                <td className="p-3 text-sm font-bold text-gray-900">{lot.quantity}</td>
                                <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{lot.effectiveExpiryDate.toLocaleDateString()}</td>
                                <td className={`p-3 text-sm font-bold ${lot.daysToEffectiveExpiry <= 14 ? "text-red-600" : lot.daysToEffectiveExpiry <= 30 ? "text-orange-600" : "text-green-600"}`}>
                                  {lot.daysToEffectiveExpiry}d
                                </td>
                                <td className="p-3 text-sm text-gray-600">{lot.mrbStep || "—"}</td>
                                <td className="p-3 text-sm text-gray-600">{lot.mrbAge !== null ? `${lot.mrbAge}d` : "—"}</td>
                                <td className="p-3 text-sm text-gray-600">
                                  {lot.linkedDemand.length > 0 
                                    ? `${lot.linkedDemand.length} (${nearestUse?.toLocaleDateString()})`
                                    : "—"
                                  }
                                </td>
                                <td className="p-3 text-xs">
                                  {lot.recertAllowed ? (
                                    <Badge variant="outline" className={`text-[10px] ${
                                      lot.recertStatus === "In lab" ? "text-amber-700 border-amber-300" :
                                      lot.recertStatus === "Passed" ? "text-green-700 border-green-300" :
                                      lot.recertStatus === "Failed" ? "text-red-700 border-red-300" :
                                      "text-blue-700 border-blue-300"
                                    }`}>
                                      {lot.recertCyclesRemaining} cycles
                                    </Badge>
                                  ) : (
                                    <span className="text-gray-400">No</span>
                                  )}
                                </td>
                                <td className="p-3 text-sm text-gray-600">{lot.labLeadTimeDays ? `${lot.labLeadTimeDays}d` : "—"}</td>
                                <td className="p-3 text-sm font-medium text-blue-700">{action}</td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
          
          {/* ===== PROGRAM / PDM ===== */}
          {activePersona === "Program / PDM" && (
            <>
              {/* KPI Strip */}
              <div className="grid grid-cols-12 gap-4">
                {[
                  { label: "Demand in Horizon", value: programKpis.demandInHorizon, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", suffix: " jobs" },
                  { label: "Paper Coverage", value: programKpis.paperCoverage, color: "text-gray-700", bg: "bg-gray-100", border: "border-gray-300", suffix: "%" },
                  { label: "Usable Coverage", value: programKpis.usableCoverage, color: programKpis.usableCoverage < programKpis.paperCoverage ? "text-red-700" : "text-green-700", bg: programKpis.usableCoverage < programKpis.paperCoverage ? "bg-red-50" : "bg-green-50", border: programKpis.usableCoverage < programKpis.paperCoverage ? "border-red-200" : "border-green-200", suffix: "%" },
                  { label: "Exposed Jobs/CLINs", value: programKpis.exposedJobs, color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", suffix: "" },
                  { label: "Qty at Risk", value: programKpis.qtyAtRisk, color: "text-red-700", bg: "bg-red-50", border: "border-red-200", suffix: " units" },
                ].map((kpi, i) => (
                  <Card key={i} className={`col-span-12 lg:col-span-2 ${i === 4 ? "lg:col-span-4" : ""} border-2 ${kpi.border} ${kpi.bg}`}>
                    <CardContent className="p-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{kpi.label}</p>
                      <p className={`text-4xl font-bold mt-1 ${kpi.color}`}>{kpi.value}{kpi.suffix}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Paper vs Usable Coverage Chart */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-800">Paper vs Usable Coverage Over Time</CardTitle>
                  <p className="text-xs text-gray-500">Paper coverage (gross on-hand) vs Usable coverage (enforcing effective expiry at planned use date)</p>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={coverageOverTime} margin={{ left: 10, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11 }} label={{ value: 'Demand Qty', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: 'Coverage %', angle: 90, position: 'insideRight', fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="demand" name="Demand Qty" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
                        <Line yAxisId="right" type="monotone" dataKey="paperCoverage" name="Paper Coverage %" stroke="#6b7280" strokeWidth={2} dot={{ r: 4 }} />
                        <Line yAxisId="right" type="monotone" dataKey="usableCoverage" name="Usable Coverage %" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Top Exposed CLINs */}
              <Card className="border-2 border-gray-300">
                <CardHeader className="py-4 px-5 border-b border-gray-200 bg-gray-50">
                  <CardTitle className="text-lg font-bold text-gray-900">Top Exposed CLINs / Builds</CardTitle>
                  <p className="text-sm text-gray-500">Demand at risk due to shelf-life conflicts — click row to see affected lots</p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-[400px]">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-gray-100 z-10">
                        <tr className="border-b border-gray-200">
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Program</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">CLIN / Job</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Need Window</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">At-Risk Parts</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Lots Driving Exposure</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Conflict Type</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Mitigation</th>
                          <th className="text-left p-3 text-xs font-bold text-gray-700">Owner</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {exposedClins.map((clin, i) => {
                          // Determine mitigation based on lots
                          const hasRecertOption = clin.lots.some(l => l.recertAllowed && l.recertCyclesRemaining > 0)
                          const mitigation = hasRecertOption ? "Recert / Replacement buy" : "Replacement buy / Resequence"
                          const owner = hasRecertOption ? "Quality" : "Buyer/Planner"
                          
                          return (
                            <tr
                              key={i}
                              className="hover:bg-blue-50 cursor-pointer transition-colors"
                              onClick={() => clin.lots[0] && handleLotClick(clin.lots[0])}
                            >
                              <td className="p-3 text-sm font-medium text-gray-900">{clin.program}</td>
                              <td className="p-3 text-sm font-mono text-blue-600">{clin.woNumber} / {clin.clin}</td>
                              <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{clin.needDate.toLocaleDateString()}</td>
                              <td className="p-3 text-sm text-gray-700">
                                {clin.atRiskParts.slice(0, 2).join(", ")}
                                {clin.atRiskParts.length > 2 && ` +${clin.atRiskParts.length - 2}`}
                              </td>
                              <td className="p-3 text-sm text-gray-600">{clin.lots.length} lot(s)</td>
                              <td className="p-3">
                                <Badge className="text-[10px] bg-red-100 text-red-800 border-red-300">
                                  {clin.conflictType}
                                </Badge>
                              </td>
                              <td className="p-3 text-sm font-medium text-blue-700">{mitigation}</td>
                              <td className="p-3">
                                <Badge variant="outline" className={`text-[10px] ${
                                  owner === "Quality" ? "text-purple-700 border-purple-300" : "text-gray-700 border-gray-300"
                                }`}>
                                  {owner}
                                </Badge>
                              </td>
                            </tr>
                          )
                        })}
                        {exposedClins.length === 0 && (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-gray-400">No exposed CLINs in current horizon</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
        
        {/* Lot Detail Drawer */}
        <LotDetailDrawer lot={selectedLot} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </div>
    </TooltipProvider>
  )
}
