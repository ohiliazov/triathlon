import Link from "next/link";
import { Gauge } from "lucide-react";
import UserMenu from "./auth/UserMenu";

export default function Header() {
  return (
    <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="bg-blue-600 p-1.5 rounded-lg group-hover:bg-blue-700 transition-colors">
            <Gauge className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 hidden sm:block">
            VeloGraph CPET Analytics
          </h1>
        </Link>
        <div className="flex items-center">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
