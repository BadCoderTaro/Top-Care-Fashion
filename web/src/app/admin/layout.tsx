import React from "react";

export const metadata = {
  title: "Admin • TOP",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-layout px-4 md:px-6 py-4">
      {children}
    </div>
  );
}
