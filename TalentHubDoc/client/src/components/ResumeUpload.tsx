import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Download, X, Loader2, Sparkles } from "lucide-react";

interface ResumeUploadProps {
  currentResumeUrl?: string;
  onUploadSuccess: (data: any) => void;
}

export function ResumeUpload({ currentResumeUrl, onUploadSuccess }: ResumeUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentResumeUrl || null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF or DOCX file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (selectedFile.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("resume", file);

    try {
      const response = await fetch("/api/candidates/resume", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }

      const data = await response.json();
      setPreview(data.resumeUrl);
      setFile(null);

      toast({
        title: "Resume Uploaded Successfully! ✨",
        description: "AI has extracted your information. Review the form below and save your changes.",
      });

      // Call success callback with extracted data
      onUploadSuccess(data);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async () => {
    if (!preview) return;

    try {
      window.open(preview, "_blank");
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to open resume. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemove = () => {
    setFile(null);
    // Reset file input
    const fileInput = document.getElementById("resume-upload") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const getFileName = () => {
    if (preview) {
      return preview.split("/").pop() || "resume";
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <CardTitle>Resume Upload</CardTitle>
        </div>
        <CardDescription>
          Upload your resume (PDF or DOCX). AI will automatically extract your information.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Info Alert */}
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertDescription>
            Our AI will automatically extract your skills, experience, education, and contact information from your resume!
          </AlertDescription>
        </Alert>

        {/* Resume Already Uploaded */}
        {preview && !file ? (
          <div className="space-y-4">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  Current resume: <strong>{getFileName()}</strong>
                </span>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleDownload}
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Resume
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreview(null)}
              >
                Replace
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* File Input */}
            <div className="space-y-2">
              <Label htmlFor="resume-upload">Select Resume</Label>
              <Input
                id="resume-upload"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </div>

            {/* Selected File Display */}
            {file && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Upload Button */}
            <Button
              type="button"
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing with AI...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload and Extract Data
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
