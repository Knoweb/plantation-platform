$tenantId = "653c31b9-b0d6-4a75-a546-a5f21c699c4e"
$url = "http://localhost:8080/api/inventory"

$items = @(
    @{ name = "Urea Fertilizer"; category = "FERTILIZER"; unit = "kg"; currentQuantity = 500; bufferLevel = 100; pricePerUnit = 120.50 },
    @{ name = "Glyphosate 360"; category = "CHEMICAL"; unit = "L"; currentQuantity = 50; bufferLevel = 10; pricePerUnit = 1500.00 },
    @{ name = "Picking Basket"; category = "TOOL"; unit = "units"; currentQuantity = 200; bufferLevel = 50; pricePerUnit = 450.00 },
    @{ name = "Safety Gloves"; category = "SAFETY"; unit = "pairs"; currentQuantity = 100; bufferLevel = 20; pricePerUnit = 300.00 },
    @{ name = "Rubber Boots"; category = "SAFETY"; unit = "pairs"; currentQuantity = 60; bufferLevel = 15; pricePerUnit = 1800.00 },
    @{ name = "Pruning Shears"; category = "TOOL"; unit = "units"; currentQuantity = 75; bufferLevel = 10; pricePerUnit = 850.00 },
    @{ name = "Machete"; category = "TOOL"; unit = "units"; currentQuantity = 40; bufferLevel = 5; pricePerUnit = 1200.00 },
    @{ name = "Face Mask"; category = "SAFETY"; unit = "units"; currentQuantity = 1000; bufferLevel = 200; pricePerUnit = 50.00 },
    @{ name = "Dolomite"; category = "FERTILIZER"; unit = "kg"; currentQuantity = 1000; bufferLevel = 200; pricePerUnit = 40.00 },
    @{ name = "Zinc Sulphate"; category = "FERTILIZER"; unit = "kg"; currentQuantity = 300; bufferLevel = 50; pricePerUnit = 250.00 }
)

foreach ($item in $items) {
    $item.tenantId = $tenantId
    $json = $item | ConvertTo-Json
    Invoke-RestMethod -Uri $url -Method Post -Body $json -ContentType "application/json"
    Write-Host "Seeded: $($item.name)"
}
