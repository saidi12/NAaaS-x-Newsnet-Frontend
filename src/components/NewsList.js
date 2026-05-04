import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux';
import Select from 'react-select'
import lookUpIcon from '../assets/lookup.png'
import NewsCard from './NewsCard';
import { toast } from 'react-hot-toast'
import { PropagateLoader } from 'react-spinners';
import { setNewsRedux } from '../store/reducers/MapReducer';
import { useDispatch } from 'react-redux';

function NewsList() {
    const [sortBy, setSortBy] = useState('descending');
    const [sortField, setSortField] = useState('publicationDate');
    const dispatch = useDispatch();

    // search options
    const keywords = useSelector(state => state.map.keyWordsSearch);
    const newsSource = useSelector(state => state.map.newsSource);
    const regionSelected = useSelector(state => state.map.regionSelected);
    const publicationTime = useSelector(state => state.map.publicationTime);

    let useEffectCalled = false;
    const [isLoading, setIsLoading] = useState(false);

    const [news, setNews] = useState([]);

    // const [news, setNews] = useState([
    //     {
    //         title: 'Govt formally authorises ISI to ‘trace, intercept’ calls and messages in ‘interest of national security’',
    //         summary: `The Ministry of Information Technology and Telecommunication has authorised the 
    //         Inter-Services Intelligence (ISI) to intercept and trace calls in the “interest of national security”,
    //         a notification issued in this regard said.`,
    //         focusTime: '2021-07-01T00:00:00Z',
    //         publicationTime: '2024-07-01T00:00:00Z',
    //         topics: ['National Security', 'ISI', 'Telecommunication'],
    //         location: 'Islamabad',
    //         isBiased: true
    //     },
    //     {
    //         title: 'PM Shehbaz urges collective responsibility, int’l recognition of Pakistan’s Afghan refugee ‘burden’',
    //         summary: `Prime Minister Imran Khan on Thursday urged the international community to`,
    //         focusTime: '2021-07-01T00:00:00Z',
    //         publicationTime: '2021-07-02T00:00:00Z',
    //         topics: ['Afghan Refugees', 'Imran Khan', 'International Community'],
    //         location: 'Lahore',
    //         isBiased: true
    //     },
    //     {
    //         title: 'Pakistan’s Covid-19 positivity rate drops to 1.5%',
    //         summary: `Pakistan’s Covid-19 positivity rate dropped to 1.5% on Thursday, the lowest 
    //         in the country since the pandemic began.`,
    //         focusTime: '2021-07-04T00:00:00Z',
    //         publicationTime: '2021-07-03T00:00:00Z',
    //         topics: ['Covid-19', 'Positivity Rate', 'Pandemic'],
    //         location: 'Karachi',
    //         isBiased: false
    //     },
    //     {
    //         title: 'Editorial: Altering the original budget sans parliamentary nod to supplementary statements is not new',
    //         summary: `The government’s decision to present a supplementary budget without parliamentary approval is not new.`,
    //         focusTime: '2021-08-01T00:00:00Z',
    //         publicationTime: '2021-07-04T00:00:00Z',
    //         topics: ['Budget', 'Parliamentary Approval', 'Supplementary Statements'],
    //         location: 'Peshawar',
    //         isBiased: true
    //     }
    // ]);

    const customSelectStyles = {
        control: (provided) => ({
            ...provided,
            padding: '10px',
            backgroundColor: '#dde8f0',
        }),
    };


    useEffect(() => {
        const sortNews = () => {
            const sortedNews = [...news].sort((a, b) => {
                if (sortField === 'publicationDate') {
                    return sortBy === 'ascending'
                        ? new Date(a.publicationTime) - new Date(b.publicationTime)
                        : new Date(b.publicationTime) - new Date(a.publicationTime);
                } else if (sortField === 'location') {
                    return sortBy === 'ascending'
                        ? (a.focusLocation || '').localeCompare(b.focusLocation || '')
                        : (b.focusLocation || '').localeCompare(a.focusLocation || '');
                }
                return 0;
            });

            return sortedNews;
        };

        setNews(sortNews());
    }, [sortBy, sortField]);

    useEffect(() => {
        if (!useEffectCalled) {
            useEffectCalled = true;

            // fetch news according to the selected filters

            const fetchNews = async () => {
                setIsLoading(true);

                const requestBody = {
                    start_date: timestampToDate(publicationTime[0]),
                    end_date: timestampToDate(publicationTime[1]),
                    topics: keywords,
                    location: regionSelected || null,
                    source: newsSource,
                    limit: 100,
                }

                try {
                    const load_toast = toast.loading("Fetching news");
                    const response = await fetch(`${process.env.REACT_APP_API_URL}/naas/search/articles`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
                        },
                        body: JSON.stringify(requestBody),
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }

                    const responseData = await response.json();

                    if (responseData) {
                        toast.success('News fetched successfully', {
                            id: load_toast
                        })
                        const formatted = setNewsState(responseData);
                        dispatch(setNewsRedux(formatted));
                    }
                    else {
                        toast.success('News fetched successfully', {
                            id: load_toast
                        })
                        setNewsState([]);
                    }
                }
                catch (error) {
                    console.error('Error fetching news:', error);
                }
                finally {
                    setIsLoading(false);
                }
            }
            fetchNews();
        }
    }, [])

    useEffect(() => {
        // if keywords change, update the news accordingly
        const filteredNews = news.filter(newsItem =>
            newsItem.topics.some(topic => keywords.includes(topic))
        );
        setNews(filteredNews);
        dispatch(setNewsRedux(filteredNews));
    }, [keywords])

    const setNewsState = (data) => {
        const formattedNews = data.map(item => {
            return {
                title: item.header,
                summary: item.sentiment_label
                    ? `Sentiment: ${item.sentiment_label} (${item.sentiment?.toFixed(2)})`
                    : '',
                focusTime: item.published_date,
                publicationTime: item.published_date,
                topics: Array.isArray(item.topics) ? item.topics : [],
                focusLocation: item.focus_location || '',
                link: item.link || null,
                isBiased: false,
            };
        });

        setNews(formattedNews);
        return formattedNews;
    }

    const timestampToDate = (timestamp) => {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Dynamic sort options based on the sort field
    const sortOptions = sortField === 'publicationDate'
        ? [
            { value: 'ascending', label: 'Oldest' },
            { value: 'descending', label: 'Latest' },
        ]
        : [
            { value: 'ascending', label: 'Ascending' },
            { value: 'descending', label: 'Descending' },
        ];

    return (
        <div className='flex flex-col gap-5'>
            {/* Sort by container */}
            <div className='flex flex-col md:flex-row md:gap-10 gap-5 md:items-center'>
                <span className='md:text-xl text-lg font-semibold'>
                    Sort by:
                </span>
                <Select
                    options={[
                        { value: 'publicationDate', label: 'Publication Date' },
                        { value: 'location', label: 'Location' },
                    ]}
                    defaultValue={{ value: 'publicationDate', label: 'Publication Date' }}
                    styles={customSelectStyles}
                    onChange={(selectedOption) => setSortField(selectedOption.value)}
                />

                <Select
                    options={sortField === 'publicationDate'
                        ? [
                            { value: 'ascending', label: 'Oldest' },
                            { value: 'descending', label: 'Latest' },
                        ]
                        : [
                            { value: 'ascending', label: 'Ascending' },
                            { value: 'descending', label: 'Descending' },
                        ]
                    }
                    value={{ value: sortBy, label: sortBy === 'ascending' ? (sortField === 'publicationDate' ? 'Oldest' : 'Ascending') : (sortField === 'publicationDate' ? 'Latest' : 'Descending') }}
                    styles={customSelectStyles}
                    onChange={(selectedOption) => setSortBy(selectedOption.value)}
                />
            </div>

            {/* News List */}
            <div className='flex flex-col min-h-[calc(100vh-18.5rem)] max-h-[calc(100vh-18.5rem)] overflow-auto custom-scrollbar'>
                {/* Number of articles */}
                <div className='flex items-center gap-2 text-gray-600 text-lg'>
                    <img src={lookUpIcon} alt='lookup' className='w-6 h-7' />
                    {news.length} articles found
                </div>

                {/* News List */}
                {!isLoading ? (
                    Array.isArray(news) && news.length === 0 ? (
                        <div className='h-full w-full flex justify-center items-center'>
                            <span className='text-gray-500 text-xl font-semibold'>
                                No articles found
                            </span>
                        </div>
                    ) : (
                        Array.isArray(news) && news.map((newsItem, index) => (
                            <NewsCard
                                key={index}
                                index={index + 1}
                                title={newsItem.title}
                                summary={newsItem.summary}
                                focusTime={newsItem.focusTime}
                                publicationTime={newsItem.publicationTime}
                                topics={newsItem.topics}
                                isBiased={newsItem.isBiased}
                            />
                        ))
                    )
                ) : (
                    <div className='h-full w-full flex justify-center items-center'>
                        <PropagateLoader color='#000' />
                    </div>
                )}

            </div>
        </div>
    )
}

export default NewsList
