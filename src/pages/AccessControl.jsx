import { useState, useEffect } from 'react'
import { Loader2, AlertCircle, ShieldCheck, Lock } from 'lucide-react'
import api from '../api/axios'

const toTitleCase = (str) =>
  str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const ALL_MODULES = [
  'dashboard', 'leads', 'projects', 'site_visits', 'revisits', 'closures',
  'follow_ups', 'targets', 'attendance', 'salary', 'team', 'users', 'notifications',
]
const ALL_KEYS = ['view', 'create', 'edit', 'delete', 'approve', 'export']

const normalizePermissions = (raw) => {
  const result = {}
  for (const m of ALL_MODULES) {
    result[m] = {}
    for (const k of ALL_KEYS) {
      result[m][k] = raw?.[m]?.[k] === true
    }
  }
  return result
}

export default function AccessControl() {
  // ── Data (loaded once) ──────────────────────────────────────────────────────
  const [allRoles,       setAllRoles]       = useState([])
  const [modules,        setModules]        = useState([])
  const [permissionKeys, setPermissionKeys] = useState([])
  const [initLoading,    setInitLoading]    = useState(true)
  const [initError,      setInitError]      = useState('')

  // ── Active role state ───────────────────────────────────────────────────────
  const [activeRole,      setActiveRole]      = useState(null)
  const [rolePermissions, setRolePermissions] = useState({})
  const [originalPerms,   setOriginalPerms]   = useState({})

  // ── Save / reset state ──────────────────────────────────────────────────────
  const [saving,    setSaving]    = useState(false)
  const [resetting, setResetting] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [toast,     setToast]     = useState({ show: false, message: '' })

  // ── Derived ─────────────────────────────────────────────────────────────────
  const isDirty       = JSON.stringify(rolePermissions) !== JSON.stringify(originalPerms)
  const activeRoleObj = allRoles.find(r => r.role === activeRole)
  const isSuper       = activeRoleObj?.role === 'super_admin'

  // ── Initial fetch — both endpoints in parallel ──────────────────────────────
  useEffect(() => {
    const load = async () => {
      setInitLoading(true)
      setInitError('')
      try {
        const [rolesRes, modulesRes] = await Promise.all([
          api.get('/config/roles'),
          api.get('/config/modules'),
        ])
        const rolesData   = rolesRes.data.data
        const modulesData = modulesRes.data.data

        const roles = (rolesData.roles || []).map(r => ({ ...r, permissions: normalizePermissions(r.permissions) }))
        setAllRoles(roles)
        setModules((modulesData.modules || []).filter(m => m.key !== 'phone_requests'))
        setPermissionKeys(modulesData.permission_keys || [])

        if (roles.length) {
          setActiveRole(roles[0].role)
          setRolePermissions(roles[0].permissions)
          setOriginalPerms(roles[0].permissions)
        }
      } catch {
        setInitError('Failed to load Access Control. Please refresh the page.')
      } finally {
        setInitLoading(false)
      }
    }
    load()
  }, [])

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const applyRoleFromCache = (roles, roleKey) => {
    const found = roles.find(r => r.role === roleKey)
    if (found) {
      setRolePermissions(found.permissions || {})
      setOriginalPerms(found.permissions   || {})
    }
  }

  const showToast = (message) => {
    setToast({ show: true, message })
    setTimeout(() => setToast({ show: false, message: '' }), 3000)
  }

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleTabClick = (roleKey) => {
    if (roleKey === activeRole) return
    if (isDirty) {
      const ok = window.confirm('You have unsaved changes. Switch role and lose changes?')
      if (!ok) return
    }
    setActiveRole(roleKey)
    setSaveError('')
    applyRoleFromCache(allRoles, roleKey)
  }

  const handleCheckboxChange = (moduleKey, permKey, checked) => {
    setRolePermissions(prev => ({
      ...prev,
      [moduleKey]: { ...prev[moduleKey], [permKey]: checked },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    try {
      const cleanedPermissions = {}
      for (const m of ALL_MODULES) {
        if (rolePermissions[m]) cleanedPermissions[m] = rolePermissions[m]
      }
      await api.put(`/config/roles/${activeRole}`, { permissions: cleanedPermissions })
      // Update cache so switching tabs doesn't revert
      setAllRoles(prev => prev.map(r =>
        r.role === activeRole ? { ...r, permissions: cleanedPermissions } : r
      ))
      setOriginalPerms(cleanedPermissions)
      showToast(`Permissions saved for ${activeRoleObj?.display_name || toTitleCase(activeRole)}`)
    } catch (e) {
      setSaveError(e.response?.data?.message || 'Failed to save permissions. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    const displayName = activeRoleObj?.display_name || toTitleCase(activeRole)
    const ok = window.confirm(
      `Remove all access for ${displayName}? This cannot be undone.`
    )
    if (!ok) return
    setResetting(true)
    setSaveError('')
    try {
      await api.post(`/config/roles/${activeRole}/reset`)
      // Re-fetch so we get the server's actual state after reset
      const rolesRes  = await api.get('/config/roles')
      const freshRoles = (rolesRes.data.data?.roles || []).map(r => ({ ...r, permissions: normalizePermissions(r.permissions) }))
      setAllRoles(freshRoles)
      applyRoleFromCache(freshRoles, activeRole)
    } catch (e) {
      setSaveError(e.response?.data?.message || 'Failed to reset permissions.')
    } finally {
      setResetting(false)
    }
  }

  // ── Full-page states ────────────────────────────────────────────────────────
  if (initLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="animate-spin text-brand" />
      </div>
    )
  }

  if (initError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle size={18} />
          <p className="text-sm font-medium">{initError}</p>
        </div>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">

      {/* Success toast */}
      {toast.show && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg">
          <ShieldCheck size={15} />
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ShieldCheck size={20} className="text-brand" />
          Access Control
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Configure what each role can access. Changes take effect immediately.
        </p>
      </div>

      {/* Main card */}
      <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden flex flex-col">

        {/* Role tabs */}
        <div className="border-b border-gray-200 dark:border-gray-800 overflow-x-auto scrollbar-hide">
          <div className="flex min-w-max px-4 pt-3">
            {allRoles.map((roleObj) => {
              const isActive    = activeRole === roleObj.role
              const isSupAdmin  = roleObj.role === 'super_admin'
              return (
                <button
                  key={roleObj.role}
                  onClick={() => handleTabClick(roleObj.role)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all whitespace-nowrap
                    ${isActive
                      ? isSupAdmin
                        ? 'border-purple-500 text-purple-600 dark:text-purple-400 font-bold'
                        : 'border-[#0082f3] text-[#0082f3] font-bold'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40 rounded-t-lg'
                    }`}
                >
                  {isSupAdmin && (
                    <Lock
                      size={10}
                      className={isActive ? 'text-purple-500' : 'text-gray-400'}
                    />
                  )}
                  {roleObj.display_name}
                  {isSupAdmin && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">
                      Full
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Super Admin info banner */}
        {isSuper && (
          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800/40 px-4 py-2.5">
            <ShieldCheck size={14} className="text-[#0082f3] flex-shrink-0" />
            <p className="text-xs font-medium text-[#0082f3]">
              Super Admin has full access to all modules and cannot be restricted.
            </p>
          </div>
        )}

        {/* Unsaved changes banner */}
        {isDirty && !isSuper && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800/40 px-4 py-2.5">
            <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              You have unsaved changes — click Save to apply
            </p>
            <button
              onClick={handleSave}
              disabled={saving}
              className="ml-auto text-xs font-semibold text-[#0082f3] hover:underline disabled:opacity-50"
            >
              Save now
            </button>
          </div>
        )}

        {/* Permission table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#0f0f0f] border-b border-gray-200 dark:border-gray-800">
                <th className="py-3 px-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider w-56">
                  Module
                </th>
                {permissionKeys.map((key) => (
                  <th
                    key={key}
                    className="py-3 px-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                  >
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {modules.map((mod, idx) => {
                const modPerms = rolePermissions[mod.key] || {}
                return (
                  <tr
                    key={mod.key}
                    className={
                      idx % 2 === 0
                        ? 'bg-white dark:bg-transparent'
                        : 'bg-gray-50/60 dark:bg-[#0f0f0f]/40'
                    }
                  >
                    <td className="py-3 px-4 font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                      {mod.display_name}
                    </td>
                    {permissionKeys.map((permKey) => {
                      const supported = mod.supports.includes(permKey)
                      return (
                        <td key={permKey} className="py-3 px-4 text-center">
                          {supported ? (
                            <input
                              type="checkbox"
                              checked={isSuper ? true : (modPerms[permKey] === true)}
                              disabled={isSuper}
                              onChange={(e) =>
                                handleCheckboxChange(mod.key, permKey, e.target.checked)
                              }
                              className="w-4 h-4 accent-brand cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                            />
                          ) : (
                            <span className="text-gray-300 dark:text-gray-700 select-none">
                              —
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Sticky footer — hidden for Super Admin */}
        {!isSuper && (
          <div className="sticky bottom-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] px-4 py-3">
            {saveError && (
              <div className="flex items-center gap-1.5 text-xs text-red-500 mb-2">
                <AlertCircle size={12} className="flex-shrink-0" />
                {saveError}
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={handleReset}
                disabled={resetting}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-500 border border-red-200 dark:border-red-900/40 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
              >
                {resetting && <Loader2 size={12} className="animate-spin" />}
                Reset to no access
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !isDirty}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0082f3] rounded-xl hover:bg-[#0070d4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 size={12} className="animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
