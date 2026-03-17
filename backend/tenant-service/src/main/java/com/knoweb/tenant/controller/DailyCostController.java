package com.knoweb.tenant.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.knoweb.tenant.entity.DailyCost;
import com.knoweb.tenant.entity.Field;
import com.knoweb.tenant.repository.CropConfigRepository;
import com.knoweb.tenant.repository.DailyCostRepository;
import com.knoweb.tenant.repository.FieldRepository;
import com.knoweb.tenant.service.CostCalculationService;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.client.RestTemplate;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.UUID;
import java.util.Locale;

@RestController
@RequestMapping("/api/daily-costs")
public class DailyCostController {

    private final DailyCostRepository dailyCostRepository;
    private final CostCalculationService costCalculationService;
    private final CropConfigRepository cropConfigRepository;
    private final FieldRepository fieldRepository;
    private final DiscoveryClient discoveryClient;
    private final ObjectMapper objectMapper;

    public DailyCostController(
            DailyCostRepository dailyCostRepository,
            CostCalculationService costCalculationService,
            CropConfigRepository cropConfigRepository,
            FieldRepository fieldRepository,
            DiscoveryClient discoveryClient,
            ObjectMapper objectMapper) {
        this.dailyCostRepository = dailyCostRepository;
        this.costCalculationService = costCalculationService;
        this.cropConfigRepository = cropConfigRepository;
        this.fieldRepository = fieldRepository;
        this.discoveryClient = discoveryClient;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    public ResponseEntity<DailyCost> getDailyCost(
            @RequestParam String tenantId,
            @RequestParam String cropType,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        DailyCost resolved = resolveDailyCost(tenantId, cropType, date);
        return resolved == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(resolved);
    }

    @GetMapping("/range")
    public ResponseEntity<List<DailyCost>> getDailyCostsInRange(
            @RequestParam String tenantId,
            @RequestParam String cropType,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        String normalizedCropType = normalizeCropType(cropType);
        List<DailyCost> costs = dailyCostRepository.findByTenantIdAndCropTypeIgnoreCaseAndDateBetween(
                tenantId, normalizedCropType, startDate, endDate);
        return ResponseEntity.ok(costs);
    }

    @PostMapping
    public ResponseEntity<DailyCost> saveDailyCost(@RequestBody DailyCost request) {
        DailyCost saved = upsertDailyCost(
                request.getTenantId(),
                request.getCropType(),
                request.getDate(),
                request.getCostData());
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/report-excel")
    public ResponseEntity<byte[]> downloadExcelReport(
            @RequestParam String tenantId,
            @RequestParam String cropType,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        DailyCost resolved = resolveDailyCost(tenantId, cropType, date);
        if (resolved == null) {
            return ResponseEntity.noContent().build();
        }

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Cost Analysis");
            sheet.setDisplayGridlines(false);
            sheet.createFreezePane(0, 5);

            CellStyle titleStyle = createTitleStyle(workbook);
            CellStyle ribbonLabelStyle = createRibbonLabelStyle(workbook);
            CellStyle ribbonValueStyle = createRibbonValueStyle(workbook);
            CellStyle cropBandStyle = createCropBandStyle(workbook);
            CellStyle cropRowBlankStyle = createItemTextStyle(workbook);
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle categoryStyle = createCategoryStyle(workbook);
            CellStyle itemTextStyle = createItemTextStyle(workbook);
            CellStyle amountStyle = createAmountStyle(workbook);
            CellStyle summaryLabelStyle = createSummaryLabelStyle(workbook);
            CellStyle summaryAmountStyle = createSummaryAmountStyle(workbook);

            Row titleRow = sheet.createRow(0);
            titleRow.setHeightInPoints(22);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("Cost Analysis");
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(0, 0, 0, 6));
            for (int i = 1; i < 7; i++) {
                Cell mergedCell = titleRow.createCell(i);
                mergedCell.setCellStyle(titleStyle);
            }

            Row ribbonRow = sheet.createRow(1);
            ribbonRow.setHeightInPoints(18);
            createRibbonCell(ribbonRow, 0, "Date", ribbonLabelStyle);
            createRibbonCell(ribbonRow, 1, date.format(DateTimeFormatter.ofPattern("d-MMM-yy")), ribbonValueStyle);
            createRibbonCell(ribbonRow, 2, "", ribbonValueStyle);
            createRibbonCell(ribbonRow, 3, "Time", ribbonLabelStyle);
            createRibbonCell(ribbonRow, 4, LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm")), ribbonValueStyle);
            createRibbonCell(ribbonRow, 5, "", ribbonValueStyle);
            createRibbonCell(ribbonRow, 6, "", ribbonValueStyle);

            Row cropRow = sheet.createRow(2);
            cropRow.setHeightInPoints(20);
            Cell cropCell = cropRow.createCell(0);
            cropCell.setCellValue(cropType.toUpperCase(Locale.ROOT));
            cropCell.setCellStyle(cropBandStyle);
            for (int i = 1; i < 7; i++) {
                Cell blankCell = cropRow.createCell(i);
                blankCell.setCellStyle(cropRowBlankStyle);
            }

            Row groupHeaderRow = sheet.createRow(3);
            groupHeaderRow.setHeightInPoints(20);
            Row subHeaderRow = sheet.createRow(4);
            subHeaderRow.setHeightInPoints(20);

            createTextCell(groupHeaderRow, 0, "", headerStyle);
            createTextCell(groupHeaderRow, 1, "Day", headerStyle);
            createTextCell(groupHeaderRow, 3, "Todate", headerStyle);
            createTextCell(groupHeaderRow, 5, "History", headerStyle);

            for (int i = 2; i < 7; i++) {
                if (groupHeaderRow.getCell(i) == null) {
                    Cell blankCell = groupHeaderRow.createCell(i);
                    blankCell.setCellStyle(headerStyle);
                }
            }

            String[] subColumns = {"Amount (Rs.)", "Cost/Kg", "Amount (Rs.)", "Cost/Kg", "Last Month", "YTD"};
            Cell workItemSubHeader = subHeaderRow.createCell(0);
            workItemSubHeader.setCellValue("Work Item");
            workItemSubHeader.setCellStyle(headerStyle);
            for (int i = 0; i < subColumns.length; i++) {
                Cell cell = subHeaderRow.createCell(i + 1);
                cell.setCellValue(subColumns[i]);
                cell.setCellStyle(headerStyle);
            }

            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(3, 3, 1, 2));
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(3, 3, 3, 4));
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(3, 3, 5, 6));

