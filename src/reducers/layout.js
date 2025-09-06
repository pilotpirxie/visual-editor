import actionTypes from "../constants/actionTypes";
import blocks from "../views/blocks/";
import {v4 as uuidv4} from 'uuid';

const initialState = {
  pages: [
    {
      id: 'document1',
      name: 'Page 1',
      blocks: [],
      templateId: 'document1',
    },
  ],
  activePageIndex: 0,
  selectedBlockUuid: '',
};

// =================================================================================================
// Recursive helper functions for operating on the nested block structure
// =================================================================================================

/**
 * Recursively finds a block by its UUID in a tree of blocks.
 * @param {Array} blocksArray - The array of blocks to search.
 * @param {string} blockUuid - The UUID of the block to find.
 * @returns {Object|null} The found block object or null.
 */
const findBlockRecursive = (blocksArray, blockUuid) => {
  for (const block of blocksArray) {
    if (block.uuid === blockUuid) {
      return block;
    }
    if (block.children && block.children.length > 0) {
      const found = findBlockRecursive(block.children, blockUuid);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

/**
 * Recursively finds a block and its parent array by UUID.
 * @param {Array} blocksArray - The array of blocks to search.
 * @param {string} blockUuid - The UUID of the block to find.
 * @returns {{block: Object, parent: Array}|null}
 */
const findBlockAndParentRecursive = (blocksArray, blockUuid) => {
    for (let i = 0; i < blocksArray.length; i++) {
        const block = blocksArray[i];
        if (block.uuid === blockUuid) {
            return { block, parent: blocksArray, index: i };
        }
        if (block.children && block.children.length > 0) {
            const found = findBlockAndParentRecursive(block.children, blockUuid);
            if (found) {
                return found;
            }
        }
    }
    return null;
};


/**
 * Recursively deletes a block by its UUID from a tree of blocks.
 * @param {Array} blocksArray - The array of blocks to search.
 * @param {string} blockUuid - The UUID of the block to delete.
 * @returns {boolean} - True if the block was found and deleted, otherwise false.
 */
const deleteBlockRecursive = (blocksArray, blockUuid) => {
  for (let i = 0; i < blocksArray.length; i++) {
    if (blocksArray[i].uuid === blockUuid) {
      blocksArray.splice(i, 1);
      return true;
    }
    if (blocksArray[i].children && blocksArray[i].children.length > 0) {
      if (deleteBlockRecursive(blocksArray[i].children, blockUuid)) {
        return true;
      }
    }
  }
  return false;
};

/**
 * The main reducer function.
 */
export default function reducer(state = initialState, action) {
  switch (action.type) {
    case actionTypes.PUSH_BLOCK: {
      const { blockId, parentUuid } = action;
      const activePage = state.pages[state.activePageIndex];
      const newBlock = {
        uuid: uuidv4(),
        blockId: blockId,
        data: {
          ...blocks[blockId].defaultData
        },
        children: [], // Add children array for nesting
      };

      const newBlocks = JSON.parse(JSON.stringify(activePage.blocks));

      if (parentUuid) {
        // Add to a parent block's children array
        const parentBlock = findBlockRecursive(newBlocks, parentUuid);
        if (parentBlock) {
          parentBlock.children.push(newBlock);
        } else {
          // Fallback: if parent not found, add to top level
          newBlocks.push(newBlock);
        }
      } else {
        // Add to the top-level blocks array
        newBlocks.push(newBlock);
      }

      const newPages = [...state.pages];
      newPages[state.activePageIndex] = {
        ...activePage,
        blocks: newBlocks
      };

      return {
        ...state,
        pages: newPages
      };
    }

    case actionTypes.MOVE_BLOCK: {
        const { blockUuid, targetParentUuid, newIndex } = action.payload;
        const activePage = state.pages[state.activePageIndex];
        const newBlocks = JSON.parse(JSON.stringify(activePage.blocks));

        // Find the block and its original parent
        const found = findBlockAndParentRecursive(newBlocks, blockUuid);
        if (!found) {
            return state; // Block not found, do nothing
        }
        const { block: blockToMove, parent: originalParent } = found;

        // Remove block from its original location
        originalParent.splice(originalParent.indexOf(blockToMove), 1);

        // Find the target parent
        let targetParentChildren;
        if (targetParentUuid) {
            const targetParent = findBlockRecursive(newBlocks, targetParentUuid);
            if (!targetParent) {
                return state; // Target parent not found
            }
            targetParentChildren = targetParent.children;
        } else {
            // If no target parent, it's the root
            targetParentChildren = newBlocks;
        }

        // Add block to its new location
        targetParentChildren.splice(newIndex, 0, blockToMove);

        const newPages = [...state.pages];
        newPages[state.activePageIndex] = {
            ...activePage,
            blocks: newBlocks
        };

        return {
            ...state,
            pages: newPages
        };
    }

    case actionTypes.SET_SELECTED_BLOCK:
      return {
        ...state,
        selectedBlockUuid: action.blockUuid
      }

    case actionTypes.CHANGE_BLOCK_DATA: {
      const { blockUuid, key, value } = action;
      const activePage = state.pages[state.activePageIndex];
      const newBlocks = JSON.parse(JSON.stringify(activePage.blocks));
      
      const blockToUpdate = findBlockRecursive(newBlocks, blockUuid);

      if (blockToUpdate) {
        blockToUpdate.data[key] = value;
      }

      const newPages = [...state.pages];
      newPages[state.activePageIndex] = {
        ...activePage,
        blocks: newBlocks
      };

      return {
        ...state,
        pages: newPages
      };
    }

    case actionTypes.DELETE_BLOCK: {
      const { blockUuid } = action;
      const activePage = state.pages[state.activePageIndex];
      const newBlocks = JSON.parse(JSON.stringify(activePage.blocks));

      deleteBlockRecursive(newBlocks, blockUuid);

      const newPages = [...state.pages];
      newPages[state.activePageIndex] = {
        ...activePage,
        blocks: newBlocks
      };

      return {
        ...state,
        pages: newPages,
        selectedBlockUuid: state.selectedBlockUuid === blockUuid ? '' : state.selectedBlockUuid
      };
    }
    
    // Page management actions remain mostly the same
    case actionTypes.ADD_PAGE: {
      const newPage = {
        id: uuidv4(),
        name: `Page ${state.pages.length + 1}`,
        blocks: [],
        templateId: 'document1',
      };
      return {
        ...state,
        pages: [...state.pages, newPage],
        activePageIndex: state.pages.length,
      };
    }
    case actionTypes.REMOVE_PAGE: {
      const newPages = state.pages.filter((page, index) => index !== action.pageIndex);
      return {
        ...state,
        pages: newPages,
        activePageIndex: 0,
      };
    }
    case actionTypes.SWITCH_PAGE: {
      return {
        ...state,
        activePageIndex: action.pageIndex,
        selectedBlockUuid: '',
      };
    }
    case actionTypes.CHANGE_TEMPLATE_ID: {
      const { templateId } = action;
      const newPages = [...state.pages];
      newPages[state.activePageIndex] = {
        ...newPages[state.activePageIndex],
        templateId: templateId,
      };
      return {
        ...state,
        pages: newPages,
      };
    }
    case actionTypes.UPDATE_PAGE_NAME: {
        const { pageIndex, newName } = action;
        const newPages = [...state.pages];
        newPages[pageIndex] = {
            ...newPages[pageIndex],
            name: newName,
        };
        return {
            ...state,
            pages: newPages,
        };
    }
    default:
      return state;
  }
}