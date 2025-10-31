<template>
  <div class="px-0 py-0">
    <div class="mb-8 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Сотрудники</h1>
        <p class="mt-2 text-gray-600">
          Управление сотрудниками и их категориями
        </p>
      </div>
      <button @click="showCreateModal = true" class="btn-primary inline-flex items-center">
        <PlusIcon class="w-4 h-4 mr-2" />
        Добавить сотрудника
      </button>
    </div>

    <!-- Фильтры -->
    <div class="card mb-6">
      <div class="flex flex-wrap gap-4">
        <div class="flex-1 min-w-64">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Поиск по имени или email..."
            class="input-field"
          />
        </div>
        <select v-model="categoryFilter" class="input-field w-48">
          <option value="">Все категории</option>
          <option 
            v-for="role in rolesStore.roles" 
            :key="role.id" 
            :value="role.name"
          >
            {{ role.name }}
          </option>
        </select>
        <select v-model="workloadFilter" class="input-field w-48">
          <option value="">Все</option>
          <option value="underloaded">Недогруженные</option>
          <option value="overloaded">Перегруженные</option>
        </select>
      </div>
    </div>

    <!-- Список сотрудников -->
    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      <div 
        v-for="employee in filteredEmployees" 
        :key="employee.id"
        class="card hover:shadow-md transition-shadow duration-200"
      >
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">{{ employee.name }}</h3>
            <p class="text-sm text-gray-500">{{ employee.email }}</p>
          </div>
          <div class="flex space-x-2">
            <button @click="editEmployee(employee)" class="text-gray-400 hover:text-gray-600">
              <PencilIcon class="w-4 h-4" />
            </button>
            <button @click="deleteEmployee(employee)" class="text-gray-400 hover:text-red-600">
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Категория и емкость -->
        <div class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <span :class="getCategoryBadgeClass(employee.category)">
              {{ getCategoryLabel(employee.category) }}
            </span>
            <span class="text-sm text-gray-600">
              Емкость: {{ Math.round(employee.capacity * 100) }}%
            </span>
          </div>
          
          <!-- Предпочтительные редакции -->
          <div v-if="employee.preferred_departments && employee.preferred_departments.length > 0" class="mt-2">
            <p class="text-xs text-gray-500 mb-1">Предпочтительные редакции:</p>
            <div class="flex flex-wrap gap-1">
              <span 
                v-for="dept in employee.preferred_departments" 
                :key="dept"
                class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
              >
                {{ dept }}
              </span>
            </div>
          </div>
        </div>

        <!-- Текущая нагрузка -->
        <div class="mb-4">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-medium text-gray-700">Текущая нагрузка</span>
            <div class="text-right">
              <span class="text-sm font-medium" :class="getWorkloadColor(employee)">
                {{ getEmployeeOverloadPercentage(employee) }}%
              </span>
              <div class="text-xs text-gray-500">
                {{ getEmployeeTotalArticles(employee.id) }} из {{ getEmployeeWorkloadNorm(employee) }} статей
                <span v-if="employee.category === 'СМВ' && getEmployeeMmvChecks(employee) > 0" class="text-blue-600 ml-2">
                  + {{ getEmployeeMmvChecks(employee) }} проверок ММВ
                </span>
              </div>
            </div>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div 
              class="h-2 rounded-full transition-all duration-300"
              :class="getWorkloadBarColor(employee)"
              :style="{ width: `${Math.min(getEmployeeOverloadPercentage(employee), 100)}%` }"
            ></div>
          </div>
          <div class="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span class="font-medium">100% (норма)</span>
          </div>
        </div>

        <!-- Назначения -->
        <div class="mb-4">
          <h4 class="text-sm font-medium text-gray-700 mb-2">Редакции</h4>
          <div class="space-y-2">
            <div 
              v-for="assignment in getEmployeeAssignments(employee.id)" 
              :key="assignment.id"
              class="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
            >
              <div>
                <div class="flex items-center space-x-2">
                  <p class="text-sm font-medium text-gray-900">{{ assignment.department_name }}</p>
                  <span 
                    class="px-1.5 py-0.5 text-xs font-medium rounded-full"
                    :class="getComplexityBadgeClass(getDepartmentComplexity(assignment.department_id))"
                  >
                    {{ getComplexityLabel(getDepartmentComplexity(assignment.department_id)) }}
                  </span>
                </div>
                <p class="text-xs text-gray-500">
                  {{ getEmployeeArticlesInDepartment(employee.id, assignment.department_id, assignment.monthly_articles, assignment.workload_percentage) }} из {{ assignment.monthly_articles }} статей
                </p>
              </div>
              <div class="text-right">
                <p class="text-sm font-medium text-gray-900">{{ assignment.workload_percentage }}%</p>
                <button 
                  @click="removeAssignment(assignment.id)"
                  class="text-xs text-red-600 hover:text-red-800"
                >
                  Убрать
                </button>
              </div>
            </div>
            <p v-if="getEmployeeAssignments(employee.id).length === 0" class="text-sm text-gray-500">
              Нет назначений
            </p>
          </div>
        </div>

        <!-- Кнопка назначения -->
        <button 
          @click="showAssignmentModal(employee)"
          class="w-full btn-secondary text-sm inline-flex items-center justify-center"
        >
          <BuildingOfficeIcon class="w-4 h-4 mr-2" />
          Назначить в редакцию
        </button>
      </div>
    </div>

    <!-- Модальное окно создания/редактирования -->
    <div v-if="showCreateModal || showEditModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-medium text-gray-900 mb-4">
          {{ showCreateModal ? 'Создать сотрудника' : 'Редактировать сотрудника' }}
        </h3>
        <form @submit.prevent="saveEmployee">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Имя</label>
            <input
              v-model="form.name"
              type="text"
              required
              class="input-field"
              placeholder="Имя сотрудника"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              v-model="form.email"
              type="email"
              required
              class="input-field"
              placeholder="email@example.com"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Грейд</label>
            <select v-model="form.category" @change="updateCapacityFromRole" required class="input-field">
              <option value="">Выберите грейд</option>
              <option 
                v-for="role in rolesStore.roles" 
                :key="role.id" 
                :value="role.name"
              >
                {{ role.name }} - {{ role.description || role.name }}
              </option>
            </select>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Емкость (множитель)</label>
            <input
              v-model.number="form.capacity"
              type="number"
              required
              min="0.1"
              max="2.0"
              step="0.1"
              class="input-field"
              placeholder="1.0"
            />
            <p class="text-xs text-gray-500 mt-1">
              Емкость из роли будет установлена автоматически при выборе грейда
            </p>
          </div>
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">Предпочтительные редакции</label>
            <div class="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
              <label 
                v-for="department in departmentsStore.departments" 
                :key="department.id"
                class="flex items-center text-sm"
              >
                <input
                  type="checkbox"
                  :value="department.name"
                  v-model="form.preferred_departments"
                  class="mr-2 rounded"
                />
                {{ department.name }}
              </label>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              Выберите редакции, в которых сотрудник имеет опыт работы
            </p>
          </div>
          <div class="flex justify-end space-x-3">
            <button type="button" @click="closeModal" class="btn-secondary">
              Отмена
            </button>
            <button type="submit" class="btn-primary">
              {{ showCreateModal ? 'Создать' : 'Сохранить' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Модальное окно назначения в редакцию -->
    <div v-if="showAssignmentModalRef" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-medium text-gray-900 mb-4">
          Назначить {{ selectedEmployee?.name }} в редакцию
        </h3>
        <form @submit.prevent="saveAssignment">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Редакция</label>
            <select v-model="assignmentForm.department_id" required class="input-field">
              <option value="">Выберите редакцию</option>
              <option 
                v-for="department in availableDepartments" 
                :key="department.id" 
                :value="department.id"
              >
                {{ department.name }} ({{ department.monthly_articles }} статей/месяц) - {{ getComplexityLabel(department.complexity) }}
              </option>
            </select>
          </div>
          <div class="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-blue-800">
                  Автоматическое распределение
                </h3>
                <div class="mt-1 text-sm text-blue-700">
                  <p>Нагрузка будет рассчитана автоматически на основе:</p>
                  <ul class="list-disc list-inside mt-1">
                    <li>Месячного плана редакции</li>
                    <li>Коэффициента сложности редакции (S: 50%, M: 100%, L: 150%)</li>
                    <li>Коэффициента сотрудника (СМВ: 0.8, МВ: 1.0, ММВ: 1.3)</li>
                    <li>Количества назначенных сотрудников</li>
                  </ul>
                  <p class="mt-2 text-xs">
                    Текущая нагрузка: {{ getEmployeeOverloadPercentage(selectedEmployee) }}% ({{ getEmployeeTotalArticles(selectedEmployee.id) }} из {{ getEmployeeWorkloadNorm(selectedEmployee) }} статей)
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div class="flex justify-end space-x-3">
            <button type="button" @click="showAssignmentModalRef = false" class="btn-secondary">
              Отмена
            </button>
            <button type="submit" class="btn-primary">
              Назначить
            </button>
          </div>
        </form>
      </div>
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
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  BuildingOfficeIcon 
} from '@heroicons/vue/24/outline'

const departmentsStore = useDepartmentsStore()
const employeesStore = useEmployeesStore()
const assignmentsStore = useAssignmentsStore()
const rolesStore = useRolesStore()
const { getRoleBadgeClass, getRoleLabel } = useRoleBadge()

const searchQuery = ref('')
const categoryFilter = ref('')
const workloadFilter = ref('')
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showAssignmentModalRef = ref(false)
const selectedEmployee = ref(null)
const editingEmployee = ref(null)

const form = ref({
  name: '',
  email: '',
  category: '',
  capacity: 1.0,
  preferred_departments: []
})

const assignmentForm = ref({
  department_id: ''
})

const filteredEmployees = computed(() => {
  let filtered = employeesStore.employees

  if (searchQuery.value) {
    filtered = filtered.filter(emp => 
      emp.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }

  if (categoryFilter.value) {
    filtered = filtered.filter(emp => emp.category === categoryFilter.value)
  }

  if (workloadFilter.value) {
    filtered = filtered.filter(emp => {
      const workload = assignmentsStore.getEmployeeWorkload(emp.id)
      const maxCapacity = emp.capacity * 100
      
      switch (workloadFilter.value) {
        case 'underloaded':
          return workload < maxCapacity * 0.8
        case 'overloaded':
          return workload > maxCapacity
        default:
          return true
      }
    })
  }

  return filtered.sort((a, b) => a.name.localeCompare(b.name))
})

const availableDepartments = computed(() => {
  return departmentsStore.departments.filter(dept => {
    const assignments = assignmentsStore.getDepartmentAssignments(dept.id)
    const employeeInDepartment = assignments.some(a => a.employee_id === selectedEmployee.value?.id)
    return !employeeInDepartment // Сотрудник еще не назначен в эту редакцию
  })
})

const getEmployeeAssignments = (employeeId) => {
  return assignmentsStore.assignments.filter(a => a.employee_id === employeeId)
}

const getEmployeeWorkload = (employeeId) => {
  return assignmentsStore.getEmployeeWorkload(employeeId)
}

const getEmployeeTotalArticles = (employeeId) => {
  return assignmentsStore.getEmployeeTotalArticles(employeeId)
}

const getEmployeeMmvChecks = (employee) => {
  if (employee.category !== 'СМВ') return 0
  
  // Получаем все назначения сотрудника
  const assignments = assignmentsStore.getEmployeeAssignments(employee.id)
  let totalMmvChecks = 0
  
  assignments.forEach(assignment => {
    // Получаем детали по редакции
    const departmentAssignments = assignmentsStore.getDepartmentAssignments(assignment.department_id)
    const smvCount = departmentAssignments.filter(a => {
      const emp = employeesStore.employees.find(e => e.id === a.employee_id)
      return emp && emp.category === 'СМВ'
    }).length
    
    if (smvCount > 0) {
      // Рассчитываем статьи ММВ в этой редакции
      const mmvArticles = departmentAssignments.reduce((sum, a) => {
        const emp = employeesStore.employees.find(e => e.id === a.employee_id)
        if (emp && emp.category === 'ММВ') {
          const articlesInDept = Math.round((a.workload_percentage / 100.0) * assignment.monthly_articles)
          return sum + articlesInDept
        }
        return sum
      }, 0)
      
      // Распределяем проверки между всеми СМВ
      totalMmvChecks += Math.round(mmvArticles / smvCount)
    }
  })
  
  return totalMmvChecks
}

const getEmployeeArticlesInDepartment = (employeeId, departmentId, monthlyArticles, workloadPercentage) => {
  // Показываем реальное количество статей (без учета сложности)
  return Math.round((workloadPercentage / 100.0) * monthlyArticles)
}

const getEmployeeScoringInDepartment = (employeeId, departmentId, monthlyArticles, workloadPercentage) => {
  // Получаем информацию о редакции для расчета сложности
  const department = departmentsStore.departments.find(d => d.id === departmentId)
  const complexity = department?.complexity || 'M'
  
  // Коэффициенты сложности
  const complexityCoefficients = { 'S': 0.5, 'M': 1.0, 'L': 1.5 }
  const complexityCoeff = complexityCoefficients[complexity] || 1.0
  
  // Рассчитываем скоринг с учетом сложности
  return Math.round((workloadPercentage / 100.0) * monthlyArticles * complexityCoeff)
}

const getEmployeeWorkloadNorm = (employee) => {
  return assignmentsStore.getEmployeeWorkloadNorm(employee)
}

const getEmployeeOverloadPercentage = (employee) => {
  return assignmentsStore.getEmployeeOverloadPercentage(employee)
}

const isEmployeeOverloaded = (employee) => {
  return assignmentsStore.isEmployeeOverloaded(employee)
}

const getDepartmentComplexity = (departmentId) => {
  const department = departmentsStore.departments.find(d => d.id === departmentId)
  return department?.complexity || 'M'
}

const getComplexityLabel = (complexity) => {
  switch (complexity) {
    case 'S': return 'S'
    case 'M': return 'M'
    case 'L': return 'L'
    default: return 'M'
  }
}

const getComplexityBadgeClass = (complexity) => {
  switch (complexity) {
    case 'S': return 'bg-green-100 text-green-800'
    case 'M': return 'bg-blue-100 text-blue-800'
    case 'L': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getCategoryBadgeClass = (category) => {
  return getRoleBadgeClass(category)
}

const getCategoryLabel = (category) => {
  return getRoleLabel(category)
}

const updateCapacityFromRole = () => {
  if (form.value.category) {
    const role = rolesStore.getRoleByName(form.value.category)
    if (role) {
      form.value.capacity = role.capacity
    }
  }
}

const getWorkloadColor = (employee) => {
  const overloadPercentage = getEmployeeOverloadPercentage(employee)
  
  if (overloadPercentage > 100) return 'text-red-600'
  if (overloadPercentage >= 90) return 'text-green-600'
  return 'text-yellow-600'
}

const getWorkloadBarColor = (employee) => {
  const overloadPercentage = getEmployeeOverloadPercentage(employee)
  
  if (overloadPercentage > 100) return 'bg-red-500'
  if (overloadPercentage >= 90) return 'bg-green-500'
  return 'bg-yellow-500'
}

const editEmployee = (employee) => {
  editingEmployee.value = employee
  form.value = { ...employee }
  showEditModal.value = true
}

const deleteEmployee = async (employee) => {
  if (confirm(`Удалить сотрудника "${employee.name}"?`)) {
    try {
      await employeesStore.deleteEmployee(employee.id)
    } catch (error) {
      console.error('Ошибка при удалении сотрудника:', error)
    }
  }
}

const saveEmployee = async () => {
  try {
    if (showCreateModal.value) {
      await employeesStore.createEmployee(form.value)
    } else {
      await employeesStore.updateEmployee(editingEmployee.value.id, form.value)
    }
    closeModal()
  } catch (error) {
    console.error('Ошибка при сохранении сотрудника:', error)
  }
}

const showAssignmentModal = (employee) => {
  selectedEmployee.value = employee
  assignmentForm.value = {
    department_id: ''
  }
  showAssignmentModalRef.value = true
}

const saveAssignment = async () => {
  try {
    await assignmentsStore.createAssignment({
      employee_id: selectedEmployee.value.id,
      department_id: assignmentForm.value.department_id
    })
    showAssignmentModalRef.value = false
  } catch (error) {
    console.error('Ошибка при назначении в редакцию:', error)
  }
}

const removeAssignment = async (assignmentId) => {
  if (confirm('Убрать сотрудника из редакции?')) {
    try {
      await assignmentsStore.deleteAssignment(assignmentId)
    } catch (error) {
      console.error('Ошибка при удалении назначения:', error)
    }
  }
}

const closeModal = () => {
  showCreateModal.value = false
  showEditModal.value = false
  form.value = {
    name: '',
    email: '',
    category: '',
    capacity: 1.0,
    preferred_departments: []
  }
  editingEmployee.value = null
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
