import React from "react";
import { Provider } from "react-redux";
import { store } from "../../redux/store";
import Login from "./LoginPage";
import { BrowserRouter } from "react-router-dom";

export default {
  title: "Pages/Login",
  component: Login,
};

export const Default = () => (
  <Provider store={store}>
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  </Provider>
);
