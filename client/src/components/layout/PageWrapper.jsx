import Sidebar from './Sidebar';
import Header from './Header';

const PageWrapper = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <Header />

        {/* Page content */}
        <main className="flex-1 p-6">
          {/* Page title */}
          {title && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white">{title}</h1>
              {subtitle && (
                <p className="text-white/50 text-sm mt-1">{subtitle}</p>
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