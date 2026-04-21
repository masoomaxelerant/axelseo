"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Globe, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useClients, useCreateClient, useDeleteClient } from "@/hooks/use-clients";

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

      {clients && clients.length > 0 && (
        <div className="mt-6 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 max-w-sm"
          />
        </div>
      )}

      <div className="mt-6">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
          </div>
        ) : !filtered?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 mb-4">
                <Globe className="h-7 w-7 text-brand-orange" />
              </div>
              <p className="font-display font-semibold">
                {search ? "No clients match your search" : "No clients yet"}
              </p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {search ? "Try a different search term" : "Add your first client to organize audits"}
              </p>
              {!search && <Button onClick={() => setShowAdd(true)}>Add First Client</Button>}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((client) => (
              <ClientCardReal key={client.id} client={client} />
            ))}
          </div>
        )}
      </div>

      <AddClientDialog open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}

function ClientCardReal({ client }: { client: { id: string; name: string; domain: string; notes: string | null; created_at: string } }) {
  const deleteClient = useDeleteClient();

  return (
    <Card className="group transition-all hover:shadow-md hover:border-brand-orange/30">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <Link href={`/dashboard/clients/${client.id}`} className="flex items-center gap-3 flex-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy text-white font-display font-bold text-sm shrink-0">
              {client.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-display font-semibold text-foreground group-hover:text-brand-orange transition-colors">
                {client.name}
              </h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Globe className="h-3 w-3" />
                {client.domain}
              </div>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
            onClick={() => { if (confirm(`Delete ${client.name}?`)) deleteClient.mutate(client.id); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Added {new Date(client.created_at).toLocaleDateString()}
          </span>
          {client.notes && (
            <span className="truncate max-w-[150px]">{client.notes}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AddClientDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createClient = useCreateClient();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createClient.mutate(
      { name, domain, notes: notes || undefined },
      {
        onSuccess: () => {
          setName("");
          setDomain("");
          setNotes("");
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription>Create a new client to organize audits.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4 mt-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-medium" htmlFor="client-name">Client Name</label>
            <Input id="client-name" placeholder="e.g. Acme Corp" className="mt-1" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="client-domain">Primary Domain</label>
            <Input id="client-domain" placeholder="e.g. acme-corp.com" className="mt-1" required value={domain} onChange={(e) => setDomain(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="client-notes">Notes (optional)</label>
            <Input id="client-notes" placeholder="Internal notes about this client" className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createClient.isPending}>
              {createClient.isPending ? "Creating..." : "Create Client"}
            </Button>
          </div>
          {createClient.isError && (
            <p className="text-xs text-red-600">{createClient.error.message}</p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
