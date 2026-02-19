import { NextResponse } from "next/server";
import { processLabTestExcel } from "@/lib/dataProcessor";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ detail: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = processLabTestExcel(buffer);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error processing file:", error);
    return NextResponse.json({ detail: error.message || "Error processing file" }, { status: 500 });
  }
}
