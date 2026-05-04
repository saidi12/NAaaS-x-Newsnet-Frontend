// App.js
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MapInput from './components/MapInput';
import { Provider } from 'react-redux';
import store from './store/Store';
import LandingPage from './pages/LandingPage'
import NewsAnalytics from './components/NewsAnalytics'
import './App.css';
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ChangePassword from './pages/ChangePassword'
import Error404 from './pages/error404'
import Feedback from './pages/Feedback'
import ContactUs from './pages/ContactUs'
import UserProfile from './pages/UserProfile';
import History from './components/History';import HelpAndSupport from './pages/HelpandSupport'
import Discover from './pages/Discover';
import Nexus from './pages/Nexus';

function App() {
  return (
    <div className="App min-h-screen flex flex-col">
      <Provider store={store}>
        <BrowserRouter>
          <Routes>
            <Route path='/map-input' element={<MapInput />} />
            <Route path="/" element={<LandingPage />} />
            <Route path="/SignIn" element={<SignIn />} />
            <Route path="/SignUp" element={<SignUp />} />
            <Route path="/VerifyEmail" element={<VerifyEmail />} />
            <Route path="/ForgotPassword" element={<ForgotPassword />} />
            <Route path="/ChangePassword" element={<ChangePassword />} />
            <Route path="*" element={<Error404 />} />
            <Route path='/news-analytics' element={<NewsAnalytics />} />
            <Route path='/Feedback' element={<Feedback />} />
            <Route path='/ContactUs' element={<ContactUs />} />
            <Route path='/UserProfile' element={<UserProfile />} />
            <Route path='/History' element={<History />}/>
            <Route path='/HelpAndSupport' element={<HelpAndSupport />}/>
            <Route path='/Discover' element={<Discover />}/>
            <Route path='/Nexus' element={<Nexus />}/>
        </Routes>
        </BrowserRouter>
      </Provider>
    </div>
  );
}

export default App;
