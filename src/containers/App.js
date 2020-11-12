import React from "react";
import { connect } from "react-redux";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";
import actionTypes from "../constants/actionTypes";

class App extends React.Component {
  render() {
    return (
      <Router>
        <div>
          <nav>
            <ul>
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to="/about">About</Link>
              </li>
              <li>
                <Link to="/users">Users</Link>
              </li>
            </ul>
          </nav>
          <Switch>
            <Route path="/about">
              <div>About</div>
            </Route>
            <Route path="/users">
              <div>Users</div>
            </Route>
            <Route path="/">
              <div>Welcome in {this.props.config.appName}</div>
              <button onClick={() => {
                this.props.dispatch({
                  type: actionTypes.CHANGE_APP_NAME,
                  newName: 'Sample App'
                })
              }}>Click here</button>
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
