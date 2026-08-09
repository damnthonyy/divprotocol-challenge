import { motion, useReducedMotion } from 'motion/react'
import type { PropsWithChildren } from 'react'

export interface RevealProps extends PropsWithChildren {
  /** Decalage en secondes, pour echelonner les elements d'une liste. */
  delay?: number
}

/**
 * Reveal au scroll de la charte : opacity 0 -> 1, y 24 -> 0, 0.55s,
 * easing [0.22, 1, 0.36, 1]. Ces valeurs sont imposees, elles ne sont pas negociables.
 * L'animation est neutralisee si le systeme demande moins de mouvement.
 */
export function Reveal({ children, delay = 0 }: RevealProps) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) return <>{children}</>

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
