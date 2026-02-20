"use client";

import { useState } from "react";
import { Upload, FileUp, Loader2 } from "lucide-react";
import { processFitFile, ProcessedActivity } from "@/lib/fitProcessor";

interface FitFileUploaderProps {
  onActivityLoaded: (activity: ProcessedActivity) => void;
}

export default function FitFileUploader({ onActivityLoaded }: FitFileUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".fit")) {
      setError("Please upload a FIT file (.fit)");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const buffer = await file.arrayBuffer();
      const result = processFitFile(buffer);
      onActivityLoaded(result);
    } catch (err: any) {
      setError(err.message || "An error occurred while processing the FIT file");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 transition-colors bg-white shadow-sm">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-blue-50 rounded-full">
          {isProcessing ? (
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          ) : (
            <FileUp className="w-12 h-12 text-blue-500" />
          )}
        </div>
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-800">Upload FIT Activity</h3>
          <p className="text-sm text-gray-500 mt-1">Select a .fit file from your device to analyze</p>
        </div>
        <label className={`inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg cursor-pointer hover:bg-blue-700 transition-colors ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <Upload className="w-5 h-5 mr-2" />
          {isProcessing ? "Processing..." : "Select FIT File"}
          <input
            type="file"
            className="hidden"
            accept=".fit"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
        </label>
        {error && <p className="text-red-500 text-sm font-medium mt-2">{error}</p>}
      </div>
    </div>
  );
}
