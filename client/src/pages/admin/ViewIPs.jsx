import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { adminAPI } from "@/lib/api";
import { Loading } from "@/components/Loading";
import { Filter, UserPlus } from "lucide-react";

const AdminViewIPs = () => {
  const [ips, setIps] = useState([]);
  const [attorneys, setAttorneys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  // Assignment State
  const [selectedIP, setSelectedIP] = useState(null);
  const [selectedAttorney, setSelectedAttorney] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [ipsRes, usersRes] = await Promise.all([
        adminAPI.getAllIPs(),
        adminAPI.getAllUsers({ role: "IPAttorney" }),
      ]);


      console.log("IP response : ", ipsRes.data.data);

      if (ipsRes.data.success) {
        setIps(ipsRes.data.data);
      }
      if (usersRes.data.success) {
        // Filter only authorized attorneys
        setAttorneys(usersRes.data.data.filter((u) => u.isAuthorizedAttorney));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedIP || !selectedAttorney) return;

    setIsAssigning(true);
    try {
      const response = await adminAPI.assignIPToAttorney({
        ipId: selectedIP._id,
        attorneyId: selectedAttorney,
      });

      if (response.data.success) {
        alert("IP assigned successfully!");
        setIsDialogOpen(false);
        fetchData(); // Refresh list
      }
    } catch (error) {
      console.error("Error assigning IP:", error);
      alert(error.response?.data?.message || "Failed to assign IP");
    } finally {
      setIsAssigning(false);
    }
  };

  const filteredIPs = ips.filter((ip) =>
    statusFilter === "all" ? true : ip.currentStatus === statusFilter
  );

  const getStatusColor = (status) => {
    const colors = {
      submitted: "bg-blue-100 text-blue-800",
      under_review: "bg-yellow-100 text-yellow-800",
      revision_required: "bg-orange-100 text-orange-800",
      granted: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) return <Loading />;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Manage IPs</h1>
          <p className="text-muted-foreground">
            View and assign IP applications
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="granted">Granted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All IP Applications ({filteredIPs.length})</CardTitle>
          <CardDescription>
            Assign pending applications to authorized attorneys
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Applicant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIPs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No IPs found matching the filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredIPs.map((ip) => (
                  <TableRow key={ip._id}>
                    <TableCell
                      className="font-medium max-w-[200px] truncate"
                      title={ip.title}
                    >
                      {ip.title}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{ip.creator?.email}</span>
                        <span className="text-xs text-muted-foreground">
                          {ip.creator?.applicationNumber}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(ip.currentStatus)}>
                        {ip.currentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ip.reviewer ? (
                        <span className="text-sm font-medium text-purple-700">
                          {ip.reviewer.email}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">
                          Unassigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(ip.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog
                        open={isDialogOpen && selectedIP?._id === ip._id}
                        onOpenChange={(open) => {
                          setIsDialogOpen(open);
                          if (open) {
                            setSelectedIP(ip);
                            setSelectedAttorney(ip.reviewer?._id || "");
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <UserPlus className="w-4 h-4 mr-2" />
                            {ip.reviewer ? "Reassign" : "Assign"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Assign IP to Attorney</DialogTitle>
                            <DialogDescription>
                              Select an authorized IP Attorney to review "
                              {ip.title}".
                            </DialogDescription>
                          </DialogHeader>

                          <div className="py-4 space-y-4">
                            <div className="space-y-2">
                              <Label>Select Attorney</Label>
                              <Select
                                value={selectedAttorney}
                                onValueChange={setSelectedAttorney}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select an attorney" />
                                </SelectTrigger>
                                <SelectContent>
                                  {attorneys.length === 0 ? (
                                    <SelectItem value="none" disabled>
                                      No authorized attorneys found
                                    </SelectItem>
                                  ) : (
                                    attorneys.map((att) => (
                                      <SelectItem key={att._id} value={att._id}>
                                        {att.name
                                          ? `${att.name} (${att.email})`
                                          : att.email}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setIsDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleAssign}
                              disabled={isAssigning || !selectedAttorney}
                            >
                              {isAssigning
                                ? "Assigning..."
                                : "Confirm Assignment"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminViewIPs;
