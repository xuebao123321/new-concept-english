import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiProps {
  active: boolean;
  duration?: number;
}

const COLORS = ['#5B9A5A', '#FF8C42', '#5B9ED4', '#FBBF24', '#8BC48A', '#7E57C2', '#FFB380', '#E57373'];
const PIECES = 50;

interface Particle {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  rotation: number;
  size: number;
}

export default function Confetti({ active, duration = 3000 }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (active) {
      const newParticles: Particle[] = Array.from({ length: PIECES }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.5,
        duration: 1.5 + Math.random() * 2,
        rotation: Math.random() * 720 - 360,
        size: 6 + Math.random() * 8,
      }));
      setParticles(newParticles);

      const timer = setTimeout(() => setParticles([]), duration);
      return () => clearTimeout(timer);
    }
  }, [active, duration]);

  return (
    <AnimatePresence>
      {particles.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute top-0 rounded-sm"
              style={{
                left: `${p.x}%`,
                width: p.size,
                height: p.size * 0.6,
                backgroundColor: p.color,
              }}
              initial={{ y: -20, opacity: 1, rotate: 0 }}
              animate={{
                y: window.innerHeight + 20,
                opacity: [1, 1, 0],
                rotate: p.rotation,
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: 'easeIn',
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
