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
  }

  handleChangeBlockData(blockUuid, key, value) {
    this.props.dispatch({
      type: actionTypes.CHANGE_BLOCK_DATA,
      blockUuid,
      key,
      value
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
  config: PropTypes.object,
};

const mapStateToProps = state => {
  return {
    config: state.config,
    layout: state.layout,
  };
};

const mapDispatchToProps = dispatch => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(Inspector);
