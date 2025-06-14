#!/bin/bash

# Backup script for AJ Long Electric FSM
# Performs automated backups of database and media files

set -e

# Configuration
BACKUP_DIR="/backups"
DB_HOST="postgres"
DB_NAME="fsm_db"
DB_USER="fsm_user"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to cleanup old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days"
    find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete
}

# Function to backup database
backup_database() {
    local backup_file="$BACKUP_DIR/fsm_db_$TIMESTAMP.sql.gz"
    
    log "Starting database backup to $backup_file"
    
    # Create database dump
    pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
        --no-password \
        --verbose \
        --clean \
        --no-owner \
        --no-privileges \
        | gzip > "$backup_file"
    
    if [ $? -eq 0 ]; then
        log "Database backup completed successfully"
        # Verify backup file
        if [ -f "$backup_file" ] && [ -s "$backup_file" ]; then
            local size=$(du -h "$backup_file" | cut -f1)
            log "Backup file size: $size"
        else
            log "ERROR: Backup file is empty or doesn't exist"
            exit 1
        fi
    else
        log "ERROR: Database backup failed"
        exit 1
    fi
}

# Function to backup media files
backup_media() {
    local media_backup="$BACKUP_DIR/media_$TIMESTAMP.tar.gz"
    local media_dir="/app/media"
    
    if [ -d "$media_dir" ]; then
        log "Starting media files backup to $media_backup"
        
        tar -czf "$media_backup" -C "$(dirname "$media_dir")" "$(basename "$media_dir")"
        
        if [ $? -eq 0 ]; then
            log "Media backup completed successfully"
            local size=$(du -h "$media_backup" | cut -f1)
            log "Media backup file size: $size"
        else
            log "ERROR: Media backup failed"
            exit 1
        fi
    else
        log "Media directory $media_dir not found, skipping media backup"
    fi
}

# Function to create backup manifest
create_manifest() {
    local manifest_file="$BACKUP_DIR/manifest_$TIMESTAMP.txt"
    
    log "Creating backup manifest"
    
    cat > "$manifest_file" << EOF
Backup Manifest
===============
Timestamp: $TIMESTAMP
Date: $(date)
Database: $DB_NAME
Host: $DB_HOST

Files:
EOF
    
    # List backup files
    ls -la "$BACKUP_DIR"/*_$TIMESTAMP.* >> "$manifest_file" 2>/dev/null || true
    
    log "Backup manifest created: $manifest_file"
}

# Function to upload to cloud storage (if configured)
upload_to_cloud() {
    if [ -n "$AWS_S3_BUCKET" ]; then
        log "Uploading backups to S3 bucket: $AWS_S3_BUCKET"
        
        # Upload database backup
        aws s3 cp "$BACKUP_DIR/fsm_db_$TIMESTAMP.sql.gz" "s3://$AWS_S3_BUCKET/backups/"
        
        # Upload media backup if it exists
        if [ -f "$BACKUP_DIR/media_$TIMESTAMP.tar.gz" ]; then
            aws s3 cp "$BACKUP_DIR/media_$TIMESTAMP.tar.gz" "s3://$AWS_S3_BUCKET/backups/"
        fi
        
        # Upload manifest
        aws s3 cp "$BACKUP_DIR/manifest_$TIMESTAMP.txt" "s3://$AWS_S3_BUCKET/backups/"
        
        log "Cloud upload completed"
    else
        log "No cloud storage configured, keeping local backups only"
    fi
}

# Function to send notification
send_notification() {
    local status=$1
    local message=$2
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        local color="good"
        if [ "$status" != "success" ]; then
            color="danger"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"attachments\":[{\"color\":\"$color\",\"text\":\"Backup $status: $message\"}]}" \
            "$SLACK_WEBHOOK_URL"
    fi
    
    if [ -n "$EMAIL_RECIPIENT" ]; then
        echo "$message" | mail -s "Backup $status - AJ Long Electric FSM" "$EMAIL_RECIPIENT"
    fi
}

# Main backup process
main() {
    log "Starting backup process"
    
    # Wait for database to be ready
    until pg_isready -h "$DB_HOST" -U "$DB_USER"; do
        log "Waiting for database to be ready..."
        sleep 5
    done
    
    # Perform backups
    backup_database
    backup_media
    create_manifest
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Upload to cloud if configured
    upload_to_cloud
    
    log "Backup process completed successfully"
    send_notification "success" "Backup completed at $TIMESTAMP"
}

# Error handling
trap 'log "ERROR: Backup process failed"; send_notification "failed" "Backup failed at $TIMESTAMP"; exit 1' ERR

# Run main function
main

# Keep container running if needed (for cron jobs)
if [ "${KEEP_RUNNING:-false}" = "true" ]; then
    log "Backup container will keep running for scheduled backups"
    
    # Add cron job for daily backups at 2 AM
    echo "0 2 * * * /backup.sh" | crontab -
    
    # Start cron daemon
    crond -f
else
    log "Backup container exiting"
fi