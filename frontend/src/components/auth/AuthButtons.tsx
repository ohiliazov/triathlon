import { signIn, signOut } from "@/auth";
import { LogIn, LogOut } from "lucide-react";

export function SignIn({
  provider,
  className,
}: {
  provider?: string;
  className?: string;
}) {
  return (
    <form
      action={async () => {
        "use server";
        await signIn(provider);
      }}
    >
      <button
        type="submit"
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors ${className}`}
      >
        <LogIn className="w-4 h-4" />
        <span>Sign In {provider ? `with ${provider}` : ""}</span>
      </button>
    </form>
  );
}

export function SignOut({ className }: { className?: string }) {
  return (
    <form
      action={async () => {
        "use server";
        await signOut();
      }}
    >
      <button
        type="submit"
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors ${className}`}
      >
        <LogOut className="w-4 h-4" />
        <span>Sign Out</span>
      </button>
    </form>
  );
}