            JsonNode categories = objectMapper.readTree(resolved.getCostData());
            CropWeights cropWeights = fetchCropWeights(tenantId, cropType, date);
            int rowIdx = 5;
            if (categories.isArray()) {
                for (JsonNode catNode : categories) {
                    String categoryName = catNode.path("name").asText("");
                    JsonNode items = catNode.path("items");
                    if (!items.isArray()) {
                        continue;
                    }

                    Row categoryRow = sheet.createRow(rowIdx++);
                    for (int i = 0; i < 7; i++) {
                        Cell categoryCell = categoryRow.createCell(i);
                        categoryCell.setCellStyle(categoryStyle);
                    }
                    categoryRow.getCell(0).setCellValue(categoryName);

                    double totalDayAmount = 0.0;
                    double totalTodateAmount = 0.0;
                    double totalLastMonthAmount = 0.0;
                    double totalYtdAmount = 0.0;
                    for (JsonNode itemNode : items) {
                        Row row = sheet.createRow(rowIdx++);
                        Cell workItemCell = row.createCell(0);
                        workItemCell.setCellValue(itemNode.path("name").asText(""));
                        workItemCell.setCellStyle(itemTextStyle);

                        double dayAmount = parseAmount(itemNode.path("dayAmount").asText("0"));
                        totalDayAmount += dayAmount;
                        createAmountCell(row, 1, dayAmount, amountStyle);
                        createTextCell(row, 2, resolveCostPerKgValue(
                                itemNode.path("dayCostPerKgOverride").asText(""),
                                dayAmount,
                                cropWeights.dayWeight), amountStyle);
                        double todateAmount = parseAmount(itemNode.path("todateAmount").asText("0"));
                        totalTodateAmount += todateAmount;
                        createAmountCell(row, 3, todateAmount, amountStyle);
                        createTextCell(row, 4, resolveCostPerKgValue(
                                itemNode.path("todateCostPerKgOverride").asText(""),
                                todateAmount,
                                cropWeights.todateWeight), amountStyle);
                        double lastMonthAmount = parseAmount(itemNode.path("lastMonthAmount").asText("0"));
                        double ytdAmount = parseAmount(itemNode.path("ytdAmount").asText("0"));
                        totalLastMonthAmount += lastMonthAmount;
                        totalYtdAmount += ytdAmount;
                        createAmountCell(row, 5, lastMonthAmount, amountStyle);
                        createAmountCell(row, 6, ytdAmount, amountStyle);
                    }

                    Row summaryRow = sheet.createRow(rowIdx++);
                    Cell summaryLabelCell = summaryRow.createCell(0);
                    summaryLabelCell.setCellValue("Total Cost for " + categoryName);
                    summaryLabelCell.setCellStyle(summaryLabelStyle);
                    createAmountCell(summaryRow, 1, totalDayAmount, summaryAmountStyle);
                    createTextCell(summaryRow, 2, resolveCostPerKgValue("", totalDayAmount, cropWeights.dayWeight), summaryAmountStyle);
                    createAmountCell(summaryRow, 3, totalTodateAmount, summaryAmountStyle);
                    createTextCell(summaryRow, 4, resolveCostPerKgValue("", totalTodateAmount, cropWeights.todateWeight), summaryAmountStyle);
                    createAmountCell(summaryRow, 5, totalLastMonthAmount, summaryAmountStyle);
                    createAmountCell(summaryRow, 6, totalYtdAmount, summaryAmountStyle);
                }
            }

