"use client";

import { RequestForm } from "@/features/requests/RequestForm";

export default function NewRequestPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">New request</h1>
      <RequestForm />
    </div>
  );
}
