import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThemeColors {
  bg: string;
  card: string;
  emerald: string;
  emeraldLight: string;
  gold: string;
  violet: string;
  cyan: string;
  text: string;
  textMuted: string;
  border: string;
  inputBg: string;
  danger: string;
}

export const lightColors: ThemeColors = {
  bg: "#F7F9FB",
  card: "#FFFFFF",
  emerald: "#0F5E3C",
  emeraldLight: "#134e2a",
  gold: "#0F5E3C",
  violet: "#0F5E3C",
  cyan: "#0F5E3C",
  text: "#111111",
  textMuted: "#667085",
  border: "#E6E9EF",
  inputBg: "#FFFFFF",
  danger: "#B42318",
};

export const darkColors: ThemeColors = {
  bg: "#0F172A",
  card: "#1E293B",
  emerald: "#10B981",
  emeraldLight: "#059669",
  gold: "#10B981",
  violet: "#10B981",
  cyan: "#10B981",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
  border: "#334155",
  inputBg: "#1E293B",
  danger: "#EF4444",
};

interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
  setDarkMode: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  colors: lightColors,
  toggleTheme: () => {},
  setDarkMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(false);

  const loadThemePreference = useCallback(async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('@theme');
      if (savedTheme !== null) {
        setIsDark(savedTheme === 'dark');
      } else {
        setIsDark(systemColorScheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  }, [systemColorScheme]);

  useEffect(() => {
    void loadThemePreference();
  }, [loadThemePreference]);

  const toggleTheme = async () => {
    const newValue = !isDark;
    setIsDark(newValue);
    try {
      await AsyncStorage.setItem('@theme', newValue ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const setDarkMode = async (value: boolean) => {
    setIsDark(value);
    try {
      await AsyncStorage.setItem('@theme', value ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
