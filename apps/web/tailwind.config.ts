import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canopy: {
          50: '#f1f8f3',
          100: '#dcecdf',
          200: '#b9d8c0',
          300: '#8fbf9a',
          400: '#65a578',
          500: '#3f8a58',
          600: '#2e6f44',
          700: '#245735',
          800: '#1c4429',
          900: '#143020',
        },
        risk: {
          low: '#3f8a58',
          moderate: '#d9a13b',
          high: '#d96a3b',
          extreme: '#b53a2d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
};

export default config;
