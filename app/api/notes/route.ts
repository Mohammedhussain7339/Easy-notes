
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const AWS_NOTES_API =
  process.env.AWS_NOTES_API_URL ||
  "https://e0c8z9dp7l.execute-api.ap-south-1.amazonaws.com/dev";

async function proxyNotesRequest(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    const apiAccessToken = token.apiAccessToken as string | undefined;

    if (!apiAccessToken) {
      return NextResponse.json(
        {
          success: false,
          message: "AWS_ACCESS_TOKEN_MISSING",
        },
        { status: 401 }
      );
    }

    const method = request.method;

    const body =
      ["POST", "PATCH", "DELETE"].includes(method)
        ? await request.text()
        : undefined;

    const awsResponse = await fetch(AWS_NOTES_API, {
      method,
      headers: {
        Authorization: `Bearer ${apiAccessToken}`,
        ...(body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      ...(body !== undefined ? { body } : {}),
      cache: "no-store",
    });

    const responseText = await awsResponse.text();

    let result: any;

    try {
      result = JSON.parse(responseText);

      // Support wrapped API Gateway Lambda responses.
      if (result.body !== undefined) {
        result =
          typeof result.body === "string"
            ? JSON.parse(result.body)
            : result.body;
      }
    } catch {
      console.error("Invalid AWS Notes API response");

      return NextResponse.json(
        {
          success: false,
          message: "INVALID_AWS_API_RESPONSE",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(result, {
      status: awsResponse.status,
    });
  } catch (error) {
    console.error("Notes API proxy error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return proxyNotesRequest(request);
}

export async function POST(request: NextRequest) {
  return proxyNotesRequest(request);
}

export async function PATCH(request: NextRequest) {
  return proxyNotesRequest(request);
}

export async function DELETE(request: NextRequest) {
  return proxyNotesRequest(request);
}
