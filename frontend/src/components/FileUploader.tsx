"use client";

import { useState } from "react";
import { Upload, FileUp, Loader2 } from "lucide-react";
import { LabTestPayload } from "@/context/AppContext";

interface FileUploaderProps {
  onDataLoaded: (payload: LabTestPayload) => void;
}

export default function FileUploader({ onDataLoaded }: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setError("Please upload an Excel file (.xlsx or .xls)");
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/api/lab-analyzer/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to process file");
      }

      const result = await response.json();
      onDataLoaded(result);
    } catch (err: any) {
      setError(err.message || "An error occurred while uploading the file");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 transition-colors bg-white shadow-sm">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-blue-50 rounded-full">
          {isUploading ? (
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          ) : (
            <FileUp className="w-12 h-12 text-blue-500" />
          )}
        </div>
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-800">
            Upload Lab Test Data
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Accepts .xlsx or .xls files from lab tests
          </p>
        </div>
        <label
          className={`inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg cursor-pointer hover:bg-blue-700 transition-colors ${
            isUploading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <Upload className="w-5 h-5 mr-2" />
          {isUploading ? "Processing..." : "Select File"}
          <input
            type="file"
            className="hidden"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>
        {error && (
          <p className="text-red-500 text-sm font-medium mt-2">{error}</p>
        )}
      </div>
    </div>
  );
}
