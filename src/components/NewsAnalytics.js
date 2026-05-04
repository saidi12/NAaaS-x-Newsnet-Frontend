// import React, { useEffect, useState } from 'react';
// import { useSelector, useDispatch } from 'react-redux';
// import Logo from '../layout/Logo';
// import Sidebar from './Vertical-nav/vertical-nav';
// import CurrentSearch from '../layout/CurrentSearch';
// import MapComponent from './MapComponent';
// import NewsList from './NewsList';
// import background from '../assets/map-input-bg.png';
// import { format } from 'date-fns';
// import Chatbot from './Chatbot';

// function NewsAnalytics() {
//     const newsSource = useSelector(state => state.map.newsSource);
//     const dispatch = useDispatch();
//     const focusTime = useSelector(state => state.map.focusTime);
//     const publicationTime = useSelector(state => state.map.publicationTime);
//     const news = useSelector(state => state.map.news); // Get news data from Redux state
//     const [localNews, setLocalNews] = useState(news); // Local state for news

//     const handleSourceChange = (event) => {
//         const { value } = event.target;
//         dispatch({ type: 'SET_NEWS_SOURCE', payload: value });
//     };

//     const formatDate = (date) => {
//         return date ? format(new Date(date), 'MMM d, yyyy') : '';
//     };

//     const computeFocusTimeRange = (news) => {
//         if (news.length === 0) return 'Not selected';
//         const focusTimes = news.map(item => new Date(item.focusTime));
//         const maxTime = new Date(Math.max(...focusTimes));
//         const minTime = new Date(Math.min(...focusTimes));
//         return `${formatDate(minTime)} - ${formatDate(maxTime)}`;
//     };

//     const focusTimeText = focusTime && focusTime.length === 2
//         ? `${formatDate(focusTime[0])} - ${formatDate(focusTime[1])}`
//         : computeFocusTimeRange(localNews);

//     const publicationTimeText = publicationTime && publicationTime.length === 2
//         ? `${formatDate(publicationTime[0])} - ${formatDate(publicationTime[1])}`
//         : 'Not selected';

//     useEffect(() => {
//         // Update local news state when Redux news data changes
//         setLocalNews(news);
        
//         // Filter and display unique focusLocations with locationType 'tehsil'
//         const tehsilLocations = news
//             .filter(item => item.locationType === 'Tehsil'||item.locationType === 'District')
//             .map(item => item.focusLocation);
//         const uniqueTehsilLocations = Array.from(new Set(tehsilLocations));
//         console.log('Unique tehsil focusLocations:', uniqueTehsilLocations);
//     }, [news]);

//     return (
//         <div className='h-full'>
//             <img src={background} alt='background' className='absolute -z-50 opacity-20 object-cover w-full h-full' />
//             <Sidebar />
//             <Logo />
//             <div className='flex flex-col pl-14 md:pl-0 md:flex-row w-11/12 mx-auto gap-4'>
//                 <div className='md:w-3/5 w-full'>
//                     <div className='mb-4'>
//                         <label className='text-2xl font-semibold'>
//                             Source
//                         </label>
//                         <div className='border-b-2 border-gray-300 mb-4'></div>
//                         <div className='flex items-center gap-2 text-xl p-2'>
//                             <input
//                                 type="radio"
//                                 id="Dawn"
//                                 name="source"
//                                 value="Dawn"
//                                 className='h-5 w-5 cursor-pointer'
//                                 checked={newsSource === 'Dawn'}
//                                 onChange={handleSourceChange}
//                             />
//                             <label htmlFor="Dawn" className='cursor-pointer'>
//                                 Dawn
//                             </label>
//                             <input
//                                 type="radio"
//                                 id="Tribune"
//                                 name="source"
//                                 value="Tribune"
//                                 className='h-5 w-5 cursor-pointer'
//                                 checked={newsSource === 'Tribune'}
//                                 onChange={handleSourceChange}
//                             />
//                             <label htmlFor="Tribune" className='cursor-pointer'>
//                                 Tribune
//                             </label>
//                         </div>
//                     </div>
//                     <div className='bg-colorMapHeaderBG p-5 mb-4 rounded-lg text-xl'>
//                         <div className='flex flex-row text-gray-700 mb-1 p-0.5'>
//                            <p className='text-gray-700 font-bold'> Focus time: </p><p className='ml-10'>{focusTimeText}</p>
//                         </div>
//                         <div className='flex flex-row text-gray-700 mb-1 p-0.5'>
//                            <p className='text-gray-700 font-bold'> Publication time: </p><p className='ml-10'>{publicationTimeText}</p>
//                         </div>
//                     </div>
//                     <div><MapComponent news={localNews} /></div>
//                 </div>
//                 <div className='md:w-2/5 w-full flex flex-col gap-5'>
//                     <CurrentSearch />
//                     <NewsList />
//                     <Chatbot />
                    
