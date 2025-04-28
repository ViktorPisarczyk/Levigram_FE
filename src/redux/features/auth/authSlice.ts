import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { NavigateFunction } from "react-router-dom";
import { RootState } from "../../store";

const API_URL = "http://localhost:5001";

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
  token: string | null;
  user: User | null;
  formData: FormData;
  alert: {
    show: boolean;
    message: string;
    isSuccess: boolean;
  };
  loading: boolean;
  error: string | null;
}

// ==== Initial State ====

const initialState: AuthState = {
  isLogin: true,
  isAuthenticated: false,
  token: null,
  user: null,
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
};

// ==== Async Thunks ====

export const login = createAsyncThunk<
  { user: User; token: string },
  { formData: FormData; navigate: NavigateFunction },
  { rejectValue: string }
>("auth/login", async ({ formData, navigate }, thunkAPI) => {
  try {
    const response = await fetch(`${API_URL}/users/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: formData.email,
        password: formData.password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return thunkAPI.rejectWithValue(data.message || "Login failed");
    }

    localStorage.setItem("token", data.token);

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
    const response = await fetch(`${API_URL}/users/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (!response.ok) {
      return thunkAPI.rejectWithValue(data.message || "Signup failed");
    }

    localStorage.setItem("token", data.token);

    thunkAPI.dispatch(
      setAlert({ show: true, message: "Signup successful!", isSuccess: true })
    );

    setTimeout(() => navigate("/login"), 1000);
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const loadUserFromLocalStorage = createAsyncThunk(
  "auth/loadUser",
  async (_, thunkAPI) => {
    const token = localStorage.getItem("token");

    if (!token) {
      return thunkAPI.rejectWithValue("No token found");
    }

    try {
      const res = await fetch(`${API_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Token invalid or expired");
      }

      const data = await res.json();

      return { user: data.user, token };
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

export const updateProfileAsync = createAsyncThunk<
  { user: User },
  { username: string; profilePicture?: string },
  { state: RootState; rejectValue: string }
>("auth/updateProfile", async ({ username, profilePicture }, thunkAPI) => {
  try {
    const token = localStorage.getItem("token");
    const state = thunkAPI.getState();
    const userId = state.auth.user?._id;

    if (!userId) return thunkAPI.rejectWithValue("Kein User ID");

    const res = await fetch(`http://localhost:5001/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ username, profilePicture }),
    });

    const data = await res.json();

    if (!res.ok) {
      return thunkAPI.rejectWithValue(data.message || "Update fehlgeschlagen");
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
      localStorage.removeItem("token");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.alert = { show: false, message: "", isSuccess: true };
      })
      .addCase(login.rejected, (state, action) => {
        state.alert = {
          show: true,
          message: action.payload || "Login failed.",
          isSuccess: false,
        };
      })
      .addCase(signup.rejected, (state, action) => {
        const message =
          action.payload?.includes("E11000") ||
          action.payload?.includes("duplicate")
            ? "This email is already in use."
            : action.payload || "Signup failed.";
        state.alert = {
          show: true,
          message,
          isSuccess: false,
        };
      })
      .addCase(loadUserFromLocalStorage.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(updateProfileAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfileAsync.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.loading = false;
      })
      .addCase(updateProfileAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Etwas ist schiefgelaufen";
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
