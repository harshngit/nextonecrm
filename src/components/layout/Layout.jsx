import { useState } from 'react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f5f2ee] dark:bg-[#0f0f0f]">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <Navbar
        collapsed={collapsed}
        setMobileOpen={setMobileOpen}
      />
      <main
        className={`pt-14 min-h-screen transition-all duration-300 ${collapsed ? 'lg:ml-[60px]' : 'lg:ml-[240px]'}`}
      >
        <div className="p-4 lg:p-6 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
