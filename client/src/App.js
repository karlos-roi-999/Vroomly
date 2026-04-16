import './App.css';
import Home from './pages/Home';
import ChatsPage from './pages/ChatsPage';
import SellingPage from './pages/SellingPage';
import SellForm from './components/SellingPageComponents/SellForm';
import ViewListing from './pages/ViewListing';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import { Route, Routes } from 'react-router-dom';
import axios from 'axios';
import { useState, useEffect } from 'react';
import ManageListings from './pages/ManageListings';
import EditListing from './components/ManagePageComponents/EditListing';
import { SocketProvider } from './SocketContext';
axios.defaults.withCredentials = true;


function App() {

  const [listings, setListings] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [userLoggedIn, setUserLoggedIn] = useState({
    loggedIn: false,
    user: null
  })

  // FETCH data from database when page first mounts
  useEffect(() => {
    console.time();
    axios.get('http://localhost:5000/listings')
    .then(response => {
      console.log(response.data);
      setListings(response.data);
    })
    .catch(err => {
      console.error(`Error happened at: ${err}`);
    })
    console.timeEnd();
  }, [refreshTrigger]);

  function refresh(){
    setRefreshTrigger(prev => prev + 1);
  }

  // POST to create a new listing function
  function addListing(listing){
    axios.post('http://localhost:5000/listings', {listing})
    .then((response) => {
      setListings([...listings, response.data])
    })
    .catch((error) => {
      console.error(error);
    });
  }

  // GET request to see if userLoggedin
  useEffect(() => {
    axios.get('http://localhost:5000/auth/me')
    .then((response) => {
      if (response.data.loggedIn) {
        setUserLoggedIn(response.data);
        console.log("user logged in");
      }
    })
    .catch((err) => {
      console.log(err);
      console.log("user is not logged in");
    });
  }, [refreshTrigger]);

  return (
    <SocketProvider userId={userLoggedIn.loggedIn? userLoggedIn.user.id : null}>
      <Routes>
        <Route path='/' element={<Home listings={listings} userLoggedIn={userLoggedIn}/>} exact/>
        <Route path='/chats' element={<ChatsPage/>}/>
        <Route path='/selling' element={<SellingPage userLoggedIn={userLoggedIn}/>}/>
        <Route path='/selling/create-listing' element={<SellForm addListing={addListing} refresh={refresh}/>}/>
        <Route path='/login' element={<Login refresh={refresh}/>}/>
        <Route path='/sign-up' element={<SignUp/>}/>
        <Route path='/selling/manage-listings' element={<ManageListings refreshTrigger={refreshTrigger} setRefreshTrigger={setRefreshTrigger}/>}/>
        <Route path='/view-listing/:id' element={<ViewListing/>}/>
        <Route path='/selling/manage-listings/edit-listing/:id' element={<EditListing refresh={refresh}/>}/>
      </Routes>
    </SocketProvider>
  );
}

export default App;
