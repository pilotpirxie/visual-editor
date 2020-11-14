import React from "react";

export default function WideSidebar({ children }) {
  return <div className="mh-100 d-flex flex-column inspector-wrapper p-1">
    <div className="sidebar-wrapper container-fluid p-1">
      {children}
    </div>
  </div>;
}
