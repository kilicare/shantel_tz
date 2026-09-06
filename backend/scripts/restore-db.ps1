# Database Restore Script for Windows
# Usage: .\scripts\restore-db.ps1 <backup_file>

$ErrorActionPreference = "Stop"

if ($args.Count -eq 0) {
    Write-Host "Usage: .\scripts\restore-db.ps1 <backup_file>" -ForegroundColor Yellow
    exit 1
}

$BACKUP_FILE = $args[0]
$LOG_FILE = ".\backups\restore.log"

if (-not (Test-Path $BACKUP_FILE)) {
    Write-Host "❌ Backup file not found: $BACKUP_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "⚠️  WARNING: This will overwrite your current database!" -ForegroundColor Red
$confirm = Read-Host "Continue? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "❌ Restore cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host "📥 Starting database restore..." -ForegroundColor Green
Add-Content -Path $LOG_FILE -Value "Restore started at: $(Get-Date) using $BACKUP_FILE"

# Get database URL from environment
$DB_URL = $env:DATABASE_URL

if (-not $DB_URL) {
    Write-Host "❌ DATABASE_URL environment variable not set" -ForegroundColor Red
    exit 1
}

# Decompress if needed
if ($BACKUP_FILE -like "*.gz") {
    Write-Host "Decompressing backup..." -ForegroundColor Cyan
    $TEMP_FILE = $BACKUP_FILE -replace '\.gz$', ''
    Expand-Archive -Path $BACKUP_FILE -DestinationPath (Split-Path $TEMP_FILE) -Force
    $BACKUP_FILE = $TEMP_FILE
}

try {
    # Restore from backup
    Write-Host "Running psql restore..." -ForegroundColor Cyan
    & psql $DB_URL -f $BACKUP_FILE
    
    if ($LASTEXITCODE -ne 0) {
        throw "psql restore failed with exit code $LASTEXITCODE"
    }
    
    Write-Host "✅ Restore completed" -ForegroundColor Green
    Add-Content -Path $LOG_FILE -Value "Restore completed successfully at: $(Get-Date)"
    
    # Clean temp file if it was decompressed
    if ($TEMP_FILE -and (Test-Path $TEMP_FILE)) {
        Remove-Item $TEMP_FILE -Force
    }
    
} catch {
    Write-Host "❌ Restore failed: $_" -ForegroundColor Red
    Add-Content -Path $LOG_FILE -Value "Restore failed: $_ at: $(Get-Date)"
    exit 1
}