import React, { useEffect, useState } from 'react';
import Select from 'react-select';
import Dropdown from 'react-multilevel-dropdown';
import { useDispatch, useSelector } from 'react-redux';
import { setNewsSource } from '../store/reducers/MapReducer'
import { setRegionSelected } from '../store/reducers/MapReducer'
import { setFocusTimeRedux } from '../store/reducers/MapReducer';
import { setPublicationTimeRedux } from '../store/reducers/MapReducer';
import { setKeyWordsOptions } from '../store/reducers/MapReducer';
import { toast } from 'react-hot-toast'
import { format } from 'date-fns';
import Tooltip from '@mui/material/Tooltip';
import DateRangePicker from '@wojtekmaj/react-daterange-picker';
import '@wojtekmaj/react-daterange-picker/dist/DateRangePicker.css';
import 'react-calendar/dist/Calendar.css';

function NewsSourceInput() {
    const [selectedNewsSource, setSelectedNewsSource] = useState(useSelector(state => state.map.newsSource)); // default value of stored news source
    const [focusTime, setFocusTime] = useState(useSelector(state => state.map.focusTime).map(time => new Date(time)));
    const [publicationTime, setPublicationTime] = useState(useSelector(state => state.map.publicationTime).map(time => new Date(time)));
    const [focusTimeValue, setFocusTimeValue] = useState(useSelector(state => state.map.focusTime).map(time => new Date(time)));
    const [publicationTimeValue, setPublicationTimeValue] = useState(useSelector(state => state.map.publicationTime).map(time => new Date(time)));
    const [regions, setRegions] = useState([]);
    const regionSelected = useSelector(state => state.map.regionSelected);
    const showRegionsAndKeyWords = selectedNewsSource && (focusTime.length > 0 || publicationTime.length > 0);
    const dispatch = useDispatch();

    useEffect(() => {
        const fetchData = async () => {
            if (selectedNewsSource) {
                dispatch(setNewsSource(selectedNewsSource)); // set in store

                // reset region selected
                dispatch(setRegionSelected(null));

                const url = `${process.env.REACT_APP_API_URL}/naas/initial-data?source=${selectedNewsSource}`;
                try {
                    const loadToast = toast.loading("Fetching locations")
                    const response = await fetch(url, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
                    });

                    if (response.ok) {
                        toast.success('Locations fetched successfully', { id: loadToast });
                    } else {
                        toast.error('Error fetching locations', { id: loadToast });
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    const data = await response.json();

                    // set regions
                    setRegions(data.locations || []);
                } catch (error) {
                    console.error('Error fetching keywords and locations data:', error);
                }
            }
        };

        if (!selectedNewsSource) {
            dispatch(setRegionSelected(null));
            dispatch(setKeyWordsOptions([]));
        }
        fetchData();
    }, [selectedNewsSource]);

    useEffect(() => {
        if (focusTime.length > 0) {
            const timestamp1 = focusTime[0].getTime(); // Convert first Date object to timestamp
            const timestamp2 = focusTime[1].getTime(); // Convert second Date object to timestamp

            dispatch(setFocusTimeRedux([timestamp1, timestamp2]));
        }
        else {
            dispatch(setFocusTimeRedux([]));
        }
    }, [focusTime])

    useEffect(() => {
        if (publicationTime.length > 0) {
            const timestamp1 = publicationTime[0].getTime(); // Convert first Date object to timestamp
            const timestamp2 = publicationTime[1].getTime(); // Convert second Date object to timestamp

            dispatch(setPublicationTimeRedux([timestamp1, timestamp2]));
        }
        else {
            dispatch(setPublicationTimeRedux([]));
        }

        // fetch keywords according to the publication time and source
        const fetchKeyWords = async () => {
            if (selectedNewsSource && publicationTime.length > 0) {
                const data = {
                    "start_date": formatDateForDB(new Date(publicationTime[0])),
                    "end_date": formatDateForDB(new Date(publicationTime[1])),
                    "source": selectedNewsSource
                }

                try {
                    const load_toast = toast.loading("Fetching keywords")
                    const response = await fetch(`${process.env.REACT_APP_API_URL}/naas/keywords`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
                        },
                        body: JSON.stringify(data),
                    })

                    if (response.ok) {
                        toast.success('Keywords fetched successfully', {
                            id: load_toast,
                        });
                    }
                    else {
                        toast.error('Error fetching keywords', {
                            id: load_toast,
                        })
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }

                    const responseData = await response.json();

                    const keywords = extractWords(responseData)
                    // remove duplicates
                    const uniqueKeywords = [...new Set(keywords)];
                    console.log(uniqueKeywords)

                    // set in store
                    dispatch(setKeyWordsOptions(uniqueKeywords));
                }
                catch {

                }
            }
        }

        fetchKeyWords();
    }, [publicationTime, selectedNewsSource])

    const extractWords = (data) => {
        return data.keywords || [];
    };

    const formatDateForDB = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleRadioClick = (value) => {
        setSelectedNewsSource(prevValue => prevValue === value ? null : value);
    };

    const groupRegionsByType = (regions) => {
        return [{
            label: 'Locations',
            options: regions.map(r => ({ value: r.name, label: r.name }))
        }];
    };

    const groupedOptions = groupRegionsByType(regions);

    const handleFocusDateChange = (dates) => {
        if (dates) {
            setFocusTime(dates)
            setFocusTimeValue(dates)
        }
        else {
            setFocusTime([])
            setFocusTimeValue([]);
        }
    };


    const handlePublicationDateChange = (dates) => {
        if (dates) {
            setPublicationTime(dates)
            setPublicationTimeValue(dates)
        }
        else {
            setPublicationTime([])
            setPublicationTimeValue([]);
        }
    };

    const formatDate = (date) => {
        return date ? format(date, 'MMM d, yyyy') : ''; // Adjust format as needed
    };

    const getTimeTitle = () => {
        if (focusTimeValue || publicationTimeValue) {
            // Assuming focusTimeValue and publicationTimeValue are arrays of Date objects
            const formattedFocusTime = focusTimeValue ? formatDate(focusTimeValue[0]) + ' - ' + formatDate(focusTimeValue[1]) : '';
            const formattedPublicationTime = publicationTimeValue ? formatDate(publicationTimeValue[0]) + ' - ' + formatDate(publicationTimeValue[1]) : '';

            if (focusTimeValue.length && publicationTimeValue.length) {
                return `${formattedFocusTime}, ${formattedPublicationTime}`; // Both times selected
            } else if (focusTimeValue.length || publicationTimeValue.length) { // Only one time selected
                if (focusTimeValue.length) {
                    return formattedFocusTime
                }
                return formattedPublicationTime;
            }
        }
        return 'Choose Time'; // No times selected
    };

    const customSelectStyles = {
        control: (provided) => ({
            ...provided,
            padding: '10px',
            cursor: 'pointer',
            '&:hover': {
                cursor: 'pointer'
            }
        }),
    };

    const customSelectStylesRegion = {
        control: (provided) => ({
            ...provided,
            padding: '10px',
            cursor: 'pointer',
            overflow: 'hidden', // Hide overflow
            '&:hover': {
                cursor: 'pointer'
            },
        }),
        placeholder: (provided) => ({
            ...provided,
            overflow: 'hidden', // Hide overflow
            textOverflow: 'ellipsis', // Add ellipsis if text overflows
            whiteSpace: 'nowrap', // Prevent wrapping of text
        }),
        input: (provided) => ({
            ...provided,
            overflow: 'hidden', // Hide overflow
            textOverflow: 'ellipsis', // Add ellipsis if text overflows
            whiteSpace: 'nowrap', // Prevent wrapping of text
        }),
    };


    return (
        <div>
            {/* Desktop view */}
            <div className='hidden h-30 w-1/2 mx-auto md:flex flex-col'>
                <p className='h-1/5 font-bold text-3xl'>Choose a source</p>
                <div className='h-4/5 flex flex-1 w-full items-center gap-3 text-2xl'>

                    <div className='h-20 flex-1 flex justify-evenly items-center border-8 border-colorMapHeaderBG rounded-lg bg-white'>
                        <div className='flex gap-2 items-center'>
                            <input
                                className='h-5 w-5 hover:cursor-pointer'
                                type='radio'
                                id='Dawn'
                                value='Dawn'
                                checked={selectedNewsSource === 'Dawn'}
                                onChange={() => handleRadioClick('Dawn')} // Add onChange handler to update the selected value
                            />
                            <label className='h-fit' htmlFor='Dawn'>Dawn</label>
                        </div>
                        <div className='flex gap-2 items-center'>
                            <input
                                className='h-5 w-5 hover:cursor-pointer'
                                type='radio'
                                id='Geo'
                                value='Geo'
                                checked={selectedNewsSource === 'Geo'}
                                onChange={() => handleRadioClick('Geo')} // Add onChange handler to update the selected value
                            />
                            <label className='h-fit' htmlFor='Geo'>Geo</label>
                        </div>

                        <div className='flex gap-2 items-center'>
                            <input
                                className='h-5 w-5 hover:cursor-pointer'
                                type='radio'
                                id='Tribune'
                                value='Tribune'
                                checked={selectedNewsSource === 'Tribune'}
                                onChange={() => handleRadioClick('Tribune')} // Add onChange handler to update the selected value
                            />
                            <label className='h-fit' htmlFor='Tribune'>Tribune</label>
                        </div>
                    </div>

                    <div className='h-full flex-1 border-8 border-colorMapHeaderBG rounded-lg bg-white'>
                        <Dropdown
                            title={getTimeTitle()}
                            className='text-left h-16 text-gray-500 p-4 text-2xl overflow-x-auto whitespace-nowrap w-72 custom-scrollbar overflow-y-hidden'
                            position='right'
                        >
                            <Dropdown.Item className='text-xl px-16 text-center py-2'>
                                Focus Time
                                <Dropdown.Submenu position='right' className='w-fit'>
                                    <Dropdown.Item>
                                        <DateRangePicker value={focusTimeValue} onChange={handleFocusDateChange} />
                                    </Dropdown.Item>
                                </Dropdown.Submenu>
                            </Dropdown.Item>
                            <Dropdown.Item className='text-xl px-16 py-2'>
                                Publication Time
                                <Dropdown.Submenu position='right' className='w-fit'>
                                    <Dropdown.Item>
                                        <DateRangePicker value={publicationTimeValue} onChange={handlePublicationDateChange} />
                                    </Dropdown.Item>
                                </Dropdown.Submenu>
                            </Dropdown.Item>
                        </Dropdown>
                    </div>

                    {/* <Tooltip
                        title={!showRegionsAndKeyWords ? <span className='text-xl'>Please select a source and time</span> : ""}
                        placement='top'
                        disableHoverListener={!!showRegionsAndKeyWords}
                    >
                        <div className='h-full flex-1 border-8 border-colorMapHeaderBG rounded-lg'>
                            <Select
                                options={groupedOptions}
                                value={regionSelected ? { value: regionSelected, label: regionSelected } : null}
                                placeholder="Choose Region"
                                styles={customSelectStylesRegion}
                                onChange={(e) => dispatch(setRegionSelected(e.value))}
                                isDisabled={!showRegionsAndKeyWords}
                            />
                        </div>
                    </Tooltip> */}
                </div>
            </div>

            {/* Mobile view */}
            <div className='md:hidden h-30 mx-auto flex flex-col ml-16'>
                <p className='h-1/5 font-bold text-lg text-center'>Choose a source</p>
                <div className='h-4/5 flex flex-col flex-1 w-full items-center gap-3 text-md'>

                    <div className='py-2 w-11/12 flex-1 flex justify-evenly items-center border-8 border-colorMapHeaderBG rounded-lg bg-white'>
                        <div className='flex gap-1 items-center'>
                            <input
                                className='h-3 w-3 hover:cursor-pointer'
                                type='radio'
                                id='Dawn'
                                value='Dawn'
                                checked={selectedNewsSource === 'Dawn'}
                                onChange={() => handleRadioClick('Dawn')} // Add onChange handler to update the selected value
                            />
                            <label className='h-fit' htmlFor='Dawn'>Dawn</label>
                        </div>

                        <div className='flex gap-1 items-center'>
                            <input
                                className='h-3 w-3 hover:cursor-pointer'
                                type='radio'
                                id='Tribune'
                                value='Tribune'
                                checked={selectedNewsSource === 'Tribune'}
                                onChange={() => handleRadioClick('Tribune')} // Add onChange handler to update the selected value
                            />
                            <label className='h-fit' htmlFor='Tribune'>Tribune</label>
                        </div>
                    </div>

                    <div className='w-11/12 flex-1 border-8 border-colorMapHeaderBG rounded-lg bg-white'>
                        <Dropdown
                            title={getTimeTitle()}
                            className='text-left h-16 text-gray-500 p-4 overflow-x-auto whitespace-nowrap w-64 custom-scrollbar overflow-y-hidden'
                            position='right'
                        >
                            <Dropdown.Item className='text-md px-10 text-center py-2'>
                                Focus Time
                                <Dropdown.Submenu position='bottom' className='w-fit'>
                                    <Dropdown.Item>
                                        <DateRangePicker className='text-xs' value={focusTimeValue} onChange={handleFocusDateChange} />
                                    </Dropdown.Item>
                                </Dropdown.Submenu>
                            </Dropdown.Item>
                            <Dropdown.Item className='text-md px-10 py-2'>
                                Publication Time
                                <Dropdown.Submenu position='bottom' className='w-fit'>
                                    <Dropdown.Item>
                                        <DateRangePicker value={publicationTimeValue} onChange={handlePublicationDateChange} />
                                    </Dropdown.Item>
                                </Dropdown.Submenu>
                            </Dropdown.Item>
                        </Dropdown>
                    </div>


                    <div className='w-11/12 h-full flex-1 border-8 border-colorMapHeaderBG rounded-lg'>
                        <Select
                            options={groupedOptions}
                            value={regionSelected ? { value: regionSelected, label: regionSelected } : null}
                            placeholder="Choose Region"
                            styles={customSelectStyles}
                            onChange={(e) => dispatch(setRegionSelected(e.value))}
                            isDisabled={!showRegionsAndKeyWords}
                        />
                    </div>

                </div>
            </div>
        </div>
    );
}

export default NewsSourceInput;