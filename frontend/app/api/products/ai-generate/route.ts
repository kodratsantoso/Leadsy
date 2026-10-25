import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120; // 120 seconds
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const backendBase =
    process.env.API_INTERNAL_URL ||
    (process.env.NODE_ENV === "production" ? "http://backend-k8s:8000" : "http://localhost:8000");

  const url = `${backendBase.replace(/\/$/, "")}/api/products/ai-generate`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (!["host", "connection", "content-length", "transfer-encoding"].includes(lowerKey)) {
      headers.set(key, value);
    }
  });

  try {
    const body = await req.arrayBuffer();
    const backendRes = await fetch(url, {
      method: "POST",
      headers,
      body: body.byteLength > 0 ? body : undefined,
      signal: AbortSignal.timeout(120_000), // 2 minutes
    });

    const resContentType = backendRes.headers.get("content-type") || "application/json";
    const data = await backendRes.arrayBuffer();

    return new NextResponse(data, {
      status: backendRes.status,
      headers: {
        "Content-Type": resContentType,
      },
    });
  } catch (err: any) {
    console.error("[RouteHandler] Error proxying ai-generate to backend:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "AI_GENERATION_TIMEOUT",
          message: "The AI analysis took longer than expected. Please retry or generate using product name.",
        },
      },
      { status: 504 }
    );
  }
}
