import { useNavigate } from "@tanstack/react-router"

import type { AdminControlsSearch } from "@/routes/_app/p/$slug/settings/admin-controls"
import { useCurrentUser } from "@/hooks/use-session"
import type { Page as PageEntity } from "@/lib/pages"
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
  const navigate = useNavigate()

  const isCurrentUserOwner = page.owner_user?.sub === me.sub
  const canManageAdmins = page.permissions.can_manage_admins

  // A page admin is the only role that gets both a row here and a Leave button;
  // the owner and site admins manage the table without belonging to it.
  // `ResourcePermissions` has no "I am an admin" flag, but the two fields
  // together are unambiguous: the owner and site admins both get
  // `can_manage_admins` and an ordinary member gets neither. Written with both
  // terms so it stays true if the route guard ever loosens.
  const pinnedSelf =
    page.permissions.can_edit && !page.permissions.can_manage_admins

  return (
    <>
      {page.permissions.can_view_admin_link ? (
        <SettingsSection
          title="Admin access link"
          description="Anyone signed in who opens this link becomes an admin. Do not share it publicly."
        >
          <AdminAccessLink slug={page.slug} />
        </SettingsSection>
      ) : null}

      <SettingsSection
        title="Admins"
        description="People who can edit this page, design it and manage its events."
      >
        <AdminsTable
          slug={page.slug}
          page={search.page}
          onPageChange={(page) =>
            onSearchChange((previous) => ({ ...previous, page }))
          }
          owner={{
            sub: page.owner_user?.sub ?? "",
            name: page.owner_user?.name ?? "",
            surname: page.owner_user?.surname ?? "",
            picture: page.owner_user?.picture ?? null,
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
            // holding settings on this page, so the route guard will redirect
            // them. Go there directly instead of bouncing.
            void navigate({ to: "/p/$slug", params: { slug: page.slug } })
          }}
        />
      </SettingsSection>
    </>
  )
}
