import type { Preview } from "@storybook/react";
import React from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { store } from "../src/redux/store";

// Import app global styles so stories match the real app
import "../src/index.scss";

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
  decorators: [
    (Story) => (
      <Provider store={store}>
        <MemoryRouter>
          <div style={{ padding: 16 }}>
            <Story />
          </div>
        </MemoryRouter>
      </Provider>
    ),
  ],
};

export default preview;
