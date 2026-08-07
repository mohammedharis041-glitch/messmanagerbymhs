import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, UtensilsCrossed } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Mess Manager Pro" },
      {
        name: "description",
        content: "Sign in to Mess Manager Pro to manage your mess rooms, expenses, wallet and monthly settlements.",
      },
      { property: "og:title", content: "Sign in — Mess Manager Pro" },
      { property: "og:description", content: "Access your shared mess rooms, expenses and settlements." },
    ],
  }),
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
});

const signUpSchema = signInSchema.extend({
  fullName: z.string().trim().min(2, "Enter your name").max(80),
});

function AuthPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/rooms", replace: true });
  }, [loading, session, navigate]);

  const signInForm = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });
  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", fullName: "" },
  });

  async function handleGoogle() {
    setBusy("google");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(null);
      toast.error(result.error.message ?? "Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/rooms", replace: true });
  }

  async function handleSignIn(values: z.infer<typeof signInSchema>) {
    setBusy("email");
    const { error } = await supabase.auth.signInWithPassword(values);
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    void navigate({ to: "/rooms", replace: true });
  }

  async function handleSignUp(values: z.infer<typeof signUpSchema>) {
    setBusy("email");
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: values.fullName },
      },
    });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      setEmailSent(true);
      toast.success("Check your email to confirm your account.");
      return;
    }
    void navigate({ to: "/rooms", replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-3 py-6 sm:px-4 sm:py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-primary opacity-10" />
      <Card className="animate-scale-in relative w-full max-w-[380px] rounded-3xl border-border elevation-2 sm:max-w-md sm:rounded-4xl">
        <CardHeader className="items-center space-y-1 px-4 py-4 text-center sm:px-6 sm:py-6">
          <div className="mb-1 inline-flex size-11 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground sm:size-14 sm:rounded-3xl">
            <UtensilsCrossed className="size-5 sm:size-6" />
          </div>
          <CardTitle className="font-[Outfit] text-lg sm:text-2xl">Mess Manager Pro</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Sign in to manage your rooms and expenses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3.5 px-4 pb-4 sm:space-y-5 sm:px-6 sm:pb-6">
          <Button
            variant="outline"
            className="h-10 w-full rounded-xl text-sm sm:h-12 sm:rounded-2xl sm:text-base"
            onClick={handleGoogle}
            disabled={busy !== null}
          >
            {busy === "google" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <GoogleMark />}
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground sm:text-xs">
            <span className="h-px flex-1 bg-border" /> or use email <span className="h-px flex-1 bg-border" />
          </div>


          {emailSent ? (
            <p className="rounded-2xl bg-primary-container p-4 text-center text-sm text-primary-container-foreground">
              We sent a confirmation link to your inbox. Confirm it, then sign in.
            </p>
          ) : null}

          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2 rounded-2xl">
              <TabsTrigger value="signin" className="rounded-xl">
                Sign in
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-xl">
                Create account
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="pt-3 sm:pt-4">
              <Form {...signInForm}>
                <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-3 sm:space-y-4">
                  <FormField
                    control={signInForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signInForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" autoComplete="current-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="h-10 w-full rounded-xl sm:h-11 sm:rounded-2xl" disabled={busy !== null}>
                    {busy === "email" ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Sign in
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="signup" className="pt-3 sm:pt-4">
              <Form {...signUpForm}>
                <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-3 sm:space-y-4">
                  <FormField
                    control={signUpForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full name</FormLabel>
                        <FormControl>
                          <Input autoComplete="name" placeholder="Haris Mohammed" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" autoComplete="new-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="h-10 w-full rounded-xl sm:h-11 sm:rounded-2xl" disabled={busy !== null}>
                    {busy === "email" ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Create account
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>

          <p className="text-center text-xs text-muted-foreground">
            <Link to="/" className="underline underline-offset-4">
              Back to home
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg className="mr-2 size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.44a5.5 5.5 0 0 1-2.39 3.62v3h3.86c2.26-2.08 3.58-5.15 3.58-8.86Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.86-3c-1.08.72-2.45 1.16-4.08 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}
