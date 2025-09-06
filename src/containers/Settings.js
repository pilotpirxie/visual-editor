import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {connect} from "react-redux";
import documents from "../views/documents";
import actionTypes from "../constants/actionTypes";

class Settings extends Component {
  constructor(props) {
    super(props);

    this.handleDocumentChange = this.handleDocumentChange.bind(this);
  }

  handleDocumentChange(templateId) {
    this.props.dispatch({
      type: actionTypes.CHANGE_TEMPLATE_ID,
      templateId
    });
  }

  render() {
    if (!this.props.display) return null;

    const activePage = this.props.layout.pages[this.props.layout.activePageIndex];

    return (
      <div>
        <div className='d-flex justify-content-between align-items-center'>
          <h5>Settings</h5>
        </div>
        <hr />
        <div>
          <label>Document template</label>
          <select className='form-control' onChange={e => this.handleDocumentChange(e.target.value)} value={activePage.templateId}>
            {Object.keys(documents).map(documentId => <option key={documentId} value={documentId}>{documents[documentId].name}</option>)}
          </select>
        </div>
      </div>
    );
  }
}

Settings.propTypes = {
  layout: PropTypes.object,
  config: PropTypes.object,
  display: PropTypes.bool,
};

const mapStateToProps = state => {
  return {
    config: state.config,
    layout: state.layout,
  };
};

const mapDispatchToProps = dispatch => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(Settings);
