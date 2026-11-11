import React from "react";
import {
  getAccessibleIssuersForUser,
  getStampsForApprovedIssuers,
} from "@/lib/issuers";
import { getAuthenticatedContext } from "@/lib/supabase/server";
import { StampStudioPageClient } from "@/components/certificate/StampStudioPageClient";

export const dynamic = "force-dynamic";

export default async function OrganizationStampsPage() {
  const { user } = await getAuthenticatedContext();

  if (!user) {
    return (
      <StampStudioPageClient
        isAuthenticated={false}
        applications={[]}
        approvedIssuers={[]}
        initialStamps={[]}
      />
    );
  }

  const { applications, approvedIssuers } = await getAccessibleIssuersForUser(user);
  const simpleApproved = approvedIssuers.map((i) => ({
    id: i.id,
    organization_name: i.organization_name,
  }));
  const initialStamps = await getStampsForApprovedIssuers(simpleApproved);

  return (
    <StampStudioPageClient
      isAuthenticated={true}
      applications={applications.map((a) => ({
        id: a.id,
        organization_name: a.organization_name,
        contact_email: a.contact_email,
        verification_status: a.verification_status,
        notes: a.notes,
      }))}
      approvedIssuers={simpleApproved}
      initialStamps={initialStamps}
    />
  );
}
