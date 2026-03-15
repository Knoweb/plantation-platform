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
import java.util.List;

@Service
public class CostCalculationService {

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
            ArrayNode categories = (ArrayNode) objectMapper.readTree(costDataJson);
            
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
            List<DailyCost> todateRecords = dailyCostRepository.findByTenantIdAndCropTypeAndDateBetween(
                tenantId, cropType, startOfMonth, date.minusDays(1));
            List<DailyCost> lastMonthRecords = dailyCostRepository.findByTenantIdAndCropTypeAndDateBetween(
                tenantId, cropType, prevMonthStart, prevMonthEnd);
            List<DailyCost> ytdRecords = dailyCostRepository.findByTenantIdAndCropTypeAndDateBetween(
                tenantId, cropType, ytdStart, date.minusDays(1));
            
            // Build cumulative maps per item
            for (JsonNode catNode : categories) {
                ObjectNode category = (ObjectNode) catNode;
                ArrayNode items = (ArrayNode) category.get("items");
                
                if (items == null) continue;
                
                for (JsonNode itemNode : items) {
                    ObjectNode item = (ObjectNode) itemNode;
                    String itemName = item.has("name") ? item.get("name").asText() : "";
                    
                    // Current day amount (entered by user)
                    double dayAmount = item.has("dayAmount") ? parseDouble(item.get("dayAmount").asText()) : 0.0;
                    
                    // Calculate Todate Amount (sum from start of month up to yesterday + today's amount)
                    double todateAmount = calculateSumForItem(todateRecords, itemName, "dayAmount") + dayAmount;
                    
                    // Calculate Last Month Amount
                    double lastMonthAmount = calculateSumForItem(lastMonthRecords, itemName, "dayAmount");
                    
                    // Calculate YTD Amount (sum from start of fiscal year up to yesterday + today's amount)
                    double ytdAmount = calculateSumForItem(ytdRecords, itemName, "dayAmount") + dayAmount;
                    
                    // Update the item with calculated values
                    item.put("dayAmount", String.valueOf(dayAmount));
                    item.put("todateAmount", String.valueOf(todateAmount));
                    item.put("lastMonthAmount", String.valueOf(lastMonthAmount));
                    item.put("ytdAmount", String.valueOf(ytdAmount));
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
    private double calculateSumForItem(List<DailyCost> records, String itemName, String fieldName) {
        double sum = 0.0;
        
        for (DailyCost record : records) {
            try {
                JsonNode categories = objectMapper.readTree(record.getCostData());
                if (!categories.isArray()) continue;
                
                for (JsonNode catNode : categories) {
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
}
