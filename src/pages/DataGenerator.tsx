import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DataGeneratorService } from '../lib/dataGenerator';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { ApiService } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { 
  Database, 
  Upload, 
  Settings, 
  Play, 
  Download,
  FileText,
  Image,
  BarChart3,
  Calendar,
  Brain,
  Shield,
  Zap,
  CheckCircle,
  MessageSquare,
  Lightbulb,
  Sparkles,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

const DataGenerator: React.FC = () => {
  const [selectedDataType, setSelectedDataType] = useState('tabular');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [generationStep, setGenerationStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedData, setUploadedData] = useState<any>(null);
  const [generatedData, setGeneratedData] = useState<any>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationSteps, setGenerationSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [inputMethod, setInputMethod] = useState<'upload' | 'describe'>('describe');
  const [naturalLanguageDescription, setNaturalLanguageDescription] = useState('');
  const [generatedSchema, setGeneratedSchema] = useState<any>(null);
  const [isGeneratingSchema, setIsGeneratingSchema] = useState(false);
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);
  const [lastHealthCheck, setLastHealthCheck] = useState<Date | null>(null);
  const [generationConfig, setGenerationConfig] = useState({
    rowCount: 10000,
    quality_level: 'high',
    privacy_level: 'maximum'
  });
  
  const { user, isGuest } = useStore();
  const dataService = new DataGeneratorService();
  const { lastMessage } = useWebSocket();

  // Check backend health on component mount
  useEffect(() => {
    checkBackendHealth();
    // Check health every 15 seconds
    const healthInterval = setInterval(checkBackendHealth, 15000);
    return () => clearInterval(healthInterval);
  }, []);

  const checkBackendHealth = async () => {
    try {
      const health = await ApiService.healthCheck();
      setBackendHealthy(health.healthy);
      setLastHealthCheck(new Date());
      
      if (health.healthy) {
        console.log('💚 Backend connected successfully');
      } else {
        console.log('💔 Backend connection failed:', health.error);
      }
    } catch (error) {
      console.error('💔 Health check error:', error);
      setBackendHealthy(false);
      setLastHealthCheck(new Date());
    }
  };
  
  // Listen for WebSocket updates
  useEffect(() => {
    if (lastMessage?.type === 'generation_update') {
      const { data } = lastMessage;
      console.log('🔄 Real-time generation update:', data);
      
      if (data.progress !== undefined && data.progress >= 0) {
        setGenerationProgress(data.progress);
      }
      
      if (data.step && data.message) {
        setCurrentStep(data.message);
        setGenerationSteps(prev => [...prev.slice(-4), `[${data.progress}%] ${data.message}`]);
      }
      
      if (data.progress === 100) {
        setIsGenerating(false);
        setGenerationStep(4);
        toast.success('🎉 Multi-agent AI generation completed!');
      } else if (data.progress === -1) {
        setIsGenerating(false);
        toast.error('❌ Generation failed: ' + data.message);
      }
    }
  }, [lastMessage]);

  const dataTypes = [
    { id: 'tabular', label: 'Tabular Data', icon: Database, description: 'CSV, Excel, structured data' },
    { id: 'timeseries', label: 'Time Series', icon: BarChart3, description: 'Sequential data with timestamps' },
    { id: 'text', label: 'Text Data', icon: FileText, description: 'Natural language, documents' },
    { id: 'image', label: 'Image Data', icon: Image, description: 'Synthetic images and visual data' },
  ];

  const domains = [
    { id: 'healthcare', label: 'Healthcare', icon: '🏥' },
    { id: 'finance', label: 'Finance', icon: '💰' },
    { id: 'retail', label: 'Retail', icon: '🛍️' },
    { id: 'manufacturing', label: 'Manufacturing', icon: '🏭' },
    { id: 'education', label: 'Education', icon: '🎓' },
    { id: 'custom', label: 'Custom', icon: '⚙️' },
  ];

  const exampleDescriptions = [
    "Generate customer data for an e-commerce platform with demographics, purchase history, and preferences",
    "Create patient records for a hospital with medical conditions, treatments, and outcomes",
    "Generate financial transaction data with account information, amounts, and categories",
    "Create employee data with departments, salaries, performance metrics, and attendance",
    "Generate sensor data from IoT devices with timestamps, readings, and device status"
  ];

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/json': ['.json'],
    },
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      
      const file = acceptedFiles[0];
      toast.loading('Processing uploaded file...');
      
      try {
        const processedData = await dataService.processUploadedData(file);
        setUploadedData(processedData);
        setGenerationStep(2);
        toast.dismiss();
        toast.success('File processed successfully!');
      } catch (error) {
        toast.dismiss();
        toast.error(`Failed to process file: ${(error as Error).message}`);
        console.error('File processing error:', error);
      }
    },
  });

  const handleGenerateSchema = async () => {
    const description = naturalLanguageDescription.trim();
    
    if (!description) {
      toast.error('Please describe the data you want to generate');
      return;
    }
    
    if (description.length < 10) {
      toast.error('Please provide a more detailed description (at least 10 characters)');
      return;
    }
    
    if (!selectedDomain) {
      toast.error('Please select a domain first');
      return;
    }
    
    if (!selectedDataType) {
      toast.error('Please select a data type first');
      return;
    }

    setIsGeneratingSchema(true);
    
    // Clear any previous schema
    setGeneratedSchema(null);

    try {
      console.log('🧠 Starting schema generation with:', {
        description,
        selectedDomain,
        selectedDataType,
        backendHealthy
      });
      
      const schema = await dataService.generateSchemaFromDescription(
        description,
        selectedDomain,
        selectedDataType
      );
      
      console.log('✅ Schema generated successfully:', schema);
      
      // Validate the schema response
      if (!schema || !schema.schema || Object.keys(schema.schema).length === 0) {
        throw new Error('Generated schema is empty or invalid');
      }
      
      setGeneratedSchema(schema);
      setGenerationStep(2);
      
      toast.dismiss();
      toast.success(
        `${backendHealthy ? '🔗 Backend' : '🏠 Local'} schema generated! Found ${Object.keys(schema.schema).length} fields.`,
        { duration: 4000 }
      );
      
    } catch (error) {
      console.error('❌ Schema generation failed:', error);
      toast.dismiss();

      // Narrow error to Error type for message access
      const err = error as Error & { message?: string };

      // Provide specific error messages
      if (err.message && err.message.includes('Backend service is not running')) {
        toast.error('Backend unavailable. Please start the backend server for AI features.', { duration: 6000 });
      } else if (err.message && (err.message.includes('API key') || err.message.includes('configured'))) {
        toast.error('AI service not configured. Please check your API keys.', { duration: 6000 });
      } else if (err.message && (err.message.includes('network') || err.message.includes('connection'))) {
        toast.error('Network error. Please check your connection and try again.', { duration: 6000 });
      } else {
        toast.error(`Schema generation failed: ${err.message ?? 'Unknown error'}`, { duration: 6000 });
      }

      // Reset generation step if failed
      setGenerationStep(1);
    } finally {
      setIsGeneratingSchema(false);
    }
  };

  const handleGenerate = async () => {
    // Allow both authenticated users and guests
    if (!user && !isGuest) {
      toast.error('Please sign in or enter as guest to generate data');
      return;
    }
    
    setIsGenerating(true);
    setGenerationStep(3);
    setGenerationProgress(0);
    setGenerationSteps([]);
    setCurrentStep('Starting generation...');
    
    
    try {
      let sourceData = [];
      let schema = {};
      
      if (inputMethod === 'upload' && uploadedData) {
        sourceData = uploadedData.data || [];
        schema = uploadedData.schema || {};
      } else if (inputMethod === 'describe' && generatedSchema) {
        sourceData = generatedSchema.sampleData || [];
        schema = generatedSchema.schema || {};
      }

      console.log('🚀 Starting generation with config:', {
        domain: selectedDomain,
        data_type: selectedDataType,
        sourceDataLength: sourceData.length,
        schemaFields: Object.keys(schema).length,
        isGuest,
        backendHealthy
      });

      // Use the data generator service which will try backend first, then fallback
      const result = await dataService.generateSyntheticDataset({
        domain: selectedDomain,
        data_type: selectedDataType,
        sourceData,
        schema,
        description: naturalLanguageDescription,
        isGuest: isGuest || !user,
        ...generationConfig
      });
      
      console.log('✅ Generation completed:', result);
      
      setGeneratedData(result);
      setGenerationStep(4);
      toast.dismiss();
      
      const method = result.metadata?.generationMethod || 'unknown';
      const methodLabel = method === 'backend_local' ? '🔗 Backend' : 
                         method === 'local_fallback' ? '🏠 Local' : '✨ AI';
      
      toast.success(`${methodLabel} generation complete! ${result.metadata?.rowsGenerated || 0} rows generated.`, { duration: 5000 });
      setIsGenerating(false);
      
    } catch (error) {
      toast.dismiss();
      const err = error as Error & { message?: string };
      toast.error(`Generation failed: ${err.message}`, { duration: 6000 });
      console.error('❌ Generation error:', error);
      setIsGenerating(false);
      setGenerationStep(2); // Go back to configuration step
    }
  };
  
  const handleExportData = async (format: 'csv' | 'json' | 'excel') => {
    if (!generatedData) return;
    
    try {
      const exportedData = await dataService.exportData(generatedData.data, format);
      
      // Create and download file
      const blob = new Blob([exportedData], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `synthetic-data-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Data exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export data');
      console.error('Export error:', error);
    }
  };

  // Helper function to check if generation button should be enabled
  const isGenerationButtonEnabled = () => {
    const hasBasicRequirements = selectedDomain && selectedDataType;
    const hasValidInput = (inputMethod === 'describe' && generatedSchema) || 
                         (inputMethod === 'upload' && uploadedData);
    return hasBasicRequirements && hasValidInput && !isGenerating && !isGeneratingSchema;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        className="flex items-center justify-between"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Data Generator</h1>
          <p className="text-gray-400">Create high-quality synthetic data with AI-powered agents</p>
          {isGuest && (
            <div className="flex items-center gap-2 mt-2 px-3 py-1 bg-blue-500/20 rounded-full border border-blue-500/30 w-fit">
              <CheckCircle className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-300">Guest Mode - Full Access</span>
            </div>
          )}
          
          {/* AI Status Indicator */}
          {isGenerating && (
            <div className="mt-4 p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
                <span className="text-purple-300 text-sm font-medium">
                  {backendHealthy ? 'Gemini 2.0 Flash Active' : 'Local AI Active'}
                </span>
              </div>
              <div className="text-xs text-purple-200">
                {backendHealthy 
                  ? 'Using Google AI for maximum quality and realism'
                  : 'Using intelligent fallback generation'
                }
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Backend Status Indicator */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
            backendHealthy === null ? 'bg-gray-500/20 border-gray-500/30' :
            backendHealthy ? 'bg-green-500/20 border-green-500/30' : 'bg-red-500/20 border-red-500/30'
          }`}>
            {backendHealthy === null ? (
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : backendHealthy ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-sm ${
              backendHealthy === null ? 'text-gray-300' :
              backendHealthy ? 'text-green-300' : 'text-red-300'
            }`}>
              {backendHealthy === null ? 'Checking...' :
               backendHealthy ? 'Backend Online' : 'Backend Offline'}
            </span>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full border border-purple-500/30">
            <Brain className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-300">AI Agents Active</span>
          </div>
        </div>
      </motion.div>

      {/* Backend Status Warning */}
      {backendHealthy === false && (
        <motion.div
          className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-yellow-300 font-medium">Backend service offline</p>
              <p className="text-yellow-200 text-sm">
                Using local AI generation. For best results, start the backend server.
                {lastHealthCheck && ` Last checked: ${lastHealthCheck.toLocaleTimeString()}`}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Generation Steps */}
      <div className="flex items-center gap-4 p-4 bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl">
        {['Data Input', 'Configuration', 'Generation', 'Review'].map((step, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              index + 1 <= generationStep 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                : 'bg-gray-700 text-gray-400'
            }`}>
              {index + 1 <= generationStep ? <CheckCircle className="w-4 h-4" /> : index + 1}
            </div>
            <span className={`text-sm ${
              index + 1 <= generationStep ? 'text-white' : 'text-gray-400'
            }`}>
              {step}
            </span>
            {index < 3 && <div className="w-8 h-0.5 bg-gray-700"></div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Input Method Selection */}
          <motion.div
            className="p-6 bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h3 className="text-xl font-semibold text-white mb-4">How would you like to create data?</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div
                onClick={() => setInputMethod('describe')}
                className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                  inputMethod === 'describe'
                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50'
                    : 'bg-gray-700/30 border-2 border-transparent hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <MessageSquare className="w-6 h-6 text-purple-400" />
                  <span className="font-medium text-white">Describe in Words</span>
                </div>
                <p className="text-sm text-gray-400">Tell us what data you need in natural language</p>
              </div>
              
              <div
                onClick={() => setInputMethod('upload')}
                className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                  inputMethod === 'upload'
                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50'
                    : 'bg-gray-700/30 border-2 border-transparent hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Upload className="w-6 h-6 text-purple-400" />
                  <span className="font-medium text-white">Upload Sample Data</span>
                </div>
                <p className="text-sm text-gray-400">Upload a file to use as a template</p>
              </div>
            </div>

            {/* Natural Language Description */}
            {inputMethod === 'describe' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Describe the data you want to generate
                  </label>
                  <textarea
                    value={naturalLanguageDescription}
                    onChange={(e) => setNaturalLanguageDescription(e.target.value)}
                    placeholder="Example: Generate customer data for an e-commerce platform with demographics, purchase history, and preferences..."
                    className="w-full h-32 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                </div>
                
                <div>
                  <p className="text-sm text-gray-400 mb-2">Need inspiration? Try these examples:</p>
                  <div className="grid grid-cols-1 gap-2">
                    {exampleDescriptions.slice(0, 3).map((example, index) => (
                      <button
                        key={index}
                        onClick={() => setNaturalLanguageDescription(example)}
                        className="text-left p-3 bg-gray-700/20 hover:bg-gray-600/30 rounded-lg border border-gray-600/30 hover:border-purple-500/30 transition-all duration-200"
                      >
                        <div className="flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-300">{example}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleGenerateSchema}
                  disabled={isGeneratingSchema || !naturalLanguageDescription.trim() || !selectedDomain || !selectedDataType}
                  title={
                    !naturalLanguageDescription.trim() ? 'Please enter a description' :
                    !selectedDomain ? 'Please select a domain first' :
                    !selectedDataType ? 'Please select a data type first' :
                    'Generate schema from description'
                  }
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 ${
                    isGeneratingSchema || !naturalLanguageDescription.trim() || !selectedDomain || !selectedDataType
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
                  } text-white flex items-center justify-center gap-2`}
                >
                  {isGeneratingSchema ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Generating Schema...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Schema from Description
                    </>
                  )}
                </button>
                
                {/* Show helpful hints */}
                {naturalLanguageDescription.trim() && (!selectedDomain || !selectedDataType) && (
                  <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-sm text-yellow-300">
                      💡 Please select a domain and data type above before generating the schema.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* File Upload */}
            {inputMethod === 'upload' && (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
                  isDragActive
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-white mb-2">
                  {isDragActive
                    ? 'Drop your files here...'
                    : 'Drag & drop files here, or click to select'}
                </p>
                <p className="text-gray-400 text-sm">
                  Supports CSV, Excel, JSON files
                </p>
              </div>
            )}
          </motion.div>

          {/* Data Type Selection */}
          <motion.div
            className="p-6 bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3 className="text-xl font-semibold text-white mb-4">Select Data Type</h3>
            <div className="grid grid-cols-2 gap-4">
              {dataTypes.map((type) => (
                <div
                  key={type.id}
                  onClick={() => setSelectedDataType(type.id)}
                  className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedDataType === type.id
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50'
                      : 'bg-gray-700/30 border-2 border-transparent hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <type.icon className="w-6 h-6 text-purple-400" />
                    <span className="font-medium text-white">{type.label}</span>
                  </div>
                  <p className="text-sm text-gray-400">{type.description}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Domain Selection */}
          <motion.div
            className="p-6 bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h3 className="text-xl font-semibold text-white mb-4">Select Domain</h3>
            <div className="grid grid-cols-3 gap-4">
              {domains.map((domain) => (
                <div
                  key={domain.id}
                  onClick={() => setSelectedDomain(domain.id)}
                  className={`p-4 rounded-lg cursor-pointer transition-all duration-200 text-center ${
                    selectedDomain === domain.id
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50'
                      : 'bg-gray-700/30 hover:bg-gray-600/30 border-2 border-transparent'
                  }`}
                >
                  <div className="text-2xl mb-2">{domain.icon}</div>
                  <span className="text-sm text-white">{domain.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Generation Parameters */}
          <motion.div
            className="p-6 bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h3 className="text-xl font-semibold text-white mb-4">Generation Parameters</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Number of Records
                </label>
                <input
                  type="number"
                  value={generationConfig.rowCount}
                  onChange={(e) => setGenerationConfig(prev => ({ 
                    ...prev, 
                    rowCount: parseInt(e.target.value) || 10000 
                  }))}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Quality Level
                </label>
                <select 
                  value={generationConfig.quality_level}
                  onChange={(e) => setGenerationConfig(prev => ({ 
                    ...prev, 
                    quality_level: e.target.value 
                  }))}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="high">High Quality (Slower)</option>
                  <option value="balanced">Balanced</option>
                  <option value="fast">Fast Generation</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Privacy Level
                </label>
                <select 
                  value={generationConfig.privacy_level}
                  onChange={(e) => setGenerationConfig(prev => ({ 
                    ...prev, 
                    privacy_level: e.target.value 
                  }))}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="maximum">Maximum Privacy</option>
                  <option value="high">High Privacy</option>
                  <option value="balanced">Balanced</option>
                </select>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* AI Agents Status */}
          <motion.div
            className="p-6 bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl"
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h3 className="text-lg font-semibold text-white mb-4">AI Agents</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${
                  backendHealthy ? 'bg-green-400' : 'bg-yellow-400'
                }`}></div>
                <span className="text-xs text-gray-400">
                  {backendHealthy ? 'Backend Connected' : 'Local Mode'}
                </span>
              </div>
              {[
                { name: 'Privacy Agent', status: 'Ready', icon: Shield },
                { name: 'Quality Agent', status: 'Ready', icon: CheckCircle },
                { name: 'Domain Expert', status: 'Ready', icon: Brain },
                { name: 'Bias Detector', status: 'Ready', icon: Zap },
              ].map((agent, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg">
                  <agent.icon className={`w-5 h-5 ${
                    backendHealthy ? 'text-green-400' : 'text-yellow-400'
                  }`} />
                  <div>
                    <p className="text-white text-sm font-medium">{agent.name}</p>
                    <p className={`text-xs ${
                      backendHealthy ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                      {backendHealthy ? agent.status : 'Local Mode'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Generate Button */}
          <motion.div
            className="p-6 bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl"
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <button
              onClick={handleGenerate}
              disabled={!isGenerationButtonEnabled()}
              title={
                !selectedDomain ? 'Please select a domain first' :
                !selectedDataType ? 'Please select a data type first' :
                inputMethod === 'describe' && !generatedSchema ? 'Please generate schema first' :
                inputMethod === 'upload' && !uploadedData ? 'Please upload data first' :
                'Generate synthetic data'
              }
              className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 ${
                !isGenerationButtonEnabled()
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
              } text-white flex items-center justify-center gap-2`}
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating... {generationProgress}%
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Generate Data
                </>
              )}
            </button>
            
            {/* Debug info for development */}
            {import.meta.env.DEV && (
              <div className="mt-2 p-2 bg-gray-700/20 rounded text-xs text-gray-400">
                <div>Domain: {selectedDomain || 'Not selected'}</div>
                <div>Data Type: {selectedDataType || 'Not selected'}</div>
                <div>Input Method: {inputMethod}</div>
                <div>Generated Schema: {generatedSchema ? 'Yes' : 'No'}</div>
                <div>Uploaded Data: {uploadedData ? 'Yes' : 'No'}</div>
                <div>Schema Fields: {generatedSchema ? Object.keys(generatedSchema.schema || {}).length : 0}</div>
                <div>Button Enabled: {isGenerationButtonEnabled() ? 'Yes' : 'No'}</div>
                <div>Backend: {backendHealthy ? 'Healthy' : 'Offline'}</div>
              </div>
            )}
          </motion.div>

          {/* Generation Progress */}
          {isGenerating && (
            <motion.div 
              className="p-6 bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                AI Agents Working
              </h3>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-700 rounded-full h-2">
                <motion.div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${generationProgress}%` }}
                  animate={{ width: `${generationProgress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-sm text-purple-300 mt-2 font-medium">{generationProgress}% Complete</p>
              
              {/* Current Step */}
              {currentStep && (
                <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <p className="text-sm text-purple-200">{currentStep}</p>
                </div>
              )}
              
              {/* Recent Steps Log */}
              {generationSteps.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-400 mb-2">Recent Activity:</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {generationSteps.map((step, index) => (
                      <motion.div 
                        key={index}
                        className="text-xs text-gray-300 p-2 bg-gray-700/30 rounded"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        {step}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Results */}
          {generatedData && (
            <motion.div
              className="p-6 bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-lg font-semibold text-white mb-4">Generation Results</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Records Generated:</span>
                  <span className="text-white font-medium">
                    {generatedData.metadata?.rowsGenerated?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Columns:</span>
                  <span className="text-white font-medium">
                    {generatedData.metadata?.columnsGenerated || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Quality Score:</span>
                  <span className="text-green-400 font-medium">{generatedData.qualityScore}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Privacy Score:</span>
                  <span className="text-green-400 font-medium">{generatedData.privacyScore}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Bias Score:</span>
                  <span className="text-green-400 font-medium">{generatedData.biasScore}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Generation Method:</span>
                  <span className="text-purple-400 font-medium">
                    {generatedData.metadata?.generationMethod === 'backend_local' ? 'Backend' :
                     generatedData.metadata?.generationMethod === 'local_fallback' ? 'Local' : 'AI'}
                  </span>
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <button 
                  onClick={() => handleExportData('csv')}
                  className="w-full py-2 px-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download CSV
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleExportData('json')}
                    className="py-2 px-4 bg-gray-700/50 text-white rounded-lg hover:bg-gray-600/50 transition-all duration-300 text-sm"
                  >
                    JSON
                  </button>
                  <button 
                    onClick={() => handleExportData('excel')}
                    className="py-2 px-4 bg-gray-700/50 text-white rounded-lg hover:bg-gray-600/50 transition-all duration-300 text-sm"
                  >
                    Excel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Generated Schema Info */}
          {generatedSchema && inputMethod === 'describe' && (
            <motion.div
              className="p-6 bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-lg font-semibold text-white mb-4">Generated Schema</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Fields:</span>
                  <span className="text-white font-medium">
                    {Object.keys(generatedSchema.schema || {}).length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Domain:</span>
                  <span className="text-purple-400 font-medium">
                    {generatedSchema.detectedDomain || selectedDomain}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Sample Rows:</span>
                  <span className="text-green-400 font-medium">
                    {generatedSchema.sampleData?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Method:</span>
                  <span className={`font-medium ${backendHealthy ? 'text-green-400' : 'text-yellow-400'}`}>
                    {backendHealthy ? 'Backend' : 'Local'}
                  </span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-gray-700/30 rounded-lg">
                <p className="text-xs text-gray-400 mb-2">Schema Preview:</p>
                <div className="space-y-1">
                  {generatedSchema.schema && Object.keys(generatedSchema.schema).length > 0 ? (
                    <>
                      {Object.entries(generatedSchema.schema).slice(0, 3).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="text-gray-300">{key}</span>
                          <span className="text-purple-400">{value.type || 'unknown'}</span>
                        </div>
                      ))}
                      {Object.keys(generatedSchema.schema).length > 3 && (
                        <p className="text-xs text-gray-400">... and {Object.keys(generatedSchema.schema).length - 3} more</p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-gray-400">No schema fields available</p>
                  )}
                </div>
              </div>
              
              {/* Show generation button status for schema */}
              <div className="mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-sm text-green-300">
                  ✅ Schema ready! You can now generate synthetic data.
                </p>
              </div>
            </motion.div>
          )}
          
          {/* Show error if schema generation failed */}
          {inputMethod === 'describe' && naturalLanguageDescription && !generatedSchema && !isGeneratingSchema && (
            <motion.div
              className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-lg font-semibold text-red-300 mb-2">Schema Generation Failed</h3>
              <p className="text-sm text-red-200 mb-3">
                Unable to generate schema from your description. Please try:
              </p>
              <ul className="text-sm text-red-200 space-y-1">
                <li>• Making your description more detailed</li>
                <li>• Selecting a specific domain and data type first</li>
                <li>• Checking your internet connection</li>
                {!backendHealthy && <li>• Starting the backend server for better AI features</li>}
              </ul>
              <button
                onClick={handleGenerateSchema}
                className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-200 text-sm transition-all duration-200"
              >
                Try Again
              </button>
            </motion.div>
          )}

          {/* Uploaded Data Info */}
          {uploadedData && inputMethod === 'upload' && (
            <motion.div
              className="p-6 bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-lg font-semibold text-white mb-4">Source Data Analysis</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Rows:</span>
                  <span className="text-white font-medium">
                    {uploadedData.statistics?.rowCount?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Columns:</span>
                  <span className="text-white font-medium">
                    {uploadedData.statistics?.columnCount || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Domain:</span>
                  <span className="text-purple-400 font-medium">
                    {uploadedData.analysis?.domain || 'Analyzing...'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Quality:</span>
                  <span className="text-green-400 font-medium">
                    {uploadedData.analysis?.quality?.score ? `${uploadedData.analysis.quality.score}%` : 'Good'}
                  </span>
                </div>
              </div>
              
              <div className="mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-sm text-green-300">
                  ✅ Data uploaded and analyzed! You can now generate synthetic data.
                </p>
              </div>
            </motion.div>
          )}
          
          {/* Show error if file upload failed */}
          {inputMethod === 'upload' && !uploadedData && (
            <motion.div
              className="p-4 bg-gray-700/30 rounded-lg border border-gray-600/30"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Upload Tips</h3>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• CSV files: Must have headers in the first row</li>
                <li>• JSON files: Should contain an array of objects</li>
                <li>• File size limit: 10MB</li>
                <li>• Supported formats: .csv, .json</li>
              </ul>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataGenerator;