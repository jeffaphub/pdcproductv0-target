"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

export function ScheduleRiskRegistry() {
  // Global Filters
  const [division, setDivision] = useState("All")
  const [program, setProgram] = useState("All")
  const [config, setConfig] = useState("All")
  const [subassembly, setSubassembly] = useState("All")
  const [timeHorizon, setTimeHorizon] = useState("90")
  const [viewFocus, setViewFocus] = useState("program")
  const [riskSource, setRiskSource] = useState(["Material", "Labor", "Quality"])
  const [majorSubassemblyFilter, setMajorSubassemblyFilter] = useState(["All"])
  const [partSearch, setPartSearch] = useState("")

  // View 2 Local Filters
  const [supplierFilter, setSupplierFilter] = useState(["All"])
  const [partFamilyFilter, setPartFamilyFilter] = useState("All")

  // View 4 Local Filters  
  const [ownerFilter, setOwnerFilter] = useState(["All"])
  const [statusFilter, setStatusFilter] = useState(["Not Started", "In Progress"])

  // Selection State
  const [selectedMSA, setSelectedMSA] = useState<number | null>(1)
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [view2Tab, setView2Tab] = useState("material")

  const handleClearFilters = () => {
    setDivision("All")
    setProgram("All")
    setConfig("All")
    setSubassembly("All")
    setTimeHorizon("90")
    setViewFocus("program")
    setRiskSource(["Material", "Labor", "Quality"])
    setMajorSubassemblyFilter(["All"])
    setPartSearch("")
  }

  const toggleRiskSource = (source: string) => {
    if (riskSource.includes(source)) {
      setRiskSource(riskSource.filter(s => s !== source))
    } else {
      setRiskSource([...riskSource, source])
    }
  }

  // Generate sample data with program assignments
  const generateTopContributorsData = () => {
    const items = [
      // Manpack Radio Program
      { id: "MSA1", type: "MSA", material: 17, labor: 4, quality: 2, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block I", subassembly: "RF Transceiver Module" },
      { id: "PN-RF-001", type: "Material", material: 12, labor: 0, quality: 0, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block I", subassembly: "RF Transceiver Module" },
      { id: "MSA2", type: "MSA", material: 5, labor: 2, quality: 1, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block II", subassembly: "Battery Pack Assembly" },
      { id: "PN-PCB-450", type: "Material", material: 5, labor: 0, quality: 0, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block I", subassembly: "Digital Signal Processor" },
      { id: "PN-RES-550", type: "Material", material: 2, labor: 0, quality: 0, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block II", subassembly: "Antenna Interface Unit" },
      { id: "MSA9 Labor", type: "Labor", material: 0, labor: 3, quality: 0, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block I", subassembly: "Ruggedized Enclosure" },
      // Vehicle Mount System
      { id: "MSA3 Labor", type: "Labor", material: 0, labor: 8, quality: 0, program: "Vehicle Mount System", division: "Defense Electronics", config: "Block I", subassembly: "Power Amplifier Module" },
      { id: "MSA5", type: "MSA", material: 2, labor: 2, quality: 0, program: "Vehicle Mount System", division: "Defense Electronics", config: "Block II", subassembly: "Mounting Bracket Assembly" },
      { id: "NC-1456", type: "Quality", material: 0, labor: 0, quality: 3, program: "Vehicle Mount System", division: "Defense Electronics", config: "Block I", subassembly: "Vehicle Interface Unit" },
      { id: "MSA8", type: "MSA", material: 1, labor: 0, quality: 1, program: "Vehicle Mount System", division: "Defense Electronics", config: "Block II", subassembly: "Cooling System" },
      { id: "PN-MTG-100", type: "Material", material: 4, labor: 0, quality: 0, program: "Vehicle Mount System", division: "Defense Electronics", config: "Block I", subassembly: "Mounting Bracket Assembly" },
      // Tactical HF Radio
      { id: "NC-1234", type: "Quality", material: 0, labor: 0, quality: 6, program: "Tactical HF Radio", division: "Communications", config: "Block I", subassembly: "HF Tuner Assembly" },
      { id: "PN-CONN-230", type: "Material", material: 3, labor: 0, quality: 0, program: "Tactical HF Radio", division: "Communications", config: "Block II", subassembly: "Control Display Unit" },
      { id: "MSA6 Labor", type: "Labor", material: 0, labor: 2, quality: 0, program: "Tactical HF Radio", division: "Communications", config: "Block I", subassembly: "Cryptographic Module" },
      { id: "PN-HF-TUNER", type: "Material", material: 6, labor: 0, quality: 0, program: "Tactical HF Radio", division: "Communications", config: "Block I", subassembly: "HF Tuner Assembly" },
      { id: "MSA10", type: "MSA", material: 3, labor: 1, quality: 2, program: "Tactical HF Radio", division: "Communications", config: "Block II", subassembly: "Control Display Unit" },
      // Base Station Program
      { id: "MSA4 Labor", type: "Labor", material: 0, labor: 4, quality: 0, program: "Base Station Program", division: "Communications", config: "Block I", subassembly: "Tower Electronics Bay" },
      { id: "MSA7", type: "MSA", material: 1, labor: 1, quality: 1, program: "Base Station Program", division: "Communications", config: "Block II", subassembly: "Network Interface Card" },
      { id: "PN-CAP-780", type: "Material", material: 1, labor: 0, quality: 0, program: "Base Station Program", division: "Communications", config: "Block I", subassembly: "Power Distribution Unit" },
      { id: "PN-NIC-200", type: "Material", material: 3, labor: 0, quality: 0, program: "Base Station Program", division: "Communications", config: "Block II", subassembly: "Network Interface Card" },
      { id: "NC-1890", type: "Quality", material: 0, labor: 0, quality: 4, program: "Base Station Program", division: "Communications", config: "Block I", subassembly: "Tower Electronics Bay" },
      // Portable Comm System
      { id: "MSA11", type: "MSA", material: 8, labor: 2, quality: 1, program: "Portable Comm System", division: "Defense Electronics", config: "Block I", subassembly: "Handheld Transceiver" },
      { id: "PN-HH-TX", type: "Material", material: 5, labor: 0, quality: 0, program: "Portable Comm System", division: "Defense Electronics", config: "Block I", subassembly: "Handheld Transceiver" },
      { id: "MSA12 Labor", type: "Labor", material: 0, labor: 3, quality: 0, program: "Portable Comm System", division: "Defense Electronics", config: "Block II", subassembly: "Earpiece Assembly" },
      { id: "NC-2001", type: "Quality", material: 0, labor: 0, quality: 2, program: "Portable Comm System", division: "Defense Electronics", config: "Block I", subassembly: "Quick-Release Battery" },
      { id: "PN-BATT-QR", type: "Material", material: 4, labor: 0, quality: 0, program: "Portable Comm System", division: "Defense Electronics", config: "Block II", subassembly: "Quick-Release Battery" },
    ]

    return items
      .filter(item => {
        // Apply ALL global filters
        if (division !== "All" && item.division !== division) return false
        if (program !== "All" && item.program !== program) return false
        if (config !== "All" && item.config !== config) return false
        if (subassembly !== "All" && item.subassembly !== subassembly) return false
        // Part search filter
        if (partSearch && !item.id.toLowerCase().includes(partSearch.toLowerCase())) return false
        return true
      })
      .map(item => ({
        ...item,
        materialRisk: riskSource.includes("Material") ? item.material : 0,
        laborRisk: riskSource.includes("Labor") ? item.labor : 0,
        qualityRisk: riskSource.includes("Quality") ? item.quality : 0,
        total: (riskSource.includes("Material") ? item.material : 0) + 
               (riskSource.includes("Labor") ? item.labor : 0) + 
               (riskSource.includes("Quality") ? item.quality : 0)
      }))
      .filter(item => item.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 15)
  }

  const generateMaterialData = () => {
    const allMaterials = [
      // Manpack Radio Program
      { partNumber: "PN-RF-001", description: "RF Amplifier Module", supplier: "AeroSupply Inc", leadTime: 120, requiredDate: "2026-02-10", expectedDate: "2026-02-05", buffer: -4, probLate: 15, expectedDelay: 5, impact: 0.75, otd: 82, risk: "High", cp: 1, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block I", subassembly: "RF Transceiver Module" },
      { partNumber: "PN-PCB-450", description: "Main PCB Assembly", supplier: "Precision Parts Ltd", leadTime: 90, requiredDate: "2026-02-12", expectedDate: "2026-02-14", buffer: -2, probLate: 25, expectedDelay: 3, impact: 0.75, otd: 88, risk: "High", cp: 1, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block I", subassembly: "Digital Signal Processor" },
      { partNumber: "PN-CONN-230", description: "Connector Set", supplier: "FastConnect Co", leadTime: 60, requiredDate: "2026-02-15", expectedDate: "2026-02-13", buffer: 2, probLate: 10, expectedDelay: 2, impact: 0.2, otd: 92, risk: "Medium", cp: 1, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block II", subassembly: "Antenna Interface Unit" },
      { partNumber: "PN-RES-550", description: "Resistor Pack", supplier: "ElectroComponents", leadTime: 45, requiredDate: "2026-02-18", expectedDate: "2026-02-17", buffer: 1, probLate: 8, expectedDelay: 1, impact: 0.08, otd: 95, risk: "Low", cp: 1, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block II", subassembly: "Antenna Interface Unit" },
      { partNumber: "PN-DSP-100", description: "Digital Signal Processor", supplier: "TechSource Ltd", leadTime: 85, requiredDate: "2026-02-08", expectedDate: "2026-02-10", buffer: -2, probLate: 22, expectedDelay: 3, impact: 0.6, otd: 84, risk: "High", cp: 2, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block I", subassembly: "Digital Signal Processor" },
      // Vehicle Mount System
      { partNumber: "PN-ANT-200", description: "Antenna Assembly", supplier: "AeroSupply Inc", leadTime: 100, requiredDate: "2026-02-12", expectedDate: "2026-02-10", buffer: -3, probLate: 18, expectedDelay: 4, impact: 0.65, otd: 85, risk: "High", cp: 1, program: "Vehicle Mount System", division: "Defense Electronics", config: "Block I", subassembly: "Vehicle Interface Unit" },
      { partNumber: "PN-MTG-100", description: "Mounting Bracket Assembly", supplier: "MechParts Co", leadTime: 55, requiredDate: "2026-02-14", expectedDate: "2026-02-12", buffer: 2, probLate: 12, expectedDelay: 2, impact: 0.3, otd: 90, risk: "Medium", cp: 1, program: "Vehicle Mount System", division: "Defense Electronics", config: "Block I", subassembly: "Mounting Bracket Assembly" },
      { partNumber: "PN-PWR-AMP", description: "Power Amplifier Module", supplier: "PowerTech Systems", leadTime: 95, requiredDate: "2026-02-16", expectedDate: "2026-02-18", buffer: -2, probLate: 20, expectedDelay: 3, impact: 0.55, otd: 86, risk: "High", cp: 2, program: "Vehicle Mount System", division: "Defense Electronics", config: "Block II", subassembly: "Power Amplifier Module" },
      { partNumber: "PN-COOL-50", description: "Cooling System Fan", supplier: "ThermalTech Inc", leadTime: 40, requiredDate: "2026-02-20", expectedDate: "2026-02-18", buffer: 2, probLate: 8, expectedDelay: 1, impact: 0.15, otd: 94, risk: "Low", cp: 2, program: "Vehicle Mount System", division: "Defense Electronics", config: "Block II", subassembly: "Cooling System" },
      // Tactical HF Radio
      { partNumber: "PN-HF-TUNER", description: "HF Tuner Assembly", supplier: "SignalTech Inc", leadTime: 110, requiredDate: "2026-02-10", expectedDate: "2026-02-14", buffer: -4, probLate: 28, expectedDelay: 5, impact: 0.8, otd: 78, risk: "High", cp: 1, program: "Tactical HF Radio", division: "Communications", config: "Block I", subassembly: "HF Tuner Assembly" },
      { partNumber: "PN-CRYPTO", description: "Cryptographic Module", supplier: "SecureComm Ltd", leadTime: 130, requiredDate: "2026-02-12", expectedDate: "2026-02-11", buffer: 1, probLate: 15, expectedDelay: 2, impact: 0.45, otd: 88, risk: "Medium", cp: 1, program: "Tactical HF Radio", division: "Communications", config: "Block I", subassembly: "Cryptographic Module" },
      { partNumber: "PN-CDU-300", description: "Control Display Unit", supplier: "Precision Parts Ltd", leadTime: 70, requiredDate: "2026-02-15", expectedDate: "2026-02-13", buffer: 2, probLate: 10, expectedDelay: 1, impact: 0.25, otd: 92, risk: "Low", cp: 2, program: "Tactical HF Radio", division: "Communications", config: "Block II", subassembly: "Control Display Unit" },
      // Base Station Program
      { partNumber: "PN-NIC-200", description: "Network Interface Card", supplier: "TechSource Ltd", leadTime: 65, requiredDate: "2026-02-08", expectedDate: "2026-02-10", buffer: -2, probLate: 18, expectedDelay: 3, impact: 0.5, otd: 85, risk: "Medium", cp: 1, program: "Base Station Program", division: "Communications", config: "Block I", subassembly: "Network Interface Card" },
      { partNumber: "PN-PDU-100", description: "Power Distribution Unit", supplier: "PowerTech Systems", leadTime: 80, requiredDate: "2026-02-12", expectedDate: "2026-02-11", buffer: 1, probLate: 12, expectedDelay: 2, impact: 0.35, otd: 90, risk: "Medium", cp: 1, program: "Base Station Program", division: "Communications", config: "Block II", subassembly: "Power Distribution Unit" },
      { partNumber: "PN-CAP-780", description: "Capacitor Array", supplier: "ElectroComponents", leadTime: 50, requiredDate: "2026-02-20", expectedDate: "2026-02-16", buffer: 4, probLate: 5, expectedDelay: 1, impact: 0.1, otd: 96, risk: "Low", cp: 2, program: "Base Station Program", division: "Communications", config: "Block I", subassembly: "Tower Electronics Bay" },
      // Portable Comm System
      { partNumber: "PN-HH-TX", description: "Handheld Transceiver", supplier: "AeroSupply Inc", leadTime: 90, requiredDate: "2026-02-10", expectedDate: "2026-02-13", buffer: -3, probLate: 22, expectedDelay: 4, impact: 0.7, otd: 82, risk: "High", cp: 1, program: "Portable Comm System", division: "Defense Electronics", config: "Block I", subassembly: "Handheld Transceiver" },
      { partNumber: "PN-EARPC", description: "Earpiece Assembly", supplier: "AudioTech Corp", leadTime: 35, requiredDate: "2026-02-14", expectedDate: "2026-02-12", buffer: 2, probLate: 8, expectedDelay: 1, impact: 0.15, otd: 94, risk: "Low", cp: 1, program: "Portable Comm System", division: "Defense Electronics", config: "Block II", subassembly: "Earpiece Assembly" },
      { partNumber: "PN-BATT-QR", description: "Quick-Release Battery", supplier: "PowerTech Systems", leadTime: 55, requiredDate: "2026-02-16", expectedDate: "2026-02-18", buffer: -2, probLate: 18, expectedDelay: 3, impact: 0.45, otd: 86, risk: "Medium", cp: 2, program: "Portable Comm System", division: "Defense Electronics", config: "Block I", subassembly: "Quick-Release Battery" },
    ]
    return allMaterials.filter(item => {
      if (division !== "All" && item.division !== division) return false
      if (program !== "All" && item.program !== program) return false
      if (config !== "All" && item.config !== config) return false
      if (subassembly !== "All" && item.subassembly !== subassembly) return false
      if (partSearch && !item.partNumber.toLowerCase().includes(partSearch.toLowerCase()) && !item.description.toLowerCase().includes(partSearch.toLowerCase())) return false
      return true
    })
  }

  const generateLaborData = () => {
    const allLabor = [
      // Manpack Radio Program
      { issueType: "Shift Capacity Shortfall", description: "Shift 2 operator overtime capacity limited", hoursReq: 240, hoursAvail: 180, shortfall: 60, daysDelay: 2.5, mitigation: "Yes", action: "Authorize Shift 2 overtime +10 hrs/week", owner: "Sarah Martinez", risk: "Critical", cp: 1, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block I", subassembly: "RF Transceiver Module" },
      { issueType: "Skill Gap", description: "Insufficient Level 3 certified welders", hoursReq: 160, hoursAvail: 120, shortfall: 40, daysDelay: 1.7, mitigation: "Partial", action: "Cross-train 2 Level 2 welders", owner: "David Chen", risk: "High", cp: 1, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block II", subassembly: "Ruggedized Enclosure" },
      { issueType: "Tooling Downtime", description: "CNC machine scheduled maintenance overlap", hoursReq: 80, hoursAvail: 48, shortfall: 32, daysDelay: 1.3, mitigation: "Yes", action: "Reschedule maintenance to night shift", owner: "Sarah Martinez", risk: "Medium", cp: 1, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block I", subassembly: "Digital Signal Processor" },
      // Vehicle Mount System
      { issueType: "Training Gap", description: "New hires require certification", hoursReq: 120, hoursAvail: 80, shortfall: 40, daysDelay: 1.5, mitigation: "Yes", action: "Fast-track training program", owner: "David Chen", risk: "High", cp: 1, program: "Vehicle Mount System", division: "Defense Electronics", config: "Block I", subassembly: "Power Amplifier Module" },
      { issueType: "Equipment Shortage", description: "Mounting jigs insufficient for demand", hoursReq: 100, hoursAvail: 60, shortfall: 40, daysDelay: 1.8, mitigation: "No", action: "Order additional jigs", owner: "Sarah Martinez", risk: "High", cp: 2, program: "Vehicle Mount System", division: "Defense Electronics", config: "Block II", subassembly: "Mounting Bracket Assembly" },
      // Tactical HF Radio
      { issueType: "Specialist Availability", description: "HF tuning technician on leave", hoursReq: 80, hoursAvail: 40, shortfall: 40, daysDelay: 2.0, mitigation: "Partial", action: "Contract backup technician", owner: "David Chen", risk: "High", cp: 1, program: "Tactical HF Radio", division: "Communications", config: "Block I", subassembly: "HF Tuner Assembly" },
      // Base Station Program
      { issueType: "Assembly Line Bottleneck", description: "Network card station understaffed", hoursReq: 160, hoursAvail: 120, shortfall: 40, daysDelay: 1.5, mitigation: "Yes", action: "Reassign 2 operators from Line B", owner: "Sarah Martinez", risk: "Medium", cp: 1, program: "Base Station Program", division: "Communications", config: "Block I", subassembly: "Network Interface Card" },
      // Portable Comm System
      { issueType: "Test Equipment Capacity", description: "RF test chambers at full capacity", hoursReq: 200, hoursAvail: 140, shortfall: 60, daysDelay: 2.2, mitigation: "Partial", action: "Add night shift testing", owner: "David Chen", risk: "High", cp: 1, program: "Portable Comm System", division: "Defense Electronics", config: "Block I", subassembly: "Handheld Transceiver" },
    ]
    return allLabor.filter(item => {
      if (division !== "All" && item.division !== division) return false
      if (program !== "All" && item.program !== program) return false
      if (config !== "All" && item.config !== config) return false
      if (subassembly !== "All" && item.subassembly !== subassembly) return false
      return true
    })
  }

  const generateQualityData = () => {
    const allQuality = [
      // Manpack Radio Program
      { ncNumber: "NC-1234", issueType: "Dimensional Tolerance", affectedParts: 16, status: "Open", reworkHoursPerUnit: 2.5, totalHours: 40, daysDelay: 1.3, rootCause: "Supplier dimensional variation", action: "Update supplier drawing", owner: "Mike Chen", targetDate: "2026-02-05", risk: "High", cp: 1, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block I", subassembly: "RF Transceiver Module" },
      { ncNumber: "NC-1456", issueType: "Weld Porosity", affectedParts: 8, status: "In Review", reworkHoursPerUnit: 3.0, totalHours: 24, daysDelay: 0.8, rootCause: "Contaminated welding gas", action: "Replace gas cylinders, retrain", owner: "Lisa Park", targetDate: "2026-02-08", risk: "Medium", cp: 1, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block II", subassembly: "Ruggedized Enclosure" },
      { ncNumber: "NC-1567", issueType: "Surface Finish", affectedParts: 4, status: "Rework In Progress", reworkHoursPerUnit: 1.5, totalHours: 6, daysDelay: 0.2, rootCause: "Incorrect grit sandpaper", action: "Use correct 400 grit", owner: "Mike Chen", targetDate: "2026-02-03", risk: "Low", cp: 1, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block I", subassembly: "Ruggedized Enclosure" },
      // Vehicle Mount System
      { ncNumber: "NC-1678", issueType: "Mounting Hole Alignment", affectedParts: 10, status: "Open", reworkHoursPerUnit: 2.0, totalHours: 20, daysDelay: 0.7, rootCause: "Drill jig wear", action: "Replace drill jig", owner: "Mike Chen", targetDate: "2026-02-06", risk: "Medium", cp: 1, program: "Vehicle Mount System", division: "Defense Electronics", config: "Block I", subassembly: "Mounting Bracket Assembly" },
      // Tactical HF Radio
      { ncNumber: "NC-1789", issueType: "Paint Defects", affectedParts: 12, status: "Open", reworkHoursPerUnit: 2.0, totalHours: 24, daysDelay: 0.9, rootCause: "Humidity issues in paint booth", action: "Install dehumidifier", owner: "Lisa Park", targetDate: "2026-02-10", risk: "Medium", cp: 1, program: "Tactical HF Radio", division: "Communications", config: "Block I", subassembly: "Control Display Unit" },
      { ncNumber: "NC-1890", issueType: "Solder Joint Failure", affectedParts: 6, status: "In Review", reworkHoursPerUnit: 3.5, totalHours: 21, daysDelay: 0.8, rootCause: "Flux contamination", action: "Replace flux batch, rework joints", owner: "Mike Chen", targetDate: "2026-02-07", risk: "High", cp: 2, program: "Tactical HF Radio", division: "Communications", config: "Block II", subassembly: "HF Tuner Assembly" },
      // Base Station Program
      { ncNumber: "NC-1901", issueType: "Cable Crimping", affectedParts: 20, status: "Rework In Progress", reworkHoursPerUnit: 1.0, totalHours: 20, daysDelay: 0.7, rootCause: "Worn crimp tool dies", action: "Replace crimp dies", owner: "Lisa Park", targetDate: "2026-02-04", risk: "Low", cp: 1, program: "Base Station Program", division: "Communications", config: "Block I", subassembly: "Tower Electronics Bay" },
      // Portable Comm System
      { ncNumber: "NC-2001", issueType: "Battery Contact Resistance", affectedParts: 15, status: "Open", reworkHoursPerUnit: 1.5, totalHours: 22.5, daysDelay: 0.8, rootCause: "Gold plating too thin", action: "Increase plating thickness spec", owner: "Mike Chen", targetDate: "2026-02-09", risk: "Medium", cp: 1, program: "Portable Comm System", division: "Defense Electronics", config: "Block I", subassembly: "Quick-Release Battery" },
    ]
    return allQuality.filter(item => {
      if (division !== "All" && item.division !== division) return false
      if (program !== "All" && item.program !== program) return false
      if (config !== "All" && item.config !== config) return false
      if (subassembly !== "All" && item.subassembly !== subassembly) return false
      return true
    })
  }

  const generateTimelineData = () => {
    const weeks = Math.ceil(parseInt(timeHorizon) / 7)
    // Data varies based on program and config selection - using seeded values for consistency
    const programMultiplier = program === "Manpack Radio Program" ? 1.2 : 
                              program === "Vehicle Mount System" ? 0.9 : 
                              program === "Tactical HF Radio" ? 1.1 :
                              program === "Base Station Program" ? 0.8 :
                              program === "Portable Comm System" ? 1.0 : 1.0
    const configMultiplier = config === "Block I" ? 1.1 : config === "Block II" ? 0.9 : config === "Block III" ? 1.0 : 1.0
    const divisionMultiplier = division === "Defense Electronics" ? 1.1 : division === "Communications" ? 0.95 : 1.0
    const finalMultiplier = programMultiplier * configMultiplier * divisionMultiplier
    
    // Use consistent seed values based on week number for reproducibility
    return Array.from({ length: weeks }, (_, i) => {
      const seed = (i + 1) * 17 % 10 / 10 // Pseudo-random but consistent
      return {
        week: i + 1,
        weekLabel: `Week ${i + 1}`,
        materialRisk: riskSource.includes("Material") ? ((seed * 3 + 1) * finalMultiplier) : 0,
        laborRisk: riskSource.includes("Labor") ? ((seed * 1.5 + 0.5) * finalMultiplier) : 0,
        qualityRisk: riskSource.includes("Quality") ? ((seed * 0.8 + 0.2) * finalMultiplier) : 0,
      }
    })
  }

  const generateActionData = () => {
    const allActions = [
      // Manpack Radio Program
      { rank: 1, itemId: "MSA1", description: "Procure Electronics", driver: "Material", daysPrevented: 17.2, action: "Expedite PO #5432 via air freight", owner: "John Smith", dueDate: "2026-02-05", status: "Not Started", evidence: "PO #5432", cp: 1, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block I", subassembly: "RF Transceiver Module" },
      { rank: 2, itemId: "MSA1 Labor", description: "Labor Capacity", driver: "Labor", daysPrevented: 4.0, action: "Add Shift 2 overtime", owner: "Sarah Martinez", dueDate: "2026-02-03", status: "In Progress", evidence: "HR-2024-045", cp: 1, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block I", subassembly: "RF Transceiver Module" },
      { rank: 3, itemId: "NC-1234", description: "Quality Issue", driver: "Quality", daysPrevented: 2.0, action: "Close NC via rework", owner: "Mike Chen", dueDate: "2026-02-05", status: "Not Started", evidence: "NC-1234", cp: 1, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block I", subassembly: "RF Transceiver Module" },
      { rank: 4, itemId: "PN-RF-001", description: "RF Amplifier", driver: "Material", daysPrevented: 12.0, action: "Confirm delivery with supplier", owner: "John Smith", dueDate: "2026-02-10", status: "Not Started", evidence: "PO #5432", cp: 1, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block II", subassembly: "Digital Signal Processor" },
      { rank: 8, itemId: "PN-PCB-450", description: "PCB Assembly", driver: "Material", daysPrevented: 5.0, action: "Expedite via premium freight", owner: "John Smith", dueDate: "2026-02-14", status: "Not Started", evidence: "PO #5678", cp: 1, program: "Manpack Radio Program", division: "Defense Electronics", config: "Block I", subassembly: "Digital Signal Processor" },
      // Vehicle Mount System
      { rank: 5, itemId: "MSA3 Labor", description: "Labor Shortfall", driver: "Labor", daysPrevented: 8.0, action: "Hire 2 temp workers", owner: "David Chen", dueDate: "2026-02-12", status: "Not Started", evidence: "HR-2024-048", cp: 1, program: "Vehicle Mount System", division: "Defense Electronics", config: "Block I", subassembly: "Power Amplifier Module" },
      { rank: 6, itemId: "MSA2", description: "Fabricate Case", driver: "Material", daysPrevented: 5.0, action: "Source alternate supplier", owner: "John Smith", dueDate: "2026-02-15", status: "In Progress", evidence: "RFQ-2024-089", cp: 2, program: "Vehicle Mount System", division: "Defense Electronics", config: "Block II", subassembly: "Mounting Bracket Assembly" },
      { rank: 9, itemId: "PN-MTG-100", description: "Mounting Bracket", driver: "Material", daysPrevented: 4.0, action: "Expedite from backup supplier", owner: "John Smith", dueDate: "2026-02-16", status: "Not Started", evidence: "PO #5789", cp: 1, program: "Vehicle Mount System", division: "Defense Electronics", config: "Block I", subassembly: "Mounting Bracket Assembly" },
      // Tactical HF Radio
      { rank: 7, itemId: "NC-1789", description: "Paint Defects", driver: "Quality", daysPrevented: 6.0, action: "Install dehumidifier in paint booth", owner: "Lisa Park", dueDate: "2026-02-08", status: "Mitigated", evidence: "NC-1789", cp: 1, program: "Tactical HF Radio", division: "Communications", config: "Block I", subassembly: "Control Display Unit" },
      { rank: 10, itemId: "PN-HF-TUNER", description: "HF Tuner Assembly", driver: "Material", daysPrevented: 6.0, action: "Expedite shipment from SignalTech", owner: "John Smith", dueDate: "2026-02-12", status: "In Progress", evidence: "PO #5890", cp: 1, program: "Tactical HF Radio", division: "Communications", config: "Block I", subassembly: "HF Tuner Assembly" },
      // Base Station Program
      { rank: 11, itemId: "MSA4 Labor", description: "Assembly Line Bottleneck", driver: "Labor", daysPrevented: 4.0, action: "Reassign operators from Line B", owner: "Sarah Martinez", dueDate: "2026-02-06", status: "Not Started", evidence: "HR-2024-052", cp: 1, program: "Base Station Program", division: "Communications", config: "Block I", subassembly: "Network Interface Card" },
      { rank: 12, itemId: "PN-NIC-200", description: "Network Interface Card", driver: "Material", daysPrevented: 3.0, action: "Confirm delivery date with TechSource", owner: "John Smith", dueDate: "2026-02-09", status: "Not Started", evidence: "PO #5901", cp: 1, program: "Base Station Program", division: "Communications", config: "Block II", subassembly: "Network Interface Card" },
      // Portable Comm System
      { rank: 13, itemId: "MSA11", description: "Procure Transceiver Parts", driver: "Material", daysPrevented: 8.0, action: "Expedite handheld transceiver PO", owner: "John Smith", dueDate: "2026-02-11", status: "Not Started", evidence: "PO #6001", cp: 1, program: "Portable Comm System", division: "Defense Electronics", config: "Block I", subassembly: "Handheld Transceiver" },
      { rank: 14, itemId: "MSA12 Labor", description: "Test Chamber Capacity", driver: "Labor", daysPrevented: 3.0, action: "Add night shift RF testing", owner: "David Chen", dueDate: "2026-02-08", status: "In Progress", evidence: "HR-2024-055", cp: 1, program: "Portable Comm System", division: "Defense Electronics", config: "Block II", subassembly: "Handheld Transceiver" },
      { rank: 15, itemId: "NC-2001", description: "Battery Contact Issue", driver: "Quality", daysPrevented: 2.0, action: "Update plating spec with supplier", owner: "Mike Chen", dueDate: "2026-02-10", status: "Not Started", evidence: "NC-2001", cp: 1, program: "Portable Comm System", division: "Defense Electronics", config: "Block I", subassembly: "Quick-Release Battery" },
    ]
    return allActions.filter(item => {
      if (division !== "All" && item.division !== division) return false
      if (program !== "All" && item.program !== program) return false
      if (config !== "All" && item.config !== config) return false
      if (subassembly !== "All" && item.subassembly !== subassembly) return false
      return true
    })
  }

  const topContributorsData = useMemo(() => generateTopContributorsData(), [riskSource, division, program, config, subassembly, partSearch])
  const materialData = useMemo(() => generateMaterialData().filter(m => m.cp === selectedMSA), [selectedMSA, division, program, config, subassembly, partSearch])
  const laborData = useMemo(() => generateLaborData().filter(l => l.cp === selectedMSA), [selectedMSA, division, program, config, subassembly])
  const qualityData = useMemo(() => generateQualityData().filter(q => q.cp === selectedMSA), [selectedMSA, division, program, config, subassembly])
  const timelineData = useMemo(() => generateTimelineData(), [timeHorizon, riskSource, division, program, config])
  const actionData = useMemo(() => {
    let data = generateActionData()
    if (selectedWeek) {
      data = data.filter((_, i) => i % 4 === selectedWeek - 1)
    }
    if (!ownerFilter.includes("All")) {
      data = data.filter(a => ownerFilter.includes(a.owner))
    }
    if (statusFilter.length > 0) {
      data = data.filter(a => statusFilter.includes(a.status))
    }
    return data
  }, [selectedWeek, ownerFilter, statusFilter, division, program, config, subassembly])

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "Critical": return "bg-red-100 text-red-800 border-red-500"
      case "High": return "bg-orange-100 text-orange-800 border-orange-500"
      case "Medium": return "bg-yellow-100 text-yellow-800 border-yellow-500"
      case "Low": return "bg-green-100 text-green-800 border-green-500"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Not Started": return "bg-gray-100 text-gray-800"
      case "In Progress": return "bg-blue-100 text-blue-800"
      case "Mitigated": return "bg-green-100 text-green-800"
      case "Closed": return "bg-gray-300 text-gray-600"
      case "Open": return "bg-red-100 text-red-800"
      case "In Review": return "bg-yellow-100 text-yellow-800"
      case "Rework In Progress": return "bg-orange-100 text-orange-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getDateColor = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const daysUntil = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysUntil < 3) return "text-red-600 font-bold"
    if (daysUntil < 7) return "text-orange-600 font-semibold"
    if (daysUntil < 14) return "text-yellow-600"
    return "text-green-600"
  }

  const actionCounts = useMemo(() => {
    const all = generateActionData()
    return {
      open: all.filter(a => a.status === "Not Started").length,
      inProgress: all.filter(a => a.status === "In Progress").length,
      mitigated: all.filter(a => a.status === "Mitigated").length,
    }
  }, [division, program, config, subassembly])

  return (
    <div className="space-y-4">
      {/* Global Filter Bar - Sticky */}
      <Card className="sticky top-0 z-10 bg-blue-50 border-blue-300 shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-5 gap-4 mb-4">
            <div>
              <label className="text-xs font-semibold mb-1 block">Division</label>
              <Select value={division} onValueChange={setDivision}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Defense Electronics">Defense Electronics</SelectItem>
                  <SelectItem value="Communications">Communications</SelectItem>
                  <SelectItem value="Aerospace Systems">Aerospace Systems</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold mb-1 block">Program</label>
              <Select value={program} onValueChange={(val) => { setProgram(val); setSubassembly("All"); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Manpack Radio Program">Manpack Radio Program</SelectItem>
                  <SelectItem value="Vehicle Mount System">Vehicle Mount System</SelectItem>
                  <SelectItem value="Tactical HF Radio">Tactical HF Radio</SelectItem>
                  <SelectItem value="Base Station Program">Base Station Program</SelectItem>
                  <SelectItem value="Portable Comm System">Portable Comm System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold mb-1 block">Config</label>
              <Select value={config} onValueChange={setConfig}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Block I">Block I</SelectItem>
                  <SelectItem value="Block II">Block II</SelectItem>
                  <SelectItem value="Block III">Block III</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold mb-1 block">Subassembly</label>
              <Select value={subassembly} onValueChange={setSubassembly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  {program === "Manpack Radio Program" || program === "All" ? (
                    <>
                      <SelectItem value="RF Transceiver Module">RF Transceiver Module</SelectItem>
                      <SelectItem value="Battery Pack Assembly">Battery Pack Assembly</SelectItem>
                      <SelectItem value="Antenna Interface Unit">Antenna Interface Unit</SelectItem>
                      <SelectItem value="Digital Signal Processor">Digital Signal Processor</SelectItem>
                      <SelectItem value="Ruggedized Enclosure">Ruggedized Enclosure</SelectItem>
                    </>
                  ) : null}
                  {program === "Vehicle Mount System" || program === "All" ? (
                    <>
                      <SelectItem value="Power Amplifier Module">Power Amplifier Module</SelectItem>
                      <SelectItem value="Mounting Bracket Assembly">Mounting Bracket Assembly</SelectItem>
                      <SelectItem value="Vehicle Interface Unit">Vehicle Interface Unit</SelectItem>
                      <SelectItem value="Cooling System">Cooling System</SelectItem>
                    </>
                  ) : null}
                  {program === "Tactical HF Radio" || program === "All" ? (
                    <>
                      <SelectItem value="HF Tuner Assembly">HF Tuner Assembly</SelectItem>
                      <SelectItem value="Cryptographic Module">Cryptographic Module</SelectItem>
                      <SelectItem value="Control Display Unit">Control Display Unit</SelectItem>
                    </>
                  ) : null}
                  {program === "Base Station Program" || program === "All" ? (
                    <>
                      <SelectItem value="Tower Electronics Bay">Tower Electronics Bay</SelectItem>
                      <SelectItem value="Network Interface Card">Network Interface Card</SelectItem>
                      <SelectItem value="Power Distribution Unit">Power Distribution Unit</SelectItem>
                    </>
                  ) : null}
                  {program === "Portable Comm System" || program === "All" ? (
                    <>
                      <SelectItem value="Handheld Transceiver">Handheld Transceiver</SelectItem>
                      <SelectItem value="Earpiece Assembly">Earpiece Assembly</SelectItem>
                      <SelectItem value="Quick-Release Battery">Quick-Release Battery</SelectItem>
                    </>
                  ) : null}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold mb-1 block">Horizon</label>
              <Select value={timeHorizon} onValueChange={setTimeHorizon}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex gap-2">
              <Button
                variant={viewFocus === "program" ? "default" : "outline"}
                onClick={() => setViewFocus("program")}
                size="sm"
              >
                Program Finish Date
              </Button>
              <Button
                variant={viewFocus === "line-continuity" ? "default" : "outline"}
                onClick={() => setViewFocus("line-continuity")}
                size="sm"
              >
                Next 30 Days Line Continuity
              </Button>
            </div>

            <div className="flex gap-2 items-center">
              <span className="text-xs font-semibold">Show Risk From:</span>
              <Button
                variant={riskSource.includes("Material") ? "default" : "outline"}
                onClick={() => toggleRiskSource("Material")}
                size="sm"
                style={{ backgroundColor: riskSource.includes("Material") ? "#E63946" : undefined }}
              >
                Material
              </Button>
              <Button
                variant={riskSource.includes("Labor") ? "default" : "outline"}
                onClick={() => toggleRiskSource("Labor")}
                size="sm"
                style={{ backgroundColor: riskSource.includes("Labor") ? "#457B9D" : undefined }}
              >
                Labor
              </Button>
              <Button
                variant={riskSource.includes("Quality") ? "default" : "outline"}
                onClick={() => toggleRiskSource("Quality")}
                size="sm"
                style={{ backgroundColor: riskSource.includes("Quality") ? "#F4A261" : undefined }}
              >
                Quality
              </Button>
            </div>

            <div className="flex-1">
              <Input
                placeholder="Search part # or description..."
                value={partSearch}
                onChange={(e) => setPartSearch(e.target.value)}
                className="max-w-xs"
              />
            </div>

            <Button variant="outline" onClick={handleClearFilters} size="sm">
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2x2 Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* VIEW 1 - Top Schedule Risk Contributors */}
        <Card>
          <CardHeader>
            <CardTitle>VIEW 1: Top Schedule Risk Contributors</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={topContributorsData} 
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" label={{ value: 'Days of Impact Prevented', position: 'bottom' }} />
                <YAxis type="category" dataKey="id" width={90} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-white p-3 border rounded shadow text-sm">
                          <p className="font-bold">{data.id}</p>
                          <p>Expected Program Finish Delay: {data.total} days</p>
                          <p className="text-red-600">Material Risk: {data.materialRisk} days ({Math.round(data.materialRisk / data.total * 100)}%)</p>
                          <p className="text-blue-600">Labor Risk: {data.laborRisk} days ({Math.round(data.laborRisk / data.total * 100)}%)</p>
                          <p className="text-orange-600">Quality Risk: {data.qualityRisk} days ({Math.round(data.qualityRisk / data.total * 100)}%)</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="rect"
                  layout="horizontal"
                  align="center"
                  verticalAlign="top"
                  iconSize={14}
                />
                <Bar 
                  dataKey="materialRisk" 
                  stackId="a" 
                  fill="#E63946" 
                  name="Material Risk"
                  onClick={(data) => {
                    if (data.id.startsWith("MSA") && !data.id.includes("Labor")) {
                      setSelectedMSA(parseInt(data.id.replace("MSA", "")))
                      setView2Tab("material")
                    }
                  }}
                  cursor="pointer"
                />
                <Bar 
                  dataKey="laborRisk" 
                  stackId="a" 
                  fill="#457B9D" 
                  name="Labor Risk"
onClick={(data) => {
                    if (data.id.startsWith("MSA")) {
                      setSelectedMSA(parseInt(data.id.replace("MSA", "").split(" ")[0]))
                      setView2Tab("labor")
                    }
                  }}
                  cursor="pointer"
                />
                <Bar 
                  dataKey="qualityRisk" 
                  stackId="a" 
                  fill="#F4A261" 
                  name="Quality Risk"
onClick={(data) => {
                    if (data.id.startsWith("MSA") || data.id.startsWith("NC")) {
                      setSelectedMSA(1)
                      setView2Tab("quality")
                    }
                  }}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* VIEW 2 - Drivers for Selected CP */}
        <Card>
          <CardHeader>
            <CardTitle>VIEW 2: Drivers for Selected CP</CardTitle>
            <div className="text-sm space-y-1 mt-2 bg-gray-50 p-3 rounded">
              <p><strong>Selected:</strong> CP{selectedMSA} – Assemble PCB</p>
              <p><strong>Planned:</strong> 2026-02-18 | <strong>Forecast:</strong> 2026-02-22</p>
              <p><strong>Buffer:</strong> 1 day | <strong>Risk:</strong> 15 days (Material: 10d, Labor: 3d, Quality: 2d)</p>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={view2Tab} onValueChange={setView2Tab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="material">Material</TabsTrigger>
                <TabsTrigger value="labor">Labor</TabsTrigger>
                <TabsTrigger value="quality">Quality</TabsTrigger>
              </TabsList>

              <TabsContent value="material" className="max-h-[320px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Buffer</TableHead>
                      <TableHead>Impact</TableHead>
                      <TableHead>OTD%</TableHead>
                      <TableHead>Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materialData.map((item, i) => (
                      <TableRow key={i} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{item.partNumber}</TableCell>
                        <TableCell className="text-sm">{item.supplier}</TableCell>
                        <TableCell className={item.buffer < 0 ? "text-red-600 font-bold" : item.buffer < 3 ? "text-yellow-600" : "text-green-600"}>
                          {item.buffer}d
                        </TableCell>
                        <TableCell className="font-semibold">{item.impact}d</TableCell>
                        <TableCell>{item.otd}%</TableCell>
                        <TableCell>
                          <Badge className={getRiskColor(item.risk)}>{item.risk}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="labor" className="max-h-[320px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Issue Type</TableHead>
                      <TableHead>Shortfall</TableHead>
                      <TableHead>Days Delay</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {laborData.map((item, i) => (
                      <TableRow key={i} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{item.issueType}</TableCell>
                        <TableCell className={item.shortfall > 30 ? "text-red-600 font-bold" : item.shortfall > 0 ? "text-yellow-600" : "text-green-600"}>
                          {item.shortfall}h
                        </TableCell>
                        <TableCell className="font-semibold">{item.daysDelay}d</TableCell>
                        <TableCell className="text-sm">{item.owner}</TableCell>
                        <TableCell>
                          <Badge className={getRiskColor(item.risk)}>{item.risk}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="quality" className="max-h-[320px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>NC #</TableHead>
                      <TableHead>Issue Type</TableHead>
                      <TableHead>Units</TableHead>
                      <TableHead>Days Delay</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {qualityData.map((item, i) => (
                      <TableRow key={i} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{item.ncNumber}</TableCell>
                        <TableCell>{item.issueType}</TableCell>
                        <TableCell>{item.affectedParts}</TableCell>
                        <TableCell className={item.daysDelay > 1 ? "text-red-600 font-bold" : item.daysDelay > 0.5 ? "text-yellow-600" : "text-green-600"}>
                          {item.daysDelay}d
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRiskColor(item.risk)}>{item.risk}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* VIEW 3 - Risk Drivers Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>VIEW 3: Risk Drivers Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="weekLabel" />
                <YAxis label={{ value: 'Expected Delay Days', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      const total = data.materialRisk + data.laborRisk + data.qualityRisk
                      return (
                        <div className="bg-white p-3 border rounded shadow text-sm">
                          <p className="font-bold">{data.weekLabel}</p>
                          <p className="text-red-600">Material: {data.materialRisk.toFixed(1)}d</p>
                          <p className="text-blue-600">Labor: {data.laborRisk.toFixed(1)}d</p>
                          <p className="text-orange-600">Quality: {data.qualityRisk.toFixed(1)}d</p>
                          <p className="font-bold mt-1">Total: {total.toFixed(1)}d</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '10px' }}
                  iconType="rect"
                  layout="horizontal"
                  align="center"
                  verticalAlign="top"
                />
                <Bar 
                  dataKey="materialRisk" 
                  stackId="a" 
                  fill="#E63946" 
                  name="Material Risk"
                  onClick={(data) => setSelectedWeek(data.week)}
                  cursor="pointer"
                />
                <Bar 
                  dataKey="laborRisk" 
                  stackId="a" 
                  fill="#457B9D" 
                  name="Labor Risk"
                  onClick={(data) => setSelectedWeek(data.week)}
                  cursor="pointer"
                />
                <Bar 
                  dataKey="qualityRisk" 
                  stackId="a" 
                  fill="#F4A261" 
                  name="Quality Risk"
                  onClick={(data) => setSelectedWeek(data.week)}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* VIEW 4 - Action Queue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>VIEW 4: Action Queue</span>
              <div className="text-sm font-normal space-x-2">
                <Badge className="bg-gray-100 text-gray-800">{actionCounts.open} Open</Badge>
                <Badge className="bg-blue-100 text-blue-800">{actionCounts.inProgress} In Progress</Badge>
                <Badge className="bg-green-100 text-green-800">{actionCounts.mitigated} Mitigated</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[360px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actionData.map((item) => (
                    <TableRow key={item.rank} className="cursor-pointer hover:bg-gray-50">
                      <TableCell className="font-medium">{item.rank}</TableCell>
                      <TableCell className="font-medium">{item.itemId}</TableCell>
                      <TableCell>
                        <Badge className={
                          item.driver === "Material" ? "bg-red-100 text-red-800" :
                          item.driver === "Labor" ? "bg-blue-100 text-blue-800" :
                          "bg-orange-100 text-orange-800"
                        }>
                          {item.driver}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-blue-600">{item.daysPrevented}d</TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm">{item.action}</TableCell>
                      <TableCell className="text-sm">{item.owner}</TableCell>
                      <TableCell className={getDateColor(item.dueDate)}>{item.dueDate}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
