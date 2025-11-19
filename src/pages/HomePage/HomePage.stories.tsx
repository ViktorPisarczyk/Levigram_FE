import React, { useEffect } from "react";
import Home from "./HomePage";

export default {
  title: "Pages/Home",
  component: Home,
};

export const Default = () => <Home />;

export const WithMockPost = () => {
  const mockPost = {
    _id: "story-p1",
    author: {
      _id: "u-story",
      username: "StoryUser",
      profilePicture: undefined,
    },
    content: "Dies ist ein Mock-Post für die HomePage-Story.",
    media: [
      { url: "/screenshots/CreateAccount.png" },
      {
        url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      },
      { url: "/screenshots/CreatePost.png" },
    ],
    likes: [],
    comments: [],
    createdAt: new Date().toISOString(),
  };

  useEffect(() => {
    const origFetch = window.fetch.bind(window);
    // mock only the feed request for page=1
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.fetch = async (input: RequestInfo, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.includes("posts?page=1")) {
        const body = JSON.stringify({ posts: [mockPost], hasMore: false });
        return new Response(body, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return origFetch(input, init);
    };

    return () => {
      // restore
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.fetch = origFetch;
    };
  }, []);

  return <Home />;
};
