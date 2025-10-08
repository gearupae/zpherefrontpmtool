/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      borderRadius: {
        none: '0px',
        sm: '8px',
        DEFAULT: '10px',
        md: '12px',
        lg: '7px',
        xl: '16px',
        '2xl': '24px',
        full: '9999px',
      },
      colors: {
        // Base UI Colors - Professional Grayscale (User Specifications)
        background: '#F9FAFB', // Light gray/off-white background
        surface: '#FFFFFF',    // Pure white for cards and surfaces
        border: '#E5E7EB',     // Light gray borders
        // Piano black palette for subtle, consistent accents
        piano: {
          DEFAULT: '#0b0b0b',
          700: '#161616',
          800: '#111111',
          900: '#0b0b0b',
        },
        text: {
          primary: '#0b0b0b',   // Piano black primary text
          secondary: '#111111', // Slightly softer black for secondary
          muted: '#161616',     // Muted near-black
          button: '#0d0d0d',    // Very dark gray/black for buttons
        },
        
        // Direct color mappings for exact user specifications
        'user-blue': '#3B82F6',    // Blue → Info
        'user-green': '#10B981',   // Green → Completed/Success  
        'user-red': '#EF4444',     // Red → Urgent/Error
        'user-yellow': '#F59E0B',  // Yellow → Warning/In Progress
        'user-purple': '#8B5CF6',  // Purple → Custom/Special
        
        // Accent Colors for Tags/Metrics
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3B82F6',  // Blue (#3B82F6) → Info
          600: '#3B82F6',  // Use same blue for consistency
          700: '#2563eb',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10B981',  // Green (#10B981) → Completed/Success
          600: '#10B981',  // Use same green for consistency
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#EF4444',  // Red (#EF4444) → Urgent/Error
          600: '#EF4444',  // Use same red for consistency
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#F59E0B',  // Yellow (#F59E0B) → Warning/In Progress
          600: '#F59E0B',  // Use same yellow for consistency
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        info: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#3b82f6',  // Blue for info
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        purple: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#8B5CF6',  // Purple (#8B5CF6) → Custom/Special
          600: '#8B5CF6',  // Use same purple for consistency
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        
        // Legacy color mappings for backward compatibility
        secondary: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'Ubuntu',
          'Cantarell',
          'Liberation Sans',
          'sans-serif',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'Segoe UI Symbol',
          'Noto Color Emoji',
        ],
      },
      fontSize: {
        'xs': ['0.875rem', { lineHeight: '1.5' }],     // Increased from 0.75rem
        'sm': ['1rem', { lineHeight: '1.5' }],         // Increased from 0.875rem
        'base': ['1.125rem', { lineHeight: '1.6' }],   // Increased from 1rem
        'lg': ['1.25rem', { lineHeight: '1.6' }],      // Increased from 1.125rem
        'xl': ['1.375rem', { lineHeight: '1.6' }],     // Increased from 1.25rem
        '2xl': ['1.625rem', { lineHeight: '1.6' }],    // Increased from 1.5rem
        '3xl': ['2rem', { lineHeight: '1.5' }],        // Increased from 1.875rem
        '4xl': ['2.5rem', { lineHeight: '1.4' }],      // Increased from 2.25rem
        '5xl': ['3.25rem', { lineHeight: '1.3' }],     // Increased from 3rem
        '6xl': ['4rem', { lineHeight: '1.2' }],        // Increased from 3.75rem
        '7xl': ['5rem', { lineHeight: '1.1' }],        // Increased from 4.5rem
        '8xl': ['6.5rem', { lineHeight: '1.0' }],      // Increased from 6rem
        '9xl': ['8.5rem', { lineHeight: '1.0' }],      // Increased from 8rem
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
