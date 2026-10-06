import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {connect} from "react-redux";
import documents from "../views/documents";
import actionTypes from "../constants/actionTypes";

class Output extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    if (!this.props.display) return null;

    return (
      <div>
        <div className='d-flex justify-content-between align-items-center'>
          <h5>Export</h5>
        </div>
        <hr />
        <div>
          <label>Output HTML</label>
          <textarea readOnly className='form-control' rows={10} value={this.props.html}></textarea>
        </div>
      </div>
    );
  }
}

Output.propTypes = {
  display: PropTypes.bool,
  html: PropTypes.bool,
};

export default Output;
