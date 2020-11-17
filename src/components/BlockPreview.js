import React, {Component} from 'react';
import PropTypes from 'prop-types';

class BlockPreview extends Component {
  render() {
    return (
      <div className='card card-body p-2 shadow-lg block-entry mb-2'>
        <img
          src={this.props.image}
          alt={this.props.name}
          className='img-fluid' />
        <div className='prompt' onClick={() => this.props.onPushBlock(this.props.blockId)}>
          <div className='prompt-inside'>
            <div>{this.props.name}</div>
            <button className='btn btn-outline-light btn-sm m-2'>Add block</button>
          </div>
        </div>
      </div>
    );
  }
}

BlockPreview.propTypes = {
  blockId: PropTypes.string,
  image: PropTypes.string,
  name: PropTypes.string,
  onPushBlock: PropTypes.func,
};

export default BlockPreview;
