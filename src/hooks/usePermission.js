import { useSelector } from 'react-redux'
import { selectPermissions } from '../store/permissionsSlice'

const DEFAULT_MODULE = {
  view: false,
  create: false,
  edit: false,
  delete: false,
  approve: false,
  export: false,
}

export function usePermission(module, action) {
  const permissions = useSelector(selectPermissions)
  return permissions[module]?.[action] === true
}

export function useModulePermissions(module) {
  const permissions = useSelector(selectPermissions)
  return permissions[module] ?? { ...DEFAULT_MODULE }
}
