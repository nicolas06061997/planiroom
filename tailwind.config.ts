import type { Config } from "tailwindcss";

/**
 * Couleurs et styles de l'appli. Modifier ici change tout l'écran.
 * Tailwind 3 : compatible avec les téléphones anciens (iOS 14+, Android récent ou pas).
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', "Inter", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Roboto", "sans-serif"],
      },
      colors: {
        fond: "#F5F6F8",
        carte: "#FFFFFF",
        bord: "#E6E8EC",
        encre: "#0F172A",
        texte: "#374151",
        doux: "#6B7280",
        pale: "#9CA3AF",
        primaire: { DEFAULT: "#0F766E", fonce: "#115E59", nuit: "#0B4F4A", clair: "#E6F4F2", moyen: "#CCE9E5" },
        conge: { DEFAULT: "#EA580C", clair: "#FFF4EC" },
        depart: { DEFAULT: "#B91C1C", clair: "#FDECEC" },
        arrivee: { DEFAULT: "#1D4ED8", clair: "#EBF1FE" },
        raff: { DEFAULT: "#047857", clair: "#E8F6F0" },
      },
      spacing: {
        "0.75": "0.1875rem",
        "4.5": "1.125rem",
        "5.5": "1.375rem",
        "6.5": "1.625rem",
        "13": "3.25rem",
        "15": "3.75rem",
        "18": "4.5rem",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      borderWidth: { "3": "3px" },
      ringWidth: { "3": "3px" },
      boxShadow: {
        carte: "0 1px 2px rgba(16,24,40,0.04), 0 2px 8px rgba(16,24,40,0.05)",
        flottant: "0 10px 30px rgba(16,24,40,0.14), 0 2px 8px rgba(16,24,40,0.06)",
        nav: "0 -4px 24px rgba(16,24,40,0.06)",
        bouton: "0 6px 16px rgba(15,118,110,0.28)",
      },
      keyframes: {
        apparition: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
        monte: { from: { transform: "translateY(100%)" }, to: { transform: "none" } },
        fondu: { from: { opacity: "0" }, to: { opacity: "1" } },
        pop: { "0%": { transform: "scale(1)" }, "40%": { transform: "scale(1.18)" }, "100%": { transform: "scale(1)" } },
      },
      animation: {
        apparition: "apparition 260ms cubic-bezier(0.2,0.8,0.2,1) both",
        monte: "monte 300ms cubic-bezier(0.2,0.8,0.2,1) both",
        fondu: "fondu 200ms ease-out both",
        pop: "pop 280ms ease-out",
      },
      screens: { xs: "380px" },
    },
  },
  plugins: [],
};

export default config;
