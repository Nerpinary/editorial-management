import { defineStore } from 'pinia'
import axios from 'axios'

export const useScoringStore = defineStore('scoring', {
  state: () => ({
    rules: [],
    loading: false,
    error: null
  }),

  getters: {
    getScore: (state) => (actionType, complexity) => {
      const rule = state.rules.find(
        r => r.action_type === actionType && r.complexity === complexity
      )
      return rule ? rule.score : 0
    },

    getRulesByAction: (state) => (actionType) => {
      return state.rules.filter(r => r.action_type === actionType)
    }
  },

  actions: {
    async fetchRules() {
      this.loading = true
      this.error = null
      try {
        const response = await axios.get('/api/scoring-rules')
        this.rules = response.data
      } catch (error) {
        this.error = error.message
        console.error('Ошибка загрузки правил скоринга:', error)
      } finally {
        this.loading = false
      }
    },

    async updateRule(id, rule) {
      try {
        await axios.put(`/api/scoring-rules/${id}`, rule)
        const index = this.rules.findIndex(r => r.id === id)
        if (index !== -1) {
          const response = await axios.get(`/api/scoring-rules`)
          this.rules = response.data
        }
      } catch (error) {
        this.error = error.message
        console.error('Ошибка обновления правила скоринга:', error)
        throw error
      }
    },

    async getEmployeeScoring(employeeId) {
      try {
        const response = await axios.get(`/api/employee-scoring/${employeeId}`)
        return response.data
      } catch (error) {
        console.error('Ошибка получения скоринга сотрудника:', error)
        return { total_scoring: 0, scoring_by_department: [] }
      }
    }
  }
})

