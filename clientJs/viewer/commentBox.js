'use strict';
import React, { Component } from 'react';
import styles from '../css/comments.css';

class View extends Component {

  constructor(props){
    super(props);

    var text = '';
    if(this.props.mention){
      text =  "@"+this.props.mention + "  -"
    }
    this.state = {value: text};
    this.publish = this.publish.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.loginSuccessful = this.loginSuccessful.bind(this);
  }

  componentWillReceiveProps(nextProps){
    var text = '';
    if(nextProps.mention){
      text =  "@"+nextProps.mention + "  -"
    }
    this.state = {value: text};
  }

  handleChange(event) {
    this.setState({
                    value: event.target.value,
                    posted:undefined
                  });
  }

  loginSuccessful(user){

    var link = window.location.href;

    var url = "https://www."+link.substring(link.indexOf(window.location.host),link.length-1)
    var comment = {
      text:this.state.value,
      userEmail:user.email,
      userName:user.name,
      link:link
    }

    if(this.props.replyTo){
      comment.replyTo = this.props.replyTo
      comment.replyToName = this.props.mention
      this.props.replySuccess()
    }

    this.props.publishComment(comment);
    window.removeLoginObserver(this.loginSuccessful);
    this.setState({
                    value: '',
                    posted:window.getString('postSuccess')
                  });
  }

  publish(){
    if(this.state.value != ''){
      window.addLoginObserver(this.loginSuccessful);
    }else{
      this.setState({
                      value: '',
                      posted:window.getString('postEmpty')
                    });
    }
  }

  render(){

    var tag = "";
    if(this.state.posted){
        tag = <div className="info">{this.state.posted}</div>
    }

    return(
      <ul className="commentBox">
        <div className="header">{this.props.title}</div>
        {tag}
        <textarea rows="5" className="textArea" value={this.state.value} onChange={this.handleChange} />
        <button type="button" onClick={this.publish}>{window.getString("commentPublish")}</button>
      </ul>
    )
  }
}

export default View;
