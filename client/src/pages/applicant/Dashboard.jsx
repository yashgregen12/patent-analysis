import { useEffect, useState } from "react";
import { applicantAPI } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { List, Clock, FileText, ArrowRight } from "lucide-react";
import { Loading } from "@/components/Loading";

const ApplicantDashboard = () => {
  const navigate = useNavigate();
  const [ips, setIps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMyIPs();
  }, []);

  const fetchMyIPs = async () => {
    try {
      const response = await applicantAPI.getMyIPs();
      if (response.data.success) {
        setIps(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching my IPs", error);
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
          <h1 className="text-3xl font-bold">My Applications</h1>
          <p className="text-muted-foreground">
            Track status and communicate with attorney
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {ips.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium">No Applications</h3>
            <p className="text-muted-foreground">
              You haven't submitted any patent applications yet.
            </p>
          </div>
        ) : (
          ips.map((ip) => (
            <Card key={ip._id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{ip.title}</CardTitle>
                    <CardDescription>
                      {ip.preambleToDescription}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(ip.currentStatus)}>
                    {ip.currentStatus}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex bg-muted/30 p-3 rounded-md items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Filed: {new Date(ip.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => navigate(`/ip/${ip._id}`)}
                >
                  View Details & Respond
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ApplicantDashboard;
