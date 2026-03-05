import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import "./index.css";
import App from "./App.jsx";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const signInUrl = import.meta.env.VITE_CLERK_SIGN_IN_URL || "/sign-in";
const signUpUrl = import.meta.env.VITE_CLERK_SIGN_UP_URL || "/sign-up";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ClerkProvider publishableKey={clerkPubKey} signInUrl={signInUrl} signUpUrl={signUpUrl}>
      <App />
    </ClerkProvider>
  </StrictMode>
);
