import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Calendar, User, MapPin } from "lucide-react";
import { publicAPI } from "@/lib/api";
import { Loading } from "@/components/Loading";

const IPDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ip, setIp] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchIPDetails();
    } else {
      fetchAllIPs();
    }
  }, [id]);

  const fetchIPDetails = async () => {
    try {
      const response = await publicAPI.getApprovedIPById(id);
      if (response.data.success) {
        setIp(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching IP details", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllIPs = async () => {
    try {
      const response = await publicAPI.getApprovedIPs();
      if (response.data.success) {
        setIp({ list: response.data.data });
      }
    } catch (error) {
      console.error("Error fetching IPs", error);
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

  if (isLoading) {
    return <Loading />;
  }

  // List view (no ID provided)
  if (!id && ip?.list) {
    return (
      <div className="min-h-screen bg-background">
        <h1 className="text-3xl font-bold mb-6">Approved Patents</h1>
        <main className="container mx-auto space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ip.list.map((patent) => (
              <Card
                key={patent._id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/ips/${patent._id}`)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{patent.title}</CardTitle>
                  <Badge className={getStatusColor(patent.currentStatus)}>
                    {patent.currentStatus}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {patent.preambleToDescription}
                  </p>
                  <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {new Date(patent.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Detail view
  if (!ip) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8 mx-auto text-center">
          <p>IP not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <h1 className="text-3xl font-bold mb-6">IP Details</h1>
      <main className="container mx-auto space-y-6">
        {/* Header Section */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="text-2xl">{ip.title}</CardTitle>
                <Badge className={getStatusColor(ip.currentStatus)}>
                  {ip.currentStatus}
                </Badge>
              </div>
              <Button variant="outline" onClick={() => navigate("/ips")}>
                Back to List
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Preamble</h3>
              <p className="text-muted-foreground">
                {ip.preambleToDescription}
              </p>
            </div>

            {ip.inventors && ip.inventors.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Inventors</h3>
                <div className="space-y-2">
                  {ip.inventors.map((inventor, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <User className="w-4 h-4 mt-0.5" />
                      <div>
                        <p className="font-medium">{inventor.name}</p>
                        <p className="text-muted-foreground">
                          {inventor.nationality}
                        </p>
                        {inventor.address && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {inventor.address}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              Filed: {new Date(ip.createdAt).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>

        {/* Documents Section */}
        <Tabs defaultValue="description" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="abstract">Abstract</TabsTrigger>
            <TabsTrigger value="claims">Claims</TabsTrigger>
            <TabsTrigger value="diagrams">Diagrams</TabsTrigger>
          </TabsList>

          <TabsContent value="description">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Description</span>
                  {ip.description?.secure_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={ip.description.secure_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ip.description?.secure_url ? (
                  <iframe
                    src={ip.description.secure_url}
                    className="w-full h-[600px] border rounded"
                    title="Description"
                  />
                ) : (
                  <p className="text-muted-foreground">
                    No description available
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="abstract">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Abstract</span>
                  {ip.abstract?.secure_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={ip.abstract.secure_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ip.abstract?.secure_url ? (
                  <iframe
                    src={ip.abstract.secure_url}
                    className="w-full h-[600px] border rounded"
                    title="Abstract"
                  />
                ) : (
                  <p className="text-muted-foreground">No abstract available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="claims">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Claims</span>
                  {ip.claims?.secure_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={ip.claims.secure_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ip.claims?.secure_url ? (
                  <iframe
                    src={ip.claims.secure_url}
                    className="w-full h-[600px] border rounded"
                    title="Claims"
                  />
                ) : (
                  <p className="text-muted-foreground">No claims available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diagrams">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Diagrams</span>
                  {ip.diagrams?.secure_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={ip.diagrams.secure_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ip.diagrams?.secure_url ? (
                  ip.diagrams.secure_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                    <img
                      src={ip.diagrams.secure_url}
                      alt="Diagrams"
                      className="w-full rounded border"
                    />
                  ) : (
                    <iframe
                      src={ip.diagrams.secure_url}
                      className="w-full h-[600px] border rounded"
                      title="Diagrams"
                    />
                  )
                ) : (
                  <p className="text-muted-foreground">No diagrams available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default IPDetails;
