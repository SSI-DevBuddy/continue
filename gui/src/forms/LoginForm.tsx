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
      const result: any = await ideMessenger.request("auth/login", {
        apiKey: formObj.apiKey,
      });

      if (result.content.accessToken !== "failed") {
        await ideMessenger.request("auth/saveApiKey", {
          apiKey: formObj.apiKey,
        });
        dispatch(setLoggedInUser({ content: result })); // Adapt to your Redux slice's needs
        navigate("/");
      } else {
        setError(result.error || "Failed to authenticate with API Key.");
      }
    } catch (ex: any) {
      console.error("Login error:", ex);
      setError(ex.message || "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <FormProvider {...formMethods}>
      <form onSubmit={formMethods.handleSubmit(onSubmit)}>
        <div className="mx-auto max-w-md p-6">
          <h1 className="mb-2 text-center text-2xl">Connect to SSI DevBuddy</h1>
          <p className="text-center text-sm text-gray-500">
            Enter your API Key from your user profile to connect.
          </p>

          {error && (
            <div className="mt-4 rounded border border-red-400 bg-red-100 p-3 text-red-700">
              {error}
            </div>
          )}

          <div className="my-8 flex flex-col gap-6">
            <div>
              <label className="mb-1 block text-sm font-medium">API Key</label>
              <Input
                id="apiKey"
                className="w-full"
                placeholder="ext_live_..."
                {...formMethods.register("apiKey")}
                required={true}
              />
            </div>
          </div>

          <div className="mt-4 w-full">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Connecting..." : "Connect"}
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}

export default LoginForm;
