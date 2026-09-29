"use client";

/**
 * /portal/experts — Expert Credential Verification Desk (Phase 4).
 * Operations queue for vetting doctoral qualifications, diplomas, and sample research papers.
 */
import { useMemo, useState } from "react";
import {
  UserCheck,
  GraduationCap,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  ExternalLink,
  ShieldCheck,
  Download,
  Building2,
  Sparkles,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";

interface ExpertCandidate {
  id: string;
  name: string;
  email: string;
  institution: string;
  degree: string;
  graduationYear: number;
  disciplines: string[];
  gpaOrHonors: string;
  documents: { name: string; type: string; size: string }[];
  status: "pending" | "approved" | "action_required" | "rejected";
  appliedAt: string;
  bioSnippet: string;
}

const CANDIDATES_INITIAL: ExpertCandidate[] = [
  {
    id: "exp-app-01",
    name: "Dr. Alexander Wright",
    email: "a.wright@alumni.ox.ac.uk",
    institution: "University of Oxford",
    degree: "D.Phil. in Theoretical Physics",
    graduationYear: 2023,
    disciplines: ["Physics", "Applied Mathematics"],
    gpaOrHonors: "First Class Honours · Clarendon Scholar",
    documents: [
      { name: "Oxford_DPhil_Diploma_Certified.pdf", type: "Diploma", size: "2.4 MB" },
      { name: "Curriculum_Vitae_Wright.pdf", type: "CV", size: "480 KB" },
      { name: "NonPerturbative_Field_Theory_Thesis.pdf", type: "Sample Publication", size: "6.1 MB" },
    ],
    status: "pending",
    appliedAt: "2026-09-28T14:20:00Z",
    bioSnippet: "Theoretical physicist specializing in quantum field theory, non-perturbative conformal bootstrap, and differential geometry.",
  },
  {
    id: "exp-app-02",
    name: "Sophia Sterling, M.Sc.",
    email: "s.sterling@columbia.edu",
    institution: "Columbia University",
    degree: "M.S. in Quantitative Finance & Risk",
    graduationYear: 2024,
    disciplines: ["Economics & Econometrics", "Finance"],
    gpaOrHonors: "GPA 3.96 / 4.0 · Dean's List",
    documents: [
      { name: "Columbia_MS_Transcript.pdf", type: "Transcript", size: "1.8 MB" },
      { name: "Stata_Python_Empirical_Paper.pdf", type: "Sample Analysis", size: "3.2 MB" },
    ],
    status: "pending",
    appliedAt: "2026-09-28T19:45:00Z",
    bioSnippet: "Quantitative financial analyst with extensive modeling experience in high-frequency volatility models and options pricing.",
  },
  {
    id: "exp-app-03",
    name: "Dr. Elena Rostova",
    email: "elena.rostova@mit.edu",
    institution: "Massachusetts Institute of Technology",
    degree: "Ph.D. in Computer Science (Distributed Systems)",
    graduationYear: 2022,
    disciplines: ["Computer Science", "Software Engineering"],
    gpaOrHonors: "IEEE Best Paper Runner-up 2023",
    documents: [
      { name: "MIT_PhD_Diploma.pdf", type: "Diploma", size: "3.1 MB" },
      { name: "Consensus_Protocols_Dissertation.pdf", type: "Thesis", size: "8.4 MB" },
    ],
    status: "approved",
    appliedAt: "2026-09-25T11:10:00Z",
    bioSnippet: "Specialist in consensus protocols (Raft, Paxos), formal verification with TLA+, and high-throughput distributed databases.",
  },
];

export default function ExpertVerificationDeskPage() {
  const [candidates, setCandidates] = useState<ExpertCandidate[]>(CANDIDATES_INITIAL);
  const [selectedCandidate, setSelectedCandidate] = useState<ExpertCandidate | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "action_required">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const matchesFilter = filter === "all" ? true : c.status === filter;
      const matchesSearch =
        searchQuery === "" ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.institution.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.degree.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [candidates, filter, searchQuery]);

  function handleApprove(candidate: ExpertCandidate) {
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidate.id ? { ...c, status: "approved" } : c)),
    );
    setNotice(`${candidate.name} approved as Verified Specialist. Public profile activated.`);
    setSelectedCandidate(null);
    setTimeout(() => setNotice(null), 4000);
  }

  function handleRequestDocs(candidate: ExpertCandidate) {
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidate.id ? { ...c, status: "action_required" } : c)),
    );
    setNotice(`Documentation request sent to ${candidate.email}.`);
    setSelectedCandidate(null);
    setTimeout(() => setNotice(null), 4000);
  }

  function handleReject(candidate: ExpertCandidate) {
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidate.id ? { ...c, status: "rejected" } : c)),
    );
    setNotice(`Application for ${candidate.name} rejected.`);
    setSelectedCandidate(null);
    setTimeout(() => setNotice(null), 4000);
  }

  return (
    <div className="space-y-8">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Expert Credential Verification Desk
            </h1>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-3.5" /> Institutional Vetting
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            Rigorous quality gating. Verify diplomas, transcripts, and published research before granting bidding privileges.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/70 bg-surface-1 text-xs">
          <GraduationCap className="size-4 text-primary" />
          <span className="font-semibold text-foreground">Top 3% Acceptance Rate Enforced</span>
        </div>
      </div>

      {notice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-700 dark:text-emerald-300 text-sm font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* 2. Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-surface-1 border border-border/70 rounded-xl" role="tablist">
          {[
            { id: "all", label: "All Applicants" },
            { id: "pending", label: "Pending Review" },
            { id: "approved", label: "Approved" },
            { id: "action_required", label: "Docs Needed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as typeof filter)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filter === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted hover:text-foreground hover:bg-surface-2"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
          <Input
            placeholder="Search applicant or university..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs h-9 bg-surface-1"
          />
        </div>
      </div>

      {/* 3. Applicants Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCandidates.map((candidate) => (
          <Card
            key={candidate.id}
            className="p-5 border-border/80 hover:border-primary/40 transition-all flex flex-col justify-between space-y-4 shadow-sm"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-foreground">{candidate.name}</h3>
                  <p className="text-xs text-muted font-mono">{candidate.email}</p>
                </div>
                <Badge
                  tone={
                    candidate.status === "approved"
                      ? "success"
                      : candidate.status === "pending"
                        ? "warning"
                        : candidate.status === "action_required"
                          ? "info"
                          : "danger"
                  }
                  className="text-[10px] font-bold uppercase"
                >
                  {candidate.status.replace("_", " ")}
                </Badge>
              </div>

              <div className="rounded-xl border border-border/60 bg-surface-1 p-3 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Building2 className="size-3.5 text-primary" />
                  <span>{candidate.institution}</span>
                </div>
                <p className="text-muted text-[11px]">{candidate.degree} ({candidate.graduationYear})</p>
                <p className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px] pt-1">
                  {candidate.gpaOrHonors}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {candidate.disciplines.map((d) => (
                  <span key={d} className="rounded-md bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-foreground">
                    {d}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-border/60 flex items-center justify-between">
              <span className="text-[10px] text-muted">
                {candidate.documents.length} verified files attached
              </span>
              <Button
                size="sm"
                onClick={() => setSelectedCandidate(candidate)}
                className="text-xs font-semibold h-8 px-3"
              >
                Inspect Dossier
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* 4. Candidate Dossier Inspection Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-2xl rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold text-foreground">{selectedCandidate.name}</h2>
                  <Badge tone="info" className="text-xs">
                    {selectedCandidate.institution}
                  </Badge>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  Degree: <strong className="text-foreground">{selectedCandidate.degree}</strong> ({selectedCandidate.graduationYear}) · {selectedCandidate.gpaOrHonors}
                </p>
              </div>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="text-muted hover:text-foreground p-1"
                aria-label="Close dossier"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Academic Bio */}
            <div className="rounded-xl border border-border/70 bg-surface-1 p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                Applicant Academic Statement
              </span>
              <p className="text-xs text-foreground leading-relaxed">{selectedCandidate.bioSnippet}</p>
            </div>

            {/* Attached Verification Documents */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted block">
                Submitted Verification Artifacts ({selectedCandidate.documents.length})
              </span>
              <div className="space-y-2">
                {selectedCandidate.documents.map((doc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-surface-1 hover:border-primary/40 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="size-4 text-primary shrink-0" />
                      <div>
                        <p className="font-bold text-foreground">{doc.name}</p>
                        <p className="text-muted text-[11px]">{doc.type} · {doc.size}</p>
                      </div>
                    </div>
                    <Button variant="secondary" size="sm" className="h-7 text-xs px-2.5 gap-1">
                      <Download className="size-3" />
                      <span>Download</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div className="rounded-xl border border-border/80 bg-surface-1 p-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted block">
                Credential Verification Ruling
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleApprove(selectedCandidate)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4 gap-1.5"
                >
                  <CheckCircle2 className="size-3.5" />
                  Approve as Verified Specialist
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleRequestDocs(selectedCandidate)}
                  className="text-xs h-9 font-semibold"
                >
                  Request Further Documentation
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleReject(selectedCandidate)}
                  className="text-xs h-9 text-danger hover:bg-danger/10"
                >
                  Reject Application
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
