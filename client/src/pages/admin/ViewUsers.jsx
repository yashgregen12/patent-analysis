import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { adminAPI } from "@/lib/api";
import { Search, UserCheck, UserX, Mail } from "lucide-react";
import { Loading } from "@/components/Loading";

const AdminViewUsers = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await adminAPI.getAllUsers();
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      alert(error.response?.data?.message || "Failed to fetch users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeAttorney = async (userId) => {
    if (
      !confirm("Are you sure you want to revoke this attorney's authorization?")
    )
      return;

    try {
      const response = await adminAPI.revokeAttorney(userId);
      if (response.data.success) {
        alert("Attorney authorization revoked");
        fetchUsers();
      }
    } catch (error) {
      console.error("Error revoking attorney:", error);
      alert(error.response?.data?.message || "Failed to revoke authorization");
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.applicationNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (user) => {
    const colors = {
      Admin: "bg-red-100 text-red-800",
      IPAttorney: "bg-purple-100 text-purple-800",
      Applicant: "bg-blue-100 text-blue-800",
      User: "bg-gray-100 text-gray-800",
    };

    return (
      <div className="flex items-center gap-2">
        <Badge className={colors[user.role] || colors.User}>{user.role}</Badge>
        {user.role === "IPAttorney" && user.isAuthorizedAttorney && (
          <UserCheck className="h-4 w-4 text-green-600" />
        )}
      </div>
    );
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8 mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground">
              View and manage all system users
            </p>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, name, or application number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users ({filteredUsers.length})</CardTitle>
            <CardDescription>Manage user roles and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>App Number</TableHead>
                  <TableHead>IPs</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground"
                    >
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>{user.name || "-"}</TableCell>
                      <TableCell>{getRoleBadge(user)}</TableCell>
                      <TableCell>{user.applicationNumber || "-"}</TableCell>
                      <TableCell>{user.ips?.length || 0}</TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {user.role === "IPAttorney" &&
                          user.isAuthorizedAttorney && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRevokeAttorney(user._id)}
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Revoke
                            </Button>
                          )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminViewUsers;
