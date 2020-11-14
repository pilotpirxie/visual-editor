import React from "react";

export default function WideSidebar({ children }) {
  return <div className="mh-100 d-flex flex-column bg-light inspector-wrapper pt-4 p-1 shadow">
    <div className="sidebar-wrapper container-fluid">
      {children}
    </div>
  </div>;
}
