import ExcelJS from 'exceljs';

export const exportEveningMusterToExcel = async (
    divisionName: string,
    date: string,
    groupedRecords: any,
    historicWeights: any,
    uniqueFieldsInHistoryForWeights: string[]
) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Evening Muster Results');

    // Default styles
    sheet.getColumn(1).width = 25; // Worker Name
    sheet.getColumn(2).width = 15; // Division
    sheet.getColumn(3).width = 15; // Field
    sheet.getColumn(4).width = 15; // Work Type
    sheet.getColumn(5).width = 15; // Type
    sheet.getColumn(6).width = 10; // AM
    sheet.getColumn(7).width = 10; // PM
    sheet.getColumn(8).width = 10; // Total
    sheet.getColumn(9).width = 15; // Over Kilos
    sheet.getColumn(10).width = 15; // OT Hours
    sheet.getColumn(11).width = 15; // Aathama

    // Colors
    const headerBg = 'FFE8F5E9'; // Light green
    const headerFontColor = 'FF2E7D32'; // Dark green
    const subHeaderBg = 'FFF5F5F5'; // Light grey

    let currentRow = 1;

    // Main Header
    sheet.mergeCells(`A${currentRow}:K${currentRow}`);
    const titleCell = sheet.getCell(`A${currentRow}`);
    titleCell.value = `🌙 Evening Results (Actual) - ${divisionName} - ${date}`;
    titleCell.font = { size: 16, bold: true, color: { argb: headerFontColor } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBg } };
    currentRow += 2;

    // Bulk Weights Entry Section (if exists)
    if (uniqueFieldsInHistoryForWeights && uniqueFieldsInHistoryForWeights.length > 0) {
        sheet.mergeCells(`A${currentRow}:K${currentRow}`);
        const bwTitle = sheet.getCell(`A${currentRow}`);
        bwTitle.value = '⚖️ Bulk Weights Entry';
        bwTitle.font = { size: 12, bold: true, color: { argb: 'FF1B5E20' } };
        bwTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F8E9' } };
        currentRow++;

        const weightHeaders = [...uniqueFieldsInHistoryForWeights.map(f => `Field Wt. (${f})`), 'Factory Weight (Total)'];
        const weightValues = [
            ...uniqueFieldsInHistoryForWeights.map(f => historicWeights?.['__historic_div__']?.[f]?.fieldWt || 0),
            historicWeights?.['__historic_div__']?.['__FACTORY__']?.factoryWt || 0
        ];

        weightHeaders.forEach((h, i) => {
            sheet.getCell(currentRow, i + 1).value = h;
            sheet.getCell(currentRow, i + 1).font = { bold: true };
            sheet.getCell(currentRow + 1, i + 1).value = weightValues[i];
            sheet.getCell(currentRow + 1, i + 1).alignment = { horizontal: 'center' };
        });
        currentRow += 3;
    }

    // Harvest & Output
    sheet.mergeCells(`A${currentRow}:K${currentRow}`);
    const harvestTitle = sheet.getCell(`A${currentRow}`);
    harvestTitle.value = '🌾 Harvest & Output';
    harvestTitle.font = { size: 14, bold: true, color: { argb: 'FF333333' } };
    currentRow += 2;

    Object.entries(groupedRecords).forEach(([task, items]: any) => {
        // Task Header
        sheet.mergeCells(`A${currentRow}:K${currentRow}`);
        const taskCell = sheet.getCell(`A${currentRow}`);
        taskCell.value = `🌿 ${task}`;
        taskCell.font = { size: 12, bold: true, color: { argb: 'FF2E7D32' } };
        taskCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
        currentRow++;

        // Column Headers
        const headers = ['👨‍🌾 WORKER', 'DIVISION', 'FIELD', 'WORK TYPE', 'TYPE', 'AM', 'PM', 'TOTAL', 'OVER KILOS', 'OT HOURS', 'අත්තම'];
        headers.forEach((h, i) => {
            const cell = sheet.getCell(currentRow, i + 1);
            cell.value = h;
            cell.font = { bold: true, size: 10, color: { argb: 'FF555555' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: subHeaderBg } };
            cell.border = { 
                top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
            };
            cell.alignment = { horizontal: i > 0 ? 'center' : 'left', vertical: 'middle' };
        });
        currentRow++;

        items.forEach((item: any, index: number) => {
            const total = (Number(item.amWeight) || 0) + (Number(item.pmWeight) || 0);
            let attendance = (item.status || 'FULL').toUpperCase();
            if (attendance === 'PRESENT') attendance = 'FULL';

            const rowData = [
                `👤 ${item.workerName}`,
                divisionName || '-',
                item.fieldName || '-',
                item.workType || task || '-',
                item.workerType || '-',
                item.amWeight || '-',
                item.pmWeight || '-',
                total || '-',
                item.overKilos || '-',
                item.otHours || '-',
                attendance
            ];

            const rowBgColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFF9F9F9'; // Alternating row colors

            rowData.forEach((val, i) => {
                const cell = sheet.getCell(currentRow, i + 1);
                cell.value = val;
                cell.alignment = { horizontal: i > 0 ? 'center' : 'left', vertical: 'middle' };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgColor } };
                cell.border = { 
                    top: { style: 'thin', color: { argb: 'FFEEEEEE' } },
                    left: { style: 'thin', color: { argb: 'FFEEEEEE' } },
                    bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } },
                    right: { style: 'thin', color: { argb: 'FFEEEEEE' } }
                };
                
                // Add conditional color for worker type
                if (i === 4) { // Worker Type column
                    cell.font = { bold: true, color: { argb: item.workerType === 'CASUAL' ? 'FF1976D2' : (String(item.workerType).includes('CONTRACT') ? 'FF9C27B0' : 'FFED6C02') } };
                }
                if (i === 7) { // Total column bold
                    cell.font = { bold: true, color: { argb: 'FF2E7D32' } };
                }
            });
            currentRow++;
        });
        currentRow++; // Space between tasks
    });

    // Write buffer and trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Evening_Muster_${divisionName}_${date.replace(/ /g, '_')}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};
