import type { Metadata } from 'next'
import { Bebas_Neue, Manrope } from 'next/font/google'
import './globals.css'

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
})

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-body',
})

export const metadata: Metadata = {
  title: 'WEGO — Трудоустройство в Европе',
  description: 'Быстрое трудоустройство в Польше и Германии. Заполните анкету и получите предложения.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className={`${bebasNeue.variable} ${manrope.variable} overflow-x-hidden`}>
        {children}
      </body>
    </html>
  )
}
