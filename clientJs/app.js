import React, { Component } from 'react';
// import logo from './img/logo.svg';
          /*<img src={logo} className="App-logo" alt="logo" />*/
import styles from './css/app.css';
import { Link } from 'react-router';

class App extends Component {

  constructor(){
    super()
    this.state = {"showMenu":""};
     this.toggleMenu = this.toggleMenu.bind(this);
     this.hideMenu = this.hideMenu.bind(this);
  }

  toggleMenu() {
    this.setState((prevState, props) => ({
      showMenu: (prevState.showMenu === "") ? "show" : ""
    }));
  }

  hideMenu(){
    this.state = {showMenu:""}
  }

  render() {

    const menuClassName = "menu "+this.state.showMenu
    return (
      <div className="App">
        <div className="App-header">
          <ul className="menuIcon" onClick={this.toggleMenu}>
            <li><a><i className="material-icons">menu</i></a></li>
          </ul>
          <Link className="App-logo" to="/" onClick={this.hideMenu}>Bird
            <span>Stories</span>
          </Link>
          <ul className={menuClassName} onClick={this.hideMenu}>
            <li className={menuClassName}>
              <Link to="/search" activeClassName="active" ><i className="material-icons">search</i>Search</Link>
            </li>
            <li className={menuClassName}>
              <Link to="/write" activeClassName="active" ><i className="material-icons">create</i>Write</Link>
            </li>
            <li className={menuClassName}>
              <Link to="/contact" activeClassName="active" ><i className="material-icons">phone</i>Contact</Link>
            </li>
            <li className={menuClassName}>
              <Link to="/about" activeClassName="active" ><i className="material-icons">info</i>About</Link>
            </li>
          </ul>
        </div>
        {this.props.children}
      </div>
    );
  }
}

export default App;
