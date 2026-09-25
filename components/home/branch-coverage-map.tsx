"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GitBranch, Layers3, MapPinned } from "lucide-react"
import Loader from "@/components/Loader"

type Province = {
  code: string
  zone: string
  branch: string
  name: string
}

type CoverageSummary = {
  total_retailers: number
  covered_retailers: number
  not_covered_retailers: number
  coverage_percentage: number
  uao?: number
  red_flagged_retailers?: number
  logic_followed?: number
  asm_visits?: number
  ASM_visits?: number
}

const GEOJSON_URL = "/maps/italy-provinces.json"

function normalizeName(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'`]/g, "")
    .replace(/\s*\/\s*.*/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
}

const NAME_ALIASES: Record<string, string> = {
  [normalizeName("Trentino-Alto Adige/Südtirol")]: normalizeName("Trentino-Alto Adige"),
  [normalizeName("Bolzano/Bozen")]: normalizeName("Bolzano"),
  [normalizeName("Forlì-Cesena")]: normalizeName("Forli-Cesena"),
  [normalizeName("Pesaro and Urbino")]: normalizeName("Pesaro-Urbino"),
  [normalizeName("Monza-Brianza")]: normalizeName("Monza e della Brianza"),
}

function nameKey(value: unknown) {
  const normalized = normalizeName(value)
  return NAME_ALIASES[normalized] ?? normalized
}

function getCoverageColor(value: number | null) {
  if (value === null) return "#e2e8f0"
  if (value < 20) return "#c2413b"
  if (value < 40) return "#f28c28"
  if (value < 60) return "#f4c95d"
  if (value < 80) return "#69b578"
  return "#1f7a58"
}

function getCoordinates(geometry: any): number[][] {
  if (!geometry) return []
  if (geometry.type === "Point") return [geometry.coordinates]
  if (geometry.coordinates) return geometry.coordinates.flat(Infinity).reduce<number[][]>((points, value, index, values) => {
    if (index % 2 === 0 && typeof value === "number" && typeof values[index + 1] === "number") points.push([value, values[index + 1]])
    return points
  }, [])
  return []
}

const PROVINCES: Province[] = [
  { code: "BA", zone: "HS BARI ZONE 1", branch: "LMIT-HS-BARI", name: "Bari" },
  { code: "MT", zone: "HS BARI ZONE 1", branch: "LMIT-HS-BARI", name: "Matera" },
  { code: "BT", zone: "HS BARI ZONE 2", branch: "LMIT-HS-BARI", name: "Barletta-Andria-Trani" },
  { code: "FG", zone: "HS BARI ZONE 2", branch: "LMIT-HS-BARI", name: "Foggia" },
  { code: "BR", zone: "HS BARI ZONE 3", branch: "LMIT-HS-BARI", name: "Brindisi" },
  { code: "LE", zone: "HS BARI ZONE 3", branch: "LMIT-HS-BARI", name: "Lecce" },
  { code: "TA", zone: "HS BARI ZONE 3", branch: "LMIT-HS-BARI", name: "Taranto" },
  { code: "FE", zone: "HS BOLOGNA ZONE 1", branch: "LMIT-HS-BOLOGNA", name: "Ferrara" },
  { code: "FC", zone: "HS BOLOGNA ZONE 1", branch: "LMIT-HS-BOLOGNA", name: "Forlì-Cesena" },
  { code: "RA", zone: "HS BOLOGNA ZONE 1", branch: "LMIT-HS-BOLOGNA", name: "Ravenna" },
  { code: "RE", zone: "HS BOLOGNA ZONE 1", branch: "LMIT-HS-BOLOGNA", name: "Reggio Emilia" },
  { code: "BO", zone: "HS BOLOGNA ZONE 1", branch: "LMIT-HS-BOLOGNA", name: "Bologna" },
  { code: "MO", zone: "HS BOLOGNA ZONE 1", branch: "LMIT-HS-BOLOGNA", name: "Modena" },
  { code: "RN", zone: "HS BOLOGNA ZONE 2", branch: "LMIT-HS-BOLOGNA", name: "Rimini" },
  { code: "AN", zone: "HS BOLOGNA ZONE 2", branch: "LMIT-HS-BOLOGNA", name: "Ancona" },
  { code: "FM", zone: "HS BOLOGNA ZONE 2", branch: "LMIT-HS-BOLOGNA", name: "Fermo" },
  { code: "MC", zone: "HS BOLOGNA ZONE 2", branch: "LMIT-HS-BOLOGNA", name: "Macerata" },
  { code: "PU", zone: "HS BOLOGNA ZONE 2", branch: "LMIT-HS-BOLOGNA", name: "Pesaro and Urbino" },
  { code: "FI", zone: "HS BOLOGNA ZONE 3", branch: "LMIT-HS-BOLOGNA", name: "Florence" },
  { code: "LI", zone: "HS BOLOGNA ZONE 3", branch: "LMIT-HS-BOLOGNA", name: "Livorno" },
  { code: "LU", zone: "HS BOLOGNA ZONE 3", branch: "LMIT-HS-BOLOGNA", name: "Lucca" },
  { code: "MS", zone: "HS BOLOGNA ZONE 3", branch: "LMIT-HS-BOLOGNA", name: "Massa-Carrara" },
  { code: "PI", zone: "HS BOLOGNA ZONE 3", branch: "LMIT-HS-BOLOGNA", name: "Pisa" },
  { code: "PT", zone: "HS BOLOGNA ZONE 3", branch: "LMIT-HS-BOLOGNA", name: "Pistoia" },
  { code: "PO", zone: "HS BOLOGNA ZONE 3", branch: "LMIT-HS-BOLOGNA", name: "Prato" },
  { code: "MI", zone: "HS MILANO ZONE 1", branch: "LMIT-HS-MILAN", name: "Milan" },
  { code: "CO", zone: "HS MILANO ZONE 2", branch: "LMIT-HS-MILAN", name: "Como" },
  { code: "LC", zone: "HS MILANO ZONE 2", branch: "LMIT-HS-MILAN", name: "Lecco" },
  { code: "MB", zone: "HS MILANO ZONE 2", branch: "LMIT-HS-MILAN", name: "Monza-Brianza" },
  { code: "VA", zone: "HS MILANO ZONE 2", branch: "LMIT-HS-MILAN", name: "Varese" },
  { code: "SO", zone: "HS MILANO ZONE 2", branch: "LMIT-HS-MILAN", name: "Sondrio" },
  { code: "AL", zone: "HS MILANO ZONE 2", branch: "LMIT-HS-MILAN", name: "Alessandria" },
  { code: "NO", zone: "HS MILANO ZONE 2", branch: "LMIT-HS-MILAN", name: "Novara" },
  { code: "VC", zone: "HS MILANO ZONE 2", branch: "LMIT-HS-MILAN", name: "Vercelli" },
  { code: "VB", zone: "HS MILANO ZONE 2", branch: "LMIT-HS-MILAN", name: "Verbano-Cusio-Ossola" },
  { code: "BG", zone: "HS MILANO ZONE 3", branch: "LMIT-HS-MILAN", name: "Bergamo" },
  { code: "BS", zone: "HS MILANO ZONE 3", branch: "LMIT-HS-MILAN", name: "Brescia" },
  { code: "PR", zone: "HS MILANO ZONE 4", branch: "LMIT-HS-MILAN", name: "Parma" },
  { code: "PC", zone: "HS MILANO ZONE 4", branch: "LMIT-HS-MILAN", name: "Piacenza" },
  { code: "CR", zone: "HS MILANO ZONE 4", branch: "LMIT-HS-MILAN", name: "Cremona" },
  { code: "LO", zone: "HS MILANO ZONE 4", branch: "LMIT-HS-MILAN", name: "Lodi" },
  { code: "MN", zone: "HS MILANO ZONE 4", branch: "LMIT-HS-MILAN", name: "Mantua" },
  { code: "PV", zone: "HS MILANO ZONE 4", branch: "LMIT-HS-MILAN", name: "Pavia" },
  { code: "NA", zone: "HS NAPOLI ZONE 1", branch: "LMIT-HS-NAPLES", name: "Naples" },
  { code: "CE", zone: "HS NAPOLI ZONE 2", branch: "LMIT-HS-NAPLES", name: "Caserta" },
  { code: "SA", zone: "HS NAPOLI ZONE 3", branch: "LMIT-HS-NAPLES", name: "Salerno" },
  { code: "AV", zone: "HS NAPOLI ZONE 4", branch: "LMIT-HS-NAPLES", name: "Avellino" },
  { code: "BN", zone: "HS NAPOLI ZONE 4", branch: "LMIT-HS-NAPLES", name: "Benevento" },
  { code: "PZ", zone: "HS NAPOLI ZONE 5", branch: "LMIT-HS-NAPLES", name: "Potenza" },
  { code: "CZ", zone: "HS NAPOLI ZONE 6", branch: "LMIT-HS-NAPLES", name: "Catanzaro" },
  { code: "CS", zone: "HS NAPOLI ZONE 6", branch: "LMIT-HS-NAPLES", name: "Cosenza" },
  { code: "KR", zone: "HS NAPOLI ZONE 6", branch: "LMIT-HS-NAPLES", name: "Crotone" },
  { code: "RC", zone: "HS NAPOLI ZONE 7", branch: "LMIT-HS-NAPLES", name: "Reggio Calabria" },
  { code: "VV", zone: "HS NAPOLI ZONE 7", branch: "LMIT-HS-NAPLES", name: "Vibo Valentia" },
  { code: "GO", zone: "HS PADOVA ZONE 1", branch: "LMIT-HS-PADOVA", name: "Gorizia" },
  { code: "PN", zone: "HS PADOVA ZONE 1", branch: "LMIT-HS-PADOVA", name: "Pordenone" },
  { code: "TS", zone: "HS PADOVA ZONE 1", branch: "LMIT-HS-PADOVA", name: "Trieste" },
  { code: "UD", zone: "HS PADOVA ZONE 1", branch: "LMIT-HS-PADOVA", name: "Udine" },
  { code: "PD", zone: "HS PADOVA ZONE 1", branch: "LMIT-HS-PADOVA", name: "Padua" },
  { code: "RO", zone: "HS PADOVA ZONE 1", branch: "LMIT-HS-PADOVA", name: "Rovigo" },
  { code: "TV", zone: "HS PADOVA ZONE 1", branch: "LMIT-HS-PADOVA", name: "Treviso" },
  { code: "VE", zone: "HS PADOVA ZONE 1", branch: "LMIT-HS-PADOVA", name: "Venice" },
  { code: "VI", zone: "HS PADOVA ZONE 1", branch: "LMIT-HS-PADOVA", name: "Vicenza" },
  { code: "BZ", zone: "HS PADOVA ZONE 2", branch: "LMIT-HS-PADOVA", name: "South Tyrol" },
  { code: "TN", zone: "HS PADOVA ZONE 2", branch: "LMIT-HS-PADOVA", name: "Trento" },
  { code: "BL", zone: "HS PADOVA ZONE 2", branch: "LMIT-HS-PADOVA", name: "Belluno" },
  { code: "VR", zone: "HS PADOVA ZONE 2", branch: "LMIT-HS-PADOVA", name: "Verona" },
  { code: "PA", zone: "HS PALERMO ZONE 1", branch: "LMIT-HS-PALERMO", name: "Palermo" },
  { code: "TP", zone: "HS PALERMO ZONE 1", branch: "LMIT-HS-PALERMO", name: "Trapani" },
  { code: "AG", zone: "HS PALERMO ZONE 2", branch: "LMIT-HS-PALERMO", name: "Agrigento" },
  { code: "CL", zone: "HS PALERMO ZONE 2", branch: "LMIT-HS-PALERMO", name: "Caltanissetta" },
  { code: "CT", zone: "HS PALERMO ZONE 3", branch: "LMIT-HS-PALERMO", name: "Catania" },
  { code: "EN", zone: "HS PALERMO ZONE 3", branch: "LMIT-HS-PALERMO", name: "Enna" },
  { code: "ME", zone: "HS PALERMO ZONE 3", branch: "LMIT-HS-PALERMO", name: "Messina" },
  { code: "RG", zone: "HS PALERMO ZONE 3", branch: "LMIT-HS-PALERMO", name: "Ragusa" },
  { code: "SR", zone: "HS PALERMO ZONE 3", branch: "LMIT-HS-PALERMO", name: "Syracuse" },
  { code: "RM", zone: "HS ROMA ZONE 1", branch: "LMIT-HS-ROME", name: "Rome" },
  { code: "CA", zone: "HS ROMA ZONE 2", branch: "LMIT-HS-ROME", name: "Cagliari" },
  { code: "NU", zone: "HS ROMA ZONE 2", branch: "LMIT-HS-ROME", name: "Nuoro" },
  { code: "OR", zone: "HS ROMA ZONE 2", branch: "LMIT-HS-ROME", name: "Oristano" },
  { code: "SS", zone: "HS ROMA ZONE 2", branch: "LMIT-HS-ROME", name: "Sassari" },
  { code: "SU", zone: "HS ROMA ZONE 2", branch: "LMIT-HS-ROME", name: "Sud Sardegna" },
  { code: "RI", zone: "HS ROMA ZONE 3", branch: "LMIT-HS-ROME", name: "Rieti" },
  { code: "VT", zone: "HS ROMA ZONE 3", branch: "LMIT-HS-ROME", name: "Viterbo" },
  { code: "SI", zone: "HS ROMA ZONE 3", branch: "LMIT-HS-ROME", name: "Siena" },
  { code: "AR", zone: "HS ROMA ZONE 3", branch: "LMIT-HS-ROME", name: "Arezzo" },
  { code: "GR", zone: "HS ROMA ZONE 3", branch: "LMIT-HS-ROME", name: "Grosseto" },
  { code: "PG", zone: "HS ROMA ZONE 3", branch: "LMIT-HS-ROME", name: "Perugia" },
  { code: "TR", zone: "HS ROMA ZONE 3", branch: "LMIT-HS-ROME", name: "Terni" },
  { code: "FR", zone: "HS ROMA ZONE 4", branch: "LMIT-HS-ROME", name: "Frosinone" },
  { code: "LT", zone: "HS ROMA ZONE 4", branch: "LMIT-HS-ROME", name: "Latina" },
  { code: "CH", zone: "HS ROMA ZONE 5", branch: "LMIT-HS-ROME", name: "Chieti" },
  { code: "AQ", zone: "HS ROMA ZONE 5", branch: "LMIT-HS-ROME", name: "L'Aquila" },
  { code: "PE", zone: "HS ROMA ZONE 5", branch: "LMIT-HS-ROME", name: "Pescara" },
  { code: "TE", zone: "HS ROMA ZONE 5", branch: "LMIT-HS-ROME", name: "Teramo" },
  { code: "AP", zone: "HS ROMA ZONE 5", branch: "LMIT-HS-ROME", name: "Ascoli Piceno" },
  { code: "CB", zone: "HS ROMA ZONE 5", branch: "LMIT-HS-ROME", name: "Campobasso" },
  { code: "IS", zone: "HS ROMA ZONE 5", branch: "LMIT-HS-ROME", name: "Isernia" },
  { code: "TO", zone: "HS TORINO ZONE 1", branch: "LMIT-HS-TORINO", name: "Turin" },
  { code: "AO", zone: "HS TORINO ZONE 2", branch: "LMIT-HS-TORINO", name: "Aosta" },
  { code: "AT", zone: "HS TORINO ZONE 2", branch: "LMIT-HS-TORINO", name: "Asti" },
  { code: "BI", zone: "HS TORINO ZONE 2", branch: "LMIT-HS-TORINO", name: "Biella" },
  { code: "CN", zone: "HS TORINO ZONE 2", branch: "LMIT-HS-TORINO", name: "Cuneo" },
  { code: "SV", zone: "HS TORINO ZONE 3", branch: "LMIT-HS-TORINO", name: "Savona" },
  { code: "GE", zone: "HS TORINO ZONE 3", branch: "LMIT-HS-TORINO", name: "Genoa" },
  { code: "IM", zone: "HS TORINO ZONE 3", branch: "LMIT-HS-TORINO", name: "Imperia" },
  { code: "SP", zone: "HS TORINO ZONE 3", branch: "LMIT-HS-TORINO", name: "La Spezia" },
]

const BRANCH_PALETTE: Record<string, { base: string }> = {
  "LMIT-HS-TORINO": { base: "#21264E" },
  "LMIT-HS-MILAN": { base: "#245BC1" },
  "LMIT-HS-PADOVA": { base: "#08DC7D" },
  "LMIT-HS-BOLOGNA": { base: "#D6EEFF" },
  "LMIT-HS-ROME": { base: "#FFDD64" },
  "LMIT-HS-NAPLES": { base: "#00D7FF" },
  "LMIT-HS-PALERMO": { base: "#46286E" },
  "LMIT-HS-BARI": { base: "#1080FD" },
}

const BRANCH_LABEL: Record<string, string> = {
  "LMIT-HS-BARI": "Bari",
  "LMIT-HS-BOLOGNA": "Bologna",
  "LMIT-HS-MILAN": "Milan",
  "LMIT-HS-NAPLES": "Naples",
  "LMIT-HS-PADOVA": "Padova",
  "LMIT-HS-PALERMO": "Palermo",
  "LMIT-HS-ROME": "Rome",
  "LMIT-HS-TORINO": "Torino",
}

export function BranchCoverageMap() {
  const mapHostRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<any>(null)
  const geoJsonRef = useRef<any>(null)
  const [activeBranch, setActiveBranch] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const byCode = useMemo(() => {
    const m: Record<string, Province> = {}
    for (const p of PROVINCES) m[p.code] = p
    return m
  }, [])

  const branches = useMemo(() => {
    const preferredOrder = [
      "LMIT-HS-TORINO",
      "LMIT-HS-MILAN",
      "LMIT-HS-PADOVA",
      "LMIT-HS-BOLOGNA",
      "LMIT-HS-ROME",
      "LMIT-HS-NAPLES",
      "LMIT-HS-PALERMO",
      "LMIT-HS-BARI",
    ]
    const existing = new Set(PROVINCES.map((p) => p.branch))
    return preferredOrder.filter((b) => existing.has(b))
  }, [])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        const res = await fetch(GEOJSON_URL)
        if (!res.ok) throw new Error("Failed to load map topology")
        geoJsonRef.current = await res.json()
        if (!cancelled) setReady(true)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load map")
      }
    }

    bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ready) return

    let cancelled = false
    let resizeObserver: ResizeObserver | null = null
    let chart: any = null

    async function mountChart() {
      const host = mapHostRef.current
      if (!host || !geoJsonRef.current) return
      const echarts = await import("echarts")
      if (cancelled) return
      chart = echarts.init(host)
      chartRef.current = chart
      const normalizedGeoJson = {
        ...geoJsonRef.current,
        features: (geoJsonRef.current.features ?? []).map((feature: any) => ({
          ...feature,
          properties: {
            ...(feature.properties ?? {}),
            name: feature.properties?.prov_name ?? feature.properties?.name ?? "",
          },
        })),
      }
      echarts.registerMap("italy-provinces", normalizedGeoJson)
      resizeObserver = new ResizeObserver(() => chart.resize())
      resizeObserver.observe(host)
    }

    mountChart()

    return () => {
      cancelled = true
      resizeObserver?.disconnect()
      chart?.dispose()
      chartRef.current = null
    }
  }, [ready])

  const branchBreakdown = useMemo(() => {
    return branches.map((b) => {
      const count = PROVINCES.filter((p) => p.branch === b).length
      return { branch: b, count }
    })
  }, [branches])

  const tileAccent = {
    branches: "#21264E",
    zones: "#00D7FF",
    provinces: "#08DC7D",
  }

  return (
    <Card className="border-none bg-white shadow-sm ring-1 ring-brand-navy/5">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold text-brand-navy">Italy Distribution Network</CardTitle>
        <CardDescription className="text-slate-500">
          A clear view of how our 8 branches manage national distribution across provinces.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <Card className="group relative flex flex-col overflow-hidden border-none bg-white shadow-sm ring-1 ring-brand-navy/5 transition-all hover:shadow-xl hover:ring-brand-navy/15">
              <div className="absolute top-0 h-1.5 w-full" style={{ background: tileAccent.branches }} />
              <CardHeader className="pb-4">
                <div
                  className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner transition-transform group-hover:scale-110"
                  style={{ background: tileAccent.branches, color: "#ffffff" }}
                >
                  <GitBranch className="h-7 w-7" />
                </div>
                <CardTitle className="text-2xl font-bold text-brand-navy">Branches</CardTitle>
                <CardDescription className="text-slate-500">North · Centre · South · Islands</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-0">
                <div className="text-4xl font-extrabold tracking-tight text-brand-navy tabular-nums">8</div>
              </CardContent>
            </Card>

            <Card className="group relative flex flex-col overflow-hidden border-none bg-white shadow-sm ring-1 ring-brand-navy/5 transition-all hover:shadow-xl hover:ring-brand-navy/15">
              <div className="absolute top-0 h-1.5 w-full" style={{ background: tileAccent.zones }} />
              <CardHeader className="pb-4">
                <div
                  className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner transition-transform group-hover:scale-110"
                  style={{ background: tileAccent.zones, color: "#ffffff" }}
                >
                  <Layers3 className="h-7 w-7" />
                </div>
                <CardTitle className="text-2xl font-bold text-brand-navy">Zones</CardTitle>
                <CardDescription className="text-slate-500">Across all branches</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-0">
                <div className="text-4xl font-extrabold tracking-tight text-brand-navy tabular-nums">30</div>
              </CardContent>
            </Card>

            <Card className="group relative flex flex-col overflow-hidden border-none bg-white shadow-sm ring-1 ring-brand-navy/5 transition-all hover:shadow-xl hover:ring-brand-navy/15">
              <div className="absolute top-0 h-1.5 w-full" style={{ background: tileAccent.provinces }} />
              <CardHeader className="pb-4">
                <div
                  className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner transition-transform group-hover:scale-110"
                  style={{ background: tileAccent.provinces, color: "#ffffff" }}
                >
                  <MapPinned className="h-7 w-7" />
                </div>
                <CardTitle className="text-2xl font-bold text-brand-navy">Provinces</CardTitle>
                <CardDescription className="text-slate-500">Full national coverage</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-0">
                <div className="text-4xl font-extrabold tracking-tight text-brand-navy tabular-nums">107</div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveBranch(null)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                activeBranch === null
                  ? "border-brand-navy/20 bg-brand-navy/5 text-brand-navy"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              All
            </button>
            {branches.map((b) => {
              const pal = BRANCH_PALETTE[b]
              const isActive = activeBranch === b
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => setActiveBranch(b)}
                  className="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
                  style={{
                    borderColor: isActive ? pal?.base ?? "#e2e8f0" : "#e2e8f0",
                    background: isActive ? `${pal?.base ?? "#0f172a"}22` : "#ffffff",
                    color: isActive ? pal?.base ?? "#0f172a" : "#475569",
                  }}
                >
                  {BRANCH_LABEL[b] ?? b}
                </button>
              )
            })}
          </div>

          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <div ref={mapHostRef} className="h-[min(75vw,720px)] min-h-[520px] w-full" />
            {error ? (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-600">{error}</div>
            ) : null}
            {!error && !ready ? (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-600">
                <Loader size={64} weight={8} />
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-semibold text-slate-900">Branch breakdown</div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {branchBreakdown.map((b) => {
                const pal = BRANCH_PALETTE[b.branch]
                return (
                  <div key={b.branch} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
                    <div className="h-2.5 w-2.5 rounded-sm" style={{ background: pal?.base ?? "#94a3b8" }} />
                    <div className="text-sm font-semibold text-slate-800">{BRANCH_LABEL[b.branch] ?? b.branch}</div>
                    <div className="ml-auto text-xs text-slate-500 tabular-nums">{b.count}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
