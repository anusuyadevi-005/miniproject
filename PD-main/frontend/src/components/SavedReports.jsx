import React, { useState, useEffect } from 'react';
import { Database, FileText, Download, ExternalLink, RefreshCw, Layers, Calendar, CheckCircle, Search, Eye, X, Server } from 'lucide-react';

export default function SavedReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      setReports(data || []);
    } catch (err) {
      console.error('Failed to fetch saved reports from MongoDB Atlas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = (reportId, repoUrl) => {
    const query = repoUrl ? `?url=${encodeURIComponent(repoUrl)}` : '';
    window.open(`/api/reports/${reportId || 'latest'}/pdf${query}`, '_blank');
  };

  const filteredReports = reports.filter(r =>
    (r.projectName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.repoUrl || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
            <Database className="w-7 h-7 text-emerald-400" />
            <span>MongoDB Atlas Reports Repository</span>
          </h2>
          <p className="text-gray-400 mt-1 text-sm">
            All repository technical reports, database structures, and generated PDFs stored in the MongoDB Atlas database (<code className="text-emerald-300 font-mono">asdse_db</code>).
          </p>
        </div>

        <button
          onClick={fetchReports}
          className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 font-semibold text-xs transition flex items-center space-x-2 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh DB Reports</span>
        </button>
      </div>

      {/* Search Filter Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-500 absolute left-4 top-3.5" />
        <input
          type="text"
          placeholder="Search saved reports by project name or repository URL..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-gray-900/80 border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition text-sm"
        />
      </div>

      {/* Reports Grid */}
      {loading ? (
        <div className="glass-card p-12 text-center text-gray-400 rounded-2xl border border-gray-800 space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium">Fetching saved reports from MongoDB Atlas...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="glass-card p-12 text-center text-gray-400 rounded-2xl border border-gray-800 space-y-3">
          <Database className="w-10 h-10 text-gray-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Saved Reports Found in Database</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Analyze a repository link in the **Repo Report Generator** tab to automatically generate and save reports in MongoDB Atlas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredReports.map((report) => {
            const reportId = report._id || report.reportId;
            const dbCollectionsCount = report.databaseStructure?.tablesOrCollections?.length || 0;
            const apiCount = report.apiEndpoints?.length || 0;

            return (
              <div key={reportId} className="glass-card p-6 rounded-2xl border border-gray-800 hover:border-gray-700 transition flex flex-col justify-between space-y-5">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-white hover:text-emerald-400 transition flex items-center space-x-2">
                        <span>{report.projectName || 'Repository Report'}</span>
                      </h3>
                      <a
                        href={report.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-cyan-400 hover:underline flex items-center space-x-1 mt-1 font-mono break-all"
                      >
                        <span>{report.repoUrl}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-mono shrink-0">
                      MongoDB Atlas
                    </span>
                  </div>

                  {/* Badges / Metrics */}
                  <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                    <div className="p-2 rounded-xl bg-gray-900/90 border border-gray-800">
                      <span className="text-[10px] text-gray-400 block uppercase">DB Engine</span>
                      <span className="text-xs font-bold text-emerald-400 truncate block">
                        {report.databaseStructure?.engine?.split(' ')[0] || 'MongoDB'}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-gray-900/90 border border-gray-800">
                      <span className="text-[10px] text-gray-400 block uppercase">Collections</span>
                      <span className="text-xs font-bold text-cyan-400 block">
                        {dbCollectionsCount} Tables
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-gray-900/90 border border-gray-800">
                      <span className="text-[10px] text-gray-400 block uppercase">API Routes</span>
                      <span className="text-xs font-bold text-indigo-400 block">
                        {apiCount} Endpoints
                      </span>
                    </div>
                  </div>

                  {/* Tech Stack Preview */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {report.techStack?.backend?.slice(0, 3).map((item, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                        {item}
                      </span>
                    ))}
                    {report.techStack?.database?.slice(0, 1).map((item, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer Timestamp & Actions */}
                <div className="pt-4 border-t border-gray-800/80 flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-1.5 text-[11px] text-gray-400 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-gray-500" />
                    <span>{new Date(report.createdAt || Date.now()).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold transition flex items-center space-x-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>

                    <button
                      onClick={() => handleDownloadPDF(reportId, report.repoUrl)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal View for Detailed Report Inspection */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B0F19] border border-gray-800 w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  <span>{selectedReport.projectName} - Full Database & Tech Report</span>
                </h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{selectedReport.repoUrl}</p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleDownloadPDF(selectedReport._id || selectedReport.reportId, selectedReport.repoUrl)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center space-x-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Database Structure */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-2">
                  <Database className="w-4 h-4" />
                  <span>Database Collections & Schemas (MongoDB Atlas)</span>
                </h4>

                <div className="space-y-4">
                  {(selectedReport.databaseStructure?.tablesOrCollections || []).map((coll, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-gray-900 border border-gray-800 space-y-2">
                      <h5 className="font-bold text-emerald-300 font-mono text-xs">Collection: {coll.name}</h5>
                      <p className="text-gray-400 text-[11px]">{coll.description}</p>

                      <div className="overflow-x-auto pt-1">
                        <table className="w-full text-left font-mono">
                          <thead>
                            <tr className="border-b border-gray-800 text-gray-400 text-[10px]">
                              <th className="py-1 px-2">Field</th>
                              <th className="py-1 px-2">Type</th>
                              <th className="py-1 px-2">Required</th>
                              <th className="py-1 px-2">Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800/60 text-gray-300 text-[11px]">
                            {coll.fields?.map((f, i) => (
                              <tr key={i}>
                                <td className="py-1 px-2 text-cyan-300 font-bold">{f.name}</td>
                                <td className="py-1 px-2 text-indigo-300">{f.type}</td>
                                <td className="py-1 px-2">{f.required ? 'Yes' : 'No'}</td>
                                <td className="py-1 px-2 text-gray-400">{f.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* API Specifications */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center space-x-2">
                  <Server className="w-4 h-4" />
                  <span>API Route Contracts</span>
                </h4>

                <div className="space-y-2">
                  {(selectedReport.apiEndpoints || []).map((ep, i) => (
                    <div key={i} className="p-3 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-between font-mono">
                      <div className="space-x-2">
                        <span className="font-bold text-cyan-400">[{ep.method}]</span>
                        <span className="text-white">{ep.path}</span>
                      </div>
                      <span className="text-gray-400 text-[11px]">{ep.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
