"use client";

import { z } from "zod";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { FirebaseError } from "firebase/app";
import { getFirebaseAuth } from "@/firebase/client";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  ArrowRight,
  AudioLines,
  Check,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import { Form } from "@/components/ui/form";
import { signIn, signUp } from "@/lib/actions/auth.action";
import FormField from "./FormField";

type FormType = "sign-in" | "sign-up";
const authFormSchema = (type: FormType) =>
  z.object({
    name:
      type === "sign-up"
        ? z
            .string()
            .trim()
            .min(2, "Enter at least 2 characters.")
            .max(80, "Use 80 characters or fewer.")
        : z.string().optional(),
    email: z.string().trim().email("Enter a valid email address."),
    password: z
      .string()
      .min(
        type === "sign-up" ? 6 : 1,
        type === "sign-up"
          ? "Use at least 6 characters."
          : "Enter your password.",
      ),
  });

function errorMessage(error: unknown) {
  if (!(error instanceof FirebaseError))
    return "Something went wrong. Please try again.";
  switch (error.code) {
    case "auth/email-already-in-use":
      return "This email already has an account. Sign in or reset your password.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "The email or password is incorrect. Please try again.";
    case "auth/weak-password":
      return "Choose a stronger password with at least 6 characters.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes before trying again.";
    case "auth/network-request-failed":
      return "Check your internet connection and try again.";
    default:
      return "We couldn't complete your request. Please try again.";
  }
}

