import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./features/auth/authSlice";
import themeReducer from "./features/theme/themeSlice";
import uiReducer from "./uiSlice";
import { postsApi } from "../redux/apiSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    theme: themeReducer,
    ui: uiReducer,
    [postsApi.reducerPath]: postsApi.reducer, // RTK Query
  },
  middleware: (getDefault) => getDefault().concat(postsApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
