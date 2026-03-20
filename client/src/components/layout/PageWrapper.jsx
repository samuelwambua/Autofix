import { useState } from 'react';
import Sidebar from './Sidebar';
import SubscriptionBanner from '../common/SubscriptionBanner';
import Header from './Header';

const PageWrapper = ({ children, title, subtitle }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900">

      {/* Sidebar — slides in on mobile, fixed on desktop */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content — full width on mobile, offset on desktop */}
      <div className="lg:ml-64 flex flex-col min-h-screen">

        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Subscription Banner */}
        <SubscriptionBanner />

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6">
          {title && (
            <div className="mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-white">{title}</h1>
              {subtitle && (
                <p className="text-white/50 text-xs sm:text-sm mt-1">{subtitle}</p>
              )}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};

export default PageWrapper;