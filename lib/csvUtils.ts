
import { BikeMaintenanceRecord } from '../hooks/useMaintenance';

/**
 * 將保養紀錄轉換為 CSV 字串
 * @param records 保養紀錄列表
 * @returns 包含 UTF-8 BOM 的 CSV 字串
 */
export const exportToCSV = (records: BikeMaintenanceRecord[]): string => {
    const headers = ['日期', '保養項目', '里程 (km)', '金額', '地點', 'DIY', '備註', '其他'];

    const rows = records.map(r => [
        r.service_date,
        `"${(r.maintenance_type || '').replace(/"/g, '""')}"`,
        r.mileage_at_service,
        r.cost || '',
        `"${(r.shop_name || '').replace(/"/g, '""')}"`,
        r.is_diy ? '是' : '否',
        `"${(r.notes || '').replace(/"/g, '""')}"`,
        `"${(r.other || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    // 加入 UTF-8 BOM，確保 Excel 開啟不亂碼
    return '\uFEFF' + csvContent;
};

/**
 * 解析 CSV 字串為保養紀錄物件列表 (部分欄位)
 * @param csvString CSV 內容
 * @returns 準備寫入資料庫的紀錄資料
 */
export const parseCSV = (csvString: string) => {
    // 移除 BOM (如果有)
    const cleanStr = csvString.startsWith('\uFEFF') ? csvString.slice(1) : csvString;
    const lines = cleanStr.split(/\r?\n/).filter(line => line.trim() !== '');

    if (lines.length < 2) return [];

    // 簡單的 CSV 解析，處理基本引號
    const parseRow = (row: string) => {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (char === '"') {
                if (inQuotes && row[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    };

    const headers = parseRow(lines[0]);
    const dataRows = lines.slice(1).map(parseRow);

    return dataRows.map(row => {
        const obj: any = {};
        headers.forEach((header, idx) => {
            const val = row[idx];
            switch (header) {
                case '日期': obj.service_date = val; break;
                case '保養項目': obj.maintenance_type = val; break;
                case '里程 (km)': obj.mileage_at_service = parseFloat(val) || 0; break;
                case '金額': obj.cost = val ? parseFloat(val) : null; break;
                case '地點': obj.shop_name = val || null; break;
                case 'DIY': obj.is_diy = (val === '是'); break;
                case '備註': obj.notes = val || null; break;
                case '其他': obj.other = val || null; break;
            }
        });

        // 驗證必要欄位
        if (!obj.service_date || !obj.maintenance_type) return null;
        return obj;
    }).filter(Boolean);
};

/**
 * 觸發瀏覽器下載檔案
 * @param content 檔案內容
 * @param fileName 檔案名稱
 */
export const downloadFile = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
