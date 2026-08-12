'use client';

import React, { useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

interface GraphViewProps {
  data: {
    nodes: any[];
    links: any[];
  };
  onNodeClick?: (node: any) => void;
}

export default function GraphView({ data, onNodeClick }: GraphViewProps) {
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight
      });
    }

    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getNodeColor = (node: any) => {
    if (node.labels?.includes('Person')) {
      return node.properties?.isFlagged ? '#ef4444' : '#3b82f6'; // red if flagged, blue otherwise
    }
    if (node.labels?.includes('Account')) return '#10b981'; // green
    if (node.labels?.includes('Device')) return '#f59e0b'; // amber
    if (node.labels?.includes('IP')) return '#8b5cf6'; // purple
    return '#9ca3af'; // gray
  };

  const getLinkColor = (link: any) => {
    if (link.properties?.isFraudRing) return '#ef4444'; // red for injected fraud ring
    return '#cbd5e1';
  };

  return (
    <div ref={containerRef} className="w-full h-full min-h-[500px] bg-slate-50 border rounded-xl overflow-hidden relative">
      {data.nodes.length === 0 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
          <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-lg font-medium">No results found</p>
          <p className="text-sm">Try a different query or adjust your search.</p>
        </div>
      ) : (
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
        graphData={data}
        nodeLabel={(node: any) => {
          let label = `<b>${node.labels?.[0]}</b><br/>`;
          if (node.properties?.name) label += `Name: ${node.properties.name}<br/>`;
          if (node.properties?.riskScore) label += `Risk: ${node.properties.riskScore}<br/>`;
          if (node.properties?.accountType) label += `Type: ${node.properties.accountType}<br/>`;
          if (node.properties?.balance) label += `Balance: $${node.properties.balance.toFixed(2)}<br/>`;
          if (node.properties?.ip) label += `IP: ${node.properties.ip}<br/>`;
          if (node.properties?.type) label += `Device: ${node.properties.type}<br/>`;
          return label;
        }}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          // Draw the circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI, false);
          ctx.fillStyle = getNodeColor(node);
          ctx.fill();
          
          // Draw the text label
          const label = node.properties?.name || node.properties?.type || node.labels?.[0] || '';
          const fontSize = 10 / globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = '#334155';
          ctx.fillText(label, node.x, node.y + 8);
        }}
        nodeRelSize={6}
        linkLabel={(link: any) => link.type}
        linkColor={getLinkColor}
        linkWidth={(link: any) => link.properties?.isFraudRing ? 3 : 1}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        onNodeClick={onNodeClick}
        cooldownTicks={100}
        onEngineStop={() => fgRef.current?.zoomToFit(400)}
      />
      )}
    </div>
  );
}
