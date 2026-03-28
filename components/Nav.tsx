'use client'

import Link from 'next/link'

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-display text-3xl text-white tracking-wide">
          <span className="text-cherry">WE</span><span className="text-accent">GO</span>
        </Link>
      </div>
    </nav>
  )
}
