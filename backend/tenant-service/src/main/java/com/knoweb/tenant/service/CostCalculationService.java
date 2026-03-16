package com.knoweb.tenant.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.knoweb.tenant.entity.DailyCost;
import com.knoweb.tenant.repository.DailyCostRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class CostCalculationService {

    private static final Map<String, String> ITEM_TO_CATEGORY = new LinkedHashMap<>();
    private static final Set<String> KNOWN_CATEGORIES = new LinkedHashSet<>();

    static {
        registerCategory("Plucking",
                "Pluckers",
                "Kanganies",
                "Sack Coolies",
                "Staff OT for Plucking",
                "Leaf Bags",
                "Cash Kilos",
                "Meals",
                "Over Kilos");
        registerCategory("Chemical Weeding",
                "Chemical Weeding ManDays",
                "Cost of Chemical",
                "Tank Repair",
                "Meals",
                "Transport");
        registerCategory("Manual Weeding",
                "Manual Weeding ManDays",
                "Tools");
        registerCategory("Fertilizing", "Fertilizer Cost");
    }

    private final DailyCostRepository dailyCostRepository;
    private final ObjectMapper objectMapper;

    public CostCalculationService(DailyCostRepository dailyCostRepository, ObjectMapper objectMapper) {
        this.dailyCostRepository = dailyCostRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Automatically calculates Todate, Last Month, and YTD amounts based on Day Amount.
     * 
     * @param tenantId Tenant ID
     * @param cropType Crop type (Tea, Rubber, etc.)
     * @param date Selected date
     * @param costDataJson JSON string containing categories with Day Amount entered
     * @return Updated JSON string with all amounts calculated
     */
    public String calculateAmounts(String tenantId, String cropType, LocalDate date, String costDataJson) {
        try {
            ArrayNode categories = normalizeCategories(costDataJson);
            
            // Calculate date ranges
            LocalDate startOfMonth = date.withDayOfMonth(1);
            LocalDate endOfMonth = YearMonth.from(date).atEndOfMonth();
            
            // Previous month
            YearMonth prevMonth = YearMonth.from(date).minusMonths(1);
            LocalDate prevMonthStart = prevMonth.atDay(1);
            LocalDate prevMonthEnd = prevMonth.atEndOfMonth();
            
            // Year-to-date (assuming fiscal year starts April 1)
            int fiscalYearStart = date.getMonthValue() >= 4 ? date.getYear() : date.getYear() - 1;
            LocalDate ytdStart = LocalDate.of(fiscalYearStart, 4, 1);
            
            // Fetch historical data up to yesterday to avoid reading old current-day data
            List<DailyCost> todateRecords = deduplicateByDate(dailyCostRepository.findByTenantIdAndCropTypeAndDateBetween(
                tenantId, cropType, startOfMonth, date.minusDays(1)));
            List<DailyCost> lastMonthRecords = deduplicateByDate(dailyCostRepository.findByTenantIdAndCropTypeAndDateBetween(
                tenantId, cropType, prevMonthStart, prevMonthEnd));
            List<DailyCost> ytdRecords = deduplicateByDate(dailyCostRepository.findByTenantIdAndCropTypeAndDateBetween(
                tenantId, cropType, ytdStart, date.minusDays(1)));
            
            // Build cumulative maps per item
            for (JsonNode catNode : categories) {
                ObjectNode category = (ObjectNode) catNode;
                ArrayNode items = (ArrayNode) category.get("items");
                
                if (items == null) continue;
                
                String categoryName = category.path("name").asText("");

                for (JsonNode itemNode : items) {
                    ObjectNode item = (ObjectNode) itemNode;
                    String itemName = item.has("name") ? item.get("name").asText() : "";
                    
                    // Current day amount (entered by user)
                    double dayAmount = item.has("dayAmount") ? parseDouble(item.get("dayAmount").asText()) : 0.0;
                    
                    // Calculate Todate Amount (sum from start of month up to yesterday + today's amount)
                    double todateAmount = calculateSumForItem(todateRecords, categoryName, itemName, "dayAmount") + dayAmount;
                    
                    // Calculate Last Month Amount
                    double lastMonthAmount = calculateSumForItem(lastMonthRecords, categoryName, itemName, "dayAmount");
                    
                    // Calculate YTD Amount (sum from start of fiscal year up to yesterday + today's amount)
                    double ytdAmount = calculateSumForItem(ytdRecords, categoryName, itemName, "dayAmount") + dayAmount;

                    // Manual Excel values win when present; blanks fall back to automatic calculation.
                    String manualTodate = sanitizeAmountOverride(
                            item,
                            "todateAmountOverride",
                            "todateCostPerKgOverride",
                            todateAmount,
                            dayAmount,
                            ytdAmount);
                    String manualLastMonth = sanitizeAmountOverride(
                            item,
                            "lastMonthAmountOverride",
                            null,
                            lastMonthAmount,
                            dayAmount,
                            ytdAmount);
                    String manualYtd = sanitizeAmountOverride(
                            item,
                            "ytdAmountOverride",
                            null,
                            ytdAmount,
                            dayAmount,
                            ytdAmount);
                    
                    // Update the item with calculated values
                    item.put("dayAmount", String.valueOf(dayAmount));
                    item.put("todateAmount", manualTodate != null ? String.valueOf(parseDouble(manualTodate)) : String.valueOf(todateAmount));
                    item.put("lastMonthAmount", manualLastMonth != null ? String.valueOf(parseDouble(manualLastMonth)) : String.valueOf(lastMonthAmount));
                    item.put("ytdAmount", manualYtd != null ? String.valueOf(parseDouble(manualYtd)) : String.valueOf(ytdAmount));
                }
            }
            
            return objectMapper.writeValueAsString(categories);
            
        } catch (Exception e) {
            // If calculation fails, return original data
            return costDataJson;
        }
    }
    
    /**
     * Calculates the sum of amounts for a specific item across multiple daily records.
     */
    private double calculateSumForItem(List<DailyCost> records, String categoryName, String itemName, String fieldName) {
        double sum = 0.0;
        
        for (DailyCost record : records) {
            try {
                ArrayNode categories = normalizeCategories(record.getCostData());
                if (!categories.isArray()) continue;
                
                for (JsonNode catNode : categories) {
                    String recordCategoryName = catNode.path("name").asText("");
                    if (!recordCategoryName.equals(categoryName)) {
                        continue;
                    }

                    JsonNode items = catNode.get("items");
                    if (items == null || !items.isArray()) continue;
                    
                    for (JsonNode itemNode : items) {
                        String name = itemNode.has("name") ? itemNode.get("name").asText() : "";
                        if (name.equals(itemName) && itemNode.has(fieldName)) {
                            sum += parseDouble(itemNode.get(fieldName).asText());
                        }
                    }
                }
            } catch (Exception e) {
                // Skip malformed records
            }
        }
        
        return sum;
    }

    private List<DailyCost> deduplicateByDate(List<DailyCost> records) {
        LinkedHashMap<LocalDate, DailyCost> latestByDate = new LinkedHashMap<>();

        for (DailyCost record : records) {
            if (record == null || record.getDate() == null) {
                continue;
            }

            DailyCost existing = latestByDate.get(record.getDate());
            if (existing == null || (record.getId() != null && existing.getId() != null && record.getId() > existing.getId())) {
                latestByDate.put(record.getDate(), record);
            } else if (existing == null) {
                latestByDate.put(record.getDate(), record);
            }
        }

        return new ArrayList<>(latestByDate.values());
    }
    
    /**
     * Safely parse double from string, returning 0 if invalid.
     */
    private double parseDouble(String value) {
        try {
            return Double.parseDouble(value.trim());
        } catch (Exception e) {
            return 0.0;
        }
    }

    private String readOptionalText(ObjectNode item, String fieldName) {
        if (!item.has(fieldName)) {
            return null;
        }
        String value = item.get(fieldName).asText();
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String sanitizeAmountOverride(
            ObjectNode item,
            String overrideField,
            String pairedCostPerKgField,
            double automaticAmount,
            double dayAmount,
            double ytdAmount) {
        String manualValue = readOptionalText(item, overrideField);
        if (manualValue == null) {
            item.remove(overrideField);
            return null;
        }

        double parsedManual = parseDouble(manualValue);
        if (parsedManual <= 0) {
            return manualValue;
        }

        if (isLikelyShiftedCostPerKg(parsedManual, automaticAmount, dayAmount, ytdAmount)) {
            if (pairedCostPerKgField != null && readOptionalText(item, pairedCostPerKgField) == null) {
                item.put(pairedCostPerKgField, formatDecimal(parsedManual));
            }
            item.remove(overrideField);
            return null;
        }

        return manualValue;
    }

    private ArrayNode normalizeCategories(String costDataJson) throws Exception {
        JsonNode root = objectMapper.readTree(costDataJson);
        if (!root.isArray()) {
            return objectMapper.createArrayNode();
        }

        LinkedHashMap<String, ArrayNode> grouped = new LinkedHashMap<>();

        for (JsonNode catNode : root) {
            String categoryName = catNode.path("name").asText("").trim();
            if (categoryName.isEmpty()) {
                continue;
            }

            JsonNode itemsNode = catNode.path("items");
            if (!itemsNode.isArray()) {
                itemsNode = objectMapper.createArrayNode();
            }

            // Repair malformed uploads where the work item became the category name.
            if (ITEM_TO_CATEGORY.containsKey(categoryName) && !KNOWN_CATEGORIES.contains(categoryName)) {
                String targetCategory = ITEM_TO_CATEGORY.get(categoryName);
                ArrayNode bucket = grouped.computeIfAbsent(targetCategory, key -> objectMapper.createArrayNode());
                JsonNode sourceItem = itemsNode.size() > 0 ? itemsNode.get(0) : objectMapper.createObjectNode();
                bucket.add(repairMalformedItem(categoryName, sourceItem));
                continue;
            }

            ArrayNode bucket = grouped.computeIfAbsent(categoryName, key -> objectMapper.createArrayNode());
            for (JsonNode itemNode : itemsNode) {
                String itemName = itemNode.path("name").asText("").trim();
                if (itemName.isEmpty()) {
                    continue;
                }

                ObjectNode cleanedItem = objectMapper.createObjectNode();
                cleanedItem.put("id", itemNode.path("id").asText(java.util.UUID.randomUUID().toString().substring(0, 8)));
                cleanedItem.put("name", itemName);
                copyIfPresent(itemNode, cleanedItem, "dayAmount");
                copyIfPresent(itemNode, cleanedItem, "todateAmount");
                copyIfPresent(itemNode, cleanedItem, "lastMonthAmount");
                copyIfPresent(itemNode, cleanedItem, "ytdAmount");
                copyIfPresent(itemNode, cleanedItem, "todateAmountOverride");
                copyIfPresent(itemNode, cleanedItem, "lastMonthAmountOverride");
                copyIfPresent(itemNode, cleanedItem, "ytdAmountOverride");
                copyIfPresent(itemNode, cleanedItem, "dayCostPerKgOverride");
                copyIfPresent(itemNode, cleanedItem, "todateCostPerKgOverride");
                sanitizeCostOverrides(cleanedItem);
                upsertItem(bucket, cleanedItem);
            }
        }

        ArrayNode normalized = objectMapper.createArrayNode();
        for (Map.Entry<String, ArrayNode> entry : grouped.entrySet()) {
            ObjectNode category = objectMapper.createObjectNode();
            category.put("id", java.util.UUID.randomUUID().toString().substring(0, 8));
            category.put("name", entry.getKey());
            category.set("items", entry.getValue());
            normalized.add(category);
        }
        return normalized;
    }

    private ObjectNode repairMalformedItem(String workItemName, JsonNode sourceItem) {
        ObjectNode repaired = objectMapper.createObjectNode();
        repaired.put("id", sourceItem.path("id").asText(java.util.UUID.randomUUID().toString().substring(0, 8)));
        repaired.put("name", workItemName);

        String sourceName = sourceItem.path("name").asText("").trim();
        double sourceNameNumber = parseDouble(sourceName);
        double dayAmount = parseDouble(sourceItem.path("dayAmount").asText("0"));
        double todateAmount = parseDouble(sourceItem.path("todateAmount").asText("0"));
        double ytdAmount = parseDouble(sourceItem.path("ytdAmount").asText("0"));

        repaired.put("dayAmount", String.valueOf(dayAmount));

        // Recover the earlier row layout if the work item name column was shifted into a numeric cell.
        if (sourceNameNumber > 0 && (Math.abs(ytdAmount - sourceNameNumber) < 0.001 || todateAmount == 0.0)) {
            repaired.put("todateAmountOverride", String.valueOf(sourceNameNumber));
            if (todateAmount > 0) {
                repaired.put("todateCostPerKgOverride", formatDecimal(todateAmount));
            }
        } else {
            copyIfPresent(sourceItem, repaired, "todateAmountOverride");
            copyIfPresent(sourceItem, repaired, "todateCostPerKgOverride");
        }

        copyIfPresent(sourceItem, repaired, "lastMonthAmountOverride");
        copyIfPresent(sourceItem, repaired, "ytdAmountOverride");
        copyIfPresent(sourceItem, repaired, "dayCostPerKgOverride");
        copyIfPresent(sourceItem, repaired, "lastMonthAmount");
        copyIfPresent(sourceItem, repaired, "ytdAmount");
        sanitizeCostOverrides(repaired);
        return repaired;
    }

    private void upsertItem(ArrayNode items, ObjectNode candidate) {
        String candidateName = candidate.path("name").asText("");
        for (JsonNode existing : items) {
            if (candidateName.equalsIgnoreCase(existing.path("name").asText(""))) {
                mergePreferred((ObjectNode) existing, candidate);
                return;
            }
        }
        items.add(candidate);
    }

    private void mergePreferred(ObjectNode existing, ObjectNode candidate) {
        String[] fields = {
                "dayAmount",
                "todateAmount",
                "lastMonthAmount",
                "ytdAmount",
                "todateAmountOverride",
                "lastMonthAmountOverride",
                "ytdAmountOverride",
                "dayCostPerKgOverride",
                "todateCostPerKgOverride"
        };
        for (String field : fields) {
            String existingValue = existing.path(field).asText("").trim();
            String candidateValue = candidate.path(field).asText("").trim();
            if (existingValue.isEmpty() || "0.0".equals(existingValue) || "0".equals(existingValue) || "-".equals(existingValue)) {
                if (!candidateValue.isEmpty() && !"-".equals(candidateValue)) {
                    existing.put(field, candidateValue);
                }
            }
        }
    }

    private void copyIfPresent(JsonNode source, ObjectNode target, String fieldName) {
        if (source.has(fieldName)) {
            String value = source.path(fieldName).asText("");
            if (!value.trim().isEmpty()) {
                target.put(fieldName, value.trim());
            }
        }
    }

    private void sanitizeCostOverrides(ObjectNode item) {
        sanitizeCostOverride(item, "dayAmount", "dayCostPerKgOverride");
        sanitizeCostOverride(item, "todateAmount", "todateCostPerKgOverride");
    }

    private void sanitizeCostOverride(ObjectNode item, String amountField, String overrideField) {
        if (!item.has(overrideField)) {
            return;
        }

        double amount = parseDouble(item.path(amountField).asText("0"));
        String overrideText = item.path(overrideField).asText("").trim();
        double overrideValue = parseDouble(overrideText);

        if (overrideText.isEmpty() || amount <= 0 || overrideValue <= 0) {
            item.remove(overrideField);
            return;
        }

        double todateAmount = parseDouble(item.path("todateAmount").asText("0"));
        double ytdAmount = parseDouble(item.path("ytdAmount").asText("0"));
        double lastMonthAmount = parseDouble(item.path("lastMonthAmount").asText("0"));
        double dayAmount = parseDouble(item.path("dayAmount").asText("0"));

        // Reject values that were clearly shifted from amount columns during a malformed Excel import.
        if ((todateAmount > 0 && Math.abs(overrideValue - todateAmount) < 0.001)
                || (ytdAmount > 0 && Math.abs(overrideValue - ytdAmount) < 0.001)
                || (lastMonthAmount > 0 && Math.abs(overrideValue - lastMonthAmount) < 0.001)
                || (dayAmount > 0 && Math.abs(overrideValue - dayAmount) < 0.001)
                || isClearlyInvalidCostPerKg(overrideValue, amount)) {
            item.remove(overrideField);
        }
    }

    private boolean isLikelyShiftedCostPerKg(
            double overrideValue,
            double automaticAmount,
            double dayAmount,
            double ytdAmount) {
        if (overrideValue <= 0) {
            return false;
        }

        if (dayAmount > 0 && overrideValue + 0.001 < dayAmount) {
            return true;
        }

        if (automaticAmount >= 100 && overrideValue <= 10 && overrideValue <= automaticAmount * 0.01) {
            return true;
        }

        return ytdAmount >= 100 && overrideValue <= 10 && overrideValue <= ytdAmount * 0.01;
    }

    private boolean isClearlyInvalidCostPerKg(double overrideValue, double amount) {
        if (overrideValue <= 0 || amount <= 0) {
            return false;
        }

        if (overrideValue >= 100 && amount >= 100) {
            return true;
        }

        return overrideValue >= amount * 0.2;
    }

    private String formatDecimal(double value) {
        return String.format(Locale.US, "%.2f", value);
    }

    private static void registerCategory(String category, String... items) {
        KNOWN_CATEGORIES.add(category);
        for (String item : items) {
            ITEM_TO_CATEGORY.put(item, category);
        }
    }
}
