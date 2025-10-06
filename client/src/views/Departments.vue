<template>
  <div class="px-0 py-0">
    <div class="mb-8 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Редакции</h1>
        <p class="mt-2 text-gray-600">
          Управление редакциями и распределение сотрудников
        </p>
      </div>
      <button @click="showCreateModal = true" class="btn-primary inline-flex items-center">
        <PlusIcon class="w-4 h-4 mr-2" />
        Добавить редакцию
      </button>
    </div>

    <!-- Фильтры -->
    <div class="card mb-6">
      <div class="flex flex-wrap gap-4">
        <div class="flex-1 min-w-64">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Поиск по названию редакции..."
            class="input-field"
          />
        </div>
        <select v-model="sortBy" class="input-field w-48">
          <option value="name">По названию</option>
          <option value="monthly_articles">По количеству статей</option>
          <option value="coverage">По покрытию</option>
        </select>
      </div>
    </div>

    <!-- Список редакций -->
    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      <div 
        v-for="department in filteredDepartments" 
        :key="department.id"
        class="card hover:shadow-md transition-shadow duration-200"
      >
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">{{ department.name }}</h3>
            <div class="flex items-center space-x-2">
              <p class="text-sm text-gray-500">{{ department.monthly_articles }} статей/месяц</p>
              <span 
                class="px-2 py-1 text-xs font-medium rounded-full"
                :class="getComplexityBadgeClass(department.complexity)"
              >
                {{ getComplexityLabel(department.complexity) }}
              </span>
            </div>
          </div>
          <div class="flex space-x-2">
            <button @click="editDepartment(department)" class="text-gray-400 hover:text-gray-600">
              <PencilIcon class="w-4 h-4" />
            </button>
            <button @click="deleteDepartment(department)" class="text-gray-400 hover:text-red-600">
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Покрытие -->
        <div class="mb-4">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-medium text-gray-700">Покрытие нагрузки</span>
            <span class="text-sm font-medium" :class="getCoverageColor(department)">
              {{ getDepartmentCoverage(department) }}%
            </span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div 
              class="h-2 rounded-full transition-all duration-300"
              :class="getCoverageBarColor(department)"
              :style="{ width: `${Math.min(getDepartmentCoverage(department), 100)}%` }"
            ></div>
          </div>
        </div>

        <!-- Назначенные сотрудники -->
        <div class="mb-4">
          <h4 class="text-sm font-medium text-gray-700 mb-2">Назначенные сотрудники</h4>
          <div class="space-y-2">
            <div 
              v-for="detail in getDepartmentDetails(department.id)" 
              :key="detail.assignment_id"
              class="p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <p class="text-sm font-medium text-gray-900">{{ detail.employee_name }}</p>
                  <span :class="getCategoryBadgeClass(detail.category)">
                    {{ getCategoryLabel(detail.category) }}
                  </span>
                  <span 
                    v-if="isPreferredDepartment(detail.employee_name, department.name)"
                    class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-green-100 text-green-800"
                    title="Предпочтительная редакция"
                  >
                    ★
                  </span>
                </div>
                <button 
                  @click="removeAssignment(detail.assignment_id)"
                  class="text-xs text-red-600 hover:text-red-800"
                >
                  Убрать
                </button>
              </div>
              <div class="bg-white p-2 rounded text-xs">
                <div class="mb-2">
                  <span class="text-gray-500">Нагрузка:</span>
                  <span class="font-medium">{{ detail.workload_percentage }}% ({{ detail.articles_assigned }} статей)</span>
                </div>
                <div class="grid grid-cols-3 gap-1">
                  <div v-if="detail.breakdown.typeset > 0" class="bg-blue-100 p-1 rounded text-center">
                    <div class="font-medium text-blue-800">{{ detail.breakdown.typeset }}</div>
                    <div class="text-blue-600">Верстает</div>
                  </div>
                  <div v-if="detail.breakdown.self_check > 0" class="bg-green-100 p-1 rounded text-center">
                    <div class="font-medium text-green-800">{{ detail.breakdown.self_check }}</div>
                    <div class="text-green-600">Самопроверка</div>
                  </div>
                  <div v-if="detail.breakdown.check_mmv > 0" class="bg-orange-100 p-1 rounded text-center">
                    <div class="font-medium text-orange-800">{{ detail.breakdown.check_mmv }}</div>
                    <div class="text-orange-600">Проверка ММВ</div>
                  </div>
                </div>
              </div>
            </div>
            <p v-if="getDepartmentDetails(department.id).length === 0" class="text-sm text-gray-500">
              Нет назначенных сотрудников
            </p>
          </div>
        </div>

        <!-- Валидация грейдов -->
        <div v-if="getDepartmentValidation(department.id)" class="mb-4">
          <div v-if="!getDepartmentValidation(department.id).isValid" class="p-2 bg-red-50 border border-red-200 rounded-lg">
            <div class="flex items-center">
              <ExclamationTriangleIcon class="h-4 w-4 text-red-400 mr-2" />
              <div class="text-xs text-red-800">
                <div v-for="error in getDepartmentValidation(department.id).errors" :key="error">
                  {{ error }}
                </div>
              </div>
            </div>
          </div>
          <div v-if="getDepartmentValidation(department.id).warnings.length > 0" class="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div class="flex items-center">
              <ExclamationTriangleIcon class="h-4 w-4 text-yellow-400 mr-2" />
              <div class="text-xs text-yellow-800">
                <div v-for="warning in getDepartmentValidation(department.id).warnings" :key="warning">
                  {{ warning }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Кнопки управления -->
        <div class="space-y-2">
          <button 
            @click="showAssignmentModal(department)"
            class="w-full btn-secondary text-sm inline-flex items-center justify-center"
          >
            <UserPlusIcon class="w-4 h-4 mr-2" />
            Назначить сотрудников
          </button>
          
          <button 
            v-if="getDepartmentDetails(department.id).length > 0"
            @click="clearDepartmentAssignments(department)"
            class="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg px-4 py-2 text-sm inline-flex items-center justify-center transition-colors"
          >
            <XMarkIcon class="w-4 h-4 mr-2" />
            Очистить от сотрудников
          </button>
        </div>
      </div>
    </div>

    <!-- Модальное окно создания/редактирования -->
    <div v-if="showCreateModal || showEditModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-medium text-gray-900 mb-4">
          {{ showCreateModal ? 'Создать редакцию' : 'Редактировать редакцию' }}
        </h3>
        <form @submit.prevent="saveDepartment">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Название</label>
            <input
              v-model="form.name"
              type="text"
              required
              class="input-field"
              placeholder="Название редакции"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Статей в месяц</label>
            <input
              v-model.number="form.monthly_articles"
              type="number"
              required
              min="0"
              class="input-field"
              placeholder="0"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Сложность редакции</label>
            <select v-model="form.complexity" required class="input-field">
              <option value="S">S - Простая (50% сложности)</option>
              <option value="M">M - Средняя (100% сложности)</option>
              <option value="L">L - Сложная (150% сложности)</option>
            </select>
            <p class="text-xs text-gray-500 mt-1">
              Коэффициент влияет на расчет реальной нагрузки сотрудников
            </p>
          </div>
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">Описание</label>
            <textarea
              v-model="form.description"
              class="input-field"
              rows="3"
              placeholder="Описание редакции"
            ></textarea>
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

    <!-- Модальное окно назначения сотрудников -->
    <div v-if="showAssignmentModalRef" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-medium text-gray-900 mb-4">
          Назначить сотрудников в {{ selectedDepartment?.name }}
        </h3>
        <form @submit.prevent="saveAssignment">
          <div class="mb-4">
            <MultiSelectEmployees
              :employees="availableEmployees"
              v-model:selected="assignmentForm.selectedEmployees"
              label="Сотрудники"
              placeholder="Выберите сотрудников для назначения"
              :department-name="selectedDepartment?.name"
              hint="★ Сотрудники с опытом в этой редакции"
              required
            />
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
                    <li>Месячного плана редакции: {{ selectedDepartment?.monthly_articles }} статей</li>
                    <li>Коэффициента сотрудника (СМВ: 1.0, МВ: 1.2, ММВ: 1.5)</li>
                    <li>Количества назначенных сотрудников</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div class="flex justify-end space-x-3">
            <button type="button" @click="showAssignmentModalRef = false" class="btn-secondary">
              Отмена
            </button>
            <button 
              type="submit" 
              class="btn-primary"
              :disabled="!assignmentForm.selectedEmployees || assignmentForm.selectedEmployees.length === 0"
            >
              Назначить {{ assignmentForm.selectedEmployees?.length || 0 }} сотрудников
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
import MultiSelectEmployees from '../components/MultiSelectEmployees.vue'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  UserPlusIcon,
  ExclamationTriangleIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline'

const departmentsStore = useDepartmentsStore()
const employeesStore = useEmployeesStore()
const assignmentsStore = useAssignmentsStore()

const searchQuery = ref('')
const sortBy = ref('name')
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showAssignmentModalRef = ref(false)
const selectedDepartment = ref(null)
const editingDepartment = ref(null)

const form = ref({
  name: '',
  monthly_articles: 0,
  complexity: 'M',
  description: ''
})

const assignmentForm = ref({
  selectedEmployees: []
})

const filteredDepartments = computed(() => {
  let filtered = departmentsStore.departments

  if (searchQuery.value) {
    filtered = filtered.filter(dept => 
      dept.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }

  return filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'monthly_articles':
        return b.monthly_articles - a.monthly_articles
      case 'coverage':
        return getDepartmentCoverage(b) - getDepartmentCoverage(a)
      default:
        return a.name.localeCompare(b.name)
    }
  })
})

