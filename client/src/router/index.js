import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import Departments from '../views/Departments.vue'
import Employees from '../views/Employees.vue'
import Assistant from '../views/Assistant.vue'
import Analytics from '../views/Analytics.vue'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/departments',
    name: 'Departments',
    component: Departments
  },
  {
    path: '/employees',
    name: 'Employees',
    component: Employees
  },
  {
    path: '/assistant',
    name: 'Assistant',
    component: Assistant
  },
  {
    path: '/analytics',
    name: 'Analytics',
    component: Analytics
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
