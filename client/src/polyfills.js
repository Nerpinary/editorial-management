// Полифиллы для совместимости со старыми версиями Node.js

// Полифилл для crypto.getRandomValues
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = {}
}

if (typeof globalThis.crypto.getRandomValues === 'undefined') {
  try {
    const crypto = require('crypto')
    globalThis.crypto.getRandomValues = function(array) {
      return crypto.randomFillSync(array)
    }
  } catch (e) {
    // Fallback для браузеров
    globalThis.crypto.getRandomValues = function(array) {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256)
      }
      return array
    }
  }
}

// Полифилл для global
if (typeof global === 'undefined') {
  global = globalThis
}
