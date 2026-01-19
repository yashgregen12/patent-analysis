import { useEffect, useState } from "react";
import { attorneyAPI } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate, Link } from "react-router-dom";
import { Loading } from "@/components/Loading";
import { FileText, UserPlus, Clock, Search, ArrowRight } from "lucide-react";

const AttorneyDashboard = () => {
  const navigate = useNavigate();
  const [ips, setIps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAssignedIPs();
  }, []);

  const fetchAssignedIPs = async () => {
    try {
      const response = await attorneyAPI.getAllIPs(); // Backend now filters by reviewer
      if (response.data.success) {
        setIps(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching assigned IPs:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
          <h1 className="text-3xl font-bold">Attorney Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your assigned IP reviews
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Quick Stats or Overview could go here */}

        {/* Assigned IPs List */}
        <Card>
          <CardHeader>
            <CardTitle>Assigned Applications ({ips.length})</CardTitle>
            <CardDescription>
              IP applications assigned to you for review and examination.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ips.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium">No Assigned IPs</h3>
                <p className="text-muted-foreground">
                  You don't have any IP applications assigned for review yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {ips.map((ip) => (
                  <div
                    key={ip._id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">
                          {ip.title}
                        </span>
                        <Badge className={getStatusColor(ip.currentStatus)}>
                          {ip.currentStatus}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Filed: {new Date(ip.createdAt).toLocaleDateString()}
                        </span>
                        <span>
                          App #: {ip.creator?.applicationNumber || "N/A"}
                        </span>
                        <span>Applicant: {ip.creator?.email}</span>
                      </div>
                    </div>
                    <Button onClick={() => navigate(`/attorney/ip/${ip._id}`)}>
                      Review
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AttorneyDashboard;
