import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminAPI } from "@/lib/api";
import { UserPlus, Mail, CheckCircle } from "lucide-react";

const AdminAuthorizeAttorney = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleAuthorize = async (e) => {
    e.preventDefault();
    if (!email) {
      alert("Email is required");
      return;
    }

    setIsLoading(true);
    setSuccess(false);

    try {
      const response = await adminAPI.authorizeAttorney({ email });
      if (response.data.success) {
        setSuccess(true);
        setEmail("");
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Error authorizing attorney:", error);
      alert(error.response?.data?.message || "Failed to authorize attorney");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8 mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Authorize IP Attorney</h1>
          <p className="text-muted-foreground">
            Grant IP Attorney privileges to a user
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Authorize New Attorney
            </CardTitle>
            <CardDescription>
              Enter the email address of the user you want to authorize as an IP
              Attorney. The user must have signed in with Google at least once.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuthorize} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="attorney@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  The user will be granted IP Attorney role and authorization
                  status.
                </p>
              </div>

              {success && (
                <div className="flex items-center gap-2 p-4 bg-green-50 text-green-800 rounded-md">
                  <CheckCircle className="h-5 w-5" />
                  <p className="font-medium">
                    Attorney authorized successfully!
                  </p>
                </div>
              )}

              <div className="flex gap-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Authorizing..." : "Authorize Attorney"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>What happens when you authorize?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Role Assignment</p>
                <p className="text-sm text-muted-foreground">
                  User's role will be set to "IPAttorney"
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Authorization Status</p>
                <p className="text-sm text-muted-foreground">
                  isAuthorizedAttorney flag will be set to true
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Access Granted</p>
                <p className="text-sm text-muted-foreground">
                  User can access IP Attorney dashboard and features
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminAuthorizeAttorney;
