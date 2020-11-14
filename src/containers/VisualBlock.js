import React, {Component} from 'react';

class VisualBlock extends Component {
  render() {
    return (
      <div className="visual-block" onClick={this.props.onClick}>
        {this.props.children}
      </div>
    );
  }
}

export default VisualBlock;
