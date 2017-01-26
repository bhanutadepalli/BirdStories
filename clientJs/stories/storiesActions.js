'use strict';
import  Constants from './storiesConstants';
import Server from '../util/server';

function pendingFetch(){
  return {
    type:Constants.StoriesChangeEvent,
    isFetching:true,
    stories:[]
  };
}

function fetchSuccess(stories){
  return {
    type:Constants.StoriesChangeEvent,
    isFetching:false,
    stories:stories
  };
}

function updateSuccess(attributes,index){
  return {
    type:Constants.StoryChangeEvent,
    attributes:attributes,
    index:index
  };
}

function shouldFetchStories(state) {
  const stories = state.stories
  if (!state.isFetching) {
    return true;
  } else if (!stories || stories.length == 0) {
    return true;
  } else {
    return stories.didInvalidate;
  }
}

function fetchStoriesIfNeeded() {
  return function(dispatch, getState){
    if (shouldFetchStories(getState())) {
      return dispatch(fetchStories())
    };
  };
}

function fetchStories(){
  return function(dispatch) {
    dispatch(pendingFetch())
    Server.fetch('stories',function(data){
        dispatch(fetchSuccess(data))
    });
  }
}

function updateSocial(index,element){

  return function(dispatch,getState) {
    const stories = getState().stories
    const story = stories[index]
    const storyId = {
      author:story.author,
      timestamp:story.timestamp
    }

    const body = {
      id:storyId,
      updateAttr:"social",
      updateKey:element
    }
    Server.connect('POST','stories',body,function(data){
        console.log(data);
        dispatch(updateSuccess(data,index))
    });
  }
}

function contentSuccess(data){
  return {
    type:Constants.StoryContentSuccess,
    content:data,
  };
}

function getStoryContent(){
  return function(dispatch) {
    Server.fetch('stories/author/name',function(data){
        dispatch(contentSuccess(data))
    });
  }
}

const Actions = {
    fetchStories:fetchStories,
    fetchStoriesIfNeeded:fetchStoriesIfNeeded,
    getStoryContent:getStoryContent,
    updateSocial:updateSocial
};

export default Actions
