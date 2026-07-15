import { useState } from 'react'
import Sidebar from './Sidebar'
import Navbar  from './Navbar'
import { useSocket } from '../../hooks/useSocket'

export default function Layout({ children }) {
  const [collapsed,  setCollapsed]  = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Connect WebSocket when authenticated, disconnect on logout
  const { connected } = useSocket()

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <Navbar
        collapsed={collapsed}
        setMobileOpen={setMobileOpen}
        wsConnected={connected}
      />
      <main className={`pt-14 min-h-screen transition-all duration-300 flex flex-col ${collapsed ? 'lg:ml-[60px]' : 'lg:ml-[240px]'}`}>
        <div className="p-4 lg:p-6 animate-fade-in flex-1">
          {children}
        </div>
        <footer className="p-4 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800 transition-all duration-300">
          Developed by{' '}
          <a 
            href="https://www.asynk.in/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            Asynk
          </a>
        </footer>
      </main>
    </div>
  )
}