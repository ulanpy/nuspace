"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import { Button } from "@/components/atoms/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/select";
import { Badge } from "@/components/atoms/badge";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { sgotinishApi } from "../api/sgotinish-api";
import { Department, SGMemberResponse, UserRole } from "../types";
import { mapRoleToDisplayName } from "../utils/role-mapping";

type CurrentUser = {
  sub?: string;
  role?: string;
  department_id?: number | null;
};

type Props = {
  currentUser: CurrentUser | null | undefined;
};

type DepartmentGroup = {
  id: number;
  name: string;
  capos: SGMemberResponse[];
  soldiers: SGMemberResponse[];
};

type CabinetWithdrawalResult = {
  removedCount: number;
  totalTargets: number;
  failures: Array<{ name: string; reason: string }>;
};

const SG_DEPARTMENT_ID = 9;

const SG_ROLE_OPTIONS: Array<{ value: "boss" | "capo" | "soldier"; label: string }> = [
  { value: "boss", label: "Head" },
  { value: "capo", label: "Executive" },
  { value: "soldier", label: "Member" },
];

const parseApiError = async (error: unknown, fallback: string): Promise<string> => {
  const response =
    typeof error === "object" && error !== null && "response" in error
      ? (error as { response?: Response }).response
      : undefined;

  if (response instanceof Response) {
    try {
      const text = await response.clone().text();
      if (text.trim()) {
        try {
          const data = JSON.parse(text) as { detail?: unknown };
          if (typeof data.detail === "string" && data.detail.trim()) return data.detail.trim();
          if (Array.isArray(data.detail) && data.detail.length > 0) {
            return data.detail
              .map((item) => (typeof item?.msg === "string" ? item.msg : "Validation error"))
              .join(". ");
          }
        } catch {
          return text.trim();
        }
      }
    } catch {
      // Fallback below.
    }
    return `${fallback} (HTTP ${response.status})`;
  }

  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
};

