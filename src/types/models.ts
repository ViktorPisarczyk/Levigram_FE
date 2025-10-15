export interface User {
  _id: string;
  username: string;
  profilePicture?: string;
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
    profilePicture?: string;
  };
  text: string;
  createdAt: string;
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

export type FeedItem = Post;
