import React, { useState, useEffect, useLayoutEffect, useRef } from "react";

import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../redux/store";
import {
  togglePostForm,
  toggleProfileEdit,
  toggleSearchForm,
  openPostForm,
  closePostForm,
  openProfileEdit,
  closeProfileEdit,
  openSearchForm,
  closeSearchForm,
} from "../../redux/uiSlice";

import { toggleDarkMode } from "../../redux/features/theme/themeSlice";

import "./Navigation.scss";

import {
  IoHomeOutline,
  IoSearchOutline,
  IoMoonOutline,
  IoSunnyOutline,
} from "react-icons/io5";
import { IoIosAddCircleOutline } from "react-icons/io";
import { CgProfile } from "react-icons/cg";

interface NavigationProps {
  onHomeClick: () => void;
  onToggleDarkMode: () => void;
  postButtonRef: React.RefObject<HTMLButtonElement | null>;
  profileButtonRef: React.RefObject<HTMLButtonElement | null>;
}

const Navigation: React.FC<NavigationProps> = ({
  onHomeClick,
  onToggleDarkMode,
  postButtonRef,
  profileButtonRef,
}) => {
  const dispatch = useDispatch();
  const darkMode = useSelector((state: RootState) => state.theme.darkMode);
  const isSearchFormOpen = useSelector(
    (state: RootState) => state.ui.isSearchFormOpen
  );
  const isPostFormOpen = useSelector(
    (state: RootState) => state.ui.isPostFormOpen
  );
  const isProfileEditOpen = useSelector(
    (state: RootState) => state.ui.isProfileEditOpen
  );

  const handleSearchClick = () => {
    if (isSearchFormOpen) {
      dispatch(closeSearchForm());
    } else {
      dispatch(openSearchForm());
    }
  };
  const handlePostClick = () => {
    if (isPostFormOpen) {
      dispatch(closePostForm());
    } else {
      dispatch(openPostForm());
    }
  };
  const handleProfileClick = () => {
    if (isProfileEditOpen) {
      dispatch(closeProfileEdit());
    } else {
      dispatch(openProfileEdit());
    }
  };

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav__row">
        <button onClick={onHomeClick} className="nav-button" aria-label="Home">
          <IoHomeOutline />
        </button>
        <button
          onClick={handleSearchClick}
          className="nav-button"
          aria-label="Search"
        >
          <IoSearchOutline />
        </button>

        <button
          ref={postButtonRef}
          onClick={handlePostClick}
          className="post-button"
          aria-label="Post"
        >
          <IoIosAddCircleOutline />
        </button>
        <button
          onClick={() => dispatch(toggleDarkMode())}
          className="nav-button"
          aria-label="Toggle Dark Mode"
        >
          {darkMode ? <IoSunnyOutline /> : <IoMoonOutline />}
        </button>
        <button
          onClick={handleProfileClick}
          ref={profileButtonRef}
          className="nav-button"
          aria-label="Profile"
        >
          <CgProfile />
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
