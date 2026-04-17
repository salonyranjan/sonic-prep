"use client";

import { z } from "zod";
import Link from "next/link";
import { toast } from "sonner";
import { auth } from "@/firebase/client";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { Form } from "@/components/ui/form";
import { signIn, signUp } from "@/lib/actions/auth.action";
import FormField from "./FormField";

type FormType = "sign-in" | "sign-up";

const authFormSchema = (type: FormType) =>
  z.object({
    name: type === "sign-up" 
      ? z.string().min(3, "Name must be at least 3 characters") 
      : z.string().optional(),
    email: z.string().email("Please enter a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  });

const AuthForm = ({ type }: { type: FormType }) => {
  const router = useRouter();
  const isSignIn = type === "sign-in";

  const form = useForm<z.infer<ReturnType<typeof authFormSchema>>>({
    resolver: zodResolver(authFormSchema(type)),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<ReturnType<typeof authFormSchema>>) => {
    const loadingToast = toast.loading("Processing...");
    
    try {
      if (type === "sign-up") {
        const { name, email, password } = data;
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name! });

        const result = await signUp({
          uid: userCredential.user.uid,
          name: name!,
          email,
          password,
        });

        if (!result || !result.success) {
          toast.error(result?.message || "Failed to create account");
          return;
        }

        toast.success("Account created! Welcome to SonicPrep 🚀");
        form.reset();
        router.push("/");
      } else {
        const { email, password } = data;
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await userCredential.user.getIdToken();

        const result = await signIn({ email, idToken });
        if (!result || !result.success) {
          toast.error(result?.message || "Sign in failed");
          return;
        }

        toast.success("Welcome back! Let's crush those interviews 💥");
        form.reset();
        router.push("/");
      }
    } catch (error: any) {
      let errorMessage = "Something went wrong";
      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "Email already registered ✨";
          break;
        case "auth/wrong-password":
        case "auth/user-not-found":
          errorMessage = "Invalid credentials 🔒";
          break;
        case "auth/weak-password":
          errorMessage = "Password too weak 💪";
          break;
        case "auth/invalid-email":
          errorMessage = "Invalid email format 📧";
          break;
        case "auth/too-many-requests":
          errorMessage = "Too many attempts. Chill for a bit 😎";
          break;
        default:
          errorMessage = error.message || "Unexpected error";
      }
      toast.error(errorMessage);
    } finally {
      toast.dismiss(loadingToast);
      form.clearErrors();
    }
  };

  return (
    <div className="relative card-border lg:min-w-[566px] bg-gradient-to-br from-zinc-950 via-zinc-900 to-black/90 backdrop-blur-3xl rounded-3xl overflow-hidden border border-cyan-900/50 shadow-2xl shadow-cyan-500/20">
      {/* High-vis particle background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-lime-400/20 rounded-full blur-3xl animate-pulse animation-delay-2000" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl animate-pulse animation-delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-radial from-cyan-400/30 via-transparent to-emerald-400/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative flex flex-col gap-8 py-14 px-10 bg-black/40 backdrop-blur-xl border border-cyan-900/40 rounded-2xl shadow-inner shadow-cyan-500/10">
        {/* 🔥 HIGH-VISIBILITY SONICPREP */}
        <div className="text-center mb-8">
          <h2 className="high-vis-title text-5xl sm:text-6xl md:text-7xl font-black tracking-tight bg-gradient-to-r from-cyan-300 via-lime-400 to-emerald-400 bg-clip-text text-transparent drop-shadow-2xl shadow-cyan-500/50 mb-6">
            SonicPrep
          </h2>
          
          <h3 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-300 via-emerald-300 to-lime-300 bg-clip-text text-transparent drop-shadow-xl shadow-lime-400/50">
            Practice job interviews with AI
          </h3>
          <p className="text-zinc-300 text-lg font-semibold mt-4 tracking-wide">Master your dream job interview 🚀</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
            {!isSignIn && (
              <div className="neon-input-wrapper">
                <FormField
                  control={form.control}
                  name="name"
                  label="Full Name"
                  placeholder="Enter your full name"
                  type="text"
                />
              </div>
            )}

            <div className="neon-input-wrapper">
              <FormField
                control={form.control}
                name="email"
                label="Email Address"
                placeholder="your@email.com"
                type="email"
              />
            </div>

            <div className="neon-input-wrapper">
              <FormField
                control={form.control}
                name="password"
                label="Password"
                placeholder={isSignIn ? "Enter your password" : "Create strong password (6+ chars)"}
                type="password"
              />
            </div>

            {/* 🌟 HIGH-VIS NEON BUTTON */}
            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className={`
                high-vis-neon-btn w-full h-16 text-xl font-black uppercase tracking-widest
                relative overflow-hidden group bg-gradient-to-br from-zinc-900/90 to-black/90 backdrop-blur-xl border-2 border-cyan-500/50
                rounded-2xl shadow-2xl shadow-cyan-500/30 transition-all duration-500 ease-out hover:shadow-cyan-400/60
                ${form.formState.isSubmitting 
                  ? 'cursor-not-allowed opacity-70 scale-95' 
                  : 'hover:scale-[1.03] hover:shadow-cyan-400/70 active:scale-[0.98] hover:-translate-y-1 cursor-pointer'
                }
              `}
            >
              {/* Shine sweep */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/40 via-white/20 to-emerald-400/40 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
              
              {/* Multi-layer glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-emerald-500 to-lime-400 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-700 animate-pulse" />
              <div className="absolute inset-2 bg-gradient-to-r from-cyan-400 via-emerald-500 to-lime-400 rounded-xl opacity-0 group-hover:opacity-100 blur-lg" />
              
              <span className="relative z-10 flex items-center justify-center h-full bg-gradient-to-r from-cyan-300 via-emerald-400 to-lime-400 bg-clip-text text-transparent drop-shadow-2xl shadow-lime-400/50 font-black tracking-wider">
                {form.formState.isSubmitting ? (
                  <span className="flex items-center gap-3">
                    <div className="w-7 h-7 border-2 border-white/40 border-t-cyan-300 rounded-full animate-spin shadow-lg shadow-cyan-400/50" />
                    Processing...
                  </span>
                ) : isSignIn ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </span>
            </button>
          </form>
        </Form>

        {/* High-vis link */}
        <div className="text-center pt-8 border-t border-cyan-900/50">
          <p className="text-zinc-400 text-sm font-medium mb-6">
            {isSignIn ? "Don't have an account?" : "Already have an account?"}
          </p>
          <Link
            href={!isSignIn ? "/sign-in" : "/sign-up"}
            className="high-vis-link inline-flex items-center gap-3 px-10 py-4 text-lg font-bold bg-zinc-900/70 hover:bg-zinc-800/60 border border-cyan-500/40 backdrop-blur-md rounded-2xl transition-all duration-400 hover:scale-105 hover:shadow-cyan-400/50 group shadow-lg"
          >
            <span className="bg-gradient-to-r from-cyan-300 via-emerald-400 to-lime-400 bg-clip-text text-transparent drop-shadow-lg">
              {!isSignIn ? "Sign In" : "Sign Up"}
            </span>
            <div className="w-4 h-4 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full scale-75 group-hover:scale-125 transition-all duration-300 shadow-lg shadow-cyan-400/60" />
          </Link>
        </div>
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Exo+2:wght@600;800&display=swap');
        
        .high-vis-title {
          font-family: 'Orbitron', monospace;
          text-shadow: 
            0 0 10px #22d3ee,
            0 0 20px #22d3ee,
            0 0 40px #22d3ee,
            0 0 60px #84cc16,
            0 0 100px #84cc16;
          animation: highVisFlicker 2.5s infinite alternate;
        }

        .high-vis-neon-btn:hover {
          box-shadow: 
            0 25px 70px rgba(34,211,238,0.6),
            0 0 60px rgba(132,204,22,0.5),
            inset 0 1px 0 rgba(255,255,255,0.3);
        }

        .high-vis-link:hover {
          box-shadow: 0 20px 50px rgba(34,211,238,0.5);
          border-color: rgba(34,211,238,0.7);
        }

        .neon-input-wrapper {
          position: relative;
        }

        .neon-input-wrapper:focus-within {
          box-shadow: 0 0 25px rgba(34,211,238,0.4);
        }

        .neon-input-wrapper::after {
          content: '';
          position: absolute;
          bottom: 0.75rem;
          left: 1.25rem;
          right: 1.25rem;
          height: 3px;
          background: linear-gradient(90deg, transparent, #22d3ee, #84cc16, transparent);
          opacity: 0;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          transform: scaleX(0);
          transform-origin: center;
        }

        .neon-input-wrapper:focus-within::after {
          opacity: 1;
          transform: scaleX(1);
          box-shadow: 0 0 15px rgba(34,211,238,0.6);
        }

        @keyframes highVisFlicker {
          0%, 18%, 22%, 25%, 53%, 57%, 100% {
            text-shadow: 0 0 10px #22d3ee, 0 0 20px #22d3ee, 0 0 40px #22d3ee, 0 0 60px #84cc16, 0 0 100px #84cc16;
          }
          20%, 24%, 55% { 
            text-shadow: 0 0 5px #22d3ee, 0 0 10px #22d3ee, 0 0 20px #84cc16; 
          }
        }

        @keyframes animation-delay-1000 { animation-delay: 1s; }
        @keyframes animation-delay-2000 { animation-delay: 2s; }
      `}</style>
    </div>
  );
};

export default AuthForm;