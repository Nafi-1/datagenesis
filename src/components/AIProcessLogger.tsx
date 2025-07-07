import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from '../hooks/useWebSocket';
import { 
  Brain, 
  Zap, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Activity
} from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'gemini' | 'agent' | 'fallback' | 'success' | 'error' | 'info';
  message: string;
  progress?: number;
  step?: string;
}

interface AIProcessLoggerProps {
  isVisible: boolean;
  isGenerating: boolean;
}

const AIProcessLogger: React.FC<AIProcessLoggerProps> = ({ isVisible, isGenerating }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage?.type === 'generation_update') {
      const { data } = lastMessage;
      const { step, progress, message } = data;

      setCurrentProgress(progress || 0);
      setCurrentStep(step || '');

      // Determine log type based on message content
      let logType: LogEntry['type'] = 'info';
      let displayMessage = message;

      if (message.includes('Gemini 2.0 Flash') || message.includes('GEMINI')) {
        logType = 'gemini';
        displayMessage = `🤖 ${message}`;
      } else if (message.includes('fallback') || message.includes('FALLBACK')) {
        logType = 'fallback';
        displayMessage = `🏠 ${message}`;
      } else if (message.includes('✅') || message.includes('completed')) {
        logType = 'success';
      } else if (message.includes('❌') || message.includes('failed')) {
        logType = 'error';
      } else if (message.includes('Agent') || message.includes('AGENT')) {
        logType = 'agent';
        displayMessage = `🤖 ${message}`;
      }

      const newLog: LogEntry = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: logType,
        message: displayMessage,
        progress,
        step
      };

      setLogs(prev => [...prev.slice(-20), newLog]); // Keep last 20 logs
    }
  }, [lastMessage]);

  // Clear logs when generation starts
  useEffect(() => {
    if (isGenerating && logs.length === 0) {
      setLogs([{
        id: 'start',
        timestamp: new Date().toLocaleTimeString(),
        type: 'info',
        message: '🚀 Starting AI-powered data generation...',
        progress: 0
      }]);
    } else if (!isGenerating && logs.length > 0) {
      // Add completion log if needed
      const lastLog = logs[logs.length - 1];
      if (lastLog.progress !== 100) {
        setLogs(prev => [...prev, {
          id: 'complete',
          timestamp: new Date().toLocaleTimeString(),
          type: 'success',
          message: '🎉 Generation process completed!',
          progress: 100
        }]);
      }
    }
  }, [isGenerating]);

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'gemini':
        return <Brain className="w-4 h-4 text-purple-400" />;
      case 'agent':
        return <Activity className="w-4 h-4 text-blue-400" />;
      case 'fallback':
        return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getLogBgColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'gemini':
        return 'bg-purple-500/10 border-purple-500/20';
      case 'agent':
        return 'bg-blue-500/10 border-blue-500/20';
      case 'fallback':
        return 'bg-yellow-500/10 border-yellow-500/20';
      case 'success':
        return 'bg-green-500/10 border-green-500/20';
      case 'error':
        return 'bg-red-500/10 border-red-500/20';
      default:
        return 'bg-gray-500/10 border-gray-500/20';
    }
  };

  if (!isVisible) return null;

  return (
    <motion.div
      className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              <span className="text-white font-semibold">AI Process Monitor</span>
            </div>
            {isGenerating && (
              <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/20 rounded-full">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <span className="text-purple-300 text-sm">Active</span>
              </div>
            )}
          </div>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            {isExpanded ? 
              <ChevronUp className="w-5 h-5" /> : 
              <ChevronDown className="w-5 h-5" />
            }
          </button>
        </div>

        {/* Progress Bar */}
        {isGenerating && currentProgress > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">{currentStep || 'Processing...'}</span>
              <span className="text-sm text-purple-300 font-medium">{currentProgress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${currentProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Logs */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="max-h-64 overflow-y-auto"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-4 space-y-2">
              {logs.length === 0 ? (
                <div className="text-center py-4 text-gray-400">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Waiting for AI processes to start...</p>
                </div>
              ) : (
                logs.map((log) => (
                  <motion.div
                    key={log.id}
                    className={`p-3 rounded-lg border ${getLogBgColor(log.type)}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-start gap-3">
                      {getLogIcon(log.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-white break-words">{log.message}</p>
                          <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                            {log.timestamp}
                          </span>
                        </div>
                        {log.progress !== undefined && (
                          <div className="mt-1">
                            <div className="w-full bg-gray-600 rounded-full h-1">
                              <div
                                className="bg-purple-400 h-1 rounded-full transition-all duration-300"
                                style={{ width: `${log.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Footer */}
      {logs.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-700/50 bg-gray-700/20">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{logs.length} events logged</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Brain className="w-3 h-3 text-purple-400" />
                <span>{logs.filter(l => l.type === 'gemini').length} Gemini</span>
              </div>
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-blue-400" />
                <span>{logs.filter(l => l.type === 'agent').length} Agents</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span>{logs.filter(l => l.type === 'success').length} Success</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AIProcessLogger;