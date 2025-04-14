/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './index.html',        // or wherever your index.html is
      './src/**/*.{js,jsx}', // include all JS/JSX in /src
    ],
    theme: {
      extend: {
        keyframes: {
          marquee: {
            '0%': { transform: 'translateX(100%)' },
            '100%': { transform: 'translateX(-100%)' },
          },
        },
        animation: {
          marquee: 'marquee 10s linear infinite',
        },
      },
    },
    plugins: [],
  }
  