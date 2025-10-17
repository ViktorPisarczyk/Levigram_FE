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
      state.isProfileEditOpen = false;
      state.isSearchFormOpen = false;
    },
    closePostForm(state) {
      state.isPostFormOpen = false;
    },
    togglePostForm(state) {
      if (state.isPostFormOpen) {
        state.isPostFormOpen = false;
      } else {
        state.isPostFormOpen = true;
        state.isProfileEditOpen = false;
        state.isSearchFormOpen = false;
      }
    },
    openProfileEdit(state) {
      state.isProfileEditOpen = true;
      state.isPostFormOpen = false;
      state.isSearchFormOpen = false;
    },
    closeProfileEdit(state) {
      state.isProfileEditOpen = false;
    },
    toggleProfileEdit(state) {
      if (state.isProfileEditOpen) {
        state.isProfileEditOpen = false;
      } else {
        state.isProfileEditOpen = true;
        state.isPostFormOpen = false;
        state.isSearchFormOpen = false;
      }
    },
    openSearchForm(state) {
      state.isSearchFormOpen = true;
      state.isPostFormOpen = false;
      state.isProfileEditOpen = false;
    },
    closeSearchForm(state) {
      state.isSearchFormOpen = false;
    },
    toggleSearchForm(state) {
      if (state.isSearchFormOpen) {
        state.isSearchFormOpen = false;
      } else {
        state.isSearchFormOpen = true;
        state.isPostFormOpen = false;
        state.isProfileEditOpen = false;
      }
    },
  },
});

export const {
  openPostForm,
  closePostForm,
  togglePostForm,
  openProfileEdit,
  closeProfileEdit,
  toggleProfileEdit,
  openSearchForm,
  toggleSearchForm,
  closeSearchForm,
} = uiSlice.actions;
export default uiSlice.reducer;
