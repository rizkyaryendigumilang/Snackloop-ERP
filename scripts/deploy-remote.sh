#!/usr/bin/env bash
set -Eeuo pipefail

TARGET_DIR="${1:-/srv/www/snackloop}"
SLUG="${2:-snackloop}"
RELEASE_SHA="${3:-}"

if [[ ! "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "::error::Invalid release SHA format: $RELEASE_SHA"
  exit 1
fi

PARENT_DIR="$HOME/.deploy-$SLUG"
STAGE_DIR="$PARENT_DIR/stage-$RELEASE_SHA"
BACKUP_DIR="$PARENT_DIR/backups"
TIMESTAMP=$(date +%s)
BACKUP_FILE="$BACKUP_DIR/backup-${RELEASE_SHA}-${TIMESTAMP}.tar.gz"
BUNDLE_ARCHIVE="$HOME/web-dist-${RELEASE_SHA}.tar.gz"

mkdir -p "$PARENT_DIR" "$BACKUP_DIR"

DEPLOY_STATUS="INIT"
IS_DIRTY=0

cleanup_and_rollback() {
  local exit_code=$?
  trap - EXIT ERR INT TERM

  if [ "$DEPLOY_STATUS" != "SUCCESS" ]; then
    echo "::error::Deployment failure detected (state: ${DEPLOY_STATUS}, exit code: $exit_code)."
    if [ "$IS_DIRTY" -eq 1 ]; then
      if [ -n "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
        echo "=========================================================="
        echo "⚠️ AUTOMATIC ROLLBACK TRIGGERED"
        echo "Restoring previous release from backup: $BACKUP_FILE"
        echo "=========================================================="
        if tar -tzf "$BACKUP_FILE" >/dev/null 2>&1; then
          mkdir -p "$STAGE_DIR/restore"
          tar -xzf "$BACKUP_FILE" -C "$STAGE_DIR/restore"
          if command -v rsync >/dev/null 2>&1; then
            rsync -rlptD --no-owner --no-group --delete --chmod=D755,F644 "$STAGE_DIR/restore/" "$TARGET_DIR/" || cp -a "$STAGE_DIR/restore/." "$TARGET_DIR/"
          else
            cp -a "$STAGE_DIR/restore/." "$TARGET_DIR/"
          fi
          echo "✅ Rollback completed successfully to previous live state."
        else
          echo "::error::CRITICAL: Backup archive corrupted! Rollback cannot be completed safely."
        fi
      fi
    fi
  fi

  # Cleanup temporary staging
  rm -rf "$STAGE_DIR"
  rm -f "$BUNDLE_ARCHIVE"

  if [ "$DEPLOY_STATUS" != "SUCCESS" ] && [ "$exit_code" -eq 0 ]; then
    exit 1
  fi
  exit "$exit_code"
}

trap cleanup_and_rollback EXIT ERR INT TERM

# Step 1: Ensure target directory exists and is writable
echo "[deploy] 1/7 Checking target directory: $TARGET_DIR"
if [ ! -d "$TARGET_DIR" ]; then
  mkdir -p "$TARGET_DIR" 2>/dev/null || sudo -n mkdir -p "$TARGET_DIR" 2>/dev/null || true
fi

if [ ! -d "$TARGET_DIR" ]; then
  echo "::error::Target directory does not exist and could not be created: $TARGET_DIR"
  exit 1
fi

if [ ! -w "$TARGET_DIR" ]; then
  echo "[deploy] Target not writable by $USER, attempting non-interactive chown..."
  sudo -n chown -R "$USER:$USER" "$TARGET_DIR" 2>/dev/null || true
fi

if [ ! -w "$TARGET_DIR" ]; then
  echo "::error::Target directory is not writable by current user ($USER): $TARGET_DIR"
  exit 1
fi

# Step 2: Unpack release bundle to staging
echo "[deploy] 2/7 Extracting bundle into staging: $STAGE_DIR"
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR"

if [ ! -s "$BUNDLE_ARCHIVE" ]; then
  echo "::error::Release bundle archive not found: $BUNDLE_ARCHIVE"
  exit 1
fi

tar -xzf "$BUNDLE_ARCHIVE" -C "$STAGE_DIR"
chmod -R u=rwX,go=rX "$STAGE_DIR"

# Step 3: Validate staging area before touching live
echo "[deploy] 3/7 Validating staging release files..."
test -s "$STAGE_DIR/index.html" || { echo "::error::Staging validation failed: index.html missing"; exit 1; }
test -s "$STAGE_DIR/script.js" || { echo "::error::Staging validation failed: script.js missing"; exit 1; }
test -s "$STAGE_DIR/style.css" || { echo "::error::Staging validation failed: style.css missing"; exit 1; }
test -s "$STAGE_DIR/manifest.json" || { echo "::error::Staging validation failed: manifest.json missing"; exit 1; }
echo "[deploy] Staging validation passed."

# Step 4: Backup current live deployment if not empty
echo "[deploy] 4/7 Creating pre-deployment backup..."
DEPLOY_STATUS="BACKING_UP"
if [ -n "$(ls -A "$TARGET_DIR" 2>/dev/null)" ]; then
  echo "Backing up current live deployment to $BACKUP_FILE..."
  tar -czf "$BACKUP_FILE" -C "$TARGET_DIR" . 2>/dev/null || true
  if [ -s "$BACKUP_FILE" ]; then
    echo "Backup verified successfully ($(wc -c < "$BACKUP_FILE") bytes)."
    # Retain only last 5 backups
    ls -t "$BACKUP_DIR"/backup-*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm -f 2>/dev/null || true
  else
    echo "Warning: Backup archive was empty or could not be created; continuing deployment."
  fi
else
  echo "Target directory is currently empty (initial deployment); skipping backup."
fi

# Step 5: Synchronize staging release to live
echo "[deploy] 5/7 Synchronizing staging release to live directory..."
DEPLOY_STATUS="SYNCING"
IS_DIRTY=1

if command -v rsync >/dev/null 2>&1; then
  echo "[deploy] Executing non-root rsync with safe owner/group flags..."
  rsync -rlptD --no-owner --no-group --delete --chmod=D755,F644 "$STAGE_DIR/" "$TARGET_DIR/" || {
    echo "[deploy] rsync exited with non-zero; applying cp fallback..."
    cp -a "$STAGE_DIR/." "$TARGET_DIR/"
    chmod -R u=rwX,go=rX "$TARGET_DIR"
  }
else
  echo "[deploy] rsync not found, syncing via cp fallback..."
  cp -a "$STAGE_DIR/." "$TARGET_DIR/"
  chmod -R u=rwX,go=rX "$TARGET_DIR"
fi
echo "[deploy] Synchronization finished."

# Step 6: Post-Deployment Verification
echo "[deploy] 6/7 Running post-deployment verification..."
DEPLOY_STATUS="POST_VERIFYING"
test -s "$TARGET_DIR/index.html" || { echo "::error::Post-deploy check failed: index.html missing in live"; exit 1; }

# Check title and key tags
grep -q "<title>SnackLoop ERP" "$TARGET_DIR/index.html" || { echo "::error::HTML title check failed"; exit 1; }
grep -q "script.js" "$TARGET_DIR/index.html" || { echo "::error::HTML script.js check failed"; exit 1; }
grep -q "style.css" "$TARGET_DIR/index.html" || { echo "::error::HTML style.css check failed"; exit 1; }
grep -q "manifest.json" "$TARGET_DIR/index.html" || { echo "::error::HTML manifest.json check failed"; exit 1; }

# Verify required core assets
REQUIRED_ASSETS=(
  "script.js"
  "style.css"
  "manifest.json"
  "sw.js"
  "Snackloop-logo.png"
  "Snackloop-logo.svg"
  "favicon-32x32.png"
  "favicon.ico"
  "apple-touch-icon.png"
  "icon-192.png"
  "icon-512.png"
  "icon-maskable-192.png"
  "icon-maskable-512.png"
)

for asset in "${REQUIRED_ASSETS[@]}"; do
  if [ ! -s "$TARGET_DIR/$asset" ]; then
    echo "::error::Required referenced asset missing or empty: $asset in $TARGET_DIR"
    exit 1
  fi
  echo "  ✔ Asset verified: $asset ($(wc -c < "$TARGET_DIR/$asset") bytes)"
done

# Step 7: Web server HTTP probe
echo "[deploy] 7/7 Web server HTTP probe..."
if command -v curl >/dev/null 2>&1; then
  LOCAL_CODE=$(curl -s -L --max-time 5 -o /dev/null -w "%{http_code}" http://127.0.0.1/ 2>/dev/null || true)
  echo "Local HTTP probe status code: ${LOCAL_CODE:-no response}"
fi

DEPLOY_STATUS="SUCCESS"
echo "=========================================================="
echo "✅ DEPLOYMENT AND VERIFICATION COMPLETED SUCCESSFULLY"
echo "Deployed commit: $RELEASE_SHA"
echo "Target directory: $TARGET_DIR"
echo "=========================================================="
