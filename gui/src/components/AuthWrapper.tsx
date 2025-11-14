import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setLoggedInUser } from "../redux/slices/sessionSlice";
import { RootState } from "../redux/store";

interface AuthWrapperProps {
  children: React.ReactNode;
}

function AuthWrapper({ children }: AuthWrapperProps) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const loggedInUser = useSelector((state: RootState) => state.session.loggedInUser);

  useEffect(() => {
    // Check if user is logged in from localStorage on component mount
    const storedUser = localStorage.getItem("loggedInUser");
    if (storedUser && !loggedInUser) {
      try {
        const userData = JSON.parse(storedUser);
        dispatch(setLoggedInUser(userData));
      } catch (error) {
        console.error("Error parsing stored user data:", error);
        localStorage.removeItem("loggedInUser");
      }
    }
  }, [dispatch, loggedInUser]);

  useEffect(() => {
    // If no user is logged in, redirect to login page
    if (!loggedInUser) {
      navigate("/login");
    }
  }, [loggedInUser, navigate]);

  // Show loading or nothing while checking authentication
  if (!loggedInUser) {
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