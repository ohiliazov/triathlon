import { auth } from "@/auth";
import { SignOut, SignIn } from "./AuthButtons";
import Image from "next/image";
import Link from "next/link";
import { User } from "lucide-react";

export default async function UserMenu() {
  const session = await auth();

  if (!session?.user) {
    return <SignIn />;
  }

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        {session.user.image ? (
          <Image
            src={session.user.image}
            alt={session.user.name ?? "User avatar"}
            width={32}
            height={32}
            className="rounded-full border border-gray-200"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border border-gray-200">
            <User className="w-5 h-5 text-blue-600" />
          </div>
        )}
        <div className="hidden sm:block">
          <p className="text-sm font-medium text-gray-900 leading-none">
            {session.user.name}
          </p>
          <p className="text-xs text-gray-500 leading-none mt-1">
            {session.user.email}
          </p>
        </div>
      </div>
      <Link
        href="/profile"
        className="text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
      >
        Profile
      </Link>
      <SignOut />
    </div>
  );
}
