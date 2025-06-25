/**
 * Logo Editor Component
 * Wixel-style canvas interface for natural language logo editing
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Wand2, 
  Type, 
  Palette, 
  Move, 
  RotateCcw, 
  RotateCw, 
  Download, 
  Save, 
  Eye, 
  EyeOff,
  Layers,
  Square,
  Circle,
  Triangle,
  Star,
  Sparkles,
  Image as ImageIcon,
  Upload,
  Trash2,
  Copy,
  Settings,
  ZoomIn,
  ZoomOut,
  Grid,
  RefreshCw,
  ChevronDown,
  Send,
  Plus,
  Minus
} from 'lucide-react';
import { 
  naturalLanguageParserService, 
  type ParsedCommand, 
  type EditingSession,
  type EditOperation,
  EditCommandType 
} from '@/services/natural-language-parser';
import { logoGenerationWorkflowService, type GeneratedLogo } from '@/services/logo-generation-workflow';

interface LogoEditorProps {
  initialLogo: GeneratedLogo;
  onSave?: (editedLogo: GeneratedLogo) => void;
  onExport?: (format: 'png' | 'svg' | 'pdf') => void;
  onClose?: () => void;
}

interface CanvasSettings {
  zoom: number;
  showGrid: boolean;
  canvasSize: { width: number; height: number };
  backgroundColor: string;
}

interface LayerItem {
  id: string;
  name: string;
  type: 'logo' | 'background' | 'overlay';
  visible: boolean;
  locked: boolean;
  opacity: number;
}

export default function LogoEditor({ 
  initialLogo, 
  onSave, 
  onExport, 
  onClose 
}: LogoEditorProps) {
  // Core state
  const [currentLogo, setCurrentLogo] = useState<GeneratedLogo>(initialLogo);
  const [editingSession, setEditingSession] = useState<EditingSession>({
    id: `session_${Date.now()}`,
    originalLogo: initialLogo,
    currentLogo: initialLogo,
    editHistory: [],
    createdAt: new Date(),
    lastModified: new Date()
  });

  // UI state
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>({
    zoom: 100,
    showGrid: false,
    canvasSize: { width: 800, height: 800 },
    backgroundColor: '#ffffff'
  });
  const [layers, setLayers] = useState<LayerItem[]>([
    { id: 'logo', name: 'Logo', type: 'logo', visible: true, locked: false, opacity: 100 },
    { id: 'background', name: 'Background', type: 'background', visible: true, locked: false, opacity: 100 }
  ]);

  // Natural language editing
  const [commandInput, setCommandInput] = useState('');
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);
  const [commandSuggestions, setCommandSuggestions] = useState<string[]>([]);
  const [lastParsedCommand, setLastParsedCommand] = useState<ParsedCommand | null>(null);

  // Variations and history
  const [variations, setVariations] = useState<GeneratedLogo[]>([]);
  const [undoStack, setUndoStack] = useState<GeneratedLogo[]>([]);
  const [redoStack, setRedoStack] = useState<GeneratedLogo[]>([]);

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);

  // Initialize command suggestions
  useEffect(() => {
    const suggestions = naturalLanguageParserService.getCommandSuggestions(currentLogo);
    setCommandSuggestions(suggestions);
  }, [currentLogo]);

  // Handle natural language command
  const handleCommandSubmit = useCallback(async () => {
    if (!commandInput.trim() || isProcessingCommand) return;

    setIsProcessingCommand(true);
    
    try {
      // Parse the command
      const parsedCommand = await naturalLanguageParserService.parseEditingCommand(
        commandInput,
        currentLogo
      );
      
      setLastParsedCommand(parsedCommand);

      // Execute the command
      const result = await naturalLanguageParserService.executeEditingCommand(
        parsedCommand,
        currentLogo
      );

      if (result.success && result.editedLogo) {
        // Save current state to undo stack
        setUndoStack(prev => [...prev, currentLogo]);
        setRedoStack([]); // Clear redo stack on new edit
        
        // Update current logo
        setCurrentLogo(result.editedLogo);
        
        // Add to edit history
        const editOperation: EditOperation = {
          id: `edit_${Date.now()}`,
          command: parsedCommand,
          beforeImage: currentLogo.imageUrl,
          afterImage: result.editedLogo.imageUrl,
          timestamp: new Date(),
          status: 'completed'
        };

        setEditingSession(prev => ({
          ...prev,
          currentLogo: result.editedLogo,
          editHistory: [...prev.editHistory, editOperation],
          lastModified: new Date()
        }));

        // Generate variations
        generateVariationsForEdit(parsedCommand, result.editedLogo);
        
        // Clear command input
        setCommandInput('');
      }
    } catch (error) {
      console.error('Failed to process command:', error);
    } finally {
      setIsProcessingCommand(false);
    }
  }, [commandInput, currentLogo, isProcessingCommand]);

  // Generate variations for current edit
  const generateVariationsForEdit = useCallback(async (
    command: ParsedCommand, 
    baseLogo: GeneratedLogo
  ) => {
    try {
      const variationResults = await naturalLanguageParserService.generateEditingVariations(
        command,
        baseLogo,
        3
      );
      setVariations(variationResults);
    } catch (error) {
      console.error('Failed to generate variations:', error);
    }
  }, []);

  // Undo/Redo functionality
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    
    const previousState = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, currentLogo]);
    setUndoStack(prev => prev.slice(0, -1));
    setCurrentLogo(previousState);
  }, [undoStack, currentLogo]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    
    const nextState = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, currentLogo]);
    setRedoStack(prev => prev.slice(0, -1));
    setCurrentLogo(nextState);
  }, [redoStack, currentLogo]);

  // Canvas zoom controls
  const handleZoomIn = useCallback(() => {
    setCanvasSettings(prev => ({
      ...prev,
      zoom: Math.min(prev.zoom + 25, 400)
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setCanvasSettings(prev => ({
      ...prev,
      zoom: Math.max(prev.zoom - 25, 25)
    }));
  }, []);

  // Layer management
  const toggleLayerVisibility = useCallback((layerId: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId 
        ? { ...layer, visible: !layer.visible }
        : layer
    ));
  }, []);

  const toggleLayerLock = useCallback((layerId: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId 
        ? { ...layer, locked: !layer.locked }
        : layer
    ));
  }, []);

  // Use suggestion
  const useSuggestion = useCallback((suggestion: string) => {
    setCommandInput(suggestion);
    commandInputRef.current?.focus();
  }, []);

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Left Sidebar - Tools and Actions */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Logo Editor</h1>
              <p className="text-sm text-gray-500">{currentLogo.metadata.companyName}</p>
            </div>
          </div>
        </div>

        {/* Natural Language Command */}
        <div className="p-4 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Natural Language Editing
          </label>
          <div className="space-y-3">
            <div className="flex space-x-2">
              <input
                ref={commandInputRef}
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCommandSubmit()}
                placeholder="e.g., Make it more blue..."
                className="flex-1 rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
                disabled={isProcessingCommand}
              />
              <button
                onClick={handleCommandSubmit}
                disabled={!commandInput.trim() || isProcessingCommand}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessingCommand ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Command Suggestions */}
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Quick suggestions:</p>
              <div className="flex flex-wrap gap-1">
                {commandSuggestions.slice(0, 4).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => useSuggestion(suggestion)}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tools */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Design Tools</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'select', icon: Move, label: 'Select' },
              { id: 'text', icon: Type, label: 'Text' },
              { id: 'color', icon: Palette, label: 'Color' },
              { id: 'shape', icon: Square, label: 'Shape' },
              { id: 'circle', icon: Circle, label: 'Circle' },
              { id: 'effect', icon: Sparkles, label: 'Effect' }
            ].map((tool) => (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool.id)}
                className={`p-3 rounded-lg text-center transition-colors ${
                  selectedTool === tool.id
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <tool.icon className="w-5 h-5 mx-auto mb-1" />
                <span className="text-xs">{tool.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Undo</span>
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCw className="w-4 h-4" />
              <span>Redo</span>
            </button>
          </div>
        </div>

        {/* File Actions */}
        <div className="p-4 mt-auto">
          <div className="space-y-2">
            <button
              onClick={() => onSave?.(currentLogo)}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Project</span>
            </button>
            <button
              onClick={() => onExport?.('png')}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export PNG</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col bg-gray-100">
        {/* Canvas Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-sm font-medium text-gray-900">
              Canvas • {canvasSettings.canvasSize.width} × {canvasSettings.canvasSize.height}
            </h2>
            <button
              onClick={() => setCanvasSettings(prev => ({ ...prev, showGrid: !prev.showGrid }))}
              className={`p-1.5 rounded ${canvasSettings.showGrid ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <button onClick={handleZoomOut} className="p-1.5 text-gray-400 hover:text-gray-600">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600 min-w-12 text-center">{canvasSettings.zoom}%</span>
              <button onClick={handleZoomIn} className="p-1.5 text-gray-400 hover:text-gray-600">
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
            
            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>

        {/* Canvas Content */}
        <div className="flex-1 p-8 overflow-auto">
          <div className="flex items-center justify-center min-h-full">
            <div
              ref={canvasRef}
              className="relative bg-white rounded-lg shadow-lg border border-gray-200"
              style={{
                width: canvasSettings.canvasSize.width * (canvasSettings.zoom / 100),
                height: canvasSettings.canvasSize.height * (canvasSettings.zoom / 100),
                backgroundColor: canvasSettings.backgroundColor
              }}
            >
              {/* Grid overlay */}
              {canvasSettings.showGrid && (
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                      linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px'
                  }}
                />
              )}
              
              {/* Logo */}
              <div className="absolute inset-0 flex items-center justify-center p-8">
                {currentLogo.imageUrl && (
                  <img
                    src={currentLogo.imageUrl}
                    alt="Logo"
                    className="max-w-full max-h-full object-contain"
                    style={{ 
                      filter: layers.find(l => l.id === 'logo')?.visible ? 'none' : 'opacity(0)',
                      opacity: (layers.find(l => l.id === 'logo')?.opacity || 100) / 100
                    }}
                  />
                )}
              </div>

              {/* Selection overlay */}
              <div className="absolute inset-0 border-2 border-blue-500 border-dashed opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-white border-t border-gray-200 px-4 py-2 text-sm text-gray-500">
          {lastParsedCommand && (
            <div className="flex items-center space-x-4">
              <span>Last command: "{lastParsedCommand.originalText}"</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                {Math.round(lastParsedCommand.confidence * 100)}% confidence
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right Properties Panel */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        {/* Layers Panel */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Layers className="w-4 h-4 mr-2" />
            Layers
          </h3>
          <div className="space-y-2">
            {layers.map((layer) => (
              <div key={layer.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                <button
                  onClick={() => toggleLayerVisibility(layer.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <span className="flex-1 text-sm text-gray-700">{layer.name}</span>
                <button
                  onClick={() => toggleLayerLock(layer.id)}
                  className={layer.locked ? 'text-gray-600' : 'text-gray-400 hover:text-gray-600'}
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Variations Panel */}
        {variations.length > 0 && (
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Variations</h3>
            <div className="grid grid-cols-2 gap-2">
              {variations.map((variation, index) => (
                <button
                  key={variation.id}
                  onClick={() => setCurrentLogo(variation)}
                  className="aspect-square border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-colors"
                >
                  {variation.imageUrl && (
                    <img
                      src={variation.imageUrl}
                      alt={`Variation ${index + 1}`}
                      className="w-full h-full object-contain bg-gray-50"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Properties Panel */}
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Properties</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Background Color</label>
              <input
                type="color"
                value={canvasSettings.backgroundColor}
                onChange={(e) => setCanvasSettings(prev => ({ ...prev, backgroundColor: e.target.value }))}
                className="w-full h-8 rounded border border-gray-300"
              />
            </div>
            
            <div>
              <label className="block text-xs text-gray-500 mb-1">Canvas Size</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={canvasSettings.canvasSize.width}
                  onChange={(e) => setCanvasSettings(prev => ({ 
                    ...prev, 
                    canvasSize: { ...prev.canvasSize, width: parseInt(e.target.value) || 800 }
                  }))}
                  className="px-2 py-1 text-sm border border-gray-300 rounded"
                  placeholder="Width"
                />
                <input
                  type="number"
                  value={canvasSettings.canvasSize.height}
                  onChange={(e) => setCanvasSettings(prev => ({ 
                    ...prev, 
                    canvasSize: { ...prev.canvasSize, height: parseInt(e.target.value) || 800 }
                  }))}
                  className="px-2 py-1 text-sm border border-gray-300 rounded"
                  placeholder="Height"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Edit History */}
        <div className="p-4 border-t border-gray-200 mt-auto max-h-48 overflow-y-auto">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Edit History</h3>
          <div className="space-y-2">
            {editingSession.editHistory.slice(-5).reverse().map((edit) => (
              <div key={edit.id} className="text-xs p-2 bg-gray-50 rounded">
                <div className="font-medium text-gray-700">
                  {edit.command.type.replace('_', ' ')}
                </div>
                <div className="text-gray-500 truncate">
                  "{edit.command.originalText}"
                </div>
                <div className="text-gray-400">
                  {edit.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 