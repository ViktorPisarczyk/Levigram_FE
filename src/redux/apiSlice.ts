import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { FeedItem, Post, Comment } from "../types/models";

// Hilfsfunktion: Medien normalisieren (String → {url})
const normalizePost = (p: any): FeedItem => ({
  ...p,
  media: Array.isArray(p.media)
    ? p.media.map((m: any) => (typeof m === "string" ? { url: m } : m))
    : [],
});

export const postsApi = createApi({
  reducerPath: "postsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/",
    credentials: "include",
  }),
  keepUnusedDataFor: 3600, // 1h Cache
  refetchOnFocus: false,
  refetchOnReconnect: false,
  tagTypes: ["FeedPage", "Post", "Comments", "Likes"],
  endpoints: (build) => ({
    // === FEED (paged) ===
    getFeed: build.query<
      { items: FeedItem[]; hasMore: boolean },
      { page: number }
    >({
      query: ({ page }) => `posts?page=${page}`,
      transformResponse: (resp: any) => ({
        items: Array.isArray(resp.posts) ? resp.posts.map(normalizePost) : [],
        hasMore: !!resp.hasMore,
      }),
      providesTags: (result, _err, { page }) =>
        result
          ? [
              ...result.items.map((p) => ({
                type: "Post" as const,
                id: p._id,
              })),
              { type: "FeedPage" as const, id: page },
            ]
          : [{ type: "FeedPage" as const, id: page }],
    }),

    // === Einzelner Post ===
    getPost: build.query<FeedItem, string>({
      query: (id) => `posts/${id}`,
      transformResponse: (resp: any) => normalizePost(resp),
      providesTags: (result) =>
        result ? [{ type: "Post", id: result._id }] : [],
    }),

    // === Suche ===
    searchPosts: build.query<FeedItem[], { q: string }>({
      query: ({ q }) => `posts/search?query=${encodeURIComponent(q)}`,
      transformResponse: (resp: any) =>
        Array.isArray(resp.items) ? resp.items.map(normalizePost) : [],
      keepUnusedDataFor: 120,
    }),

    // === Post erstellen ===
    createPost: build.mutation<
      FeedItem,
      { content: string; media?: { url: string; poster?: string }[] }
    >({
      query: (body) => ({
        url: "posts",
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
      }),
      transformResponse: (resp: any) => normalizePost(resp),
      invalidatesTags: [{ type: "FeedPage", id: 1 }],
    }),

    // === Post bearbeiten ===
    editPost: build.mutation<
      FeedItem,
      {
        postId: string;
        content: string;
        media?: { url: string; poster?: string }[];
      }
    >({
      query: ({ postId, ...body }) => ({
        url: `posts/${postId}`,
        method: "PATCH",
        body,
        headers: { "Content-Type": "application/json" },
      }),
      transformResponse: (resp: any) => normalizePost(resp),
      invalidatesTags: (r, e, { postId }) => [{ type: "Post", id: postId }],
    }),

    // === Post löschen ===
    deletePost: build.mutation<{ success: boolean }, string>({
      query: (postId) => ({
        url: `posts/${postId}`,
        method: "DELETE",
      }),
      invalidatesTags: (r, e, id) => [
        { type: "Post", id },
        { type: "FeedPage", id: 1 },
      ],
    }),

    // === Likes laden (optional) ===
    getLikes: build.query<
      { likes: { _id: string; username: string; profilePicture?: string }[] },
      string
    >({
      query: (postId) => `posts/${postId}/likes`,
      providesTags: (r, e, postId) => [{ type: "Likes", id: postId }],
    }),

    // === Like togglen ===
    toggleLike: build.mutation<
      { postId: string; userId: string },
      { postId: string; userId: string }
    >({
      query: ({ postId }) => ({
        url: `posts/${postId}/like`,
        method: "POST",
      }),
      // Post & Likes neu validieren
      invalidatesTags: (r, e, { postId }) => [
        { type: "Post", id: postId },
        { type: "Likes", id: postId },
      ],
    }),

    // === Comments laden ===
    getComments: build.query<Comment[], string>({
      query: (postId) => `posts/${postId}/comments`,
      transformResponse: (resp: any) =>
        Array.isArray(resp.comments) ? resp.comments : [],
      providesTags: (r, e, postId) => [{ type: "Comments", id: postId }],
    }),

    // === Comment erstellen ===
    addComment: build.mutation<Comment, { postId: string; text: string }>({
      query: ({ postId, text }) => ({
        url: `comments`,
        method: "POST",
        body: { post: postId, text },
        headers: { "Content-Type": "application/json" },
      }),
      invalidatesTags: (r, e, { postId }) => [{ type: "Comments", id: postId }],
    }),

    // === Comment bearbeiten ===
    editComment: build.mutation<
      Comment,
      { commentId: string; postId: string; text: string }
    >({
      query: ({ commentId, text }) => ({
        url: `comments/${commentId}`,
        method: "PATCH",
        body: { text },
        headers: { "Content-Type": "application/json" },
      }),
      invalidatesTags: (r, e, { postId }) => [{ type: "Comments", id: postId }],
    }),

    // === Comment löschen ===
    deleteComment: build.mutation<
      { postId: string; commentId: string },
      { postId: string; commentId: string }
    >({
      query: ({ commentId }) => ({
        url: `comments/${commentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (r, e, { postId }) => [{ type: "Comments", id: postId }],
    }),
  }),
});

export const {
  useGetFeedQuery,
  useGetPostQuery,
  useLazySearchPostsQuery,
  useCreatePostMutation,
  useEditPostMutation,
  useDeletePostMutation,
  useGetLikesQuery,
  useToggleLikeMutation,
  useGetCommentsQuery,
  useAddCommentMutation,
  useEditCommentMutation,
  useDeleteCommentMutation,
} = postsApi;
