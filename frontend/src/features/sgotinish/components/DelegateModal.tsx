import { useState, useEffect } from "react";
import { Button } from "@/components/atoms/button";
import { Modal } from "@/components/atoms/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/select";
import { Label } from "@/components/atoms/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { sgotinishApi } from "../api/sgotinishApi";
import { Department, SGUser, PermissionType } from "../types";
import { mapRoleToDisplayName } from "../utils/roleMapping";
import { HelpCircle } from "lucide-react";

interface DelegateModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: number;
  onSuccess: () => void;
}

export function DelegateModal({ isOpen, onClose, ticketId, onSuccess }: DelegateModalProps) {
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedPermission, setSelectedPermission] = useState<PermissionType | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const { data: departments, isLoading: isLoadingDepartments } = useQuery({
    queryKey: ["departments"],
    queryFn: sgotinishApi.getDepartments,
  });

  const { data: sgUsers, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["sg-users", selectedDepartment],
    queryFn: () => sgotinishApi.getSgUsers(selectedDepartment!),
    enabled: !!selectedDepartment,
  });
  
  const delegateMutation = useMutation({
    mutationFn: (payload: { ticketId: number; target_user_sub: string; permission: PermissionType }) => 
      sgotinishApi.delegateAccess(payload.ticketId, { target_user_sub: payload.target_user_sub, permission: payload.permission }),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  useEffect(() => {
    setSelectedUser(null);
  }, [selectedDepartment]);

  const handleSubmit = () => {
    if (selectedUser && selectedPermission) {
      delegateMutation.mutate({
        ticketId,
        target_user_sub: selectedUser,
        permission: selectedPermission,
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Grant Ticket Access"
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="department">Department</Label>
          <Select onValueChange={(value) => setSelectedDepartment(Number(value))}>
            <SelectTrigger id="department">
              <SelectValue placeholder="Select a department" />
            </SelectTrigger>
            <SelectContent>
              {isLoadingDepartments ? (
                <SelectItem value="loading" disabled>Loading...</SelectItem>
              ) : (
                departments?.map((dept: Department) => (
                  <SelectItem key={dept.id} value={String(dept.id)}>
                    {dept.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        {selectedDepartment && (
          <div>
            <Label htmlFor="user">User</Label>
            <Select onValueChange={setSelectedUser}>
              <SelectTrigger id="user">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingUsers ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : (
                  sgUsers?.map((user: SGUser) => (
                    <SelectItem key={user.user.sub} value={user.user.sub}>
                      {`${user.user.name} ${user.user.surname} (${mapRoleToDisplayName(user.role)})`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}
        {selectedUser && (
          <div>
            <div className="flex items-center gap-2">
              <Label htmlFor="permission">Permission</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowHelp(!showHelp)}
                className="p-1 h-6 w-6 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
            <Select onValueChange={(value) => setSelectedPermission(value as PermissionType)}>
              <SelectTrigger id="permission">
                <SelectValue placeholder="Select a permission level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PermissionType.VIEW}>View Ticket</SelectItem>
                <SelectItem value={PermissionType.ASSIGN}>Start Conversation</SelectItem>
                <SelectItem value={PermissionType.DELEGATE}>Grant Access</SelectItem>
              </SelectContent>
            </Select>
            {showHelp && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-blue-900 dark:text-blue-100">View Ticket</span>
                    <span className="text-blue-700 dark:text-blue-300"> - gives access to view ticket information and its conversation</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-900 dark:text-blue-100">Start Conversation</span>
                    <span className="text-blue-700 dark:text-blue-300"> - gives access to start 1-to-1 conversation with student and chat</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-900 dark:text-blue-100">Grant Access</span>
                    <span className="text-blue-700 dark:text-blue-300"> - allows to pass any permission type downstream. Head could delegate to anyone, Executive can grant access to any member of its department. Soldier can not grant access further</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!selectedUser || !selectedPermission || delegateMutation.isPending}>
          {delegateMutation.isPending ? "Granting..." : "Grant Access"}
        </Button>
      </div>
    </Modal>
  );
}
