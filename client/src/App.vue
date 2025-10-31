<template>
  <div class="min-h-screen bg-gray-50 flex">
    <!-- Sidebar -->
    <div class="fixed inset-y-0 left-0 z-50 w-48 bg-white shadow-lg border-r border-gray-200">
      <div class="flex flex-col h-full">
        <!-- Navigation -->
        <nav class="flex-1 px-3 py-6 space-y-1">
          <router-link
            v-for="item in navigation"
            :key="item.name"
            :to="item.href"
            :class="[
              $route.name === item.routeName
                ? 'bg-primary-100 text-primary-700 border-r-3 border-primary-600 shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              'flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200'
            ]"
          >
            <component :is="item.icon" class="w-5 h-5 mr-2.5" />
            {{ item.name }}
          </router-link>
        </nav>
      </div>
    </div>

    <!-- Main content -->
    <div class="flex-1 ml-48">
      <main class="py-6 px-6">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { 
  HomeIcon, 
  BuildingOfficeIcon, 
  UsersIcon,
  UserGroupIcon,
  ChartBarIcon,
  SparklesIcon 
} from '@heroicons/vue/24/outline'

const navigation = [
  { name: 'Дашборд', routeName: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Редакции', routeName: 'Departments', href: '/departments', icon: BuildingOfficeIcon },
  { name: 'Сотрудники', routeName: 'Employees', href: '/employees', icon: UsersIcon },
  { name: 'Роли', routeName: 'Roles', href: '/roles', icon: UserGroupIcon },
  { name: 'Помощник', routeName: 'Assistant', href: '/assistant', icon: SparklesIcon },
  { name: 'Аналитика', routeName: 'Analytics', href: '/analytics', icon: ChartBarIcon }
]
</script>
