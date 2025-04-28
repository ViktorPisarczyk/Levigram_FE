import React, { useState, useEffect, useRef } from "react";

import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../redux/store";
import {
  togglePostForm,
  toggleProfileEdit,
  toggleSearchForm,
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
import { CiLight } from "react-icons/ci";
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

  const [recentlyClosed, setRecentlyClosed] = useState(false);
  const prevIsSearchFormOpen = useRef(isSearchFormOpen);

  useEffect(() => {
    if (prevIsSearchFormOpen.current && !isSearchFormOpen) {
      setRecentlyClosed(true);
      setTimeout(() => setRecentlyClosed(false), 300);
    }
    prevIsSearchFormOpen.current = isSearchFormOpen;
  }, [isSearchFormOpen]);

  const handleSearchClick = () => {
    if (recentlyClosed) return;
    dispatch(toggleSearchForm());
  };

  return (
    <nav className="bottom-nav">
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
        onClick={() => dispatch(togglePostForm())}
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
        ref={profileButtonRef}
        onClick={() => dispatch(toggleProfileEdit())}
        className="nav-button"
        aria-label="Profile"
      >
        <CgProfile />
      </button>
    </nav>
  );
};

export default Navigation;
