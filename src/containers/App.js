import React from "react";
import { connect } from "react-redux";
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";
import NarrowSidebar from "../components/NarrowSidebar";
import WideSidebar from "../components/WideSidebar";
import Preview from "./Preview";

class App extends React.Component {
  constructor() {
    super();

    this.state = {
      inside: ''
    }
  }
  componentDidMount() {

  }

  render() {
    return (
      <Router>
        <div className="wrapper d-flex">
          <Switch>
            <Route path="/">
              <NarrowSidebar changeActiveTab={() => {}} activeTab={0} />
              <WideSidebar>
                <h3>Hello</h3>
              </WideSidebar>
              <Preview html={`<b>Hi</b>`} />
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
  };
};
const mapDispatchToProps = dispatch => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(App);
