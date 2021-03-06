import React, { Component } from 'react';
import  Actions from './profileActions';
import { Provider } from 'react-redux';
import Store from './profileStore';
import Controller from './profileController';

class Profile extends Component {

  constructor(props){
    super(props)

    if(props.location.state && props.location.state.user)
    {
      var obj = Actions.getMyDetails(props.location.state.user);
      Store.dispatch(obj)
    }

  }
  componentDidMount() {
    window.scrollTo(0, 0)
  }
  render() {
    return (
      <Provider store={Store}>
        <Controller />
      </Provider>
    );
  }
}
Profile.defaultProps = {requireAuth:true}
export default Profile;
