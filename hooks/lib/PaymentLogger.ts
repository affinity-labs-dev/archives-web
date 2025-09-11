// Payment debugging utility for comprehensive logging and error tracking
export class PaymentLogger {
  static log(phase: string, message: string, data?: any) {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] 💳 ${phase}: ${message}`)
    if (data) {
      console.log(`[${timestamp}] 📊 Data:`, JSON.stringify(data, null, 2))
    }
  }
  
  static error(phase: string, message: string, error?: any) {
    const timestamp = new Date().toISOString()
    console.error(`[${timestamp}] ❌ ${phase}: ${message}`)
    if (error) {
      console.error(`[${timestamp}] 🚨 Error Details:`, error)
      if (error.stack) {
        console.error(`[${timestamp}] 📚 Stack:`, error.stack)
      }
    }
  }
  
  static success(phase: string, message: string, data?: any) {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] ✅ ${phase}: ${message}`)
    if (data) {
      console.log(`[${timestamp}] 📈 Success Data:`, data)
    }
  }
  
  static warn(phase: string, message: string, data?: any) {
    const timestamp = new Date().toISOString()
    console.warn(`[${timestamp}] ⚠️ ${phase}: ${message}`)
    if (data) {
      console.warn(`[${timestamp}] ⚠️ Warning Data:`, data)
    }
  }
  
  // Helper method to safely log sensitive data (removes sensitive fields)
  static logSafeData(phase: string, message: string, data: any) {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] 💳 ${phase}: ${message}`)
    
    if (data) {
      // Create safe copy by removing sensitive fields
      const safeData = { ...data }
      const sensitiveFields = ['client_secret', 'secret', 'key', 'token', 'password']
      
      const removeSensitiveData = (obj: any) => {
        if (typeof obj === 'object' && obj !== null) {
          for (const key in obj) {
            if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
              obj[key] = '[REDACTED]'
            } else if (typeof obj[key] === 'object') {
              removeSensitiveData(obj[key])
            }
          }
        }
      }
      
      removeSensitiveData(safeData)
      console.log(`[${timestamp}] 📊 Safe Data:`, JSON.stringify(safeData, null, 2))
    }
  }
}