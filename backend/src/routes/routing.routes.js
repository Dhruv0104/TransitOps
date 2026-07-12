const express = require("express");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

const OSRM_BASE =
  process.env.OSRM_URL || "https://router.project-osrm.org";

router.use(authenticate);

/**
 * Driving route along roads/highways (OSRM).
 * GET /api/routing/drive?fromLng=&fromLat=&toLng=&toLat=
 */
router.get("/drive", async (req, res) => {
  try {
    const fromLng = Number(req.query.fromLng);
    const fromLat = Number(req.query.fromLat);
    const toLng = Number(req.query.toLng);
    const toLat = Number(req.query.toLat);

    if (
      [fromLng, fromLat, toLng, toLat].some((n) => Number.isNaN(n))
    ) {
      return res.status(400).json({
        message: "fromLng, fromLat, toLng, and toLat are required numbers",
      });
    }

    const url =
      `${OSRM_BASE}/route/v1/driving/` +
      `${fromLng},${fromLat};${toLng},${toLat}` +
      `?overview=full&geometries=geojson&steps=false`;

    const upstream = await fetch(url);
    if (!upstream.ok) {
      return res.status(502).json({
        message: "Road routing service unavailable. Try again in a moment.",
      });
    }

    const data = await upstream.json();
    if (data.code !== "Ok" || !data.routes?.[0]) {
      return res.status(404).json({
        message:
          "No driving route found between these points. Pick locations near roads.",
      });
    }

    const route = data.routes[0];
    const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
    const durationMin = Math.round(route.duration / 60);
    // GeoJSON is [lng, lat] → Leaflet needs [lat, lng]
    const path = (route.geometry?.coordinates || []).map(([lng, lat]) => [
      lat,
      lng,
    ]);

    return res.json({
      distanceKm,
      durationMin,
      path,
      provider: "osrm-driving",
    });
  } catch (err) {
    console.error(err);
    return res.status(502).json({
      message: "Failed to calculate road distance",
    });
  }
});

module.exports = router;
