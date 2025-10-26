import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const SOCKET_SERVER_URL = "http://localhost:5000";

const VolunteerChat = () => {
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
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const containerRef = useRef(null);
  const isUserNearBottom = useRef(true);

  const volunteerUser = JSON.parse(
    localStorage.getItem("volunteer_user") || "{}"
  );
  const currentUserEmail =
    volunteerUser.email?.toLowerCase().trim() || "anonymous@domain.com";

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

  // Track scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onScroll = () => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      isUserNearBottom.current = distanceFromBottom < 100;
    };
    container.addEventListener("scroll", onScroll);
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  // Socket.IO setup
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_SERVER_URL);

      socketRef.current.on("chat_history", setMessages);

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

      socketRef.current.on("typing", ({ senderEmail }) => {
        if (senderEmail === currentUserEmail) return;
        setTypingUsers((prev) => new Set(prev).add(senderEmail));
        setTimeout(() => {
          setTypingUsers((prev) => {
            const copy = new Set(prev);
            copy.delete(senderEmail);
            return copy;
          });
        }, 3000);
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

      socketRef.current.on("presence_update", ({ username, status }) => {
        setUserPresence((prev) => ({ ...prev, [username]: status }));
      });
    }

    socketRef.current.emit("join", { groupId, username: currentUserEmail });

    return () => {
      socketRef.current.emit("leave", { groupId, username: currentUserEmail });
      socketRef.current.disconnect();
    };
  }, [groupId, currentUserEmail]);

  // Auto-scroll on new messages/media
  useEffect(() => {
    const container = messagesEndRef.current?.parentElement;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceFromBottom < 100;

    const mediaElements = container.querySelectorAll("img, video");
    let loadedCount = 0;

    const scrollToBottom = () =>
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    const onMediaLoad = () => {
      loadedCount++;
      if (loadedCount === mediaElements.length && isNearBottom)
        scrollToBottom();
    };

    mediaElements.forEach((el) => {
      if (el.complete) loadedCount++;
      else {
        el.addEventListener("load", onMediaLoad);
        el.addEventListener("error", onMediaLoad);
      }
    });

    if (isNearBottom) scrollToBottom();

    return () =>
      mediaElements.forEach((el) => {
        el.removeEventListener("load", onMediaLoad);
        el.removeEventListener("error", onMediaLoad);
      });
  }, [messages]);

  // Mark unread messages as read
  useEffect(() => {
    const unreadMessageIds = messages
      .filter((msg) => !msg.readBy?.includes(currentUserEmail))
      .map((msg) => msg._id);
    if (unreadMessageIds.length > 0) {
      socketRef.current.emit("message_read", {
        groupId,
        readerEmail: currentUserEmail,
        messageIds: unreadMessageIds,
      });
    }
  }, [messages, currentUserEmail, groupId]);

  // Media selection
  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };
  const clearMediaAndLocation = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setLocation(null);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !mediaFile && !location)
      return toast.error("Enter a message or attach media/location");

    setSending(true);
    const tempId = Date.now().toString();
    const tempMessage = {
      
      tempId, // so it can be matched later
      senderEmail: currentUserEmail,
      message: newMessage.trim(),
      mediaUrl: mediaPreview || null,
      mediaType: mediaFile ? mediaFile.type.split("/")[0] : null,
      location: location || null,
      sentAt: new Date().toISOString(),
      readBy: [currentUserEmail],
      status: "sending", // distinguish between local vs server ack
    };

    // Show immediately
    setMessages((prev) => [...prev, tempMessage]);

    let mediaData = null;
    if (mediaFile) {
      const reader = new FileReader();
      reader.readAsDataURL(mediaFile);
      await new Promise((resolve) => (reader.onloadend = resolve));
      mediaData = reader.result;
    }

    // Send to backend
    socketRef.current.emit("send_message", {
      groupId,
      senderEmail: currentUserEmail,
      message: newMessage.trim(),
      mediaUrl: mediaData,
      mediaType: mediaFile ? mediaFile.type.split("/")[0] : null,
      location: location || null,
      tempId,
    });

    setNewMessage("");
    clearMediaAndLocation();
    setSending(false);
  };

  const sendTypingEvent = () =>
    socketRef.current?.emit("typing", {
      groupId,
      senderEmail: currentUserEmail,
    });

  // Edit/Delete handlers
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
    cancelEditing();
  };
  const handleDeleteMessage = (messageId) =>
    socketRef.current.emit("delete_message", { groupId, messageId });

  // Attach current location
  const addCurrentLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success("Location attached");
      },
      () => toast.error("Failed to get location")
    );
  };

  return (
    <div className="max-w-3xl mx-auto p-4 flex flex-col h-screen">
      <h2 className="text-2xl font-bold mb-4">{group?.name || "Loading..."}</h2>
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto border rounded p-4 mb-4 bg-white flex flex-col"
      >
        {messages.length === 0 && (
          <p className="text-gray-500">No messages yet</p>
        )}
        {messages.map((msg, idx) => {
          const isCurrentUser =
            msg.senderEmail.toLowerCase() === currentUserEmail;
          const readByCount = msg.readBy ? msg.readBy.length : 0;
          const isReadByCurrentUser = msg.readBy?.includes(currentUserEmail);
          let ticks = "✓";
          if (msg.status === "delivered" || readByCount > 0) ticks = "✓✓";
          if (msg.status === "read" && isReadByCurrentUser) ticks = "✓✓ (read)";
          const presenceStatus = userPresence[msg.senderEmail] || "offline";

          return (
            <div
              key={idx}
              className={`mb-3 flex ${
                isCurrentUser ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs p-3 rounded-lg break-words relative ${
                  isCurrentUser
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-gray-300 text-gray-800 rounded-bl-none"
                }`}
              >
                <div className="text-xs text-gray-200 mb-1 flex justify-between items-center">
                  <span className="flex items-center space-x-2">
                    <span>{isCurrentUser ? "You" : msg.senderEmail}</span>
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
                    {msg.mediaUrl && msg.mediaType === "image" && (
                      <img
                        src={msg.mediaUrl}
                        alt="sent media"
                        className="mt-2 max-w-full rounded"
                      />
                    )}
                    {msg.mediaUrl && msg.mediaType === "video" && (
                      <video
                        src={msg.mediaUrl}
                        controls
                        className="mt-2 max-w-full rounded"
                      />
                    )}
                    {msg.mediaUrl && msg.mediaType === "audio" && (
                      <audio
                        src={msg.mediaUrl}
                        controls
                        className="mt-2 w-full"
                      />
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
                  <div className="text-xs text-blue-300 mt-1 text-right">
                    {ticks}
                  </div>
                )}
                {isCurrentUser && !editingMessageId && !msg.deleted && (
                  <div className="absolute top-1 right-1 flex space-x-1">
                    <button
                      title="Edit message"
                      onClick={() => startEditing(msg)}
                      className="text-xs text-white bg-blue-800 rounded px-1"
                    >
                      Edit
                    </button>
                    <button
                      title="Delete message"
                      onClick={() => handleDeleteMessage(msg._id)}
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

      {/* Input area */}
      <div className="flex items-center border-t pt-2 space-x-2">
        <textarea
          rows={1}
          placeholder="Type your message"
          className="flex-1 border rounded px-3 py-2 resize-none"
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            sendTypingEvent();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />
        <input
          type="file"
          id="media-upload"
          accept="image/*,video/*,audio/*"
          onChange={handleMediaChange}
          className="hidden"
        />
        <label
          htmlFor="media-upload"
          className="cursor-pointer bg-blue-600 text-xl"
          title="Attach media file"
        >
          📎
        </label>
        {mediaPreview &&
          (mediaFile.type.startsWith("image/") ? (
            <img
              src={mediaPreview}
              alt="preview"
              className="w-12 h-12 object-cover rounded"
            />
          ) : mediaFile.type.startsWith("video/") ? (
            <video src={mediaPreview} controls className="w-20 h-12 rounded" />
          ) : (
            <audio src={mediaPreview} controls className="w-24" />
          ))}
        {mediaPreview && (
          <button
            onClick={clearMediaAndLocation}
            className="text-red-600"
            title="Remove attachment"
          >
            ✕
          </button>
        )}
        <button
          onClick={addCurrentLocation}
          className="bg-yellow-500 text-white px-3 py-2 rounded"
          title="Attach your current location"
        >
          📍
        </button>
        <button
          onClick={handleSendMessage}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default VolunteerChat;
