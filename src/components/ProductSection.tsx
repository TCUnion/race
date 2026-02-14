import React from 'react';
import cxBike from '../assets/images/cx_bike.png';
import xcBike from '../assets/images/xc_bike.png';

const ProductSection = () => (
    <section className="bg-bg-alt py-32 px-10 md:px-20 space-y-40">
        {/* CX */}
        <div className="flex flex-col md:flex-row items-center gap-20">
            <div className="w-full md:w-1/2 rounded-[32px] overflow-hidden aspect-video">
                <img
                    src={cxBike}
                    alt="CX Bike"
                    className="w-full h-full object-cover"
                    width="1974"
                    height="1110"
                    loading="lazy"
                />
            </div>
            <div className="w-full md:w-1/2 space-y-6">
                <span className="font-mono text-success font-bold tracking-widest text-xs">CYCLOCROSS</span>
                <h2 className="text-5xl md:text-6xl font-bold font-display">
                    The CX Mastery.<br />
                    <span className="text-2xl md:text-3xl font-serif font-normal italic text-white/60">CX 的極致掌控</span>
                </h2>
                <div className="space-y-3">
                    <p className="text-text-muted text-lg font-serif">
                        CYCLOCROSS 越野跑車。專為泥濘賽道與草地競速而生，兼具跑車的迅捷與越野的韌性。
                    </p>
                    <p className="text-text-muted/60 text-sm font-mono leading-relaxed">
                        Born for muddy tracks and grassy sprints. Combining the agility of a road bike with the resilience of off-road engineering.
                    </p>
                </div>
            </div>
        </div>

        {/* XC */}
        <div className="flex flex-col md:flex-row-reverse items-center gap-20">
            <div className="w-full md:w-1/2 rounded-[32px] overflow-hidden aspect-video">
                <img
                    src={xcBike}
                    alt="XC Bike"
                    className="w-full h-full object-cover"
                    width="2070"
                    height="1380"
                    loading="lazy"
                />
            </div>
            <div className="w-full md:w-1/2 space-y-6">
                <span className="font-mono text-accent font-bold tracking-widest text-xs">CROSS-COUNTRY</span>
                <h2 className="text-5xl md:text-6xl font-bold font-display">
                    XC Dominance.<br />
                    <span className="text-2xl md:text-3xl font-serif font-normal italic text-white/60">XC 的絕對優勢</span>
                </h2>
                <div className="space-y-3">
                    <p className="text-text-muted text-lg font-serif">
                        精準征服林道。專為陡峭爬坡的效率與技術下坡的控制力而設計。
                    </p>
                    <p className="text-text-muted/60 text-sm font-mono leading-relaxed">
                        Conquer the trails with precision. Engineered for efficiency on steep climbs and control on technical descents.
                    </p>
                </div>
            </div>
        </div>
    </section>
);

export default ProductSection;
