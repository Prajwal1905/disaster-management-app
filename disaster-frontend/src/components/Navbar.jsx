import React from "react";
import { Link } from "react-router-dom";

const Navbar = () => (
  <nav className="bg-gray-800 text-white p-4 flex justify-between">
    <Link to="/" className="font-bold">Disaster App</Link>
  </nav>
);

export default Navbar;
