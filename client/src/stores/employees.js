import { defineStore } from 'pinia'
import axios from 'axios'

export const useEmployeesStore = defineStore('employees', {
  state: () => ({
    employees: [],
    loading: false,
    error: null
  }),

  actions: {
    async fetchEmployees() {
      this.loading = true
      this.error = null
      try {
        const response = await axios.get('/api/employees')
        this.employees = response.data
      } catch (error) {
        this.error = error.message
        console.error('Ошибка загрузки сотрудников:', error)
      } finally {
        this.loading = false
      }
    },

    async createEmployee(employee) {
      try {
        const response = await axios.post('/api/employees', employee)
        this.employees.push(response.data)
        return response.data
      } catch (error) {
        this.error = error.message
        console.error('Ошибка создания сотрудника:', error)
        throw error
      }
    },

    async updateEmployee(id, employee) {
      try {
        const response = await axios.put(`/api/employees/${id}`, employee)
        const index = this.employees.findIndex(e => e.id === id)
        if (index !== -1) {
          this.employees[index] = response.data
        }
        return response.data
      } catch (error) {
        this.error = error.message
        console.error('Ошибка обновления сотрудника:', error)
        throw error
      }
    },

    async deleteEmployee(id) {
      try {
        await axios.delete(`/api/employees/${id}`)
        this.employees = this.employees.filter(e => e.id !== id)
      } catch (error) {
        this.error = error.message
        console.error('Ошибка удаления сотрудника:', error)
        throw error
      }
    }
  }
})