export default function AuthForm({ type }: { type: FormType }) {
  const router = useRouter();
  const isSignIn = type === "sign-in";
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState("");
  const form = useForm<z.infer<ReturnType<typeof authFormSchema>>>({
    resolver: zodResolver(authFormSchema(type)),
    defaultValues: { name: "", email: "", password: "" },
  });
  const busy = form.formState.isSubmitting || resetting;

  async function onSubmit(data: z.infer<ReturnType<typeof authFormSchema>>) {
    form.clearErrors("root");
    setNotice("");
    try {
      const auth = getFirebaseAuth();
      const credential = isSignIn
        ? await signInWithEmailAndPassword(auth, data.email, data.password)
        : await createUserWithEmailAndPassword(auth, data.email, data.password);
      if (!isSignIn)
        await updateProfile(credential.user, { displayName: data.name! });
      const idToken = await credential.user.getIdToken();
      const result = isSignIn
        ? await signIn({ idToken })
        : await signUp({ name: data.name!, idToken });
      if (!result.success) {
        form.setError("root", { message: result.message });
        return;
      }
      // The HttpOnly server session is the source of authentication for the app.
      await firebaseSignOut(auth).catch(() => undefined);
      toast.success(
        isSignIn
          ? "Welcome back to SonicPrep."
          : "Your account is ready. Let's get started.",
      );
      router.replace("/");
      router.refresh();
    } catch (error: unknown) {
      form.setError("root", { message: errorMessage(error) });
    }
  }

  async function resetPassword() {
    if (busy || !(await form.trigger("email"))) return;
    setResetting(true);
    setNotice("");
    form.clearErrors("root");
    try {
      await sendPasswordResetEmail(
        getFirebaseAuth(),
        form.getValues("email").trim(),
      );
      setNotice(
        "If an account exists for this email, you'll receive a password reset link. Check your inbox and spam folder.",
      );
    } catch (error: unknown) {
      if (
        error instanceof FirebaseError &&
        error.code === "auth/user-not-found"
      ) {
        setNotice(
          "If an account exists for this email, you'll receive a password reset link. Check your inbox and spam folder.",
        );
      } else form.setError("root", { message: errorMessage(error) });
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="w-full max-w-6xl">
      <Link
        href="/"
        aria-label="SonicPrep home"
        className="mb-8 inline-flex items-center gap-3 rounded-lg text-xl font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-primary-200 sm:mb-12"
      >
        <span className="flex size-10 items-center justify-center rounded-xl border border-primary-200/25 bg-primary-200/10 text-primary-200">
          <AudioLines size={23} aria-hidden="true" />
        </span>
        SonicPrep<span className="sr-only"> home</span>
      </Link>
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
        <section className="max-w-xl" aria-labelledby="auth-intro">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-200/20 bg-primary-200/5 px-3 py-1.5 text-xs font-medium tracking-wide text-primary-100">
            <span className="size-1.5 rounded-full bg-primary-200" />
            YOUR NEXT CHAPTER STARTS HERE
          </span>
          <h1
            id="auth-intro"
            className="text-4xl font-semibold leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl"
          >
            A little practice.
            <br />
            <span className="text-primary-200">A lot more confidence.</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-zinc-400 sm:text-lg">
            Prepare for your next opportunity with realistic AI interviews and
            feedback you can put into practice.
          </p>
          <div className="mt-9 hidden space-y-4 lg:block">
            {[
              "Practice technical and behavioral questions",
              "Build confidence with real-time voice conversations",
              "Learn what works and where to improve",
            ].map((text) => (
              <div
                key={text}
                className="flex items-center gap-3 text-sm text-zinc-300"
              >
                <Check
                  size={17}
                  className="shrink-0 text-primary-200"
                  aria-hidden="true"
                />
                {text}
              </div>
            ))}
          </div>
          <div
            className="mt-12 hidden max-w-sm rounded-2xl border border-white/10 bg-white/[0.025] p-5 lg:block"
            aria-hidden="true"
          >
            <div className="flex items-center gap-3">
              <AudioLines className="text-primary-200" size={20} />
              <span className="text-sm font-medium text-zinc-200">
                Space to practice. Room to grow.
              </span>
            </div>
            <div className="mt-5 flex h-10 items-center gap-1.5">
              {[
                12, 22, 16, 30, 38, 24, 16, 28, 40, 26, 18, 34, 22, 14, 30, 38,
                20, 12, 26, 16, 32, 20, 12, 24, 18, 10,
              ].map((height, i) => (
                <span
                  key={i}
                  className="flex-1 rounded-full bg-primary-200/40"
                  style={{ height }}
                />
              ))}
            </div>
          </div>
        </section>
        <section
          aria-labelledby="auth-heading"
          className="min-w-0 rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-2xl shadow-black/20 sm:p-9"
        >
          <div className="mb-7">
            <h2
              id="auth-heading"
              className="text-2xl font-semibold tracking-tight"
            >
              {isSignIn ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {isSignIn
                ? "Sign in to continue your interview practice."
                : "Start building confidence for your next interview."}
            </p>
          </div>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              noValidate
              aria-busy={busy}
            >
              <fieldset
                disabled={busy}
                className="min-w-0 space-y-5 disabled:opacity-70"
              >
                <legend className="sr-only">
                  {isSignIn ? "Sign in details" : "Account details"}
                </legend>
                {!isSignIn && (
                  <FormField
                    control={form.control}
                    name="name"
                    label="Full name"
                    placeholder="Alex Morgan"
                    autoComplete="name"
                  />
                )}
                <FormField
                  control={form.control}
                  name="email"
                  label="Email address"
                  placeholder="you@example.com"
                  type="email"
                  autoComplete="email"
                />
                <FormField
                  control={form.control}
                  name="password"
                  label="Password"
                  placeholder={
                    isSignIn ? "Enter your password" : "Create a password"
                  }
                  type="password"
                  autoComplete={isSignIn ? "current-password" : "new-password"}
                  description={
                    !isSignIn
                      ? "Use at least 6 characters. A longer, unique password is best."
                      : undefined
                  }
                />
                {isSignIn && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={resetPassword}
                      className="min-h-11 rounded text-sm text-primary-200 hover:text-primary-100 focus-visible:outline-2 focus-visible:outline-primary-200"
                    >
                      {resetting ? "Sending reset link..." : "Forgot password?"}
                    </button>
                  </div>
                )}
                {form.formState.errors.root && (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm leading-6 text-red-200"
                  >
                    {form.formState.errors.root.message}
                  </p>
                )}
                {notice && (
                  <p
                    role="status"
                    className="rounded-xl border border-primary-200/20 bg-primary-200/10 p-3 text-sm leading-6 text-primary-100"
                  >
                    {notice}
                  </p>
                )}
                <button
                  type="submit"
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-200 px-4 text-sm font-semibold text-dark-100 transition-colors hover:bg-primary-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-200 disabled:cursor-wait"
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <LoaderCircle
                        size={18}
                        className="animate-spin"
                        aria-hidden="true"
                      />
                      {isSignIn ? "Signing in..." : "Creating account..."}
                    </>
                  ) : (
                    <>
                      {isSignIn ? "Sign in" : "Create account"}
                      <ArrowRight size={17} aria-hidden="true" />
                    </>
                  )}
                </button>
              </fieldset>
            </form>
          </Form>
          <p className="mt-7 border-t border-white/10 pt-6 text-center text-sm leading-7 text-zinc-400">
            {isSignIn ? "New to SonicPrep?" : "Already have an account?"}{" "}
            <Link
              href={isSignIn ? "/sign-up" : "/sign-in"}
              className="inline-block rounded font-medium text-primary-200 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary-200"
            >
              {isSignIn ? "Create an account" : "Sign in"}
            </Link>
          </p>
        </section>
      </div>
      <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
        <span>© {new Date().getFullYear()} SonicPrep</span>
        <span className="flex items-center gap-1.5">
          <LockKeyhole size={13} aria-hidden="true" />
          Your next opportunity starts with practice.
        </span>
      </footer>
    </div>
  );
}
