import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { applicantAPI } from "@/lib/api";

const CreateIP = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    preambleToDescription: "",
  });
  const [files, setFiles] = useState({
    description: null,
    abstract: null,
    claims: null,
    diagrams: null,
  });

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleFileChange = (e, field) => {
    if (e.target.files && e.target.files[0]) {
      setFiles((prev) => ({ ...prev, [field]: e.target.files[0] }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const data = new FormData();
    data.append("title", formData.title);
    data.append("preambleToDescription", formData.preambleToDescription);
    if (files.description) data.append("description", files.description);
    if (files.abstract) data.append("abstract", files.abstract);
    if (files.claims) data.append("claims", files.claims);
    if (files.diagrams) data.append("diagrams", files.diagrams);

    try {
      const response = await applicantAPI.createIP(data);

      if (response.data.success) {
        alert("Application Submitted Successfully!");
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error creating IP", error);
      alert("Failed to submit application. Ensure all files are attached.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="New Patent Application" role="Applicant" />
      <main className="container max-w-2xl py-8 mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Submit New Application</CardTitle>
            <CardDescription>
              Fill in the details and attach required documents.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Invention Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Solar Powered Water Heater"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preambleToDescription">
                  Preamble / Short Description
                </Label>
                <Textarea
                  id="preambleToDescription"
                  placeholder="Brief overview of the invention..."
                  value={formData.preambleToDescription}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Description Document (PDF)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      onChange={(e) => handleFileChange(e, "description")}
                      accept=".pdf"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Abstract Document (PDF)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      onChange={(e) => handleFileChange(e, "abstract")}
                      accept=".pdf"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Claims Document (PDF)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      onChange={(e) => handleFileChange(e, "claims")}
                      accept=".pdf"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Diagrams (Optional)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      onChange={(e) => handleFileChange(e, "diagrams")}
                      accept=".pdf,image/*"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="ghost"
                type="button"
                onClick={() => navigate("/dashboard")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Submitting..." : "Submit Application"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
};

export default CreateIP;
