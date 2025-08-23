import { NextResponse } from "next/server";
import { testReplicate } from "@/lib/testReplicate";

export async function GET() {
  try {
    console.log("Testing Replicate via API endpoint...");
    
    const result = await testReplicate();
    
    return NextResponse.json({
      success: true,
      result: result,
      message: "Replicate test completed successfully"
    });
  } catch (error) {
    console.error("Replicate test failed in API:", error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: "Replicate test failed"
    }, { status: 500 });
  }
}
