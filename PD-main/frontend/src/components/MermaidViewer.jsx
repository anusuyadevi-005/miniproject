import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  themeVariables: {
    darkMode: true,
    background: '#0B0F19',
    primaryColor: '#1E293B',
    primaryTextColor: '#F8FAFC',
    primaryBorderColor: '#38BDF8',
    lineColor: '#64748B',
    secondaryColor: '#1E293B',
    tertiaryColor: '#0F172A'
  }
});

export default function MermaidViewer({ chart, id = 'mermaid-chart' }) {
  const containerRef = useRef(null);
  const [svgContent, setSvgContent] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (!chart || !chart.trim()) {
      setSvgContent('');
      return;
    }

    const renderChart = async () => {
      try {
        setError(null);
        const uniqueId = `mermaid_${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(uniqueId, chart.trim());
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err) {
        console.warn('Mermaid rendering error:', err);
        if (isMounted) {
          setError(err.message || 'Syntax error in Mermaid specification');
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (error) {
    return (
      <div className="p-4 bg-red-950/30 border border-red-800/50 rounded-xl text-xs text-red-300 font-mono overflow-auto">
        <p className="font-semibold text-red-400 mb-2">Mermaid Rendering Warning:</p>
        <pre className="whitespace-pre-wrap">{chart}</pre>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto bg-[#080C14] border border-gray-800/80 rounded-xl p-4 flex items-center justify-center min-h-[300px]">
      {svgContent ? (
        <div
          ref={containerRef}
          className="w-full flex justify-center [&>svg]:max-w-full [&>svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      ) : (
        <div className="flex items-center space-x-2 text-gray-500 text-xs animate-pulse">
          <div className="w-3 h-3 rounded-full bg-cyan-500/50"></div>
          <span>Rendering Architecture Diagram...</span>
        </div>
      )}
    </div>
  );
}
