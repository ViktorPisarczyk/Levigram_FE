import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./features/auth/authSlice";
import themeReducer from "./features/theme/themeSlice";
import postReducer from "../components/Post/postSlice";
import uiReducer from "../redux/uiSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    theme: themeReducer,
    posts: postReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
