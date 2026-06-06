import React, { useState } from 'react';
import background from '../assets/background.png';
import logo from '../assets/NAaas-logo.png';
import { useNavigate } from "react-router-dom"; 

const VerifyEmail = () => {
  const [code, setCode] = useState(new Array(5).fill(''));
  const navigate = useNavigate();

  const handleChange = (e, index) => {
    const value = e.target.value;
    if (value.match(/^[0-9]*$/) && value.length <= 1) {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const verificationCode = code.join('');
    const email = localStorage.getItem('userEmail');

    try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/verify-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, code: verificationCode }),
        });

        if (response.ok) {
            navigate('/map-input');
        } else {
            const errorData = await response.json();
            alert(`Verification failed: ${errorData.error}`);
        }
    } catch (error) {
        console.error("Error verifying email:", error);
    }
};

  const gotoLandingPage = () => {
    navigate("/LandingPage"); 
  };

  return (
    <div className="h-screen bg-cover bg-center flex flex-col items-center" style={{ backgroundImage: `url(${background})` }}>
      <div className="absolute top-12 left-0 p-3">
        <img  onClick={gotoLandingPage} src={logo} alt="Logo" className="h-20 " />
      </div>
      <div className="bg-transparent bg-opacity-90 p-8  text-center mt-12" style={{marginTop:"15%"}} >
        <h2 class="text-zinc-800 text-[40px] font-bold font-Poppins ">Verify Your Email</h2>
        <p className="mb-6 mt-6 text-xl">Please Enter The 5-digit Code Sent To <br/>user@email.com</p>
        <form  className="flex justify-center space-x-6 mb-6">
          {code.map((digit, index) => (
            <input
              key={index}
              type="text"
              maxLength="1"
              value={digit}
              onChange={(e) => handleChange(e, index)}
              className="w-12 h-12 text-center text-xl border-b border-black bg-transparent border-t-0 border-r-0 border-l-0  "
            />
          ))}
        </form>
        <button className="mt-2 text-custom-blue underline hover:text-blue-700">Resend Code</button>
        <button className="w-full bg-custom-blue hover:bg-gray-500 text-white py-2 rounded-3xl pt-2 pb-2 mt-3 text-lg" style={{ marginTop: "5%" }}
         onClick={handleSubmit}
        >
          Verify
        </button>
      </div>
    </div>
  );
};

export default VerifyEmail;
