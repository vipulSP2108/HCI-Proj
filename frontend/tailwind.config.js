module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#f5f7ff', 500: '#667eea', 600: '#5568d3', 700: '#4553b8' },
        secondary: { 50: '#faf5ff', 500: '#764ba2', 600: '#643d8a' },
        success: { 500: '#10b981', 600: '#059669' },
        warning: { 500: '#f59e0b', 600: '#d97706' },
        error: { 500: '#ef4444', 600: '#dc2626' }
      }
    }
  },
  plugins: []
}