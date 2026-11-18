/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Pretendard Variable"',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Roboto',
          '"Helvetica Neue"',
          '"Segoe UI"',
          '"Apple SD Gothic Neo"',
          '"Noto Sans KR"',
          '"Malgun Gothic"',
          'sans-serif',
        ],
      },
      colors: {
        canvas: '#F7F8FA',
        surface: '#FFFFFF',
        ink: {
          primary: '#111827',
          secondary: '#4B5563',
          muted: '#6B7280',
        },
        accent: {
          DEFAULT: '#F04438',
          hover: '#D92D20',
          soft: '#FEF3F2',
          border: '#FECDCA',
        },
      },
    },
  },
  plugins: [],
};
