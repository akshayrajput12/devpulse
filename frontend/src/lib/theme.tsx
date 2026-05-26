import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
type Ctx = { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void };

const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("dp-theme")) as Theme | null;
    const initial: Theme = stored ?? "light";
    setThemeState(initial);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    root.style.colorScheme = theme;
    localStorage.setItem("dp-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle: () => setThemeState(t => t === "dark" ? "light" : "dark"), setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const c = useContext(ThemeContext);
  if (!c) return { theme: "light" as Theme, toggle: () => {}, setTheme: () => {} };
  return c;
}

// Inline script to apply theme before paint (avoids FOUC)
export const themeBootScript = `(function(){try{var t=localStorage.getItem('dp-theme');if(!t){t='light';}document.documentElement.classList.add(t);document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.classList.add('light');}})();`;
