import React from "react";
import { Provider } from "react-redux";
import { store } from "../../redux/store";
import Home from "./HomePage";
import { BrowserRouter } from "react-router-dom";

export default {
  title: "Pages/Home",
  component: Home,
};

export const Default = () => (
  <Provider store={store}>
    <BrowserRouter>
      <Home />
    </BrowserRouter>
  </Provider>
);
