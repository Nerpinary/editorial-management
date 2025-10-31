<template>
    <div class="relative" ref="dropdownRef">
        <label class="block text-sm font-medium text-gray-700 mb-2">
            {{ label }}
            <span v-if="required" class="text-red-500">*</span>
        </label>

        <!-- Основное поле -->
        <div class="relative">
            <input v-model="searchDisplay" @focus="showDropdown = true" type="text" :placeholder="placeholder"
                class="input-field w-full pr-10" readonly />
            <div class="absolute inset-y-0 right-0 flex items-center pr-3">
                <ChevronDownIcon
                    :class="['h-5 w-5 text-gray-400 transition-transform', showDropdown ? 'rotate-180' : '']" />
            </div>
        </div>

        <!-- Выпадающий список -->
        <transition name="fade">
            <div v-if="showDropdown"
                class="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-auto">
                <!-- Поиск -->
                <div class="p-2 border-b border-gray-200">
                    <input v-model="searchInput" type="text" placeholder="Поиск сотрудников..."
                        class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <!-- Список сотрудников -->
                <div class="py-1 max-h-56 overflow-auto">
                    <div v-for="employee in filteredEmployees" :key="employee.id"
                        class="employee-option flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer transition-colors"
                        @click="toggleEmployee(employee)">
                        <input :id="`employee-${employee.id}`" type="checkbox" :checked="isSelected(employee.id)"
                            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded pointer-events-none" 
                            @click.stop />
                        <div class="ml-3 flex-1 pointer-events-none">
                            <div class="flex items-center justify-between">
                                <div>
                                    <span class="text-sm font-medium text-gray-900">{{ employee.name }}</span>
                                    <span class="text-xs text-gray-500 ml-2">({{ getCategoryLabel(employee.category)
                                        }})</span>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <span
                                        v-if="employee.preferred_departments && employee.preferred_departments.includes(departmentName)"
                                        class="text-yellow-500 text-xs">
                                        ★
                                    </span>
                                    <span class="text-xs text-gray-400">{{ employee.capacity }}x</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-if="filteredEmployees.length === 0" class="px-3 py-2 text-sm text-gray-500">
                        Сотрудники не найдены
                    </div>
                </div>

                <!-- Выбранные -->
                <div v-if="selectedEmployees.length > 0" class="border-t border-gray-200 p-2">
                    <div class="text-xs text-gray-600 mb-2">Выбрано: {{ selectedEmployees.length }}</div>
                    <div class="flex flex-wrap gap-1">
                        <span v-for="employee in selectedEmployees" :key="employee.id"
                            class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            {{ employee.name }}
                            <button @click.stop="removeEmployee(employee.id)"
                                class="ml-1 text-blue-600 hover:text-blue-800">
                                ×
                            </button>
                        </span>
                    </div>
                </div>

                <!-- Кнопка закрытия -->
                <div class="sticky bottom-0 border-t border-gray-200 p-2 flex justify-end bg-gray-50">
                    <button @click="showDropdown = false"
                        class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                        Закрыть
                    </button>
                </div>
            </div>
        </transition>

        <p v-if="hint" class="text-xs text-gray-500 mt-1">{{ hint }}</p>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ChevronDownIcon } from '@heroicons/vue/24/outline'
import { useRolesStore } from '../stores/roles'
import { useRoleBadge } from '../composables/useRoleBadge'

const rolesStore = useRolesStore()
const { getRoleBadgeClass, getRoleLabel } = useRoleBadge()

const props = defineProps({
    employees: Array,
    selected: Array,
    label: String,
    placeholder: String,
    hint: String,
    required: Boolean,
    departmentName: String
})

const emit = defineEmits(['update:selected'])

const showDropdown = ref(false)
const searchInput = ref('')
const searchDisplay = ref('')
const selectedEmployees = ref([])
const tempSelection = ref([])

const dropdownRef = ref(null)

// Закрытие при клике вне
const handleClickOutside = (e) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    showDropdown.value = false
  }
}
onMounted(async () => {
  document.addEventListener('click', handleClickOutside)
  if (rolesStore.roles.length === 0) {
    await rolesStore.fetchRoles()
  }
})
onUnmounted(() => document.removeEventListener('click', handleClickOutside))

// Фильтрация и сортировка
const filteredEmployees = computed(() => {
    let filtered = props.employees
    
    // Фильтрация по поиску
    if (searchInput.value) {
        const q = searchInput.value.toLowerCase()
        filtered = filtered.filter(
            e => e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)
        )
    }
    
    // Сортировка: сначала сотрудники с preferred_departments (со звездочкой), затем остальные
    return filtered.sort((a, b) => {
        const aHasPreferred = props.departmentName && a.preferred_departments && a.preferred_departments.includes(props.departmentName)
        const bHasPreferred = props.departmentName && b.preferred_departments && b.preferred_departments.includes(props.departmentName)
        
        if (aHasPreferred && !bHasPreferred) return -1
        if (!aHasPreferred && bHasPreferred) return 1
        
        // Если оба с звездочкой или оба без - сортируем по имени
        return a.name.localeCompare(b.name)
    })
})

// Проверка выбранных
const isSelected = (id) => tempSelection.value.some(e => e.id === id)

// Переключение
const toggleEmployee = (employee) => {
    const index = tempSelection.value.findIndex(e => e.id === employee.id)
    if (index > -1) {
        tempSelection.value.splice(index, 1)
    } else {
        tempSelection.value.push(employee)
    }
    // Сразу обновляем selectedEmployees и отправляем изменения родителю
    selectedEmployees.value = [...tempSelection.value]
    emit('update:selected', [...selectedEmployees.value])
}

// Применить выбор (закрыть dropdown)
const applySelection = () => {
    showDropdown.value = false
}

// Отмена (восстановить из selectedEmployees)
const cancelSelection = () => {
    tempSelection.value = [...selectedEmployees.value]
    showDropdown.value = false
}

// Удаление
const removeEmployee = (id) => {
    const index = selectedEmployees.value.findIndex(e => e.id === id)
    if (index > -1) {
        selectedEmployees.value.splice(index, 1)
        emit('update:selected', [...selectedEmployees.value])
        tempSelection.value = [...selectedEmployees.value]
    }
}

// Метка категории
const getCategoryLabel = (category) => {
  return getRoleLabel(category)
}

// Синхронизация
watch(() => props.selected, (newVal) => {
    if (Array.isArray(newVal)) {
        const newArray = [...newVal]
        selectedEmployees.value = newArray
        tempSelection.value = newArray
    } else {
        selectedEmployees.value = []
        tempSelection.value = []
    }
}, { immediate: true })

// Отображение в input
watch(selectedEmployees, (val) => {
    if (val.length === 0) searchDisplay.value = ''
    else if (val.length === 1) searchDisplay.value = val[0].name
    else searchDisplay.value = `Выбрано: ${val.length} сотрудников`
}, { immediate: true })
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: all 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
    transform: scale(0.98);
}
</style>