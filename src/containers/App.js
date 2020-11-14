import React from "react";
import { connect } from "react-redux";
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";

import renderHandlebars from '../utils/renderHandlebars';
import NarrowSidebar from "../components/NarrowSidebar";
import WideSidebar from "../components/WideSidebar";
import Preview from "./Preview";
import BlocksGallery from "./BlocksGallery";
import actionTypes from "../constants/actionTypes";

class App extends React.Component {
  constructor(props) {
    super(props);

    this.handleChangeActiveTab = this.handleChangeActiveTab.bind(this);
    this.handleChangePreviewMode = this.handleChangePreviewMode.bind(this);
    this.handlePushBlock = this.handlePushBlock.bind(this);
  }

  handleChangeActiveTab(index) {
    this.props.dispatch({
      type: actionTypes.CHANGE_ACTIVE_TAB,
      index
    });
  }

  handleChangePreviewMode(mode) {
    this.props.dispatch({
      type: actionTypes.CHANGE_PREVIEW_MODE,
      mode
    });
  }

  handlePushBlock(blockId) {
    this.props.dispatch({
      type: actionTypes.PUSH_BLOCK,
      blockId
    });
  }

  render() {
    const innerHTML = renderHandlebars(this.props.layout.blocks);
    const {activeTab, previewMode} = this.props.config;

    return (
      <Router>
        <div className="wrapper d-flex">
          <Switch>
            <Route path="/">
              <NarrowSidebar
                onChangeActiveTab={this.handleChangeActiveTab}
                activeTab={activeTab} />
              <WideSidebar>
                <BlocksGallery
                  category='header'
                  display={activeTab === 2}
                  onPushBlock={this.handlePushBlock} />
              </WideSidebar>
              <Preview
                html={innerHTML}
                onChangePreviewMode={this.handleChangePreviewMode}
                previewMode={previewMode}/>
            </Route>
          </Switch>
        </div>
      </Router>
    );
  }
}

const mapStateToProps = state => {
  return {
    config: state.config,
    layout: state.layout,
  };
};
const mapDispatchToProps = dispatch => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(App);
