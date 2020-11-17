import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {connect} from "react-redux";
import {DebounceInput} from 'react-debounce-input';
import actionTypes from "../constants/actionTypes";
import blocks from "../views/blocks";

class Inspector extends Component {
  constructor(props) {
    super(props);

    this.handleChangeBlockData = this.handleChangeBlockData.bind(this);
    this.handleDeleteBlock = this.handleDeleteBlock.bind(this);
  }

  handleChangeBlockData(blockUuid, key, value) {
    this.props.dispatch({
      type: actionTypes.CHANGE_BLOCK_DATA,
      blockUuid,
      key,
      value
    });
  }

  handleDeleteBlock(blockUuid) {
    this.props.dispatch({
      type: actionTypes.DELETE_BLOCK,
      blockUuid,
    });
  }

  render() {
    if (!this.props.display) return null;

    const blockUuid = this.props.layout.selectedBlockUuid;
    const block = this.props.layout.blocks.find(el => {
      return el.uuid === blockUuid;
    });

    if (!block) return <div className='text-center'>First add and select block section</div>;

    const config = blocks[block.blockId].config;

    return (
      <div>
        <div className='d-flex justify-content-between align-items-center'>
        <h5>Inspector</h5>
        <button className='btn btn-outline-danger btn-sm' onClick={() => this.handleDeleteBlock(blockUuid)}>Delete block</button>
        </div>
        <hr />
        {Object.keys(config).map((el, index) => {
          if (config[el].type === 'string') {
            return <div className='form-group' key={index}>
              <label>{config[el].name}</label>
              <DebounceInput
                debounceTimeout={500}
                type='text'
                className='form-control'
                placeholder={config[el].name}
                value={block.data[el]}
                onChange={(e) => this.handleChangeBlockData(blockUuid, el, e.target.value)}
              />
            </div>
          } else if (config[el].type === 'color') {
            return <div className='form-group' key={index}>
              <label>{config[el].name}</label>
              <DebounceInput
                debounceTimeout={500}
                type='color'
                className='form-control'
                placeholder={config[el].name}
                value={block.data[el]}
                onChange={(e) => this.handleChangeBlockData(blockUuid, el, e.target.value)}
              />
            </div>
          } else if (config[el].type === 'boolean') {
            return <div className='form-check' key={index}>
              <label>
                <input type={'checkbox'} className='form-check-input' checked={block.data[el]} onChange={(e) => this.handleChangeBlockData(blockUuid, el, e.target.checked)}/>
                {config[el].name}
              </label>
            </div>
          } else {
            return null;
          }
        })}
      </div>
    );
  }
}

Inspector.propTypes = {
  layout: PropTypes.object,
  display: PropTypes.bool
};

const mapStateToProps = state => {
  return {
    layout: state.layout,
  };
};

const mapDispatchToProps = dispatch => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(Inspector);
