"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");

    const supabase = createClient();
    const result = isSignup
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      setError(result.error.message);
      setPending(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-bold">Älykoti</h1>
      <p className="mt-1 text-sm text-stone-600">Kirjaudu sisään.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Sähköposti"
          className="w-full rounded-lg border border-stone-200 px-3 py-2"
        />
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Salasana"
          className="w-full rounded-lg border border-stone-200 px-3 py-2"
        />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-stone-900 py-2.5 text-sm font-semibold text-white"
        >
          {pending ? "…" : isSignup ? "Luo tili" : "Kirjaudu"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setIsSignup((v) => !v)}
        className="mt-4 text-sm text-stone-600 hover:underline"
      >
        {isSignup ? "Onko jo tili? Kirjaudu" : "Ei tiliä? Luo uusi"}
      </button>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
    </div>
  );
}
