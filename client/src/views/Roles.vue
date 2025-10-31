<template>
  <div class="px-0 py-0">
    <div class="mb-8 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Роли</h1>
        <p class="mt-2 text-gray-600">
          Управление ролями (грейдами) сотрудников
        </p>
      </div>
      <button @click="showCreateModal = true" class="btn-primary inline-flex items-center">
        <PlusIcon class="w-4 h-4 mr-2" />
        Добавить роль
      </button>
    </div>

    <!-- Фильтры -->
    <div class="card mb-6">
      <div class="flex flex-wrap gap-4">
        <div class="flex-1 min-w-64">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Поиск по названию роли..."
            class="input-field"
          />
        </div>
      </div>
    </div>

    <!-- Список ролей -->
    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      <div 
        v-for="role in filteredRoles" 
        :key="role.id"
        class="card hover:shadow-md transition-shadow duration-200"
      >
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">{{ role.name }}</h3>
            <p v-if="role.description" class="text-sm text-gray-500 mt-1">{{ role.description }}</p>
          </div>
          <div class="flex space-x-2">
            <button @click="editRole(role)" class="text-gray-400 hover:text-gray-600">
              <PencilIcon class="w-4 h-4" />
            </button>
            <button @click="deleteRole(role)" class="text-gray-400 hover:text-red-600">
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Емкость -->
        <div class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-700">Емкость</span>
            <span class="text-sm font-semibold text-gray-900">
              {{ role.capacity }}x
            </span>
          </div>
        </div>

        <!-- Доступные действия -->
        <div class="mb-4">
          <p class="text-sm font-medium text-gray-700 mb-2">Доступные действия</p>
          <div class="flex flex-wrap gap-2">
            <span 
              v-if="Array.isArray(role.actions) && role.actions.includes('typeset')"
              class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
            >
              Верстка
            </span>
            <span 
              v-if="Array.isArray(role.actions) && role.actions.includes('check')"
              class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800"
            >
              Проверка
            </span>
            <span 
              v-if="Array.isArray(role.actions) && role.actions.includes('self_check')"
              class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800"
            >
              Самопроверка
            </span>
            <span 
              v-if="!Array.isArray(role.actions) || role.actions.length === 0"
              class="text-xs text-gray-500"
            >
              Не указаны
            </span>
          </div>
        </div>

        <!-- Предпросмотр бейджа -->
        <div class="mb-4">
          <p class="text-sm font-medium text-gray-700 mb-2">Предпросмотр бейджа</p>
          <span 
            class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
            :class="[role.badge_color_bg, role.badge_color_text]"
          >
            {{ role.name }}
          </span>
        </div>

        <!-- Цвета -->
        <div class="space-y-2">
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Фон</label>
            <div class="flex items-center gap-2">
              <div 
                class="w-8 h-8 rounded border border-gray-300"
                :class="role.badge_color_bg"
              ></div>
              <span class="text-xs text-gray-600">{{ role.badge_color_bg }}</span>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Текст</label>
            <div class="flex items-center gap-2">
              <div 
                class="w-8 h-8 rounded border border-gray-300"
                :class="role.badge_color_text"
              ></div>
              <span class="text-xs text-gray-600">{{ role.badge_color_text }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Пустое состояние -->
    <div v-if="filteredRoles.length === 0" class="card text-center py-12">
      <p class="text-gray-500">Роли не найдены</p>
    </div>

    <!-- Правила скоринга -->
    <div class="mt-12">
      <div class="mb-8 flex justify-between items-center">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Правила скоринга</h2>
          <p class="mt-2 text-gray-600">
            Настройка скоринга для разных типов действий и сложности редакций
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Верстка -->
        <div class="card">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span class="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
            Верстка (typeset)
          </h3>
          <div class="space-y-3">
            <div 
              v-for="rule in scoringRules.filter(r => r.action_type === 'typeset')" 
              :key="rule.id"
              class="p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex justify-between items-center mb-2">
                <span class="font-medium text-gray-700">
                  {{ getComplexityLabel(rule.complexity) }}
                </span>
                <span class="text-sm font-semibold text-blue-600">
                  {{ roundScore(rule.score) }} очков
                </span>
              </div>
              <input
                :value="roundScore(rule.score)"
                type="number"
                step="0.01"
                min="0"
                @blur="handleScoreBlur(rule, $event)"
                class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <!-- Проверка -->
        <div class="card">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span class="w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
            Проверка (check)
          </h3>
          <div class="space-y-3">
            <div 
              v-for="rule in scoringRules.filter(r => r.action_type === 'check')" 
              :key="rule.id"
              class="p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex justify-between items-center mb-2">
                <span class="font-medium text-gray-700">
                  {{ getComplexityLabel(rule.complexity) }}
                </span>
                <span class="text-sm font-semibold text-orange-600">
                  {{ roundScore(rule.score) }} очков
                </span>
              </div>
              <input
                :value="roundScore(rule.score)"
                type="number"
                step="0.01"
                min="0"
                @blur="handleScoreBlur(rule, $event)"
                class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        <!-- Самопроверка -->
        <div class="card">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span class="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            Самопроверка (self_check)
          </h3>
          <div class="space-y-3">
            <div 
              v-for="rule in scoringRules.filter(r => r.action_type === 'self_check')" 
              :key="rule.id"
              class="p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex justify-between items-center mb-2">
                <span class="font-medium text-gray-700">
                  {{ getComplexityLabel(rule.complexity) }}
                </span>
                <span class="text-sm font-semibold text-green-600">
                  {{ roundScore(rule.score) }} очков
                </span>
              </div>
              <input
                :value="roundScore(rule.score)"
                type="number"
                step="0.01"
                min="0"
                @blur="handleScoreBlur(rule, $event)"
                class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="mt-6 card bg-blue-50 border border-blue-200">
        <h4 class="text-sm font-medium text-blue-900 mb-2">Как работает скоринг?</h4>
        <ul class="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Верстка M статьи = {{ getScoreForAction('typeset', 'M').toFixed(2) }} очков</li>
          <li>Проверка M статьи = {{ getScoreForAction('check', 'M').toFixed(2) }} очков</li>
          <li>Самопроверка M статьи = {{ getScoreForAction('self_check', 'M').toFixed(2) }} очков</li>
          <li>Верстка + Проверка = {{ (getScoreForAction('typeset', 'M') + getScoreForAction('check', 'M')).toFixed(2) }} очков (равно 1 самопроверке)</li>
        </ul>
      </div>
    </div>

    <!-- Модальное окно создания/редактирования -->
    <div v-if="showCreateModal || showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-6">
            {{ showCreateModal ? 'Добавить роль' : 'Редактировать роль' }}
          </h2>

          <form @submit.prevent="saveRole">
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Название роли <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                required
                class="input-field"
                placeholder="Например: СМВ"
              />
            </div>

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Описание
              </label>
              <input
                v-model="form.description"
                type="text"
                class="input-field"
                placeholder="Например: Старший менеджер выпуска"
              />
            </div>

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Емкость (множитель) <span class="text-red-500">*</span>
              </label>
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
                Емкость определяет производительность сотрудника (например, 1.0 = базовый уровень)
              </p>
            </div>

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Доступные действия <span class="text-red-500">*</span>
              </label>
              <div class="space-y-2 border border-gray-300 rounded-lg p-3">
                <label class="flex items-center">
                  <input
                    v-model="form.actions"
                    type="checkbox"
                    value="typeset"
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span class="ml-2 text-sm text-gray-700">
                    Верстка (typeset)
                    <span class="text-xs text-gray-500 ml-1">- оформление статей</span>
                  </span>
                </label>
                <label class="flex items-center">
                  <input
                    v-model="form.actions"
                    type="checkbox"
                    value="check"
                    class="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                  <span class="ml-2 text-sm text-gray-700">
                    Проверка (check)
                    <span class="text-xs text-gray-500 ml-1">- проверка чужих статей</span>
                  </span>
                </label>
                <label class="flex items-center">
                  <input
                    v-model="form.actions"
                    type="checkbox"
                    value="self_check"
                    class="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span class="ml-2 text-sm text-gray-700">
                    Самопроверка (self_check)
                    <span class="text-xs text-gray-500 ml-1">- проверка своих статей</span>
                  </span>
                </label>
              </div>
              <p class="text-xs text-gray-500 mt-1">
                Выберите действия, которые может выполнять роль в редакциях
              </p>
            </div>

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Цвет фона бейджа <span class="text-red-500">*</span>
              </label>
              <select v-model="form.badge_color_bg" required class="input-field">
                <option value="bg-gray-100">bg-gray-100</option>
                <option value="bg-blue-100">bg-blue-100</option>
                <option value="bg-green-100">bg-green-100</option>
                <option value="bg-purple-100">bg-purple-100</option>
                <option value="bg-red-100">bg-red-100</option>
                <option value="bg-yellow-100">bg-yellow-100</option>
                <option value="bg-indigo-100">bg-indigo-100</option>
                <option value="bg-pink-100">bg-pink-100</option>
                <option value="bg-orange-100">bg-orange-100</option>
              </select>
              <div class="mt-2">
                <div 
                  class="w-full h-8 rounded"
                  :class="form.badge_color_bg"
                ></div>
              </div>
            </div>

            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Цвет текста бейджа <span class="text-red-500">*</span>
              </label>
              <select v-model="form.badge_color_text" required class="input-field">
                <option value="text-gray-800">text-gray-800</option>
                <option value="text-blue-800">text-blue-800</option>
                <option value="text-green-800">text-green-800</option>
                <option value="text-purple-800">text-purple-800</option>
                <option value="text-red-800">text-red-800</option>
                <option value="text-yellow-800">text-yellow-800</option>
                <option value="text-indigo-800">text-indigo-800</option>
                <option value="text-pink-800">text-pink-800</option>
                <option value="text-orange-800">text-orange-800</option>
              </select>
              <div class="mt-2">
                <div class="flex items-center gap-2">
                  <div 
                    class="w-16 h-8 rounded border border-gray-300 flex items-center justify-center"
                    :class="form.badge_color_text"
                  >
                    Aa
                  </div>
                  <span class="text-xs text-gray-600">{{ form.badge_color_text }}</span>
                </div>
              </div>
            </div>

            <!-- Предпросмотр -->
            <div class="mb-6 p-4 bg-gray-50 rounded-lg">
              <p class="text-xs font-medium text-gray-700 mb-2">Предпросмотр бейджа</p>
              <span 
                class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                :class="[form.badge_color_bg, form.badge_color_text]"
              >
                {{ form.name || 'Название роли' }}
              </span>
            </div>

            <div class="flex justify-end gap-3">
              <button
                type="button"
                @click="closeModal"
                class="btn-secondary"
              >
                Отмена
              </button>
              <button
                type="submit"
                class="btn-primary"
              >
                {{ showCreateModal ? 'Создать' : 'Сохранить' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRolesStore } from '../stores/roles'
import { useScoringStore } from '../stores/scoring'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'

const rolesStore = useRolesStore()
const scoringStore = useScoringStore()

const scoringRules = ref([])

const searchQuery = ref('')
const showCreateModal = ref(false)
const showEditModal = ref(false)
const editingRole = ref(null)

const form = ref({
  name: '',
  description: '',
  capacity: 1.0,
  badge_color_bg: 'bg-gray-100',
  badge_color_text: 'text-gray-800',
  actions: ['self_check']
})

const filteredRoles = computed(() => {
  let filtered = rolesStore.roles

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(role =>
      role.name.toLowerCase().includes(query) ||
      (role.description && role.description.toLowerCase().includes(query))
    )
  }

  return filtered.sort((a, b) => a.name.localeCompare(b.name))
})

const editRole = (role) => {
  editingRole.value = role
  form.value = {
    name: role.name,
    description: role.description || '',
    capacity: role.capacity,
    badge_color_bg: role.badge_color_bg,
    badge_color_text: role.badge_color_text,
    actions: Array.isArray(role.actions) ? [...role.actions] : ['self_check']
  }
  showEditModal.value = true
}

const deleteRole = async (role) => {
  if (confirm(`Удалить роль "${role.name}"?`)) {
    try {
      await rolesStore.deleteRole(role.id)
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка при удалении роли')
      console.error('Ошибка при удалении роли:', error)
    }
  }
}

const saveRole = async () => {
  try {
    if (showCreateModal.value) {
      await rolesStore.createRole(form.value)
    } else {
      await rolesStore.updateRole(editingRole.value.id, form.value)
    }
    closeModal()
  } catch (error) {
    alert(error.response?.data?.error || 'Ошибка при сохранении роли')
    console.error('Ошибка при сохранении роли:', error)
  }
}

const closeModal = () => {
  showCreateModal.value = false
  showEditModal.value = false
  editingRole.value = null
  form.value = {
    name: '',
    description: '',
    capacity: 1.0,
    badge_color_bg: 'bg-gray-100',
    badge_color_text: 'text-gray-800',
    actions: ['self_check']
  }
}

const getComplexityLabel = (complexity) => {
  switch (complexity) {
    case 'S': return 'Простая (S)'
    case 'M': return 'Средняя (M)'
    case 'L': return 'Сложная (L)'
    default: return complexity
  }
}

const getScoreForAction = (actionType, complexity) => {
  return scoringStore.getScore(actionType, complexity)
}

const roundScore = (score) => {
  if (typeof score !== 'number' || isNaN(score)) return '0.00'
  return (Math.round(score * 100) / 100).toFixed(2)
}

const handleScoreBlur = async (rule, event) => {
  const inputValue = parseFloat(event.target.value)
  if (isNaN(inputValue) || inputValue < 0) {
    // Восстанавливаем старое значение если некорректный ввод
    event.target.value = roundScore(rule.score)
    return
  }
  
  // Округляем до 2 знаков после запятой
  const roundedScore = Math.round(inputValue * 100) / 100
  rule.score = roundedScore
  
  await updateScoringRule(rule)
}

const updateScoringRule = async (rule) => {
  try {
    // Округляем до 2 знаков после запятой перед сохранением
    const roundedScore = Math.round(rule.score * 100) / 100
    rule.score = roundedScore
    
    await scoringStore.updateRule(rule.id, {
      score: roundedScore,
      description: rule.description
    })
    // Обновляем список для отображения округленных значений
    await scoringStore.fetchRules()
    scoringRules.value = [...scoringStore.rules]
  } catch (error) {
    alert(error.response?.data?.error || 'Ошибка при обновлении правила скоринга')
    // Восстанавливаем значение при ошибке
    await scoringStore.fetchRules()
    scoringRules.value = [...scoringStore.rules]
  }
}

onMounted(async () => {
  await Promise.all([
    rolesStore.fetchRoles(),
    scoringStore.fetchRules()
  ])
  scoringRules.value = [...scoringStore.rules]
})
</script>

