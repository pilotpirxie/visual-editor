import React, {Component} from 'react';
import blocks from '../views/blocks';
import BlockPreview from "../components/BlockPreview";

class Search extends Component {
  constructor(props) {
    super(props);

    this.state = {
      searchValue: ''
    }

    this.handleChangeSearchValue = this.handleChangeSearchValue.bind(this);
  }

  handleChangeSearchValue(newValue) {
    this.setState({
      searchValue: newValue
    });
  }

  render() {
    if (!this.props.display) return null;
    return (
      <div>
        <input
          type='text'
          className='form-control mb-3 form-control-lg shadow'
          placeholder='Search block component...'
          value={this.state.searchValue}
          onChange={(e) => this.handleChangeSearchValue(e.target.value)}/>
        <hr />
        <div>
          {Object.keys(blocks).map((blockId, index) => {
            const block = blocks[blockId];
            if (this.state.searchValue !== "" && index < 10 && block.name.toLowerCase().indexOf(this.state.searchValue.toLowerCase()) > -1) {
              return <BlockPreview
                key={blockId}
                name={block.name}
                blockId={blockId}
                image={block.previewImageUrl}
                onPushBlock={this.props.onPushBlock} />
            } else {
              return null;
            }
          })}
        </div>
      </div>
    );
  }
}

export default Search;
