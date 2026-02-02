export function StatusBar() {
    return (
        <div className="flex justify-between items-center w-full h-11 px-5">
            <span className="text-white text-[15px] font-semibold font-display">9:41</span>
            <div className="flex items-center gap-1">
                <span className="text-white text-xs">5G</span>
                <span className="text-white text-xs">100%</span>
            </div>
        </div>
    );
}
