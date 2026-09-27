import { useNavigate } from "@tanstack/react-router"

import type { AdminControlsSearch } from "@/routes/_app/communities/$slug/settings/admin-controls"
import { useCurrentUser } from "@/hooks/use-session"
import { isCommunityAdmin } from "@/lib/communities"
import type { Community } from "@/lib/communities"
import { SettingsSection } from "@/components/shared/settings/settings-section"
import { AdminAccessLink } from "@/components/routes/communities/settings/components/admin-access-link"
import { AdminsTable } from "@/components/routes/communities/settings/components/admins-table"

export function Page({
  community,
  search,
  onSearchChange,
}: {
  community: Community
  search: AdminControlsSearch
  onSearchChange: (
    updater: (previous: AdminControlsSearch) => AdminControlsSearch
  ) => void
}) {
  const me = useCurrentUser()
  const navigate = useNavigate()

  const isCurrentUserOwner = community.owner_user.sub === me.sub
  const canManageAdmins = community.permissions.can_manage_admins

  // A community admin is the only role that gets both a row here and a Leave
  // button; the owner and site admins manage the table without belonging to it.
  const pinnedSelf = isCommunityAdmin(community)

  return (
    <div className="space-y-10">
      {community.permissions.can_view_admin_link ? (
        <SettingsSection
          title="Admin access link"
          description="Anyone signed in who opens this link becomes an admin. Do not share it publicly."
        >
          <AdminAccessLink slug={community.slug} />
        </SettingsSection>
      ) : null}

      <SettingsSection
        title="Admins"
        description="People who can edit this community, design its page and manage its events."
        width="full"
      >
        <AdminsTable
          slug={community.slug}
          page={search.page}
          onPageChange={(page) =>
            onSearchChange((previous) => ({ ...previous, page }))
          }
          owner={{
            sub: community.owner_user.sub,
            name: community.owner_user.name,
            surname: community.owner_user.surname,
            picture: community.owner_user.picture ?? null,
          }}
          me={
            pinnedSelf
              ? {
                  sub: me.sub,
                  name: me.name,
                  surname: me.family_name,
                  picture: me.picture ?? null,
                }
              : null
          }
          canManageAdmins={canManageAdmins}
          isCurrentUserOwner={isCurrentUserOwner}
          onOwnershipTransferredAway={() => {
            // Leave and transfer both end with the current user no longer
            // holding settings on this community, so the route guard will
            // redirect them. Go there directly instead of bouncing.
            void navigate({
              to: "/communities/$slug",
              params: { slug: community.slug },
            })
          }}
        />
      </SettingsSection>
    </div>
  )
}
