import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { AppRouter } from "@/router";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppRouter />
          <Toaster
            position="top-right"
            toastOptions={{
              className: "bg-card text-card-foreground border border-border rounded-md text-sm",
              success: { iconTheme: { primary: "hsl(142 71% 45%)", secondary: "#fff" } },
              error: { iconTheme: { primary: "hsl(0 84% 60%)", secondary: "#fff" } },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}