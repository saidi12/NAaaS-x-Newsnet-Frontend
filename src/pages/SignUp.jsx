import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import GIcon from '../assets/GIcon.png';
import logo from '../assets/NAaas-logo.png';
import polygon from '../assets/polygonSignUp.png';
import facebook from '../assets/facebook.png';
import insta from '../assets/instagram.png';
import twitter from '../assets/twitter.png';

const SignUp = () => {

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        firstname: '',
        lastname:'',
        email: '',
        password: '',
        confirmPassword: '',
        occupation: '',
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            alert("Passwords do not match");
            return;
        }
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    first_name: formData.firstname,
                    last_name: formData.lastname,
                    email: formData.email,
                    password: formData.password,
                })
            });
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('token', data.access_token);
                navigate('/map-input');
            } else {
                const errorData = await response.json();
                alert(`Sign up failed: ${errorData.detail || errorData.error}`);
            }
        } catch (error) {
            console.error("Error signing up:", error);
        }
    };
    
    const gotoSignIn = (e) => {
        e.preventDefault();
        navigate("/SignIn");
    };

    const gotoLandingPage = () => {
        navigate("/LandingPage");
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white">
            {/* Header */}
            <div className="absolute top-0 left-0 p-4 w-full flex justify-between items-center bg-white shadow">
                <img onClick={gotoLandingPage} src={logo} alt="Logo" className="h-12" style={{ width: "300px", height: "60px" }} />
                <button className="px-6 py-2 rounded-lg border border-neutral-900" onClick={gotoSignIn}>Log In</button>
            </div>

            {/* Main Content */}
            <div className="flex flex-col lg:flex-row bg-white rounded-lg overflow-hidden w-full lg:w-10/12 mt-20">
                {/* Left Side Image */}
                <div className="hidden lg:flex flex-1 items-center justify-center bg-white">
                    <img src={polygon} alt="Background" className="object-cover h-2/3 w-full" />
                </div>

                {/* Right Side Form */}
                <div className="flex-1 p-6 lg:p-12">
                    <h2 className="font-bold mb-6 text-zinc-800 text-2xl lg:text-3xl">Create an account</h2>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div>
                            <div className="text-stone-500 text-lg font-normal font-Poppins">First Name</div>
                            <input
                                type="text"
                                name="firstname"
                                value={formData.firstname}
                                onChange={handleChange}
                                className="w-full border border-gray-300 px-3 py-2 rounded-lg"
                            />
                        </div>
                        <div>
                            <div className="text-stone-500 text-lg font-normal font-Poppins">Last Name</div>
                            <input
                                type="text"
                                name="lastname"
                                value={formData.lastname}
                                onChange={handleChange}
                                className="w-full border border-gray-300 px-3 py-2 rounded-lg"
                            />
                        </div>
                        <div>
                            <div className="text-stone-500 text-lg font-normal font-Poppins">Email</div>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                        </div>
                        <div>
                            <div className="text-stone-500 text-lg font-normal font-Poppins">Occupation</div>
                            <input
                                type="occupation"
                                name="occupation"
                                value={formData.occupation}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                        </div>
                        <div>
                            <div className="text-stone-500 text-lg font-normal font-Poppins">Password</div>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                        </div>
                        <div>
                            <div className="text-stone-500 text-lg font-normal font-Poppins">Confirm Password</div>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                name="terms"
                                className="form-checkbox"
                            />
                            <p className="text-lg">
                                By creating an account, I agree to the <a href="#" className="text-black underline">Terms of Use</a> and <a href="#" className="text-black underline">Privacy Policy</a>.
                            </p>
                        </div>
                        <button className="w-full bg-gray-400 hover:bg-gray-500 text-white py-2 rounded-3xl text-lg mt-5">
                            Create an account
                        </button>
                    </form>

                    <div className="flex items-center mt-6">
                        <div className="flex-grow border-t border-gray-300"></div>
                        <span className="mx-4 text-stone-500 text-2xl">OR</span>
                        <div className="flex-grow border-t border-gray-300"></div>
                    </div>

                    <div className="w-full h-16 flex justify-center items-center mt-5">
                        <div className="flex items-center gap-4">
                            <img src={GIcon} className="w-6 h-6" alt="Google Icon" />
                            <div className="text-zinc-800 text-2xl font-normal">Continue with Google</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="w-full flex flex-col justify-center items-center gap-10 mt-10 px-4 lg:px-8">
                <div className="w-full h-px bg-stone-500 opacity-25"></div>
                <div className="w-full flex flex-col lg:flex-row lg:justify-start gap-6 lg:gap-36 lg:items-start items-center">
                    <div className="flex flex-col gap-2 lg:items-start items-center">
                        <div className="text-zinc-800 text-base font-normal font-Poppins">Product</div>
                        <div className="text-stone-500 text-sm font-normal font-Poppins hover:text-custom-blue cursor-pointer">Pricing</div>
                        <div className="text-stone-500 text-sm font-normal font-Poppins hover:text-custom-blue cursor-pointer">Solutions</div>
                        <div className="text-stone-500 text-sm font-normal font-Poppins hover:text-custom-blue cursor-pointer">Education</div>
                        <div className="text-stone-500 text-sm font-normal font-Poppins hover:text-custom-blue cursor-pointer">Team plans</div>
                    </div>
                    <div className="flex flex-col gap-2 lg:items-start items-center">
                        <div className="text-zinc-800 text-base font-normal font-Poppins cursor-pointer">About us</div>
                        <div className="text-stone-500 text-sm font-normal font-Poppins hover:text-custom-blue cursor-pointer">About</div>
                        <div className="text-stone-500 text-sm font-normal font-Poppins hover:text-custom-blue cursor-pointer">Branding</div>
                        <div className="text-stone-500 text-sm font-normal font-Poppins hover:text-custom-blue cursor-pointer">Newsroom</div>
                        <div className="text-stone-500 text-sm font-normal font-Poppins hover:text-custom-blue cursor-pointer">Partnerships</div>
                        <div className="text-stone-500 text-sm font-normal font-Poppins hover:text-custom-blue cursor-pointer">Affiliates</div>
                        <div className="text-stone-500 text-sm font-normal font-Poppins hover:text-custom-blue cursor-pointer">Careers</div>
                    </div>
                    <div className="flex flex-col gap-2 items-center lg:items-start">
                        <div className="text-zinc-800 text-base font-normal font-Poppins cursor-pointer">Help and support</div>
                        <div className="text-stone-500 text-sm font-normal font-Poppins hover:text-custom-blue cursor-pointer">Help center</div>
                        <div className="text-stone-500 text-sm font-normal font-Poppins hover:text-custom-blue cursor-pointer">Contact us</div>
                        <div className="text-stone-500 text-sm font-normal font-Poppins hover:text-custom-blue cursor-pointer">Security</div>
                        <div className="text-stone-500 text-sm font-normal font-Poppins hover:text-custom-blue cursor-pointer">FAQs</div>
                        <div className="text-stone-500 text-sm font-normal font-Poppins hover:text-custom-blue cursor-pointer">Status</div>
                    </div>
                    <div className="flex flex-col gap-2 items-center lg:items-start">
                        <div className="text-zinc-800 text-base font-normal font-Poppins cursor-pointer">Social</div>
                        <div className="flex gap-4">
                            <img src={facebook} className="w-8 h-8 cursor-pointer" alt="Facebook" />
                            <img src={insta} className="w-8 h-8 cursor-pointer" alt="Instagram" />
                            <img src={twitter} className="w-8 h-8 cursor-pointer" alt="Twitter" />
                        </div>
                    </div>
                </div>
                <div className="w-full h-px bg-stone-500 opacity-25"></div>
                <div className="text-stone-500 text-xs font-normal font-Poppins">© 2024 Narabik, Inc. All rights reserved.</div>
            </div>
        </div>
    );
};

export default SignUp;
