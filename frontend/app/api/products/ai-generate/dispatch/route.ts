import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const backendBase =
    process.env.API_INTERNAL_URL ||
    (process.env.NODE_ENV === "production" ? "http://backend-k8s:8000" : "http://localhost:8000");

  const url = `${backendBase.replace(/\/$/, "")}/api/products/ai-generate/dispatch`;

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
    console.error("[RouteHandler] Error proxying ai-generate/dispatch to backend:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DISPATCH_FAILED",
          message: err?.message || "Failed to dispatch product AI profiling job.",
        },
      },
      { status: 502 }
    );
  }
}
