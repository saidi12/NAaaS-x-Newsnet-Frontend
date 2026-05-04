import React, { useState } from 'react';
import { GoChevronLeft } from "react-icons/go";
import { RxCounterClockwiseClock } from "react-icons/rx";
import { NavLink } from 'react-router-dom';
import { CarbonHome } from "./icons/CarbonHome.tsx";
import { FluentPersonSupport16Regular } from "./icons/FluentPersonSupport16Regular.tsx";
import { IconoirProfileCircle } from "./icons/IconoirProfileCircle.tsx";
import { LineMdLogOut } from "./icons/LineMdLogOut.tsx";
import { FluentPersonFeedback20Regular } from "./icons/FluentPersonFeedback20Regular.tsx";
import link from "./icons/link.png";
import { LuMapPin, LuLayoutDashboard } from "react-icons/lu";

const Sidebar = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const toggle = () => setIsOpen(!isOpen);

    const menuItem = [
        {
            path: "/UserProfile",
            name: "User Profile",
            icon: <IconoirProfileCircle className="icon-bold  w-7 h-7" />
        },
        {
            path: "/",
            name: "Home",
            icon: <CarbonHome className="icon-bold  w-7 h-7" />
        },
        {
            path: "/map-input",
            name: "Map",
            icon: <LuMapPin className="icon-bold  w-7 h-7" />
        },
        {
            path: "/Discover",
            name: "Discover",
            icon: <img src={link} alt="link" className="icon-bold w-7 h-10" />
        },
        {
            path: "/Nexus",
            name: "Nexus",
            icon: <LuLayoutDashboard className="icon-bold w-7 h-7" />
        },
        {
            path: "/History",
            name: "History",
            icon: <RxCounterClockwiseClock className="icon-bold  w-7 h-7" />
        },
        {
            path: "/HelpAndSupport",
            name: "Help Support",
            icon: <FluentPersonSupport16Regular className="icon-bold  w-8 h-8" />
        },
        {
            path: "/Feedback",
            name: "Feedback",
            icon: <FluentPersonFeedback20Regular className="icon-bold  w-8 h-8" />
        }
    ];

    const logoutItem = {
        path: "/logout",
        name: "Logout",
        icon: <LineMdLogOut className="icon-bold  w-7 h-7" />
    };

    return (
        <div className="flex">
            <div style={{ width: isOpen ? '250px' : '65px' }} className="sidebar fixed top-0 left-0 h-full bg-colorVerticalNav text-black flex flex-col rounded-lg z-50 ease-in-out duration-300">
                <div className="top_section w-full text-2xl flex items-center justify-between p-4">
                    <h1 style={{ display: isOpen ? 'block' : 'none' }} className="logo"></h1>
                    <div style={{ marginLeft: isOpen ? '50px' : '0px' }} className="bars">
                        <GoChevronLeft onClick={toggle} />
                    </div>
                </div>
                <nav className="menu">
                    {menuItem.map((item, index) => (
                        <NavLink
                            to={item.path}
                            key={index}
                            className={({ isActive }) => isActive ? "link flex items-center py-3 pl-3.5 text-black no-underline bg-white" : "link flex items-center py-3 pl-3.5 text-black no-underline hover:bg-white"}
                        >
                            <div className="icon mr-4">{item.icon}</div>
                            <div style={{ display: isOpen ? 'block' : 'none' }} className="link_text text-1xl">
                                {item.name}
                            </div>
                        </NavLink>
                    ))}
                </nav>
                <div className="logout-container absolute bottom-0 w-full">
                    <NavLink
                        to={logoutItem.path}
                        className={({ isActive }) => isActive ? "link flex items-center p-4 text-black no-underline bg-white" : "link flex items-center p-4 text-black no-underline hover:bg-white"}
                    >
                        <div className="icon mr-4">{logoutItem.icon}</div>
                        <div style={{ display: isOpen ? 'block' : 'none' }} className="link_text text-lg">
                            {logoutItem.name}
                        </div>
                    </NavLink>
                </div>
            </div>

            <main className="ml-16">{children}</main>
        </div>
    );
};

export default Sidebar;
