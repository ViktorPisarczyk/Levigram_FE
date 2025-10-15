import React, { useEffect, useRef, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../redux/store";
import { useGetFeedQuery, useLazySearchPostsQuery } from "../../redux/apiSlice";
import type { FeedItem } from "../../types/models";

import "./HomePage.scss";
import Navigation from "../../components/Navigation/Navigation";
import PostCreateForm from "../../components/Post/PostCreateForm";
import ProfileEditForm from "../../components/ProfileEditForm/ProfileEditForm";
import {
  closePostForm,
  closeProfileEdit,
  closeSearchForm,
} from "../../redux/uiSlice";
import SearchForm from "../../components/SearchForm/SearchForm";
import PostComponent from "../../components/Post/Post";

const Home: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isPostFormOpen, isProfileEditOpen, isSearchFormOpen } = useSelector(
    (s: RootState) => s.ui
  );

  // Refs für Navigation (Pflicht-Props)
  const postButtonRef = useRef<HTMLButtonElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  // Logo / Scroll
  const scrollTopRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  // Paging & Aggregation
  const [page, setPage] = useState(1);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const { data, isFetching } = useGetFeedQuery({ page });
  const [hasMore, setHasMore] = useState(true);

  // Suche
  const [triggerSearch, searchResult] = useLazySearchPostsQuery();
  const [searchActive, setSearchActive] = useState(false);
  const [searchItems, setSearchItems] = useState<FeedItem[]>([]);

  // IO für Infinite-Scroll
  const observer = useRef<IntersectionObserver | null>(null);
  const handleObserver = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetching || searchActive || !hasMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((p) => p + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [isFetching, searchActive, hasMore]
  );

  // Aggregiere Feed pro Seite
  useEffect(() => {
    if (!data) return;
    setFeedItems((prev) => {
      const map = new Map(prev.map((p) => [p._id, p]));
      for (const it of data.items) map.set(it._id, it);
      return Array.from(map.values());
    });
    setHasMore(data.hasMore);
  }, [data]);

  // Body-Klasse für Overlay-Status
  useEffect(() => {
    const hasOverlay = isPostFormOpen || isProfileEditOpen || isSearchFormOpen;
    const root = document.documentElement;
    root.classList.toggle("ui-overlay-open", !!hasOverlay);
    return () => root.classList.remove("ui-overlay-open");
  }, [isPostFormOpen, isProfileEditOpen, isSearchFormOpen]);

  // Suche ausführen (aus SearchForm)
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchActive(false);
      setSearchItems([]);
      return;
    }
    setSearchActive(true);
    const res = await triggerSearch({ q: query })
      .unwrap()
      .catch(() => []);
    setSearchItems(Array.isArray(res) ? res : []);
  };

  const currentList = searchActive ? searchItems : feedItems;

  return (
    <div className="home-page">
      <div ref={scrollTopRef} />
      <div ref={logoRef} className="logo" />

      {/* Feed */}
      <div className="post-feed">
        {currentList.map((post, idx) => {
          const isLast = !searchActive && idx === currentList.length - 1;
          return (
            <div key={post._id} ref={isLast ? handleObserver : null}>
              <PostComponent post={post} />
            </div>
          );
        })}
        {isFetching && !searchActive && <p>Loading posts...</p>}
        {!isFetching && searchActive && currentList.length === 0 && (
          <p>No posts found for your search.</p>
        )}
      </div>

      <Navigation
        postButtonRef={postButtonRef}
        profileButtonRef={profileButtonRef}
        onHomeClick={() => {
          setSearchActive(false);
          setSearchItems([]);
          scrollTopRef.current?.scrollIntoView({ behavior: "smooth" });
        }}
        onToggleDarkMode={() => {
          document.body.classList.toggle("dark");
          localStorage.setItem(
            "theme",
            document.body.classList.contains("dark") ? "dark" : "light"
          );
        }}
      />

      {isPostFormOpen && (
        <>
          <div
            className="blur-overlay"
            onClick={(e) => {
              e.stopPropagation();
              dispatch(closePostForm());
            }}
          />

          <PostCreateForm onClose={() => dispatch(closePostForm())} />
        </>
      )}

      {isProfileEditOpen && (
        <>
          <div
            className="blur-overlay"
            onClick={(e) => {
              e.stopPropagation();
              dispatch(closeProfileEdit());
            }}
          />
          <ProfileEditForm onClose={() => dispatch(closeProfileEdit())} />
        </>
      )}

      {isSearchFormOpen && (
        <>
          <div
            className="blur-overlay"
            onClick={(e) => {
              e.stopPropagation();
              dispatch(closeSearchForm());
            }}
          />
          <SearchForm
            onClose={() => dispatch(closeSearchForm())}
            onSearch={handleSearch}
          />
        </>
      )}
    </div>
  );
};

export default Home;
