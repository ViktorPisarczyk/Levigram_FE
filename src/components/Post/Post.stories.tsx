import React from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import PostComponent from "./Post";
import { store } from "../../redux/store";

export default {
  title: "Components/Post",
  component: PostComponent,
  decorators: [
    (Story: any) => (
      <Provider store={store}>
        <MemoryRouter>
          <Story />
        </MemoryRouter>
      </Provider>
    ),
  ],
};

const mockPost = {
  _id: "p1",
  author: { _id: "u1", username: "alice", profilePicture: undefined },
  content: "Das ist ein Beispiel-Post für Storybook.",
  media: [],
  likes: [],
  comments: [],
  createdAt: new Date().toISOString(),
};

export const Default = () => <PostComponent post={mockPost} />;
