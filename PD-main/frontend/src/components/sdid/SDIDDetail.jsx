import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
export default function SDIDDetail({ repositoryId, sdid }) {
  const [entity, setEntity] = useState(null);
  const [history, setHistory] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/api/repository/${repositoryId}/sdid/${sdid}`),
      api.get(`/api/repository/${repositoryId}/sdid/${sdid}/history`),
      api.get(`/api/repository/${repositoryId}/sdid/${sdid}/relationships`)
    ])
    .then(([entityRes, historyRes, relRes]) => {
      setEntity(entityRes.data);
      setHistory(historyRes.data);
      setRelationships(relRes.data);
    })
    .catch(err => console.error(err))
    .finally(() => setLoading(false));
  }, [repositoryId, sdid]);

  if (loading) return <div>Loading...</div>;
  if (!entity) return <div>Entity not found.</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {entity.currentName} <span className="text-blue-600 text-xl font-mono">({entity.sdid})</span>
        </h2>
        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div><span className="font-semibold text-gray-600">Type:</span> {entity.entityType}</div>
          <div><span className="font-semibold text-gray-600">Status:</span> {entity.status}</div>
          <div><span className="font-semibold text-gray-600">Path:</span> {entity.currentPath}</div>
          <div><span className="font-semibold text-gray-600">Parent ID:</span> {entity.parentId || 'None'}</div>
          <div><span className="font-semibold text-gray-600">Confidence:</span> {entity.confidence}%</div>
          <div><span className="font-semibold text-gray-600">Last Seen:</span> {entity.lastSeenCommit}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-xl font-semibold mb-4 border-b pb-2">Semantic History</h3>
          {history.length > 0 ? (
            <ul className="space-y-4">
              {history.map((h, i) => (
                <li key={i} className="border-l-4 border-blue-500 pl-4 py-1">
                  <div className="text-sm font-semibold">{h.status} <span className="text-gray-500 font-normal">at commit {h.commitHash}</span></div>
                  <div className="text-xs text-gray-600 mt-1">
                    {h.status === 'RENAMED' && `Renamed from ${h.previousName} to ${h.currentName}`}
                    {h.status === 'MOVED' && `Moved from ${h.previousPath} to ${h.currentPath}`}
                    {h.status === 'MODIFIED' && `Entity structure modified`}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">No history available.</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-xl font-semibold mb-4 border-b pb-2">Relationships & Documentation</h3>
          {relationships.length > 0 ? (
            <ul className="space-y-2">
              {relationships.map((r, i) => (
                <li key={i} className="text-sm">
                  <span className="font-medium text-gray-700">{r.relationshipType}</span>: 
                  <a href={`/repository/${repositoryId}/sdid/${r.targetSdid === sdid ? r.sourceSdid : r.targetSdid}`} className="ml-2 text-blue-600 hover:underline">
                    {r.targetSdid === sdid ? r.sourceSdid : r.targetSdid}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">No mapped relationships.</p>
          )}
        </div>
      </div>
    </div>
  );
}
