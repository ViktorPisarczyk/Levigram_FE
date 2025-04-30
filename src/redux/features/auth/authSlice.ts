import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { NavigateFunction } from "react-router-dom";
import { RootState } from "../../store";

// ==== Types ====

interface User {
  _id: string;
  username: string;
  email: string;
  profilePicture?: string;
}

interface FormData {
  email: string;
  password: string;
  username: string;
  inviteCode?: string;
}

interface AuthState {
  isLogin: boolean;
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  formData: FormData;
  alert: {
    show: boolean;
    message: string;
    isSuccess: boolean;
  };
  loading: boolean;
  error: string | null;
  status: "idle" | "loading" | "succeeded" | "failed";
}

// ==== Initial State ====

const initialState: AuthState = {
  isLogin: true,
  isAuthenticated: false,
  user: null,
  token: null,
  formData: {
    email: "",
    password: "",
    username: "",
  },
  alert: {
    show: false,
    message: "",
    isSuccess: true,
  },
  loading: false,
  error: null,
  status: "idle",
};

// ==== Async Thunks ====

export const login = createAsyncThunk<
  { user: User; token: string },
  { formData: FormData; navigate: NavigateFunction },
  { rejectValue: string }
>("auth/login", async ({ formData, navigate }, thunkAPI) => {
  try {
    const response = await fetch(`/users/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        email: formData.email,
        password: formData.password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return thunkAPI.rejectWithValue(data.message || "Login failed");
    }

    navigate("/home");
    return { user: data.user, token: data.token };
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const signup = createAsyncThunk<
  void,
  { formData: FormData; navigate: NavigateFunction },
  { rejectValue: string }
>("auth/signup", async ({ formData, navigate }, thunkAPI) => {
  try {
    const response = await fetch(`/users/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (!response.ok) {
      return thunkAPI.rejectWithValue(data.message || "Signup failed");
    }

    thunkAPI.dispatch(
      setAlert({ show: true, message: "Signup successful!", isSuccess: true })
    );

    navigate("/login");
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const checkAuthAsync = createAsyncThunk<
  User,
  void,
  { state: RootState; rejectValue: string }
>("auth/checkAuth", async (_, thunkAPI) => {
  try {
    const res = await fetch("/users/me", {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) throw new Error("Not authenticated");
    const user = await res.json();
    return user;
  } catch (err) {
    return thunkAPI.rejectWithValue("Not authenticated");
  }
});

export const updateProfileAsync = createAsyncThunk<
  { user: User },
  { username: string; profilePicture?: string },
  { state: RootState; rejectValue: string }
>("auth/updateProfile", async ({ username, profilePicture }, thunkAPI) => {
  try {
    const state = thunkAPI.getState();
    const userId = state.auth.user?._id;

    if (!userId) {
      return thunkAPI.rejectWithValue("User ID missing");
    }

    const response = await fetch(`/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ username, profilePicture }),
    });

    const data = await response.json();

    if (!response.ok) {
      return thunkAPI.rejectWithValue(data.message || "Update failed");
    }

    return { user: data.user };
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

// ==== Slice ====

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    toggleLoginMode(state) {
      state.isLogin = !state.isLogin;
    },
    updateFormField(
      state,
      action: PayloadAction<{ name: string; value: string }>
    ) {
      const { name, value } = action.payload;
      state.formData[name as keyof FormData] = value;
    },
    setAlert(
      state,
      action: PayloadAction<{
        show: boolean;
        message: string;
        isSuccess: boolean;
      }>
    ) {
      state.alert = action.payload;
    },
    clearAlert(state) {
      state.alert = { show: false, message: "", isSuccess: true };
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.status = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.status = "succeeded";
      })
      .addCase(login.rejected, (state, action) => {
        state.alert = {
          show: true,
          message: action.payload || "Login failed",
          isSuccess: false,
        };
        state.status = "failed";
      })
      .addCase(signup.rejected, (state, action) => {
        state.alert = {
          show: true,
          message: action.payload || "Signup failed",
          isSuccess: false,
        };
      })
      .addCase(checkAuthAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkAuthAsync.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.status = "succeeded";
        state.loading = false;
      })
      .addCase(checkAuthAsync.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.status = "failed";
        state.loading = false;
      })
      .addCase(updateProfileAsync.fulfilled, (state, action) => {
        state.user = action.payload.user;
      });
  },
});

// ==== Exports ====

export const {
  toggleLoginMode,
  updateFormField,
  setAlert,
  clearAlert,
  logout,
} = authSlice.actions;

export default authSlice.reducer;
