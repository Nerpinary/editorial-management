<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Умный помощник</h1>
        <p class="mt-1 text-sm text-gray-500">
          Автоматические рекомендации по распределению сотрудников по редакциям
        </p>
      </div>
      <button 
        @click="generateRecommendations"
        class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        :disabled="isGenerating"
      >
        <SparklesIcon class="w-4 h-4 mr-2" />
        {{ isGenerating ? 'Генерирую...' : 'Сгенерировать рекомендации' }}
      </button>
    </div>

    <!-- Algorithm Info -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 class="text-sm font-medium text-blue-900 mb-2">Алгоритм рекомендаций:</h3>
      <ul class="text-sm text-blue-800 space-y-1">
        <li>• Учитывает предпочтения сотрудников (предпочтительные редакции)</li>
        <li>• Балансирует нагрузку по коэффициентам грейдов (СМВ: 0.8, МВ: 1.0, ММВ: 1.3)</li>
        <li>• Обеспечивает наличие СМВ для проверки ММВ</li>
        <li>• Стремится к равномерному распределению по редакциям</li>
      </ul>
    </div>

    <!-- Current State -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Текущее состояние</h3>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">Всего редакций:</span>
            <span class="text-sm font-medium">{{ departmentsStore.departments.length }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">Всего сотрудников:</span>
            <span class="text-sm font-medium">{{ employeesStore.employees.length }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">Назначений:</span>
            <span class="text-sm font-medium">{{ assignmentsStore.assignments.length }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">Свободных сотрудников:</span>
            <span class="text-sm font-medium">{{ unassignedEmployees.length }}</span>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Покрытие редакций</h3>
        <div class="space-y-3">
          <div 
            v-for="department in departmentsStore.departments.slice(0, 5)" 
            :key="department.id"
            class="flex justify-between items-center"
          >
            <span class="text-sm text-gray-500 truncate">{{ department.name }}</span>
            <div class="flex items-center">
              <div class="w-16 bg-gray-200 rounded-full h-2 mr-2">
                <div 
                  class="bg-blue-600 h-2 rounded-full" 
                  :style="{ width: `${Math.min(getDepartmentCoverage(department.id), 100)}%` }"
                ></div>
              </div>
              <span class="text-xs text-gray-500">{{ Math.round(getDepartmentCoverage(department.id)) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Грейды сотрудников</h3>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">СМВ (старшие):</span>
            <span class="text-sm font-medium">{{ getEmployeesByGrade('СМВ').length }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">МВ (менеджеры):</span>
            <span class="text-sm font-medium">{{ getEmployeesByGrade('МВ').length }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">ММВ (младшие):</span>
            <span class="text-sm font-medium">{{ getEmployeesByGrade('ММВ').length }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Recommendations -->
    <div v-if="recommendations.length > 0" class="bg-white rounded-lg shadow">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-medium text-gray-900">Рекомендации по распределению</h2>
        <p class="text-sm text-gray-500 mt-1">
          Кликните на рекомендацию, чтобы применить её к редакции
        </p>
      </div>
      
      <div class="divide-y divide-gray-200">
        <div 
          v-for="rec in recommendations" 
          :key="rec.departmentId"
          class="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
          @click="applyRecommendation(rec)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center mb-3">
                <h3 class="text-lg font-medium text-gray-900">{{ getDepartmentName(rec.departmentId) }}</h3>
                <span class="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {{ rec.score }}% соответствие
                </span>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <!-- Recommended Assignments -->
                <div class="space-y-2">
                  <h4 class="text-sm font-medium text-gray-700">Рекомендуемые назначения:</h4>
                  <div class="space-y-1">
                    <div 
                      v-for="assignment in rec.assignments" 
                      :key="assignment.employeeId"
                      class="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <span class="text-sm text-gray-900">{{ getEmployeeName(assignment.employeeId) }}</span>
                      <div class="flex items-center space-x-2">
                        <span :class="getCategoryBadgeClass(getEmployeeCategory(assignment.employeeId))">
                          {{ getEmployeeCategory(assignment.employeeId) }}
                        </span>
                        <span class="text-xs text-gray-500">{{ assignment.workload }}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Reasoning -->
                <div class="space-y-2">
                  <h4 class="text-sm font-medium text-gray-700">Обоснование:</h4>
                  <ul class="text-sm text-gray-600 space-y-1">
                    <li v-for="reason in rec.reasons" :key="reason" class="flex items-start">
                      <span class="text-green-500 mr-2">•</span>
                      {{ reason }}
                    </li>
                  </ul>
                </div>

                <!-- Impact -->
                <div class="space-y-2">
                  <h4 class="text-sm font-medium text-gray-700">Результат:</h4>
                  <div class="text-sm text-gray-600 space-y-1">
                    <div>Верстка: {{ rec.totalTypeset }} статей</div>
                    <div>Самопроверка: {{ rec.totalSelfCheck }} статей</div>
                    <div>Проверка ММВ: {{ rec.totalCheckMmv }} статей</div>
                    <div class="pt-1 border-t">
                      <span class="font-medium">Покрытие: {{ Math.round(rec.coverage) }}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <button 
              @click.stop="applyRecommendation(rec)"
              class="ml-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
            >
              Применить
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- No Recommendations -->
    <div v-else-if="!isGenerating" class="text-center py-12">
      <SparklesIcon class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">Нет рекомендаций</h3>
      <p class="mt-1 text-sm text-gray-500">
        Нажмите кнопку выше, чтобы сгенерировать рекомендации по распределению
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDepartmentsStore } from '../stores/departments'
import { useEmployeesStore } from '../stores/employees'
import { useAssignmentsStore } from '../stores/assignments'
import { useRolesStore } from '../stores/roles'
import { useRoleBadge } from '../composables/useRoleBadge'
import { SparklesIcon } from '@heroicons/vue/24/outline'

const departmentsStore = useDepartmentsStore()
const employeesStore = useEmployeesStore()
const assignmentsStore = useAssignmentsStore()
const rolesStore = useRolesStore()

const recommendations = ref([])
const isGenerating = ref(false)

// Computed properties
const unassignedEmployees = computed(() => {
  const assignedEmployeeIds = new Set(assignmentsStore.assignments.map(a => a.employee_id))
  return employeesStore.employees.filter(emp => !assignedEmployeeIds.has(emp.id))
})

// Helper functions
const getEmployeesByGrade = (grade) => {
  return employeesStore.employees.filter(emp => emp.category === grade)
}

const getDepartmentCoverage = (departmentId) => {
  const assignments = assignmentsStore.assignments.filter(a => a.department_id === departmentId)
  const totalWorkload = assignments.reduce((sum, a) => sum + a.workload_percentage, 0)
  return totalWorkload
}

const getDepartmentName = (departmentId) => {
  const department = departmentsStore.departments.find(d => d.id === departmentId)
  return department ? department.name : 'Неизвестная редакция'
}

const getEmployeeName = (employeeId) => {
  const employee = employeesStore.employees.find(e => e.id === employeeId)
  return employee ? employee.name : 'Неизвестный сотрудник'
}

const getEmployeeCategory = (employeeId) => {
  const employee = employeesStore.employees.find(e => e.id === employeeId)
  return employee ? employee.category : 'Неизвестный'
}

const { getRoleBadgeClass } = useRoleBadge()

const getCategoryBadgeClass = (category) => {
  return `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(category).replace('badge ', '')}`
}

// Algorithm for generating recommendations
const generateRecommendations = async () => {
  isGenerating.value = true
  recommendations.value = []
  
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const newRecommendations = []
    
    // For each department, try to find optimal assignments
    for (const department of departmentsStore.departments) {
      const currentAssignments = assignmentsStore.assignments.filter(a => a.department_id === department.id)
      const currentEmployeeIds = currentAssignments.map(a => a.employee_id)
      
      // Check current coverage for reference
      const currentCoverage = currentAssignments.reduce((sum, a) => sum + a.workload_percentage, 0)
      // Show recommendations for all departments, regardless of current coverage
      
      // Find best unassigned employees for this department
      const availableEmployees = unassignedEmployees.value.filter(emp => 
        !currentEmployeeIds.includes(emp.id)
      )
      
      if (availableEmployees.length === 0) continue
      
      // Score employees based on preferences and balance
      const scoredEmployees = availableEmployees.map(emp => {
        let score = 50 // Base score
        
        // Preference bonus
        if (emp.preferred_departments && emp.preferred_departments.includes(department.name)) {
          score += 30
        }
        
        // Special logic for very small departments (1-2 articles)
        if (department.monthly_articles <= 2) {
          if (emp.category === 'МВ') {
            score += 50 // МВ ideal for small departments (can work independently)
          } else if (emp.category === 'СМВ') {
            score += 40 // СМВ good alternative for small departments
          } else if (emp.category === 'ММВ') {
            score -= 20 // ММВ not ideal for very small departments (needs supervision)
          }
        } else {
          // Regular logic for larger departments
          const existingGrades = currentAssignments.map(a => {
            const emp = employeesStore.employees.find(e => e.id === a.employee_id)
            return emp ? emp.category : null
          }).filter(Boolean)
          
          // Prefer СМВ if there are ММВ without СМВ
          if (emp.category === 'СМВ' && existingGrades.includes('ММВ') && !existingGrades.includes('СМВ')) {
            score += 40
          }
          
          // Prefer ММВ if there's СМВ but no ММВ
          if (emp.category === 'ММВ' && existingGrades.includes('СМВ') && !existingGrades.includes('ММВ')) {
            score += 20
          }
          
          // Prefer МВ for balance
          if (emp.category === 'МВ' && !existingGrades.includes('МВ')) {
            score += 15
          }
        }
        
        return { employee: emp, score }
      })
      
      // Sort by score and take top candidates based on department size
      scoredEmployees.sort((a, b) => b.score - a.score)
      
      // Calculate optimal number of employees based on monthly articles
      let maxEmployees;
      
      if (department.monthly_articles <= 2) {
        maxEmployees = 1; // Very small departments: 1 employee (МВ или СМВ)
      } else if (department.monthly_articles <= 10) {
        maxEmployees = 1; // Small departments: 1 employee
      } else if (department.monthly_articles <= 50) {
        maxEmployees = 2; // Medium departments: 1-2 employees
      } else if (department.monthly_articles <= 100) {
        maxEmployees = 3; // Large departments: 2-3 employees
      } else if (department.monthly_articles <= 200) {
        maxEmployees = 4; // Very large departments: 3-4 employees
      } else {
        maxEmployees = 6; // Huge departments: 4-6 employees
      }
      
      // Don't recommend if already well staffed
      if (currentAssignments.length >= maxEmployees) continue
      
      const selectedEmployees = scoredEmployees.slice(0, Math.min(maxEmployees - currentAssignments.length, scoredEmployees.length))
      
      if (selectedEmployees.length === 0) continue
      
      // Calculate workload distribution
      const allEmployees = [...currentAssignments.map(a => {
        const emp = employeesStore.employees.find(e => e.id === a.employee_id)
        return emp
      }).filter(Boolean), ...selectedEmployees.map(s => s.employee)]
      
      const totalCapacity = allEmployees.reduce((sum, emp) => sum + emp.capacity, 0)
      const newAssignments = selectedEmployees.map(({ employee }) => {
        const workload = Math.round((employee.capacity / totalCapacity) * 100)
        return {
          employeeId: employee.id,
          workload: Math.min(workload, 100)
        }
      })
      
      // Calculate coverage and impact
      const totalNewWorkload = newAssignments.reduce((sum, a) => sum + a.workload, 0)
      const newCoverage = currentCoverage + totalNewWorkload
      
      // Calculate work distribution
      const mmvEmployees = allEmployees.filter(emp => emp.category === 'ММВ')
      const totalMmvArticles = mmvEmployees.reduce((sum, emp) => {
        const assignment = newAssignments.find(a => a.employeeId === emp.id) || 
                          currentAssignments.find(a => a.employee_id === emp.id)
        const workload = assignment ? assignment.workload || assignment.workload_percentage : 0
        return sum + Math.round((workload / 100) * department.monthly_articles * emp.capacity)
      }, 0)
      
      const smvEmployees = allEmployees.filter(emp => emp.category === 'СМВ')
      const totalSelfCheck = smvEmployees.reduce((sum, emp) => {
        const assignment = newAssignments.find(a => a.employeeId === emp.id) || 
                          currentAssignments.find(a => a.employee_id === emp.id)
        const workload = assignment ? assignment.workload || assignment.workload_percentage : 0
        return sum + Math.round((workload / 100) * department.monthly_articles * emp.capacity)
      }, 0)
      
      const mvEmployees = allEmployees.filter(emp => emp.category === 'МВ')
      const mvSelfCheck = mvEmployees.reduce((sum, emp) => {
        const assignment = newAssignments.find(a => a.employeeId === emp.id) || 
                          currentAssignments.find(a => a.employee_id === emp.id)
        const workload = assignment ? assignment.workload || assignment.workload_percentage : 0
        return sum + Math.round((workload / 100) * department.monthly_articles * emp.capacity)
      }, 0)
      
      // Generate reasons
      const reasons = []
      const existingGrades = currentAssignments.map(a => {
        const emp = employeesStore.employees.find(e => e.id === a.employee_id)
        return emp ? emp.category : null
      }).filter(Boolean)
      
      selectedEmployees.forEach(({ employee, score }) => {
        if (employee.preferred_departments && employee.preferred_departments.includes(department.name)) {
          reasons.push(`${employee.name} имеет опыт в редакции "${department.name}"`)
        }
        if (employee.category === 'СМВ' && existingGrades.includes('ММВ')) {
          reasons.push(`${employee.name} (СМВ) нужен для проверки ММВ`)
        }
        if (employee.category === 'ММВ' && existingGrades.includes('СМВ')) {
          reasons.push(`${employee.name} (ММВ) может работать под контролем СМВ`)
        }
        if (employee.category === 'МВ') {
          reasons.push(`${employee.name} (МВ) обеспечивает баланс в команде`)
        }
      })
      
      newRecommendations.push({
        departmentId: department.id,
        assignments: newAssignments,
        score: Math.round(selectedEmployees.reduce((sum, s) => sum + s.score, 0) / selectedEmployees.length),
        reasons,
        coverage: newCoverage,
        totalTypeset: totalMmvArticles,
        totalSelfCheck: totalSelfCheck + mvSelfCheck,
        totalCheckMmv: totalMmvArticles
      })
    }
    
    // Sort by priority: larger departments with better scores first
    newRecommendations.sort((a, b) => {
      const aDepartment = departmentsStore.departments.find(d => d.id === a.departmentId)
      const bDepartment = departmentsStore.departments.find(d => d.id === b.departmentId)
      
      // Priority based on department size and score
      const aPriority = (aDepartment?.monthly_articles || 0) * 0.3 + a.score * 0.7
      const bPriority = (bDepartment?.monthly_articles || 0) * 0.3 + b.score * 0.7
      
      return bPriority - aPriority
    })
    
    recommendations.value = newRecommendations // Show all recommendations
    
  } finally {
    isGenerating.value = false
  }
}

const applyRecommendation = async (recommendation) => {
  try {
    for (const assignment of recommendation.assignments) {
      await assignmentsStore.createAssignment({
        employee_id: assignment.employeeId,
        department_id: recommendation.departmentId
      })
    }
    
    // Remove applied recommendation
    recommendations.value = recommendations.value.filter(r => r.departmentId !== recommendation.departmentId)
    
  } catch (error) {
    console.error('Ошибка при применении рекомендации:', error)
  }
}

onMounted(async () => {
  await Promise.all([
    departmentsStore.fetchDepartments(),
    employeesStore.fetchEmployees(),
    assignmentsStore.fetchAssignments(),
    rolesStore.fetchRoles()
  ])
})
</script>
