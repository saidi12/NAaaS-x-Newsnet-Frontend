import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as d3 from 'd3';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import PAK_adm3 from '../assets/merge.json';
import Logo from '../layout/Logo';

// ── Constants ─────────────────────────────────────────────────────────────────

const ENTITY_COLORS = {
    PERSON:   '#3b82f6',
    PER:      '#3b82f6',
    ORG:      '#f97316',
    LOCATION: '#22c55e',
    LOC:      '#22c55e',
    GPE:      '#22c55e',
    EVENT:    '#a855f7',
    DATE:     '#ec4899',
    DEFAULT:  '#6b7280',
};

const colorFor = (type) => ENTITY_COLORS[type?.toUpperCase()] || ENTITY_COLORS.DEFAULT;

const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

const capEntity = (str) =>
    str ? str.split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1) : '').join(' ') : '';

const fmt = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtShort = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
};

const TAG_COLORS = [
    'bg-emerald-100 text-emerald-700',
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-orange-100 text-orange-700',
    'bg-rose-100 text-rose-700',
];
const tagColor = (topic) => {
    let hash = 0;
    for (let i = 0; i < (topic || '').length; i++) hash = topic.charCodeAt(i) + ((hash << 5) - hash);
    return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
};

const TABS = ['overview', 'knowledge-graph', 'causal-chain', 'geographic-map'];
const TAB_LABELS = {
    'overview':         'Overview',
    'knowledge-graph':  'Knowledge Graph',
    'causal-chain':     'Causal Chain',
    'geographic-map':   'Geographic Map',
};

// ── D3 Entity Graph ───────────────────────────────────────────────────────────

const PILL_H = 26;
const PILL_PAD_X = 14;

function pillEdgePoint(cx, cy, tx, ty, hw, hh) {
    const dx = tx - cx, dy = ty - cy;
    if (!dx && !dy) return [tx, ty];
    const t = Math.min(
        Math.abs(dx) > 0 ? hw / Math.abs(dx) : Infinity,
        Math.abs(dy) > 0 ? hh / Math.abs(dy) : Infinity
    );
    return [cx + dx * t, cy + dy * t];
}

