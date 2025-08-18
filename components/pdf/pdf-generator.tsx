"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileText,
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

type PDFGeneratorProps = {
  surveyResponseId: string;
};

export type GenerateOptions = {
  format?: "A4" | "Letter";
  orientation?: "portrait" | "landscape";
  includeCharts?: boolean;
  includeBenchmarking?: boolean;
};

export function PDFGenerator({ surveyResponseId }: PDFGeneratorProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [options, setOptions] = useState({
    format: "A4",
    orientation: "portrait",
    includeCharts: true,
    includeBenchmarking: true,
  });

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    setStatus(null);

    try {
      const res = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surveyResponseId, options }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to start PDF generation");

      setJobId(data.jobId);
      setStatus("pending");
      pollStatus(data.jobId);
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
      setIsGenerating(false);
    }
  }

  function pollStatus(jobId: string) {
    const maxAttempts = 30;
    let attempts = 0;

    const tick = async () => {
      try {
        const res = await fetch(`/api/pdf/status/${jobId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to check status");

        setStatus(data.status);

        if (data.status === "completed") {
          setPdfUrl(data.pdfUrl);
          setIsGenerating(false);
          // Refresh server components so /reports shows the new pdf_url
          startTransition(() => router.refresh());
          return;
        }

        if (data.status === "failed") {
          setError(data.error || "PDF generation failed");
          setIsGenerating(false);
          return;
        }

        if (data.status === "processing" || data.status === "pending") {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(tick, 1000);
          } else {
            setError("PDF generation timed out");
            setIsGenerating(false);
          }
        }
      } catch {
        setError("Failed to check generation status");
        setIsGenerating(false);
      }
    };

    tick();
  }

  function getStatusIcon() {
    switch (status) {
      case "pending":
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  }

  function getStatusText() {
    switch (status) {
      case "pending":
        return "Queued for processing...";
      case "processing":
        return "Generating PDF report...";
      case "completed":
        return "PDF generated successfully!";
      case "failed":
        return "Generation failed";
      default:
        return "";
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Generate PDF Report
        </CardTitle>
        <CardDescription>
          Create a comprehensive PDF report of your survey responses
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Page Format</Label>
            <Select
              value={options.format}
              onValueChange={(v) => setOptions({ ...options, format: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A4">A4</SelectItem>
                <SelectItem value="Letter">Letter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Orientation</Label>
            <Select
              value={options.orientation}
              onValueChange={(v) => setOptions({ ...options, orientation: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">Portrait</SelectItem>
                <SelectItem value="landscape">Landscape</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeCharts"
              checked={options.includeCharts}
              onCheckedChange={(c) =>
                setOptions({ ...options, includeCharts: !!c })
              }
            />
            <Label htmlFor="includeCharts">Include data visualizations</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeBenchmarking"
              checked={options.includeBenchmarking}
              onCheckedChange={(c) =>
                setOptions({ ...options, includeBenchmarking: !!c })
              }
            />
            <Label htmlFor="includeBenchmarking">
              Include CAO benchmarking data
            </Label>
          </div>
        </div>

        {/* Status */}
        {status && (
          <Alert>
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <AlertDescription>{getStatusText()}</AlertDescription>
            </div>
            {(status === "pending" || status === "processing") && (
              <Progress
                value={status === "pending" ? 25 : 75}
                className="mt-2"
              />
            )}
          </Alert>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || pending}
            className="flex-1"
          >
            {isGenerating || pending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate PDF
              </>
            )}
          </Button>

          {pdfUrl && (
            <Button variant="outline" asChild>
              <a href={pdfUrl} download>
                <Download className="h-4 w-4 mr-2" />
                Download
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
