import React from "react";
import { connect } from "react-redux";
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";
import handlebars from 'handlebars';

import NarrowSidebar from "../components/NarrowSidebar";
import WideSidebar from "../components/WideSidebar";
import Preview from "./Preview";

class App extends React.Component {
  constructor() {
    super();

    this.state = {
      inside: ''
    }

    this.handleChangeInput = this.handleChangeInput.bind(this);
  }

  componentDidMount() {

  }

  handleChangeInput(val) {
    this.setState({
      inside: val
    });
  }

  render() {
    const hbs = handlebars.compile('<b style="background-color: {{inside}};">{{inside}}</b>')({
      inside: this.state.inside
    });
    return (
      <Router>
        <div className="wrapper d-flex">
          <Switch>
            <Route path="/">
              <NarrowSidebar changeActiveTab={() => {}} activeTab={0} />
              <WideSidebar>
                <h6>Hello</h6>
                <input type='color' className='form-control' value={this.state.inside} onChange={el => this.handleChangeInput(el.target.value)}/>
              </WideSidebar>
              <Preview html={hbs} />
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
