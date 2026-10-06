import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export default function SDIDReviewQueue({ repositoryId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!repositoryId) return;
    
    api.get(`/api/repository/${repositoryId}/sdid`)
      .then(res => {
        const queue = res.data.filter(e => e.status === 'REVIEW_REQUIRED');
        setReviews(queue);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [repositoryId]);

  const handleAction = (sdid, action) => {
    // In a full implementation, this would call an API endpoint to confirm/reject the match
    console.log(`Action ${action} for ${sdid}`);
    setReviews(reviews.filter(r => r.sdid !== sdid));
  };

  if (loading) return <div>Loading Review Queue...</div>;
  if (!reviews.length) return <div className="p-4 bg-green-50 text-green-700 rounded-lg">No semantic identities require manual review.</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">SDID Review Queue</h2>
      <p className="text-sm text-gray-500 mb-6">These entities matched with low confidence and require manual confirmation.</p>
      
      <div className="space-y-6">
        {reviews.map(entity => (
          <div key={entity.sdid} className="border border-orange-200 bg-orange-50 p-4 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-gray-900">{entity.currentName}</h3>
                <div className="text-sm text-gray-600 mt-1">
                  <span className="font-semibold">Type:</span> {entity.entityType} | <span className="font-semibold">Path:</span> {entity.currentPath}
                </div>
                <div className="text-sm text-red-600 mt-2 font-medium">Confidence: {entity.confidence}%</div>
              </div>
              <div className="space-x-2">
                <button 
                  onClick={() => handleAction(entity.sdid, 'ACCEPT')}
                  className="px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 text-sm font-medium transition-colors"
                >
                  Accept Match
                </button>
                <button 
                  onClick={() => handleAction(entity.sdid, 'REJECT')}
                  className="px-4 py-2 bg-red-600 text-white rounded shadow hover:bg-red-700 text-sm font-medium transition-colors"
                >
                  Reject & Create New
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
