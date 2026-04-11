"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@portalpro/ui";
import { GeneralSettings } from "./GeneralSettings";
import { BrandingSettings } from "./BrandingSettings";
import { TeamSettings } from "./TeamSettings";

interface TenantData {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
  secondaryColor: string;
  customDomain: string | null;
  logo: string | null;
  plan: string;
}

interface MemberData {
  id: string;
  role: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  };
}

interface Props {
  tenant: TenantData;
  members: MemberData[];
  currentUserId: string;
  currentUserRole: string;
}

const VALID_TABS = ["general", "branding", "team"] as const;
type TabValue = (typeof VALID_TABS)[number];

/**
 * Three-tab settings panel: General, Branding, Team.
 * Active tab is driven by the ?tab= query param so sidebar links work directly.
 */
export function SettingsTabs({ tenant, members, currentUserId, currentUserRole }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab") as TabValue | null;
  const activeTab: TabValue = VALID_TABS.includes(tabParam as TabValue) ? (tabParam as TabValue) : "general";

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`/settings?${params.toString()}`, { scroll: false });
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList className="mb-6">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="branding">Branding</TabsTrigger>
        <TabsTrigger value="team">Team</TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        <GeneralSettings tenant={tenant} userRole={currentUserRole} />
      </TabsContent>

      <TabsContent value="branding">
        <BrandingSettings tenant={tenant} userRole={currentUserRole} />
      </TabsContent>

      <TabsContent value="team">
        <TeamSettings
          members={members}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
        />
      </TabsContent>
    </Tabs>
  );
}
