import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus } from "lucide-react";
import { applicantAPI } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Loading } from "@/components/Loading";
// import { Badge } from "@/components/ui/badge"; // Need to create Badge if using it, skipping for now or just styled span

const ApplicantDashboard = () => {
  const [ips, setIps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  useEffect(() => {
    fetchIPs();
  }, []);

  const fetchIPs = async () => {
    try {
      // Replace with actual API call
      const response = await applicantAPI.getMyIPs();
      if (response.data.success) {
        setIps(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching IPs", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="Applicant Dashboard" role="Applicant" />
      <main className="container py-8 mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Patents</h1>
            <p className="text-muted-foreground">
              Manage and track your patent applications.
            </p>
            <Button onClick={() => navigate("/create-ip")}>
              <Plus className="w-4 h-4 mr-2" />
              New Application
            </Button>
          </div>
        </div>

        {isLoading ? (
          <Loading />
        ) : ips.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg min-h-[300px]">
            <p className="mb-4 text-muted-foreground">No applications found.</p>
            <Button variant="secondary">Create your first IP</Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ips.map((ip) => (
              <Card key={ip._id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl truncate">
                      {ip.title}
                    </CardTitle>
                    <span
                      className={`text-xs px-2 py-1 rounded-full border ${
                        ip.currentStatus === "submitted"
                          ? "bg-blue-100 text-blue-800"
                          : ip.currentStatus === "granted"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {ip.currentStatus}
                    </span>
                  </div>
                  <CardDescription>
                    Created: {new Date(ip.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm line-clamp-3 text-muted-foreground">
                    {ip.preambleToDescription}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => (window.location.href = `/ip/${ip._id}`)}
                  >
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ApplicantDashboard;
