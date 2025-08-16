import ExcelJS from 'exceljs';

export interface ExportColumn {
  key: string;
  header: string;
  width?: number;
  type?: 'text' | 'number' | 'date' | 'boolean';
}

export interface ExportOptions {
  filename: string;
  sheetName: string;
  columns: ExportColumn[];
  data: any[];
  title?: string;
  subtitle?: string;
}

export class DataExporter {
  static async exportToExcel(options: ExportOptions): Promise<void> {
    const { filename, sheetName, columns, data, title, subtitle } = options;

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    let currentRow = 1;

    // Add title if provided
    if (title) {
      worksheet.mergeCells(`A${currentRow}:${this.getColumnLetter(columns.length)}${currentRow}`);
      const titleCell = worksheet.getCell(`A${currentRow}`);
      titleCell.value = title;
      titleCell.font = { size: 16, bold: true };
      titleCell.alignment = { horizontal: 'center' };
      currentRow += 2;
    }

    // Add subtitle if provided
    if (subtitle) {
      worksheet.mergeCells(`A${currentRow}:${this.getColumnLetter(columns.length)}${currentRow}`);
      const subtitleCell = worksheet.getCell(`A${currentRow}`);
      subtitleCell.value = subtitle;
      subtitleCell.font = { size: 12, italic: true };
      subtitleCell.alignment = { horizontal: 'center' };
      currentRow += 2;
    }

    // Set up columns
    worksheet.columns = columns.map(col => ({
      key: col.key,
      header: col.header,
      width: col.width || 15
    }));

    // Style header row
    const headerRow = worksheet.getRow(currentRow);
    headerRow.values = columns.map(col => col.header);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    headerRow.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    currentRow++;

    // Add data rows
    data.forEach((item, index) => {
      const row = worksheet.getRow(currentRow + index);
      const rowData = columns.map(col => {
        const value = this.getNestedValue(item, col.key);
        return this.formatCellValue(value, col.type);
      });
      row.values = rowData;
      
      // Add borders to data rows
      row.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      if (column.values) {
        const lengths = column.values.map(v => v ? v.toString().length : 0);
        const maxLength = Math.max(...lengths.filter(v => typeof v === 'number'));
        column.width = Math.min(Math.max(maxLength + 2, 10), 50);
      }
    });

    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    this.downloadFile(buffer, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }

  static async exportToCSV(options: ExportOptions): Promise<void> {
    const { filename, columns, data } = options;

    // Create CSV content
    const headers = columns.map(col => col.header).join(',');
    const rows = data.map(item => 
      columns.map(col => {
        const value = this.getNestedValue(item, col.key);
        const formatted = this.formatCellValue(value, col.type);
        // Escape CSV values
        return typeof formatted === 'string' && formatted.includes(',') 
          ? `"${formatted.replace(/"/g, '""')}"` 
          : formatted;
      }).join(',')
    );

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    this.downloadFile(blob, filename.replace('.xlsx', '.csv'), 'text/csv');
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private static formatCellValue(value: any, type?: string): any {
    if (value === null || value === undefined) return '';
    
    switch (type) {
      case 'date':
        return value instanceof Date ? value : new Date(value);
      case 'number':
        return typeof value === 'number' ? value : parseFloat(value) || 0;
      case 'boolean':
        return Boolean(value);
      default:
        return String(value);
    }
  }

  private static getColumnLetter(columnNumber: number): string {
    let result = '';
    while (columnNumber > 0) {
      columnNumber--;
      result = String.fromCharCode(65 + (columnNumber % 26)) + result;
      columnNumber = Math.floor(columnNumber / 26);
    }
    return result;
  }

  private static downloadFile(data: ArrayBuffer | Blob, filename: string, mimeType: string): void {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

// Predefined export configurations for different data types
export const ExportConfigs = {
  players: {
    columns: [
      { key: 'name', header: 'Player Name', width: 20 },
      { key: 'alliance', header: 'Alliance', width: 20 },
      { key: 'power', header: 'Power', type: 'number' as const, width: 15 },
      { key: 'killPoints', header: 'Kill Points', type: 'number' as const, width: 15 },
      { key: 'level', header: 'Level', type: 'number' as const, width: 10 },
      { key: 'vipLevel', header: 'VIP Level', type: 'number' as const, width: 12 },
      { key: 'might', header: 'Might', type: 'number' as const, width: 15 },
      { key: 'troopKills', header: 'Troop Kills', type: 'number' as const, width: 15 },
      { key: 'deads', header: 'Deads', type: 'number' as const, width: 12 },
      { key: 'rss_assistance_given', header: 'RSS Assistance Given', type: 'number' as const, width: 20 },
      { key: 'rss_assistance_received', header: 'RSS Assistance Received', type: 'number' as const, width: 22 }
    ] as ExportColumn[]
  },

  leaderboard: {
    columns: [
      { key: 'rank', header: 'Rank', type: 'number' as const, width: 8 },
      { key: 'name', header: 'Player Name', width: 20 },
      { key: 'alliance', header: 'Alliance', width: 20 },
      { key: 'power', header: 'Power', type: 'number' as const, width: 15 },
      { key: 'killPoints', header: 'Kill Points', type: 'number' as const, width: 15 },
      { key: 'powerGrowth', header: 'Power Growth', type: 'number' as const, width: 15 },
      { key: 'killPointsGrowth', header: 'Kill Points Growth', type: 'number' as const, width: 18 }
    ] as ExportColumn[]
  },

  changes: {
    columns: [
      { key: 'playerName', header: 'Player Name', width: 20 },
      { key: 'changeType', header: 'Change Type', width: 15 },
      { key: 'field', header: 'Field', width: 15 },
      { key: 'oldValue', header: 'Old Value', width: 15 },
      { key: 'newValue', header: 'New Value', width: 15 },
      { key: 'difference', header: 'Difference', type: 'number' as const, width: 12 },
      { key: 'timestamp', header: 'Date', type: 'date' as const, width: 18 }
    ] as ExportColumn[]
  },

  allianceMoves: {
    columns: [
      { key: 'playerName', header: 'Player Name', width: 20 },
      { key: 'fromAlliance', header: 'From Alliance', width: 20 },
      { key: 'toAlliance', header: 'To Alliance', width: 20 },
      { key: 'power', header: 'Power at Move', type: 'number' as const, width: 15 },
      { key: 'killPoints', header: 'Kill Points at Move', type: 'number' as const, width: 18 },
      { key: 'timestamp', header: 'Move Date', type: 'date' as const, width: 18 }
    ] as ExportColumn[]
  },

  nameChanges: {
    columns: [
      { key: 'oldName', header: 'Old Name', width: 20 },
      { key: 'newName', header: 'New Name', width: 20 },
      { key: 'alliance', header: 'Alliance', width: 20 },
      { key: 'power', header: 'Power at Change', type: 'number' as const, width: 15 },
      { key: 'similarity', header: 'Similarity Score', type: 'number' as const, width: 15 },
      { key: 'timestamp', header: 'Change Date', type: 'date' as const, width: 18 }
    ] as ExportColumn[]
  },

  merits: {
    columns: [
      { key: 'playerName', header: 'Player Name', width: 20 },
      { key: 'alliance', header: 'Alliance', width: 20 },
      { key: 'merits', header: 'Total Merits', type: 'number' as const, width: 15 },
      { key: 'power', header: 'Power', type: 'number' as const, width: 15 },
      { key: 'meritPowerRatio', header: 'Merit/Power Ratio (%)', type: 'number' as const, width: 18 },
      { key: 'meritKillRatio', header: 'Merit/Kill Ratio', type: 'number' as const, width: 15 },
      { key: 'cityLevel', header: 'City Level', type: 'number' as const, width: 12 },
      { key: 'division', header: 'Division', type: 'number' as const, width: 10 }
    ] as ExportColumn[]
  }
};