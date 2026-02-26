"use client";

import FileUploader from "@/components/FileUploader";
import FitFileUploader from "@/components/FitFileUploader";
import { useRouter } from "next/navigation";
import { useAppContext, LabTestPayload } from "@/context/AppContext";
import { Gauge, Activity } from "lucide-react";
import { ProcessedActivity } from "@/lib/fitProcessor";

export default function Home() {
  const { setLabTestData, setActivityData } = useAppContext();
  const router = useRouter();

  const handleDataLoaded = (payload: LabTestPayload) => {
    // Save in context and navigate to lab-test analysis route
    setLabTestData(payload);
    router.push("/lab-test");
  };

  const handleActivityLoaded = (activity: ProcessedActivity) => {
    // Save in context and navigate to activities analysis route
    setActivityData(activity);
    router.push("/activities");
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Gauge className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              VeloGraph CPET Analytics
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
            Physiological Performance Analysis
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Upload your laboratory test data or activity files to get deep
            insights into your metabolic and cardiovascular performance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* CPET Lab Test Upload Area */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
              <Gauge className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              CPET Lab Test
            </h3>
            <p className="text-gray-500 text-center mb-8">
              Analyze Wasserman 9-panel charts, thresholds (AT/RC), and
              metabolic efficiency from Excel reports.
            </p>
            <div className="w-full">
              <FileUploader onDataLoaded={handleDataLoaded} />
            </div>
            <p className="mt-4 text-xs text-gray-400">
              Supports .xlsx reports (sheet: "Dane")
            </p>
          </div>

          {/* FIT Activity Upload Area */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
              <Activity className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              FIT Activity
            </h3>
            <p className="text-gray-500 text-center mb-8">
              Deep dive into your Garmin/Wahoo activity files with heart rate,
              pace, and power analysis.
            </p>
            <div className="w-full">
              <FitFileUploader onActivityLoaded={handleActivityLoaded} />
            </div>
            <p className="mt-4 text-xs text-gray-400">
              Supports standard .fit activity files
            </p>
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-200 mt-16">
        <p className="text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} VeloGraph Analytics. All rights
          reserved.
        </p>
      </footer>
    </div>
  );
}