export function SGMembersManagement({ currentUser }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const currentRole = currentUser?.role as UserRole | undefined;
  const isBoss = currentRole === "boss";
  const canManageDepartments = currentRole === "boss" || currentRole === "admin";
  const canManage = currentRole === "boss" || currentRole === "capo" || currentRole === "admin";
  const isSgMember = currentRole === "boss" || currentRole === "capo" || currentRole === "soldier";
  const canViewMembers = canManage || isSgMember;
  const isCapo = currentRole === "capo";
  const currentDepartmentId = typeof currentUser?.department_id === "number" ? currentUser.department_id : null;

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery.trim(), 250);
  const [selectedUserSub, setSelectedUserSub] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<"boss" | "capo" | "soldier">(isCapo ? "soldier" : "soldier");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(
    isCapo ? currentDepartmentId : null,
  );
  const [deletingSub, setDeletingSub] = useState<string | null>(null);
  const [isDepartmentManagerOpen, setIsDepartmentManagerOpen] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [newDepartmentIsSpecial, setNewDepartmentIsSpecial] = useState(false);
  const [deletingDepartmentId, setDeletingDepartmentId] = useState<number | null>(null);

  const { data: departments = [] } = useQuery({
    queryKey: ["sg-members", "departments"],
    queryFn: sgotinishApi.getDepartments,
    enabled: canViewMembers,
  });

  const { data: sgMembers = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ["sg-members", "list"],
    queryFn: sgotinishApi.getSgMembers,
    enabled: canViewMembers,
  });

  const { data: userResults = [], isLoading: isSearchingUsers } = useQuery({
    queryKey: ["sg-members", "search-users", debouncedSearch],
    queryFn: () => sgotinishApi.searchUsersForSg({ q: debouncedSearch, limit: 20 }),
    enabled: canManage && debouncedSearch.length >= 2,
  });

  const selectedUser = useMemo(
    () => userResults.find((u) => u.user.sub === selectedUserSub) ?? null,
    [userResults, selectedUserSub],
  );

  const selectedDepartment = useMemo(() => {
    if (!selectedDepartmentId) return null;
    return departments.find((dept) => dept.id === selectedDepartmentId) ?? null;
  }, [departments, selectedDepartmentId]);

  const sortedBosses = useMemo(() => {
    const bosses = sgMembers.filter((member) => member.role === "boss");
    return bosses.sort((a, b) => {
      const aTime = a.sg_assigned_at ? new Date(a.sg_assigned_at).getTime() : 0;
      const bTime = b.sg_assigned_at ? new Date(b.sg_assigned_at).getTime() : 0;
      if (aTime !== bTime) return aTime - bTime;
      return `${a.user.name} ${a.user.surname}`.localeCompare(`${b.user.name} ${b.user.surname}`);
    });
  }, [sgMembers]);

  const departmentNameById = useMemo(() => {
    return new Map<number, string>(departments.map((department) => [department.id, department.name]));
  }, [departments]);

  const specialDepartmentDefinitions = useMemo(() => {
    return departments
      .filter((department) => department.is_special)
      .sort((a, b) => b.id - a.id);
  }, [departments]);

  const { regularDepartmentGroups, specialDepartmentGroups } = useMemo(() => {
    const departmentMap = new Map<number, DepartmentGroup>();
    const specialDepartmentIds = new Set<number>(specialDepartmentDefinitions.map((department) => department.id));

    const ensureGroup = (departmentId: number, departmentName: string) => {
      const existing = departmentMap.get(departmentId);
      if (existing) return existing;
      const group: DepartmentGroup = {
        id: departmentId,
        name: departmentName,
        capos: [],
        soldiers: [],
      };
      departmentMap.set(departmentId, group);
      return group;
    };

    for (const member of sgMembers) {
      if (member.role === "boss") continue;

      const departmentId = member.department?.id ?? -1;
      const departmentName =
        member.department?.name ??
        departmentNameById.get(departmentId) ??
        (departmentId === SG_DEPARTMENT_ID ? "SG" : departmentId === -1 ? "Unassigned" : "Department");

      const group = ensureGroup(departmentId, departmentName);

      if (member.role === "capo") {
        group.capos.push(member);
      } else if (member.role === "soldier") {
        group.soldiers.push(member);
      }
    }

    const sortMembers = (members: SGMemberResponse[]) =>
      members.sort((a, b) => `${a.user.name} ${a.user.surname}`.localeCompare(`${b.user.name} ${b.user.surname}`));

    const allGroups = Array.from(departmentMap.values()).map((group) => ({
      ...group,
      capos: sortMembers(group.capos),
      soldiers: sortMembers(group.soldiers),
    }));

    const specialGroupMap = new Map<number, DepartmentGroup>();
    for (const group of allGroups) {
      if (specialDepartmentIds.has(group.id)) {
        specialGroupMap.set(group.id, group);
      }
    }

    const specialOrdered = specialDepartmentDefinitions.map((department) => {
      const existing = specialGroupMap.get(department.id);
      if (existing) return existing;
      return {
        id: department.id,
        name: department.name,
        capos: [],
        soldiers: [],
      };
    });

    const regular = allGroups
      .filter((group) => group.id !== SG_DEPARTMENT_ID && !specialDepartmentIds.has(group.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      regularDepartmentGroups: regular,
      specialDepartmentGroups: specialOrdered,
    };
  }, [departmentNameById, sgMembers, specialDepartmentDefinitions]);

  const cabinetTargets = useMemo(
    () => sgMembers.filter((member) => member.role !== "boss"),
    [sgMembers],
  );

  const upsertMutation = useMutation({
    mutationFn: sgotinishApi.upsertSgMember,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["sg-members", "list"] });
      toast({
        title: "SG membership updated",
        description: `${result.user.name} ${result.user.surname} is now ${mapRoleToDisplayName(result.role)}.`,
        variant: "success",
      });
      setSearchQuery("");
      setSelectedUserSub(null);
      if (!isCapo) {
        setSelectedDepartmentId(null);
      }
      setSelectedRole("soldier");
    },
    onError: async (error) => {
      toast({
        title: "Failed to update SG membership",
        description: await parseApiError(error, "Could not update SG membership."),
        variant: "error",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (targetSub: string) => sgotinishApi.removeSgMember(targetSub),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["sg-members", "list"] });
      toast({
        title: "SG member removed",
        description: result.detail,
        variant: "success",
      });
    },
    onError: async (error) => {
      toast({
        title: "Failed to remove SG member",
        description: await parseApiError(error, "Could not remove SG member."),
        variant: "error",
      });
    },
    onSettled: () => {
      setDeletingSub(null);
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: sgotinishApi.withdrawFromSg,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["sg-members", "list"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["sg-tickets"] });
      toast({
        title: "Withdrawn from SG",
        description: result.detail,
        variant: "success",
      });
    },
    onError: async (error) => {
      toast({
        title: "Withdraw failed",
        description: await parseApiError(error, "Could not withdraw from SG."),
        variant: "error",
      });
    },
  });

  const withdrawCabinetMutation = useMutation({
    mutationFn: async (targets: SGMemberResponse[]): Promise<CabinetWithdrawalResult> => {
      let removedCount = 0;
      const failures: Array<{ name: string; reason: string }> = [];

      for (const member of targets) {
        try {
          await sgotinishApi.removeSgMember(member.user.sub);
          removedCount += 1;
        } catch (error) {
          failures.push({
            name: `${member.user.name} ${member.user.surname}`,
            reason: await parseApiError(error, "Failed to remove SG member."),
          });
        }
      }

      return {
        removedCount,
        totalTargets: targets.length,
        failures,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["sg-members", "list"] });
      queryClient.invalidateQueries({ queryKey: ["sg-tickets"] });

      if (result.failures.length === 0) {
        toast({
          title: "Cabinet withdrawn",
          description: `${result.removedCount} members were removed. Heads were kept.`,
          variant: "success",
        });
        return;
      }

      const firstFailure = result.failures[0];
      toast({
        title: "Cabinet withdraw completed with errors",
        description: `${result.removedCount}/${result.totalTargets} removed. First error: ${firstFailure.name}: ${firstFailure.reason}`,
        variant: "warning",
      });
    },
    onError: async (error) => {
      toast({
        title: "Cabinet withdraw failed",
        description: await parseApiError(error, "Could not withdraw cabinet."),
        variant: "error",
      });
    },
  });

  const createDepartmentMutation = useMutation({
    mutationFn: sgotinishApi.createDepartment,
    onSuccess: (department) => {
      queryClient.invalidateQueries({ queryKey: ["sg-members", "departments"] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["sg-members", "list"] });
      toast({
        title: "Department created",
        description: `${department.name} was added successfully.`,
        variant: "success",
      });
      setNewDepartmentName("");
      setNewDepartmentIsSpecial(false);
    },
    onError: async (error) => {
      toast({
        title: "Failed to create department",
        description: await parseApiError(error, "Could not create department."),
        variant: "error",
      });
    },
  });

  const deleteDepartmentMutation = useMutation({
    mutationFn: (departmentId: number) => sgotinishApi.deleteDepartment(departmentId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["sg-members", "departments"] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["sg-members", "list"] });
      queryClient.invalidateQueries({ queryKey: ["sg-tickets"] });
      toast({
        title: "Department deleted",
        description: result.detail,
        variant: "success",
      });
    },
    onError: async (error) => {
      toast({
        title: "Failed to delete department",
        description: await parseApiError(error, "Could not delete department."),
        variant: "error",
      });
    },
    onSettled: () => {
      setDeletingDepartmentId(null);
    },
  });

  const submitAddOrUpdate = () => {
    if (!selectedUserSub) {
      toast({
        title: "User required",
        description: "Select a user first.",
        variant: "warning",
      });
      return;
    }

    const roleToAssign = isCapo ? "soldier" : selectedRole;
    const departmentToAssign = isCapo ? currentDepartmentId : selectedDepartmentId;

    if (!departmentToAssign) {
      toast({
        title: "Department required",
        description: "Choose a department for this SG member.",
        variant: "warning",
      });
      return;
    }

    upsertMutation.mutate({
      target_user_sub: selectedUserSub,
      role: roleToAssign,
      department_id: departmentToAssign,
    });
  };

  const canCapoRemoveMember = (member: SGMemberResponse) => {
    if (currentRole !== "capo") return true;
    if (member.role !== "soldier") return false;
    if (currentDepartmentId === null) return false;
    return member.department?.id === currentDepartmentId;
  };

  const removeMember = (member: SGMemberResponse) => {
    if (!canManage || member.user.sub === currentUser?.sub || removeMutation.isPending) return;
    if (!canCapoRemoveMember(member)) return;
    const confirmed = window.confirm(`Remove ${member.user.name} ${member.user.surname} from SG?`);
    if (!confirmed) return;
    setDeletingSub(member.user.sub);
    removeMutation.mutate(member.user.sub);
  };

  const withdrawSelf = () => {
    if (!isSgMember || withdrawMutation.isPending) return;
    const confirmed = window.confirm("Withdraw yourself from SG Otiinish?");
    if (!confirmed) return;
    withdrawMutation.mutate();
  };

  const withdrawCabinet = () => {
    if (!isBoss || withdrawCabinetMutation.isPending) return;
    if (cabinetTargets.length === 0) {
      toast({
        title: "No cabinet members",
        description: "There are no executives or members to withdraw.",
        variant: "warning",
      });
      return;
    }

    const firstConfirm = window.confirm(
      `Withdraw cabinet and remove ${cabinetTargets.length} non-head SG members?`,
    );
    if (!firstConfirm) return;

    const secondConfirm = window.confirm(
      "This action keeps only heads. Continue to step 2 confirmation?",
    );
    if (!secondConfirm) return;

    const thirdConfirm = window.confirm(
      "Final confirmation: run Withdraw Cabinet now?",
    );
    if (!thirdConfirm) return;

    withdrawCabinetMutation.mutate(cabinetTargets);
  };

  const createDepartment = () => {
    if (!canManageDepartments || createDepartmentMutation.isPending) return;

    const normalizedName = newDepartmentName.trim();
    if (!normalizedName) {
      toast({
        title: "Department name required",
        description: "Enter a department name.",
        variant: "warning",
      });
      return;
    }

    createDepartmentMutation.mutate({
      name: normalizedName,
      is_special: newDepartmentIsSpecial,
    });
  };

  const deleteDepartment = (department: Department) => {
    if (!canManageDepartments || deleteDepartmentMutation.isPending) return;
    const confirmed = window.confirm(
      `Delete department "${department.name}"? SG members in this department will be removed from SG.`,
    );
    if (!confirmed) return;
    setDeletingDepartmentId(department.id);
    deleteDepartmentMutation.mutate(department.id);
  };

  const sgDepartmentName =
    departments.find((department) => department.id === SG_DEPARTMENT_ID)?.name ??
    sgMembers.find((member) => member.department?.id === SG_DEPARTMENT_ID)?.department?.name ??
    "SG";

  const renderMemberRow = (member: SGMemberResponse) => {
    const canRemoveMember =
      canManage &&
      member.user.sub !== currentUser?.sub &&
      canCapoRemoveMember(member);

    return (
      <div
        key={member.user.sub}
        className="flex flex-col gap-2 rounded-lg border border-border/50 bg-background/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {member.user.name} {member.user.surname}
          </p>
          <p className="truncate text-xs text-muted-foreground">{member.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {mapRoleToDisplayName(member.role)}
          </Badge>
          {canRemoveMember && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => removeMember(member)}
              disabled={removeMutation.isPending && deletingSub === member.user.sub}
            >
              {removeMutation.isPending && deletingSub === member.user.sub ? "Removing..." : "Remove"}
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderDepartmentGroup = (group: DepartmentGroup) => {
    return (
      <div className="rounded-lg border border-border/60 p-3 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">{group.name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="inline-flex items-center gap-1.5 tabular-nums">
              <span>Executives</span>
              <span>{group.capos.length}</span>
            </Badge>
            <Badge variant="outline" className="inline-flex items-center gap-1.5 tabular-nums">
              <span>Members</span>
              <span>{group.soldiers.length}</span>
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Executives</p>
            {group.capos.length > 0 ? (
              group.capos.map((member) => renderMemberRow(member))
            ) : (
              <p className="text-sm text-muted-foreground">No executives in this department.</p>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Members</p>
            {group.soldiers.length > 0 ? (
              group.soldiers.map((member) => renderMemberRow(member))
            ) : (
              <p className="text-sm text-muted-foreground">No members in this department.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!canViewMembers) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">SG Membership</CardTitle>
            <p className="text-sm text-muted-foreground">
              Manage who handles SG Otiinish and their hierarchy roles.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {canManageDepartments && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDepartmentManagerOpen((prev) => !prev)}
                disabled={createDepartmentMutation.isPending || deleteDepartmentMutation.isPending}
              >
                {isDepartmentManagerOpen ? "Close Departments" : "Manage Departments"}
              </Button>
            )}
            {isBoss && (
              <Button
                variant="destructive"
                size="sm"
                onClick={withdrawCabinet}
                disabled={withdrawCabinetMutation.isPending || removeMutation.isPending}
              >
                {withdrawCabinetMutation.isPending ? "Withdrawing Cabinet..." : "Withdraw Cabinet"}
              </Button>
            )}
            {isSgMember && (
              <Button variant="outline" size="sm" onClick={withdrawSelf} disabled={withdrawMutation.isPending}>
                {withdrawMutation.isPending ? "Withdrawing..." : "Withdraw Myself"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {canManage && (
          <div className="rounded-xl border border-border/60 p-4 space-y-4">
            <h3 className="text-sm font-semibold">Add User to SG</h3>
            <div className="space-y-2">
              <Label htmlFor="sg-user-search">Find user</Label>
              <Input
                id="sg-user-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Type name, surname, or email"
              />
            </div>

            {debouncedSearch.length >= 2 && (
              <div className="rounded-md border border-border/60 max-h-44 overflow-y-auto">
                {isSearchingUsers ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
                ) : userResults.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No users found.</div>
                ) : (
                  userResults.map((result) => (
                    <button
                      key={result.user.sub}
                      type="button"
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-muted/50 ${
                        selectedUserSub === result.user.sub ? "bg-muted" : ""
                      }`}
                      onClick={() => setSelectedUserSub(result.user.sub)}
                    >
                      {result.user.name} {result.user.surname} · {result.email}
                    </button>
                  ))
                )}
              </div>
            )}

            {selectedUser && (
              <div className="text-sm text-muted-foreground">
                Selected: <span className="font-medium text-foreground">{selectedUser.user.name} {selectedUser.user.surname}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={isCapo ? "soldier" : selectedRole}
                  onValueChange={(value) => setSelectedRole(value as "boss" | "capo" | "soldier")}
                  disabled={isCapo}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(isCapo ? SG_ROLE_OPTIONS.filter((r) => r.value === "soldier") : SG_ROLE_OPTIONS).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={
                    isCapo
                      ? (currentDepartmentId ? String(currentDepartmentId) : undefined)
                      : (selectedDepartmentId ? String(selectedDepartmentId) : undefined)
                  }
                  onValueChange={(value) => setSelectedDepartmentId(Number(value))}
                  disabled={isCapo}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((department: Department) => (
                      <SelectItem key={department.id} value={String(department.id)}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isCapo && (
                  <p className="text-xs text-muted-foreground">
                    Executives can assign only members in their own department.
                  </p>
                )}
                {!isCapo && selectedDepartment && (
                  <p className="text-xs text-muted-foreground">Department: {selectedDepartment.name}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={submitAddOrUpdate} disabled={!selectedUserSub || upsertMutation.isPending}>
                {upsertMutation.isPending ? "Saving..." : "Add to SG"}
              </Button>
            </div>
          </div>
        )}

        {canManageDepartments && isDepartmentManagerOpen && (
          <div className="rounded-xl border border-border/60 p-4 space-y-4">
            <h3 className="text-sm font-semibold">Manage Departments</h3>

            <div className="space-y-2">
              {departments.length > 0 ? (
                departments.map((department) => (
                  <div
                    key={department.id}
                    className="flex flex-col gap-2 rounded-lg border border-border/60 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{department.name}</span>
                      {department.is_special && <Badge variant="secondary">Special</Badge>}
                      {department.id === SG_DEPARTMENT_ID && <Badge variant="outline">Protected</Badge>}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteDepartment(department)}
                      disabled={
                        department.id === SG_DEPARTMENT_ID ||
                        (deleteDepartmentMutation.isPending && deletingDepartmentId === department.id)
                      }
                    >
                      {department.id === SG_DEPARTMENT_ID
                        ? "Delete disabled"
                        : deleteDepartmentMutation.isPending && deletingDepartmentId === department.id
                        ? "Deleting..."
                        : "Delete"}
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No departments found.</p>
              )}
            </div>

            <div className="rounded-lg border border-border/60 p-3 space-y-3">
              <p className="text-sm font-semibold">Add Department</p>
              <div className="space-y-2">
                <Label htmlFor="new-department-name">Name</Label>
                <Input
                  id="new-department-name"
                  value={newDepartmentName}
                  onChange={(event) => setNewDepartmentName(event.target.value)}
                  placeholder="Enter department name"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newDepartmentIsSpecial}
                  onChange={(event) => setNewDepartmentIsSpecial(event.target.checked)}
                  className="h-4 w-4"
                />
                <span>Special department</span>
              </label>
              <div className="flex justify-end">
                <Button
                  onClick={createDepartment}
                  disabled={!newDepartmentName.trim() || createDepartmentMutation.isPending}
                >
                  {createDepartmentMutation.isPending ? "Creating..." : "Add Department"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">SG Hierarchy Tree</h3>
          {isLoadingMembers ? (
            <div className="text-sm text-muted-foreground">Loading hierarchy...</div>
          ) : sgMembers.length === 0 ? (
            <div className="text-sm text-muted-foreground">No SG members found.</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/60 p-4 space-y-4">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">{sgDepartmentName}</p>
                    </div>
                    <Badge variant="secondary" className="inline-flex items-center gap-1.5 tabular-nums">
                      <span>Heads</span>
                      <span>{sortedBosses.length}</span>
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {sortedBosses.length > 0 ? (
                      sortedBosses.map((member) => renderMemberRow(member))
                    ) : (
                      <p className="text-sm text-muted-foreground">No heads assigned.</p>
                    )}
                  </div>
                </div>

                {regularDepartmentGroups.length > 0 ? (
                  <div className="border-l border-border/60 pl-4 space-y-3">
                    {regularDepartmentGroups.map((group) => (
                      <div key={group.id}>{renderDepartmentGroup(group)}</div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No departments under SG yet.</p>
                )}
              </div>

              <div className="rounded-xl border border-border/60 p-4 space-y-3">
                <h4 className="text-sm font-semibold">Special Departments</h4>
                {specialDepartmentGroups.length > 0 ? (
                  specialDepartmentGroups.map((group) => (
                    <div key={`special-${group.id}`} className="rounded-lg border border-border/60 bg-muted/10 p-1">
                      {renderDepartmentGroup(group)}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No special departments configured.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
