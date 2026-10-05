"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Star, BadgeCheck, ArrowRight, Sparkles, Filter } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const CATEGORIES = [
  { id: "all", label: "All Disciplines" },
  { id: "engineering", label: "Engineering & Systems" },
  { id: "ai", label: "AI & Data Science" },
  { id: "cloud", label: "Cloud & Distributed" },
  { id: "math", label: "Math & Quant" },
  { id: "product", label: "Product & Research" },
];

const DISCOVERY_EXPERTS = [
  {
    id: "jordan-hayes",
    name: "Dr. Jordan Hayes, Ph.D.",
    role: "Staff AI Research Scientist",
    company: "Ex-Google Brain · Stanford AI Lab",
    avatar: "JH",
    category: "ai",
    rating: 4.99,
    reviews: 420,
    hourly: "$45/brief",
    bio: "Pioneered distributed training frameworks for large-scale transformers. Coached 200+ engineers through complex GPU CUDA bottlenecks.",
    skills: ["Distributed Systems", "PyTorch", "CUDA", "LLM Inference"],
  },
  {
    id: "elena-rostova",
    name: "Dr. Elena Rostova, Ph.D.",
    role: "Doctoral Fellow & Quantitative Researcher",
    company: "Oxford University · ETH Zürich",
    avatar: "ER",
    category: "math",
    rating: 4.98,
    reviews: 312,
    hourly: "$50/brief",
    bio: "Doctoral thesis in Bayesian non-parametric time series. Proven advisor for econometric modeling, causal inference, and stochastic calculus.",
    skills: ["Causal Inference", "Time Series", "R / Stata", "Econometrics"],
  },
  {
    id: "david-chen",
    name: "Prof. David Chen, Sc.D.",
    role: "Principal Systems Architect",
    company: "MIT CSAIL · Autonomous Robotics",
    avatar: "DC",
    category: "engineering",
    rating: 5.0,
    reviews: 280,
    hourly: "$55/brief",
    bio: "Specializes in real-time embedded control, Kalman state estimation, and low-latency C++ flight software for aerospace robotics.",
    skills: ["ROS2", "C++", "Kalman Filters", "Embedded Systems"],
  },
  {
    id: "marcus-vance",
    name: "Marcus Vance",
    role: "Principal Cloud Architect",
    company: "Ex-AWS Solutions · Stripe Partner",
    avatar: "MV",
    category: "cloud",
    rating: 4.96,
    reviews: 185,
    hourly: "$42/brief",
    bio: "Designs multi-region resilient database clusters and zero-trust Kubernetes architectures handling tens of millions of daily API transactions.",
    skills: ["Kubernetes", "AWS Architecture", "PostgreSQL", "Terraform"],
  },
  {
    id: "sarah-jenkins",
    name: "Dr. Sarah Jenkins, Ph.D.",
    role: "Postdoctoral Research Fellow",
    company: "Cambridge University",
    avatar: "SJ",
    category: "math",
    rating: 4.97,
    reviews: 195,
    hourly: "$40/brief",
    bio: "Specialized in topological data analysis, differential forms, and manifold theory. Highly regarded for patient, rigorous proof walkthroughs.",
    skills: ["Topology", "Real Analysis", "Abstract Algebra", "LaTeX"],
  },
  {
    id: "alexa-morales",
    name: "Alexa Morales",
    role: "Head of Technical Product",
    company: "Y Combinator Alum · AI Platforms",
    avatar: "AM",
    category: "product",
    rating: 4.95,
    reviews: 160,
    hourly: "$48/brief",
    bio: "Mentors technical founders and researchers in converting complex deep-tech research papers into productionized B2B developer platforms.",
    skills: ["Product Strategy", "API Design", "Developer Tools", "AI Roadmaps"],
  },
];

export function ExpertDiscoveryGrid() {
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredExperts = useMemo(() => {
    if (activeCategory === "all") return DISCOVERY_EXPERTS;
    return DISCOVERY_EXPERTS.filter((exp) => exp.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className="space-y-8">
      {/* Category Pills Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeCategory === cat.id
                  ? "bg-primary text-white shadow-md shadow-primary/25"
                  : "border border-border/80 bg-surface-2/40 text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <Link
          href="/experts"
          className="text-xs font-semibold text-primary hover:text-primary-strong hover:underline inline-flex items-center gap-1"
        >
          <span>View All 1,420 Mentors</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {/* Grid of Expert Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredExperts.map((exp) => (
          <Card
            key={exp.id}
            variant="glass"
            hover
            className="group relative flex flex-col justify-between p-6 border-border/80 transition-all duration-300 hover:border-primary/40 hover:shadow-xl"
          >
            <div className="space-y-4">
              {/* Header: Avatar, Name, Verified Badge */}
              <div className="flex items-start gap-3.5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-indigo-600 to-indigo-800 font-bold text-white shadow-md text-sm ring-1 ring-white/20">
                  {exp.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                      {exp.name}
                    </h3>
                    <BadgeCheck className="size-4 shrink-0 text-primary" />
                  </div>
                  <p className="text-[11px] font-semibold text-primary truncate">{exp.role}</p>
                  <p className="text-[10px] text-muted truncate">{exp.company}</p>
                </div>
              </div>

              {/* Rating and Rate Strip */}
              <div className="flex items-center justify-between border-y border-border/60 py-2.5 text-xs">
                <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  <span>{exp.rating}</span>
                  <span className="text-[10px] font-normal text-muted">({exp.reviews} sessions)</span>
                </div>
                <div className="font-mono text-xs font-bold text-foreground">
                  {exp.hourly}
                </div>
              </div>

              {/* Bio */}
              <p className="text-xs text-muted leading-relaxed line-clamp-3">
                {exp.bio}
              </p>

              {/* Skills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {exp.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-lg border border-border/80 bg-surface-2/60 px-2 py-0.5 text-[10px] font-medium text-foreground"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Booking Button */}
            <div className="mt-5 pt-4 border-t border-border/60">
              <Button variant="secondary" className="w-full text-xs font-semibold h-9 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-colors" asChild>
                <Link href="/register">
                  Book 1:1 Consultation <ArrowRight className="size-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
