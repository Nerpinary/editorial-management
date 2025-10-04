<template>
  <div class="px-0 py-0">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Дашборд</h1>
      <p class="mt-2 text-gray-600">
        Обзор распределения нагрузки по редакциям
      </p>
    </div>

    <!-- Статистические карточки -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="card">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <BuildingOfficeIcon class="h-8 w-8 text-primary-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Всего редакций</p>
            <p class="text-2xl font-semibold text-gray-900">{{ departmentsStore.departments.length }}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <UsersIcon class="h-8 w-8 text-green-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Всего сотрудников</p>
            <p class="text-2xl font-semibold text-gray-900">{{ employeesStore.employees.length }}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <DocumentTextIcon class="h-8 w-8 text-blue-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Статей в месяц</p>
            <p class="text-2xl font-semibold text-gray-900">{{ totalArticles }}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <ChartBarIcon class="h-8 w-8 text-purple-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Средняя нагрузка</p>
            <p class="text-2xl font-semibold text-gray-900">{{ averageWorkload }}%</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Нормы нагрузки -->
    <div v-if="assignmentsStore.workloadNorms" class="mb-8">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">Нормы нагрузки</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="card">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Норма на сотрудника</p>
              <p class="text-2xl font-semibold text-gray-900">{{ assignmentsStore.workloadNorms.norm_per_employee }} статей</p>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-8 w-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Перегруженные</p>
              <p class="text-2xl font-semibold text-red-600">{{ overloadedEmployeesCount }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Быстрые действия -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Редакции с низкой нагрузкой -->
      <div class="card">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Редакции с низкой нагрузкой</h3>
        <div class="space-y-3">
          <div 
            v-for="dept in underloadedDepartments" 
            :key="dept.department_name"
            class="flex items-center justify-between p-3 bg-red-50 rounded-lg"
          >
            <div>
              <p class="font-medium text-gray-900">{{ dept.department_name }}</p>
              <p class="text-sm text-gray-500">{{ dept.monthly_articles }} статей/месяц</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-medium text-red-600">{{ dept.coverage_percentage }}% покрытие</p>
              <p class="text-xs text-gray-500">{{ dept.assigned_employees }} сотрудников</p>
            </div>
          </div>
          <p v-if="underloadedDepartments.length === 0" class="text-gray-500 text-sm">
            Все редакции имеют достаточную нагрузку
          </p>
        </div>
      </div>

      <!-- Сотрудники с высокой нагрузкой -->
      <div class="card">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Перегруженные сотрудники</h3>
        <div class="space-y-3">
          <div 
            v-for="employee in overloadedEmployees" 
            :key="employee.id"
            class="flex items-center justify-between p-3 bg-orange-50 rounded-lg"
          >
            <div>
              <p class="font-medium text-gray-900">{{ employee.name }}</p>
              <span :class="getCategoryBadgeClass(employee.category)">
                {{ getCategoryLabel(employee.category) }}
              </span>
            </div>
            <div class="text-right">
              <p class="text-sm font-medium text-orange-600">{{ employee.overloadPercentage }}% от нормы</p>
              <p class="text-xs text-gray-500">{{ employee.totalArticles }} из {{ employee.workloadNorm }} статей</p>
            </div>
          </div>
          <p v-if="overloadedEmployees.length === 0" class="text-gray-500 text-sm">
            Нет перегруженных сотрудников
          </p>
        </div>
      </div>
    </div>

    <!-- Быстрые ссылки -->
    <div class="mt-8">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Быстрые действия</h3>
      <div class="flex flex-wrap gap-4">
        <router-link to="/departments" class="btn-primary inline-flex items-center">
          <BuildingOfficeIcon class="w-4 h-4 mr-2" />
          Управление редакциями
        </router-link>
        <router-link to="/employees" class="btn-secondary inline-flex items-center">
          <UsersIcon class="w-4 h-4 mr-2" />
          Управление сотрудниками
        </router-link>
        <router-link to="/analytics" class="btn-secondary inline-flex items-center">
          <ChartBarIcon class="w-4 h-4 mr-2" />
          Подробная аналитика
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useDepartmentsStore } from '../stores/departments'
import { useEmployeesStore } from '../stores/employees'
import { useAssignmentsStore } from '../stores/assignments'
import { 
  BuildingOfficeIcon, 
  UsersIcon, 
  DocumentTextIcon, 
  ChartBarIcon 
} from '@heroicons/vue/24/outline'

const departmentsStore = useDepartmentsStore()
const employeesStore = useEmployeesStore()
const assignmentsStore = useAssignmentsStore()

const totalArticles = computed(() => {
  return departmentsStore.departments.reduce((sum, dept) => sum + dept.monthly_articles, 0)
})

const averageWorkload = computed(() => {
  if (employeesStore.employees.length === 0) return 0
  const totalWorkload = employeesStore.employees.reduce((sum, emp) => {
    const workload = assignmentsStore.getEmployeeWorkload(emp.id)
    return sum + workload
  }, 0)
  return Math.round(totalWorkload / employeesStore.employees.length)
})

const underloadedDepartments = computed(() => {
  return assignmentsStore.analytics.filter(dept => dept.coverage_percentage < 80)
})

const overloadedEmployees = computed(() => {
  return employeesStore.employees.map(emp => ({
    ...emp,
    workload: assignmentsStore.getEmployeeWorkload(emp.id),
    totalArticles: assignmentsStore.getEmployeeTotalArticles(emp.id),
    workloadNorm: assignmentsStore.getEmployeeWorkloadNorm(emp),
    overloadPercentage: assignmentsStore.getEmployeeOverloadPercentage(emp),
    isOverloaded: assignmentsStore.isEmployeeOverloaded(emp)
  })).filter(emp => emp.isOverloaded)
})

const overloadedEmployeesCount = computed(() => {
  return overloadedEmployees.value.length
})

const getCategoryBadgeClass = (category) => {
  switch (category) {
    case 'СМВ': return 'badge badge-СМВ'
    case 'МВ': return 'badge badge-МВ'
    case 'ММВ': return 'badge badge-ММВ'
    default: return 'badge bg-gray-100 text-gray-800'
  }
}

const getCategoryLabel = (category) => {
  switch (category) {
    case 'СМВ': return 'Старший менеджер выпуска'
    case 'МВ': return 'Менеджер выпуска'
    case 'ММВ': return 'Младший менеджер выпуска'
    default: return category
  }
}

onMounted(async () => {
  await Promise.all([
    departmentsStore.fetchDepartments(),
    employeesStore.fetchEmployees(),
    assignmentsStore.fetchAssignments(),
    assignmentsStore.fetchAnalytics()
  ])
})
</script>
