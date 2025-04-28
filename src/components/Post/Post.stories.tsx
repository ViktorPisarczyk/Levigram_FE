import React from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import PostComponent from "./Post";
import { store } from "../../redux/store";

export default {
  title: "Components/Post",
  component: PostComponent,
  decorators: [
    (Story) => (
      <Provider store={store}>
        <MemoryRouter>
          <Story />
        </MemoryRouter>
      </Provider>
    ),
  ],
};
