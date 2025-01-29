import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Logo from '../../layout/Logo';
import Sidebar from '../../components/Vertical-nav/vertical-nav';
import Modal from './Modal';
import BarGraph from './BarGraph';
import HistogramGraph from './HistogramGraph';
import PieChart from './PieChart';
import DashedLineChart from './DashedLineGraph';
import axios from 'axios';
import { format } from 'date-fns';


const generateUniqueColors = (numColors) => {
    const colors = [];
    while (colors.length < numColors) {
        const color = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
        if (!colors.includes(color)) {
            colors.push(color);
        }
    }
    return colors;
};

function Graphs() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState(null);
    const [modalGraphType, setModalGraphType] = useState('');
    const [data, setData] = useState({ labels: [], datasets: [], colors: [], keywords: [] });
    const [barGraphData, setBarGraphData] = useState({ labels: [], datasets: [] });

    const state = useSelector(state => state);
    const formatDate = (date) => {
        return date ? format(new Date(date), 'MMM d, yyyy') : '';
    };

    // converting to Year-Month-Day format
    const QformatDate = (date) => {
        return date ? format(new Date(date), 'yyyy-MM-dd') : '';
    };

    useEffect(() => {
        // Fetch and set data for the DashedLineChart
        const fetchData = async () => {
            try {
                // const startDate = '2024-03-01';
                // const endDate = '2024-06-30';
                // const keywords = ['international', 'airports', 'islamabad'];
                const startDate = QformatDate(formatDate(state.map.publicationTime[0]));
                const endDate = QformatDate(formatDate(state.map.publicationTime[1]));
                const keywords = state.map.keyWordsSearch;

                console.log('Fetching data for:', { startDate, endDate, keywords });

                const dateString = JSON.stringify({
                    startDate,
                    endDate,
                });

                const response = await axios.post(
                    'http://localhost:4000/plotSentiment',
                    JSON.stringify({
                        keywords,
                        date: dateString,
                    }),
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                    }
                );

                const plotData = response.data.plotData;

                // Extract plot data for line charts
                const lineChartData = plotData.filter(item => item.type === 'scatter');
                const allDates = lineChartData.flatMap(series => series.x);
                const uniqueDates = Array.from(new Set(allDates)).sort();
                const uniqueDates2 = uniqueDates.map(dateString => {
                    const date = new Date(dateString);
                    const day = date.getDate();
                    const month = date.toLocaleString('default', { month: 'long' });
                    return `${day} ${month}`;
                });

                const colors = generateUniqueColors(lineChartData.length);

                const newDatasets = lineChartData.map((series, index) => ({
                    id: series.name,
                    label: series.name,
                    data: uniqueDates.map(date => {
                        const dataIndex = series.x.indexOf(date);
                        return dataIndex !== -1 ? series.y[dataIndex] : null;
                    }),
                    borderColor: colors[index],
                    backgroundColor: colors[index],
                    borderDash: [5, 5],
                    fill: false,
                }));

                setData({ labels: uniqueDates2, datasets: newDatasets, colors, keywords });
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, []);

    const fetchBarGraphData = async () => {
        try {

            // Fetch data for the Bar Chart
            const response = await axios.post(
                'https://4rcj8ztc-8080.inc1.devtunnels.ms/plotSentiment',
                JSON.stringify({
                    keywords: data.keywords, // Use existing keywords
                    date: JSON.stringify({
                        startDate: data.startDate,
                        endDate: data.endDate,
                    }),
                }),
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                }
            );
    
            const plotData = response.data.plotData;
    
            // Find bar chart data
            const barData = plotData.find(item => item.type === 'bar');
    
            if (barData && barData.x && barData.y) {
                // Aggregate counts if there are duplicate keywords
                const aggregatedData = aggregateCounts(barData.x, barData.y);
                const labels = Object.keys(aggregatedData);
                const counts = Object.values(aggregatedData);
    
                const datasets = [{
                    label: 'Article Count',
                    data: counts,
                    backgroundColor: generateUniqueColors(labels.length),
                }];
    
                setBarGraphData({ labels, datasets });
            } else {
                console.error('Bar data not found or invalid format:', barData);
            }
        } catch (error) {
            console.error('Error fetching bar graph data:', error);
        }
    };
    
    // Function to aggregate counts for each keyword
    const aggregateCounts = (keywords, counts) => {
        if (!Array.isArray(keywords) || !Array.isArray(counts) || keywords.length !== counts.length) {
            console.error('Invalid keywords or counts format:', { keywords, counts });
            return {};
        }
    
        return keywords.reduce((acc, keyword, index) => {
            if (keyword && typeof counts[index] === 'number') {
                acc[keyword] = (acc[keyword] || 0) + counts[index];
            }
            return acc;
        }, {});
    };
    
   
    
    const handleRemoveDataset = (datasetId) => {
        setData((prevData) => ({
            ...prevData,
            datasets: prevData.datasets.filter((dataset) => dataset.id !== datasetId),
        }));
    };

    return (
        <div className='h-full'>
            <Sidebar />
            <Logo />
            <div className='flex w-11/12 mx-auto gap-4 p-6'>
                <DashedLineChart data={data} setData={setData} handleRemoveDataset={handleRemoveDataset} />

                <div className='w-1/5 ml-5'>
                    <div className='flex flex-col gap-2'>
                        <h2 className='text-xl mb-4 font-semibold'>Other options</h2>
                        <div className='flex flex-col'>
                            <button
                                className='border-2 border-white shadow-bottom-left-right bg-white-200 p-4 text-left text-xl rounded-lg mb-5'
                                onClick={() => {
                                    fetchBarGraphData(); // Fetch new data for the BarGraph
                                    setModalContent(<BarGraph chartData={barGraphData} />);
                                    setModalGraphType('bar'); // Set graph type
                                    setIsModalOpen(true);
                                }}
                            >
                                Bar Chart
                            </button>
                            <button
                                className='border-2 border-white shadow-bottom-left-right bg-white-200 p-4 text-left text-xl rounded-lg mb-5'
                                onClick={() => {
                                    setModalContent(<PieChart chartData={data} />);
                                    setModalGraphType('pie'); // Set graph type
                                    setIsModalOpen(true);
                                }}
                            >
                                Pie Chart
                            </button>
                            <button
                                className='border-2 border-white shadow-bottom-left-right bg-white-200 p-4 text-left text-xl rounded-lg mb-5'
                                onClick={() => {
                                    setModalContent(<HistogramGraph chartData={data} />);
                                    setModalGraphType('histogram'); // Set graph type
                                    setIsModalOpen(true);
                                }}
                            >
                                Histogram Chart
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} graphType={modalGraphType}>
                {modalContent}
            </Modal>
        </div>
    );
}

export default Graphs;
