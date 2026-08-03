import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { MotionProvider } from "@/lib/motion";
import { AppRouter } from "@/router";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <MotionProvider>
            <AppRouter />
            <Toaster
              position="top-right"
              toastOptions={{
                className: "bg-card text-card-foreground border border-white/[0.08] rounded-[14px] text-sm shadow-card backdrop-blur-xl",
                success: { iconTheme: { primary: "hsl(153 100% 42%)", secondary: "#fff" } },
                error: { iconTheme: { primary: "hsl(0 100% 65%)", secondary: "#fff" } },
              }}
            />
          </MotionProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}