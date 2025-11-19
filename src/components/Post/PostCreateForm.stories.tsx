import React from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import PostCreateForm from "./PostCreateForm";
import { store } from "../../redux/store";

export default {
  title: "Components/PostCreateForm",
  component: PostCreateForm,
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

export const Default = () => (
  <div style={{ padding: 20 }}>
    <PostCreateForm onClose={() => {}} />
  </div>
);
