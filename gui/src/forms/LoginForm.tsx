import { useContext, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Button, Input } from "../components";
import { IdeMessengerContext } from "../context/IdeMessenger";
import { setLoggedInUser } from "../redux/slices/sessionSlice";

function LoginForm() {
  const navigate = useNavigate();
  const formMethods = useForm();
  const dispatch = useDispatch();
  const ideMessenger = useContext(IdeMessengerContext);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit() {
    const formObj = { ...formMethods.watch() };
    setIsLoading(true);
    setError("");

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Request timeout - no response received")),
          5000,
        );
      });

      const authPromise = ideMessenger.request("auth/login", {
        username: formObj.username,
        password: formObj.password,
      });

      const result: any = await Promise.race([authPromise, timeoutPromise]);

      if (result.status != "error" && result.content?.success) {
        dispatch(setLoggedInUser(result));
        navigate("/");
      } else {
        setError(result.error || "Username or password is incorrect");
      }
    } catch (ex) {
      console.log("Login error:", ex);
      setError(ex instanceof Error ? ex.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <FormProvider {...formMethods}>
      <form onSubmit={formMethods.handleSubmit(onSubmit)}>
        <div className="mx-auto max-w-md p-6">
          <h1 className="mb-0 text-center text-2xl">Login SSI DevBuddy</h1>

          {error && (
            <div className="mt-4 rounded border border-red-400 bg-red-100 p-3 text-red-700">
              {error}
            </div>
          )}

          <div className="my-8 flex flex-col gap-6">
            <div>
              <label className="mb-1 block text-sm font-medium">Username</label>
              <Input
                id="username"
                className="w-full"
                placeholder={`Enter your username`}
                {...formMethods.register("username")}
                required={true}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Password</label>
              <Input
                id="password"
                type="password"
                className="w-full"
                placeholder={`Enter your password`}
                {...formMethods.register("password")}
                required={true}
              />
            </div>
          </div>

          <div className="mt-4 w-full">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in ..." : "Login"}
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}

export default LoginForm;