            int filterLastRow = Math.max(4, rowIdx - 1);
            sheet.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(4, filterLastRow, 0, 6));

            sheet.setZoom(108);
            // Use fixed widths so Excel filter arrows don't crush the grouped header labels.
            sheet.setColumnWidth(0, 10500);
            sheet.setColumnWidth(1, 4200);
            sheet.setColumnWidth(2, 3000);
            sheet.setColumnWidth(3, 4200);
            sheet.setColumnWidth(4, 3000);
            sheet.setColumnWidth(5, 3600);
            sheet.setColumnWidth(6, 3200);

            workbook.write(out);
            String filename = "Cost_Analysis_" + cropType + "_" + date + ".xlsx";
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.parseMediaType(
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(out.toByteArray());
        } catch (IOException ex) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping(value = "/report-excel", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadExcelReport(
            @RequestParam String tenantId,
            @RequestParam String cropType,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam("file") MultipartFile file) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Excel file is required"));
        }

        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            DataFormatter formatter = new DataFormatter();
            FormulaEvaluator evaluator = workbook.getCreationHelper().createFormulaEvaluator();

            Map<String, List<ObjectNode>> byCategory = new LinkedHashMap<>();
            String currentCategory = null;
            for (int i = 0; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) {
                    continue;
                }

                String col0 = formatter.formatCellValue(row.getCell(0), evaluator).trim();
                String col1 = formatter.formatCellValue(row.getCell(1), evaluator).trim();
                String col2 = formatter.formatCellValue(row.getCell(2), evaluator).trim();
                String col3 = formatter.formatCellValue(row.getCell(3), evaluator).trim();
                String col4 = formatter.formatCellValue(row.getCell(4), evaluator).trim();
                String col5 = formatter.formatCellValue(row.getCell(5), evaluator).trim();
                String col6 = formatter.formatCellValue(row.getCell(6), evaluator).trim();

                if (col0.isEmpty() && col1.isEmpty() && col2.isEmpty() && col3.isEmpty() && col4.isEmpty() && col5.isEmpty() && col6.isEmpty()) {
                    continue;
                }

                if (equalsIgnoreCaseAny(col0, "Work Item", "Category", "Cost Analysis", "Date", "Time")
                        || col0.startsWith("Date")
                        || col0.startsWith("Time")
                        || col0.equalsIgnoreCase(cropType)) {
                    continue;
                }

                if (col0.startsWith("Total Cost for ")) {
                    continue;
                }

                boolean looksLikeFlatRow = currentCategory == null
                        && !col0.isEmpty() && !col1.isEmpty()
                        && (!col2.isEmpty() || !col3.isEmpty() || !col4.isEmpty() || !col5.isEmpty() || !col6.isEmpty());
                if (looksLikeFlatRow) {
                    ObjectNode itemNode = createExcelItemNode(col1, col2);
                    byCategory.computeIfAbsent(col0, k -> new ArrayList<>()).add(itemNode);
                    continue;
                }

                boolean looksLikeCategoryRow = !col0.isEmpty() && col1.isEmpty() && col2.isEmpty() && col3.isEmpty() && col4.isEmpty() && col5.isEmpty() && col6.isEmpty();
                if (looksLikeCategoryRow) {
                    currentCategory = col0;
                    byCategory.computeIfAbsent(currentCategory, k -> new ArrayList<>());
                    continue;
                }

                if (currentCategory == null || col0.isEmpty()) {
                    continue;
                }

                ObjectNode itemNode = createExcelItemNode(col0, col1);
                byCategory.computeIfAbsent(currentCategory, k -> new ArrayList<>()).add(itemNode);
            }

            if (byCategory.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "No valid rows found in the Excel sheet"));
            }

            ArrayNode categories = objectMapper.createArrayNode();
            byCategory.forEach((category, items) -> {
                ObjectNode catNode = objectMapper.createObjectNode();
                catNode.put("id", UUID.randomUUID().toString().substring(0, 8));
                catNode.put("name", category);
                ArrayNode itemsArray = objectMapper.createArrayNode();
                items.forEach(itemsArray::add);
                catNode.set("items", itemsArray);
                categories.add(catNode);
            });

            DailyCost saved = upsertDailyCost(tenantId, cropType, date, objectMapper.writeValueAsString(categories));
            return ResponseEntity.ok(saved);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid Excel file format"));
        }
    }

    private DailyCost upsertDailyCost(String tenantId, String cropType, LocalDate date, String costData) {
        String normalizedCropType = normalizeCropType(cropType);
        Optional<DailyCost> existing = dailyCostRepository.findByTenantIdAndCropTypeIgnoreCaseAndDate(tenantId, normalizedCropType, date);
        String calculatedCostData = costCalculationService.calculateAmounts(tenantId, normalizedCropType, date, costData);

        if (existing.isPresent()) {
            DailyCost toUpdate = existing.get();
            toUpdate.setCropType(normalizedCropType);
            toUpdate.setCostData(calculatedCostData);
            return dailyCostRepository.save(toUpdate);
        }

        DailyCost toCreate = new DailyCost();
        toCreate.setTenantId(tenantId);
        toCreate.setCropType(normalizedCropType);
        toCreate.setDate(date);
        toCreate.setCostData(calculatedCostData);
        return dailyCostRepository.save(toCreate);
    }

    private DailyCost resolveDailyCost(String tenantId, String cropType, LocalDate date) {
        String normalizedCropType = normalizeCropType(cropType);
        Optional<DailyCost> dailyCost = dailyCostRepository.findByTenantIdAndCropTypeIgnoreCaseAndDate(tenantId, normalizedCropType, date);
        if (dailyCost.isPresent()) {
            DailyCost cost = dailyCost.get();
            cost.setCropType(normalizedCropType);
            String updatedCostData = costCalculationService.calculateAmounts(tenantId, normalizedCropType, date, cost.getCostData());
            cost.setCostData(updatedCostData);
            dailyCostRepository.save(cost);
            return cost;
        }

        Optional<com.knoweb.tenant.entity.CropConfig> config = cropConfigRepository.findByTenantIdAndCropTypeIgnoreCase(tenantId, normalizedCropType);
        if (config.isEmpty() || config.get().getCostItems() == null) {
            return null;
        }

        String calculatedCostData = costCalculationService.calculateAmounts(
                tenantId, normalizedCropType, date, config.get().getCostItems());

        DailyCost dynamicCost = new DailyCost();
        dynamicCost.setTenantId(tenantId);
        dynamicCost.setCropType(normalizedCropType);
        dynamicCost.setDate(date);
        dynamicCost.setCostData(calculatedCostData);
        return dynamicCost;
    }

    private String normalizeCropType(String cropType) {
        return cropType == null ? "" : cropType.trim().toUpperCase(Locale.ROOT);
    }

    private double parseAmount(String text) {
        if (text == null || text.isBlank()) {
            return 0.0;
        }
        String normalized = text.replace(",", "").replaceAll("[^0-9.\\-]", "");
        try {
            return Double.parseDouble(normalized);
        } catch (Exception ex) {
            return 0.0;
        }
    }

    private ObjectNode createExcelItemNode(String itemName, String dayAmount) {
        ObjectNode itemNode = objectMapper.createObjectNode();
        itemNode.put("id", UUID.randomUUID().toString().substring(0, 8));
        itemNode.put("name", itemName);
        itemNode.put("dayAmount", String.valueOf(parseAmount(dayAmount)));
        return itemNode;
    }

    private void createAmountCell(Row row, int columnIndex, double value, CellStyle style) {
        Cell cell = row.createCell(columnIndex);
        cell.setCellValue(value);
        cell.setCellStyle(style);
    }

    private void createTextCell(Row row, int columnIndex, String value, CellStyle style) {
        Cell cell = row.createCell(columnIndex);
        if (value != null && !value.isBlank()) {
            cell.setCellValue(value);
        }
        cell.setCellStyle(style);
    }

    private String resolveCostPerKgValue(String overrideValue, double amount, double weight) {
        if (overrideValue != null && !overrideValue.isBlank()) {
            double parsedOverride = parseAmount(overrideValue);
            if (amount > 0 && parsedOverride > 0) {
                return overrideValue.trim();
            }
        }
        if (amount <= 0 || weight <= 0) {
            return "";
        }
        return String.format(Locale.US, "%.2f", amount / weight);
    }

    private CropWeights fetchCropWeights(String tenantId, String cropType, LocalDate date) {
        try {
            List<Field> fields = fieldRepository.findByTenantId(UUID.fromString(tenantId));
            Map<String, String> fieldCropMap = new HashMap<>();
            for (Field field : fields) {
                if (field.getName() != null && field.getCropType() != null) {
                    fieldCropMap.put(field.getName().toLowerCase(Locale.ROOT), field.getCropType().toUpperCase(Locale.ROOT));
                }
                if (field.getFieldId() != null && field.getCropType() != null) {
                    fieldCropMap.put(field.getFieldId().toString(), field.getCropType().toUpperCase(Locale.ROOT));
                }
            }

            String baseUrl = resolveOperationServiceBaseUrl();
            if (baseUrl == null) {
                return CropWeights.empty();
            }

            RestTemplate restTemplate = new RestTemplate();
            JsonNode records = restTemplate.getForObject(
                    baseUrl + "/api/operations/daily-work?tenantId=" + tenantId,
                    JsonNode.class);
            if (records == null || !records.isArray()) {
                return CropWeights.empty();
            }

            double dayWeight = 0.0;
            double todateWeight = 0.0;
            String wantedCrop = cropType.toUpperCase(Locale.ROOT);

            for (JsonNode workNode : records) {
                String workDateText = workNode.path("workDate").asText("");
                if (workDateText.isBlank()) {
                    continue;
                }
                LocalDate workDate = LocalDate.parse(workDateText);
                if (workDate.isAfter(date)) {
                    continue;
                }

                String bulkWeightsText = workNode.path("bulkWeights").asText("");
                if (bulkWeightsText.isBlank()) {
                    continue;
                }

                JsonNode bulkWeights = objectMapper.readTree(bulkWeightsText);
                boolean belongsToCrop = false;
                Iterator<String> fieldNames = bulkWeights.fieldNames();
                while (fieldNames.hasNext()) {
                    String key = fieldNames.next();
                    if ("__FACTORY__".equals(key)) {
                        continue;
                    }
                    String mappedCrop = fieldCropMap.get(key.toLowerCase(Locale.ROOT));
                    if (mappedCrop != null && mappedCrop.equalsIgnoreCase(wantedCrop)) {
                        belongsToCrop = true;
                        break;
                    }
                }

                if (!belongsToCrop) {
                    continue;
                }

                double factoryWeight = bulkWeights.path("__FACTORY__").path("factoryWt").asDouble(0.0);
                if (factoryWeight <= 0) {
                    continue;
                }

                if (workDate.equals(date)) {
                    dayWeight += factoryWeight;
                }
                if (workDate.getYear() == date.getYear()
                        && workDate.getMonthValue() == date.getMonthValue()
                        && !workDate.isAfter(date)) {
                    todateWeight += factoryWeight;
                }
            }

            return new CropWeights(dayWeight, todateWeight);
        } catch (Exception ex) {
            return CropWeights.empty();
        }
    }

    private String resolveOperationServiceBaseUrl() {
        List<ServiceInstance> instances = discoveryClient.getInstances("OPERATION-SERVICE");
        if (instances == null || instances.isEmpty()) {
            instances = discoveryClient.getInstances("operation-service");
        }
        if (instances == null || instances.isEmpty()) {
            return "http://localhost:8084";
        }
        return instances.get(0).getUri().toString();
    }

    private static final class CropWeights {
        private final double dayWeight;
        private final double todateWeight;

        private CropWeights(double dayWeight, double todateWeight) {
            this.dayWeight = dayWeight;
            this.todateWeight = todateWeight;
        }

        private static CropWeights empty() {
            return new CropWeights(0.0, 0.0);
        }
    }

    private boolean equalsIgnoreCaseAny(String value, String... candidates) {
        for (String candidate : candidates) {
            if (candidate.equalsIgnoreCase(value)) {
                return true;
            }
        }
        return false;
    }

    private CellStyle createTitleStyle(Workbook workbook) {
        Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        font.setFontHeightInPoints((short) 12);

        CellStyle style = workbook.createCellStyle();
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setFillForegroundColor(IndexedColors.DARK_GREEN.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        applyThinBorder(style);
        return style;
    }

    private CellStyle createRibbonLabelStyle(Workbook workbook) {
        Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        font.setFontHeightInPoints((short) 10);

        CellStyle style = workbook.createCellStyle();
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setFillForegroundColor(IndexedColors.DARK_GREEN.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        applyThinBorder(style);
        return style;
    }

    private CellStyle createRibbonValueStyle(Workbook workbook) {
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 10);

        CellStyle style = workbook.createCellStyle();
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setFillForegroundColor(IndexedColors.LEMON_CHIFFON.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        applyThinBorder(style);
        return style;
    }

    private CellStyle createCropBandStyle(Workbook workbook) {
        Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        font.setFontHeightInPoints((short) 12);

        CellStyle style = workbook.createCellStyle();
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setFillForegroundColor(IndexedColors.GREEN.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        applyThinBorder(style);
        return style;
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        Font font = workbook.createFont();
        font.setBold(true);

        CellStyle style = workbook.createCellStyle();
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        applyThinBorder(style);
        return style;
    }

    private CellStyle createCategoryStyle(Workbook workbook) {
        Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.DARK_GREEN.getIndex());

        CellStyle style = workbook.createCellStyle();
        style.setFont(font);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setFillForegroundColor(IndexedColors.LIGHT_GREEN.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        applyThinBorder(style);
        return style;
    }

    private CellStyle createItemTextStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        applyThinBorder(style);
        return style;
    }

    private CellStyle createAmountStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setAlignment(HorizontalAlignment.RIGHT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setDataFormat(workbook.createDataFormat().getFormat("0.00"));
        applyThinBorder(style);
        return style;
    }

    private CellStyle createSummaryLabelStyle(Workbook workbook) {
        Font font = workbook.createFont();
        font.setBold(true);

        CellStyle style = workbook.createCellStyle();
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        applyThinBorder(style);
        return style;
    }

    private CellStyle createSummaryAmountStyle(Workbook workbook) {
        Font font = workbook.createFont();
        font.setBold(true);

        CellStyle style = workbook.createCellStyle();
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.RIGHT);
        style.setDataFormat(workbook.createDataFormat().getFormat("0.00"));
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        applyThinBorder(style);
        return style;
    }

    private void applyThinBorder(CellStyle style) {
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setTopBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
        style.setBottomBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
        style.setLeftBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
        style.setRightBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
    }

    private void createRibbonCell(Row row, int columnIndex, String value, CellStyle style) {
        Cell cell = row.createCell(columnIndex);
        cell.setCellValue(value);
        cell.setCellStyle(style);
    }
}
