const onvif = require("onvif");

// Attempts a real ONVIF health check against a device.
// Resolves to the same shape as the simulated check, so the worker
// doesn't need to know which one it's using.
function pollOnvifDevice(device) {
  return new Promise(function (resolve) {
    let parsedUrl;
    try {
      parsedUrl = new URL(device.onvif_xaddr);
    } catch (err) {
      resolve({ status: "offline", storageUsedPct: null, latencyMs: null, error: "Invalid ONVIF address" });
      return;
    }

    const startTime = Date.now();

    const cam = new onvif.Cam(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 80,
        username: device.username_enc || undefined,
        password: device.password_enc || undefined,
        timeout: 5000,
      },
      function (err) {
        if (err) {
          resolve({ status: "offline", storageUsedPct: null, latencyMs: null, error: err.message });
          return;
        }

        // Connection succeeded — now actually call a real ONVIF operation
        // to confirm the device is responsive, not just reachable.
        this.getDeviceInformation(function (err2, info) {
          const latencyMs = Date.now() - startTime;
          if (err2) {
            resolve({ status: "offline", storageUsedPct: null, latencyMs: null, error: err2.message });
            return;
          }
          // Base ONVIF device service doesn't expose storage usage directly
          // (that needs the recording/Profile G service) — left null for real devices.
          resolve({ status: "online", storageUsedPct: null, latencyMs: latencyMs, deviceInfo: info });
        });
      }
    );
  });
}
function getSnapshotUri(device) {
  return new Promise(function (resolve, reject) {
    let parsedUrl;
    try {
      parsedUrl = new URL(device.onvif_xaddr);
    } catch (err) {
      reject(new Error("Invalid ONVIF address"));
      return;
    }

    const cam = new onvif.Cam(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 80,
        username: device.username_enc || undefined,
        password: device.password_enc || undefined,
        timeout: 5000,
      },
      function (err) {
        if (err) {
          reject(err);
          return;
        }

        this.getProfiles(function (err2, profiles) {
          if (err2) {
            reject(err2);
            return;
          }
          if (!profiles || profiles.length === 0) {
            reject(new Error("Camera returned no profiles"));
            return;
          }

          cam.getSnapshotUri({ profileToken: profiles[0].$.token }, function (err3, result) {
            if (err3) {
              reject(err3);
              return;
            }
            if (!result || !result.uri) {
              reject(new Error("No snapshot URI in camera response"));
              return;
            }
            resolve(result.uri);
          });
        });
      }
    );
  });
}

module.exports = { pollOnvifDevice, getSnapshotUri };