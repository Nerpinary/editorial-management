import { defineStore } from 'pinia'
import axios from 'axios'

export const useDepartmentsStore = defineStore('departments', {
  state: () => ({
    departments: [],
    loading: false,
    error: null
  }),

  actions: {
    async fetchDepartments() {
      this.loading = true
      this.error = null
      try {
        const response = await axios.get('/api/departments')
        this.departments = response.data
      } catch (error) {
        this.error = error.message
        console.error('Ошибка загрузки редакций:', error)
      } finally {
        this.loading = false
      }
    },

    async createDepartment(department) {
      try {
        const response = await axios.post('/api/departments', department)
        this.departments.push(response.data)
        return response.data
      } catch (error) {
        this.error = error.message
        console.error('Ошибка создания редакции:', error)
        throw error
      }
    },

    async updateDepartment(id, department) {
      try {
        const response = await axios.put(`/api/departments/${id}`, department)
        const index = this.departments.findIndex(d => d.id === id)
        if (index !== -1) {
          this.departments[index] = response.data
        }
        return response.data
      } catch (error) {
        this.error = error.message
        console.error('Ошибка обновления редакции:', error)
        throw error
      }
    },

    async deleteDepartment(id) {
      try {
        await axios.delete(`/api/departments/${id}`)
        this.departments = this.departments.filter(d => d.id !== id)
      } catch (error) {
        this.error = error.message
        console.error('Ошибка удаления редакции:', error)
        throw error
      }
    }
  }
})
