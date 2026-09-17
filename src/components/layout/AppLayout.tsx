import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppLayout({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <div className="md:pl-[240px]">
        <Topbar titulo={titulo} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
