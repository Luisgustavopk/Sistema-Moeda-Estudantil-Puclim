import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'react-router'
import { Award, Check, Pause, Play, Sparkles } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { ErrorNotice } from '@/shared/components/ui/Feedback'
import { Modal } from '@/shared/components/ui/Modal'
import {
  playUnlockSound,
  primeUnlockSound,
} from '@/shared/lib/confirmation-sound'
import { gameApi } from '../api'
import type { ProfileCustomization } from '../profile-customization'
import type { ProfileReward } from '../profile-rewards'
import { useProfileCustomization } from '../use-profile-customization'
import { ProfileCover, ProfileFrame } from './ProfileDecorations'
import { ProfileIdentity } from './ProfileIdentity'
import { ProfileTitle } from './ProfileTitle'
import { isAnimatedAvatar } from '../avatar-media'

const kinds: Record<ProfileReward['kind'], string> = {
  AVATAR: 'Avatar',
  FRAME: 'Moldura',
  BANNER: 'Fundo',
  TITLE: 'Título',
}
const rewardKey = (reward: ProfileReward) => `${reward.kind}:${reward.id}`

function previewSettings(
  settings: ProfileCustomization,
  reward: ProfileReward,
): ProfileCustomization {
  if (reward.kind === 'TITLE')
    return { ...settings, title: reward.id, titleName: reward.name }
  const field = { AVATAR: 'avatar', FRAME: 'frame', BANNER: 'banner' }[
    reward.kind
  ] as 'avatar' | 'frame' | 'banner'
  return {
    ...settings,
    [field]: reward.id,
    visuals: {
      avatar: settings.visuals?.avatar || null,
      frame: settings.visuals?.frame || null,
      banner: settings.visuals?.banner || null,
      [field]: reward.visual,
    },
  }
}

/** Compose the actual identity with shared renderers, without altering saved data. */
function RewardPreview({
  settings,
  animate = false,
}: {
  settings: ProfileCustomization
  animate?: boolean
}) {
  return (
    <div className="reward-preview-profile">
      <ProfileCover
        banner={settings.banner}
        visual={settings.visuals?.banner}
        animate={animate}
      />
      <div className="reward-preview-identity">
        <ProfileFrame
          frame={settings.frame}
          visual={settings.visuals?.frame}
          animate={animate}
        >
          <ProfileIdentity
            name={settings.displayName}
            avatar={settings.avatar}
            visual={settings.visuals?.avatar}
            animate={animate}
          />
        </ProfileFrame>
        <div>
          <strong>{settings.displayName}</strong>
          <ProfileTitle name={settings.titleName} />
        </div>
      </div>
    </div>
  )
}

export function RewardUnlocks({
  user,
}: {
  user: { id: string; name: string }
}) {
  const location = useLocation()
  const settings = useProfileCustomization(user)
  const cosmetics = useQuery({
    queryKey: ['game', 'cosmetics', user.id],
    queryFn: gameApi.cosmetics,
    refetchInterval: 30000,
  })
  const [blocked, setBlocked] = useState(false)
  const [tabVisible, setTabVisible] = useState(!document.hidden)
  const [reducedMotion, setReducedMotion] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = () => setReducedMotion(motion.matches)
    const update = () => {
      setBlocked(
        [...document.querySelectorAll('dialog[open]')].some(
          (dialog) => !dialog.querySelector('.reward-unlock-preview'),
        ),
      )
      setTabVisible(!document.hidden)
    }
    const observer = new MutationObserver(update)
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['open'],
    })
    document.addEventListener('visibilitychange', update)
    motion.addEventListener('change', updateMotion)
    window.addEventListener('pointerdown', primeUnlockSound, { passive: true })
    window.addEventListener('keydown', primeUnlockSound)
    if (navigator.userActivation?.hasBeenActive) primeUnlockSound()
    update()
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', update)
      motion.removeEventListener('change', updateMotion)
      window.removeEventListener('pointerdown', primeUnlockSound)
      window.removeEventListener('keydown', primeUnlockSound)
    }
  }, [])
  const pending =
    cosmetics.data?.filter(
      (reward) => reward.unlocked && reward.newlyUnlocked,
    ) || []
  const reward = pending[0]
  if (!reward || !settings.data) return null
  return (
    <RewardUnlockCard
      key={rewardKey(reward)}
      userId={user.id}
      reward={reward}
      settings={settings.data}
      remaining={pending.length}
      tabVisible={tabVisible}
      reducedMotion={reducedMotion}
      available={!blocked && location.pathname !== '/perfil/editar'}
    />
  )
}

