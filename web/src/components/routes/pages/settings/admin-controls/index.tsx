import { useNavigate } from "@tanstack/react-router"

import type { AdminControlsSearch } from "@/routes/_app/p/$slug/settings/admin-controls"
import { useCurrentUser, usePermissions } from "@/hooks/use-session"
import { pageOwnership, type Page as PageEntity } from "@/lib/pages"
import { SettingsSection } from "@/components/shared/settings/settings-section"
import { AdminAccessLink } from "@/components/routes/pages/settings/components/admin-access-link"
import { AdminsTable } from "@/components/routes/pages/settings/components/admins-table"

export function Page({
  page,
  search,
  onSearchChange,
}: {
  page: PageEntity
  search: AdminControlsSearch
  onSearchChange: (
    updater: (previous: AdminControlsSearch) => AdminControlsSearch
  ) => void
}) {
  const me = useCurrentUser()
  // A site admin manages this table without being one of its admins, so the
  // "You" row and its Leave button have to be suppressed for them. Read from
  // the session's own role rather than inferred from the page's permissions —
  // `usePermissions` already derives it, and the inference it replaces could
  // not tell a site admin from a page admin.
  const { isAdmin } = usePermissions()
  const navigate = useNavigate()

  // The FK on the page, not the embedded `owner_user`: the latter is a profile
  // summary that can be absent, and comparing two optional strings answers
  // "yes" when both are missing. See `pageOwnership`.
  const isCurrentUserOwner = pageOwnership(page, me.sub) === "owner"
  const canManageAdmins = page.permissions.can_manage_admins

  return (
    <>
      {page.permissions.can_view_admin_link ? (
        <SettingsSection title="Admin access link">
          <AdminAccessLink slug={page.slug} />
        </SettingsSection>
      ) : null}

      <SettingsSection
        title="Admins"
        description="People who can edit this page, design it and manage its events."
      >
        <AdminsTable
          slug={page.slug}
          search={search}
          onSearchChange={onSearchChange}
          owner={{
            sub: page.owner_user?.sub ?? "",
            name: page.owner_user?.name ?? "",
            surname: page.owner_user?.surname ?? "",
            picture: page.owner_user?.picture ?? null,
          }}
          me={{
            sub: me.sub,
            name: me.name,
            surname: me.family_name,
            picture: me.picture ?? null,
          }}
          isSiteAdmin={isAdmin}
          canManageAdmins={canManageAdmins}
          isCurrentUserOwner={isCurrentUserOwner}
          onOwnershipTransferredAway={() => {
            // Leave and transfer both end with the current user no longer
            // holding settings on this page, so the route guard will redirect
            // them. Go there directly instead of bouncing.
            void navigate({ to: "/p/$slug", params: { slug: page.slug } })
          }}
        />
      </SettingsSection>
    </>
  )
}
