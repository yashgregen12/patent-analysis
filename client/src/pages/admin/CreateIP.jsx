import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { adminAPI } from "@/lib/api";

const AdminCreateIP = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    applicationNumber: "",
    title: "",
    preambleToDescription: "Provisional",
    inventors: [{ name: "", nationality: "", address: "" }],
  });
  const [files, setFiles] = useState({
    description: null,
    abstract: null,
    claims: null,
    diagrams: null,
  });

  const handleAddInventor = () => {
    setFormData({
      ...formData,
      inventors: [
        ...formData.inventors,
        { name: "", nationality: "", address: "" },
      ],
    });
  };

  const handleRemoveInventor = (index) => {
    const newInventors = formData.inventors.filter((_, i) => i !== index);
    setFormData({ ...formData, inventors: newInventors });
  };

  const handleInventorChange = (index, field, value) => {
    const newInventors = [...formData.inventors];
    newInventors[index][field] = value;
    setFormData({ ...formData, inventors: newInventors });
  };

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    setFiles({ ...files, [name]: selectedFiles[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = new FormData();
      data.append("email", formData.email);
      data.append("applicationNumber", formData.applicationNumber);
      data.append("title", formData.title);
      data.append("preambleToDescription", formData.preambleToDescription);
      data.append("inventors", JSON.stringify(formData.inventors));

      // Append files
      if (files.description) data.append("description", files.description);
      if (files.abstract) data.append("abstract", files.abstract);
      if (files.claims) data.append("claims", files.claims);
      if (files.diagrams) data.append("diagrams", files.diagrams);

      const response = await adminAPI.createIP(data);

      if (response.data.success) {
        alert("IP created successfully!");
        navigate("/admin/dashboard");
      }
    } catch (error) {
      console.error("Error creating IP:", error);
      alert(error.response?.data?.message || "Failed to create IP");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <h1 className="text-3xl font-bold mb-6">Create IP Application</h1>
      <main className="container mx-auto max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Create IP for Applicant</CardTitle>
            <CardDescription>
              Create an IP application on behalf of an applicant. The applicant
              must already exist in the system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Applicant Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Applicant Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="applicationNumber">
                      Application Number *
                    </Label>
                    <Input
                      id="applicationNumber"
                      value={formData.applicationNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          applicationNumber: e.target.value,
                        })
                      }
                      placeholder="APP-2026-..."
                      required
                    />
                  </div>
                </div>
              </div>

              {/* IP Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">IP Details</h3>
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preamble">Preamble Type *</Label>
                  <Select
                    value={formData.preambleToDescription}
                    onValueChange={(value) =>
                      setFormData({ ...formData, preambleToDescription: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Provisional">Provisional</SelectItem>
                      <SelectItem value="Complete">Complete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Inventors */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Inventors</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddInventor}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Inventor
                  </Button>
                </div>
                {formData.inventors.map((inventor, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Inventor {index + 1}</h4>
                        {formData.inventors.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveInventor(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            value={inventor.name}
                            onChange={(e) =>
                              handleInventorChange(
                                index,
                                "name",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Nationality</Label>
                          <Input
                            value={inventor.nationality}
                            onChange={(e) =>
                              handleInventorChange(
                                index,
                                "nationality",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Address</Label>
                          <Input
                            value={inventor.address}
                            onChange={(e) =>
                              handleInventorChange(
                                index,
                                "address",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Documents */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Documents</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (PDF)</Label>
                    <Input
                      id="description"
                      name="description"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="abstract">Abstract (PDF)</Label>
                    <Input
                      id="abstract"
                      name="abstract"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="claims">Claims (PDF)</Label>
                    <Input
                      id="claims"
                      name="claims"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="diagrams">Diagrams (PDF/Image)</Label>
                    <Input
                      id="diagrams"
                      name="diagrams"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create IP Application"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/admin/dashboard")}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminCreateIP;