const availableEmployees = computed(() => {
  return employeesStore.employees.filter(emp => {
    // Проверяем только, что сотрудник еще не назначен в выбранную редакцию
    if (selectedDepartment.value) {
      const departmentAssignments = assignmentsStore.getDepartmentAssignments(selectedDepartment.value.id)
      const alreadyAssigned = departmentAssignments.some(a => a.employee_id === emp.id)
      if (alreadyAssigned) return false
    }
    
    return true
  })
})

const getDepartmentAssignments = (departmentId) => {
  return assignmentsStore.assignments.filter(a => a.department_id === departmentId)
}

const departmentValidations = ref({})
const departmentDetails = ref({})

const getDepartmentValidation = (departmentId) => {
  return departmentValidations.value[departmentId] || { isValid: true, warnings: [], errors: [] }
}

const getDepartmentDetails = (departmentId) => {
  return departmentDetails.value[departmentId] || []
}

const isPreferredDepartment = (employeeName, departmentName) => {
  const employee = employeesStore.employees.find(emp => emp.name === employeeName)
  return employee && employee.preferred_departments && employee.preferred_departments.includes(departmentName)
}

const getPreferredEmployees = (departmentName) => {
  if (!departmentName) return []
  return employeesStore.employees.filter(emp => 
    emp.preferred_departments && emp.preferred_departments.includes(departmentName)
  )
}

