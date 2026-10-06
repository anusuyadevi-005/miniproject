import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export default function SDIDExplorer({ repositoryId, onSelect }) {
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!repositoryId) return;
    
    api.get(`/api/repository/${repositoryId}/sdid`)
      .then(res => {
        setEntities(res.data);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [repositoryId]);

  if (loading) return <div>Loading Semantic Identities...</div>;
  if (!entities.length) return <div>No Semantic Identities found for this repository.</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Semantic Identity (SDID) Explorer</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SDID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Path</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entities.map(entity => (
              <tr key={entity.sdid} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 cursor-pointer hover:underline" onClick={() => onSelect && onSelect(entity.sdid)}>
                  {entity.sdid}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entity.entityType}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{entity.currentName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs" title={entity.currentPath}>{entity.currentPath}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${entity.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                      entity.status === 'MODIFIED' ? 'bg-yellow-100 text-yellow-800' :
                      entity.status === 'RENAMED' ? 'bg-purple-100 text-purple-800' :
                      entity.status === 'MOVED' ? 'bg-blue-100 text-blue-800' :
                      entity.status === 'DELETED' ? 'bg-red-100 text-red-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                    {entity.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                      <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${entity.confidence}%` }}></div>
                    </div>
                    <span>{entity.confidence}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
