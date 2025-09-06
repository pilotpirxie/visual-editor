import React from 'react';
import { connect } from 'react-redux';
import * as pageActions from '../actions/pageActions';

const PageManager = ({ pages, activePageIndex, addPage, removePage, switchPage, updatePageName }) => {
  return (
    <div className="card mt-4 mb-4">
      <div className="card-header">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Pages</h5>
          <button 
            className="btn btn-outline-success btn-sm" 
            onClick={addPage}
          >
            <i className="fas fa-plus me-1"></i>
            Add Page
          </button>
        </div>
      </div>
      
      <div className="card-body">
        <div className="list-group">
          {pages.map((page, index) => (
            <div 
              key={page.id} 
              className={`list-group-item d-flex justify-content-between align-items-center ${
                index === activePageIndex ? 'active' : ''
              }`}
            >
              <div className="d-flex align-items-center flex-grow-1">
                <input
                  type="text"
                  value={page.name}
                  onChange={(e) => updatePageName(index, e.target.value)}
                  className={`form-control form-control-sm border-0 bg-transparent me-2 ${
                    index === activePageIndex ? 'text-white fw-bold' : ''
                  }`}
                  style={{ 
                    maxWidth: '150px',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.backgroundColor = index === activePageIndex ? 'rgba(255,255,255,0.1)' : '#f8f9fa'}
                  onBlur={(e) => e.target.style.backgroundColor = 'transparent'}
                />
              </div>
              
              <div className="btn-group btn-group-sm" role="group">
                <button 
                  className={`btn ${index === activePageIndex ? 'btn-outline-light' : 'btn-outline-primary'}`}
                  onClick={() => switchPage(index)}
                  disabled={index === activePageIndex}
                >
                  {index === activePageIndex ? (
                    <>
                      <i className="material-icons me-1" style={{ fontSize: "0.875rem", verticalAlign: "middle" }}>check</i>
                      Active
                    </>
                  ) : (
                    'Select'
                  )}
                </button>
                
                {pages.length > 1 && (
                  <button 
                    className={`btn ${index === activePageIndex ? 'btn-outline-light' : 'btn-outline-danger'}`}
                    onClick={() => removePage(index)}
                    title="Remove page"
                  >
                    <i className="material-icons" style={{ fontSize: "0.875rem", verticalAlign: "middle" }}>close</i>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {pages.length === 0 && (
          <div className="text-center text-muted py-3">
            <i className="fas fa-file-alt fa-2x mb-2"></i>
            <p>No pages available. Click "Add Page" to create one.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const mapStateToProps = (state) => ({
  pages: state.layout.pages,
  activePageIndex: state.layout.activePageIndex,
});

const mapDispatchToProps = {
  addPage: pageActions.addPage,
  removePage: pageActions.removePage,
  switchPage: pageActions.switchPage,
  updatePageName: pageActions.updatePageName,
};

export default connect(mapStateToProps, mapDispatchToProps)(PageManager);