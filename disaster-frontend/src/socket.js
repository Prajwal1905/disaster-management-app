// socket.js
import { io } from "socket.io-client";
const socket = io(); // You can pass your Flask backend URL here if needed
export default socket;