function RewardUnlockCard({
  userId,
  reward,
  settings,
  remaining,
  available,
  tabVisible,
  reducedMotion,
}: {
  userId: string
  reward: ProfileReward
  settings: ProfileCustomization
  remaining: number
  available: boolean
  tabVisible: boolean
  reducedMotion: boolean
}) {
  const client = useQueryClient()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewPaused, setPreviewPaused] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const presented = useRef(false)
  const panel = useRef<HTMLElement>(null)
  const candidate = previewSettings(settings, reward)
  const selected =
    reward.kind === 'TITLE'
      ? settings.title
      : settings[
          ({ AVATAR: 'avatar', FRAME: 'frame', BANNER: 'banner' } as const)[
            reward.kind
          ]
        ]
  const equipped = selected === reward.id
  const moving =
    isAnimatedAvatar(candidate.avatar) ||
    (candidate.visuals?.frame?.motion &&
      candidate.visuals.frame.motion !== 'NONE') ||
    (candidate.visuals?.banner?.bannerMotion &&
      candidate.visuals.banner.bannerMotion !== 'NONE')
  const acknowledge = useMutation({
    mutationFn: () => gameApi.acknowledgeReward(reward),
    onSuccess: async () => {
      const restoreFocus =
        previewOpen || !!panel.current?.contains(document.activeElement)
      await client.cancelQueries({ queryKey: ['game', 'cosmetics', userId] })
      client.setQueryData<ProfileReward[]>(
        ['game', 'cosmetics', userId],
        (items) =>
          items?.map((item) =>
            rewardKey(item) === rewardKey(reward)
              ? { ...item, newlyUnlocked: false }
              : item,
          ),
      )
      if (restoreFocus)
        requestAnimationFrame(() => {
          const destination =
            document.querySelector<HTMLElement>(
              '.reward-unlock-panel button',
            ) || document.querySelector<HTMLElement>('#conteudo')
          destination?.focus({ preventScroll: true })
        })
    },
  })
  const equip = useMutation({
    mutationFn: () => gameApi.equipReward({ kind: reward.kind, id: reward.id }),
    onSuccess: async (data) => {
      await client.cancelQueries({
        queryKey: ['profile-customization', userId],
      })
      client.setQueryData(['profile-customization', userId], data)
      void client.invalidateQueries({ queryKey: ['game', 'public-profile'] })
      void client.invalidateQueries({ queryKey: ['game', 'ranking'] })
      acknowledge.mutate()
    },
  })
  useEffect(() => {
    if (!available || !tabVisible || presented.current) return
    const frame = requestAnimationFrame(() => {
      presented.current = true
      const key = `puclim.reward-presented.${userId}.${rewardKey(reward)}`
      try {
        if (sessionStorage.getItem(key)) return
        sessionStorage.setItem(key, 'true')
      } catch {
        /* The server still persists acknowledgments if storage is unavailable. */
      }
      setCelebrating(true)
      playUnlockSound()
    })
    return () => cancelAnimationFrame(frame)
  }, [available, tabVisible, reward, userId])
  useEffect(() => {
    if (!celebrating) return
    const timer = setTimeout(() => setCelebrating(false), 700)
    return () => clearTimeout(timer)
  }, [celebrating])
  const busy = equip.isPending || acknowledge.isPending
  const actions = (
    <div className="reward-unlock-actions">
      <Button
        loading={equip.isPending}
        disabled={busy || equipped}
        onClick={() => equip.mutate()}
      >
        {equipped ? (
          <>
            <Check size={16} aria-hidden="true" /> Já equipada
          </>
        ) : (
          'Equipar agora'
        )}
      </Button>
      <Button
        variant="ghost"
        loading={acknowledge.isPending}
        disabled={busy}
        onClick={() => acknowledge.mutate()}
      >
        Depois
      </Button>
    </div>
  )
  const feedback = (
    <>
      {equipped && (
        <p className="small muted" role="status">
          Personalização equipada.
        </p>
      )}
      <ErrorNotice error={equip.error || acknowledge.error} />
      {acknowledge.isError && (
        <p className="small muted">
          Clique em Depois para confirmar este aviso. Sua escolha continua
          salva.
        </p>
      )}
    </>
  )
  if (!available) return null
  return (
    <>
      {!previewOpen && (
        <section
          ref={panel}
          className="reward-unlock-panel"
          aria-label="Nova personalização"
          data-celebrating={celebrating}
        >
          <div className="reward-unlock-heading">
            <span className="reward-unlock-celebration" aria-hidden="true">
              <Award size={28} />
              <Sparkles size={16} />
            </span>
            <div>
              <h2>Personalização desbloqueada</h2>
              <p className="small muted">
                {kinds[reward.kind]}
                {remaining > 1 ? ` · ${remaining} novidades` : ''}
              </p>
            </div>
          </div>
          <p className="sr-only" role="status">
            Você desbloqueou {reward.name}.
          </p>
          <h3>{reward.name}</h3>
          <div className="reward-unlock-thumbnail" aria-hidden="true">
            <RewardPreview settings={candidate} />
          </div>
          <Button
            className="reward-preview-trigger"
            variant="secondary"
            onClick={() => setPreviewOpen(true)}
          >
            Ver prévia
          </Button>
          {feedback}
          {actions}
        </section>
      )}
      {previewOpen && (
        <Modal
          title="Prévia da recompensa"
          size="wide"
          busy={busy}
          onClose={() => setPreviewOpen(false)}
        >
          <div className="reward-unlock-preview">
            <h3>{reward.name}</h3>
            <p className="muted">
              Veja como fica no seu perfil. As outras personalizações continuam
              como você escolheu.
            </p>
            <RewardPreview settings={candidate} animate={!previewPaused} />
            {moving && reducedMotion && (
              <p className="small muted">
                Prévia estática: movimento reduzido ativado.
              </p>
            )}
            {moving && !reducedMotion && (
              <Button
                variant="ghost"
                aria-pressed={previewPaused}
                onClick={() => setPreviewPaused((paused) => !paused)}
              >
                {previewPaused ? (
                  <Play size={16} aria-hidden="true" />
                ) : (
                  <Pause size={16} aria-hidden="true" />
                )}
                {previewPaused
                  ? 'Ativar animação da prévia'
                  : 'Pausar animação da prévia'}
              </Button>
            )}
            {feedback}
            {actions}
          </div>
        </Modal>
      )}
    </>
  )
}
