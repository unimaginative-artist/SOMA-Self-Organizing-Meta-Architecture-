import React from 'react';
import PulseApp from './pulse/App'; // Importing the refactored App.tsx

const PulseInterface = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full h-full max-w-[95vw] max-h-[95vh] bg-[#0d0d0e] rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden relative flex flex-col">
        {/* Pulse App Container */}
        <div className="flex-1 relative">
            <PulseApp onClose={onClose} />
        </div>
      </div>
    </div>
  );
};

export default PulseInterface;
