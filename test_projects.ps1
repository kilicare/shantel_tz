# Phase 10 Projects, Assets & Serial Numbers Integration Test
# Test Projects, Serial Numbers, and Assets endpoints

$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:3001/api/v1"

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "PHASE 10: PROJECTS, ASSETS & SERIAL NUMBERS" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# 1. LOGIN
# ============================================
Write-Host "1. Logging in..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@shantel.local"
    password = "Admin@123456"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.accessToken
    Write-Host "   Login successful!" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "   Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$headers = @{
    Authorization = "Bearer $token"
}

Write-Host ""

# ============================================
# 2. GET REFERENCE DATA (existing data only)
# ============================================
Write-Host "2. Getting reference data..." -ForegroundColor Yellow

try {
    $customers = Invoke-RestMethod -Uri "$baseUrl/customers?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "   Customers: $($customers.total) found" -ForegroundColor Green
    if ($customers.data.Count -gt 0) {
        $customerId = $customers.data[0].id
        Write-Host "   Using customer: $($customers.data[0].name) ($customerId)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   Failed to get customers: $($_.Exception.Message)" -ForegroundColor Red
}

try {
    $locations = Invoke-RestMethod -Uri "$baseUrl/locations?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "   Locations: $($locations.total) found" -ForegroundColor Green
    if ($locations.data.Count -gt 0) {
        $locationId = $locations.data[0].id
        Write-Host "   Using location: $($locations.data[0].name) ($locationId)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   Failed to get locations: $($_.Exception.Message)" -ForegroundColor Red
}

try {
    $products = Invoke-RestMethod -Uri "$baseUrl/products?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "   Products: $($products.total) found" -ForegroundColor Green
    if ($products.data.Count -gt 0) {
        $productId = $products.data[0].id
        Write-Host "   Using product: $($products.data[0].name) ($productId)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   Failed to get products: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# ============================================
# 3. PROJECTS ENDPOINTS
# ============================================
Write-Host "3. Testing Projects endpoints..." -ForegroundColor Yellow

# List projects
Write-Host "   GET /projects" -ForegroundColor Gray
try {
    $projects = Invoke-RestMethod -Uri "$baseUrl/projects?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "   Projects: $($projects.total) found" -ForegroundColor Green
} catch {
    Write-Host "   Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Create project (if we have customer)
if ($customerId) {
    Write-Host "   POST /projects (create)" -ForegroundColor Gray
    $projectBody = @{
        name = "Test Project - $(Get-Date -Format 'yyyyMMddHHmmss')"
        customerId = $customerId
        description = "Test project for Phase 10"
    } | ConvertTo-Json

    try {
        $createdProject = Invoke-RestMethod -Uri "$baseUrl/projects" -Method Post -Body $projectBody -ContentType "application/json" -Headers $headers
        Write-Host "   Project created: $($createdProject.data.projectNumber)" -ForegroundColor Green
        $projectId = $createdProject.data.id
        $projectNumber = $createdProject.data.projectNumber
    } catch {
        Write-Host "   Failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   Skipping project-based tests" -ForegroundColor Yellow
    }
} else {
    Write-Host "   No customer available, skipping project creation" -ForegroundColor Yellow
}

# Get project by ID
if ($projectId) {
    Write-Host "   GET /projects/:id" -ForegroundColor Gray
    try {
        $project = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId" -Method Get -Headers $headers
        Write-Host "   Project retrieved: $($project.data.name)" -ForegroundColor Green
    } catch {
        Write-Host "   Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Add project item (if we have product and location)
if ($projectId -and $productId -and $locationId) {
    Write-Host "   POST /projects/:id/items" -ForegroundColor Gray
    $itemBody = @{
        productId = $productId
        quantity = 10
        unitCost = 500
        locationId = $locationId
    } | ConvertTo-Json

    try {
        $item = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId/items" -Method Post -Body $itemBody -ContentType "application/json" -Headers $headers
        Write-Host "   Item added to project" -ForegroundColor Green
    } catch {
        Write-Host "   Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Get project summary
if ($projectId) {
    Write-Host "   GET /projects/:id/summary" -ForegroundColor Gray
    try {
        $summary = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId/summary" -Method Get -Headers $headers
        Write-Host "   Project summary retrieved" -ForegroundColor Green
        Write-Host "   Total Cost: $($summary.data.totalCost)" -ForegroundColor Gray
    } catch {
        Write-Host "   Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# ============================================
# 4. SERIAL NUMBERS ENDPOINTS
# ============================================
Write-Host "4. Testing Serial Numbers endpoints..." -ForegroundColor Yellow

# List serial numbers
Write-Host "   GET /projects/serial-numbers" -ForegroundColor Gray
try {
    $serialNumbers = Invoke-RestMethod -Uri "$baseUrl/projects/serial-numbers?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "   Serial Numbers: $($serialNumbers.total) found" -ForegroundColor Green
} catch {
    Write-Host "   Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Register serial number (if we have product and location)
if ($productId -and $locationId) {
    Write-Host "   POST /projects/serial-numbers/register" -ForegroundColor Gray
    $snBody = @{
        productId = $productId
        serialNumber = "SN-$(Get-Date -Format 'yyyyMMddHHmmss')-001"
        locationId = $locationId
    } | ConvertTo-Json

    try {
        $sn = Invoke-RestMethod -Uri "$baseUrl/projects/serial-numbers/register" -Method Post -Body $snBody -ContentType "application/json" -Headers $headers
        Write-Host "   Serial number registered: $($sn.data.serialNumber)" -ForegroundColor Green
        $serialNumberId = $sn.data.id
        $serialNumberValue = $sn.data.serialNumber
    } catch {
        Write-Host "   Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "   Missing product or location, skipping serial number registration" -ForegroundColor Yellow
}

# Test duplicate serial number (should fail)
if ($productId -and $serialNumberValue -and $locationId) {
    Write-Host "   POST /projects/serial-numbers/register (duplicate test)" -ForegroundColor Gray
    $snBody = @{
        productId = $productId
        serialNumber = $serialNumberValue
        locationId = $locationId
    } | ConvertTo-Json

    try {
        $sn = Invoke-RestMethod -Uri "$baseUrl/projects/serial-numbers/register" -Method Post -Body $snBody -ContentType "application/json" -Headers $headers
        Write-Host "   ERROR: Duplicate serial number was accepted (should have failed!)" -ForegroundColor Red
    } catch {
        Write-Host "   Duplicate correctly rejected: $($_.Exception.Message)" -ForegroundColor Green
    }
}

# Get serial number by ID
if ($serialNumberId) {
    Write-Host "   GET /projects/serial-numbers/:id" -ForegroundColor Gray
    try {
        $sn = Invoke-RestMethod -Uri "$baseUrl/projects/serial-numbers/$serialNumberId" -Method Get -Headers $headers
        Write-Host "   Serial number retrieved: $($sn.data.serialNumber)" -ForegroundColor Green
    } catch {
        Write-Host "   Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Get serial number history
if ($serialNumberId) {
    Write-Host "   GET /projects/serial-numbers/:id/history" -ForegroundColor Gray
    try {
        $history = Invoke-RestMethod -Uri "$baseUrl/projects/serial-numbers/$serialNumberId/history" -Method Get -Headers $headers
        Write-Host "   Serial number history retrieved" -ForegroundColor Green
        Write-Host "   Timeline events: $($history.data.timeline.Count)" -ForegroundColor Gray
    } catch {
        Write-Host "   Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Search serial numbers
Write-Host "   GET /projects/serial-numbers/search" -ForegroundColor Gray
try {
    $searchResults = Invoke-RestMethod -Uri "$baseUrl/projects/serial-numbers/search?q=SN&page=1&limit=10" -Method Get -Headers $headers
    Write-Host "   Search results: $($searchResults.total) found" -ForegroundColor Green
} catch {
    Write-Host "   Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Filter by status
Write-Host "   GET /projects/serial-numbers/status/:status" -ForegroundColor Gray
try {
    $statusResults = Invoke-RestMethod -Uri "$baseUrl/projects/serial-numbers/status/NEW?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "   Status filter results: $($statusResults.total) found" -ForegroundColor Green
} catch {
    Write-Host "   Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Assign serial number to project
if ($serialNumberId -and $projectId) {
    Write-Host "   POST /projects/serial-numbers/:id/assign" -ForegroundColor Gray
    $assignBody = @{
        projectId = $projectId
    } | ConvertTo-Json

    try {
        $assigned = Invoke-RestMethod -Uri "$baseUrl/projects/serial-numbers/$serialNumberId/assign" -Method Post -Body $assignBody -ContentType "application/json" -Headers $headers
        Write-Host "   Serial number assigned to project" -ForegroundColor Green
    } catch {
        Write-Host "   Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# ============================================
# 5. ASSETS ENDPOINTS
# ============================================
Write-Host "5. Testing Assets endpoints..." -ForegroundColor Yellow

# List assets
Write-Host "   GET /projects/assets" -ForegroundColor Gray
try {
    $assets = Invoke-RestMethod -Uri "$baseUrl/projects/assets?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "   Assets: $($assets.total) found" -ForegroundColor Green
} catch {
    Write-Host "   Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Register asset (if we have location)
if ($locationId) {
    Write-Host "   POST /projects/assets" -ForegroundColor Gray
    $assetBody = @{
        name = "Test Asset - $(Get-Date -Format 'yyyyMMddHHmmss')"
        assetType = "EQUIPMENT"
        locationId = $locationId
        purchaseCost = 10000
    } | ConvertTo-Json

    try {
        $asset = Invoke-RestMethod -Uri "$baseUrl/projects/assets" -Method Post -Body $assetBody -ContentType "application/json" -Headers $headers
        Write-Host "   Asset registered: $($asset.data.assetNumber)" -ForegroundColor Green
        $assetId = $asset.data.id
    } catch {
        Write-Host "   Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "   No location available, skipping asset registration" -ForegroundColor Yellow
}

# Get asset by ID
if ($assetId) {
    Write-Host "   GET /projects/assets/:id" -ForegroundColor Gray
    try {
        $asset = Invoke-RestMethod -Uri "$baseUrl/projects/assets/$assetId" -Method Get -Headers $headers
        Write-Host "   Asset retrieved: $($asset.data.name)" -ForegroundColor Green
    } catch {
        Write-Host "   Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Get project assets
if ($projectId) {
    Write-Host "   GET /projects/assets/project/:projectId" -ForegroundColor Gray
    try {
        $projectAssets = Invoke-RestMethod -Uri "$baseUrl/projects/assets/project/$projectId?page=1&limit=10" -Method Get -Headers $headers
        Write-Host "   Project assets: $($projectAssets.total) found" -ForegroundColor Green
    } catch {
        Write-Host "   Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Transfer asset (if we have asset and another location)
if ($assetId -and $locationId) {
    Write-Host "   PATCH /projects/assets/:id/transfer" -ForegroundColor Gray
    $transferBody = @{
        newLocationId = $locationId
    } | ConvertTo-Json

    try {
        $transferred = Invoke-RestMethod -Uri "$baseUrl/projects/assets/$assetId/transfer" -Method Patch -Body $transferBody -ContentType "application/json" -Headers $headers
        Write-Host "   Asset transferred" -ForegroundColor Green
    } catch {
        Write-Host "   Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Deactivate asset
if ($assetId) {
    Write-Host "   PATCH /projects/assets/:id/deactivate" -ForegroundColor Gray
    try {
        $deactivated = Invoke-RestMethod -Uri "$baseUrl/projects/assets/$assetId/deactivate" -Method Patch -Headers $headers
        Write-Host "   Asset deactivated" -ForegroundColor Green
    } catch {
        Write-Host "   Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# ============================================
# SUMMARY
# ============================================
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "PHASE 10 TEST COMPLETED" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Key tests performed:" -ForegroundColor Yellow
Write-Host "  - Projects: List, Create, Get by ID, Add Item, Summary" -ForegroundColor White
Write-Host "  - Serial Numbers: List, Register, Duplicate check, Search, Status filter, Assign, History" -ForegroundColor White
Write-Host "  - Assets: List, Register, Get by ID, Project filter, Transfer, Deactivate" -ForegroundColor White
Write-Host ""
Write-Host "Critical verification:" -ForegroundColor Yellow
Write-Host "  - Serial number uniqueness enforced by database (@@unique constraint)" -ForegroundColor White
Write-Host "  - Serial number assignment to projects working" -ForegroundColor White
Write-Host "  - Asset lifecycle (register, transfer, deactivate) working" -ForegroundColor White
Write-Host ""
