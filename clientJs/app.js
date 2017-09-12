import React, { Component } from 'react';
import GAuth from './secure/gAuth'
import FAuth from './secure/fAuth'
import Login from  './secure/login.js'
import styles from './css/app.css';
import { Link } from 'react-router';
import Utils from './util/utilityFunctions';

import SA from './util/analytics';

import profileSvg from './img/profile.svg';
import logoutSvg from './img/logout.svg';
import menuSvg from './img/menu.svg';
import phoneSvg from './img/phone.svg';
import searchSvg from './img/search.svg';

import Popup from './util/popup';

const msgIndex = Math.floor(Math.random() * 5);
const msgNotifier = [
  'కథలతో మీ అనుబంధాన్ని మరింత ముందుకి తీస్కుని వెళ్ళటానికి మా సరికొత్త యాప్ ఇక్కడ క్లిక్ చేసి ఇన్స్టాల్ చేసుకోండి. ',
  'కొత్త కథలను ప్రచురింపబడిన వెంటనే చదవాలి అనుకుంటున్నారా! మా సరికొత్త యాప్ ఇక్కడ క్లిక్ చేసి ఇన్స్టాల్ చేసుకోండి. ',
  'మీ అభిమాన కథలకు మా యాప్ తో మరింత చేరువకండి. ఇన్స్టాల్ చేసుకోవటానికి ఇక్కడ క్లిక్ చేయండి. ',
  'కథల ప్రపంచానికి మరో పూల మార్గం మా యాప్. ఇన్స్టాల్ చేసుకోవటానికి ఇక్కడ క్లిక్ చేయండి. ',
  'Be the first to read a new story! Install our user friendly app by a simple click. '
]

class App extends Component {

  constructor(){
      super()
     this.state = {"showMenu":""};
     this.toggleMenu = this.toggleMenu.bind(this);
     this.hideMenu = this.hideMenu.bind(this);
     this.userStateListener = this.userStateListener.bind(this);
     this.googleLoadSuccess = this.googleLoadSuccess.bind(this);
     this.fbLoadSuccess = this.fbLoadSuccess.bind(this);
     this.addLoginObserver = this.addLoginObserver.bind(this);
     this.removeLoginObserver = this.removeLoginObserver.bind(this);
     this.logout = this.logout.bind(this);

     window.addLoginObserver =  this.addLoginObserver;
     window.removeLoginObserver =  this.removeLoginObserver;

     this.notifierAction =  this.notifierAction.bind(this);
     this.removeNotifier=  this.removeNotifier.bind(this);
  }

  componentDidMount(){

    if("TooManyReqs" !== this.props.children.type.name){
      GAuth.init(this.userStateListener,this.googleLoadSuccess);
      FAuth.init(this.userStateListener,this.fbLoadSuccess);
    }

    SA.sendPageView('Home');
    var component = this.props.children;
    var isApp = false;
    if(component && component.props.location && component.props.location.query && component.props.location.query.app){
      isApp = true
    }

    if(Utils.isAndroid() && !isApp){
      var that = this
      setTimeout(function(){
        SA.sendEvent('AppDownload','open',msgIndex);
        that.setState((prevState, props) => {
            var state = prevState;
            state.showNotifier = <button onClick={that.notifierAction} className="notifier">{msgNotifier[msgIndex]}<img src="touch.png" className="notifierIcon"></img></button>
          ;
            return state;
        })
      },1000)
    }

  }

  notifierAction(){
    SA.sendEvent('AppDownload','openedLink',msgIndex);
    window.open("https://play.google.com/store/apps/details?id=com.sukatha");
    this.setState((prevState, props) => {
        var state = prevState;
        state.showNotifier = undefined
      ;
        return state;
    })

  }

  removeNotifier(){
    SA.sendEvent('AppDownload','close',msgIndex);
    this.setState((prevState, props) => {
        var state = prevState;
        state.showNotifier = undefined
      ;
        return state;
    })
  }

  toggleMenu() {
    this.setState((prevState, props) => {
        var state = prevState;
        state.showMenu = (prevState.showMenu === "") ? "show" : "";
        return state;
    })
  }

  hideMenu(){
    this.setState((prevState, props) => {
        var state = prevState;
        state.showMenu = "";
        return state;
    })
  }

  googleLoadSuccess(){
    this.setState((prevState, props) => {
        var state = prevState;
        state.gApi = GAuth;
        return state;
    })
  }

  fbLoadSuccess(){
    this.setState((prevState, props) => {
        var state = prevState;
        state.fbApi = FAuth;
        return state;
    })
  }

