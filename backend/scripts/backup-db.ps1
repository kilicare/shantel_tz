# Database Backup Script for Windows
# Usage: .\scripts\backup-db.ps1

$ErrorActionPreference = "Stop"

$BACKUP_DIR = ".\backups"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = "$BACKUP_DIR\shantel_db_$TIMESTAMP.sql"
$LOG_FILE = "$BACKUP_DIR\backup.log"

# Create backup directory if not exists
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
}

Write-Host "📦 Starting database backup..." -ForegroundColor Green
Write-Host "Timestamp: $TIMESTAMP" -ForegroundColor Cyan
Add-Content -Path $LOG_FILE -Value "Backup started at: $(Get-Date)"

# Get database URL from environment
$DB_URL = $env:DATABASE_URL

if (-not $DB_URL) {
    Write-Host "❌ DATABASE_URL environment variable not set" -ForegroundColor Red
    exit 1
}

# Backup using pg_dump
Write-Host "Running pg_dump..." -ForegroundColor Cyan
try {
    & pg_dump $DB_URL > $BACKUP_FILE
    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump failed with exit code $LASTEXITCODE"
    }
    
    # Compress backup
    Write-Host "Compressing backup..." -ForegroundColor Cyan
    Compress-Archive -Path $BACKUP_FILE -DestinationPath "$BACKUP_FILE.gz" -Force
    Remove-Item $BACKUP_FILE
    $BACKUP_FILE = "$BACKUP_FILE.gz"
    
    $BACKUP_SIZE = (Get-Item $BACKUP_FILE).Length / 1MB
    Write-Host "✅ Backup completed: $BACKUP_FILE" -ForegroundColor Green
    Write-Host "Size: $([math]::Round($BACKUP_SIZE, 2)) MB" -ForegroundColor Cyan
    Add-Content -Path $LOG_FILE -Value "Backup completed: $BACKUP_FILE (Size: $([math]::Round($BACKUP_SIZE, 2)) MB)"
    
    # Keep only last 7 backups
    Write-Host "🧹 Cleaning old backups..." -ForegroundColor Cyan
    $oldBackups = Get-ChildItem -Path $BACKUP_DIR -Filter "shantel_db_*.sql.gz" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 7
    if ($oldBackups) {
        $oldBackups | Remove-Item -Force
        Write-Host "Removed $($oldBackups.Count) old backup(s)" -ForegroundColor Yellow
    }
    
    Write-Host "✅ Done!" -ForegroundColor Green
    Add-Content -Path $LOG_FILE -Value "Backup completed successfully at: $(Get-Date)"
    
} catch {
    Write-Host "❌ Backup failed: $_" -ForegroundColor Red
    Add-Content -Path $LOG_FILE -Value "Backup failed: $_ at: $(Get-Date)"
    exit 1
}