const getDepartmentCoverage = (department) => {
  const analytics = assignmentsStore.analytics.find(a => a.department_name === department.name)
  return analytics ? analytics.coverage_percentage : 0
}

const getCoverageColor = (department) => {
  const coverage = getDepartmentCoverage(department)
  if (coverage >= 100) return 'text-green-600'
  if (coverage >= 80) return 'text-yellow-600'
  return 'text-red-600'
}

const getCoverageBarColor = (department) => {
  const coverage = getDepartmentCoverage(department)
  if (coverage >= 100) return 'bg-green-500'
  if (coverage >= 80) return 'bg-yellow-500'
  return 'bg-red-500'
}

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
    case 'СМВ': return 'СМВ'
    case 'МВ': return 'МВ'
    case 'ММВ': return 'ММВ'
    default: return category
  }
}

const getComplexityLabel = (complexity) => {
  switch (complexity) {
    case 'S': return 'S (50%)'
    case 'M': return 'M (100%)'
    case 'L': return 'L (150%)'
    default: return 'M (100%)'
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

const editDepartment = (department) => {
  editingDepartment.value = department
  form.value = { ...department }
  showEditModal.value = true
}

const deleteDepartment = async (department) => {
  if (confirm(`Удалить редакцию "${department.name}"?`)) {
    try {
      await departmentsStore.deleteDepartment(department.id)
    } catch (error) {
      console.error('Ошибка при удалении редакции:', error)
    }
  }
}

const saveDepartment = async () => {
  try {
    if (showCreateModal.value) {
      await departmentsStore.createDepartment(form.value)
    } else {
      await departmentsStore.updateDepartment(editingDepartment.value.id, form.value)
    }
    closeModal()
  } catch (error) {
    console.error('Ошибка при сохранении редакции:', error)
  }
}

const showAssignmentModal = (department) => {
  selectedDepartment.value = department
  assignmentForm.value = {
    selectedEmployees: []
  }
  showAssignmentModalRef.value = true
}

const saveAssignment = async () => {
  try {
    if (!assignmentForm.value.selectedEmployees || assignmentForm.value.selectedEmployees.length === 0) {
      alert('Выберите хотя бы одного сотрудника')
      return
    }

    // Создаем назначения для всех выбранных сотрудников
    const assignmentPromises = assignmentForm.value.selectedEmployees.map(employee => 
      assignmentsStore.createAssignment({
        employee_id: employee.id,
        department_id: selectedDepartment.value.id
      })
    )

    await Promise.all(assignmentPromises)
    
    // Обновляем валидацию и детали после назначения
    await Promise.all([
      validateDepartment(selectedDepartment.value.id),
      loadDepartmentDetails(selectedDepartment.value.id)
    ])
    showAssignmentModalRef.value = false
  } catch (error) {
    console.error('Ошибка при назначении сотрудников:', error)
  }
}

const removeAssignment = async (assignmentId) => {
  if (confirm('Убрать сотрудника из редакции?')) {
    try {
      const assignment = assignmentsStore.assignments.find(a => a.id === assignmentId)
      await assignmentsStore.deleteAssignment(assignmentId)
      
      // Обновляем валидацию и детали после удаления
      if (assignment) {
        await Promise.all([
          validateDepartment(assignment.department_id),
          loadDepartmentDetails(assignment.department_id)
        ])
      }
    } catch (error) {
      console.error('Ошибка при удалении назначения:', error)
    }
  }
}

const clearDepartmentAssignments = async (department) => {
  const assignedCount = getDepartmentDetails(department.id).length
  
  if (assignedCount === 0) {
    return
  }
  
  if (confirm(`Убрать всех сотрудников (${assignedCount}) из редакции "${department.name}"?`)) {
    try {
      const departmentAssignments = assignmentsStore.getDepartmentAssignments(department.id)
      let clearedCount = 0
      let updatedAssignments = 0
      
      // Удаляем все назначения в этой редакции
      for (const assignment of departmentAssignments) {
        const result = await assignmentsStore.deleteAssignment(assignment.id)
        clearedCount++
        updatedAssignments += result.updated_assignments
      }
      
      
      // Обновляем валидацию и детали
      await Promise.all([
        validateDepartment(department.id),
        loadDepartmentDetails(department.id)
      ])
    } catch (error) {
      console.error('Ошибка при очистке редакции от сотрудников:', error)
    }
  }
}


const validateDepartment = async (departmentId) => {
  try {
    const validation = await assignmentsStore.validateDepartmentAssignments(departmentId)
    departmentValidations.value[departmentId] = validation
  } catch (error) {
    console.error('Ошибка валидации:', error)
  }
}

const loadDepartmentDetails = async (departmentId) => {
  try {
    const details = await assignmentsStore.getDepartmentDetails(departmentId)
    departmentDetails.value[departmentId] = details
  } catch (error) {
    console.error('Ошибка загрузки деталей:', error)
  }
}

const closeModal = () => {
  showCreateModal.value = false
  showEditModal.value = false
  form.value = {
    name: '',
    monthly_articles: 0,
    description: ''
  }
  editingDepartment.value = null
}

onMounted(async () => {
  await Promise.all([
    departmentsStore.fetchDepartments(),
    employeesStore.fetchEmployees(),
    assignmentsStore.fetchAssignments(),
    assignmentsStore.fetchAnalytics()
  ])
  
  // Валидируем все редакции и загружаем детали при загрузке
  for (const department of departmentsStore.departments) {
    await Promise.all([
      validateDepartment(department.id),
      loadDepartmentDetails(department.id)
    ])
  }
})
</script>
