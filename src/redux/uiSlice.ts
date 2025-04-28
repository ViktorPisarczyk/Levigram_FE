import { createSlice } from "@reduxjs/toolkit";

interface UIState {
  isPostFormOpen: boolean;
  isProfileEditOpen: boolean;
  isSearchFormOpen: boolean;
}

const initialState: UIState = {
  isPostFormOpen: false,
  isProfileEditOpen: false,
  isSearchFormOpen: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    openPostForm(state) {
      state.isPostFormOpen = true;
    },
    closePostForm(state) {
      state.isPostFormOpen = false;
    },
    togglePostForm: (state) => {
      state.isPostFormOpen = !state.isPostFormOpen;
    },
    toggleProfileEdit(state) {
      state.isProfileEditOpen = !state.isProfileEditOpen;
    },
    closeProfileEdit(state) {
      state.isProfileEditOpen = false;
    },
    toggleSearchForm(state) {
      state.isSearchFormOpen = !state.isSearchFormOpen;
    },
    closeSearchForm(state) {
      state.isSearchFormOpen = false;
    },
  },
});

export const {
  openPostForm,
  closePostForm,
  togglePostForm,
  toggleProfileEdit,
  closeProfileEdit,
  toggleSearchForm,
  closeSearchForm,
} = uiSlice.actions;
export default uiSlice.reducer;
