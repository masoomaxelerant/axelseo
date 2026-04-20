"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ExternalLink, Link2, Unlink, Loader2, CheckCircle2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useGSCStatus, useGSCAuthUrl, useGSCProperties, useGSCConnect, useGSCDisconnect } from "@/hooks/use-gsc";
import type { GSCProperty } from "@/types/gsc";

interface ConnectGSCButtonProps {
  clientId: string;
}

export function ConnectGSCCard({ clientId }: ConnectGSCButtonProps) {
  const { data: status, isLoading } = useGSCStatus(clientId);
  const disconnect = useGSCDisconnect();
  const searchParams = useSearchParams();
  const justConnected = searchParams.get("gsc") === "connected";
  const [showPropertyPicker, setShowPropertyPicker] = useState(justConnected);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Checking GSC connection...</span>
        </CardContent>
      </Card>
    );
  }

  // Connected state
  if (status?.connected) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <CardTitle className="font-display text-base">Google Search Console</CardTitle>
                <CardDescription>Connected to {status.gsc_property}</CardDescription>
              </div>
            </div>
            <Badge variant="success">Connected</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {status.last_fetch_at
                ? `Last synced: ${new Date(status.last_fetch_at).toLocaleDateString()}`
                : "Syncing data..."}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => disconnect.mutate(clientId)}
              disabled={disconnect.isPending}
            >
              <Unlink className="mr-1 h-3 w-3" />
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not connected — show connect button + optional property picker
  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="font-display text-base">Google Search Console</CardTitle>
                <CardDescription>Connect for real keyword data</CardDescription>
              </div>
            </div>
            <ConnectButton clientId={clientId} />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            Get real impressions, clicks, CTR, and ranking positions from Google — no third-party estimates.
          </p>
        </CardContent>
      </Card>

      {showPropertyPicker && (
        <PropertyPickerDialog clientId={clientId} onClose={() => setShowPropertyPicker(false)} />
      )}
    </>
  );
}

function ConnectButton({ clientId }: { clientId: string }) {
  const { refetch, isFetching } = useGSCAuthUrl(clientId);

  const handleConnect = async () => {
    const result = await refetch();
    if (result.data?.auth_url) {
      window.location.href = result.data.auth_url;
    }
  };

  return (
    <Button size="sm" onClick={handleConnect} disabled={isFetching}>
      {isFetching ? (
        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
      ) : (
        <Link2 className="mr-2 h-3 w-3" />
      )}
      Connect
    </Button>
  );
}

function PropertyPickerDialog({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const { data, refetch, isFetching } = useGSCProperties(clientId);
  const connect = useGSCConnect();
  const [selected, setSelected] = useState<string | null>(null);

  // Fetch properties on mount
  useState(() => { refetch(); });

  const handleConfirm = () => {
    if (!selected) return;
    connect.mutate(
      { client_id: clientId, gsc_property: selected },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select GSC Property</DialogTitle>
          <DialogDescription>Choose the Search Console property for this client.</DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-2">
          {isFetching ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading properties...
            </div>
          ) : data?.properties?.length ? (
            data.properties.map((prop: GSCProperty) => (
              <button
                key={prop.site_url}
                onClick={() => setSelected(prop.site_url)}
                className={`w-full flex items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                  selected === prop.site_url
                    ? "border-brand-orange bg-orange-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div>
                  <p className="text-sm font-medium">{prop.site_url}</p>
                  <p className="text-xs text-muted-foreground">{prop.permission_level}</p>
                </div>
                {selected === prop.site_url && (
                  <CheckCircle2 className="h-5 w-5 text-brand-orange" />
                )}
              </button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-4">No GSC properties found for this Google account.</p>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!selected || connect.isPending}>
            {connect.isPending ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
            Connect Property
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
