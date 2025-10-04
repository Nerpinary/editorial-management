import { defineStore } from 'pinia'
import axios from 'axios'

export const useAssignmentsStore = defineStore('assignments', {
  state: () => ({
    assignments: [],
    analytics: [],
    workloadNorms: null,
    loading: false,
    error: null
  }),

  actions: {
    async fetchAssignments() {
      this.loading = true
      this.error = null
      try {
        const response = await axios.get('/api/assignments')
        this.assignments = response.data
      } catch (error) {
        this.error = error.message
        console.error('Ошибка загрузки назначений:', error)
      } finally {
        this.loading = false
      }
    },

    async fetchAnalytics() {
      try {
        const response = await axios.get('/api/analytics')
        // Новая структура: { departments: [...], norms: {...} }
        if (response.data.departments && response.data.norms) {
          this.analytics = response.data.departments
          this.workloadNorms = response.data.norms
        } else {
          // Старая структура для совместимости
          this.analytics = response.data
          this.workloadNorms = null
        }
      } catch (error) {
        this.error = error.message
        console.error('Ошибка загрузки аналитики:', error)
      }
    },

    async createAssignment(assignment) {
      try {
        const response = await axios.post('/api/assignments', assignment)
        // Обновляем все назначения после автоматического пересчета
        await this.fetchAssignments()
        await this.fetchAnalytics() // Обновляем аналитику
        return response.data
      } catch (error) {
        this.error = error.message
        console.error('Ошибка создания назначения:', error)
        throw error
      }
    },

    async deleteAssignment(id) {
      try {
        const response = await axios.delete(`/api/assignments/${id}`)
        this.assignments = this.assignments.filter(a => a.id !== id)
        await this.fetchAnalytics() // Обновляем аналитику
        
        // Возвращаем информацию о пересчете нагрузки
        return {
          success: true,
          message: response.data.message,
          updated_assignments: response.data.updated_assignments
        }
      } catch (error) {
        this.error = error.message
        console.error('Ошибка удаления назначения:', error)
        throw error
      }
    },

    // Получить назначения для конкретного сотрудника
    getEmployeeAssignments(employeeId) {
      return this.assignments.filter(a => a.employee_id === employeeId)
    },

    // Получить назначения для конкретной редакции
    getDepartmentAssignments(departmentId) {
      return this.assignments.filter(a => a.department_id === departmentId)
    },

    // Получить общую нагрузку сотрудника (в процентах от редакций)
    getEmployeeWorkload(employeeId) {
      const assignments = this.getEmployeeAssignments(employeeId)
      return assignments.reduce((total, assignment) => total + assignment.workload_percentage, 0)
    },

    // Получить общее количество статей сотрудника
    getEmployeeTotalArticles(employeeId) {
      const assignments = this.getEmployeeAssignments(employeeId)
      return assignments.reduce((total, assignment) => {
        const articlesInDepartment = Math.round((assignment.workload_percentage / 100.0) * assignment.monthly_articles)
        return total + articlesInDepartment
      }, 0)
    },

    // Получить норму нагрузки для сотрудника
    getEmployeeWorkloadNorm(employee) {
      if (!this.workloadNorms || !employee) return 0
      
      // Норма = (Общий план / Общая capacity) * capacity сотрудника
      const normPerCapacity = this.workloadNorms.norm_per_100_capacity
      return Math.round(normPerCapacity * employee.capacity)
    },

    // Проверить перегрузку сотрудника
    isEmployeeOverloaded(employee) {
      if (!this.workloadNorms || !employee) return false
      
      const totalArticles = this.getEmployeeTotalArticles(employee.id)
      const norm = this.getEmployeeWorkloadNorm(employee)
      
      // Перегрузка если реальные статьи > нормы
      return totalArticles > norm
    },

    // Получить процент перегрузки
    getEmployeeOverloadPercentage(employee) {
      if (!this.workloadNorms || !employee) return 0
      
      const totalArticles = this.getEmployeeTotalArticles(employee.id)
      const norm = this.getEmployeeWorkloadNorm(employee)
      
      if (norm === 0) return 0
      return Math.round((totalArticles / norm) * 100)
    },

    // Валидация назначений для редакции
    async validateDepartmentAssignments(departmentId) {
      try {
        const response = await axios.get(`/api/validation/${departmentId}`)
        return response.data
      } catch (error) {
        console.error('Ошибка валидации:', error)
        return { isValid: true, warnings: [], errors: [] }
      }
    },

    // Получить детальную информацию по сотрудникам в редакции
    async getDepartmentDetails(departmentId) {
      try {
        const response = await axios.get(`/api/department-details/${departmentId}`)
        return response.data
      } catch (error) {
        console.error('Ошибка получения деталей редакции:', error)
        return []
      }
    }
  }
})