function EntityGraph({ graphData, onNodeClick }) {
    const svgRef = useRef(null);

    useEffect(() => {
        if (!graphData || !svgRef.current) return;
        const { nodes, edges } = graphData;
        if (!nodes.length) return;

        const el = svgRef.current;
        d3.select(el).selectAll('*').remove();

        const width  = el.parentElement?.clientWidth  || 800;
        const height = el.parentElement?.clientHeight || 600;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = 'bold 11px sans-serif';
        nodes.forEach(n => { n._pw = ctx.measureText(n.label).width + PILL_PAD_X * 2; n._ph = PILL_H; });

        const svg = d3.select(el).attr('width', width).attr('height', height);
        const g = svg.append('g');

        // Store zoom so we can programmatically fit the graph after simulation ends
        const zoom = d3.zoom().scaleExtent([0.15, 4]).on('zoom', e => g.attr('transform', e.transform));
        svg.call(zoom);

        const nodeIds = new Set(nodes.map(n => n.id));
        const validEdges = edges.filter(e => {
            const src = typeof e.source === 'object' ? e.source.id : e.source;
            const tgt = typeof e.target === 'object' ? e.target.id : e.target;
            return nodeIds.has(src) && nodeIds.has(tgt);
        });

        g.append('defs').append('marker')
            .attr('id', 'nexus-arrow').attr('viewBox', '0 -4 8 8')
            .attr('refX', 8).attr('refY', 0)
            .attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto')
            .append('path').attr('d', 'M0,-4L8,0L0,4').attr('fill', '#374151');

        const simulation = d3.forceSimulation(nodes)
            .force('link',    d3.forceLink(validEdges).id(d => d.id).distance(35))
            .force('charge',  d3.forceManyBody().strength(-80))
            .force('collide', d3.forceCollide().radius(d => d._pw / 2 + 3))
            .force('center',  d3.forceCenter(width / 2, height / 2))
            // Pull every node individually toward centre — keeps disconnected
            // subgraphs from drifting to opposite corners of the canvas
            .force('x',       d3.forceX(width  / 2).strength(0.15))
            .force('y',       d3.forceY(height / 2).strength(0.15))
            .alphaDecay(0.07);

        const link = g.append('g').selectAll('line').data(validEdges).enter().append('line')
            .attr('stroke', '#d1d5db').attr('stroke-width', 1).attr('marker-end', 'url(#nexus-arrow)');

        const linkLabel = g.append('g').selectAll('text').data(validEdges).enter().append('text')
            .attr('font-size', 8).attr('fill', '#9ca3af').attr('text-anchor', 'middle')
            .text(d => (d.label || '').slice(0, 14));

        const node = g.append('g').selectAll('g').data(nodes).enter().append('g')
            .style('cursor', 'pointer')
            .call(d3.drag()
                .on('start', (ev, d) => { if (!ev.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
                .on('drag',  (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
                .on('end',   (ev, d) => { if (!ev.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
            )
            .on('click', (ev, d) => { ev.stopPropagation(); onNodeClick && onNodeClick(d.id, d.category); });

        node.append('rect')
            .attr('x', d => -d._pw / 2).attr('y', -PILL_H / 2)
            .attr('width', d => d._pw).attr('height', PILL_H)
            .attr('rx', PILL_H / 2).attr('ry', PILL_H / 2)
            .attr('fill', d => colorFor(d.category))
            .attr('stroke', '#fff').attr('stroke-width', 1.5);

        node.append('text')
            .attr('dy', '.35em').attr('text-anchor', 'middle')
            .style('font-size', '11px').style('font-weight', 'bold')
            .style('fill', '#fff').style('pointer-events', 'none')
            .text(d => d.label);

        node.append('title').text(d => `${d.label} · ${d.category} · ${d.count || 1} article(s)`);

        simulation.on('tick', () => {
            link.each(function(d) {
                const [x2, y2] = pillEdgePoint(d.target.x, d.target.y, d.source.x, d.source.y, d.target._pw / 2, d.target._ph / 2);
                d3.select(this).attr('x1', d.source.x).attr('y1', d.source.y).attr('x2', x2).attr('y2', y2);
            });
            linkLabel
                .attr('x', d => (d.source.x + d.target.x) / 2)
                .attr('y', d => (d.source.y + d.target.y) / 2 - 5);
            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });

        // Once the simulation settles, auto-fit all nodes into view
        simulation.on('end', () => {
            const xs = nodes.map(d => d.x);
            const ys = nodes.map(d => d.y);
            const x0 = Math.min(...xs), x1 = Math.max(...xs);
            const y0 = Math.min(...ys), y1 = Math.max(...ys);
            const bw = (x1 - x0) || 1;
            const bh = (y1 - y0) || 1;
            const pad = 60;
            const scale = Math.min(
                (width  - pad * 2) / bw,
                (height - pad * 2) / bh,
                1.0   // never zoom in beyond 1× on initial fit
            );
            const tx = width  / 2 - scale * (x0 + x1) / 2;
            const ty = height / 2 - scale * (y0 + y1) / 2;
            svg.transition().duration(500)
                .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
        });

        return () => simulation.stop();
    }, [graphData, onNodeClick]);

    return <svg ref={svgRef} className='w-full h-full' />;
}

// ── Standalone Geographic Map ─────────────────────────────────────────────────

function NexusMap({ articles }) {
    const locationFreq = useMemo(() => {
        const freq = {};
        articles.forEach(article => {
            const loc = article.focus_location || article.focusLocation || article.location;
            if (loc) { const k = loc.toLowerCase().trim(); freq[k] = (freq[k] || 0) + 1; }
            (article.entities || [])
                .filter(e => ['LOCATION', 'LOC', 'GPE'].includes((e.type || e.entity_type || '').toUpperCase()))
                .forEach(e => {
                    const name = (e.canonical_name || e.name || '').toLowerCase().trim();
                    if (name) freq[name] = (freq[name] || 0) + 1;
                });
        });
        return freq;
    }, [articles]);

    const maxFreq = useMemo(() => Math.max(...Object.values(locationFreq), 1), [locationFreq]);

    // Mirror MapComponent's getRegionStyle signature exactly — plain function, no useCallback
    const getRegionStyle = (feature) => {
        const keys = [
            (feature.properties.NAME_3 || '').toLowerCase().trim(),
            (feature.properties.NAME_2 || '').toLowerCase().trim(),
            (feature.properties.NAME_1 || '').toLowerCase().trim(),
        ];
        const freq = keys.reduce((acc, k) => acc || locationFreq[k] || 0, 0);
        const intensity = freq / maxFreq;
        return {
            weight:      2,
            opacity:     1,
            fillOpacity: freq > 0 ? 0.25 + intensity * 0.55 : 0,
            color:       'green',
            fillColor:   freq > 0 ? '#10b981' : 'transparent',
        };
    };

    const onEachFeature = (feature, layer) => {
        const name = feature.properties.NAME_3 || feature.properties.NAME_2 || '';
        const freq = locationFreq[name.toLowerCase().trim()] || 0;
        if (freq > 0) {
            layer.bindTooltip(
                `<strong>${name}</strong><br/>${freq} article${freq !== 1 ? 's' : ''}`,
                { permanent: false, direction: 'auto' }
            );
        }
    };

    // Identical container structure to MapComponent to avoid Leaflet sizing bugs
    return (
        <div>
            <div className='relative z-10'>
                <MapContainer
                    className='w-full rounded-lg pt-8 p-2'
                    style={{ height: '632px' }}
                    center={[30.3753, 69.3451]}
                    zoom={6}
                >
                    <TileLayer url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
                    {PAK_adm3 && (
                        <GeoJSON
                            data={PAK_adm3}
                            style={getRegionStyle}
                            onEachFeature={onEachFeature}
                        />
                    )}
                </MapContainer>
            </div>
        </div>
    );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ value, label, sub }) {
    return (
        <div className='bg-white border border-gray-200 rounded-lg px-4 py-2 flex items-center gap-3'>
            <span className='text-2xl font-bold text-gray-900 tabular-nums'>{value}</span>
            <div className='flex flex-col min-w-0'>
                <span className='text-xs font-medium text-gray-600 leading-tight'>{label}</span>
                {sub && <span className='text-xs text-emerald-600 leading-tight truncate'>{sub}</span>}
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const Nexus = () => {
    const navigate = useNavigate();
    const [query, setQuery]               = useState('');
    const [hasSearched, setHasSearched]   = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [graphData, setGraphData]       = useState(null);
    const [activeTab, setActiveTab]       = useState('overview');

    // Timeline / range / result-count controls
    const [timelineMode, setTimelineMode] = useState('publication');
    const [rangeVal, setRangeVal]         = useState(100); // 0-100 % of date span to show
    const [topK, setTopK]                 = useState(15);

    // Causal chain
    const [storyChain, setStoryChain]     = useState(null);
    const [storyLoading, setStoryLoading] = useState(false);
    const [storySeed, setStorySeed]       = useState(null);

    // Entity drill-down (KG sidebar)
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [entityResult, setEntityResult]     = useState(null);
    const [entityLoading, setEntityLoading]   = useState(false);

    // ── Date info (drives range slider labels + filtering) ─────────────────────
    const dateInfo = useMemo(() => {
        const field = timelineMode === 'publication' ? 'published_date' : 'focus_time';
        const dates = searchResults
            .map(r => new Date(r[field] || r.date || r.published_date))
            .filter(d => !isNaN(d.getTime()))
            .sort((a, b) => a - b);
        if (!dates.length) return { min: null, max: null, from: null, minYear: '—', maxYear: '—', fromYear: '—', field };
        const min = dates[0];
        const max = dates[dates.length - 1];
        // rangeVal=100 → from=min (show all); rangeVal=0 → from=max (show none)
        const from = new Date(max.getTime() - (rangeVal / 100) * (max.getTime() - min.getTime()));
        return { min, max, from, minYear: min.getFullYear(), maxYear: max.getFullYear(), fromYear: from.getFullYear(), field };
    }, [searchResults, timelineMode, rangeVal]);

    // ── Visible results after date-range filter (client-side, no refetch) ──────
    const visibleResults = useMemo(() => {
        if (!dateInfo.from || rangeVal === 100) return searchResults;
        return searchResults.filter(r => {
            const d = new Date(r[dateInfo.field] || r.date || r.published_date);
            return isNaN(d.getTime()) || d >= dateInfo.from;
        });
    }, [searchResults, dateInfo, rangeVal]);

    // ── Derived stats (from visible results) ───────────────────────────────────
    const { allEntities, topArticles, keyEntities, stats } = useMemo(() => {
        const entityMap = {};
        const locationSet = new Set();

        visibleResults.forEach(r => {
            const loc = r.focus_location || r.focusLocation || r.location;
            if (loc) locationSet.add(loc);
            (r.entities || []).forEach(e => {
                if (!e.canonical_name) return;
                if (!entityMap[e.canonical_name]) {
                    entityMap[e.canonical_name] = {
                        name: e.canonical_name,
                        type: e.type || e.entity_type || 'OTHER',
                        count: 0,
                    };
                }
                entityMap[e.canonical_name].count++;
            });
        });

        const allEntities = Object.values(entityMap).sort((a, b) => b.count - a.count);
        const uniqueTypeCount = new Set(allEntities.map(e => e.type)).size;
        const topArticles = [...visibleResults]
            .sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0))
            .slice(0, 5);

        return {
            allEntities,
            topArticles,
            keyEntities: allEntities.slice(0, 6),
            stats: {
                articles:     visibleResults.length,
                entities:     allEntities.length,
                locations:    locationSet.size,
                connections:  graphData?.edges?.length || 0,
                uniqueTypeCount,
            },
        };
    }, [visibleResults, graphData]);

    // ── Graph builder ──────────────────────────────────────────────────────────
    const buildGraph = useCallback((results) => {
        const entityMap = {};
        const edgeSet   = new Set();
        const edges     = [];

        results.forEach(result => {
            (result.entities || []).forEach(e => {
                if (!e.canonical_name) return;
                if (!entityMap[e.canonical_name]) {
                    entityMap[e.canonical_name] = {
                        id:       e.canonical_name,
                        label:    capEntity(e.canonical_name),
                        category: e.type || e.entity_type || 'DEFAULT',
                        count:    0,
                    };
                }
                entityMap[e.canonical_name].count++;
            });

            const ents = (result.entities || []).filter(e => e.canonical_name);
            for (let i = 0; i < ents.length; i++) {
                for (let j = i + 1; j < ents.length; j++) {
                    const key = [ents[i].canonical_name, ents[j].canonical_name].sort().join('||');
                    if (!edgeSet.has(key)) {
                        edgeSet.add(key);
                        edges.push({ source: ents[i].canonical_name, target: ents[j].canonical_name });
                    }
                }
            }
        });

        setGraphData({ nodes: Object.values(entityMap), edges });
    }, []);

    // ── API calls ──────────────────────────────────────────────────────────────
    const handleSearch = async () => {
        if (!query.trim()) return;
        setSearchLoading(true);
        setHasSearched(true);
        setSearchResults([]);
        setGraphData(null);
        setStoryChain(null);
        setStorySeed(null);
        setSelectedEntity(null);
        setEntityResult(null);
        setActiveTab('overview');
        setRangeVal(100); // reset date filter on new search

        try {
            const res = await fetch(`${process.env.REACT_APP_API_URL}/graphrag/search`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ query, top_k: topK }),
            });
            const data = await res.json();
            const results = data.results || [];
            setSearchResults(results);
            buildGraph(results);
        } catch (err) {
            console.error('Nexus search error:', err);
        } finally {
            setSearchLoading(false);
        }
    };

    const fetchStoryChain = useCallback(async (article) => {
        if (!article) return;
        setStorySeed(article);
        setStoryLoading(true);
        setStoryChain(null);
        try {
            const res = await fetch(`${process.env.REACT_APP_API_URL}/graphrag/story_chain`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ seed_article_id: article.article_id, max_articles: 15 }),
            });
            const data = await res.json();
            setStoryChain(data);
        } catch (err) {
            console.error('Story chain error:', err);
        } finally {
            setStoryLoading(false);
        }
    }, []);

    const fetchEntityQuery = useCallback(async (entityName) => {
        setSelectedEntity(entityName);
        setEntityLoading(true);
        setEntityResult(null);
        try {
            const res = await fetch(`${process.env.REACT_APP_API_URL}/graphrag/entity_query`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ entity_name: entityName }),
            });
            const data = await res.json();
            setEntityResult({ name: entityName, ...data });
        } catch (err) {
            console.error('Entity query error:', err);
        } finally {
            setEntityLoading(false);
        }
    }, []);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === 'causal-chain' && !storySeed && searchResults.length > 0) {
            fetchStoryChain(searchResults[0]);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className='h-screen flex flex-col overflow-hidden bg-gray-50'>
            <div className='relative shrink-0'>
                <button
                    onClick={() => navigate(-1)}
                    className='absolute left-4 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg hover:border-gray-400 transition-colors'
                    aria-label='Go back'
                >
                    <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                        <path d='M19 12H5' />
                        <path d='M12 19l-7-7 7-7' />
                    </svg>
                    Back
                </button>
                <Logo className='h-24 flex items-center justify-center' />
            </div>

            <div className='flex-1 flex flex-col overflow-hidden'>

                {/* Search bar */}
                <div className='bg-white border-b border-gray-200 px-6 py-3 shrink-0'>
                    <div className='flex gap-3 items-center'>
                        <div className='flex-1 flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white focus-within:border-gray-500 transition-colors'>
                            <span className='text-gray-300 mr-2 text-sm select-none'>⊙</span>
                            <input
                                type='text'
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                placeholder='"flood relief Sindh", "economic crisis", "PTI protests"…'
                                className='flex-1 text-sm focus:outline-none bg-transparent'
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={searchLoading}
                            className='px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-gray-700 transition-colors shrink-0'
                        >
                            {searchLoading ? 'Searching…' : 'Analyse ↗'}
                        </button>
                    </div>
                </div>

                {/* Filter bar — hidden until first search */}
                {hasSearched && (
                    <div className='bg-white border-b border-gray-200 px-6 py-2 shrink-0 flex items-center gap-6 flex-wrap'>

                        {/* Timeline mode toggle */}
                        <div className='flex items-center gap-2 shrink-0'>
                            <span className='text-xs text-gray-400 whitespace-nowrap'>Timeline mode:</span>
                            <div className='flex rounded-md border border-gray-200 overflow-hidden text-xs font-medium'>
                                <button
                                    onClick={() => { setTimelineMode('publication'); setRangeVal(100); }}
                                    className={`px-2.5 py-1 transition-colors ${timelineMode === 'publication' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                                >
                                    Publication date
                                </button>
                                <button
                                    onClick={() => { setTimelineMode('focus'); setRangeVal(100); }}
                                    className={`px-2.5 py-1 border-l border-gray-200 transition-colors ${timelineMode === 'focus' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                                >
                                    Focus time
                                </button>
                            </div>
                        </div>

                        {/* Date range slider */}
                        <div className='flex items-center gap-2 flex-1 min-w-48'>
                            <span className='text-xs text-gray-400 shrink-0'>Range:</span>
                            <input
                                type='range' min={0} max={100} value={rangeVal}
                                onChange={e => setRangeVal(+e.target.value)}
                                className='flex-1 accent-gray-900 h-1 cursor-pointer'
                            />
                            <span className='text-xs text-gray-500 whitespace-nowrap tabular-nums shrink-0'>
                                {rangeVal === 100
                                    ? `${dateInfo.minYear} – ${dateInfo.maxYear}`
                                    : `${dateInfo.fromYear} – ${dateInfo.maxYear}`}
                            </span>
                        </div>

                        {/* Results / top-k slider */}
                        <div className='flex items-center gap-2 shrink-0'>
                            <span className='text-xs text-gray-400 whitespace-nowrap'>Results:</span>
                            <input
                                type='range' min={10} max={100} step={5} value={topK}
                                onChange={e => setTopK(+e.target.value)}
                                className='w-24 accent-gray-900 h-1 cursor-pointer'
                            />
                            <span className='text-xs text-gray-500 tabular-nums w-5'>{topK}</span>
                            <button
                                onClick={handleSearch}
                                disabled={searchLoading}
                                className='text-xs text-gray-400 hover:text-gray-900 disabled:opacity-40 transition-colors whitespace-nowrap'
                                title='Re-fetch with new result count'
                            >
                                ↻ Fetch
                            </button>
                        </div>

                        {/* Matched count */}
                        <span className='text-xs text-gray-400 shrink-0 ml-auto whitespace-nowrap'>
                            {visibleResults.length}{visibleResults.length < searchResults.length ? ` / ${searchResults.length}` : ''} articles
                        </span>
                    </div>
                )}

                {/* Empty state */}
                {!hasSearched ? (
                    <div className='flex-1 flex flex-col items-center justify-center gap-4 text-center px-8'>
                        <p className='text-6xl text-gray-200 select-none'>⊙</p>
                        <p className='text-2xl font-semibold text-gray-300'>Nexus</p>
                        <p className='text-sm text-gray-400 max-w-sm'>
                            Search a topic, event, or person to surface articles, entity networks, causal chains, and geographic patterns
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Stats row */}
                        {!searchLoading && (
                            <div className='grid grid-cols-4 gap-3 px-6 py-2 shrink-0'>
                                <StatCard
                                    value={stats.articles}
                                    label='Articles'
                                    sub='from semantic search'
                                />
                                <StatCard
                                    value={stats.entities}
                                    label='Entities'
                                    sub={`across ${stats.uniqueTypeCount} type${stats.uniqueTypeCount !== 1 ? 's' : ''}`}
                                />
                                <StatCard
                                    value={stats.locations}
                                    label='Locations'
                                    sub='unique regions'
                                />
                                <StatCard
                                    value={stats.connections}
                                    label='Connections'
                                    sub='entity co-occurrences'
                                />
                            </div>
                        )}

                        {/* Tab nav */}
                        <div className='flex border-b border-gray-200 bg-white px-6 shrink-0'>
                            {TABS.map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => handleTabChange(tab)}
                                    className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                                        activeTab === tab
                                            ? 'border-b-2 border-gray-900 text-gray-900 -mb-px'
                                            : 'text-gray-400 hover:text-gray-700'
                                    }`}
                                >
                                    {TAB_LABELS[tab]}
                                </button>
                            ))}
                        </div>

                        {/* Tab content */}
                        <div className='flex-1 overflow-hidden'>

                            {/* ── Overview ─────────────────────────────────── */}
                            {activeTab === 'overview' && (
                                <div className='h-full overflow-y-auto'>
                                    {searchLoading ? (
                                        <div className='flex items-center justify-center h-40'>
                                            <p className='text-gray-400 text-sm'>Analysing…</p>
                                        </div>
                                    ) : (
                                        <div className='grid grid-cols-2 gap-6 p-6'>

                                            {/* Top Articles */}
                                            <div>
                                                <p className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3'>
                                                    Top Articles
                                                </p>
                                                <div className='flex flex-col gap-3'>
                                                    {topArticles.map(article => {
                                                        const tag   = (article.topics || [])[0] || article.category;
                                                        const score = Math.round((article.similarity_score || 0) * 100);
                                                        return (
                                                            <div
                                                                key={article.article_id}
                                                                className='bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-400 transition-colors'
                                                            >
                                                                <div className='flex items-center gap-2 mb-2 flex-wrap'>
                                                                    {tag && (
                                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tagColor(tag)}`}>
                                                                            {tag}
                                                                        </span>
                                                                    )}
                                                                    {article.source && (
                                                                        <span className='text-xs text-gray-400 capitalize'>{article.source}</span>
                                                                    )}
                                                                    {article.source && (article.published_date || article.date) && (
                                                                        <span className='text-gray-200 text-xs'>·</span>
                                                                    )}
                                                                    {(article.published_date || article.date) && (
                                                                        <span className='text-xs text-gray-400'>
                                                                            {fmtShort(article.published_date || article.date)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className='text-sm font-medium text-gray-900 leading-snug mb-3'>
                                                                    {article.title}
                                                                </p>
                                                                <div className='flex items-center gap-2'>
                                                                    <div className='flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden'>
                                                                        <div
                                                                            className='h-full bg-emerald-500 rounded-full transition-all'
                                                                            style={{ width: `${score}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className='text-xs text-gray-500 shrink-0 tabular-nums'>{score}%</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Key Entities + All Entities */}
                                            <div>
                                                <p className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3'>
                                                    Key Entities
                                                </p>
                                                <div className='grid grid-cols-2 gap-3 mb-6'>
                                                    {keyEntities.map(entity => (
                                                        <button
                                                            key={entity.name}
                                                            onClick={() => { setActiveTab('knowledge-graph'); fetchEntityQuery(entity.name); }}
                                                            className='bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-gray-400 transition-colors group'
                                                        >
                                                            <p className='text-xs text-gray-400 mb-1 flex items-center gap-1.5'>
                                                                <span
                                                                    className='inline-block w-2 h-2 rounded-full shrink-0'
                                                                    style={{ backgroundColor: colorFor(entity.type) }}
                                                                />
                                                                <span className='capitalize'>{entity.type?.toLowerCase()}</span>
                                                            </p>
                                                            <p className='text-sm font-semibold text-gray-900 truncate group-hover:underline'>
                                                                {capEntity(entity.name)}
                                                            </p>
                                                            <p className='text-xs text-gray-400 mt-0.5'>
                                                                {entity.count} mention{entity.count !== 1 ? 's' : ''}
                                                            </p>
                                                        </button>
                                                    ))}
                                                </div>

                                                {allEntities.length > 0 && (
                                                    <>
                                                        <p className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3'>
                                                            All Entities
                                                        </p>
                                                        {Object.entries(
                                                            allEntities.reduce((acc, e) => {
                                                                if (!acc[e.type]) acc[e.type] = [];
                                                                acc[e.type].push(e);
                                                                return acc;
                                                            }, {})
                                                        ).map(([type, entities]) => (
                                                            <div key={type} className='mb-3'>
                                                                <div className='flex items-center gap-2 mb-1.5'>
                                                                    <div
                                                                        className='w-2 h-2 rounded-full shrink-0'
                                                                        style={{ backgroundColor: colorFor(type) }}
                                                                    />
                                                                    <p className='text-xs font-semibold text-gray-400 uppercase'>{type}</p>
                                                                </div>
                                                                <div className='flex flex-wrap gap-1'>
                                                                    {entities.slice(0, 12).map(e => (
                                                                        <button
                                                                            key={e.name}
                                                                            onClick={() => { setActiveTab('knowledge-graph'); fetchEntityQuery(e.name); }}
                                                                            className='px-2 py-1 rounded-full text-xs border border-gray-200 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-colors'
                                                                            style={{ borderLeftColor: colorFor(type), borderLeftWidth: 3 }}
                                                                        >
                                                                            {capEntity(e.name)}
                                                                            <span className='text-gray-400 ml-1 group-hover:text-gray-200'>×{e.count}</span>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Knowledge Graph ───────────────────────────── */}
                            {activeTab === 'knowledge-graph' && (
                                <div className='h-full flex'>
                                    {/* Full-width graph */}
                                    <div className='flex-1 relative bg-gray-50'>
                                        {!graphData || graphData.nodes.length === 0 ? (
                                            <div className='h-full flex flex-col items-center justify-center gap-2'>
                                                <p className='text-gray-400 text-sm'>No entity data available</p>
                                                <p className='text-gray-300 text-xs'>Search a topic to build the graph</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className='absolute top-4 right-4 z-10 bg-white border border-gray-200 rounded-xl p-3 shadow-sm text-xs'>
                                                    {[
                                                        ['PERSON',   'Person'],
                                                        ['ORG',      'Organisation'],
                                                        ['LOCATION', 'Location'],
                                                        ['EVENT',    'Event'],
                                                        ['DATE',     'Date'],
                                                    ].map(([k, label]) => (
                                                        <div key={k} className='flex items-center gap-2 mb-1 last:mb-0'>
                                                            <div
                                                                className='w-2.5 h-2.5 rounded-full shrink-0'
                                                                style={{ backgroundColor: ENTITY_COLORS[k] }}
                                                            />
                                                            <span className='text-gray-500'>{label}</span>
                                                        </div>
                                                    ))}
                                                    <p className='text-gray-300 text-xs mt-1.5 border-t pt-1.5'>Click node to explore</p>
                                                </div>
                                                <EntityGraph graphData={graphData} onNodeClick={fetchEntityQuery} />
                                            </>
                                        )}
                                    </div>

                                    {/* Entity detail sidebar */}
                                    {selectedEntity && (
                                        <div className='w-72 border-l border-gray-200 bg-white flex flex-col overflow-hidden shrink-0'>
                                            <div className='p-4 border-b border-gray-100 flex items-center justify-between shrink-0'>
                                                <p className='font-semibold text-sm truncate'>{capEntity(selectedEntity)}</p>
                                                <button
                                                    onClick={() => { setSelectedEntity(null); setEntityResult(null); }}
                                                    className='text-gray-300 hover:text-gray-600 text-xl leading-none ml-2 shrink-0'
                                                >
                                                    ×
                                                </button>
                                            </div>
                                            <div className='flex-1 overflow-y-auto p-4'>
                                                {entityLoading ? (
                                                    <p className='text-gray-400 text-xs text-center mt-8'>Loading…</p>
                                                ) : entityResult && (
                                                    <div className='flex flex-col gap-4'>
                                                        <p className='text-xs text-gray-400'>
                                                            {entityResult.total_relations || 0} total relations
                                                        </p>

                                                        {entityResult.outgoing_relations?.length > 0 && (
                                                            <div>
                                                                <p className='text-xs font-semibold text-gray-400 uppercase mb-2'>
                                                                    Outgoing — {capEntity(selectedEntity)} →
                                                                </p>
                                                                {entityResult.outgoing_relations.slice(0, 8).map((rel, i) => (
                                                                    <div key={i} className='mb-2 text-xs flex items-start gap-1'>
                                                                        <span className='text-gray-400 italic shrink-0'>
                                                                            {(rel.verbs || [])[0] || '—'}
                                                                        </span>
                                                                        <button
                                                                            onClick={() => fetchEntityQuery(rel.target)}
                                                                            className='font-semibold hover:underline text-left'
                                                                        >
                                                                            {capEntity(rel.target)}
                                                                        </button>
                                                                        <span className='text-gray-300 shrink-0'>×{rel.relation_count}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {entityResult.incoming_relations?.length > 0 && (
                                                            <div>
                                                                <p className='text-xs font-semibold text-gray-400 uppercase mb-2'>
                                                                    Incoming — → {capEntity(selectedEntity)}
                                                                </p>
                                                                {entityResult.incoming_relations.slice(0, 8).map((rel, i) => (
                                                                    <div key={i} className='mb-2 text-xs flex items-start gap-1'>
                                                                        <button
                                                                            onClick={() => fetchEntityQuery(rel.source)}
                                                                            className='font-semibold hover:underline text-left'
                                                                        >
                                                                            {capEntity(rel.source)}
                                                                        </button>
                                                                        <span className='text-gray-400 italic shrink-0'>
                                                                            {(rel.verbs || [])[0] || '—'}
                                                                        </span>
                                                                        <span className='text-gray-300 shrink-0'>×{rel.relation_count}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {!entityResult.found && !entityResult.outgoing_relations?.length && !entityResult.incoming_relations?.length && (
                                                            <p className='text-xs text-gray-400 text-center py-6'>No relations found</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Causal Chain ──────────────────────────────── */}
                            {activeTab === 'causal-chain' && (
                                <div className='h-full flex overflow-hidden'>
                                    {/* Seed article selector */}
                                    <div className='w-64 border-r border-gray-200 bg-white flex flex-col overflow-hidden shrink-0'>
                                        <div className='px-4 py-3 border-b border-gray-100 shrink-0'>
                                            <p className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>Seed article</p>
                                        </div>
                                        <div className='flex-1 overflow-y-auto p-2'>
                                            {visibleResults.map(article => (
                                                <button
                                                    key={article.article_id}
                                                    onClick={() => fetchStoryChain(article)}
                                                    className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 text-xs transition-colors ${
                                                        storySeed?.article_id === article.article_id
                                                            ? 'bg-gray-900 text-white'
                                                            : 'hover:bg-gray-100 text-gray-700'
                                                    }`}
                                                >
                                                    <p className='font-medium line-clamp-2 leading-snug'>{article.title}</p>
                                                    <p className={`mt-1 ${storySeed?.article_id === article.article_id ? 'text-gray-400' : 'text-gray-400'}`}>
                                                        {fmtShort(article.published_date || article.date)}
                                                    </p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Timeline */}
                                    <div className='flex-1 overflow-y-auto p-6'>
                                        {storyLoading ? (
                                            <div className='flex items-center justify-center h-32'>
                                                <p className='text-gray-400 text-sm'>Building causal chain…</p>
                                            </div>
                                        ) : !storyChain ? (
                                            <div className='flex items-center justify-center h-32'>
                                                <p className='text-gray-400 text-sm text-center'>
                                                    Select an article on the left to trace its narrative thread
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Chain meta */}
                                                <div className='bg-white border border-gray-200 rounded-xl p-4 mb-6'>
                                                    <p className='font-semibold text-sm text-gray-900'>Causal Chain</p>
                                                    <p className='text-xs text-gray-500 mt-0.5 line-clamp-1'>Seed: {storySeed?.title}</p>
                                                    <p className='text-xs text-gray-400 mt-1'>
                                                        {storyChain.total_articles} articles
                                                        {storyChain.date_range?.span_days > 0 && (
                                                            <span> · {storyChain.date_range.span_days}-day span</span>
                                                        )}
                                                    </p>
                                                    {storyChain.shared_entities?.length > 0 && (
                                                        <div className='flex flex-wrap gap-1 mt-2'>
                                                            {storyChain.shared_entities.slice(0, 8).map(e => (
                                                                <button
                                                                    key={e}
                                                                    onClick={() => { setActiveTab('knowledge-graph'); fetchEntityQuery(e); }}
                                                                    className='bg-gray-100 hover:bg-gray-900 hover:text-white px-2 py-0.5 rounded-full text-xs text-gray-600 transition-colors'
                                                                >
                                                                    {capEntity(e)}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Vertical timeline */}
                                                <div className='relative'>
                                                    <div className='absolute left-4 top-4 bottom-4 w-px bg-gray-200' />
                                                    <div className='flex flex-col gap-4'>
                                                        {storyChain.timeline?.map((item, idx) => (
                                                            <div key={item.article_id} className='flex gap-4 items-start'>
                                                                <div className='relative z-10 w-8 h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center shrink-0'>
                                                                    <span className='text-xs font-mono text-gray-400'>{idx + 1}</span>
                                                                </div>
                                                                <div className='flex-1 bg-white border border-gray-200 rounded-xl p-4'>
                                                                    <p className='text-sm font-medium text-gray-900 leading-snug'>{item.title}</p>
                                                                    <p className='text-xs text-gray-400 mt-1'>{fmt(item.date)}</p>
                                                                    {item.entities?.length > 0 && (
                                                                        <div className='flex flex-wrap gap-1 mt-2'>
                                                                            {item.entities.slice(0, 4).map((e, i) => (
                                                                                <button
                                                                                    key={e.canonical_name || i}
                                                                                    onClick={() => { setActiveTab('knowledge-graph'); fetchEntityQuery(e.canonical_name); }}
                                                                                    className='bg-gray-100 hover:bg-gray-900 hover:text-white px-2 py-0.5 rounded text-xs text-gray-600 transition-colors'
                                                                                >
                                                                                    {capEntity(e.canonical_name)}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── Geographic Map ────────────────────────────── */}
                            {activeTab === 'geographic-map' && (
                                <div className='h-full flex overflow-hidden'>
                                    <div className='flex-1'>
                                        <NexusMap articles={visibleResults} />
                                    </div>

                                    {/* Map sidebar */}
                                    <div className='w-60 border-l border-gray-200 bg-white flex flex-col overflow-hidden shrink-0'>
                                        <div className='px-4 py-3 border-b border-gray-100 shrink-0'>
                                            <p className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>
                                                Geographic Coverage
                                            </p>
                                        </div>
                                        <div className='flex-1 overflow-y-auto p-4'>
                                            {/* Heat legend */}
                                            <div
                                                className='h-2 rounded-full mb-1'
                                                style={{ background: 'linear-gradient(to right, #d1fae5, #059669)' }}
                                            />
                                            <div className='flex justify-between text-xs text-gray-400 mb-5'>
                                                <span>Fewer</span>
                                                <span>More</span>
                                            </div>

                                            <p className='text-xs font-semibold text-gray-400 uppercase mb-2'>Top Locations</p>
                                            {(() => {
                                                const locMap = {};
                                                searchResults.forEach(r => {
                                                    const loc = r.focus_location || r.focusLocation || r.location;
                                                    if (loc) locMap[loc] = (locMap[loc] || 0) + 1;
                                                    (r.entities || [])
                                                        .filter(e => ['LOCATION', 'LOC', 'GPE'].includes((e.type || '').toUpperCase()))
                                                        .forEach(e => {
                                                            const name = e.canonical_name || e.name;
                                                            if (name) locMap[name] = (locMap[name] || 0) + 1;
                                                        });
                                                });
                                                return Object.entries(locMap)
                                                    .sort((a, b) => b[1] - a[1])
                                                    .slice(0, 12)
                                                    .map(([loc, count]) => (
                                                        <div key={loc} className='flex items-center justify-between mb-2'>
                                                            <span className='text-xs text-gray-700 truncate flex-1 mr-2'>{loc}</span>
                                                            <span className='text-xs text-gray-400 shrink-0 tabular-nums'>{count}</span>
                                                        </div>
                                                    ));
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Nexus;
