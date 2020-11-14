import React, {Component} from 'react';
import blocks from '../views/blocks';

class BlocksGallery extends Component {
  render() {
    if (!this.props.display) return null;
    return (
      <div>
        {Object.keys(blocks).map(blockId => {
          const block = blocks[blockId];
          if (block.category === this.props.category) {
            return <div key={blockId}>
              <img
                src={block.preview}
                alt={block.title}
                className='img-fluid block-entry' />
                <div className='d-flex align-items-center justify-content-between mt-1 mb-3'>
                  <div>{block.title}</div>
                  <button
                    className='btn btn-primary btn-sm'
                    onClick={() => this.props.onPushBlock(blockId)}>Add</button>
                </div>
            </div>
          } else {
            return null;
          }
        })}
      </div>
    );
  }
}

export default BlocksGallery;
