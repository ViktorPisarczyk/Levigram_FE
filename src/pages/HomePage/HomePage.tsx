import React, { useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../redux/store";
import {
  fetchPostsAsync,
  setSearchResults,
  clearSearchResults,
} from "../../components/Post/postSlice";
import PostComponent from "../../components/Post/Post";
import "./HomePage.scss";
import Navigation from "../../components/Navigation/Navigation";
import PostCreateForm from "../../components/Post/PostCreateForm";
import ProfileEditForm from "../../components/ProfileEditForm/ProfileEditForm";
import {
  closePostForm,
  closeProfileEdit,
  toggleSearchForm,
} from "../../redux/uiSlice";
import SearchForm from "../../components/SearchForm/SearchForm";

const API_URL = import.meta.env.VITE_API_URL;

const Home: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { posts, hasMore, currentPage, loading, searchResults, searchActive } =
    useSelector((state: RootState) => state.posts);

  const { isPostFormOpen, isProfileEditOpen, isSearchFormOpen } = useSelector(
    (state: RootState) => state.ui
  );

  const observer = useRef<IntersectionObserver | null>(null);
  const postButtonRef = useRef<HTMLButtonElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  const isSearching = Array.isArray(searchResults) && searchResults.length > 0;
  const currentList = isSearching ? searchResults : posts;

  const handleSearch = async (query: string) => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(
        `${API_URL}/posts/search?query=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (res.ok) {
        const sortedPosts = data.sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        dispatch(setSearchResults(sortedPosts));
      } else {
        console.error(data.message);
      }
    } catch (error) {
      console.error("Fehler beim Suchen:", error);
    }
  };

  useEffect(() => {
    if (currentPage === 1 && posts.length === 0 && !loading) {
      dispatch(fetchPostsAsync(1));
    }
  }, [dispatch, posts.length, currentPage, loading]);

  const handleObserver = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading || searchActive) return;

      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          dispatch(fetchPostsAsync(currentPage + 1));
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, hasMore, dispatch, currentPage, searchActive]
  );

  const handleHomeClick = () => {
    dispatch(clearSearchResults());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="home-page">
      <div className="logo"></div>

      <div className="post-feed">
        {currentList.map((post, index) => {
          const isLast = index === currentList.length - 1;
          return (
            <div
              key={post._id}
              ref={isLast && !searchActive ? handleObserver : null}
            >
              <PostComponent postId={post._id} />
            </div>
          );
        })}

        {loading && !searchActive && <p>Loading posts...</p>}

        {!loading && searchActive && currentList.length === 0 && (
          <p>No posts found for your search.</p>
        )}
      </div>

      <Navigation
        onHomeClick={handleHomeClick}
        onToggleDarkMode={() => {
          document.body.classList.toggle("dark");
          localStorage.setItem(
            "theme",
            document.body.classList.contains("dark") ? "dark" : "light"
          );
        }}
        postButtonRef={postButtonRef}
        profileButtonRef={profileButtonRef}
      />

      {isPostFormOpen && (
        <>
          <div className="blur-overlay"></div>
          <PostCreateForm
            onClose={() => dispatch(closePostForm())}
            triggerRef={postButtonRef as React.RefObject<HTMLElement>}
          />
        </>
      )}

      {isProfileEditOpen && (
        <>
          <div className="blur-overlay"></div>
          <ProfileEditForm
            onClose={() => dispatch(closeProfileEdit())}
            triggerRef={profileButtonRef}
          />
        </>
      )}

      {isSearchFormOpen && (
        <>
          <div className="blur-overlay"></div>
          <SearchForm
            onClose={() => {
              if (isSearchFormOpen) {
                dispatch(toggleSearchForm());
              }
            }}
            onSearch={handleSearch}
          />
        </>
      )}
    </div>
  );
};

export default Home;