  userStateListener(service,isLoggedIn,user){
    this.setState((prevState, props) => {
        var state = prevState;

        /*ignoring the second login of fb/google. This case shouldnt come unless
          user has given access from both
        */
        if(!state.user){
          if(isLoggedIn){
            state.user = user;
            var userInfo = {
              email:user.email,
              name:user.name
            }
            SA.setUserId(userInfo);
          }else{
            state.user = undefined;
            if(state.fbApi && state.gApi){
              SA.setClientId();
            }
          }
        }else if(!isLoggedIn && service === state.user.service){
            state.user = undefined;
        }

        if(state.user && prevState.loginListener){
          setTimeout(function(){prevState.loginListener(user)},1);
        }

        return state;
    })
  }

  //add user state to component
  changeComponentState(component){
    var userDetails = {};
    userDetails.email = this.state.user.email;
    userDetails.service = this.state.user.service;
    userDetails.token = this.state.user.token;

    var componentState = component.props.location.state;

    if(componentState){
      componentState.user = userDetails;
    }else{
      componentState = {}
      componentState.user = userDetails;
      component.props.location.state = componentState;
    }
  }

  addLoginObserver(listener){
    var user =  this.state.user
    if(user){
      listener(user)
      return true;
    }

    this.setState((prevState, props) => {
        var state = prevState;
        state.loginListener = listener;
        return state;
    });
  }

  removeLoginObserver(){
    this.setState((prevState, props) => {
        var state = prevState;
        state.loginListener = undefined;
        return state;
    });
  }

  logout(){
    if(this.state.user.service == 'google'){
        this.state.gApi.signOut();
    }else{
        this.state.fbApi.signOut();
        this.setState((prevState, props) => {
            var state = prevState;
            state.user = undefined;
            return state;
          })
    }
  }

  render() {

    const menuClassName = "menu "+this.state.showMenu

    var tag = <Link to="/profile" activeClassName="active" ><img src={profileSvg}/></Link>
    var component = this.props.children;
    var defaultProps = component.type.defaultProps;
    var logout = "";

    if(this.state.user){
      var imgsrc = this.state.user.imageUrl
      var divStyle = {
            background: 'url(' + imgsrc + ') no-repeat center',
            width:'42px',
            height:'42px'
        }
      tag = <Link to="/profile"  activeClassName="active" style={divStyle}></Link>
      logout = <a onClick={this.logout}><img src={logoutSvg}/></a>
      if(defaultProps && defaultProps.requireAuth){
        this.changeComponentState(component);
      }
    }else if(defaultProps && defaultProps.requireAuth){
        component = <Login google={this.state.gApi} fb={this.state.fbApi} />
    }

    var popup = ""
    if(this.state.loginListener){
      var content = <Login google={this.state.gApi} fb={this.state.fbApi} />
      popup = <Popup content={content} onClose={this.removeLoginObserver} />
    }else if(this.state.showNotifier){
      popup = <Popup content={this.state.showNotifier} onClose={this.removeNotifier} />
    }

    var headerClass = "App-header";
    var footerClass = "App-footer";

    // any change in this render please check all menu options. Here location doesnt come for every link/click
    if(component.props.location && component.props.location.query && component.props.location.query.app){
        headerClass = "App-header App-hide";
        footerClass = "App-footer App-hide"
    }

    return (
      <div className="App">
        <div className={headerClass}>
          <ul className="menuIcon" onClick={this.toggleMenu}>
            <li><a><img src={menuSvg} /></a></li>
          </ul>
          <ul className="social">
            <li>
              {tag}
            </li>
            <li>
              {logout}
            </li>
          </ul>
          <Link className="App-logo" to="/" onClick={this.hideMenu}>{window.getString("companyMain")}
            <span>{window.getString("companySub")}</span>
          </Link>

          <ul className={menuClassName} onClick={this.hideMenu}>
            <li className={menuClassName}>
              <Link to="/search" activeClassName="active" ><img src={searchSvg}/>{window.getString("search")}</Link>
            </li>
            <li className={menuClassName}>
              <Link to="/contact" activeClassName="active" ><img src={phoneSvg}/>{window.getString("contactUs")}</Link>
            </li>
          </ul>
        </div>

        <div className="App-body">
          {component}
          {popup}
        </div>
        <div className={footerClass}>
          <div className="about">
            <Link to="/about"> {window.getString("aboutUs")}</Link>
            <Link to="/policy"> {window.getString("policy")}</Link>
          </div>
          <div className="rights">
            <p>
              {window.getString("copyright")}<br />{window.getString("rights")}
            </p>
          </div>

        </div>
      </div>
    );
  }
}

export default App;
