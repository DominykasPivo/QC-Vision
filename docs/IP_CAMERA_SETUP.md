# IP Camera Setup Guide

## Quick Reference (TL;DR)

```bash
# 1. Install "IP Webcam" app on Android phone, start server, note IP address

# 2. Add camera to database (replace 192.168.1.100:8080 with your phone's IP)

# Bash / Linux / Git Bash:
docker-compose exec postgres psql -U qc_user -d qc_vision -c "INSERT INTO camera_devices (name, type, status, connection_info, capabilities, created_at, updated_at, last_seen) VALUES ('Phone Camera Workshop', 'ip_camera', 'online', '{\"stream_url\": \"http://192.168.1.100:8080/video\", \"snapshot_url\": \"http://192.168.1.100:8080/shot.jpg\"}', '{\"resolution\": \"1920x1080\", \"fps\": 30}', NOW(), NOW(), NOW());"

# PowerShell (use backtick escaping):
docker-compose exec postgres psql -U qc_user -d qc_vision -c "INSERT INTO camera_devices (name, type, status, connection_info, capabilities, created_at, updated_at, last_seen) VALUES ('Phone Camera Workshop', 'ip_camera', 'online', '{`"stream_url`": `"http://192.168.1.100:8080/video`", `"snapshot_url`": `"http://192.168.1.100:8080/shot.jpg`"}', '{`"resolution`": `"1920x1080`", `"fps`": 30}', NOW(), NOW(), NOW());"

# 3. Get camera ID
docker-compose exec postgres psql -U qc_user -d qc_vision -c "SELECT id, name, type FROM camera_devices WHERE type='ip_camera';"

# 4. Test capture (replace {id} with actual camera ID)
curl http://localhost:8000/api/cameras/{id}/capture \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o test_capture.jpg
```

---

## Phase 1: Phone Setup

### 1. Install IP Webcam App
```
Android: "IP Webcam" by Pavel Khlebovich
Download from: Google Play Store (free)
```

### 2. Configure & Start Server
1. Open app
2. Scroll to bottom → "Start server"
3. Note the URL shown: `http://192.168.1.XXX:8080`
4. Test in browser: `http://192.168.1.XXX:8080/video` (should show live video)

### 3. Make IP Static (Recommended)
```
Phone Settings → WiFi → Your Network → Advanced
→ IP settings: Static
→ Set IP: 192.168.1.100 (or any available)
```

## Phase 2: Add Camera to Database

### Option A: Using NocoDB UI

1. Open NocoDB: `http://localhost:8080`
2. Navigate to `camera_devices` table
3. Add new row:
   - **name**: `"Phone Camera"` or `"Workshop IP Camera"`
   - **type**: `"ip_camera"`
   - **status**: `"online"`
   - **connection_info**: `{"stream_url": "http://192.168.1.100:8080/video", "snapshot_url": "http://192.168.1.100:8080/shot.jpg"}`
   - **capabilities**: `{"resolution": "1920x1080", "fps": 30}` (optional)

### Option B: Using API

```bash
curl -X POST http://localhost:8000/api/cameras/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Phone Camera",
    "type": "ip_camera",
    "connection_info": {
      "stream_url": "http://192.168.1.100:8080/video",
      "snapshot_url": "http://192.168.1.100:8080/shot.jpg"
    },
    "capabilities": {
      "resolution": "1920x1080",
      "fps": 30
    }
  }'
```

### Option C: Using SQL

```bash
# Bash / Linux / Git Bash:
# IMPORTANT: connection_info MUST use double quotes for valid JSON
# Requires both stream_url (live MJPEG stream) and snapshot_url (single frame capture)
docker-compose exec postgres psql -U qc_user -d qc_vision -c "INSERT INTO camera_devices (name, type, status, connection_info, capabilities, created_at, updated_at, last_seen) VALUES ('Phone Camera Workshop', 'ip_camera', 'online', '{\"stream_url\": \"http://192.168.1.100:8080/video\", \"snapshot_url\": \"http://192.168.1.100:8080/shot.jpg\"}', '{\"resolution\": \"1920x1080\", \"fps\": 30}', NOW(), NOW(), NOW());"

# PowerShell (pipe the SQL string to avoid Docker quote-escaping issues):
"INSERT INTO camera_devices (name, type, status, connection_info, capabilities, created_at, updated_at, last_seen) VALUES ('Phone Camera Workshop', 'ip_camera', 'online', '{`"stream_url`": `"http://192.168.1.100:8080/video`", `"snapshot_url`": `"http://192.168.1.100:8080/shot.jpg`"}', '{`"resolution`": `"1920x1080`", `"fps`": 30}', NOW(), NOW(), NOW());" | docker-compose exec -T postgres psql -U qc_user -d qc_vision

# Verify the camera was added
docker-compose exec postgres psql -U qc_user -d qc_vision -c "SELECT id, name, type, connection_info FROM camera_devices WHERE type='ip_camera';"