//                 </div>
//             </div>
//         </div>
//     );
// }

// export default NewsAnalytics;

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Logo from '../layout/Logo';
import Sidebar from './Vertical-nav/vertical-nav';
import CurrentSearch from '../layout/CurrentSearch';
import MapComponent from './MapComponent';
import NewsList from './NewsList';
import DashedLineChart from './Graphs/DashedLineGraph';
import background from '../assets/map-input-bg.png';
import { format } from 'date-fns';

const generateUniqueColors = (n) => {
    const colors = [];
    while (colors.length < n) {
        const color = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
        if (!colors.includes(color)) colors.push(color);
    }
    return colors;
};

const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
});

function NewsAnalytics() {
    const focusTime = useSelector(state => state.map.focusTime);
    const publicationTime = useSelector(state => state.map.publicationTime);
    const news = useSelector(state => state.map.news);
    const keywords = useSelector(state => state.map.keyWordsSearch);
    const [localNews, setLocalNews] = useState(news);
    const [activeTab, setActiveTab] = useState('news');

    // Sentiment tab state
    const [sentimentData, setSentimentData] = useState({ labels: [], datasets: [] });
    const [articleCounts, setArticleCounts] = useState([]);
    const [sentimentLoading, setSentimentLoading] = useState(false);

    // Explore tab state
    const [exploreQuery, setExploreQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [storyChain, setStoryChain] = useState(null);
    const [storyLoading, setStoryLoading] = useState(false);

    const formatDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        return isNaN(d.getTime()) ? '' : format(d, 'MMM d, yyyy');
    };

    const toYMD = (ts) => {
        const d = new Date(ts);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const computeFocusTimeRange = (newsList) => {
        if (newsList.length === 0) return 'Not selected';
        const times = newsList
            .map(item => new Date(item.focusTime))
            .filter(d => !isNaN(d.getTime()));
        if (times.length === 0) return 'Not selected';
        return `${formatDate(new Date(Math.min(...times)))} - ${formatDate(new Date(Math.max(...times)))}`;
    };

    const focusTimeText = focusTime?.length === 2
        ? `${formatDate(focusTime[0])} - ${formatDate(focusTime[1])}`
        : computeFocusTimeRange(localNews);

    const publicationTimeText = publicationTime?.length === 2
        ? `${formatDate(publicationTime[0])} - ${formatDate(publicationTime[1])}`
        : 'Not selected';

    useEffect(() => { setLocalNews(news); }, [news]);

    // ── Sentiment ──────────────────────────────────────────────
    const fetchSentiment = async () => {
        if (!keywords?.length || !publicationTime?.length) return;
        setSentimentLoading(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/naas/aspect-sentiment`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({
                    keywords,
                    start_date: toYMD(publicationTime[0]),
                    end_date: toYMD(publicationTime[1]),
                }),
            });
            const data = await response.json();
            const timelines = data.timelines || {};
            const allDates = [...new Set(
                Object.values(timelines).flatMap(pts => pts.map(p => p.date))
            )].sort();
            const colors = generateUniqueColors(Object.keys(timelines).length);
            const datasets = Object.entries(timelines).map(([keyword, points], i) => ({
                id: keyword,
                label: keyword,
                data: allDates.map(date => {
                    const pt = points.find(p => p.date === date);
                    return pt ? pt.sentiment : null;
                }),
                borderColor: colors[i],
                backgroundColor: colors[i],
                borderDash: [5, 5],
                fill: false,
            }));
            setSentimentData({ labels: allDates, datasets });
            setArticleCounts(data.article_counts || []);
        } catch (err) {
            console.error('Sentiment fetch failed:', err);
        } finally {
            setSentimentLoading(false);
        }
    };

    const handleRemoveDataset = (datasetId) => {
        setSentimentData(prev => ({
            ...prev,
            datasets: prev.datasets.filter(d => d.id !== datasetId),
        }));
    };

    // ── Explore ────────────────────────────────────────────────
    const fetchSemanticSearch = async () => {
        if (!exploreQuery.trim()) return;
        setSearchLoading(true);
        setStoryChain(null);
        setSearchResults([]);
        try {
            const res = await fetch(`${process.env.REACT_APP_API_URL}/graphrag/search`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ query: exploreQuery, top_k: 10 }),
            });
            const data = await res.json();
            setSearchResults(data.results || []);
        } catch (err) {
            console.error('Semantic search failed:', err);
        } finally {
            setSearchLoading(false);
        }
    };

    const fetchStoryChain = async (articleId) => {
        setStoryLoading(true);
        try {
            const res = await fetch(`${process.env.REACT_APP_API_URL}/graphrag/story_chain`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ seed_article_id: articleId, max_articles: 15 }),
            });
            const data = await res.json();
            setStoryChain(data);
        } catch (err) {
            console.error('Story chain failed:', err);
        } finally {
            setStoryLoading(false);
        }
    };

    // ── Tab switching ──────────────────────────────────────────
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === 'sentiment' && sentimentData.datasets.length === 0) {
            fetchSentiment();
        }
    };

    return (
        <div className='h-full'>
            <img src={background} alt='background' className='absolute -z-50 opacity-20 object-cover w-full h-full' />
            <Sidebar />
            <Logo />

            <div className='flex flex-col pl-14 md:pl-0 md:flex-row w-11/12 mx-auto gap-4'>
                {/* Left column - Map */}
                <div className='md:w-3/5 w-full'>
                    <div className='bg-colorMapHeaderBG p-5 mb-4 rounded-lg text-xl'>
                        <div className='flex flex-row text-gray-700 mb-1 p-0.5'>
                            <p className='font-bold'>Focus time:</p>
                            <p className='ml-10'>{focusTimeText}</p>
                        </div>
                        <div className='flex flex-row text-gray-700 mb-1 p-0.5'>
                            <p className='font-bold'>Publication time:</p>
                            <p className='ml-10'>{publicationTimeText}</p>
                        </div>
                    </div>
                    <MapComponent news={localNews} />
                </div>

                {/* Right column - Tabs */}
                <div className='md:w-2/5 w-full flex flex-col gap-5'>
                    <CurrentSearch />

                    {/* Tab switcher */}
                    <div className='flex border-b-2 border-gray-200'>
                        {['news', 'sentiment', 'explore'].map(tab => (
                            <button
                                key={tab}
                                className={`px-5 py-2 text-lg font-medium capitalize transition-colors ${activeTab === tab ? 'border-b-2 border-black -mb-px' : 'text-gray-500 hover:text-black'}`}
                                onClick={() => handleTabChange(tab)}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* News tab */}
                    {activeTab === 'news' && <NewsList />}

                    {/* Sentiment tab */}
                    {activeTab === 'sentiment' && (
                        <div className='flex flex-col gap-4'>
                            {sentimentLoading ? (
                                <div className='flex justify-center items-center h-40'>
                                    <span className='text-gray-500'>Loading sentiment data...</span>
                                </div>
                            ) : sentimentData.datasets.length === 0 ? (
                                <div className='flex justify-center items-center h-40'>
                                    <span className='text-gray-500'>No sentiment data for selected keywords</span>
                                </div>
                            ) : (
                                <>
                                    <DashedLineChart
                                        data={sentimentData}
                                        setData={setSentimentData}
                                        handleRemoveDataset={handleRemoveDataset}
                                    />
                                    {articleCounts.length > 0 && (
                                        <div className='mt-2'>
                                            <h3 className='text-lg font-semibold mb-2'>Article counts</h3>
                                            <div className='flex flex-wrap gap-2'>
                                                {articleCounts.map(({ keyword, count }, i) => (
                                                    <span key={`${keyword}-${i}`} className='bg-colorMapHeaderBG px-3 py-1 rounded-full text-sm'>
                                                        {keyword}: {count}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Explore tab */}
                    {activeTab === 'explore' && (
                        <div className='flex flex-col gap-4 min-h-[calc(100vh-18.5rem)]'>

                            {/* Search bar */}
                            <div className='flex gap-2'>
                                <input
                                    type='text'
                                    value={exploreQuery}
                                    onChange={e => setExploreQuery(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && fetchSemanticSearch()}
                                    placeholder='Search by meaning — e.g. "protests in Karachi"'
                                    className='flex-1 border border-gray-300 rounded-lg px-4 py-2 text-base focus:outline-none focus:border-black'
                                />
                                <button
                                    onClick={fetchSemanticSearch}
                                    disabled={searchLoading}
                                    className='px-4 py-2 bg-black text-white rounded-lg text-base font-medium disabled:opacity-50'
                                >
                                    {searchLoading ? '...' : 'Search'}
                                </button>
                            </div>

                            {/* Story chain view */}
                            {storyChain && (
                                <div className='flex flex-col gap-3 overflow-auto'>
                                    <div className='flex items-center gap-3'>
                                        <button
                                            onClick={() => setStoryChain(null)}
                                            className='text-sm text-gray-500 hover:text-black flex items-center gap-1'
                                        >
                                            ← Back to results
                                        </button>
                                    </div>

                                    <div className='bg-colorMapHeaderBG rounded-lg p-3 text-sm'>
                                        <p className='font-semibold text-base mb-1'>Story Chain</p>
                                        <p className='text-gray-600'>
                                            {storyChain.total_articles} articles
                                            {storyChain.date_range?.span_days > 0 && ` · ${storyChain.date_range.span_days} days`}
                                        </p>
                                        {storyChain.shared_entities?.length > 0 && (
                                            <div className='flex flex-wrap gap-1 mt-2'>
                                                {storyChain.shared_entities.slice(0, 6).map((e, i) => (
                                                    <span key={`${e}-${i}`} className='bg-white border border-gray-200 px-2 py-0.5 rounded-full text-xs'>{e}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {storyLoading ? (
                                        <div className='flex justify-center items-center h-32'>
                                            <span className='text-gray-500'>Building story chain...</span>
                                        </div>
                                    ) : (
                                        <div className='flex flex-col gap-2 overflow-auto max-h-[calc(100vh-26rem)]'>
                                            {storyChain.timeline?.map((item, idx) => (
                                                <div key={item.article_id} className='border border-gray-200 rounded-lg p-3 bg-white'>
                                                    <div className='flex items-start gap-2'>
                                                        <span className='text-xs text-gray-400 font-mono mt-0.5 shrink-0'>
                                                            {String(idx + 1).padStart(2, '0')}
                                                        </span>
                                                        <div className='flex flex-col gap-1 min-w-0'>
                                                            <p className='text-sm font-medium leading-snug line-clamp-2'>{item.title}</p>
                                                            <p className='text-xs text-gray-400'>{formatDate(item.date)}</p>
                                                            {item.entities?.length > 0 && (
                                                                <div className='flex flex-wrap gap-1 mt-1'>
                                                                    {item.entities.slice(0, 4).map((e, i) => (
                                                                        <span key={e.name || i} className='bg-gray-100 px-1.5 py-0.5 rounded text-xs text-gray-600'>
                                                                            {e.name}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Search results */}
                            {!storyChain && (
                                <div className='flex flex-col gap-3 overflow-auto max-h-[calc(100vh-22rem)]'>
                                    {searchLoading && (
                                        <div className='flex justify-center items-center h-32'>
                                            <span className='text-gray-500'>Searching...</span>
                                        </div>
                                    )}

                                    {!searchLoading && searchResults.length === 0 && exploreQuery && (
                                        <div className='flex justify-center items-center h-32'>
                                            <span className='text-gray-500'>No results found</span>
                                        </div>
                                    )}

                                    {!searchLoading && searchResults.length === 0 && !exploreQuery && (
                                        <div className='flex justify-center items-center h-32 text-center'>
                                            <span className='text-gray-400 text-sm'>Search by meaning across all articles.<br />Results are ranked by semantic similarity.</span>
                                        </div>
                                    )}

                                    {searchResults.map(result => (
                                        <div key={result.article_id} className='border border-gray-200 rounded-lg p-3 bg-white hover:border-gray-400 transition-colors'>
                                            <p className='text-sm font-medium leading-snug line-clamp-2 mb-1'>{result.title}</p>
                                            <div className='flex items-center gap-2 text-xs text-gray-400 mb-2'>
                                                <span className='capitalize'>{result.source}</span>
                                                {result.published_date && <><span>·</span><span>{formatDate(result.published_date)}</span></>}
                                                <span>·</span>
                                                <span className='text-green-600 font-medium'>{(result.similarity_score * 100).toFixed(0)}% match</span>
                                            </div>
                                            {result.entities?.length > 0 && (
                                                <div className='flex flex-wrap gap-1 mb-2'>
                                                    {result.entities.slice(0, 4).map((e, i) => (
                                                        <span key={e.name || i} className='bg-gray-100 px-1.5 py-0.5 rounded text-xs text-gray-600'>
                                                            {e.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            <button
                                                onClick={() => fetchStoryChain(result.article_id)}
                                                className='text-xs text-black underline hover:text-gray-600 mt-1'
                                            >
                                                View story chain →
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default NewsAnalytics;