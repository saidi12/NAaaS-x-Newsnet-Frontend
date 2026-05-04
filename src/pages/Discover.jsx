import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import Logo from '../layout/Logo';
import Sidebar from '../components/Vertical-nav/vertical-nav';

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
    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
});

const fmt = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ── D3 Graph ────────────────────────────────────────────────────────────────

const PILL_H = 26;
const PILL_PAD_X = 14;

// Clip point to pill boundary (rounded rect) for arrow endpoint
function pillEdgePoint(cx, cy, tx, ty, hw, hh) {
    const dx = tx - cx, dy = ty - cy;
    if (!dx && !dy) return [tx, ty];
    // For the circular caps: if fully horizontal/vertical use half-width/height
    const absDx = Math.abs(dx), absDy = Math.abs(dy);
    const t = Math.min(
        absDx > 0 ? hw / absDx : Infinity,
        absDy > 0 ? hh / absDy : Infinity
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

        const width = el.parentElement?.clientWidth || 700;
        const height = el.parentElement?.clientHeight || 600;

        // Measure text for pill width
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = 'bold 11px sans-serif';
        nodes.forEach(n => {
            n._pw = ctx.measureText(n.label).width + PILL_PAD_X * 2;
            n._ph = PILL_H;
        });

        const svg = d3.select(el).attr('width', width).attr('height', height);
        const g = svg.append('g');

        svg.call(d3.zoom().scaleExtent([0.3, 3]).on('zoom', e => g.attr('transform', e.transform)));

        const nodeIds = new Set(nodes.map(n => n.id));
        const validEdges = edges.filter(e => {
            const src = typeof e.source === 'object' ? e.source.id : e.source;
            const tgt = typeof e.target === 'object' ? e.target.id : e.target;
            return nodeIds.has(src) && nodeIds.has(tgt);
        });

        g.append('defs').append('marker')
            .attr('id', 'pill-arrow')
            .attr('viewBox', '0 -4 8 8')
            .attr('refX', 8).attr('refY', 0)
            .attr('markerWidth', 5).attr('markerHeight', 5)
            .attr('orient', 'auto')
            .append('path').attr('d', 'M0,-4L8,0L0,4').attr('fill', '#374151');

        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(validEdges).id(d => d.id).distance(180))
            .force('charge', d3.forceManyBody().strength(-400))
            .force('collide', d3.forceCollide().radius(d => d._pw / 2 + 12))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .alphaDecay(0.04);

        const link = g.append('g').selectAll('line').data(validEdges).enter().append('line')
            .attr('stroke', '#374151').attr('stroke-width', 1)
            .attr('marker-end', 'url(#pill-arrow)');

        const linkLabel = g.append('g').selectAll('text').data(validEdges).enter().append('text')
            .attr('font-size', 8).attr('fill', '#6b7280').attr('text-anchor', 'middle')
            .text(d => (d.label || '').slice(0, 14));

        const node = g.append('g').selectAll('g').data(nodes).enter().append('g')
            .style('cursor', 'pointer')
            .call(d3.drag()
                .on('start', (ev, d) => { if (!ev.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
                .on('drag', (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
                .on('end', (ev, d) => { if (!ev.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
            )
            .on('click', (ev, d) => { ev.stopPropagation(); onNodeClick(d.id, d.category); });

        // Pill shape
        node.append('rect')
            .attr('x', d => -d._pw / 2)
            .attr('y', -PILL_H / 2)
            .attr('width', d => d._pw)
            .attr('height', PILL_H)
            .attr('rx', PILL_H / 2)
            .attr('ry', PILL_H / 2)
            .attr('fill', d => colorFor(d.category))
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5);

        node.append('text')
            .attr('dy', '.35em').attr('text-anchor', 'middle')
            .style('font-size', '11px').style('font-weight', 'bold').style('fill', '#000').style('pointer-events', 'none')
            .text(d => d.label);

        node.append('title').text(d => `${d.label} · ${d.category} · ${d.count || 1} article(s)`);

        simulation.on('tick', () => {
            link.each(function(d) {
                const [x2, y2] = pillEdgePoint(d.target.x, d.target.y, d.source.x, d.source.y, d.target._pw / 2, d.target._ph / 2);
                d3.select(this)
                    .attr('x1', d.source.x).attr('y1', d.source.y)
                    .attr('x2', x2).attr('y2', y2);
            });
            linkLabel
                .attr('x', d => (d.source.x + d.target.x) / 2)
                .attr('y', d => (d.source.y + d.target.y) / 2 - 5);
            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });

        return () => simulation.stop();
    }, [graphData, onNodeClick]);

    return <svg ref={svgRef} className='w-full h-full' />;
}

// ── Community graph ─────────────────────────────────────────────────────────

function CommunityGraph({ articles, onArticleClick }) {
    const svgRef = useRef(null);

    useEffect(() => {
        if (!articles?.length || !svgRef.current) return;

        const el = svgRef.current;
        d3.select(el).selectAll('*').remove();

        const width  = el.parentElement?.clientWidth  || 700;
        const height = el.parentElement?.clientHeight || 600;

        // Build nodes – extract entity names for overlap calculation
        const nodes = articles.map(a => ({
            id:        a.article_id,
            label:     a.title || '',
            date:      a.published_date,
            entities:  new Set((a.entities || []).map(e => e.canonical_name || e.name).filter(Boolean)),
            degree:    0,
        }));

        // Edges = pairs with at least one shared entity; weight = shared count
        const edges = [];
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const shared = [...nodes[i].entities].filter(e => nodes[j].entities.has(e)).length;
                if (shared > 0) {
                    edges.push({ source: nodes[i].id, target: nodes[j].id, weight: shared });
                    nodes[i].degree += shared;
                    nodes[j].degree += shared;
                }
            }
        }

        const maxDeg = Math.max(...nodes.map(n => n.degree), 1);
        // Warm (YlOrRd) = high entity overlap (central/similar); cool = peripheral
        // Shift base to 0.3 so even degree=1 nodes show a visible warm colour (not pale yellow)
        const heat = d3.scaleSequential(t => d3.interpolateYlOrRd(0.3 + t * 0.7)).domain([0, maxDeg]);

        const svg = d3.select(el).attr('width', width).attr('height', height);
        const g   = svg.append('g');
        svg.call(d3.zoom().scaleExtent([0.2, 3]).on('zoom', ev => g.attr('transform', ev.transform)));

        const sim = d3.forceSimulation(nodes)
            .force('link',    d3.forceLink(edges).id(d => d.id)
                                .distance(d => Math.max(60, 160 / (d.weight + 1)))
                                .strength(d => Math.min(d.weight * 0.25, 1)))
            .force('charge',  d3.forceManyBody().strength(-250))
            .force('collide', d3.forceCollide().radius(36))
            .force('center',  d3.forceCenter(width / 2, height / 2))
            .alphaDecay(0.03);

        // Edges – thickness & opacity reflect similarity
        const link = g.append('g').selectAll('line').data(edges).enter().append('line')
            .attr('stroke', '#374151')
            .attr('stroke-opacity', d => Math.min(0.15 + d.weight * 0.2, 0.8))
            .attr('stroke-width',   d => d.weight);

        // Nodes
        const node = g.append('g').selectAll('g').data(nodes).enter().append('g')
            .style('cursor', 'pointer')
            .call(d3.drag()
                .on('start', (ev, d) => { if (!ev.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
                .on('drag',  (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
                .on('end',   (ev, d) => { if (!ev.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }))
            .on('click', (ev, d) => { ev.stopPropagation(); onArticleClick(d.id); });

        node.append('circle')
            .attr('r', 20)
            .attr('fill',   d => heat(d.degree))
            .attr('stroke', '#fff').attr('stroke-width', 2.5);

        // Short label below circle
        node.append('text')
            .attr('dy', 34).attr('text-anchor', 'middle')
            .style('font-size', '9px').style('fill', '#374151').style('pointer-events', 'none')
            .text(d => d.label.length > 28 ? d.label.slice(0, 27) + '…' : d.label);

        node.append('title').text(d => d.label + (d.date ? '\n' + fmt(d.date) : ''));

        sim.on('tick', () => {
            link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });

        return () => sim.stop();
    }, [articles, onArticleClick]);

    return <svg ref={svgRef} className='w-full h-full' />;
}

// ── Article card ────────────────────────────────────────────────────────────

function ArticleCard({ article, onStoryChain, onEntityClick, expanded, onToggleRead, loadingRead }) {
    const isLoading = loadingRead === article.article_id;
    const cardRef = useRef(null);

    useEffect(() => {
        if (expanded && cardRef.current) {
            cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [expanded]);

    return (
        <div ref={cardRef} className='border border-gray-200 rounded-lg bg-white overflow-hidden hover:border-gray-400 transition-colors'>
            {/* Clickable header — whole area toggles read */}
            <button
                className='w-full text-left p-3 block'
                onClick={() => onToggleRead(article.article_id)}
                disabled={isLoading}
            >
                <div className='flex items-start justify-between gap-2'>
                    <p className='text-sm font-medium leading-snug flex-1'>{article.title}</p>
                    <span className='text-xs text-gray-400 shrink-0 mt-0.5'>
                        {isLoading ? '⏳' : expanded ? '▲' : '▼'}
                    </span>
                </div>
                <div className='flex items-center gap-2 text-xs text-gray-400 mt-1 flex-wrap'>
                    {article.source && <span className='capitalize'>{article.source}</span>}
                    {(article.published_date || article.date) && (
                        <><span>·</span><span>{fmt(article.published_date || article.date)}</span></>
                    )}
                    {article.similarity_score != null && (
                        <><span>·</span><span className='text-green-600 font-medium'>{(article.similarity_score * 100).toFixed(0)}% match</span></>
                    )}
                </div>
            </button>

            {/* Entity badges + Story chain button */}
            <div className='px-3 pb-3 flex items-center justify-between gap-2'>
                <div className='flex flex-wrap gap-1 flex-1 min-w-0'>
                    {article.entities?.slice(0, 4).map((e, i) => (
                        <button key={e.canonical_name || i}
                            onClick={() => onEntityClick(e.canonical_name)}
                            className='bg-gray-100 hover:bg-black hover:text-white px-1.5 py-0.5 rounded text-xs text-gray-600 transition-colors'
                        >
                            {e.canonical_name}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => onStoryChain(article)}
                    className='shrink-0 px-2.5 py-1 rounded-full bg-gray-100 hover:bg-black hover:text-white text-xs text-gray-600 font-medium transition-colors whitespace-nowrap'
                >
                    Story chain →
                </button>
            </div>

            {/* Expanded content */}
            {expanded && (
                <div className='border-t-2 border-gray-200 bg-gray-50'>
                    {/* Header bar with link */}
                    <div className='flex items-center justify-between px-3 pt-2 pb-1'>
                        <span className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>Full article</span>
                        {expanded.link && (
                            <a href={expanded.link} target='_blank' rel='noreferrer'
                                className='text-xs text-blue-600 hover:underline font-medium'>
                                Open original ↗
                            </a>
                        )}
                    </div>
                    {/* Scrollable content area */}
                    <div className='px-3 pb-3 h-64 overflow-y-auto'>
                        <p className='text-sm text-gray-700 leading-relaxed whitespace-pre-wrap'>
                            {expanded.content || 'No content available.'}
                        </p>
                    </div>
                    {expanded.relations?.length > 0 && (
                        <div className='border-t border-gray-200 px-3 py-2'>
                            <p className='text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide'>Key relations</p>
                            <div className='flex flex-col gap-1'>
                                {expanded.relations.slice(0, 6).map((r, i) => (
                                    <p key={i} className='text-xs text-gray-600'>
                                        <button onClick={() => onEntityClick(r.subject)} className='font-semibold hover:underline'>{r.subject}</button>
                                        {' '}<span className='text-gray-400 italic'>{r.predicate}</span>{' '}
                                        <button onClick={() => onEntityClick(r.object)} className='font-semibold hover:underline'>{r.object}</button>
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Main page ───────────────────────────────────────────────────────────────

const TABS = ['articles', 'entities', 'community', 'story'];

const Discover = () => {
    const [query, setQuery] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [graphData, setGraphData] = useState(null);
    const [activeTab, setActiveTab] = useState('articles');

    // Article reading
    const [expandedArticles, setExpandedArticles] = useState({}); // article_id → full data
    const [loadingRead, setLoadingRead] = useState(null);

    // Entity tab
    const [entityResult, setEntityResult] = useState(null);
    const [entityLoading, setEntityLoading] = useState(false);
    const [entityHistory, setEntityHistory] = useState([]); // breadcrumb
    const [entityArticles, setEntityArticles] = useState([]);
    const [entityArticlesLoading, setEntityArticlesLoading] = useState(false);

    // Community graph
    const [communityGraphVisible, setCommunityGraphVisible] = useState(false);

    // Community tab
    const [community, setCommunity] = useState(null);
    const [communityLoading, setCommunityLoading] = useState(false);

    // Story tab
    const [storyChain, setStoryChain] = useState(null);
    const [storyLoading, setStoryLoading] = useState(false);
    const [storySeed, setStorySeed] = useState(null);

    // ── Graph builder ──────────────────────────────────────────
    const buildGraphFromResults = (results) => {
        const entityMap = {};
        const edgeSet = new Set();
        const edges = [];

        results.forEach(result => {
            const ents = result.entities || [];
            ents.forEach(e => {
                if (!e.canonical_name) return;
                if (!entityMap[e.canonical_name]) {
                    entityMap[e.canonical_name] = { id: e.canonical_name, label: e.canonical_name, category: e.type || e.entity_type || 'DEFAULT', count: 0 };
                }
                entityMap[e.canonical_name].count++;
            });
            // Co-occurrence edges
            for (let i = 0; i < ents.length; i++) {
                for (let j = i + 1; j < ents.length; j++) {
                    if (!ents[i].canonical_name || !ents[j].canonical_name) continue;
                    const key = [ents[i].canonical_name, ents[j].canonical_name].sort().join('||');
                    if (!edgeSet.has(key)) {
                        edgeSet.add(key);
                        edges.push({ source: ents[i].canonical_name, target: ents[j].canonical_name });
                    }
                }
            }
        });

        setGraphData({ nodes: Object.values(entityMap), edges });
    };

    const buildGraphFromEntityQuery = (entityName, data) => {
        const nodes = [{ id: entityName, label: entityName, category: 'PERSON', count: data.total_relations || 1 }];
        const edges = [];

        (data.outgoing_relations || []).forEach(rel => {
            if (!rel.target) return;
            if (!nodes.find(n => n.id === rel.target)) {
                nodes.push({ id: rel.target, label: rel.target, category: 'DEFAULT', count: rel.relation_count || 1 });
            }
            edges.push({ source: entityName, target: rel.target, label: (rel.verbs || [])[0] || '' });
        });

        (data.incoming_relations || []).forEach(rel => {
            if (!rel.source) return;
            if (!nodes.find(n => n.id === rel.source)) {
                nodes.push({ id: rel.source, label: rel.source, category: 'DEFAULT', count: rel.relation_count || 1 });
            }
            edges.push({ source: rel.source, target: entityName, label: (rel.verbs || [])[0] || '' });
        });

        setGraphData({ nodes, edges });
    };

    // ── API calls ──────────────────────────────────────────────
    const handleSearch = async () => {
        if (!query.trim()) return;
        setSearchLoading(true);
        setHasSearched(true);
        setExpandedArticles({});
        setEntityResult(null);
        setEntityHistory([]);
        setCommunity(null);
        setStoryChain(null);
        setStorySeed(null);
        setActiveTab('articles');

        try {
            const res = await fetch(`${process.env.REACT_APP_API_URL}/graphrag/search`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ query, top_k: 10 }),
            });
            const data = await res.json();
            const results = data.results || [];
            setSearchResults(results);
            buildGraphFromResults(results);

            const firstWithCommunity = results.find(r => r.community_id != null);
            if (firstWithCommunity) fetchCommunity(firstWithCommunity.community_id);
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setSearchLoading(false);
        }
    };

    const fetchArticle = async (articleId) => {
        if (expandedArticles[articleId]) {
            setExpandedArticles(prev => { const n = { ...prev }; delete n[articleId]; return n; });
            return;
        }
        setLoadingRead(articleId);
        try {
            const res = await fetch(`${process.env.REACT_APP_API_URL}/graphrag/article/${articleId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
            });
            const data = await res.json();
            setExpandedArticles(prev => ({ ...prev, [articleId]: data }));
        } catch (err) {
            console.error('Article fetch failed:', err);
        } finally {
            setLoadingRead(null);
        }
    };

    const fetchEntityArticles = useCallback(async (entityName, articleIds) => {
        setEntityArticlesLoading(true);
        // Prefer articles already in search results that mention this entity — already relevance-ranked
        const fromSearch = searchResults.filter(r =>
            (r.entities || []).some(e => e.canonical_name === entityName)
        );
        if (fromSearch.length > 0) {
            setEntityArticles(fromSearch);
            setEntityArticlesLoading(false);
            return;
        }
        // Fallback: fetch from relation article_ids
        try {
            const results = await Promise.all(
                articleIds.slice(0, 10).map(id =>
                    fetch(`${process.env.REACT_APP_API_URL}/graphrag/article/${id}`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
                    }).then(r => r.json()).catch(() => null)
                )
            );
            setEntityArticles(results.filter(a => a && a.article_id));
        } catch (err) {
            console.error('Entity articles fetch failed:', err);
        } finally {
            setEntityArticlesLoading(false);
        }
    }, [searchResults]);

    const fetchEntityQuery = useCallback(async (entityName, pushHistory = true) => {
        setEntityLoading(true);
        setEntityArticles([]);
        setActiveTab('entities');
        if (pushHistory) setEntityHistory(prev => [...prev, entityName]);

        try {
            const res = await fetch(`${process.env.REACT_APP_API_URL}/graphrag/entity_query`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ entity_name: entityName }),
            });
            const data = await res.json();
            setEntityResult({ name: entityName, ...data });
            buildGraphFromEntityQuery(entityName, data);

            // Collect unique article IDs from all relations
            const seen = new Set();
            [...(data.outgoing_relations || []), ...(data.incoming_relations || [])].forEach(rel => {
                (rel.article_ids || []).forEach(id => seen.add(id));
            });
            if (seen.size > 0) fetchEntityArticles(entityName, [...seen]);
        } catch (err) {
            console.error('Entity query failed:', err);
        } finally {
            setEntityLoading(false);
        }
    }, [fetchEntityArticles]);

    const fetchCommunity = async (communityId) => {
        setCommunityLoading(true);
        try {
            const res = await fetch(`${process.env.REACT_APP_API_URL}/graphrag/community/${communityId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
            });
            const data = await res.json();
            setCommunity(data);
        } catch (err) {
            console.error('Community fetch failed:', err);
        } finally {
            setCommunityLoading(false);
        }
    };

    const fetchStoryChain = async (article) => {
        setStorySeed(article);
        setStoryLoading(true);
        setStoryChain(null);
        setActiveTab('story');
        try {
            const res = await fetch(`${process.env.REACT_APP_API_URL}/graphrag/story_chain`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ seed_article_id: article.article_id, max_articles: 15 }),
            });
            const data = await res.json();
            setStoryChain(data);
        } catch (err) {
            console.error('Story chain failed:', err);
        } finally {
            setStoryLoading(false);
        }
    };

    const goBackEntity = () => {
        const history = entityHistory.slice(0, -1);
        setEntityHistory(history);
        if (history.length === 0) {
            setEntityResult(null);
            setEntityArticles([]);
            buildGraphFromResults(searchResults);
        } else {
            fetchEntityQuery(history[history.length - 1], false);
        }
    };

    // ── Entities from results (overview) ──────────────────────
    const allEntities = (() => {
        const map = {};
        searchResults.forEach(r => {
            (r.entities || []).forEach(e => {
                if (!e.canonical_name) return;
                if (!map[e.canonical_name]) map[e.canonical_name] = { name: e.canonical_name, type: e.type || e.entity_type || 'OTHER', count: 0 };
                map[e.canonical_name].count++;
            });
        });
        const grouped = {};
        Object.values(map).forEach(e => {
            if (!grouped[e.type]) grouped[e.type] = [];
            grouped[e.type].push(e);
        });
        return grouped;
    })();

    return (
        <div className='h-screen flex flex-col overflow-hidden'>
            <Logo />
            <Sidebar />

            <div className='flex flex-1 pl-16 overflow-hidden'>
                {/* ── Left: graph panel ── */}
                <div className='w-3/5 h-full relative bg-gray-50 border-r border-gray-200 overflow-hidden'>
                    {communityGraphVisible && activeTab === 'community' && community?.sample_articles?.length > 0 ? (
                        <>
                            {/* Community graph controls */}
                            <div className='absolute top-3 left-3 z-10 flex items-center gap-2'>
                                <button
                                    onClick={() => setCommunityGraphVisible(false)}
                                    className='bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:text-black shadow-sm'
                                >
                                    ← Entity graph
                                </button>
                            </div>
                            {/* Community graph legend */}
                            <div className='absolute top-3 right-3 z-10 bg-white border border-gray-200 rounded-lg p-2.5 shadow-sm text-xs'>
                                <p className='font-semibold text-gray-600 mb-1.5'>Similarity</p>
                                <div className='flex items-center gap-1.5 mb-1'>
                                    <div className='w-3 h-3 rounded-full shrink-0' style={{ background: '#d7191c' }} />
                                    <span className='text-gray-500'>High overlap</span>
                                </div>
                                <div className='flex items-center gap-1.5 mb-1'>
                                    <div className='w-3 h-3 rounded-full shrink-0' style={{ background: '#fdae61' }} />
                                    <span className='text-gray-500'>Moderate</span>
                                </div>
                                <div className='flex items-center gap-1.5'>
                                    <div className='w-3 h-3 rounded-full shrink-0' style={{ background: '#ffffbf' }} />
                                    <span className='text-gray-500'>Low overlap</span>
                                </div>
                                <p className='text-gray-300 text-xs mt-1.5 border-t pt-1.5'>Click node to read</p>
                            </div>
                            <CommunityGraph
                                articles={community.sample_articles}
                                onArticleClick={fetchArticle}
                            />
                        </>
                    ) : !hasSearched ? (
                        <div className='h-full flex flex-col items-center justify-center gap-3 text-center px-8'>
                            <p className='text-5xl text-gray-200'>⊙</p>
                            <p className='text-xl font-semibold text-gray-300'>Discover</p>
                            <p className='text-sm text-gray-400 max-w-xs'>
                                Search a topic, person, or event to visualise its entity network and explore connections
                            </p>
                        </div>
                    ) : searchLoading ? (
                        <div className='h-full flex items-center justify-center'>
                            <p className='text-gray-400 text-sm'>Building entity graph…</p>
                        </div>
                    ) : !graphData || graphData.nodes.length === 0 ? (
                        <div className='h-full flex flex-col items-center justify-center gap-2 text-center px-8'>
                            <p className='text-gray-400 text-sm'>No entity data in these results</p>
                            <p className='text-gray-300 text-xs max-w-xs'>The matched articles may not have been enriched yet, or the query returned no structured entities</p>
                        </div>
                    ) : (
                        <>
                            {/* Entity graph legend */}
                            <div className='absolute top-3 right-3 z-10 bg-white border border-gray-200 rounded-lg p-2.5 shadow-sm text-xs'>
                                {[['PERSON', 'Person'], ['ORG', 'Organisation'], ['LOCATION', 'Location'], ['EVENT', 'Event'], ['DATE', 'Date']].map(([key, label]) => (
                                    <div key={key} className='flex items-center gap-2 mb-1 last:mb-0'>
                                        <div className='w-2.5 h-2.5 rounded-full shrink-0' style={{ backgroundColor: ENTITY_COLORS[key] }} />
                                        <span className='text-gray-500'>{label}</span>
                                    </div>
                                ))}
                                <p className='text-gray-300 text-xs mt-1.5 border-t pt-1.5'>Click node to explore</p>
                            </div>
                            <EntityGraph graphData={graphData} onNodeClick={fetchEntityQuery} />
                        </>
                    )}
                </div>

                {/* ── Right: Search + tabs ── */}
                <div className='w-2/5 h-full flex flex-col overflow-hidden'>
                    {/* Search bar */}
                    <div className='p-4 border-b border-gray-200 shrink-0'>
                        <div className='flex gap-2'>
                            <input
                                type='text'
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                placeholder='"PTI protests", "economic crisis", "flood relief"...'
                                className='flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black'
                            />
                            <button
                                onClick={handleSearch}
                                disabled={searchLoading}
                                className='px-4 py-2 bg-black text-white rounded-lg text-sm font-medium disabled:opacity-50 shrink-0'
                            >
                                {searchLoading ? '...' : 'Search'}
                            </button>
                        </div>
                    </div>

                    {!hasSearched ? (
                        <div className='flex-1 flex items-center justify-center'>
                            <p className='text-gray-300 text-sm text-center px-8'>
                                Search to explore articles, entities, communities, and story chains
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Tabs */}
                            <div className='flex border-b border-gray-200 shrink-0'>
                                {TABS.map(tab => (
                                    <button key={tab}
                                        onClick={() => {
                                            setActiveTab(tab);
                                            if (tab !== 'community') { setCommunityGraphVisible(false); }
                                            if (tab === 'community' && !community && !communityLoading) {
                                                const first = searchResults.find(r => r.community_id != null);
                                                if (first) fetchCommunity(first.community_id);
                                            }
                                        }}
                                        className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'border-b-2 border-black -mb-px' : 'text-gray-400 hover:text-black'}`}
                                    >
                                        {tab}
                                        {tab === 'story' && storySeed && <span className='ml-1 text-gray-300 text-xs'>·</span>}
                                    </button>
                                ))}
                            </div>

                            <div className='flex-1 overflow-y-auto p-4 flex flex-col gap-3'>

                                {/* ── Articles tab ── */}
                                {activeTab === 'articles' && (
                                    <>
                                        {searchLoading ? (
                                            <div className='flex justify-center items-center h-32'>
                                                <span className='text-gray-400 text-sm'>Searching...</span>
                                            </div>
                                        ) : searchResults.length === 0 ? (
                                            <div className='flex justify-center items-center h-32'>
                                                <span className='text-gray-400 text-sm'>No results found</span>
                                            </div>
                                        ) : (
                                            <div className='flex flex-col gap-2'>
                                                {searchResults.map(result => (
                                                    <ArticleCard
                                                        key={result.article_id}
                                                        article={result}
                                                        onStoryChain={fetchStoryChain}
                                                        onEntityClick={fetchEntityQuery}
                                                        expanded={expandedArticles[result.article_id] || null}
                                                        onToggleRead={fetchArticle}
                                                        loadingRead={loadingRead}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* ── Entities tab ── */}
                                {activeTab === 'entities' && (
                                    <>
                                        {entityLoading ? (
                                            <div className='flex justify-center items-center h-32'>
                                                <span className='text-gray-400 text-sm'>Loading entity...</span>
                                            </div>
                                        ) : entityResult ? (
                                            <div className='flex flex-col gap-3'>
                                                {/* Breadcrumb */}
                                                <div className='flex items-center gap-2 flex-wrap'>
                                                    <button onClick={goBackEntity} className='text-xs text-gray-400 hover:text-black shrink-0'>← Back</button>
                                                    <div className='flex items-center gap-1 text-xs text-gray-400 flex-wrap'>
                                                        <span
                                                            className='hover:underline cursor-pointer'
                                                            onClick={goBackEntity}
                                                        >
                                                            All entities
                                                        </span>
                                                        {entityHistory.map((h, i) => (
                                                            <React.Fragment key={`${h}-${i}`}>
                                                                <span>›</span>
                                                                <span className={i === entityHistory.length - 1 ? 'text-black font-semibold' : 'hover:underline cursor-pointer'}
                                                                    onClick={i < entityHistory.length - 1 ? () => fetchEntityQuery(h, false) : undefined}
                                                                >
                                                                    {h}
                                                                </span>
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className='bg-gray-50 rounded-lg p-3 text-sm'>
                                                    <p className='font-semibold'>{entityResult.name}</p>
                                                    <p className='text-xs text-gray-400 mt-0.5'>{entityResult.total_relations || 0} relations</p>
                                                </div>

                                                {/* Outgoing relations */}
                                                {entityResult.outgoing_relations?.length > 0 && (
                                                    <div>
                                                        <p className='text-xs font-semibold text-gray-400 uppercase mb-2'>Outgoing — {entityResult.name} →</p>
                                                        {entityResult.outgoing_relations.slice(0, 10).map((rel, i) => (
                                                            <div key={i} className='flex items-start gap-2 mb-2 border border-gray-100 rounded-lg p-2 bg-white'>
                                                                <div className='flex-1 min-w-0'>
                                                                    <div className='flex items-center gap-1 flex-wrap text-xs'>
                                                                        <span className='text-gray-400 italic'>{(rel.verbs || []).slice(0, 2).join(', ') || '—'}</span>
                                                                        <button
                                                                            onClick={() => fetchEntityQuery(rel.target)}
                                                                            className='font-semibold text-black hover:underline'
                                                                        >
                                                                            {rel.target}
                                                                        </button>
                                                                    </div>
                                                                    <p className='text-xs text-gray-300 mt-0.5'>{rel.relation_count} occurrence{rel.relation_count !== 1 ? 's' : ''}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Incoming relations */}
                                                {entityResult.incoming_relations?.length > 0 && (
                                                    <div>
                                                        <p className='text-xs font-semibold text-gray-400 uppercase mb-2'>Incoming — → {entityResult.name}</p>
                                                        {entityResult.incoming_relations.slice(0, 10).map((rel, i) => (
                                                            <div key={i} className='flex items-start gap-2 mb-2 border border-gray-100 rounded-lg p-2 bg-white'>
                                                                <div className='flex-1 min-w-0'>
                                                                    <div className='flex items-center gap-1 flex-wrap text-xs'>
                                                                        <button
                                                                            onClick={() => fetchEntityQuery(rel.source)}
                                                                            className='font-semibold text-black hover:underline'
                                                                        >
                                                                            {rel.source}
                                                                        </button>
                                                                        <span className='text-gray-400 italic'>{(rel.verbs || []).slice(0, 2).join(', ') || '—'}</span>
                                                                    </div>
                                                                    <p className='text-xs text-gray-300 mt-0.5'>{rel.relation_count} occurrence{rel.relation_count !== 1 ? 's' : ''}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {!entityResult.found && (
                                                    <p className='text-sm text-gray-400 text-center py-8'>No relations found for this entity</p>
                                                )}

                                                {/* Articles mentioning this entity */}
                                                <div>
                                                    <p className='text-xs font-semibold text-gray-400 uppercase mb-2'>
                                                        Articles mentioning {entityResult.name}
                                                    </p>
                                                    {entityArticlesLoading ? (
                                                        <p className='text-xs text-gray-400'>Loading articles...</p>
                                                    ) : entityArticles.length === 0 ? (
                                                        <p className='text-xs text-gray-300'>No articles found</p>
                                                    ) : (
                                                        <div className='flex flex-col gap-2'>
                                                            {entityArticles.map(a => (
                                                                <ArticleCard
                                                                    key={a.article_id}
                                                                    article={a}
                                                                    onStoryChain={fetchStoryChain}
                                                                    onEntityClick={fetchEntityQuery}
                                                                    expanded={expandedArticles[a.article_id] || null}
                                                                    onToggleRead={fetchArticle}
                                                                    loadingRead={loadingRead}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            /* Overview: all entities from results */
                                            <div className='flex flex-col gap-3'>
                                                <p className='text-xs text-gray-400'>Entities across all results — click to explore relations</p>
                                                {Object.entries(allEntities).map(([type, entities]) => (
                                                    <div key={type}>
                                                        <div className='flex items-center gap-2 mb-1.5'>
                                                            <div className='w-2 h-2 rounded-full' style={{ backgroundColor: colorFor(type) }} />
                                                            <p className='text-xs font-semibold text-gray-400 uppercase'>{type}</p>
                                                        </div>
                                                        <div className='flex flex-wrap gap-1'>
                                                            {entities.sort((a, b) => b.count - a.count).map(e => (
                                                                <button key={e.name}
                                                                    onClick={() => fetchEntityQuery(e.name)}
                                                                    className='px-2 py-1 rounded-full text-xs border border-gray-200 hover:bg-black hover:text-white hover:border-black transition-colors'
                                                                    style={{ borderLeftColor: colorFor(type), borderLeftWidth: 3 }}
                                                                >
                                                                    {e.name}
                                                                    <span className='text-gray-300 ml-1'>×{e.count}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* ── Community tab ── */}
                                {activeTab === 'community' && (
                                    <>
                                        {communityLoading ? (
                                            <div className='flex justify-center items-center h-32'>
                                                <span className='text-gray-400 text-sm'>Loading community...</span>
                                            </div>
                                        ) : !community ? (
                                            <div className='flex justify-center items-center h-32'>
                                                <span className='text-gray-400 text-sm'>No community found for these results</span>
                                            </div>
                                        ) : (
                                            <div className='flex flex-col gap-3'>
                                                <div className='bg-gray-50 rounded-lg p-3'>
                                                    <div className='flex items-start justify-between gap-2'>
                                                        <div>
                                                            <p className='font-semibold text-sm'>Community #{community.community_id}</p>
                                                            <p className='text-xs text-gray-400 mt-0.5'>{community.size} articles in this cluster</p>
                                                            {community.date_range?.start && (
                                                                <p className='text-xs text-gray-400'>{fmt(community.date_range.start)} – {fmt(community.date_range.end)}</p>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => setCommunityGraphVisible(true)}
                                                            disabled={!community.sample_articles?.length}
                                                            className='shrink-0 px-3 py-1.5 bg-black text-white text-xs rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors'
                                                        >
                                                            View graph
                                                        </button>
                                                    </div>
                                                </div>

                                                {community.top_entities?.length > 0 && (
                                                    <div>
                                                        <p className='text-xs font-semibold text-gray-400 uppercase mb-2'>Top entities in this community</p>
                                                        <div className='flex flex-wrap gap-1'>
                                                            {community.top_entities.slice(0, 15).map((e, i) => {
                                                                // top_entities is [[name, count], ...] pairs
                                                                const name = Array.isArray(e) ? e[0] : (e.canonical_name || e.name || e);
                                                                return (
                                                                    <button key={name || i}
                                                                        onClick={() => fetchEntityQuery(name)}
                                                                        className='px-2 py-0.5 rounded-full text-xs bg-gray-100 hover:bg-black hover:text-white transition-colors'
                                                                    >
                                                                        {name}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {community.sample_articles?.length > 0 && (
                                                    <div>
                                                        <p className='text-xs font-semibold text-gray-400 uppercase mb-2'>Sample articles</p>
                                                        {community.sample_articles.map(a => (
                                                            <ArticleCard
                                                                key={a.article_id}
                                                                article={a}
                                                                onStoryChain={fetchStoryChain}
                                                                onEntityClick={fetchEntityQuery}
                                                                expanded={expandedArticles[a.article_id] || null}
                                                                onToggleRead={fetchArticle}
                                                                loadingRead={loadingRead}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* ── Story tab ── */}
                                {activeTab === 'story' && (
                                    <>
                                        {!storySeed ? (
                                            <div className='flex justify-center items-center h-32'>
                                                <span className='text-gray-400 text-sm text-center'>
                                                    Click "Story chain →" on any article to trace its narrative thread
                                                </span>
                                            </div>
                                        ) : storyLoading ? (
                                            <div className='flex justify-center items-center h-32'>
                                                <span className='text-gray-400 text-sm'>Building story chain...</span>
                                            </div>
                                        ) : storyChain && (
                                            <>
                                                <div className='bg-gray-50 rounded-lg p-3'>
                                                    <p className='font-semibold text-sm'>Story chain</p>
                                                    <p className='text-xs text-gray-500 mt-0.5 line-clamp-1'>Seed: {storySeed.title}</p>
                                                    <p className='text-xs text-gray-400 mt-1'>
                                                        {storyChain.total_articles} articles
                                                        {storyChain.date_range?.span_days > 0 && ` · ${storyChain.date_range.span_days} days`}
                                                    </p>
                                                    {storyChain.shared_entities?.length > 0 && (
                                                        <div className='flex flex-wrap gap-1 mt-2'>
                                                            {storyChain.shared_entities.slice(0, 6).map(e => (
                                                                <button key={e} onClick={() => fetchEntityQuery(e)}
                                                                    className='bg-white border border-gray-200 px-2 py-0.5 rounded-full text-xs hover:border-black transition-colors'>
                                                                    {e}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {storyChain.timeline?.map((item, idx) => (
                                                    <div key={item.article_id} className='border border-gray-200 rounded-lg p-3 bg-white'>
                                                        <div className='flex gap-2'>
                                                            <span className='text-xs text-gray-200 font-mono shrink-0 mt-0.5'>
                                                                {String(idx + 1).padStart(2, '0')}
                                                            </span>
                                                            <div className='min-w-0 flex-1'>
                                                                <p className='text-xs font-medium leading-snug'>{item.title}</p>
                                                                <p className='text-xs text-gray-400 mt-0.5'>{fmt(item.date)}</p>
                                                                {item.entities?.length > 0 && (
                                                                    <div className='flex flex-wrap gap-1 mt-1'>
                                                                        {item.entities.slice(0, 3).map((e, i) => (
                                                                            <button key={e.canonical_name || i} onClick={() => fetchEntityQuery(e.canonical_name)}
                                                                                className='bg-gray-100 px-1.5 py-0.5 rounded text-xs text-gray-500 hover:bg-black hover:text-white transition-colors'>
                                                                                {e.canonical_name}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                <button onClick={() => fetchArticle(item.article_id)}
                                                                    className='text-xs text-gray-400 underline mt-1 hover:text-black'>
                                                                    {expandedArticles[item.article_id] ? 'Collapse' : 'Read'}
                                                                </button>
                                                                {expandedArticles[item.article_id] && (
                                                                    <div className='mt-2 pt-2 border-t border-gray-100'>
                                                                        <p className='text-xs text-gray-600 leading-relaxed whitespace-pre-wrap'>
                                                                            {expandedArticles[item.article_id].content || 'No content available.'}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Discover;
