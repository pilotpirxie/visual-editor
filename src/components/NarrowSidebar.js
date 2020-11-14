import React from "react";
import PropTypes from "prop-types";

import CursorIcon from "../images/cursor.svg";

export default function NarrowSidebar(props) {
  return <div className="icons-wrapper bg-dark-blue">
    <button
      type="button"
      className={`btn btn-sidebar btn-block m-0 ${props.activeTab === 0 ? "active-button" : ""}`}
      onClick={() => props.changeActiveTab(0)}>
      <img
        src={CursorIcon}
        className="img-fluid"
        alt="Cursor Button"/>
    </button>
    <button
      type="button"
      className={`btn btn-sidebar btn-block m-0 ${props.activeTab === 1 ? "active-button" : ""}`}
      onClick={() => props.changeActiveTab(1)}>
      <img
        src={CursorIcon}
        className="img-fluid"
        alt="Headers"/>
    </button>
    <button
      type="button"
      className={`btn btn-sidebar btn-block m-0 ${props.activeTab === 2 ? "active-button" : ""}`}
      onClick={() => props.changeActiveTab(2)}>
      <img
        src={CursorIcon}
        className="img-fluid"
        alt="Content"/>
    </button>
    <button
      type="button"
      className={`btn btn-sidebar btn-block m-0 ${props.activeTab === 3 ? "active-button" : ""}`}
      onClick={() => props.changeActiveTab(3)}>
      <img
        src={CursorIcon}
        className="img-fluid"
        alt="Contact Forms"/>
    </button>
    <button
      type="button"
      className={`btn btn-sidebar btn-block m-0 ${props.activeTab === 4 ? "active-button" : ""}`}
      onClick={() => props.changeActiveTab(4)}>
      <img
        src={CursorIcon}
        className="img-fluid"
        alt="Testimonials"/>
    </button>
    <button
      type="button"
      className={`btn btn-sidebar btn-block m-0 ${props.activeTab === 5 ? "active-button" : ""}`}
      onClick={() => props.changeActiveTab(5)}>
      <img
        src={CursorIcon}
        className="img-fluid"
        alt="Footers"/>
    </button>
  </div>;
}

NarrowSidebar.propTypes = {
  changeActiveTab: PropTypes.func.isRequired
};
