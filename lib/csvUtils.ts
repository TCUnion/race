
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
 * 防範 CSV Injection: 若字串以特殊符號開頭，則在前面加上單引號
 */
const sanitizeString = (str: string | null): string | null => {
    if (!str) return null;
    const dangerousChars = ['=', '+', '-', '@'];
    if (dangerousChars.includes(str[0])) {
        return "'" + str;
    }
    return str;
};

/**
 * 驗證保養紀錄資料
 * @param record 解析後的保養紀錄
 * @returns 錯誤訊息陣列 (若為空則表示驗證通過)
 */
export const validateMaintenanceRecord = (record: any): string[] => {
    const errors: string[] = [];

    // 1. 日期格式驗證 (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!record.service_date || !dateRegex.test(record.service_date)) {
        errors.push(`日期格式錯誤 (應為 YYYY-MM-DD): ${record.service_date}`);
    } else if (isNaN(Date.parse(record.service_date))) {
        errors.push(`無效日期: ${record.service_date}`);
    }

    // 2. 里程驗證
    if (typeof record.mileage_at_service !== 'number' || record.mileage_at_service < 0) {
        errors.push(`里程必須為非負數: ${record.mileage_at_service}`);
    }

    // 3. 金額驗證
    if (record.cost !== null && (typeof record.cost !== 'number' || record.cost < 0)) {
        errors.push(`金額必須為非負數: ${record.cost}`);
    }

    // 4. 保養項目必填
    if (!record.maintenance_type || typeof record.maintenance_type !== 'string') {
        errors.push('保養項目為必填');
    }

    return errors;
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
                case '日期': obj.service_date = sanitizeString(val); break;
                case '保養項目': obj.maintenance_type = sanitizeString(val); break;
                case '里程 (km)': obj.mileage_at_service = parseFloat(val) || 0; break;
                case '金額': obj.cost = val ? parseFloat(val) : null; break;
                case '地點': obj.shop_name = sanitizeString(val); break;
                case 'DIY': obj.is_diy = (val === '是'); break;
                case '備註': obj.notes = sanitizeString(val); break;
                case '其他': obj.other = sanitizeString(val); break;
            }
        });

        // 驗證並過濾無效資料
        const validationErrors = validateMaintenanceRecord(obj);
        if (validationErrors.length > 0) {
            console.warn(`CSV Record skipped due to validation errors:`, validationErrors, obj);
            return null;
        }

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
