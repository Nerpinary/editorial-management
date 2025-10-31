import { defineStore } from 'pinia'
import axios from 'axios'

export const useRolesStore = defineStore('roles', {
  state: () => ({
    roles: [],
    loading: false,
    error: null
  }),

  getters: {
    getRoleByName: (state) => (name) => {
      return state.roles.find(role => role.name === name)
    },
    
    getRoleById: (state) => (id) => {
      return state.roles.find(role => role.id === id)
    }
  },

  actions: {
    async fetchRoles() {
      this.loading = true
      this.error = null
      try {
        const response = await axios.get('/api/roles')
        this.roles = response.data
      } catch (error) {
        this.error = error.message
        console.error('Ошибка загрузки ролей:', error)
      } finally {
        this.loading = false
      }
    },

    async createRole(role) {
      try {
        const response = await axios.post('/api/roles', role)
        this.roles.push(response.data)
        return response.data
      } catch (error) {
        this.error = error.message
        console.error('Ошибка создания роли:', error)
        throw error
      }
    },

    async updateRole(id, role) {
      try {
        const response = await axios.put(`/api/roles/${id}`, role)
        const index = this.roles.findIndex(r => r.id === id)
        if (index !== -1) {
          this.roles[index] = response.data
        }
        return response.data
      } catch (error) {
        this.error = error.message
        console.error('Ошибка обновления роли:', error)
        throw error
      }
    },

    async deleteRole(id) {
      try {
        await axios.delete(`/api/roles/${id}`)
        this.roles = this.roles.filter(r => r.id !== id)
      } catch (error) {
        this.error = error.message
        console.error('Ошибка удаления роли:', error)
        throw error
      }
    }
  }
})

