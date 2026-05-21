export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#2F2BFF', dark: '#070B2D', light: '#F7F8FC' },
        primary: '#2F2BFF',
        'primary-foreground': '#ffffff',
        foreground: '#070B2D',
        muted: '#F7F8FC',
        border: '#E5E7EB',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
