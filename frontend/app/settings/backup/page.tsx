"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Clock, HardDrive, RefreshCw, Download, Trash2, Loader2, FileDown, CheckCircle2, AlertCircle } from "lucide-react";

import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";

type BackupFile = {
  filename: string;
  size: string;
  raw_size: number;
  created_at: string;
};

export default function BackupPage() {
  const [feedback, setFeedback] = useState("");
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["backups"],
    queryFn: async () => {
      const response = await apiFetch("/settings/backups");
      if (!response.ok) {
        throw new Error("Failed to load backup files.");
      }
      return response.json();
    },
  });

  const backups: BackupFile[] = data?.data ?? [];

  const backupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiFetch("/settings/backups", { method: "POST" });
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message ?? "Failed to trigger database backup.");
      }
      return response.json();
    },
    onSuccess: () => {
      refetch();
      setFeedback("Database backup completed successfully.");
      setTimeout(() => setFeedback(""), 5000);
    },
    onError: (error: Error) => {
      setFeedback(error.message);
      setTimeout(() => setFeedback(""), 5000);
    },
  });

  const handleDownload = async (filename: string) => {
    setDownloadingFile(filename);
    try {
      const response = await apiFetch(`/settings/backups/${filename}/download`);
      if (!response.ok) {
        throw new Error("Unable to download backup.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      setFeedback(`Downloaded ${filename} successfully.`);
      setTimeout(() => setFeedback(""), 5000);
    } catch (err: any) {
      setFeedback(err.message || "Failed to download backup.");
      setTimeout(() => setFeedback(""), 5000);
    } finally {
      setDownloadingFile(null);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (filename: string) => {
      setDeletingFile(filename);
      const response = await apiFetch(`/settings/backups/${filename}`, { method: "DELETE" });
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message ?? "Failed to delete backup.");
      }
      return response.json();
    },
    onSuccess: () => {
      refetch();
      setFeedback("Backup deleted successfully.");
      setConfirmDeleteFile(null);
      setTimeout(() => setFeedback(""), 5000);
    },
    onError: (error: Error) => {
      setFeedback(error.message);
      setTimeout(() => setFeedback(""), 5000);
    },
    onSettled: () => {
      setDeletingFile(null);
    }
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <BackToSettings />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Backup & Recovery</h1>
          <p className="text-sm text-muted-foreground">Scheduled backups and restore policies — BRD §6.4</p>
        </div>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-[color:var(--surface-subtle)] p-3 text-sm">
          {feedback.toLowerCase().includes("fail") || feedback.toLowerCase().includes("unable") ? (
            <AlertCircle className="h-4 w-4 text-destructive" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          )}
          <span>{feedback}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-semibold">Backup Schedule</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Configure automatic backup intervals</p>
          <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" defaultValue="Daily at 02:00 UTC" disabled>
            <option>Daily at 02:00 UTC</option>
            <option>Weekly (Sunday)</option>
            <option>Manual Only</option>
          </select>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-semibold">Retention Policy</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">How long to keep backup copies</p>
          <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" defaultValue="1 year" disabled>
            <option>30 days</option>
            <option>60 days</option>
            <option>90 days</option>
            <option>1 year</option>
          </select>
        </div>

        <div className="sm:col-span-2 rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold">Recovery & History</h3>
            </div>
            <Button
              onClick={() => backupMutation.mutate()}
              disabled={backupMutation.isPending}
              size="sm"
            >
              {backupMutation.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                  Backing up...
                </>
              ) : (
                "Run Manual Backup"
              )}
            </Button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              <span>Loading backups...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-sm text-destructive gap-2">
              <AlertCircle className="h-6 w-6" />
              <span>Failed to load backups list.</span>
            </div>
          ) : backups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
              <FileDown className="h-8 w-8 text-muted-foreground/60 mb-2" />
              <p className="font-medium">No recent backup operations</p>
              <p className="text-xs text-muted-foreground/80 mt-1">Configure the backend cron scheduler or click "Run Manual Backup" to start.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-medium">
                    <th className="py-2 px-3">Filename</th>
                    <th className="py-2 px-3">Size</th>
                    <th className="py-2 px-3">Date Created</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {backups.map((backup) => {
                    const isDeleting = deletingFile === backup.filename;
                    const isDownloading = downloadingFile === backup.filename;
                    const showConfirm = confirmDeleteFile === backup.filename;

                    return (
                      <tr key={backup.filename} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2 px-3 font-mono font-medium truncate max-w-[240px]" title={backup.filename}>
                          {backup.filename}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">
                          {backup.size}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">
                          {new Date(backup.created_at).toLocaleString("id-ID", {
                            year: "numeric",
                            month: "short",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {showConfirm ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-destructive font-medium mr-1">Confirm delete?</span>
                              <Button
                                variant="destructive"
                                size="xs"
                                onClick={() => deleteMutation.mutate(backup.filename)}
                                disabled={isDeleting}
                              >
                                {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes"}
                              </Button>
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => setConfirmDeleteFile(null)}
                                disabled={isDeleting}
                              >
                                No
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => handleDownload(backup.filename)}
                                disabled={isDownloading || isDeleting}
                              >
                                {isDownloading ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <Download className="h-3 w-3 mr-1" />
                                )}
                                Download
                              </Button>
                              <Button
                                variant="outline"
                                size="xs"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setConfirmDeleteFile(backup.filename)}
                                disabled={isDownloading || isDeleting}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2 border-t border-border/60 pt-3">
            Configure the backend cron scheduler to enable automated backups.
          </p>
        </div>
      </div>
    </div>
  );
}
