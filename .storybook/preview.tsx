import type { Preview } from "@storybook/react";
import React from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { store } from "../src/redux/store";

import { INITIAL_VIEWPORTS } from "storybook/viewport";

// Import app global styles so stories match the real app
import "../src/index.scss";

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    viewport: {
      // use the official set of initial viewports from storybook
      options: INITIAL_VIEWPORTS,
    },
  },
  initialGlobals: {
    viewport: { value: "iphone13", isRotated: false },
  },
  decorators: [
    (Story, context) => (
      <Provider store={store}>
        <MemoryRouter>
          <div style={{ padding: 16 }}>
            <Story {...context} />
          </div>
        </MemoryRouter>
      </Provider>
    ),
  ],
};

export default preview;
