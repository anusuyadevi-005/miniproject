import React, { useState } from 'react';
import SDIDExplorer from './SDIDExplorer';
import SDIDDetail from './SDIDDetail';
import SDIDReviewQueue from './SDIDReviewQueue';

export default function SDIDDashboard() {
  const [currentView, setCurrentView] = useState('explorer');
  const [selectedSdid, setSelectedSdid] = useState(null);
  const repositoryId = 'proj_1'; // Use a default for the prototype

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-100">SDID Engine (Module 13)</h2>
        <div className="flex space-x-2 bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => { setCurrentView('explorer'); setSelectedSdid(null); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currentView === 'explorer' && !selectedSdid ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            SDID Explorer
          </button>
          <button
            onClick={() => { setCurrentView('review'); setSelectedSdid(null); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currentView === 'review' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Review Queue
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg flex-1 overflow-hidden">
        {currentView === 'explorer' && !selectedSdid && (
          <SDIDExplorer repositoryId={repositoryId} onSelect={setSelectedSdid} />
        )}
        {currentView === 'review' && !selectedSdid && (
          <SDIDReviewQueue repositoryId={repositoryId} />
        )}
        {selectedSdid && (
          <div className="p-4 bg-gray-50 h-full overflow-y-auto">
            <button 
              onClick={() => setSelectedSdid(null)}
              className="mb-4 text-blue-600 hover:underline font-medium text-sm flex items-center"
            >
              ← Back to Explorer
            </button>
            <SDIDDetail repositoryId={repositoryId} sdid={selectedSdid} />
          </div>
        )}
      </div>
    </div>
  );
}
