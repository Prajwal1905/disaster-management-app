import React from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPinIcon,
  PencilIcon,
  ArchiveBoxIcon,
  BellAlertIcon,
  UserPlusIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

const features = [
  {
    title: "Report Hazard",
    description: "Quickly report any hazard you encounter.",
    path: "/report",
    icon: PencilIcon,
    color: "bg-green-100 text-green-600",
  },
  {
    title: "Refugee Assistance",
    description: "Register and access help for displaced individuals.",
    path: "/refugee",
    icon: UsersIcon,
    color: "bg-orange-100 text-orange-600",
  },
  {
    title: "Shelter Map",
    description: "Find the nearest relief shelters near your location.",
    path: "/shelters",
    icon: MapPinIcon,
    color: "bg-purple-100 text-purple-600",
  },
  {
    title: "Volunteer Support",
    description: "Sign up and assist in ongoing relief efforts.",
    path: "/volunteer",
    icon: UserPlusIcon,
    color: "bg-teal-100 text-teal-600",
  },
  {
    title: "Volunteer Feed",
    description:
      "View messages, group invites & tasks from your help assistant.",
    path: "/volunteer-feed",
    icon: BellAlertIcon,
    color: "bg-pink-100 text-pink-600",
  },

  {
    title: "Community Alerts",
    description: "Subscribe for SMS/WhatsApp alerts via your area pincode.",
    path: "/community-signup",
    icon: BellAlertIcon,
    color: "bg-blue-100 text-blue-600",
  },
  {
    title: "Alerts Feed",
    description: "See real-time disaster alerts from authorities.",
    path: "/alerts",
    icon: BellAlertIcon,
    color: "bg-red-100 text-red-600",
  },
  {
    title: "Apply for Shelter",
    description: "Submit a request to create a shelter at your location.",
    path: "/shelter-application",
    icon: ArchiveBoxIcon,
    color: "bg-indigo-100 text-indigo-600",
  },

  {
    title: "Offline Drafts",
    description: "View and sync your offline hazard reports.",
    path: "/drafts",
    icon: ArchiveBoxIcon,
    color: "bg-yellow-100 text-yellow-600",
  },
];

const UserDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">
        Disaster Dashboard
      </h1>

      {/* Feature Cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 max-w-4xl mx-auto">
        {features.map((feature, idx) => (
          <div
            key={idx}
            onClick={() => navigate(feature.path)}
            className="cursor-pointer p-6 bg-white rounded-2xl shadow hover:shadow-lg transition group"
          >
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${feature.color}`}
            >
              <feature.icon className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-semibold mb-1 group-hover:underline">
              {feature.title}
            </h2>
            <p className="text-gray-600 text-sm">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserDashboard;
