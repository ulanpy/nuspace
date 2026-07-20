const withAlpha = (variable) => `oklch(var(${variable}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: withAlpha("--border"),
        input: withAlpha("--input"),
        ring: withAlpha("--ring"),
        background: withAlpha("--background"),
        foreground: withAlpha("--foreground"),
        primary: {
          DEFAULT: withAlpha("--primary"),
          foreground: withAlpha("--primary-foreground"),
        },
        secondary: {
          DEFAULT: withAlpha("--secondary"),
          foreground: withAlpha("--secondary-foreground"),
        },
        success: {
          DEFAULT: withAlpha("--success"),
          foreground: withAlpha("--success-foreground"),
        },
        community: withAlpha("--community"),
        contact: withAlpha("--contact"),
        warning: {
          DEFAULT: withAlpha("--warning"),
          foreground: withAlpha("--warning-foreground"),
        },
        destructive: {
          DEFAULT: withAlpha("--destructive"),
          foreground: withAlpha("--destructive-foreground"),
        },
        disabled: {
          DEFAULT: withAlpha("--disabled"),
          foreground: withAlpha("--disabled-foreground"),
        },
        muted: {
          DEFAULT: withAlpha("--muted"),
          foreground: withAlpha("--muted-foreground"),
        },
        accent: {
          DEFAULT: withAlpha("--accent"),
          foreground: withAlpha("--accent-foreground"),
        },
        popover: {
          DEFAULT: withAlpha("--popover"),
          foreground: withAlpha("--popover-foreground"),
        },
        card: {
          DEFAULT: withAlpha("--card"),
          foreground: withAlpha("--card-foreground"),
        },
      },
      borderRadius: {
        lg: "var(--radius-panel)",
        md: "var(--radius-control)",
        sm: "calc(var(--radius-control) - 2px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        ".no-scrollbar": {
          /* Firefox */
          scrollbarWidth: "none",
          /* Safari және Chrome */
          "&::-webkit-scrollbar": {
            display: "none",
          },
        },
      });
    },
    require("tailwindcss-animate"),
  ],
};
