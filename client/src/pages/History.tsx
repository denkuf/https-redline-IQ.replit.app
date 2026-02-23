import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ContractCard } from "@/components/ContractCard";
import { Search, Plus, FileX, Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Contract, ContractFavorite } from "@shared/schema";

export default function History() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: contracts, isLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  const { data: favorites = [] } = useQuery<ContractFavorite[]>({
    queryKey: ["/api/favorites"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/contracts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Contract deleted",
        description: "The contract has been permanently removed.",
      });
      setDeleteId(null);
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Unable to delete this contract. Please try again.",
        variant: "destructive",
      });
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: async ({ contractId, isFavorited }: { contractId: number; isFavorited: boolean }) => {
      if (isFavorited) {
        await apiRequest("DELETE", `/api/favorites/${contractId}`);
      } else {
        await apiRequest("POST", "/api/favorites", { contractId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    },
    onError: () => {
      toast({
        title: "Failed to update favorite",
        description: "Unable to update favorite status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const isFavorited = (contractId: number) => 
    favorites.some((fav) => fav.contractId === contractId);

  const favoriteContractIds = new Set(favorites.map((fav) => fav.contractId));

  const filteredContracts = contracts?.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || c.type === typeFilter;
    const matchesTab = activeTab === "all" || favoriteContractIds.has(c.id);
    return matchesSearch && matchesType && matchesTab;
  }) || [];

  const contractTypes = [...new Set(contracts?.map((c) => c.type).filter(Boolean) || [])];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">My Contracts</h1>
          <p className="text-muted-foreground">
            {contracts?.length || 0} contract{contracts?.length !== 1 ? "s" : ""} analyzed
          </p>
        </div>
        <Link href="/">
          <Button data-testid="button-new-contract">
            <Plus className="h-4 w-4 mr-2" />
            New Contract
          </Button>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList data-testid="tabs-favorites">
          <TabsTrigger value="all" data-testid="tab-all-contracts">
            All Contracts
          </TabsTrigger>
          <TabsTrigger value="favorites" data-testid="tab-favorites">
            Favorites
            <Badge variant="outline" className="ml-2" data-testid="badge-favorites-count">
              {favorites.length}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contracts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-type-filter">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {contractTypes.map((type) => (
              <SelectItem key={type} value={type || "unknown"}>
                {type || "Unknown"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <FileX className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-2">
            {search || typeFilter !== "all" ? "No matching contracts" : "No contracts yet"}
          </h3>
          <p className="text-muted-foreground mb-6">
            {search || typeFilter !== "all"
              ? "Try adjusting your search or filter"
              : "Upload your first contract to get started"}
          </p>
          {!search && typeFilter === "all" && (
            <Link href="/">
              <Button data-testid="button-upload-first">
                <Plus className="h-4 w-4 mr-2" />
                Upload Contract
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredContracts.map((contract) => (
            <div key={contract.id} className="flex gap-2 items-start">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => favoriteMutation.mutate({ contractId: contract.id, isFavorited: isFavorited(contract.id) })}
                data-testid={`button-favorite-${contract.id}`}
                className="mt-1 shrink-0"
              >
                <Star
                  className="h-5 w-5"
                  fill={isFavorited(contract.id) ? "currentColor" : "none"}
                  strokeWidth={1.5}
                />
              </Button>
              <div className="flex-1 min-w-0">
                <ContractCard
                  contract={contract}
                  onDelete={(id) => setDeleteId(id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contract?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this contract and its analysis. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
