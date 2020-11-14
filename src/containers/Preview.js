import React from "react";

export default function Preview(props) {
  return <div className='page-content-wrapper'>
    <iframe title={'visual-iframe'} className="visual-iframe" srcDoc={props.html}/>
  </div>;
}
