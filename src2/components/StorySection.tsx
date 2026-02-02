import React from 'react';
import storyBg from '../assets/images/story_bg.png';

const StorySection = () => (
    <section className="relative py-40 px-10 md:px-20 flex flex-col items-center justify-center text-center space-y-10 overflow-hidden">
        <div className="absolute inset-0 -z-10 brightness-[0.15]">
            <img
                src={storyBg}
                alt="Soil Texture"
                className="w-full h-full object-cover"
                width="2069"
                height="1379"
                loading="lazy"
            />
        </div>
        <span className="font-mono text-accent font-bold tracking-[8px] text-sm group">
            OUR SPIRIT <span className="text-white/40 mx-2">/</span> 我們的精神
        </span>
        <h2 className="text-5xl md:text-7xl font-bold max-w-5xl font-display leading-tight">
            BORN IN THE DIRT.<br />
            RAISED ON THE TRAIL.<br />
            <span className="text-3xl md:text-5xl font-serif italic text-white/60 block mt-4">生於泥土，長於林道。</span>
        </h2>
        <div className="max-w-4xl space-y-6">
            <p className="text-text-muted text-xl md:text-2xl font-serif italic leading-relaxed text-white/90">
                「在 CXXC，我們不只是騎車，我們征服元素。每一濺泥濘都是榮譽勳章，每一株草都是我們速度的見證。」
            </p>
            <p className="text-text-muted/60 text-sm md:text-base font-mono leading-relaxed">
                "At CXXC, we don't just ride; we conquer the elements. Every splash of mud is a badge of honor, and every blade of grass is a witness to our speed."
            </p>
        </div>
    </section>
);

export default StorySection;
