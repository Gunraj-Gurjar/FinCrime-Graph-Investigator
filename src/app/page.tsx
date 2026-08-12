'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Activity, Users, ShieldAlert, Database, Info, Loader2 } from 'lucide-react';

const GraphView = dynamic(() => import('@/components/GraphView'), { ssr: false, loading: () => <div className="w-full h-full flex items-center justify-center min-h-[500px] bg-slate-50"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div> });

export default function Home() {
  const [data, setData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [queryType, setQueryType] = useState('overview');
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [highValue, setHighValue] = useState(false);

  useEffect(() => {
    if (queryType !== 'search') {
      fetchGraphData(queryType, undefined, undefined, highValue);
    }
  }, [queryType, highValue]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setQueryType('search');
      fetchGraphData('search', undefined, searchQuery.trim(), highValue);
    }
  };

  const fetchGraphData = async (type: string, personId?: string, query?: string, isHighValue?: boolean) => {
    setLoading(true);
    setError('');
    setSelectedNode(null);
    try {
      let url = `/api/graph?type=${type}`;
      if (personId) url += `&personId=${personId}`;
      if (query) url += `&query=${encodeURIComponent(query)}`;
      if (isHighValue) url += `&highValue=true`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error((json.error || 'Failed to fetch') + (json.details ? ': ' + json.details : ''));
      setData(json);
    } catch (err: any) {
      setError(err.message);
      setData({ nodes: [], links: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = (node: any) => {
    setSelectedNode(node);
  };

  return (
    <div className="flex h-screen w-full bg-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r shadow-sm flex flex-col z-10">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <ShieldAlert size={24} />
            <h1 className="text-xl font-bold text-slate-800">FinCrime Graph</h1>
          </div>
          <p className="text-sm text-slate-500">Fraud Ring Investigator</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Entity Search</p>
          <form onSubmit={handleSearch} className="mb-6 px-2 flex gap-2">
            <input
              type="text"
              placeholder="Search person by name..."
              className="flex-1 text-sm text-slate-800 border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="bg-blue-600 text-white rounded-lg px-3 py-2 hover:bg-blue-700 transition-colors">
              <ShieldAlert size={16} /> {/* Reusing icon for brevity, ideally a Search icon */}
            </button>
          </form>

          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">Investigation Views</p>
          
          <button
            onClick={() => setQueryType('overview')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${queryType === 'overview' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Database size={18} />
            Network Overview
          </button>
          
          <button
            onClick={() => setQueryType('fraudRing')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${queryType === 'fraudRing' ? 'bg-red-50 text-red-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Activity size={18} />
            Circular Money Mule Rings
          </button>
          
          <button
            onClick={() => setQueryType('sharedDeviceRisk')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${queryType === 'sharedDeviceRisk' ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Users size={18} />
            Shared Device Risk
          </button>

          <div className="pt-4 mt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">Graph Filters</p>
            <label className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 cursor-pointer">
              <input 
                type="checkbox" 
                checked={highValue} 
                onChange={(e) => setHighValue(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              High Value Only ({'>'}$1000)
            </label>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">Real-Time Engine</p>
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  await fetch('/api/simulate', { method: 'POST' });
                  setQueryType('fraudRing'); // Auto-switch to see the result
                  fetchGraphData('fraudRing');
                } catch (e) {
                  console.error(e);
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors"
            >
              <Activity size={16} />
              Simulate Live Transaction
            </button>
          </div>
        </nav>

        <div className="p-4 border-t bg-slate-50 text-xs text-slate-500">
          <p>Backed by <b>CognoDB</b></p>
          <p>Powered by openCypher</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        <header className="h-16 border-b bg-white flex items-center px-6 shadow-sm z-10 justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            {queryType === 'overview' && 'Network Overview (Sample)'}
            {queryType === 'fraudRing' && 'Detected Circular Transfers (A -> B -> C -> A)'}
            {queryType === 'sharedDeviceRisk' && 'Unflagged Users Sharing Devices with Fraudsters'}
          </h2>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>Nodes: {data.nodes.length}</span>
            <span>Relationships: {data.links.length}</span>
          </div>
        </header>

        <div className="flex-1 relative p-4">
          {error && (
            <div className="absolute inset-4 z-20 bg-red-50/90 border border-red-200 text-red-700 p-4 rounded-xl flex items-center justify-center">
              <p className="font-medium text-lg">Error: {error}</p>
            </div>
          )}
          
          <div className="w-full h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
            {!error && <GraphView data={data} onNodeClick={handleNodeClick} />}
            
            {/* Legend overlay */}
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur border border-slate-200 p-3 rounded-lg shadow-sm text-xs space-y-2 pointer-events-none text-slate-600">
              <div className="font-semibold text-slate-800 mb-1">Entity Legend</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div>Person (Clean)</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div>Person (Flagged)</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div>Account</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div>Device</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div>IP Address</div>
              <div className="w-full h-px bg-slate-200 my-1"></div>
              <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-red-500"></div>Fraud Ring Path</div>
            </div>
          </div>
        </div>
      </main>

      {/* Right Sidebar (Details) */}
      {selectedNode && (
        <aside className="w-80 bg-white border-l shadow-xl flex flex-col z-20 absolute right-0 top-0 bottom-0 transform transition-transform">
          <div className="p-5 border-b flex justify-between items-center bg-slate-50">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Info size={18} className="text-blue-500" />
              Node Details
            </h3>
            <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-slate-700">
              &times;
            </button>
          </div>
          
          <div className="p-5 flex-1 overflow-y-auto">
            <div className="mb-6">
              <span className="inline-block px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mb-3 uppercase tracking-wide">
                {selectedNode.labels?.[0]}
              </span>
              <h2 className="text-xl font-bold text-slate-900 break-words">
                {selectedNode.properties?.name || selectedNode.properties?.id || selectedNode.properties?.ip}
              </h2>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Properties</h4>
              <div className="bg-slate-50 p-4 rounded-lg border space-y-3">
                {Object.entries(selectedNode.properties || {}).map(([key, value]: [string, any]) => {
                  if (key === 'name') return null; // Already shown
                  return (
                    <div key={key} className="break-words">
                      <div className="text-xs text-slate-500 font-medium capitalize">{key}</div>
                      <div className="text-sm text-slate-800 mt-0.5">
                        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedNode.labels?.includes('Person') && (
                <div className="pt-4">
                  <button 
                    onClick={() => fetchGraphData('personNetwork', selectedNode.id)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    Load 2-Hop Network
                  </button>
                  <p className="text-xs text-slate-500 text-center mt-2">
                    Visualizes all connected accounts, devices, and IPs within 2 hops.
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
