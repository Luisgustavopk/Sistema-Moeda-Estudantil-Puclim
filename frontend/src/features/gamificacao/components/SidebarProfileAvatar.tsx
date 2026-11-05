import { useState } from 'react'
import { useProfileCustomization } from '../use-profile-customization'
import { ProfileFrame } from './ProfileDecorations'
import { ProfileIdentity } from './ProfileIdentity'

export function SidebarProfileAvatar({
  id,
  name,
}: {
  id: string
  name: string
}) {
  const [active, setActive] = useState(false)
  const { data: settings } = useProfileCustomization({ id, name })
  return (
    <span
      className="sidebar-avatar"
      aria-hidden="true"
      onPointerEnter={(event) => {
        if (
          event.pointerType === 'mouse' &&
          window.matchMedia(
            '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
          ).matches
        )
          setActive(true)
      }}
      onPointerLeave={() => setActive(false)}
    >
      <ProfileFrame
        className="sidebar-profile-avatar"
        frame={settings?.frame || 'classic'}
        visual={settings?.visuals?.frame}
        animate={active}
      >
        <ProfileIdentity
          name={settings?.displayName || name}
          avatar={settings?.avatar || 'portrait'}
          visual={settings?.visuals?.avatar}
          animate={active}
        />
      </ProfileFrame>
    </span>
  )
}
