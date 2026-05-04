// import React, { useState, useRef } from 'react';
// import ChatBotLogo from '../assets/chatbot-logo.png';
// import ChatBot from '../assets/chat-bot.png'
// import cross from '../assets/close-white.png'
// import send from '../assets/arrow.png'

// const Chatbot = () => {
//     const [showChatbot, setShowChatbot] = useState(false);
//     const [messages, setMessages] = useState([]);
//     const [input, setInput] = useState('');
//     const [loading, setLoading] = useState(false); // New loading state
//     const textareaRef = useRef(null);

//     const toggleChatbot = () => {
//         setShowChatbot(!showChatbot);
//     };

//     const handleInputChange = (e) => {
//         const textarea = textareaRef.current;
//         textarea.style.height = 'auto';
//         const lineHeight = parseInt(getComputedStyle(textarea).lineHeight, 10);
//         const maxHeight = lineHeight * 4; // Assuming 4 lines max
//         textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
//         textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
//         setInput(e.target.value);
//     };

//     const sendMessage = async () => {
//         if (input.trim() === '') return;

//         // Set the prompt
//         const data = {
//             prompt: input
//         };

//         // Add user message to the chat
//         const newMessages = [...messages, { sender: 'user', text: input }];
//         setMessages(newMessages);
//         setInput('');
//         setLoading(true); // Set loading to true

//         try {
//             const response = await fetch(`${process.env.REACT_APP_CHATBOT_URL}`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify(data),
//             });

//             const responseData = await response.json();
//             console.log(responseData);

//             // Add bot response to the chat
//             setMessages([...newMessages, { sender: 'bot', text: responseData.response }]);
//         } catch (error) {
//             console.error('Error:', error);
//         } finally {
//             setLoading(false); // Set loading to false after response is processed
//         }
//     };

//     return (
//         <>
//             {/* Chatbot button */}
//             {(!showChatbot) && (
//                 <button
//                     onClick={toggleChatbot}
//                     className="fixed bottom-0 right-0 md:mr-8 md:mb-2 mr-1 mb-1"
//                 >
//                     <img src={ChatBotLogo} alt="Chatbot" className='md:h-20 h-10' />
//                 </button>
//             )}

//             {/* Chatbot window */}
//             {showChatbot && (
//                 <div className="fixed bottom-0 right-0 ml-16 md:mb-4 md:mr-4 md:ml-0 bg-white border border-gray-300 rounded-lg shadow-lg min-h-[600px] md:min-h-[0px] max-h-[500px] flex flex-col bg-chat-bot-gradient">
//                     {/* Chatbot header */}
//                     <div className="text-white p-3 rounded-t-lg flex md:gap-44 justify-between items-center border-b border-blue-200">
//                         <img src={ChatBot} alt='chat-bot' className='h-6 md:h-12'></img>
//                         <span className='text-md text-center md:text-4xl font-bold'>NAaaS AI</span>
//                         <button onClick={toggleChatbot} className="text-white font-bold">
//                             <img src={cross} alt='close' className='h-3 md:h-5'></img>
//                         </button>
//                     </div>

//                     {/* Chatbot messages */}
//                     <div className="flex-1 p-3 overflow-y-auto md:custom-scrollbar">
//                         {messages.map((message, index) => (
//                             <div key={index} className={`my-2 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
//                                 <span className={`text-sm md:text-lg inline-block md:max-w-40 px-3 py-2 rounded-lg ${message.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}>
//                                     {message.text}
//                                 </span>
//                             </div>
//                         ))}
//                         {loading && (
//                             <div className="text-left text-gray-100 mt-2">
//                                 <span>...</span> {/* Loading indicator */}
//                             </div>
//                         )}
//                     </div>

//                     {/* Chatbot input */}
//                     <div className="bg-colorInputChatbot flex gap-2 px-3 md:px-6 py-2 mx-2 rounded-full">
//                         <textarea
//                             ref={textareaRef}
//                             value={input}
//                             onChange={handleInputChange}
//                             onKeyDown={(e) => {
//                                 if (e.key === 'Enter') {
//                                     e.preventDefault(); // Prevent the default action (new line)
//                                     sendMessage(); // Call sendMessage function
//                                 }
//                             }}
//                             placeholder="Message NAaas AI"
//                             className="flex-1 bg-transparent focus:outline-none text-white text-sm pt-1 md:pt-0 md:text-lg placeholder:text-gray-200 chat-scrollbar"
//                             style={{ resize: 'none', overflow: 'hidden', maxHeight: '8em' }} // Adjust maxHeight as needed
//                             rows={1}
//                         />

//                         <button onClick={sendMessage}>
//                             <img src={send} alt='send' className='h-4 md:h-8' />
//                         </button>
//                     </div>
//                     <div className='text-gray-400 text-xs md:text-sm text-center'>
//                         NAaas AI can make mistakes. Please double check responses.
//                     </div>
//                 </div>
//             )}
//         </>
//     );
// };

// export default Chatbot;
//Downloads Magic gay

