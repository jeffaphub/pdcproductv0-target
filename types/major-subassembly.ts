export interface MajorSubassembly {
  id: number
  name: string
  type: "purchased" | "companyMade" | "subcontract" | "assembly"
  leadTime: number
  startDay: number
  endDay: number
  row: number
  dependencies: number[]
}
