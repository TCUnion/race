import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
    animate?: boolean;
}

/**
 * 骨架屏組件 - 用於顯示載入中的佔位動畫
 */
const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    variant = 'rectangular',
    width,
    height,
    animate = true,
}) => {
    const baseClasses = 'bg-slate-700/50';
    const animateClass = animate ? 'animate-pulse' : '';

    const variantClasses = {
        text: 'rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-lg',
    };

    const style: React.CSSProperties = {
        width: width ?? '100%',
        height: height ?? (variant === 'text' ? '1em' : '100%'),
    };

    return (
        <div
            className={`${baseClasses} ${animateClass} ${variantClasses[variant]} ${className}`}
            style={style}
        />
    );
};

/**
 * 排行榜骨架屏 - 用於排行榜載入時顯示
 */
export const LeaderboardSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
    return (
        <div className="space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
                <div
                    key={i}
                    className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl"
                >
                    <Skeleton variant="circular" width={40} height={40} />
                    <div className="flex-1 space-y-2">
                        <Skeleton variant="text" width="60%" height={16} />
                        <Skeleton variant="text" width="40%" height={12} />
                    </div>
                    <Skeleton variant="rectangular" width={60} height={24} />
                </div>
            ))}
        </div>
    );
};

/**
 * 卡片骨架屏 - 用於通用卡片載入時顯示
 */
export const CardSkeleton: React.FC = () => {
    return (
        <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700 space-y-4">
            <Skeleton variant="text" width="50%" height={20} />
            <Skeleton variant="rectangular" height={120} />
            <div className="flex gap-3">
                <Skeleton variant="rectangular" width={80} height={32} className="rounded-lg" />
                <Skeleton variant="rectangular" width={80} height={32} className="rounded-lg" />
            </div>
        </div>
    );
};

/**
 * 表格骨架屏 - 用於表格資料載入時顯示
 */
export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
    rows = 5,
    cols = 4
}) => {
    return (
        <div className="overflow-hidden rounded-xl border border-slate-700">
            {/* Header */}
            <div className="flex gap-4 p-4 bg-slate-800/80 border-b border-slate-700">
                {Array.from({ length: cols }).map((_, i) => (
                    <Skeleton key={i} variant="text" width={`${100 / cols}%`} height={14} />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div
                    key={rowIndex}
                    className="flex gap-4 p-4 border-b border-slate-700/50 last:border-b-0"
                >
                    {Array.from({ length: cols }).map((_, colIndex) => (
                        <Skeleton
                            key={colIndex}
                            variant="text"
                            width={`${100 / cols}%`}
                            height={12}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
};

export default Skeleton;
