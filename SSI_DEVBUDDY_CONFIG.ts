// SSI DevBuddy Configuration
// Update these values to match your setup

export const SSI_DEVBUDDY_CONFIG = {
  // Your Python server URL - this is used by the SSIDevBuddy provider
  API_BASE: "http://localhost:55360",
  CHAT_URL: "http:localhost:8000",
  // Note: API_KEY is handled automatically through the login system
  // When you log in through the LoginForm, your token is automatically stored
  // and used by the SSIDevBuddy provider. No need to set it here!

  // Model name (this is just for identification in Continue)
  MODEL: "claude",
};

// Instructions:
// 1. Update API_BASE if your Python server is not on localhost:55360
// 2. The API_KEY is automatically set when you log in - no manual configuration needed!
// 3. Restart Continue after making changes
// 4. Claude configuration (temperature, maxTokens, etc.) is handled by your Python server
