import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const backendBase =
    process.env.API_INTERNAL_URL ||
    (process.env.NODE_ENV === "production" ? "http://backend-k8s:8000" : "http://localhost:8000");

  const url = `${backendBase.replace(/\/$/, "")}/api/products/ai-generate/status/${encodeURIComponent(jobId)}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (!["host", "connection", "content-length", "transfer-encoding"].includes(lowerKey)) {
      headers.set(key, value);
    }
  });

  try {
    const backendRes = await fetch(url, {
      method: "GET",
      headers,
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
    console.error("[RouteHandler] Error proxying ai-generate/status to backend:", err);
    return NextResponse.json(
      {
        success: false,
        status: "error",
        error: err?.message || "Failed to fetch job status.",
      },
      { status: 502 }
    );
  }
}
