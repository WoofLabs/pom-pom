'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import AuthGate, { type AuthMode } from '@/components/AuthGate'
import OceanWaves from '@/components/OceanWaves'

export const dynamic = 'force-dynamic'

const EASE = [0.22, 1, 0.36, 1] as const
const HEADING_FADE = 0.18 // seconds: "Let's Focus together." fades out first
const TEXT_GONE_MS = 280  // by now the wordmark has faded too, so the box can move
const BOX_MOVE = 0.45     // seconds: box glides to the centre
const WORDMARK_GAP = 56   // px between the "Lockdin" wordmark and the heading

export default function Home() {
  const [loaded, setLoaded] = useState(false)
  // Step 1: texts fade out in place. Step 2 (engaged): texts leave the layout, box moves, waves rise.
  const [textHidden, setTextHidden] = useState(false)
  const [engaged, setEngaged] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('choose')
  const stepTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  function handleModeChange(mode: AuthMode) {
    clearTimeout(stepTimer.current)
    if (mode === 'choose') {
      // Back: box returns first (texts re-enter invisible), then they fade back in
      setAuthMode('choose')
      setEngaged(false)
      setTextHidden(false)
    } else if (engaged) {
      setAuthMode(mode) // switching between forms: stay centred
    } else {
      // Keep the button card in place while the texts fade, then swap in the form as the box moves
      setTextHidden(true)
      stepTimer.current = setTimeout(() => { setAuthMode(mode); setEngaged(true) }, TEXT_GONE_MS)
    }
  }
  useEffect(() => () => clearTimeout(stepTimer.current), [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        // If user chose not to be remembered, sign them out on fresh load
        if (sessionStorage.getItem('no_persist')) {
          await supabase.auth.signOut()
          setChecking(false)
          return
        }
        router.replace('/lobby'); return
      }
      setChecking(false)
    })
    const t = setTimeout(() => setLoaded(true), 600)
    return () => clearTimeout(t)
  }, [])

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <span className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--fg-2)', letterSpacing: '-0.03em' }}>lockdin</span>
    </div>
  )

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden" style={{ background: 'var(--bg)' }}>
      {/* Waves peek along the bottom on the home page, then rise to fill it once an option is picked */}
      <OceanWaves full={engaged} />

      {/* Big wordmark at the top, sized to the screen's width and height so it never overlaps the content below.
          It fades out in place (after the heading) before the box moves. */}
      {!engaged && (
        <motion.div
          aria-hidden
          className="pointer-events-none select-none flex justify-center pt-[2vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: textHidden ? 0 : 1 }}
          transition={textHidden
            ? { duration: HEADING_FADE, delay: 0.08, ease: 'easeOut' }
            : { duration: 0.3, delay: BOX_MOVE + 0.1, ease: 'easeOut' }}
        >
          <span
            className="wordmark relative inline-block font-bold whitespace-nowrap transition-opacity duration-1000"
            style={{ fontSize: 'min(26vw, 36vh)', lineHeight: 0.9, letterSpacing: '-0.045em', opacity: loaded ? 1 : 0 }}
          >
            <span className="wordmark-flow">Lockdin</span>
          </span>
        </motion.div>
      )}

      {/* Before an option is picked, the heading and box sit a fixed distance below the wordmark
          (WORDMARK_GAP) so the spacing is the same on short and tall screens. */}
      <main
        className={`relative flex-1 flex flex-col items-center gap-10 px-6 pb-12 ${engaged ? 'justify-center pt-8' : 'justify-start'}`}
        style={engaged ? undefined : { paddingTop: WORDMARK_GAP }}
      >
        {/* Heading fades out first, in place; fades back in after the box has returned */}
        {!engaged && (
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: textHidden ? 0 : 1 }}
            transition={textHidden
              ? { duration: HEADING_FADE, ease: 'easeOut' }
              : { duration: loaded ? 0.3 : 0.6, delay: loaded ? BOX_MOVE : 0.6, ease: 'easeOut' }}
          >
            <h1 className="text-[48px] font-semibold tracking-tight leading-tight mb-3"
              style={{ color: 'var(--fg)', letterSpacing: '-0.04em' }}>
              Let&apos;s Focus together.
            </h1>
          </motion.div>
        )}

        {/* The box moves up to the centre only once both texts have faded */}
        <motion.div
          layout="position"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7, ease: EASE, layout: { duration: BOX_MOVE, ease: EASE } }}
        >
          <AuthGate mode={authMode} onModeChange={handleModeChange} />
        </motion.div>
      </main>
    </div>
  )
}
