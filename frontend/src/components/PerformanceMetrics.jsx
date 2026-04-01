/*
 * CheckmateAI - Performance Metrics Component
 * Shows AI search statistics (DSA concepts in action)
 */

import './PerformanceMetrics.css';

export default function PerformanceMetrics({ metrics }) {
    if (!metrics) return null;

    const items = [
        {
            label: 'Nodes Explored',
            value: metrics.nodesExplored?.toLocaleString() || '0',
            icon: '🌳',
        },
        {
            label: 'Search Depth',
            value: metrics.depthReached || '0',
            icon: '📊',
        },
        {
            label: 'Time',
            value: `${(metrics.timeMs || 0).toFixed(0)}ms`,
            icon: '⚡',
        },
        {
            label: 'TT Hits',
            value: metrics.ttHits?.toLocaleString() || '0',
            icon: '💾',
        },
        {
            label: 'Cutoffs',
            value: metrics.cutoffs?.toLocaleString() || '0',
            icon: '✂️',
        },
    ];

    return (
        <div className="performance-metrics glass">
            <div className="metrics-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                <span>AI Performance</span>
            </div>
            <div className="metrics-grid">
                {items.map((item, idx) => (
                    <div key={idx} className="metric-item">
                        <div className="metric-icon">{item.icon}</div>
                        <div className="metric-info">
                            <div className="metric-value">{item.value}</div>
                            <div className="metric-label">{item.label}</div>
                        </div>
                    </div>
                ))}
            </div>
            {metrics.pv && (
                <div className="principal-variation">
                    <span className="pv-label">Best Line:</span>
                    <span className="pv-moves">{metrics.pv}</span>
                </div>
            )}
        </div>
    );
}
