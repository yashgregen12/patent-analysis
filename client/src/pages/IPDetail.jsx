import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, FileText } from "lucide-react";
import { useParams } from "react-router-dom";
import {
  adminAPI,
  attorneyAPI,
  publicAPI,
  applicantAPI,
  analysisAPI,
} from "@/lib/api";
import { Loading } from "@/components/Loading";
import { useAuth } from "@/context/AuthContext";

// Need ScrollArea component roughly or just div overflow
const IPDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [ip, setIp] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeDoc, setActiveDoc] = useState(null);
  const [activeTab, setActiveTab] = useState("docs"); // "docs" or "analysis"

  // Chat / Action State
  const [ferFile, setFerFile] = useState(null);
  const [replyFile, setReplyFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchIPDetails();
  }, []);

  const fetchIPDetails = async () => {
    try {
      let response;

      switch (user.role) {
        case "Applicant":
          response = await applicantAPI.getIPById(id);
          break;
        case "IPAttorney":
          response = await attorneyAPI.getIPById(id);
          break;
        case "Admin":
          response = await adminAPI.getIPById(id);
          break;
        default:
          response = await publicAPI.getApprovedIPById(id);
      }

      if (response.data.success) {
        setIp(response.data.data);

        fetchAnalysis();

        console.log("[DEBUG] IP : ", response.data.data);
        // Set first doc as active
        if (response.data.data.description?.secure_url) {
          setActiveDoc(response.data.data.description.secure_url);
        } else if (
          response.data.data.documents &&
          response.data.data.documents.length > 0
        ) {
          setActiveDoc(response.data.data.documents[0].secure_url);
        }
      }
    } catch (error) {
      console.error("Error fetching IP", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalysis = async () => {
    try {
      const res = await analysisAPI.getAnalysis(id);
      if (res.data.success) setAnalysis(res.data.data);
    } catch (err) {
      console.warn("No analysis.");
    }
  };

  const handleRunAnalysis = async () => {
    setIsSubmitting(true);
    try {
      const res = await attorneyAPI.runAnalysis(id);
      if (res.data.success) {
        alert("AI Analysis started. It will appear here shortly.");
        // Poll every 5s for 30s
        let count = 0;
        const interval = setInterval(async () => {
          await fetchAnalysis();
          count++;
          if (count > 6) clearInterval(interval);
        }, 5000);
      }
    } catch (error) {
      alert(error.response?.data?.message || "Trigger failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async (isFER = false) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();

      let response;
      if (isFER) {
        if (ferFile) formData.append("file", ferFile);
        response = await attorneyAPI.issueFER(id, formData);
      } else {
        if (replyFile) formData.append("file", replyFile);
        response = await applicantAPI.replyToFER(id, formData);
      }

      if (response.data.success) {
        setIp(response.data.data); // Update chat
        setFerFile(null);
        setReplyFile(null);
      }
    } catch (error) {
      console.error("Error sending message", error);
      alert(error.response.data.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <Loading />;
  if (!ip)
    return (
      <div className="p-8 text-center bg-background min-h-screen">
        IP Not Found
      </div>
    );

  const allDocuments = [
    ip.description ? { ...ip.description, name: "Description" } : null,
    ip.abstract ? { ...ip.abstract, name: "Abstract" } : null,
    ip.claims ? { ...ip.claims, name: "Claims" } : null,
    ip.diagrams ? { ...ip.diagrams, name: "Diagrams" } : null,
    ...(ip.documents || []),
  ].filter(Boolean);

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="border-b h-16 flex items-center px-6 justify-between bg-card">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold truncate max-w-xl">
            IP: {ip.title}
          </h2>
          <span className="text-xs px-2 py-1 bg-muted rounded-full uppercase">
            {ip.currentStatus}
          </span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Document Viewer or AI Analysis */}
        <div className="w-1/2 flex flex-col border-r bg-muted/10">
          <div className="h-12 border-b flex items-center px-4 gap-2 bg-card">
            <Button
              variant={activeTab === "docs" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("docs")}
            >
              Documents
            </Button>
            <Button
              variant={activeTab === "analysis" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("analysis")}
            >
              AI Analysis
            </Button>
          </div>

          {activeTab === "docs" ? (
            <>
              <div className="h-12 border-b flex items-center px-4 gap-2 overflow-x-auto">
                {allDocuments.map((doc, idx) => (
                  <Button
                    key={idx}
                    variant={
                      activeDoc === doc.secure_url ? "secondary" : "ghost"
                    }
                    size="sm"
                    onClick={() => setActiveDoc(doc.secure_url)}
                  >
                    <FileText className="w-3 h-3 mr-2" />
                    {doc.name || `Doc ${idx + 1}`}
                  </Button>
                ))}
              </div>
              <div className="flex-1 bg-gray-100 p-4">
                {activeDoc ? (
                  <iframe
                    src={activeDoc}
                    className="w-full h-full border rounded bg-white shadow"
                    title="Document Viewer"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Select a document to view
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 bg-background space-y-6">
              {!analysis ? (
                <div className="text-center p-12 space-y-4">
                  <div className="animate-pulse text-muted-foreground italic">
                    AI analysis is not available or hasn't been triggered.
                  </div>
                  {user?.role === "IPAttorney" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRunAnalysis}
                    >
                      Trigger Initial Analysis
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {["QUEUED", "INGESTING", "ANALYZING"].includes(
                    analysis.status
                  ) && (
                    <div className="p-4 rounded border bg-yellow-50 border-yellow-100 flex items-center justify-between">
                      <span className="text-sm font-medium text-yellow-800 flex items-center">
                        <span className="animate-spin h-3 w-3 mr-2 border-2 border-yellow-800 border-t-transparent rounded-full" />
                        AI Pipeline in Progress: {analysis.status}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <div>
                      <h3 className="font-bold text-lg">
                        AI Examination Verdict
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {analysis.analysis?.finalVerdict?.summary}
                      </p>
                    </div>
                    <div
                      className={`px-4 py-2 rounded-full font-bold text-sm ${
                        analysis.analysis?.finalVerdict?.status === "CONFLICT"
                          ? "bg-destructive text-white"
                          : analysis.analysis?.finalVerdict?.status ===
                            "POTENTIAL_INFRINGE"
                          ? "bg-orange-500 text-white"
                          : "bg-green-600 text-white"
                      }`}
                    >
                      {analysis.analysis?.finalVerdict?.status}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      Examiner Report Draft (FER)
                    </h4>
                    <div className="p-4 rounded border bg-card text-sm leading-relaxed whitespace-pre-wrap">
                      {analysis.analysis?.analysisReport?.content}
                    </div>
                  </div>

                  {analysis.analysis?.similarPatents?.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-bold">Prior Art Candidates</h4>
                      {analysis.analysis.similarPatents.map((p, pIdx) => (
                        <div
                          key={pIdx}
                          className="p-4 rounded border space-y-3"
                        >
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-bold font-mono">
                              ID: {p.patentId}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-muted text-xs">
                              Score: {(p.score * 10).toFixed(2)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground italic">
                            {p.agentReasoning}
                          </p>
                          {p.matches?.some((m) => m.rationale) && (
                            <div className="space-y-2 mt-2 pt-2 border-t">
                              <p className="text-xs font-bold uppercase text-muted-foreground">
                                Point-by-Point Rationales
                              </p>
                              {p.matches
                                .filter((m) => m.rationale)
                                .map((m, mIdx) => (
                                  <div
                                    key={mIdx}
                                    className="p-2 rounded bg-muted/50 text-[11px] border"
                                  >
                                    <span className="font-bold">
                                      Target {m.sourceSection} ↔ Candidate{" "}
                                      {m.matchSection}:
                                    </span>
                                    <p className="mt-1">{m.rationale}</p>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Right Panel: Chat & Actions */}
        <div className="w-1/2 flex flex-col bg-background">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Initial Submission Info */}
            <div className="flex justify-center">
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                Application Submitted on{" "}
                {new Date(ip.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* Chats */}
            {ip.chats?.map((chat, idx) => (
              <div
                key={idx}
                className={`flex ${
                  chat.type === "FER" ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    chat.type === "FER"
                      ? "bg-destructive/10 border-destructive/20 border"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase">
                      {chat.type}
                    </span>
                    <span className="text-[10px] opacity-70">
                      {new Date(chat.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {chat.documents?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {chat.documents.map((doc, dIdx) => (
                        <a
                          key={dIdx}
                          href={doc.secure_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center text-xs underline opacity-90 hover:opacity-100"
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          {doc.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Action Area */}
          <div className="border-t p-4 bg-muted/5">
            {/* Applicant Actions */}
            {user?.role === "Applicant" && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm mb-2">Submit a Reply</h3>
                <div className="flex gap-4">
                  <Label className="mb-2 block">Attachment</Label>
                  <Input
                    type="file"
                    onChange={(e) => setReplyFile(e.target.files?.[0])}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => handleSendMessage(false)}
                  disabled={isSubmitting}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Response
                </Button>
              </div>
            )}

            {/* IP Attorney Actions */}
            {user?.role === "IPAttorney" && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm mb-2">
                  Issue Examination Report (FER)
                </h3>
                <div>
                  <Label className="mb-2 block">
                    Attachment (FER Document)
                  </Label>
                  <Input
                    type="file"
                    onChange={(e) => setFerFile(e.target.files?.[0])}
                  />
                </div>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => handleSendMessage(true)}
                  disabled={isSubmitting}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Issue FER
                </Button>

                <div className="pt-4 border-t mt-4">
                  <h3 className="font-semibold text-sm mb-2 text-primary">
                    AI Reasoning Engine
                  </h3>
                  <Button
                    variant="outline"
                    className="w-full border-primary text-primary hover:bg-primary/5"
                    onClick={handleRunAnalysis}
                    disabled={isSubmitting}
                  >
                    🚀 Run AI Similarity Analysis
                  </Button>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    This will trigger the multi-stage RAG agent to scan for
                    prior art and generate a draft report.
                  </p>
                </div>
              </div>
            )}

            {/* Admin or Other Actions (Read Only) */}
            {["Admin", "Guest"].includes(user?.role) && (
              <div className="text-center text-muted-foreground text-sm p-4">
                View-only mode for {user?.role || "Visitor"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IPDetail;
