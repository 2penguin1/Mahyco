import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut, SignIn, SignUp } from "@clerk/clerk-react";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/sign-in"
          element={
            <SignedOut>
              <SignIn />
            </SignedOut>
          }
        />
        <Route
          path="/sign-up"
          element={
            <SignedOut>
              <SignUp />
            </SignedOut>
          }
        />
        <Route
          path="/"
          element={
            <>
              <SignedOut>
                <Navigate to="/sign-in" replace />
              </SignedOut>
              <SignedIn>
                <Layout />
              </SignedIn>
            </>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/sign-in" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
