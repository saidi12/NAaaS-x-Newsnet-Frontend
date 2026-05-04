import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import NAAS_logo from '../assets/NAAS_logo.png';

const NavbarLandingPage = ({ isColored }) => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  // Create a ref for the "ABOUT US" section
  const aboutUsRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 580) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsSmallScreen(true);
      } else {
        setIsSmallScreen(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);

    handleResize();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const gotoSignIn = () => {
    navigate("/SignIn");
  };

  const gotoSignUp = () => {
    navigate("/SignUp");
  };

  const GoToContactUS = () => {
    navigate("/ContactUs");
  };

  const GoToLandingPage = () => {
    navigate("/");
  };

  // Function to scroll to the "ABOUT US" section
  const scrollToAboutUs = () => {
    if (aboutUsRef.current) {
      aboutUsRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollLeft = () => {
    document.getElementById('nav-links').scrollBy({ left: -100, behavior: 'smooth' });
  };

  const scrollRight = () => {
    document.getElementById('nav-links').scrollBy({ left: 100, behavior: 'smooth' });
  };

  const scrollToMap=(e)=>{
    e.preventDefault();
    navigate("/Nexus")
  }

  return (
    <div className="w-full z-50 fixed top-0 left-0 px-4 md:px-12 h-20 flex items-center justify-between"
      style={{
        borderBlockStyle: "none",
        background: isColored
          ? "#4c7ca3" // Dark blue if isColored is true
          : scrolled
            ? "#4c7ca3" // Original color if scrolled
            : "linear-gradient(135deg, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.1))",
        boxShadow: scrolled
          ? "none"
          : "0 10px 20px rgba(0, 0, 0, 0.05), 0 25px 50px rgba(0, 0, 0, 0.15)"
      }}
    >
      <div className="logo flex items-center">
        <img src={NAAS_logo} className="w-[100px] h-[50px] md:w-[150px] md:h-[100px]" alt="NAAS Logo" />
      </div>
      <div className="flex items-center space-x-6">
        <div className="hidden md:flex space-x-6">
          <a href="#home" className="text-white hover:text-gray-300 no-underline font-Montserrat text-lg">HOME</a>
          <a href="#pages" onClick={scrollToMap}  className="text-white hover:text-gray-300 no-underline font-Montserrat text-lg">MAP</a>
          <a href="#contact" onClick={GoToContactUS} className="text-white hover:text-gray-300 no-underline font-Montserrat text-lg">CONTACT</a>
          <a href="#about" onClick={scrollToAboutUs} className="text-white hover:text-gray-300 no-underline font-Montserrat text-lg">ABOUT US</a>
        </div>
        <div className="flex md:hidden items-center space-x-2">
          <button onClick={scrollLeft} className="text-white focus:outline-none">
            &#9664;
          </button>
          <div id="nav-links" className="flex space-x-6 overflow-x-scroll no-scrollbar">
            <a href="#home" onClick={GoToLandingPage} className="text-white hover:text-gray-300 no-underline font-Montserrat text-lg">HOME</a>
            <a href="#pages" className="text-white hover:text-gray-300 no-underline font-Montserrat text-lg">PAGES</a>
            <a href="#contact" onClick={GoToContactUS} className="text-white hover:text-gray-300 no-underline font-Montserrat text-lg">CONTACT</a>
            <a href="#about" onClick={scrollToAboutUs} className="text-white hover:text-gray-300 no-underline font-Montserrat text-lg">ABOUT US</a>
          </div>
          <button onClick={scrollRight} className="text-white focus:outline-none">
            &#9654;
          </button>
        </div>
        <button className={`text-white ${scrolled ? 'bg-custom-blue hover:bg-custom-blue' : 'bg-transparent hover:bg-white hover:text-custom-blue'} border-white border px-4 md:px-8 py-1 md:py-2 rounded-full font-Montserrat-SemiBold text-sm md:text-lg`} onClick={gotoSignIn}>Sign In</button>
        <button className={`text-custom-blue text-sm md:text-lg font-semibold ${scrolled ? 'bg-white hover:bg-white' : 'bg-white hover:bg-custom-blue  hover:text-white'} px-4 md:px-8 py-1 md:py-2 rounded-full font-Montserrat-SemiBold`} onClick={gotoSignUp}>Sign Up</button>
      </div>
    </div>
  );
};

export default NavbarLandingPage;