# Expected output:
#  id |         name          |   type    |              connection_info
# ----+-----------------------+-----------+-------------------------------------------
#   1 | Phone Camera Workshop | ip_camera | {"url": "http://192.168.1.100:8080/video"}
# (1 row)
```

**Replace `192.168.1.100:8080` with your actual phone's IP address!**

## Phase 3: Test Capture

### Get Your Camera ID

After adding to database, note the `id` value from the verification command above (e.g., `id = 1`).

### Test Capture via API

```bash
# Replace {camera_id} with the actual ID (e.g., 1, 2, etc.)
curl http://localhost:8000/api/cameras/{camera_id}/capture \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output test_capture.jpg

# Example with ID 1:
curl http://localhost:8000/api/cameras/1/capture \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output test_capture.jpg
```

### View in Browser
```
http://localhost:8000/api/cameras/{camera_id}/capture
```

**Note:** Replace `YOUR_TOKEN` with your actual authentication token. For testing, you can get a token by logging into the frontend and checking browser developer tools (Network tab → any API request → Authorization header).

## Phase 4: Integration with Frontend

The backend now supports IP cameras! You can:

1. **List all cameras** (includes IP cameras):
   ```
   GET /api/cameras/
   ```

2. **Capture from IP camera**:
   ```
   GET /api/cameras/{camera_id}/capture
   ```

3. **Use in your photo upload workflow**:
   - Frontend can display available IP cameras
   - User selects IP camera instead of browser webcam
   - Frontend calls `/api/cameras/{id}/capture` to get image
   - Upload to test like normal photo

## Supported URL Formats

### IP Webcam App
```json
{
  "stream_url": "http://192.168.1.100:8080/video",
  "snapshot_url": "http://192.168.1.100:8080/shot.jpg"
}
```

### DroidCam WiFi
```json
{
  "stream_url": "http://192.168.1.100:4747/video",
  "snapshot_url": "http://192.168.1.100:4747/video"
}
```
**Note:** DroidCam uses the same endpoint for both stream and snapshot.

### Generic MJPEG Stream with Snapshot
```json
{
  "stream_url": "http://camera-ip:port/video.mjpg",
  "snapshot_url": "http://camera-ip:port/snapshot.jpg"
}
```

### Backward Compatibility (deprecated)
```json
{"url": "http://192.168.1.100:8080/video"}
```
Still works but use the new format with separate stream_url and snapshot_url for best results.

## Troubleshooting

### JSON parsing error: "Expected property name or '}' in JSON"

**Problem**: Frontend shows error when loading IP camera

**Cause**: Database `connection_info` field contains single quotes instead of double quotes

**Solution**: If command-line JSON escaping fails, create a SQL file:

1. Create a temporary file (e.g., `temp_camera.sql`) with this content (replace IP address):
```sql
INSERT INTO camera_devices (name, type, status, connection_info, capabilities, created_at, updated_at, last_seen)
VALUES (
  'Phone Camera Workshop',
  'ip_camera',
  'online',
  '{"stream_url": "http://192.168.1.100:8080/video", "snapshot_url": "http://192.168.1.100:8080/shot.jpg"}',
  '{"resolution": "1920x1080", "fps": 30}',
  NOW(),
  NOW(),
  NOW()
);
```

2. Run your SQL file:
```bash
# Windows PowerShell
Get-Content temp_camera.sql | docker-compose exec -T postgres psql -U qc_user -d qc_vision

# Linux/Mac
cat temp_camera.sql | docker-compose exec -T postgres psql -U qc_user -d qc_vision
```

3. (Optional) Delete the temporary file after use:
```bash
Remove-Item temp_camera.sql  # Windows
rm temp_camera.sql           # Linux/Mac
```

### Camera shows as registered but capture fails

1. **Test URL in browser first**:
   ```
   http://192.168.1.100:8080/video
   ```
   Should show live video feed

2. **Check logs**:
   ```bash
   docker-compose logs backend | grep camera
   ```

3. **Verify connection_info**:
   ```sql
   SELECT id, name, connection_info FROM camera_devices;
   ```

### Network access issues

**Same network required**: Backend and phone must be on same WiFi network

**Firewall**: Ensure phone's firewall allows incoming connections on port 8080

**Static IP**: Use static IP for reliability (phone IP changes on DHCP)

## Example: Complete Workflow

```bash
# 1. Start IP Webcam on phone (note IP: 192.168.1.100)

# 2. Add to database via NocoDB or SQL
# connection_info: {"stream_url": "http://192.168.1.100:8080/video", "snapshot_url": "http://192.168.1.100:8080/shot.jpg"}

# 3. Test capture
curl http://localhost:8000/api/cameras/1/capture \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o captured_frame.jpg

# 4. View captured image
open captured_frame.jpg  # macOS
start captured_frame.jpg  # Windows
```

## Next Steps (Future Implementation)

- [ ] Frontend UI to add/manage IP cameras
- [ ] Live preview of IP camera streams
- [ ] Auto-discovery of IP cameras on network
- [ ] Multiple camera support in capture UI
- [ ] RTSP stream support
