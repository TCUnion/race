import React from 'react';
import logo from '../assets/images/logo.png';

const Navbar = () => (
    <nav className="fixed top-8 left-1/2 -translate-x-1/2 w-[90%] max-w-7xl h-18 glass rounded-2xl flex items-center justify-between px-10 z-50">
        <a href="/" className="flex items-center">
            <img src={logo} alt="CXXC" className="h-10 w-auto brightness-0 invert drop-shadow-[0_2px_4px_rgba(255,107,0,0.3)] transform -skew-x-6" />
        </a>
        <div className="hidden md:flex gap-10 text-[13px] font-medium tracking-wide">
            <a href="#" className="hover:text-accent transition-colors">CYCLOCROSS</a>
            <a href="#" className="hover:text-accent transition-colors">XC TRAIL</a>
            <a href="#" className="hover:text-accent transition-colors">TECHNOLOGY</a>
        </div>
        <button type="button" className="btn-primary text-xs tracking-wider">DISCOVER</button>
    </nav>
);

export default Navbar;
