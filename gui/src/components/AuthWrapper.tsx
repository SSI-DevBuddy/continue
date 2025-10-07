import { useContext, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { IdeMessengerContext } from "../context/IdeMessenger";
import { setLoggedInUser } from "../redux/slices/sessionSlice";
import { RootState } from "../redux/store";

interface AuthWrapperProps {
  children: React.ReactNode;
}

function AuthWrapper({ children }: AuthWrapperProps) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const ideMessenger = useContext(IdeMessengerContext);
  const loggedInUser = useSelector(
    (state: RootState) => state.session.loggedInUser,
  );
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // This effect runs only once on the initial mount
    async function attemptAutoLogin() {
      try {
        console.log("AuthWrapper: Sending 'auth/initialize' to core...");
        const result: any = await ideMessenger.request(
          "auth/initialize",
          undefined,
        );
        console.log(
          "AuthWrapper: Received response for 'auth/initialize':",
          result,
        );
        if (result.content.accessToken !== "failed") {
          dispatch(setLoggedInUser({ content: result }));
          navigate("/");
        }
      } catch (e) {
        console.error("Auto-login failed:", e);
      } finally {
        // Mark initialization as complete, regardless of success or failure
        setIsInitializing(false);
      }
    }

    attemptAutoLogin();
  }, [dispatch, ideMessenger]); // Runs only once

  useEffect(() => {
    // This effect handles redirection, but waits for initialization to finish
    if (!isInitializing && !loggedInUser) {
      navigate("/login");
    }
  }, [loggedInUser, isInitializing, navigate]);

  // Show loading or nothing while checking authentication
  if (isInitializing || !loggedInUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  // User is authenticated, render the children
  return <>{children}</>;
}

export default AuthWrapper;
