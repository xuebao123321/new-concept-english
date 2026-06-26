import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WrongBook from '../components/review/WrongBook';
import SpacedReview from '../components/review/SpacedReview';

type Tab = 'wrong' | 'spaced';

export default function ReviewPage() {
  const [activeTab, setActiveTab] = useState<Tab>('wrong');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = () => setRefreshTrigger(prev => prev + 1);

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Tab 切换 */}
      <div className="flex bg-warm-bg rounded-xl p-1 border border-warm-border">
        {([
          { key: 'wrong' as Tab, icon: '📝', label: '错题本' },
          { key: 'spaced' as Tab, icon: '🛡️', label: '间隔复习' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === tab.key
                ? 'bg-forest/15 text-forest neon-border'
                : 'text-ink-muted hover:text-ink-light'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 内容 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: activeTab === 'wrong' ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: activeTab === 'wrong' ? 20 : -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'wrong' ? (
            <WrongBook refreshTrigger={refreshTrigger} onStartReview={() => {}} />
          ) : (
            <SpacedReview refreshTrigger={refreshTrigger} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
