import {
  createBrowserRouter,
} from "react-router-dom";

import AppLayout from "../components/layout/AppLayout";
import DashboardPage from "../pages/DashboardPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
    ],
  },
]);