import { RouterProvider, createMemoryRouter } from "react-router-dom";
import AuthWrapper from "./components/AuthWrapper";
import Layout from "./components/Layout";
import { MainEditorProvider } from "./components/mainInput/TipTapEditor";
import { SubmenuContextProvidersProvider } from "./context/SubmenuContextProviders";
import { VscThemeProvider } from "./context/VscTheme";
import LoginForm from "./forms/LoginForm";
import ParallelListeners from "./hooks/ParallelListeners";
import ConfigPage from "./pages/config";
import ErrorPage from "./pages/error";
import Chat from "./pages/gui";
import History from "./pages/history";
import Stats from "./pages/stats";
import ThemePage from "./styles/ThemePage";
import { ROUTES } from "./util/navigation";

const router = createMemoryRouter([
  {
    path: "/login",
    element: <LoginForm />,
  },
  {
    path: "/",
    element: (
      <AuthWrapper>
        <Layout />
      </AuthWrapper>
    ),
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/index.html",
        element: <Chat />,
      },
      {
        path: ROUTES.HOME,
        element: <Chat />,
      },
      {
        path: "/history",
        element: <History />,
      },
      {
        path: "/stats",
        element: <Stats />,
      },
      {
        path: ROUTES.CONFIG,
        element: <ConfigPage />,
      },
      {
        path: ROUTES.THEME,
        element: <ThemePage />,
      },
    ],
  },
]);

/*
  ParallelListeners prevents entire app from rerendering on any change in the listeners,
  most of which interact with redux etc.
*/
function App() {
  return (
    <VscThemeProvider>
      <MainEditorProvider>
        <SubmenuContextProvidersProvider>
          <RouterProvider router={router} />
        </SubmenuContextProvidersProvider>
      </MainEditorProvider>
      <ParallelListeners />
    </VscThemeProvider>
  );
}

export default App;
