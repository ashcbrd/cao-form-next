"use client";

import { useState } from "react";
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

interface PDFGeneratorProps {
  surveyResponseId: string;
  onGenerated?: (pdfUrl: string) => void;
}

export function PDFGenerator({
  surveyResponseId,
  onGenerated,
}: PDFGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [options, setOptions] = useState({
    format: "A4",
    orientation: "portrait",
    includeCharts: true,
    includeBenchmarking: true,
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyResponseId,
          options,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start PDF generation");
      }

      setJobId(data.jobId);
      setStatus("pending");

      // Poll for status
      pollStatus(data.jobId);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      setIsGenerating(false);
    }
  };

  const pollStatus = async (jobId: string) => {
    const maxAttempts = 30; // 30 seconds max
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/pdf/status/${jobId}`);
        const data = await response.json();

        if (response.ok) {
          setStatus(data.status);

          if (data.status === "completed") {
            setPdfUrl(data.pdfUrl);
            setIsGenerating(false);
            onGenerated?.(data.pdfUrl);
            return;
          }

          if (data.status === "failed") {
            setError(data.error || "PDF generation failed");
            setIsGenerating(false);
            return;
          }

          // Continue polling if still processing
          if (data.status === "processing" || data.status === "pending") {
            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(poll, 1000);
            } else {
              setError("PDF generation timed out");
              setIsGenerating(false);
            }
          }
        } else {
          setError(data.error || "Failed to check status");
          setIsGenerating(false);
        }
      } catch (error) {
        setError("Failed to check generation status");
        setIsGenerating(false);
      }
    };

    poll();
  };

  const getStatusIcon = () => {
    switch (status) {
      case "pending":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
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
  };

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
              onValueChange={(value) =>
                setOptions({ ...options, format: value })
              }
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
              onValueChange={(value) =>
                setOptions({ ...options, orientation: value })
              }
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
              onCheckedChange={(checked) =>
                setOptions({ ...options, includeCharts: !!checked })
              }
            />
            <Label htmlFor="includeCharts">Include data visualizations</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeBenchmarking"
              checked={options.includeBenchmarking}
              onCheckedChange={(checked) =>
                setOptions({ ...options, includeBenchmarking: !!checked })
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
            disabled={isGenerating}
            className="flex-1"
          >
            {isGenerating ? (
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
