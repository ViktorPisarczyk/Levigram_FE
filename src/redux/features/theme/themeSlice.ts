import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ThemeState {
  darkMode: boolean;
}

const isBrowser = typeof window !== "undefined";

const initialState: ThemeState = {
  darkMode: isBrowser
    ? JSON.parse(localStorage.getItem("darkMode") || "false")
    : false,
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    toggleDarkMode(state) {
      state.darkMode = !state.darkMode;
      if (isBrowser) {
        localStorage.setItem("darkMode", JSON.stringify(state.darkMode));
      }
    },
    setDarkMode(state, action: PayloadAction<boolean>) {
      state.darkMode = action.payload;
      if (isBrowser) {
        localStorage.setItem("darkMode", JSON.stringify(state.darkMode));
      }
    },
  },
});

export const { toggleDarkMode, setDarkMode } = themeSlice.actions;
export default themeSlice.reducer;
