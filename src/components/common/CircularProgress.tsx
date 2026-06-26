import { motion } from 'framer-motion';

interface CircularProgressProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  children?: React.ReactNode;
  showPercentage?: boolean;
}

export default function CircularProgress({
  progress,
  size = 80,
  strokeWidth = 6,
  color = '#22D3EE',
  bgColor = 'rgba(255, 255, 255, 0.1)',
  children,
  showPercentage = false,
}: CircularProgressProps) {
  const normalizedProgress = Math.min(100, Math.max(0, progress)) / 100;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - normalizedProgress * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* 背景圆 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        {/* 进度圆 */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </svg>
      {(children || showPercentage) && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children || (
            <span className="text-sm font-bold" style={{ color }}>
              {Math.round(progress)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
