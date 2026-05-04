import React, { useState } from 'react';
import { FaEnvelope, FaLock } from 'react-icons/fa';
import background from '../assets/background.png';
import logo from '../assets/NAaas-logo.png';
import { useNavigate } from "react-router-dom"; 
import axios from 'axios';

const SignIn = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password
                })
            });
            if (response.status === 200) {
                const data = await response.json();
                localStorage.setItem('token', data.access_token);
                navigate('/map-input');
            } else if (response.status === 401) {
                alert('Invalid email or password');
            } else {
                alert('Login failed. Please try again.');
            }
        } catch (error) {
            console.error("Error logging in:", error);
        }
    };

    const gotoSignUp = () => {
        navigate("/SignUp"); 
    };

    const gotoLandingPage = () => {
        navigate("/"); 
    };

    const GoToForgotPassword = () => {
        navigate("/ForgotPassword"); 
    };

    return (
        <div
            className="relative w-full h-screen flex justify-center items-center bg-cover"
            style={{ backgroundImage: `url(${background})` }}
        >
            <div className="absolute top-12 left-0 p-3">
                <img src={logo} alt="Logo" className="h-20" onClick={gotoLandingPage} />
            </div>
            <div className="bg-transparent p-8 w-full max-w-md">
                <div className="text-custom-blue text-[32px] font-Poppins text-2xl font-extrabold mb-4 text-center" style={{ marginBottom: "15%" }}>
                    Log In
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4 relative">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email"></label>
                        <div className="flex items-center border-b border-gray-300 py-2">
                            <FaEnvelope className="text-gray-500 mr-2" />
                            <input
                                className="appearance-none bg-transparent border-none w-full text-gray-700 py-1 px-2 leading-tight focus:outline-none"
                                id="email"
                                name="email"
                                type='text'
                                placeholder="Enter your email"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    <div className="mb-4 relative">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password"></label>
                        <div className="flex items-center border-b border-gray-300 py-2">
                            <FaLock className="text-gray-500 mr-2" />
                            <input
                                className="appearance-none bg-transparent border-none w-full text-gray-700 py-1 px-2 leading-tight focus:outline-none"
                                id="password"
                                name="password"
                                type="password"
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                        <label className="inline-flex items-center">
                            <input type="checkbox" className="form-checkbox h-5 w-5 text-gray-600" />
                            <span className="ml-2 text-gray-700">Remember me</span>
                        </label>
                        <a href="#" className="inline-block align-baseline font-bold text-sm text-black hover:text-blue-800"
                            onClick={GoToForgotPassword}
                        >
                            Forgot password?
                        </a>
                    </div>
                    <button
                        className="bg-custom-blue hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-full w-full"
                        style={{ marginTop: "8%" }}
                        type="submit"
                    >
                        Login Now
                    </button>
                </form>
                <div className="text-center mt-5 text-lg">
                    <p>Not a member?</p>
                    <a href="#" className="text-black mt-5 hover:text-custom-blue" onClick={gotoSignUp}>Sign Up!</a>
                    <p className="mt-4">
                        <a href="#" className="text-black font-bold">Terms of use</a> · <a href="#" className="text-black font-bold">Privacy Policy</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SignIn;
