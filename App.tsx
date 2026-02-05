import React, { useState, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';

interface VoicePreset {
  id: string;
  name: string;
  pitch: number;
  description: string;
  emoji: string;
}

const VOICE_PRESETS: VoicePreset[] = [
  { id: 'normal', name: 'Normal', pitch: 0, description: 'Your natural voice', emoji: '😊' },
  { id: 'deep', name: 'Deep Voice', pitch: -4, description: 'Lower, masculine', emoji: '🦁' },
  { id: 'very_deep', name: 'Very Deep', pitch: -8, description: 'Demon-like', emoji: '👹' },
  { id: 'slight_deep', name: 'Slightly Deep', pitch: -2, description: 'Subtle depth', emoji: '🐻' },
  { id: 'high', name: 'High Pitch', pitch: 5, description: 'Chipmunk-like', emoji: '🐿️' },
  { id: 'very_high', name: 'Very High', pitch: 10, description: 'Alien-like', emoji: '👽' },
  { id: 'slight_high', name: 'Slightly High', pitch: 2, description: 'Subtle brightness', emoji: '🐦' },
  { id: 'robot', name: 'Robot', pitch: -6, description: 'Mechanical', emoji: '🤖' },
];

const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentPreset, setCurrentPreset] = useState('deep');
  const [customPitch, setCustomPitch] = useState(-4);
  const [gain, setGain] = useState(1.5);
  const [noiseGate, setNoiseGate] = useState(0.015);
  const [filterEnabled, setFilterEnabled] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Initializing...');

  useEffect(() => {
    const newSocket = io('http://127.0.0.1:5000', {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to backend');
      setIsConnected(true);
      setStatusMessage('Connected to voice engine');
      newSocket.emit('get_status');
    });

    newSocket.on('disconnect', () => {
      console.log('⚠️ Disconnected from backend');
      setIsConnected(false);
      setIsStreaming(false);
      setStatusMessage('Disconnected from backend');
    });

    newSocket.on('status', (data) => {
      console.log('Status update:', data);
      setStatusMessage(data.msg || 'Status updated');
      if (data.streaming !== undefined) {
        setIsStreaming(data.streaming);
      }
    });

    newSocket.on('current_settings', (data) => {
      console.log('Current settings:', data);
      setCustomPitch(data.pitch);
      setGain(data.gain);
      setNoiseGate(data.noise_gate);
      setFilterEnabled(data.filter_enabled);
      setIsStreaming(data.streaming);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const handlePresetChange = (preset: VoicePreset) => {
    if (!socket || !isConnected) {
      setStatusMessage('Not connected to backend!');
      return;
    }

    socket.emit('change_voice', { pitch: preset.pitch });
    setCurrentPreset(preset.id);
    setCustomPitch(preset.pitch);
    setStatusMessage(`Voice: ${preset.name}`);
  };

  const handleCustomPitchChange = (value: number) => {
    if (!socket || !isConnected) return;
    setCustomPitch(value);
    socket.emit('change_voice', { pitch: value });
    setCurrentPreset('custom');
  };

  const handleGainChange = (value: number) => {
    if (!socket || !isConnected) return;
    setGain(value);
    socket.emit('change_gain', { gain: value });
  };

  const handleNoiseGateChange = (value: number) => {
    if (!socket || !isConnected) return;
    setNoiseGate(value);
    socket.emit('change_noise_gate', { threshold: value });
  };

  const handleFilterToggle = () => {
    if (!socket || !isConnected) return;
    const newState = !filterEnabled;
    setFilterEnabled(newState);
    socket.emit('toggle_filter', { enabled: newState });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '20px',
        padding: '30px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ 
            fontSize: '42px', 
            margin: '0 0 10px 0',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            🎙️ VoicePulse DSP
          </h1>
          <p style={{ color: '#666', margin: 0, fontSize: '16px' }}>
            Real-time Voice Changer • High Quality Audio Processing
          </p>
        </div>

        {/* Status Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
          <div style={{
            padding: '15px',
            background: isConnected ? '#d4edda' : '#f8d7da',
            color: isConnected ? '#155724' : '#721c24',
            borderRadius: '10px',
            textAlign: 'center',
            fontWeight: '500'
          }}>
            {isConnected ? '🟢' : '🔴'} Backend: {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          
          <div style={{
            padding: '15px',
            background: isStreaming ? '#d4edda' : '#fff3cd',
            color: isStreaming ? '#155724' : '#856404',
            borderRadius: '10px',
            textAlign: 'center',
            fontWeight: '500'
          }}>
            {isStreaming ? '🎤' : '⏸️'} Audio: {isStreaming ? 'Streaming' : 'Idle'}
          </div>
        </div>

        {/* Status Message */}
        <div style={{
          padding: '12px',
          background: '#e7f3ff',
          color: '#1976D2',
          borderRadius: '8px',
          marginBottom: '25px',
          textAlign: 'center',
          fontSize: '14px'
        }}>
          {statusMessage}
        </div>

        {/* Voice Presets */}
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '15px', color: '#333' }}>
            🎭 Voice Presets
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '12px'
          }}>
            {VOICE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetChange(preset)}
                disabled={!isConnected}
                style={{
                  padding: '18px',
                  background: currentPreset === preset.id 
                    ? 'linear-gradient(135deg, #667eea, #764ba2)' 
                    : '#f8f9fa',
                  color: currentPreset === preset.id ? 'white' : '#333',
                  border: currentPreset === preset.id ? 'none' : '2px solid #e0e0e0',
                  borderRadius: '12px',
                  cursor: isConnected ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  opacity: isConnected ? 1 : 0.5,
                  textAlign: 'left',
                  fontSize: '14px'
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '5px' }}>{preset.emoji}</div>
                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '3px' }}>
                  {preset.name}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '3px' }}>
                  {preset.description}
                </div>
                <div style={{ fontSize: '11px', opacity: 0.7 }}>
                  Pitch: {preset.pitch > 0 ? '+' : ''}{preset.pitch}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Controls */}
        <div style={{
          padding: '25px',
          background: '#f8f9fa',
          borderRadius: '12px',
          marginBottom: '20px'
        }}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px', color: '#333' }}>
            🎚️ Advanced Controls
          </h2>

          {/* Custom Pitch */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#666', fontSize: '14px', fontWeight: '500' }}>
              🎵 Custom Pitch: {customPitch > 0 ? '+' : ''}{customPitch} semitones
            </label>
            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={customPitch}
              onChange={(e) => handleCustomPitchChange(Number(e.target.value))}
              disabled={!isConnected}
              style={{ width: '100%', cursor: isConnected ? 'pointer' : 'not-allowed' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#999', marginTop: '5px' }}>
              <span>-12 (Very Deep)</span>
              <span>0 (Normal)</span>
              <span>+12 (Very High)</span>
            </div>
          </div>

          {/* Gain Control */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#666', fontSize: '14px', fontWeight: '500' }}>
              🔊 Volume Boost: {gain.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={gain}
              onChange={(e) => handleGainChange(Number(e.target.value))}
              disabled={!isConnected}
              style={{ width: '100%', cursor: isConnected ? 'pointer' : 'not-allowed' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#999', marginTop: '5px' }}>
              <span>0.5x (Quiet)</span>
              <span>1.5x (Recommended)</span>
              <span>3.0x (Loud)</span>
            </div>
          </div>

          {/* Noise Gate */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#666', fontSize: '14px', fontWeight: '500' }}>
              🚪 Noise Gate: {noiseGate.toFixed(3)}
            </label>
            <input
              type="range"
              min="0.001"
              max="0.050"
              step="0.001"
              value={noiseGate}
              onChange={(e) => handleNoiseGateChange(Number(e.target.value))}
              disabled={!isConnected}
              style={{ width: '100%', cursor: isConnected ? 'pointer' : 'not-allowed' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#999', marginTop: '5px' }}>
              <span>0.001 (Sensitive)</span>
              <span>0.015 (Default)</span>
              <span>0.050 (Aggressive)</span>
            </div>
          </div>

          {/* Filter Toggle */}
          <div style={{ marginTop: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: isConnected ? 'pointer' : 'not-allowed', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={filterEnabled}
                onChange={handleFilterToggle}
                disabled={!isConnected}
                style={{ marginRight: '10px', width: '18px', height: '18px', cursor: isConnected ? 'pointer' : 'not-allowed' }}
              />
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#666' }}>
                🎛️ Enable Noise Reduction & Low-pass Filter
              </span>
            </label>
          </div>
        </div>

        {/* Instructions */}
        <div style={{
          padding: '20px',
          background: '#e7f3ff',
          borderLeft: '4px solid #2196F3',
          borderRadius: '8px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#1976D2' }}>
            ℹ️ How to Use
          </h3>
          <ol style={{ margin: 0, paddingLeft: '20px', color: '#555', fontSize: '14px', lineHeight: '1.6' }}>
            <li>Run backend: <code style={{ background: '#fff', padding: '2px 6px', borderRadius: '3px' }}>python server.py</code></li>
            <li>Wait for "Audio Stream ACTIVE" message</li>
            <li>Open this frontend in browser</li>
            <li>Select a voice preset or customize with sliders</li>
            <li>Speak into your microphone - voice is modified in real-time</li>
            <li>Set Discord/WhatsApp input to <strong>"CABLE Output"</strong></li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default App;
