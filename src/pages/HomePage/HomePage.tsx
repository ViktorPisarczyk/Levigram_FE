import React, { useEffect, useRef, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../redux/store";
import {
  fetchPostsAsync,
  setSearchResults,
  clearSearchResults,
  resetPosts,
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

const Home: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { posts, hasMore, currentPage, loading, searchResults, searchActive } =
    useSelector((state: RootState) => state.posts);
  const { isPostFormOpen, isProfileEditOpen, isSearchFormOpen } = useSelector(
    (state: RootState) => state.ui
  );

  const isSearching = Array.isArray(searchResults) && searchResults.length > 0;
  const currentList = isSearching ? searchResults : posts;

  const observer = useRef<IntersectionObserver | null>(null);
  const scrollTopRef = useRef<HTMLDivElement>(null);
  const postButtonRef = useRef<HTMLButtonElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  const [startY, setStartY] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startY === null) return;
    const endY = e.changedTouches[0].clientY;
    const distance = endY - startY;

    if (distance > 60 && !loading) {
      setIsRefreshing(true);
      dispatch(resetPosts());
      dispatch(fetchPostsAsync(1)).finally(() => {
        setTimeout(() => setIsRefreshing(false), 500);
      });
    }

    setStartY(null);
  };

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

  useEffect(() => {
    if (currentPage === 1 && posts.length === 0 && !loading) {
      dispatch(fetchPostsAsync(1));
    }
  }, [dispatch, posts.length, currentPage, loading]);

  const handleSearch = async (query: string) => {
    try {
      const res = await fetch(
        `/posts/search?query=${encodeURIComponent(query)}`,
        {
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      const data = await res.json();
      if (res.ok) {
        const sorted = data.sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        dispatch(setSearchResults(sorted));
      } else {
        console.error(data.message);
      }
    } catch (err) {
      console.error("Fehler beim Suchen:", err);
    }
  };

  const handleHomeClick = () => {
    dispatch(clearSearchResults());
    scrollTopRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      className="home-page"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div ref={scrollTopRef}></div>

      {isRefreshing && (
        <div className="refresh-indicator">
          <div className="spinner" />
        </div>
      )}

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
            onClose={() => dispatch(toggleSearchForm())}
            onSearch={handleSearch}
          />
        </>
      )}
    </div>
  );
};

export default Home;
