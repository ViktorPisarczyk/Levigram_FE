import React from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import MediaCarousel from "./MediaCarousel";
import { store } from "../../redux/store";

export default {
  title: "Components/MediaCarousel",
  component: MediaCarousel,
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
