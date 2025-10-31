import { computed } from 'vue'
import { useRolesStore } from '../stores/roles'

export function useRoleBadge() {
  const rolesStore = useRolesStore()

  const getRoleBadgeClass = (category) => {
    const role = rolesStore.getRoleByName(category)
    if (role) {
      return `badge ${role.badge_color_bg} ${role.badge_color_text}`
    }
    return 'badge bg-gray-100 text-gray-800'
  }

  const getRoleLabel = (category) => {
    const role = rolesStore.getRoleByName(category)
    if (role) {
      return role.description || role.name
    }
    return category
  }

  const getRoleCapacity = (category) => {
    const role = rolesStore.getRoleByName(category)
    if (role) {
      return role.capacity
    }
    return 1.0
  }

  return {
    getRoleBadgeClass,
    getRoleLabel,
    getRoleCapacity
  }
}

