import React from "react";

export default function Preview(props) {
  return <div className='page-content-wrapper overflow-hidden d-flex justify-content-center'>
    <div className={`preview-window shadow-lg preview-mode-${props.previewMode}`}>
      <div className='preview-toolbar d-flex align-items-center justify-content-between'>
        <div className='d-flex align-items-center'>
          <span className="material-icons preview-toolbar-dot">stop_circle</span>
          <span className="material-icons preview-toolbar-dot">stop_circle</span>
          <span className="material-icons preview-toolbar-dot">stop_circle</span>
        </div>
        <div className='d-flex'>
          <button onClick={() => props.onChangePreviewMode(0)} className={`btn btn-sm btn-preview-toolbar d-flex align-items-center ${props.previewMode === 0 ? 'active' : ''}`}>
            <span className="material-icons">devices</span>
          </button>
          <button onClick={() => props.onChangePreviewMode(1)} className={`btn btn-sm btn-preview-toolbar d-flex align-items-center ${props.previewMode === 1 ? 'active' : ''}`}>
            <span className="material-icons">tv</span>
          </button>
          <button onClick={() => props.onChangePreviewMode(2)} className={`btn btn-sm btn-preview-toolbar d-flex align-items-center ${props.previewMode === 2 ? 'active' : ''}`}>
            <span className="material-icons">tablet</span>
          </button>
          <button onClick={() => props.onChangePreviewMode(3)} className={`btn btn-sm btn-preview-toolbar d-flex align-items-center ${props.previewMode === 3 ? 'active' : ''}`}>
            <span className="material-icons">smartphone</span>
          </button>
        </div>
      </div>
      <iframe title={'visual-iframe'} className={`visual-iframe`} srcDoc={props.html}/>
    </div>
  </div>;
}
