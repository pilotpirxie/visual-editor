import React from "react";
import PropTypes from "prop-types";

export default function NarrowSidebar(props) {
  return <div className="icons-wrapper bg-dark-blue d-flex flex-column justify-content-between">
    <div>
      <button
        type="button"
        className={`btn btn-sidebar btn-block m-0 ${props.activeTab === 0 ? "active-button" : ""}`}
        onClick={() => props.onChangeActiveTab(0)}>
        <span className="material-icons">edit</span>
      </button>
      <button
        type="button"
        className={`btn btn-sidebar btn-block m-0 ${props.activeTab === 1 ? "active-button" : ""}`}
        onClick={() => props.onChangeActiveTab(1)}>
        <span className="material-icons">search</span>
      </button>
      <button
        type="button"
        className={`btn btn-sidebar btn-block m-0 ${props.activeTab === 2 ? "active-button" : ""}`}
        onClick={() => props.onChangeActiveTab(2)}>
        <span className="material-icons">view_quilt</span>
      </button>
      <button
        type="button"
        className={`btn btn-sidebar btn-block m-0 ${props.activeTab === 3 ? "active-button" : ""}`}
        onClick={() => props.onChangeActiveTab(3)}>
        <span className="material-icons">subject</span>
      </button>
      <button
        type="button"
        className={`btn btn-sidebar btn-block m-0 ${props.activeTab === 4 ? "active-button" : ""}`}
        onClick={() => props.onChangeActiveTab(4)}>
        <span className="material-icons">insert_photo</span>
      </button>
      <button
        type="button"
        className={`btn btn-sidebar btn-block m-0 ${props.activeTab === 5 ? "active-button" : ""}`}
        onClick={() => props.onChangeActiveTab(5)}>
        <span className="material-icons">featured_video</span>
      </button>
      <button
        type="button"
        className={`btn btn-sidebar btn-block m-0 ${props.activeTab === 6 ? "active-button" : ""}`}
        onClick={() => props.onChangeActiveTab(6)}>
        <span className="material-icons">perm_contact_calendar</span>
      </button>
      <button
        type="button"
        className={`btn btn-sidebar btn-block m-0 ${props.activeTab === 7 ? "active-button" : ""}`}
        onClick={() => props.onChangeActiveTab(7)}>
        <span className="material-icons">table_chart</span>
      </button>
      <button
        type="button"
        className={`btn btn-sidebar btn-block m-0 ${props.activeTab === 8 ? "active-button" : ""}`}
        onClick={() => props.onChangeActiveTab(8)}>
        <span className="material-icons">view_agenda</span>
      </button>
    </div>
    <div>
      <button
        type="button"
        className={`btn btn-sidebar btn-block m-0 ${props.activeTab === 9 ? "active-button" : ""}`}
        onClick={() => props.onChangeActiveTab(9)}>
        <span className="material-icons">save</span>
      </button>
      <button
        type="button"
        className={`btn btn-sidebar btn-block m-0 ${props.activeTab === 10 ? "active-button" : ""}`}
        onClick={() => props.onChangeActiveTab(10)}>
        <span className="material-icons">settings</span>
      </button>
      <button
        type="button"
        className={`btn btn-sidebar btn-block m-0 ${props.activeTab === 10 ? "active-button" : ""}`}
        onClick={() => props.onChangeActiveTab(11)}>
        <span className="material-icons">help_outline</span>
      </button>
    </div>
  </div>;
}

NarrowSidebar.propTypes = {
  onChangeActiveTab: PropTypes.func.isRequired
};
