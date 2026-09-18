export const BRANCHES = [
  "LMIT-HS-BARI",
  "LMIT-HS-BOLOGNA",
  "LMIT-HS-MILAN",
  "LMIT-HS-NAPLES",
  "LMIT-HS-PADOVA",
  "LMIT-HS-PALERMO",
  "LMIT-HS-ROME",
  "LMIT-HS-TORINO",
] as const

export type Branch = (typeof BRANCHES)[number]

export const ZONES_BY_BRANCH: Record<Branch, string[]> = {
  "LMIT-HS-BARI": ["HS BARI ZONE 1", "HS BARI ZONE 2", "HS BARI ZONE 3"],
  "LMIT-HS-BOLOGNA": ["HS BOLOGNA ZONE 1", "HS BOLOGNA ZONE 2", "HS BOLOGNA ZONE 3"],
  "LMIT-HS-MILAN": [
    "HS MILANO ZONE 1",
    "HS MILANO ZONE 2",
    "HS MILANO ZONE 3",
    "HS MILANO ZONE 4",
  ],
  "LMIT-HS-NAPLES": [
    "HS NAPOLI ZONE 1",
    "HS NAPOLI ZONE 2",
    "HS NAPOLI ZONE 3",
    "HS NAPOLI ZONE 4",
    "HS NAPOLI ZONE 5",
    "HS NAPOLI ZONE 6",
    "HS NAPOLI ZONE 7",
  ],
  "LMIT-HS-PADOVA": ["HS PADOVA ZONE 1", "HS PADOVA ZONE 2"],
  "LMIT-HS-PALERMO": ["HS PALERMO ZONE 1", "HS PALERMO ZONE 2", "HS PALERMO ZONE 3"],
  "LMIT-HS-ROME": [
    "HS ROMA ZONE 1",
    "HS ROMA ZONE 2",
    "HS ROMA ZONE 3",
    "HS ROMA ZONE 4",
    "HS ROMA ZONE 5",
  ],
  "LMIT-HS-TORINO": ["HS TORINOO ZONE 1", "HS TORINOO ZONE 2", "HS TORINOO ZONE 3"],
}

export const ALL_ZONES: string[] = Object.values(ZONES_BY_BRANCH).flat()

export const ROLES = ["ADMIN", "RSM", "ASM", "FSE"] as const
export type Role = (typeof ROLES)[number]
