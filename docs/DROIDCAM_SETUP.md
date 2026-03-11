# DroidCam Setup Guide

## Quick Reference (TL;DR)

```bash
# 1. Install DroidCam app on phone (Android/iOS)
# 2. Install DroidCam Client on Windows
# 3. Connect via WiFi or USB in DroidCam Client
# 4. Camera appears as "DroidCam" in browser - select it in QC Vision
# 5. No database registration needed - works as browser camera
```

---

## Overview

DroidCam turns your phone into a webcam by creating a virtual camera device on your Windows computer. Unlike IP cameras, DroidCam cameras appear as regular browser cameras and don't require database registration.

**Key Differences from IP Cameras:**
- ✅ Easier setup - no database configuration needed
- ✅ Works as standard browser camera in QC Vision
- ✅ Supports USB and WiFi connection
- ❌ Requires Windows client app running
- ❌ Computer and phone must be connected (WiFi same network, or USB cable)

---

## Phase 1: Phone Setup

### 1. Install DroidCam App

**Android:**
```
App: "DroidCam Webcam" by Dev47Apps
Download from: Google Play Store (free)
Pro version: Removes ads, adds HD video
```

**iOS:**
```
App: "DroidCam Webcam & OBS Camera"
Download from: Apple App Store (free trial, then subscription)
```

### 2. Launch App
1. Open DroidCam app on your phone
2. Note the WiFi IP address shown (e.g., `10.100.14.35`)
3. Keep the app open in foreground

---

## Phase 2: Windows Client Setup

### 1. Download DroidCam Client

```
Download from: https://www.dev47apps.com/droidcam/windows/
File: DroidCam.Client.6.5.2.exe (or latest version)
```

### 2. Install DroidCam Client
1. Run installer
2. Accept driver installation when prompted
3. Launch "DroidCam Client" from Start menu

### 3. Connect Phone to Computer

**Option A: WiFi Connection (Recommended for production)**

1. Ensure phone and computer are on **same WiFi network**
2. In DroidCam Client:
   - Select "WiFi" radio button
   - Enter phone's IP address (from phone app screen)
   - Enter port: `4747` (default)
   - Check "Video" checkbox
   - Click **Connect**
3. Verify video appears in DroidCam Client window

**Option B: USB Connection (More reliable, less flexible)**

1. Connect phone to computer via USB cable
2. Enable "USB Debugging" in phone Developer Options (Android only)
3. In DroidCam Client:
   - Select "USB" radio button
   - Check "Video" checkbox
   - Click **Connect**
4. Verify video appears in DroidCam Client window

---

## Phase 3: Use in QC Vision

### 1. Verify DroidCam Virtual Camera

1. Keep DroidCam Client **connected and running**
2. Open QC Vision: `http://localhost:5173`
3. Navigate to a test → "Add Photos" → "Camera Capture"
4. In camera selector dropdown, look for **"DroidCam Source X"** (where X is a number)

### 2. Select DroidCam Camera

```
Camera Selector → Select "DroidCam Source X"
Status should show: "DroidCam connected and streaming"
```

### 3. Capture Photos

1. **Grid Overlay**: Toggle composition grid for better framing
2. **Zoom**: Adjust zoom slider (1.0x - 3.0x digital zoom)
3. **Capture**: Click capture button
4. **Review**: Rotate/crop if needed
5. **Upload**: Confirm to upload to test

**No database registration needed!** DroidCam works as a standard browser camera.

---

## Troubleshooting

### Issue: "DroidCam Not Found" in Browser

**Cause**: DroidCam Client not connected or virtual driver not installed

**Solutions**:
1. Open DroidCam Client and click **Connect**
2. Verify video appears in DroidCam Client window
3. Refresh browser page
4. Check browser camera permissions (allow access)
5. Reinstall DroidCam Client if driver missing

### Issue: "Connection Failed" in DroidCam Client

**WiFi Mode Issues**:
- Verify phone and computer on **same WiFi network**
- Check phone's IP address (may change on WiFi reconnect)
- Try disabling phone firewall/VPN temporarily
- Check Windows Firewall allows DroidCam

**USB Mode Issues**:
- Enable USB Debugging in phone Developer Options (Android)
- Try different USB cable or port
- Install phone manufacturer's USB drivers

### Issue: Poor Video Quality

**Solutions**:
1. DroidCam Client → Settings → Video Quality → HD (if using Pro version)
2. Improve lighting conditions
3. Clean phone camera lens
4. Use USB connection (more stable than WiFi)
5. Close other apps using camera on phone

### Issue: Video Lag/Stuttering

**Causes**: WiFi interference, bandwidth issues

**Solutions**:
1. Switch to USB connection for stability
2. Move closer to WiFi router
3. Reduce video quality in DroidCam settings
4. Close bandwidth-heavy apps on computer/phone
5. Use 5GHz WiFi band instead of 2.4GHz (if available)

### Issue: Camera Disconnects Randomly

**WiFi Mode**:
- Phone screen lock may disable camera - adjust phone settings
- WiFi may sleep - disable WiFi power saving
- Keep DroidCam app in foreground on phone

**USB Mode**:
- Phone battery saver may disconnect USB - disable it
- USB cable quality - try different cable
- Keep phone charged during use

---

## Best Practices

### For Production Environments

1. **Use USB Connection**
   - More reliable than WiFi
   - No network dependencies
   - Consistent video quality

