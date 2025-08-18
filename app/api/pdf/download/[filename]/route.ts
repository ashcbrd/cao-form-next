// app/api/pdf/download/[filename]/route.ts
import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { promises as fs } from "node:fs";
import { pdfGenerator } from "@/lib/pdf/generator";

const PDF_DIR = path.join(process.cwd(), ".next", "cache", "pdfs");

// sugb-report-<surveyResponseId>-<timestamp>.pdf
const NAME_REGEX = /^sugb-report-([0-9a-f-]{36})-(\d+)\.pdf$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;
    if (!filename?.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Invalid file" }, { status: 400 });
    }

    const abs = path.join(PDF_DIR, filename);

    // try to read the existing file
    try {
      const data = await fs.readFile(abs);
      // @ts-ignore
      return new NextResponse(data, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "private, max-age=0, no-cache",
        },
      });
    } catch (e: any) {
      if (e?.code !== "ENOENT") throw e;
      // fallthrough -> regenerate
    }

    // If missing, try to regenerate using the surveyResponseId embedded in the name
    const m = filename.match(NAME_REGEX);
    if (!m) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const surveyResponseId = m[1];

    // render fresh buffer and save under the SAME filename so the link works
    const buffer = await pdfGenerator.generatePDFBuffer({
      surveyResponseId,
      format: "A4",
      orientation: "portrait",
    });

    await fs.mkdir(PDF_DIR, { recursive: true });
    await fs.writeFile(abs, buffer);
    // @ts-ignore
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=0, no-cache",
      },
    });
  } catch (err) {
    console.error("Download error:", err);
    return NextResponse.json({ error: "Failed to download" }, { status: 500 });
  }
}
