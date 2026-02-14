import React from 'react';
import { motion } from 'framer-motion';
import heroBg from '../assets/images/hero_bg.png';

const Hero = () => (
    <section id="hero" className="relative w-full h-screen flex items-center px-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
            <img
                src={heroBg}
                className="w-full h-full object-cover brightness-50"
                alt="Hero Background"
                width="2070"
                height="1380"
                loading="eager"
            />
        </div>
        <div className="relative z-10 max-w-3xl">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-mono text-accent/80 font-bold tracking-[6px] mb-8 text-sm"
            >
                CXXC CULTURE
            </motion.div>
            <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-7xl md:text-8xl font-serif font-medium leading-tight mb-4 text-white tracking-wide"
            >
                泥土上的<br />
                <span className="italic relative inline-block">
                    文化刻痕
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ delay: 0.8, duration: 0.8 }}
                        className="absolute -bottom-2 left-0 h-1 bg-accent/60"
                    />
                </span>
            </motion.h1>

            <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl md:text-3xl font-display font-bold text-white/40 mb-8 tracking-widest uppercase"
            >
                Culture Carved in Dirt
            </motion.h2>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="space-y-4 max-w-2xl"
            >
                <p className="text-white/90 text-xl md:text-2xl font-serif leading-relaxed tracking-wide">
                    我們不蓋水泥建築，我們用輪胎<br />在泥土上刻畫出台灣單車的新文化。
                </p>
                <p className="text-text-muted text-sm md:text-base font-mono leading-relaxed opacity-80">
                    We build no concrete walls. With our tires,<br />we carve a new culture of cycling into the earth.
                </p>
            </motion.div>
        </div>
    </section>
);

export default Hero;
