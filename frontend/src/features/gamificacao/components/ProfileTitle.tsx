import { useProfileCustomization } from '../use-profile-customization'

/** Only the catalog's resolved name is displayed; an unequipped title has no row. */
export function ProfileTitle({
  name,
  className = '',
}: {
  name?: string | null
  className?: string
}) {
  if (!name) return null
  return (
    <span className={`profile-title ${className}`}>
      <span className="sr-only">Título: </span>
      {name}
    </span>
  )
}

export function SidebarProfileTitle({
  user,
}: {
  user: { id: string; name: string }
}) {
  const { data } = useProfileCustomization(user)
  return (
    <ProfileTitle name={data?.titleName} className="sidebar-profile-title" />
  )
}
