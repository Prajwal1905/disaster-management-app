import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const SOCKET_SERVER_URL = "http://localhost:5000";

// Location Picker Modal
const LocationPickerMap = ({ onSelect, onCancel }) => {
  const [selectedPosition, setSelectedPosition] = useState(null);

  const LocationSelector = () => {
    useMapEvents({ click: (e) => setSelectedPosition(e.latlng) });
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg p-4 w-96 max-w-full">
        <h3 className="text-lg font-semibold mb-2">Select Location</h3>
        <div className="h-64 w-full mb-4">
          <MapContainer
            center={[20, 78]}
            zoom={5}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <LocationSelector />
            {selectedPosition && <Marker position={selectedPosition} />}
          </MapContainer>
        </div>
        <div className="flex justify-end space-x-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!selectedPosition) {
                toast.error("Please select a location.");
                return;
              }
              onSelect(selectedPosition);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminChat = () => {
  const { id: groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [userPresence, setUserPresence] = useState({});
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [location, setLocation] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const isUserNearBottom = useRef(true);

  const adminUser = JSON.parse(localStorage.getItem("admin_user") || "{}");
  const currentUserEmail =
    adminUser.email?.toLowerCase().trim() || "anonymous@domain.com";

  // Fetch group info
  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const res = await axios.get(`/api/volunteer-groups/${groupId}`);
        setGroup(res.data);
      } catch {
        toast.error("Failed to load group");
      }
    };
    fetchGroup();
  }, [groupId]);

  // Socket.IO setup
  useEffect(() => {
    // Only create socket once
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_SERVER_URL);

      // Receive chat history
      socketRef.current.on("chat_history", setMessages);

      // Receive new message
      socketRef.current.on("message", (msg) => {
        setMessages((prev) => {
          const index = prev.findIndex(
            (m) => m.tempId === msg.tempId || m._id === msg._id
          );
          if (index !== -1) {
            const copy = [...prev];
            copy[index] = msg;
            return copy;
          }
          return [...prev, msg];
        });

        setTimeout(() => {
          if (isUserNearBottom.current)
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 50);
      });

      // Typing indicator
      socketRef.current.on("typing", ({ senderEmail }) => {
        if (senderEmail === currentUserEmail) return;
        setTypingUsers((prev) => {
          const copy = new Set(prev);
          copy.add(senderEmail);
          return copy;
        });
        setTimeout(() => {
          setTypingUsers((prev) => {
            const copy = new Set(prev);
            copy.delete(senderEmail);
            return copy;
          });
        }, 3000);
      });

      // Message edits/deletes/read updates
      socketRef.current.on("message_edited", ({ messageId, newText }) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId
              ? { ...msg, message: newText, edited: true }
              : msg
          )
        );
      });

      socketRef.current.on("message_deleted", ({ messageId }) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId ? { ...msg, deleted: true } : msg
          )
        );
      });

      socketRef.current.on(
        "message_read_update",
        ({ readerEmail, messageIds }) => {
          setMessages((prev) =>
            prev.map((msg) =>
              messageIds.includes(msg._id)
                ? {
                    ...msg,
                    readBy: [...new Set([...(msg.readBy || []), readerEmail])],
                    status: "read",
                  }
                : msg
            )
          );
        }
      );

      // User presence
      socketRef.current.on("presence_update", ({ username, status }) => {
        setUserPresence((prev) => ({ ...prev, [username]: status }));
      });
    }

    // Join group whenever groupId changes
    socketRef.current.emit("join", { groupId, username: currentUserEmail });

    return () => {
      // Leave the group on unmount
      socketRef.current?.emit("leave", { groupId, username: currentUserEmail });
    };
  }, [groupId, currentUserEmail]);

  // Scroll tracking
  useEffect(() => {
    const container = messagesEndRef.current?.parentElement;
    if (!container) return;
    const onScroll = () => {
      const distance =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      isUserNearBottom.current = distance < 100;
    };
    container.addEventListener("scroll", onScroll);
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  // Media load scroll handling
  useEffect(() => {
    const container = messagesEndRef.current?.parentElement;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceFromBottom < 100;
    const mediaElements = container.querySelectorAll("img, video");
    let loadedCount = 0;
    const onMediaLoad = () => {
      loadedCount++;
      if (loadedCount === mediaElements.length && isNearBottom)
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    mediaElements.forEach((el) => {
      if (el.complete) onMediaLoad();
      else {
        el.addEventListener("load", onMediaLoad);
        el.addEventListener("error", onMediaLoad);
      }
    });
    return () =>
      mediaElements.forEach((el) => {
        el.removeEventListener("load", onMediaLoad);
        el.removeEventListener("error", onMediaLoad);
      });
  }, [messages]);

  // Message functions
  const handleSendMessage = async () => {
    if (!newMessage.trim() && !mediaFile && !location)
      return toast.error("Please enter message or attach media/location");

    const tempId = Date.now().toString();
    const tempMessage = {
      
      tempId,  
      senderEmail: currentUserEmail,
      message: newMessage.trim(),
      mediaUrl: mediaPreview || null,
      mediaType: mediaFile ? mediaFile.type.split("/")[0] : null,
      location,
      sentAt: new Date().toISOString(),
      readBy: [currentUserEmail],
      status: "sending",
    };
    setMessages((prev) => [...prev, tempMessage]);

    let mediaData = null;
    if (mediaFile) {
      const reader = new FileReader();
      reader.readAsDataURL(mediaFile);
      await new Promise((resolve) => (reader.onloadend = resolve));
      mediaData = reader.result;
    }

    socketRef.current.emit("send_message", {
      groupId,
      senderEmail: currentUserEmail,
      message: newMessage.trim(),
      mediaUrl: mediaData,
      mediaType: mediaFile ? mediaFile.type.split("/")[0] : null,
      location,
      tempId,
    });
    setNewMessage("");
    setMediaFile(null);
    setMediaPreview(null);
    setLocation(null);
  };

  const handleTyping = () =>
    socketRef.current.emit("typing", {
      groupId,
      senderEmail: currentUserEmail,
    });
  const startEditing = (msg) => {
    setEditingMessageId(msg._id);
    setEditingText(msg.message);
  };
  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditingText("");
  };
  const submitEdit = () => {
    if (!editingText.trim()) return toast.error("Message cannot be empty");
    socketRef.current.emit("edit_message", {
      groupId,
      messageId: editingMessageId,
      newText: editingText.trim(),
    });
    setEditingMessageId(null);
    setEditingText("");
  };
  const deleteMessage = (id) => {
    if (window.confirm("Delete this message?"))
      socketRef.current.emit("delete_message", { groupId, messageId: id });
  };
  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  return (
    <>
      <div className="max-w-3xl mx-auto p-4 flex flex-col h-screen">
        <h2 className="text-2xl font-bold mb-4">
          {group?.name || "Loading..."}
        </h2>
        <div className="flex-1 overflow-y-auto border rounded p-4 mb-4 bg-white flex flex-col">
          {messages.length === 0 && (
            <p className="text-gray-500">No messages yet</p>
          )}
          {messages.map((msg) => {
            const isCurrentUser =
              msg.senderEmail.toLowerCase() === currentUserEmail;
            const readByCount = msg.readBy?.length || 0;
            const isReadByCurrentUser = msg.readBy?.includes(currentUserEmail);
            let ticks = "✓";
            if (msg.status === "delivered" || readByCount > 0) ticks = "✓✓";
            if (msg.status === "read" && isReadByCurrentUser)
              ticks = "✓✓ (read)";
            const presenceStatus = userPresence[msg.senderEmail] || "offline";

            return (
              <div
                key={msg._id}
                className={`mb-3 flex ${
                  isCurrentUser ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs p-3 rounded-lg break-words relative ${
                    isCurrentUser
                      ? "bg-green-700 text-white rounded-br-none"
                      : "bg-gray-300 text-gray-800 rounded-bl-none"
                  }`}
                >
                  <div className="text-xs text-gray-200 mb-1 flex justify-between items-center">
                    <span className="flex items-center space-x-2">
                      <span>
                        {isCurrentUser ? "You (Admin)" : msg.senderEmail}
                      </span>
                      {!isCurrentUser && (
                        <span
                          className={`w-2 h-2 rounded-full ${
                            presenceStatus === "online"
                              ? "bg-green-500"
                              : "bg-gray-400"
                          }`}
                          title={presenceStatus}
                        />
                      )}
                    </span>
                    <span>{new Date(msg.sentAt).toLocaleString()}</span>
                  </div>

                  {editingMessageId === msg._id ? (
                    <>
                      <textarea
                        className="w-full p-2 rounded text-black"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        rows={3}
                      />
                      <div className="flex justify-end space-x-2 mt-1">
                        <button
                          onClick={cancelEditing}
                          className="bg-gray-500 text-white px-2 py-1 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={submitEdit}
                          className="bg-green-600 text-white px-2 py-1 rounded"
                        >
                          Save
                        </button>
                      </div>
                    </>
                  ) : msg.deleted ? (
                    <i className="text-gray-500 italic">
                      This message was deleted
                    </i>
                  ) : (
                    <>
                      <div className="whitespace-pre-wrap">{msg.message}</div>

                      {msg.mediaUrl && (
                        <>
                          {msg.mediaType === "image" && (
                            <img
                              src={msg.mediaUrl}
                              alt="sent media"
                              className="mt-2 max-w-full rounded"
                            />
                          )}
                          {msg.mediaType === "video" && (
                            <video
                              src={msg.mediaUrl}
                              controls
                              className="mt-2 max-w-full rounded"
                            />
                          )}
                          {msg.mediaType === "audio" && (
                            <audio
                              src={msg.mediaUrl}
                              controls
                              className="mt-2 w-full"
                            />
                          )}
                        </>
                      )}

                      {msg.location && (
                        <div
                          className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-700 cursor-pointer"
                          onClick={() =>
                            window.open(
                              `https://www.google.com/maps?q=${msg.location.lat},${msg.location.lng}`,
                              "_blank"
                            )
                          }
                          title="Open location in Google Maps"
                        >
                          📍 Location: {msg.location.lat.toFixed(4)},{" "}
                          {msg.location.lng.toFixed(4)}
                        </div>
                      )}

                      {msg.edited && (
                        <span className="text-xs text-gray-400 ml-1">
                          (edited)
                        </span>
                      )}
                    </>
                  )}

                  {isCurrentUser && !editingMessageId && !msg.deleted && (
                    <div className="text-xs text-green-300 mt-1 text-right">
                      {ticks}
                    </div>
                  )}

                  {isCurrentUser && !editingMessageId && !msg.deleted && (
                    <div className="absolute top-1 right-1 flex space-x-1">
                      <button
                        title="Edit message"
                        onClick={() => startEditing(msg)}
                        className="text-xs text-white bg-green-800 rounded px-1"
                      >
                        Edit
                      </button>
                      <button
                        title="Delete message"
                        onClick={() => deleteMessage(msg._id)}
                        className="text-xs text-white bg-red-600 rounded px-1"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {typingUsers.size > 0 && (
            <div className="text-sm text-gray-500 italic mb-2">
              {Array.from(typingUsers).join(", ")} typing...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="flex space-x-2 items-end">
          <textarea
            placeholder="Type your message"
            className="flex-1 border rounded px-3 py-2 resize-y"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            rows={2}
          />

          <div className="flex items-center space-x-2">
            <input
              type="file"
              accept="image/*,video/*,audio/*"
              onChange={handleMediaChange}
              className="hidden"
              id="media-upload"
            />
            <label
              htmlFor="media-upload"
              className="cursor-pointer bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
              title="Attach media"
            >
              📎
            </label>

            {mediaPreview && (
              <div className="flex items-center space-x-1">
                {(mediaFile.type.startsWith("image/") && (
                  <img
                    src={mediaPreview}
                    alt="preview"
                    className="w-16 h-16 object-cover rounded"
                  />
                )) ||
                  (mediaFile.type.startsWith("video/") && (
                    <video
                      src={mediaPreview}
                      controls
                      className="w-16 h-16 rounded"
                    />
                  )) || <audio src={mediaPreview} controls className="w-32" />}
                <button
                  onClick={() => {
                    setMediaFile(null);
                    setMediaPreview(null);
                  }}
                  className="text-red-600 ml-2"
                  title="Remove attachment"
                >
                  ✖
                </button>
              </div>
            )}

            <button
              onClick={() => setShowLocationPicker(true)}
              className="bg-yellow-500 text-black px-3 py-1 rounded"
              title="Pick location on map"
            >
              📍 Add Location
            </button>

            {location && (
              <div className="ml-2 text-xs cursor-pointer text-blue-700 underline flex items-center">
                <span
                  onClick={() =>
                    window.open(
                      `https://www.google.com/maps?q=${location.lat},${location.lng}`,
                      "_blank"
                    )
                  }
                  title="View attached location on map"
                >
                  Attached: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </span>
                <button
                  onClick={() => setLocation(null)}
                  className="ml-1 text-red-600"
                  title="Remove location"
                >
                  ✖
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleSendMessage}
            className="bg-green-700 text-white px-4 py-2 rounded"
          >
            Send
          </button>
        </div>
      </div>

      {showLocationPicker && (
        <LocationPickerMap
          onSelect={(pos) => {
            setLocation(pos);
            setShowLocationPicker(false);
          }}
          onCancel={() => setShowLocationPicker(false)}
        />
      )}
    </>
  );
};

export default AdminChat;
