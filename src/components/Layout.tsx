import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { ApiService } from '../lib/api';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [backendStatus, setBackendStatus] = React.useState<'checking' | 'online' | 'offline'>('checking');
  
  // Check backend status periodically
  React.useEffect(() => {
    const checkStatus = async () => {
      try {
        const health = await ApiService.healthCheck();
        setBackendStatus(health.healthy ? 'online' : 'offline');
      } catch {
        setBackendStatus('offline');
      }
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="flex min-h-screen bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Backend Status Banner */}
        {backendStatus === 'offline' && (
          <motion.div
            className="bg-yellow-500/10 border-b border-yellow-500/20 px-6 py-2"
            initial={{ y: -50 }}
            animate={{ y: 0 }}
          >
            <div className="flex items-center gap-2 text-yellow-300">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm">
                Backend offline - Using local AI processing mode
              </span>
            </div>
          </motion.div>
        )}
        
        {backendStatus === 'online' && (
          <motion.div
            className="bg-green-500/10 border-b border-green-500/20 px-6 py-2"
            initial={{ y: -50 }}
            animate={{ y: 0 }}
          >
            <div className="flex items-center gap-2 text-green-300">
              <Wifi className="w-4 h-4" />
              <span className="text-sm">
                AI Backend connected - Full Gemini 2.0 Flash capabilities available
              </span>
            </div>
          </motion.div>
        )}
        
        <Header />
        <motion.main 
          className="flex-1 p-6 overflow-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
};

export default Layout;