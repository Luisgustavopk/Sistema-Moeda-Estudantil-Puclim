import { z } from 'zod'
import { DATA_MODE, http } from '@/shared/lib/http'
import type { ProfileVisuals } from './profile-rewards'
import { basicDemoRewards } from './profile-rewards'

export const customizationSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Use pelo menos 2 caracteres.')
    .max(40, 'Use até 40 caracteres.'),
  bio: z.string().trim().max(240, 'Use até 240 caracteres.'),
  showRealName: z.boolean(),
  avatar: z.string().max(3000000),
  frame: z.string().min(1).max(40),
  banner: z.string().min(1).max(40),
  featuredBadgeIds: z.array(z.string()).max(3),
  favoriteBadgeId: z.string().nullable(),
  visibility: z.enum(['all', 'institution', 'private']),
  showStats: z.boolean(),
  showActivity: z.boolean(),
})
export type ProfileCustomization = z.infer<typeof customizationSchema> & {
  visuals?: ProfileVisuals
}
export interface CustomizationAdapter {
  canPersist: boolean
  load: (id: string, name: string) => Promise<ProfileCustomization>
  save: (
    id: string,
    input: ProfileCustomization,
  ) => Promise<ProfileCustomization>
}
export function defaultCustomization(name: string): ProfileCustomization {
  return {
    displayName: name.slice(0, 40),
    bio: '',
    showRealName: false,
    avatar: 'portrait',
    frame: 'classic',
    banner: 'petroleum',
    featuredBadgeIds: [],
    favoriteBadgeId: null,
    visibility: 'all',
    showStats: true,
    showActivity: true,
  }
}
const key = (id: string) => `puclim.demo.profile.v1.${id}`
function withDemoVisuals(settings: ProfileCustomization): ProfileCustomization {
  const options = basicDemoRewards({ badges: [] })
  return {
    ...settings,
    visuals: {
      avatar:
        options.find((r) => r.kind === 'AVATAR' && r.id === settings.avatar)
          ?.visual || null,
      frame:
        options.find((r) => r.kind === 'FRAME' && r.id === settings.frame)
          ?.visual || null,
      banner:
        options.find((r) => r.kind === 'BANNER' && r.id === settings.banner)
          ?.visual || null,
    },
  }
}
export const customizationAdapter: CustomizationAdapter = {
  canPersist: true,
  load: async (id, name) => {
    if (DATA_MODE !== 'demo')
      return http<ProfileCustomization>('/gamificacao/perfil/personalizacao')
    const stored = localStorage.getItem(key(id))
    if (!stored) return withDemoVisuals(defaultCustomization(name))
    return withDemoVisuals(customizationSchema.parse(JSON.parse(stored)))
  },
  save: async (id, input) => {
    const valid = customizationSchema.parse(input)
    if (DATA_MODE !== 'demo') {
      let avatar = valid.avatar
      if (avatar.startsWith('data:image/')) {
        const image = await fetch(avatar).then((response) => response.blob())
        const body = new FormData()
        body.append('file', image, 'avatar.png')
        const uploaded = await http<{ url: string }>(
          '/gamificacao/perfil/avatar',
          { method: 'POST', body },
        )
        avatar = uploaded.url
      }
      return http<ProfileCustomization>('/gamificacao/perfil/personalizacao', {
        method: 'PUT',
        body: JSON.stringify({ ...valid, avatar }),
      })
    }
    try {
      localStorage.setItem(key(id), JSON.stringify(valid))
    } catch {
      throw new Error(
        'Não foi possível salvar neste navegador. Remova o avatar enviado ou libere espaço e tente novamente.',
      )
    }
    return withDemoVisuals(valid)
  },
}
