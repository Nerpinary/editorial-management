<template>
  <div class="px-0 py-0">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Аналитика</h1>
      <p class="mt-2 text-gray-600">
        Детальный анализ распределения нагрузки
      </p>
    </div>

    <!-- Общая статистика -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="card">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <BuildingOfficeIcon class="h-8 w-8 text-primary-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Всего редакций</p>
            <p class="text-2xl font-semibold text-gray-900">{{ assignmentsStore.analytics.length }}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <CheckCircleIcon class="h-8 w-8 text-green-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Покрытые редакции</p>
            <p class="text-2xl font-semibold text-gray-900">{{ coveredDepartments }}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <ExclamationTriangleIcon class="h-8 w-8 text-yellow-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Недопокрытые</p>
            <p class="text-2xl font-semibold text-gray-900">{{ undercoveredDepartments }}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <ChartBarIcon class="h-8 w-8 text-purple-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Среднее покрытие</p>
            <p class="text-2xl font-semibold text-gray-900">{{ averageCoverage }}%</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Таблица аналитики по редакциям -->
    <div class="card mb-8">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Анализ по редакциям</h3>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Редакция
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Статей/месяц
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Сотрудников
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Общая емкость
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Покрытие
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Статус
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="department in assignmentsStore.analytics" :key="department.department_name">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ department.department_name }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ department.monthly_articles }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ department.assigned_employees }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ getDepartmentTotalCapacity(department) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                    <div 
                      class="h-2 rounded-full transition-all duration-300"
                      :class="getCoverageBarColor(department.coverage_percentage)"
                      :style="{ width: `${Math.min(department.coverage_percentage, 100)}%` }"
                    ></div>
                  </div>
                  <span class="text-sm font-medium" :class="getCoverageColor(department.coverage_percentage)">
                    {{ department.coverage_percentage }}%
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getStatusBadgeClass(department.coverage_percentage)">
                  {{ getStatusLabel(department.coverage_percentage) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Анализ по сотрудникам -->
    <div class="card mb-8">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Анализ по сотрудникам</h3>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Сотрудник
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Категория
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Емкость
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Текущая нагрузка
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Редакции
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Статус
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="employee in employeesWithWorkload" :key="employee.id">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ employee.name }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getCategoryBadgeClass(employee.category)">
                  {{ getCategoryLabel(employee.category) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ Math.round(employee.capacity * 100) }}%
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                    <div 
                      class="h-2 rounded-full transition-all duration-300"
                      :class="getWorkloadBarColor(employee)"
                      :style="{ width: `${Math.min(employee.overloadPercentage, 100)}%` }"
                    ></div>
                  </div>
                  <span class="text-sm font-medium" :class="getWorkloadColor(employee)">
                    {{ employee.overloadPercentage }}%
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ employee.assignments.length }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getEmployeeStatusBadgeClass(employee)">
                  {{ getEmployeeStatusLabel(employee) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Рекомендации -->
    <div class="card">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Рекомендации</h3>
      <div class="space-y-4">
        <!-- Рекомендации по недопокрытым редакциям -->
        <div v-if="undercoveredDepartments > 0" class="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div class="flex">
            <ExclamationTriangleIcon class="h-5 w-5 text-red-400 mt-0.5 mr-3" />
            <div>
              <h4 class="text-sm font-medium text-red-800">Недопокрытые редакции</h4>
              <p class="text-sm text-red-700 mt-1">
                {{ undercoveredDepartments }} редакций имеют покрытие менее 80%. 
                Рассмотрите возможность назначения дополнительных сотрудников.
              </p>
            </div>
          </div>
        </div>

        <!-- Рекомендации по перегруженным сотрудникам -->
        <div v-if="overloadedEmployeesCount > 0" class="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div class="flex">
            <ExclamationTriangleIcon class="h-5 w-5 text-orange-400 mt-0.5 mr-3" />
            <div>
              <h4 class="text-sm font-medium text-orange-800">Перегруженные сотрудники</h4>
              <p class="text-sm text-orange-700 mt-1">
                {{ overloadedEmployeesCount }} сотрудников превышают свою емкость. 
                Рассмотрите перераспределение нагрузки.
              </p>
            </div>
          </div>
        </div>

        <!-- Рекомендации по недогруженным сотрудникам -->
        <div v-if="underloadedEmployeesCount > 0" class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div class="flex">
            <InformationCircleIcon class="h-5 w-5 text-blue-400 mt-0.5 mr-3" />
            <div>
              <h4 class="text-sm font-medium text-blue-800">Недогруженные сотрудники</h4>
              <p class="text-sm text-blue-700 mt-1">
                {{ underloadedEmployeesCount }} сотрудников загружены менее чем на 80%. 
                Возможна дополнительная нагрузка.
              </p>
            </div>
          </div>
        </div>

        <!-- Положительные рекомендации -->
        <div v-if="undercoveredDepartments === 0 && overloadedEmployeesCount === 0" class="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div class="flex">
            <CheckCircleIcon class="h-5 w-5 text-green-400 mt-0.5 mr-3" />
            <div>
              <h4 class="text-sm font-medium text-green-800">Отличное распределение</h4>
              <p class="text-sm text-green-700 mt-1">
                Все редакции имеют достаточное покрытие, и нет перегруженных сотрудников. 
                Текущее распределение нагрузки оптимально.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useDepartmentsStore } from '../stores/departments'
import { useEmployeesStore } from '../stores/employees'
import { useAssignmentsStore } from '../stores/assignments'
import { useRolesStore } from '../stores/roles'
import { useRoleBadge } from '../composables/useRoleBadge'
import { 
  BuildingOfficeIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  ChartBarIcon,
  InformationCircleIcon 
} from '@heroicons/vue/24/outline'

const departmentsStore = useDepartmentsStore()
const employeesStore = useEmployeesStore()
const assignmentsStore = useAssignmentsStore()
const rolesStore = useRolesStore()
const { getRoleBadgeClass, getRoleLabel } = useRoleBadge()

const coveredDepartments = computed(() => {
  return assignmentsStore.analytics.filter(dept => dept.coverage_percentage >= 80).length
})

const undercoveredDepartments = computed(() => {
  return assignmentsStore.analytics.filter(dept => dept.coverage_percentage < 80).length
})

const averageCoverage = computed(() => {
  if (assignmentsStore.analytics.length === 0) return 0
  const total = assignmentsStore.analytics.reduce((sum, dept) => sum + dept.coverage_percentage, 0)
  return Math.round(total / assignmentsStore.analytics.length)
})

const employeesWithWorkload = computed(() => {
  return employeesStore.employees.map(employee => ({
    ...employee,
    workload: assignmentsStore.getEmployeeWorkload(employee.id),
    totalArticles: assignmentsStore.getEmployeeTotalArticles(employee.id),
    workloadNorm: assignmentsStore.getEmployeeWorkloadNorm(employee),
    overloadPercentage: assignmentsStore.getEmployeeOverloadPercentage(employee),
    isOverloaded: assignmentsStore.isEmployeeOverloaded(employee),
    assignments: assignmentsStore.getEmployeeAssignments(employee.id)
  })).sort((a, b) => b.overloadPercentage - a.overloadPercentage)
})

const overloadedEmployeesCount = computed(() => {
  return employeesWithWorkload.value.filter(emp => emp.isOverloaded).length
})

const underloadedEmployeesCount = computed(() => {
  return employeesWithWorkload.value.filter(emp => emp.overloadPercentage < 80).length
})

const getDepartmentTotalCapacity = (department) => {
  // Получаем сотрудников в этой редакции и суммируем их capacity
  const departmentAssignments = assignmentsStore.assignments.filter(a => a.department_id === department.department_id)
  const employeeIds = departmentAssignments.map(a => a.employee_id)
  const employees = employeesStore.employees.filter(emp => employeeIds.includes(emp.id))
  const totalCapacity = employees.reduce((sum, emp) => sum + emp.capacity, 0)
  return totalCapacity.toFixed(2)
}

const getCoverageColor = (coverage) => {
  if (coverage >= 100) return 'text-green-600'
  if (coverage >= 80) return 'text-yellow-600'
  return 'text-red-600'
}

const getCoverageBarColor = (coverage) => {
  if (coverage >= 100) return 'bg-green-500'
  if (coverage >= 80) return 'bg-yellow-500'
  return 'bg-red-500'
}

const getStatusBadgeClass = (coverage) => {
  if (coverage >= 100) return 'badge bg-green-100 text-green-800'
  if (coverage >= 80) return 'badge bg-yellow-100 text-yellow-800'
  return 'badge bg-red-100 text-red-800'
}

const getStatusLabel = (coverage) => {
  if (coverage >= 100) return 'Покрыто'
  if (coverage >= 80) return 'Частично'
  return 'Недопокрыто'
}

const getCategoryBadgeClass = (category) => {
  return getRoleBadgeClass(category)
}

const getCategoryLabel = (category) => {
  return getRoleLabel(category)
}

const getWorkloadColor = (employee) => {
  if (employee.overloadPercentage > 100) return 'text-red-600'
  if (employee.overloadPercentage >= 90) return 'text-green-600'
  return 'text-yellow-600'
}

const getWorkloadBarColor = (employee) => {
  if (employee.overloadPercentage > 100) return 'bg-red-500'
  if (employee.overloadPercentage >= 90) return 'bg-green-500'
  return 'bg-yellow-500'
}

const getEmployeeStatusBadgeClass = (employee) => {
  if (employee.overloadPercentage > 100) return 'badge bg-red-100 text-red-800'
  if (employee.overloadPercentage >= 90) return 'badge bg-green-100 text-green-800'
  if (employee.overloadPercentage < 80) return 'badge bg-blue-100 text-blue-800'
  return 'badge bg-yellow-100 text-yellow-800'
}

const getEmployeeStatusLabel = (employee) => {
  if (employee.overloadPercentage > 100) return 'Перегружен'
  if (employee.overloadPercentage >= 90) return 'Оптимально'
  if (employee.overloadPercentage < 80) return 'Недогружен'
  return 'Загружен'
}

onMounted(async () => {
  await Promise.all([
    departmentsStore.fetchDepartments(),
    employeesStore.fetchEmployees(),
    assignmentsStore.fetchAssignments(),
    assignmentsStore.fetchAnalytics(),
    rolesStore.fetchRoles()
  ])
})
</script>
