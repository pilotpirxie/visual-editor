import actionTypes from "../constants/actionTypes";

const initialState = {
  blocks: [{
    "uuid": "91e7135c-82f6-450c-bd4b-74caef5abf6a",
    "cid": "h1",
    "data": {
      "title": "Hello World",
      "tagline": "Lorem ipsum dolor sit amet.",
      "link": "Read more",
    }
  }]
};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    default:
      return state;
  }
}
