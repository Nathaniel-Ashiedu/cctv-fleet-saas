const onvif = require("onvif");
const http = require("http");
const https = require("https");

const DEVICE_CONFIG = {
  hostname: "192.168.43.174",
  port: 8000,
  username: "admin",
  password: "admin",
  timeout: 5000,
};

const cam = new onvif.Cam(DEVICE_CONFIG, function (err) {
  if (err) {
    console.error("STEP 1 FAILED — could not connect to camera:", err.message);
    process.exit(1);
  }

  console.log("STEP 1 OK — connected to camera");

  // getSnapshotUri needs a profile token — grab the first available profile first,
  // rather than assuming a default one exists
  this.getProfiles(function (err2, profiles) {
    if (err2) {
      console.error("STEP 2 FAILED — could not get profiles:", err2.message);
      process.exit(1);
    }

    if (!profiles || profiles.length === 0) {
      console.error("STEP 2 FAILED — camera returned zero profiles");
      process.exit(1);
    }

    console.log("STEP 2 OK — got", profiles.length, "profile(s), using:", profiles[0].name);

    cam.getSnapshotUri({ profileToken: profiles[0].$.token }, function (err3, result) {
      if (err3) {
        console.error("STEP 3 FAILED — getSnapshotUri errored:", err3.message);
        process.exit(1);
      }

      if (!result || !result.uri) {
        console.error("STEP 3 FAILED — no URI in response:", JSON.stringify(result));
        process.exit(1);
      }

      console.log("STEP 3 OK — snapshot URI returned:", result.uri);
      console.log("Now verifying this URI actually returns image data (not just trusting it)...");

      const client = result.uri.startsWith("https") ? https : http;

      client
        .get(result.uri, function (res) {
          const contentType = res.headers["content-type"];
          let dataLength = 0;

          res.on("data", function (chunk) {
            dataLength += chunk.length;
          });

          res.on("end", function () {
            console.log("STEP 4 RESULT:");
            console.log("  HTTP status:", res.statusCode);
            console.log("  Content-Type:", contentType);
            console.log("  Bytes received:", dataLength);

            if (res.statusCode === 200 && contentType && contentType.includes("image") && dataLength > 0) {
              console.log("VERIFIED: snapshot URI genuinely returns real image data.");
            } else {
              console.log("NOT VERIFIED: URI was returned but did not yield a real image (see details above).");
            }
            process.exit(0);
          });
        })
        .on("error", function (err4) {
          console.error("STEP 4 FAILED — could not fetch the snapshot URI itself:", err4.message);
          process.exit(1);
        });
    });
  });
});