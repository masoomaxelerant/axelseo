"use client";

import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User, Users, Key, Palette } from "lucide-react";

export default function SettingsPage() {
  const { user } = useUser();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and team preferences</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-brand-orange" />
            <div>
              <CardTitle className="font-display text-base">Profile</CardTitle>
              <CardDescription>Your account information from Clerk</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <p className="text-sm font-medium mt-0.5">{user?.fullName || "—"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-sm font-medium mt-0.5">{user?.primaryEmailAddress?.emailAddress || "—"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Role</label>
              <Badge variant="outline" className="mt-0.5">Admin</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-brand-orange" />
              <div>
                <CardTitle className="font-display text-base">Team Members</CardTitle>
                <CardDescription>Manage who has access to AxelSEO</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm">Invite Member</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">{user?.fullName || "You"}</p>
                <p className="text-xs text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p>
              </div>
              <Badge>Admin</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-brand-orange" />
            <div>
              <CardTitle className="font-display text-base">Integrations</CardTitle>
              <CardDescription>Connect external services</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Google Search Console</p>
              <p className="text-xs text-muted-foreground">Connect to get real keyword data per client</p>
            </div>
            <Button variant="outline" size="sm">Connect</Button>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Cloudflare R2</p>
              <p className="text-xs text-muted-foreground">Storage for PDF reports and screenshots</p>
            </div>
            <Badge variant="outline">Not configured</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-brand-orange" />
            <div>
              <CardTitle className="font-display text-base">Report Branding</CardTitle>
              <CardDescription>Customize PDF report appearance per client</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium" htmlFor="brand-color">Primary Color</label>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-8 w-8 rounded border bg-brand-orange" />
              <Input id="brand-color" defaultValue="#FF5C00" className="max-w-32 font-mono text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="brand-logo">Company Logo URL</label>
            <Input id="brand-logo" placeholder="https://..." className="mt-1 max-w-md" />
          </div>
          <Button size="sm">Save Branding</Button>
        </CardContent>
      </Card>
    </div>
  );
}
