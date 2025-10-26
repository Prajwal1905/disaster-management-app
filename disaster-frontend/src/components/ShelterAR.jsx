import React, { useEffect, useState } from "react";

const ShelterAR = () => {
  const [shelters, setShelters] = useState([]);

  useEffect(() => {
    async function fetchShelters() {
      try {
        const res = await fetch("/api/shelters");
        const data = await res.json();
        setShelters(data);
      } catch (err) {
        alert("Failed to load shelters");
        console.error(err);
      }
    }
    fetchShelters();
  }, []);

  return (
    <a-scene
      vr-mode-ui="enabled: false"
      embedded
      arjs="sourceType: webcam; debugUIEnabled: false;"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
      }}
    >
      <a-camera gps-camera rotation-reader></a-camera>

      {shelters.map((shelter) => (
        <a-entity
          key={shelter._id}
          gps-entity-place={`latitude: ${shelter.latitude}; longitude: ${shelter.longitude};`}
          look-at="[gps-camera]"
        >
          <a-box
            color={shelter.status === "pending" ? "orange" : "blue"}
            scale="5 5 5"
            position="0 2 0"
            animation="property: rotation; to: 0 360 0; loop: true; dur: 10000"
          ></a-box>

          <a-text
            value={`${shelter.name || "Shelter"} (${shelter.status || "unknown"})`}
            align="center"
            position="0 4 0"
            scale="10 10 10"
            color="#fff"
            side="double"
          ></a-text>
        </a-entity>
      ))}
    </a-scene>
  );
};

export default ShelterAR;
