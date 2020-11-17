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
import Search from "./Search";
import Inspector from "./Inspector";
import Settings from "./Settings";

import actionTypes from "../constants/actionTypes";
import Output from "./Output";

class App extends React.Component {
  constructor(props) {
    super(props);

    this.handleChangeActiveTab = this.handleChangeActiveTab.bind(this);
    this.handleChangePreviewMode = this.handleChangePreviewMode.bind(this);
    this.handlePushBlock = this.handlePushBlock.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleSetSelectedBlock = this.handleSetSelectedBlock.bind(this);
    this.handleReorderLayout = this.handleReorderLayout.bind(this);
  }

  componentDidMount() {
    window.addEventListener("message", this.handleMessage)
  }

  componentWillUnmount() {
    window.removeEventListener("message", this.handleMessage)
  }

  handleMessage(event) {
    console.log(event.data)
    if (event.data.event) {
      if (event.data.blockId && event.data.event === 'click') {
        this.handleChangeActiveTab(0);
        this.handleSetSelectedBlock(event.data.blockId);
      } else if (event.data.newOrder && event.data.event === 'sorted') {
        this.handleReorderLayout(event.data.newOrder);
      }
    }
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

  handleSetSelectedBlock(blockUuid) {
    this.props.dispatch({
      type: actionTypes.SET_SELECTED_BLOCK,
      blockUuid
    });
  }

  handleReorderLayout(newOrder) {
    const newBlocksLayout = [];
    newOrder.forEach(blockUuid => {
      const block = this.props.layout.blocks.find(el => {
        return el.uuid === blockUuid;
      })
      newBlocksLayout.push(block);
    });

    this.props.dispatch({
      type: actionTypes.REORDER_LAYOUT,
      newBlocksLayout
    });
  }

  render() {
    const innerHTML = renderHandlebars(this.props.layout.blocks, this.props.layout.documentId);
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
                <Inspector
                  display={activeTab === 0} />
                <Search
                  display={activeTab === 1}
                  onPushBlock={this.handlePushBlock} />
                <BlocksGallery
                  category='header'
                  display={activeTab === 2}
                  onPushBlock={this.handlePushBlock} />
                <BlocksGallery
                  category='article'
                  display={activeTab === 3}
                  onPushBlock={this.handlePushBlock} />
                <BlocksGallery
                  category='gallery'
                  display={activeTab === 4}
                  onPushBlock={this.handlePushBlock} />
                <BlocksGallery
                  category='ad'
                  display={activeTab === 5}
                  onPushBlock={this.handlePushBlock} />
                <Output
                  display={activeTab === 9}
                  html={innerHTML}/>
                <Settings
                  display={activeTab === 10}/>
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