2. **Disable Phone Sleep Settings**
   - Settings → Display → Screen timeout: **Never** (while plugged in)
   - Settings → Battery → Disable battery saver
   - Keep DroidCam app in foreground

3. **Keep DroidCam Client Always Running**
   - Add to Windows Startup folder
   - Minimize to system tray (don't close)

4. **Dedicated Phone for Camera**
   - Use old phone as dedicated camera
   - Remove SIM card (WiFi only)
   - Keep plugged in continuously

### For Quality Control Workflow

1. **Position Camera**
   - Mount phone on tripod or fixed stand
   - Use USB connection if phone is stationary
   - Ensure good lighting on product/part

2. **Test Before Production**
   - Verify camera works in QC Vision
   - Test full capture → rotate → crop → upload workflow
   - Check photo quality meets requirements

3. **Backup Camera**
   - Keep second phone with DroidCam setup
   - Use browser camera as fallback option

---

## Comparison: DroidCam vs IP Camera

| Feature                   | DroidCam                        | IP Camera (IP Webcam app) |
|---------------------------|---------------------------------|---------------------------|
| Setup Complexity          | Easy (no database config)       | Moderate (database setup) |
| Windows Client Required   | ✅ Yes (DroidCam Client)        | ❌ No                     |
| Works as Browser Camera   | ✅ Yes (virtual webcam)         | ❌ No (IP stream)         |
| Database Registration     | ❌ Not needed                   | ✅ Required               |
| WiFi Connection           | ✅ Yes (same network)           | ✅ Yes (any network)      |
| USB Connection            | ✅ Yes                          | ❌ No                     |
| Cross-Network Access      | ❌ No (same network only)       | ✅ Yes (via IP address)   |
| Zoom Support              | ✅ Yes (digital zoom)           | ✅ Yes (digital zoom)     |
| Grid Overlay              | ✅ Yes                          | ✅ Yes                    |

**When to use DroidCam:**
- Development/testing on local machine
- Single camera station with USB connection
- Want simple setup without database config
- Computer and phone always co-located

**When to use IP Camera:**
- Production environment with fixed camera stations
- Need to access camera from different computers
- Multiple cameras across workshop/factory
- Want centralized camera management

---

## Advanced Configuration

### DroidCam Client Settings

```
Settings → Video Quality
- Standard: 480p (good for testing)
- HD: 720p (requires Pro version)
- Full HD: 1080p (requires Pro version)

Settings → Connection
- Port: 4747 (default, change if needed)
- Client Port: Auto (usually fine)

Settings → Camera Flip/Rotate
- Mirror: Flip video horizontally
- Rotate: 90°/180°/270° rotation
```

### Phone App Settings

```
DroidCam App Menu
- Video Settings: Resolution, FPS
- Camera: Front/Back camera selection
- Flashlight: Toggle LED flash
- Keep screen on: Prevent sleep during streaming
```

### Static IP for WiFi Reliability

To prevent IP address changes:

```
Phone Settings
→ WiFi → Your Network → Advanced/Details
→ IP Settings: Static
→ IP Address: 192.168.1.150 (choose available IP)
→ Gateway: 192.168.1.1 (your router)
→ DNS: 8.8.8.8 (Google DNS)
```

Update DroidCam Client with this static IP so you don't need to change it each time.

---

## Camera Status Messages

QC Vision detects DroidCam cameras and shows status:

```
✅ "DroidCam connected and streaming"
   - DroidCam camera selected and working
   - Ready to capture photos

⚠️ No status message
   - Regular browser camera selected
   - Not a DroidCam device

❌ Camera error message
   - DroidCam Client not connected
   - Browser camera permission denied
   - Check DroidCam Client is running and connected
```

---

## Support & Resources

**Official DroidCam Resources:**
- Website: https://www.dev47apps.com/
- Support: https://www.dev47apps.com/support/
- FAQ: https://www.dev47apps.com/droidcam/connect/

**Common Questions:**

Q: Do I need DroidCam Pro?
A: No, free version works. Pro adds HD video and removes ads.

Q: Can I use multiple phones?
A: Yes, but each needs DroidCam Client connection. Only one active at a time in browser.

Q: Does DroidCam work on Mac/Linux?
A: Yes, DroidCam has clients for Mac and Linux. Setup is similar.

Q: Can I use DroidCam wirelessly across different networks?
A: No, WiFi mode requires same network. Use IP Camera setup (IP Webcam app) for cross-network access.

---

## Quick Troubleshooting Checklist

**Camera not showing in dropdown:**
- [ ] DroidCam Client is open and connected
- [ ] Video shows in DroidCam Client window
- [ ] Browser has camera permission
- [ ] Page refreshed after connecting DroidCam

**Video freezing or stuttering:**
- [ ] USB connection instead of WiFi (if possible)
- [ ] Phone close to WiFi router (if using WiFi)
- [ ] Phone screen is on (not locked)
- [ ] No other apps using camera

**Cannot connect in DroidCam Client:**
- [ ] Phone and PC on same WiFi network
- [ ] Correct IP address entered
- [ ] Port 4747 (default)
- [ ] Phone app is open
- [ ] Windows Firewall allows DroidCam

**Photo quality issues:**
- [ ] Good lighting conditions
- [ ] Clean camera lens
- [ ] HD quality enabled (if Pro version)
- [ ] Phone camera focused properly
- [ ] Use zoom feature in QC Vision for close-ups
