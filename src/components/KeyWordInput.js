import React, { useState, useEffect } from 'react';
import Select from 'react-select-virtualized';
import SearchIcon from '../assets/search.png';
import SearchBlackIcon from '../assets/searchBlack.png';
import { useDispatch, useSelector } from 'react-redux';
import { pushKeyWordsSearch } from '../store/reducers/MapReducer'
import { useNavigate } from 'react-router-dom';
import { setKeyWordsOptions } from '../store/reducers/MapReducer';
import Tooltip from '@mui/material/Tooltip';

function KeyWordInput() {
    const [isHovered, setIsHovered] = useState(false);
    const [selectedKeywords, setSelectedKeywords] = useState([]);
    const keywords = useSelector(state => state.map.keyWordsSearch);
    const newsSource = useSelector(state => state.map.newsSource);
    const regionSelected = useSelector(state => state.map.regionSelected);
    const focusTime = useSelector(state => state.map.focusTime);
    const publicationTime = useSelector(state => state.map.publicationTime);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const keyWordOptionsRedux = useSelector(state => state.map.keyWordsOptions);

    const isDisabled = (!keyWordOptionsRedux || keyWordOptionsRedux.length === 0) || (focusTime.length == 0 && publicationTime.length == 0) // disable the input if no news source is selected and if none of times are selected
    const isFourKeywordsSelected = selectedKeywords.length === 4;
    const tooltipMessage = isDisabled
        ? isFourKeywordsSelected
            ? "You have selected 4 keywords"
            : "Please select a source and time"
        : "";

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

    const customSelectStylesMobile = {
        control: (provided) => ({
            ...provided,
            height: '30%', // Set height to 30% of the parent container's height
            minHeight: '30px', // Set a minimum height to ensure it doesn't shrink too small
            padding: '0 10px', // Adjust padding as needed
            cursor: 'pointer',
            '&:hover': {
                cursor: 'pointer'
            }
        }),
        valueContainer: (provided) => ({
            ...provided,
            height: '100%', // Ensure the value container fills the height of the control
            padding: '0', // Remove extra padding
        }),
        placeholder: (provided) => ({
            ...provided,
            margin: '0', // Remove default margin
        }),
        singleValue: (provided) => ({
            ...provided,
            margin: '0', // Remove default margin
        }),
    };

    useEffect(() => {
        // set selected keywords
        if (keywords.length > 0) {
            setSelectedKeywords(keywords.map(keyword => {
                return { value: keyword, label: keyword }
            }));
        }
    }, [])

    useEffect(() => {
        // if selected keywords length is 4 then hide the keyword input
        if (selectedKeywords.length === 4) {
            dispatch(setKeyWordsOptions([]));
        }
    }, [selectedKeywords])

    useEffect(() => {
        if (keywords.length !== 4) {
            // update the keywords so that the selected keywords are filtered from the options
            dispatch(setKeyWordsOptions(keyWordOptionsRedux.filter(keyword => !keywords.includes(keyword))));
        }
    }, [keywords]);

    const handleKeyWordSelect = (selectedOption) => {
        if (selectedOption) {
            setSelectedKeywords((prevKeyWords) => [
                ...prevKeyWords,
                selectedOption,
            ]);

            // set in the store
            dispatch(pushKeyWordsSearch(selectedOption.value));
        }
    };

    const truncateLabel = (label, maxLength) => {
        if (label.length > maxLength) {
            return `${label.substring(0, maxLength)}...`;
        }
        return label;
    };

    const options = keyWordOptionsRedux.map(keyword => ({
        value: keyword,
        label: truncateLabel(keyword, 15),
    }));

    const handleButtonClick = () => {
        if (keywords && newsSource && (focusTime || publicationTime)) {
            navigate('/news-analytics')
        }
        else {
            alert('Select fields to search');
        }
    };

    const handleMouseEnter = () => {
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
    };

    return (
        <div>
            {/* Desktop view */}
            <div className='h-28 hidden text-2xl bg-colorMapHeaderBG rounded-2xl md:flex justify-around w-1/2 mx-auto items-center'>
                <span className='font-bold text-3xl'>Select a word</span>

                {/* Show select only when news source is selected */}

                <Tooltip
                    title={isDisabled ? <span className='text-lg'>{tooltipMessage}</span> : ""}
                    disableHoverListener={!isDisabled} // Tooltip should only be shown if disabled
                    arrow
                >
                    <div className='w-1/3'>
                        <Select
                            options={options}
                            placeholder='i.e. police, protest'
                            className='w-full'
                            onChange={handleKeyWordSelect}
                            styles={customSelectStyles}
                            isDisabled={isDisabled}
                        />
                    </div>
                </Tooltip>

                <button onClick={handleButtonClick}
                    className='flex items-center py-3 px-5 rounded-3xl gap-2 bg-colorSearchButton text-white hover:text-black transition hover:bg-white'
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <img src={isHovered ? SearchBlackIcon : SearchIcon} alt='Search Icon' className='h-5' />
                    Search
                </button>
            </div>

            {/* Mobile view */}
            <div className='ml-16 md:hidden h-28 text-2xl bg-colorMapHeaderBG rounded-2xl flex flex-col justify-around mx-auto items-center'>
                <span className='font-bold text-lg md:text-3xl'>Select a word</span>

                {/* Show select only when news source is selected */}

                <div className='md:w-1/3 w-11/12 text-sm'>
                    <Select
                        options={options}
                        placeholder='i.e. police, protest'
                        className='w-full'
                        onChange={handleKeyWordSelect}
                        styles={customSelectStylesMobile}
                        isDisabled={isDisabled}
                    />
                </div>

                <button onClick={handleButtonClick}
                    className='flex items-center py-1 px-2 rounded-3xl gap-2 bg-colorSearchButton text-sm text-white hover:text-black transition hover:bg-white'
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <img src={isHovered ? SearchBlackIcon : SearchIcon} alt='Search Icon' className='h-3' />
                    Search
                </button>
            </div>
        </div>
    );
}

export default KeyWordInput;