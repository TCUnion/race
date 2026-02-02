import { useState } from 'react';
import { HomePage, SearchPage, LibraryPage, PlayerPage } from './components/music-app';

function App() {
    const [activeTab, setActiveTab] = useState('home');
    const [showPlayer, setShowPlayer] = useState(false);

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
    };

    // 如果播放器開啟，顯示播放器頁面
    if (showPlayer) {
        return <PlayerPage onClose={() => setShowPlayer(false)} />;
    }

    // 根據當前標籤渲染對應頁面
    const renderPage = () => {
        switch (activeTab) {
            case 'home':
                return <HomePage activeTab={activeTab} onTabChange={handleTabChange} />;
            case 'search':
                return <SearchPage activeTab={activeTab} onTabChange={handleTabChange} />;
            case 'library':
                return <LibraryPage activeTab={activeTab} onTabChange={handleTabChange} />;
            default:
                return <HomePage activeTab={activeTab} onTabChange={handleTabChange} />;
        }
    };

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center">
            {renderPage()}
        </div>
    );
}

export default App;
