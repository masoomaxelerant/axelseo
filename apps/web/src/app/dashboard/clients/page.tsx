"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { ClientCard } from "@/components/clients/client-card";
import { useClients } from "@/hooks/use-clients";

export default function ClientsPage() {
  const { data: clients, isLoading } = useClients();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = clients?.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.domain.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage client projects and audits</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Client
        </Button>
      </div>

      <div className="mt-6 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 max-w-sm"
        />
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
          </div>
        ) : !filtered?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16">
              <p className="font-display font-semibold">
                {search ? "No clients match your search" : "No clients yet"}
              </p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {search ? "Try a different search term" : "Add your first client to get started"}
              </p>
              {!search && <Button onClick={() => setShowAdd(true)}>Add First Client</Button>}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>Create a new client project to organize audits.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4 mt-4" onSubmit={(e) => { e.preventDefault(); setShowAdd(false); }}>
            <div>
              <label className="text-sm font-medium" htmlFor="client-name">Client Name</label>
              <Input id="client-name" placeholder="e.g. Acme Corp" className="mt-1" required />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="client-domain">Primary Domain</label>
              <Input id="client-domain" placeholder="e.g. acme-corp.com" className="mt-1" required />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="client-notes">Notes (optional)</label>
              <Input id="client-notes" placeholder="Internal notes about this client" className="mt-1" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit">Create Client</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
