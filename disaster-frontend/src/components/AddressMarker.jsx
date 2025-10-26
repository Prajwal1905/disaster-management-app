// src/components/AddressMarker.jsx
import { useEffect, useState } from "react";
import { Marker, Popup } from "react-leaflet";

const AddressMarker = ({ address }) => {
  const [position, setPosition] = useState(null);

  useEffect(() => {
    const fetchCoords = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
        );
        const data = await res.json();
        if (data && data.length > 0) {
          setPosition([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        }
      } catch (err) {
        console.error("Failed to geocode address:", err);
      }
    };

    fetchCoords();
  }, [address]);

  return (
    position && (
      <Marker position={position}>
        <Popup>{address}</Popup>
      </Marker>
    )
  );
};

export default AddressMarker;
