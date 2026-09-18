"use client"

import Image from "next/image"
import { BarChart3 } from "lucide-react"
import { useState } from "react"

export function FieldIQIcon() {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-brand-navy text-brand-cyan">
        <BarChart3 className="h-7 w-7" />
      </div>
    )
  }

  return (
    <Image
      src="/field-iq-icon.png"
      alt="Field IQ"
      width={56}
      height={56}
      className="h-full w-full object-cover"
      onError={() => setError(true)}
    />
  )
}
