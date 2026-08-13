'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Activity, Users, ShieldAlert, Database, Info, Loader2 } from 'lucide-react';

const GraphView = dynamic(() => import('@/components/GraphView'), { ssr: false, loading: () => <div className="w-full h-full flex items-center justify-center min-h-[500px] bg-slate-900"><Loader2 className="animate-spin text-cyan-500 w-8 h-8" /></div> });

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
    <div className="flex h-screen w-full bg-slate-900 overflow-hidden text-slate-200">
      <aside className="w-72 bg-slate-800 border-r border-slate-700 shadow-lg flex flex-col z-10">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-2 text-cyan-400 mb-1">
            <ShieldAlert size={24} />
            <h1 className="text-xl font-bold text-white">FinCrime Graph</h1>
          </div>
          <p className="text-sm text-slate-400">Fraud Ring Investigator</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">Entity Search</p>
          <form onSubmit={handleSearch} className="mb-6 px-2 flex gap-2">
            <input
              type="text"
              placeholder="Search person..."
              className="flex-1 text-sm text-white border border-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-cyan-500 bg-slate-900 placeholder:text-slate-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="bg-cyan-600 text-white rounded-lg px-3 py-2 hover:bg-cyan-500 transition-colors">
              <ShieldAlert size={16} />
            </button>
          </form>

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">Investigation Views</p>
          
          <button
            onClick={() => setQueryType('overview')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${queryType === 'overview' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-300 hover:bg-slate-700'}`}
          >
            <Database size={18} />
            Network Overview
          </button>
          
          <button
            onClick={() => setQueryType('fraudRing')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${queryType === 'fraudRing' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-300 hover:bg-slate-700'}`}
          >
            <Activity size={18} />
            Circular Money Mule Rings
          </button>
          
          <button
            onClick={() => setQueryType('sharedDeviceRisk')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${queryType === 'sharedDeviceRisk' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-300 hover:bg-slate-700'}`}
          >
            <Users size={18} />
            Shared Device Risk
          </button>

          <div className="pt-4 mt-2 border-t border-slate-700">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Graph Filters</p>
            <label className="flex items-center gap-3 px-3 py-2 text-sm text-slate-300 cursor-pointer hover:bg-slate-700 rounded-lg transition-colors">
              <input 
                type="checkbox" 
                checked={highValue} 
                onChange={(e) => setHighValue(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 bg-slate-900 border-slate-600"
              />
              High Value Only ({'>'}$1000)
            </label>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-700">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Real-Time Engine</p>
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  await fetch('/api/simulate', { method: 'POST' });
                  setQueryType('fraudRing');
                  fetchGraphData('fraudRing');
                } catch (e) {
                  console.error(e);
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-sm font-medium transition-colors"
            >
              <Activity size={16} />
              Simulate Live Transaction
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-700 bg-slate-800 text-xs text-slate-500">
          <p>Backed by <b className="text-slate-400">CognoDB</b></p>
          <p>Powered by openCypher</p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative bg-slate-900">
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center px-6 shadow-sm z-10 justify-between">
          <h2 className="text-lg font-semibold text-white">
            {queryType === 'overview' && 'Network Overview'}
            {queryType === 'fraudRing' && 'Detected Circular Transfers'}
            {queryType === 'sharedDeviceRisk' && 'Unflagged Users Sharing Devices'}
          </h2>
          <div className="flex items-center gap-4 text-sm text-slate-400 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
            <span>Nodes: <strong className="text-cyan-400 font-medium">{data.nodes.length}</strong></span>
            <span className="w-px h-4 bg-slate-700"></span>
            <span>Rels: <strong className="text-cyan-400 font-medium">{data.links.length}</strong></span>
          </div>
        </header>

        <div className="flex-1 relative p-4">
          {error && (
            <div className="absolute inset-4 z-20 bg-red-900/90 border border-red-500 text-red-200 p-4 rounded-xl flex items-center justify-center backdrop-blur">
              <p className="font-medium text-lg">Error: {error}</p>
            </div>
          )}
          
          <div className="w-full h-full bg-[#0f172a] rounded-xl shadow-lg border border-slate-700 overflow-hidden relative">
            {!error && <GraphView data={data} onNodeClick={handleNodeClick} />}
            
            <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur border border-slate-700 p-3 rounded-lg shadow-xl text-xs space-y-2 pointer-events-none text-slate-300">
              <div className="font-semibold text-white mb-1 uppercase tracking-wider text-[10px]">Entity Legend</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div>Person (Clean)</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div>Person (Flagged)</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div>Account</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div>Device</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div>IP Address</div>
              <div className="w-full h-px bg-slate-700 my-1"></div>
              <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-red-500"></div>Fraud Ring Path</div>
            </div>
          </div>
        </div>
      </main>

      {selectedNode && (
        <aside className="w-80 bg-slate-800 border-l border-slate-700 shadow-2xl flex flex-col z-20 absolute right-0 top-0 bottom-0">
          <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-900">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Info size={18} className="text-cyan-400" />
              Node Details
            </h3>
            <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-white transition-colors">
              &times;
            </button>
          </div>
          
          <div className="p-5 flex-1 overflow-y-auto">
            <div className="mb-6">
              <span className="inline-block px-2.5 py-1 bg-cyan-900/50 text-cyan-400 border border-cyan-800 text-xs font-bold rounded-full mb-3 uppercase tracking-wide">
                {selectedNode.labels?.[0]}
              </span>
              <h2 className="text-xl font-bold text-white break-words">
                {selectedNode.properties?.name || selectedNode.properties?.id || selectedNode.properties?.ip}
              </h2>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Properties</h4>
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 space-y-3 shadow-inner">
                {Object.entries(selectedNode.properties || {}).map(([key, value]: [string, any]) => {
                  if (key === 'name') return null;
                  return (
                    <div key={key} className="break-words">
                      <div className="text-xs text-slate-400 font-medium capitalize">{key}</div>
                      <div className="text-sm text-slate-200 mt-0.5">
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
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm shadow-lg shadow-cyan-900/20"
                  >
                    Load 2-Hop Network
                  </button>
                  <p className="text-xs text-slate-500 text-center mt-3">
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