import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import ChatBotLogo from '../assets/chatbot-logo.png';
import ChatBot from '../assets/chat-bot.png';
import cross from '../assets/close-white.png';
import send from '../assets/arrow.png';
import lookUpIcon from '../assets/lookup.png';
import Select from 'react-select';

const Chatbot = ({ onToggle, isOpen }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [streamingResponse, setStreamingResponse] = useState('');
    const [selectedArticles, setSelectedArticles] = useState([]);
    const textareaRef = useRef(null);
    const messagesEndRef = useRef(null);
    
    // Get news data from Redux store
    const news = useSelector(state => state.map.news);
    console.log("News data from Redux store:", news);
    
    // Format news for dropdown options - using titles instead of generic labels
    const newsOptions = Array.isArray(news) ? news.map((item, index) => ({
        value: index,
        label: item.title || item.header || `Untitled Article`,
        link: item.link || item.url || `No link available`,
        article: item
    })) : [];

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, streamingResponse]);

    const handleInputChange = (e) => {
        const textarea = textareaRef.current;
        textarea.style.height = 'auto';
        const lineHeight = parseInt(getComputedStyle(textarea).lineHeight, 10);
        const maxHeight = lineHeight * 4; // Assuming 4 lines max
        textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
        textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
        setInput(e.target.value);
    };

    const handleSelectChange = (selected) => {
        setSelectedArticles(selected || []);
    };

    const sendMessage = async () => {
        if (input.trim() === '') return;
        console.log("Current query:", input);

        // Extract the selected article titles (only the title string)
        const selectedLinks = selectedArticles.map(option => option.link);
        const selectedTitles = selectedArticles.map(option => option.label);
        console.log("Selected articles:", selectedLinks );
        

        // Set up the data to send to the backend (new route)
        const data = {
            query: input,
            titles: selectedTitles,
            links: selectedLinks
        };
        console.log("Data sent to backend:", data);

        // Prepare display text for selected articles
        let selectedArticlesText = '';
        if (selectedTitles.length > 0) {
            if (selectedTitles.length <= 2) {
                // Show full titles if only 1-2 selected
                selectedArticlesText = selectedTitles.map(title => `"${title}"`).join(', ');
            } else {
                // Show count if more than 2 selected
                selectedArticlesText = `${selectedTitles.length} selected articles`;
            }
        }
        
        // Add user message to the chat
        const newMessages = [...messages, { 
            sender: 'user', 
            text: input,
            selectedArticles: selectedTitles.length > 0 ? `(Using: ${selectedArticlesText})` : ''
        }];
        
        setMessages(newMessages);
        setInput('');
        setLoading(true);
        setStreamingResponse(''); // Reset streaming response

        try {
            // Call the new route (/query_with_titles) with streaming response
            const response = await fetch('http://localhost:8000/query_with_titles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            // Get a reader from the response body
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedResponse = '';
            let isFirstChunk = true;
            let seedInfo = null;

            // Process the stream
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim());
                
                for (const line of lines) {
                    try {
                        const parsedLine = JSON.parse(line);
                        
                        // Handle the first chunk containing seed article info
                        if (isFirstChunk && parsedLine.seed_article) {
                            isFirstChunk = false;
                            seedInfo = parsedLine;
                            // You can store seedInfo for UI display if needed
                            continue;
                        }
                        
                        // Handle response chunks
                        if (parsedLine.response) {
                            accumulatedResponse += parsedLine.response;
                            setStreamingResponse(accumulatedResponse);
                        }
                        
                        // Handle completion
                        if (parsedLine.done) {
                            setLoading(false);
                            // Add the final response to the messages
                            const finalResponse = parsedLine.final_response || accumulatedResponse;
                            setMessages(prev => [...prev, { sender: 'bot', text: finalResponse }]);
                            setStreamingResponse('');
                        }
                        
                        // Handle errors
                        if (parsedLine.error) {
                            console.error('Error from backend:', parsedLine.error);
                            setMessages(prev => [...prev, { 
                                sender: 'bot', 
                                text: 'Sorry, there was an error processing your request.' 
                            }]);
                            setLoading(false);
                            setStreamingResponse('');
                        }
                    } catch (e) {
                        console.error('Error parsing JSON from stream:', e, line);
                    }
                }
            }
        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, { 
                sender: 'bot', 
                text: 'Sorry, there was an error connecting to the server.' 
            }]);
            setLoading(false);
        }
    };

    const customSelectStyles = {
        // Control (the input area)
        control: (provided) => ({
          ...provided,
          width: '100%',
          minHeight: '44px', // a slightly taller default
          boxShadow: 'none',
          border: '1px solid #ddd',
          '&:hover': {
            border: '1px solid #aaa',
          },
        }),
      
        // ValueContainer (the inner area that holds the placeholder and pills)
        valueContainer: (provided) => ({
          ...provided,
          padding: '0 8px',
        }),
      
        // Menu (the dropdown list)
        menu: (provided) => ({
          ...provided,
          width: '100%', // match control width
          maxHeight: '200px',
          zIndex: 9999,
        }),
      
        // MenuList (the scrollable area of the dropdown)
        menuList: (provided) => ({
          ...provided,
          maxHeight: '200px', // be sure we can scroll if many options
        }),
      
        // Option (individual options in dropdown)
        option: (provided, state) => ({
          ...provided,
          backgroundColor: state.isSelected
            ? '#3b82f6'
            : state.isFocused
            ? '#e0f2fe'
            : 'white',
          color: state.isSelected ? 'white' : '#333',
          cursor: 'pointer',
          fontSize: '0.875rem',
        }),
      
        // Pills for multi select
        multiValue: (provided) => ({
          ...provided,
          backgroundColor: '#bfdbfe',
          borderRadius: '4px',
          margin: '2px',
        }),
        multiValueLabel: (provided) => ({
          ...provided,
          color: '#1e40af',
          fontSize: '0.85rem',
        }),
        multiValueRemove: (provided) => ({
          ...provided,
          color: '#1e40af',
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: '#93c5fd',
            color: '#1e3a8a',
          },
        }),
      };
      

    return (
        <>
            {/* Chatbot button - shown when chatbot is closed */}
            {!isOpen && (
                <button
                    onClick={onToggle}
                    className="fixed bottom-0 right-0 md:mr-8 md:mb-2 mr-1 mb-1"
                >
                    <img src={ChatBotLogo} alt="Chatbot" className='md:h-20 h-10' />
                </button>
            )}

            {/* Chatbot sidebar - shown when chatbot is open */}
            {isOpen && (
                <div className="fixed top-0 right-0 h-full bg-white border-l border-gray-300 shadow-lg w-full md:w-1/3 lg:w-1/4 flex flex-col bg-chat-bot-gradient z-40">
                    {/* Chatbot header */}
                    <div className="text-white p-3 border-b border-blue-200 flex justify-between items-center">
                        <img src={ChatBot} alt='chat-bot' className='h-6 md:h-10'></img>
                        <span className='text-md text-center md:text-xl font-bold'>NAaaS AI</span>
                        <button onClick={onToggle} className="text-white font-bold">
                            <img src={cross} alt='close' className='h-3 md:h-5'></img>
                        </button>
                    </div>

                    {/* News dropdown selection - with improved size and readability */}
                    <div className="p-4 border-b border-blue-200">
                        <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                            <img src={lookUpIcon} alt='lookup' className='w-4 h-5' />
                            <span>{newsOptions.length} articles available</span>
                        </div>
                        <div className="article-select-container w-full">
                            <Select
                                isMulti
                                options={newsOptions}
                                onChange={handleSelectChange}
                                placeholder="Select articles for context..."
                                styles={customSelectStyles}
                                className="news-select"
                                closeMenuOnSelect={false}
                                noOptionsMessage={() => "No articles available"}
                                maxMenuHeight={200}
                            />
                        </div>
                    </div>

                    {/* Chatbot messages - flex-grow to take available space */}
                    <div className="flex-grow p-3 overflow-y-auto md:custom-scrollbar">
                        {messages.map((message, index) => (
                            <div key={index} className={`my-2 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
                                <span className={`text-sm md:text-base inline-block max-w-xs md:max-w-sm px-3 py-2 rounded-lg ${message.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}>
                                    {message.text}
                                </span>
                                {message.selectedArticles && (
                                    <div className="text-xs text-gray-500 mt-1">
                                        {message.selectedArticles}
                                    </div>
                                )}
                            </div>
                        ))}
                        {loading && streamingResponse && (
                            <div className="text-left mt-2">
                                <span className="text-sm md:text-base inline-block max-w-xs md:max-w-sm px-3 py-2 rounded-lg bg-gray-300">
                                    {streamingResponse}
                                </span>
                            </div>
                        )}
                        {loading && !streamingResponse && (
                            <div className="text-left text-gray-500 mt-2">
                                <span className="text-sm md:text-base inline-block px-3 py-2 rounded-lg bg-gray-200">
                                    Thinking...
                                </span>
                            </div>
                        )}
                        <div ref={messagesEndRef} /> {/* Auto-scroll anchor */}
                    </div>

                    {/* Chatbot input - fixed at bottom */}
                    <div className="bg-colorInputChatbot flex gap-2 px-3 md:px-4 py-2 mx-2 rounded-full mb-2">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    sendMessage();
                                }
                            }}
                            placeholder="Message NAaas AI"
                            className="flex-1 bg-transparent focus:outline-none text-white text-sm pt-1 md:pt-0 md:text-base placeholder:text-gray-200 chat-scrollbar"
                            style={{ resize: 'none', overflow: 'hidden', maxHeight: '8em' }}
                            rows={1}
                            disabled={loading}
                        />

                        <button 
                            onClick={sendMessage} 
                            disabled={loading || input.trim() === ''}
                            className={loading ? 'opacity-50' : ''}
                        >
                            <img src={send} alt='send' className='h-4 md:h-6' />
                        </button>
                    </div>
                    <div className='text-gray-400 text-xs md:text-sm text-center pb-3'>
                        NAaas AI can make mistakes. Please double check responses.
                    </div>
                </div>
            )}
        </>
    );
};

export default Chatbot;
