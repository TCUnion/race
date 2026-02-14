import React from 'react';

const Footer = () => (
    <footer className="bg-[#0A0A0B] py-16 px-20 flex flex-col md:flex-row items-center justify-between border-t border-white/5">
        <div className="text-3xl font-bold italic font-display text-accent">
            CXXC
        </div>
        <div className="flex flex-col items-center md:items-end mt-6 md:mt-0 gap-2">
            <div className="font-mono text-[10px] text-text-muted opacity-40">
                © 2026 CXXC CYCLING. ALL RIGHTS RESERVED.
            </div>
            <a
                href="https://www.tsu.com.tw/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] text-text-muted hover:text-accent transition-colors"
            >
                Powered by TCU
            </a>
        </div>
    </footer>
);

export default Footer;
