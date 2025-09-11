import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../../redux/store";
import defaultAvatar from "../../assets/images/defaultAvatar.png";

// ==== Interfaces ====

interface PostState {
  posts: Post[];
  searchResults: Post[];
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  searchActive: boolean;
}

const initialState: PostState = {
  posts: [],
  searchResults: [],
  hasMore: true,
  currentPage: 1,
  totalPages: 1,
  loading: false,
  error: null,
  searchActive: false,
};

export interface User {
  _id: string;
  username: string;
  profilePicture?: string;
}

export interface Post {
  _id: string;
  author: User;
  content: string;
  media: MediaItem[];
  likes: string[];
  comments: Comment[];
  createdAt: string;
}

export interface MediaItem {
  url: string;
  poster?: string;
}

export interface Comment {
  _id: string;
  postId: string;
  user: {
    _id: string;
    username: string;
    profilePicture: string;
  };
  text: string;
  createdAt: string;
}

// ==== Async Thunks ====

export const fetchPostsAsync = createAsyncThunk<
  { posts: Post[]; hasMore: boolean; currentPage: number; totalPages: number },
  number,
  { rejectValue: string }
>("posts/fetchPosts", async (page = 1, thunkAPI) => {
  try {
    const token = localStorage.getItem("token");

    const response = await fetch(`/posts?page=${page}`, {
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Unauthorized");
    }

    const data = await response.json();

    return {
      posts: (data.posts as Post[]).map((post) => ({
        ...post,
        media: post.media.map((m: any) =>
          typeof m === "string" ? { url: m } : m
        ),
      })),
      hasMore: data.hasMore,
      currentPage: data.currentPage,
      totalPages: data.totalPages,
    };
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const addPostAsync = createAsyncThunk<
  Post,
  { content: string; media?: MediaItem[] },
  { rejectValue: string }
>("posts/addPostAsync", async ({ content, media }, thunkAPI) => {
  try {
    const token = localStorage.getItem("token");

    const response = await fetch(`/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ content, media }),
    });

    const data = await response.json();

    if (!response.ok) {
      return thunkAPI.rejectWithValue(data.message || "Error creating post");
    }

    return data as Post;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const editPostAsync = createAsyncThunk<
  Post,
  { postId: string; content: string; media?: MediaItem[] },
  { rejectValue: string }
>("posts/editPostAsync", async ({ postId, content, media }, thunkAPI) => {
  try {
    const token = localStorage.getItem("token");

    const response = await fetch(`/posts/${postId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ content, media }),
    });

    const updatedPost = await response.json();

    if (!response.ok) {
      return thunkAPI.rejectWithValue(
        updatedPost.message || "Error updating post"
      );
    }

    return updatedPost as Post;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const deletePostAsync = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("posts/deletePostAsync", async (postId, thunkAPI) => {
  try {
    const token = localStorage.getItem("token");

    const response = await fetch(`/posts/${postId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      const data = await response.json();
      return thunkAPI.rejectWithValue(
        data.message || "Fehler beim Löschen des Posts"
      );
    }

    return postId;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

// Toggle like/unlike a post
export const toggleLikeAsync = createAsyncThunk<
  { postId: string; userId: string },
  { postId: string; userId: string },
  { rejectValue: string }
>("posts/toggleLike", async ({ postId, userId }, thunkAPI) => {
  try {
    const token = localStorage.getItem("token");

    const response = await fetch(`/posts/${postId}/like`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      return thunkAPI.rejectWithValue(error.message || "Like failed");
    }

    return { postId, userId };
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const addCommentAsync = createAsyncThunk<
  Comment,
  { postId: string; text: string },
  { state: RootState; rejectValue: string }
>("posts/addCommentAsync", async ({ postId, text }, thunkAPI) => {
  try {
    const token = localStorage.getItem("token");
    const { auth } = thunkAPI.getState();

    const response = await fetch(`/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        text,
        post: postId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return thunkAPI.rejectWithValue(
        data.message || "Fehler beim Erstellen des Kommentars"
      );
    }

    const comment: Comment = {
      _id: data._id,
      postId: postId,
      user: {
        _id: auth.user?._id || "unknown",
        username: auth.user?.username || "unknown",
        profilePicture: auth.user?.profilePicture || defaultAvatar,
      },
      text: data.text,
      createdAt: data.createdAt || new Date().toISOString(),
    };

    return comment;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const editCommentAsync = createAsyncThunk<
  Comment,
  { commentId: string; postId: string; newText: string },
  { state: RootState; rejectValue: string }
>(
  "posts/editCommentAsync",
  async ({ commentId, postId, newText }, thunkAPI) => {
    try {
      const token = localStorage.getItem("token");
      const { auth } = thunkAPI.getState();

      const response = await fetch(`/comments/${commentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ text: newText }),
      });

      const data = await response.json();

      if (!response.ok) {
        return thunkAPI.rejectWithValue(
          data.message || "Fehler beim Bearbeiten des Kommentars"
        );
      }

      const updatedComment: Comment = {
        _id: data._id,
        postId,
        user: {
          _id: data.user._id,
          username: data.user.username,
          profilePicture:
            typeof data.user.profilePicture === "string"
              ? data.user.profilePicture
              : data.user.profilePicture?.url || "unknown",
        },
        text: data.text,
        createdAt: data.createdAt,
      };

      return updatedComment;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const deleteCommentAsync = createAsyncThunk<
  { postId: string; commentId: string },
  { postId: string; commentId: string },
  { rejectValue: string }
>("posts/deleteCommentAsync", async ({ postId, commentId }, thunkAPI) => {
  try {
    const token = localStorage.getItem("token");

    const response = await fetch(`/comments/${commentId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      return thunkAPI.rejectWithValue(
        data.message || "Fehler beim Löschen des Kommentars"
      );
    }

    return { postId, commentId };
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const fetchCommentsByPostId = createAsyncThunk(
  "post/fetchComments",
  async (postId: string, thunkAPI) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/posts/${postId}/comments`, {
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      const data = await res.json();
      return { postId, comments: data.comments };
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

// ==== Slice ====

const postSlice = createSlice({
  name: "posts",
  initialState,
  reducers: {
    addPost(state, action: PayloadAction<Post>) {
      const exists = state.posts.find((p) => p._id === action.payload._id);
      if (!exists) {
        state.posts.unshift(action.payload);
      }
    },
    replacePost(state, action: PayloadAction<Post>) {
      const index = state.posts.findIndex((p) => p._id === action.payload._id);
      if (index !== -1) {
        state.posts[index] = action.payload;
      }
    },
    setSearchResults(state, action: PayloadAction<Post[]>) {
      state.searchResults = action.payload;
      state.searchActive = true;
    },
    clearSearchResults(state) {
      state.searchResults = [];
      state.searchActive = false;
    },
    resetPosts(state) {
      resetPosts;
      state.posts = [];
      state.currentPage = 1;
      state.hasMore = true;
      state.searchResults = [];
      state.searchActive = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPostsAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPostsAsync.fulfilled, (state, action) => {
        const newPosts = action.payload.posts;
        const existingIds = new Set(state.posts.map((p) => p._id));
        const uniquePosts = newPosts.filter((p) => !existingIds.has(p._id));
        state.posts = [...state.posts, ...uniquePosts];
        state.hasMore = action.payload.hasMore;
        state.currentPage = action.payload.currentPage;
        state.totalPages = action.payload.totalPages;
        state.loading = false;
      })
      .addCase(fetchPostsAsync.rejected, (state, action) => {
        console.log("FETCH POSTS ERROR:", action.payload);
        state.loading = false;
        state.error = action.payload || "Error fetching posts.";
      })
      .addCase(addPostAsync.fulfilled, (state, action) => {
        state.posts.unshift(action.payload);
      })
      .addCase(editPostAsync.fulfilled, (state, action) => {
        const updated = action.payload;
        const index = state.posts.findIndex((p) => p._id === updated._id);
        if (index !== -1) {
          state.posts[index] = updated;
        }
      })
      .addCase(deletePostAsync.fulfilled, (state, action) => {
        const deletedPostId = action.payload;
        state.posts = state.posts.filter((post) => post._id !== deletedPostId);
        state.searchResults = state.searchResults.filter(
          (post) => post._id !== deletedPostId
        );
      })
      .addCase(addCommentAsync.fulfilled, (state, action) => {
        const { postId } = action.payload;
        const post = state.posts.find((p) => p._id === postId);
        if (post) {
          post.comments.push(action.payload);
        }
      })
      .addCase(editCommentAsync.fulfilled, (state, action) => {
        const updatedComment = action.payload;
        const post = state.posts.find((p) => p._id === updatedComment.postId);
        if (post) {
          const commentIndex = post.comments.findIndex(
            (c) => c._id === updatedComment._id
          );
          if (commentIndex !== -1) {
            post.comments[commentIndex] = updatedComment;
          }
        }
      })
      .addCase(deleteCommentAsync.fulfilled, (state, action) => {
        const { postId, commentId } = action.payload;
        const post = state.posts.find((p) => p._id === postId);
        if (post) {
          post.comments = post.comments.filter((c) => c._id !== commentId);
        }
      })
      .addCase(toggleLikeAsync.fulfilled, (state, action) => {
        const { postId, userId } = action.payload;

        const toggleLikeInPost = (post: Post | undefined) => {
          if (!post) return;
          const index = post.likes.indexOf(userId);
          if (index > -1) {
            post.likes.splice(index, 1);
          } else {
            post.likes.push(userId);
          }
        };

        const post = state.posts.find((p) => p._id === postId);
        toggleLikeInPost(post);

        const searchPost = state.searchResults.find((p) => p._id === postId);
        toggleLikeInPost(searchPost);
      });
  },
});

export const {
  addPost,
  replacePost,
  setSearchResults,
  clearSearchResults,
  resetPosts,
} = postSlice.actions;

// ==== Selectors ====

export const selectPostById = (state: RootState, postId: string) => {
  return (
    state.posts.posts.find((post) => post._id === postId) ||
    state.posts.searchResults.find((post) => post._id === postId)
  );
};

export const selectAllPosts = (state: RootState) => state.posts.posts;

// ==== Reducer Export ====

export default postSlice.reducer;
