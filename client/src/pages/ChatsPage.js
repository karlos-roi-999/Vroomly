import React, { useState, useEffect } from 'react';
import ChatsBar from '../components/ChatsPageComponents/ChatsBar';
import Navbar from '../components/HomeComponents/Navbar';
import ChatContainer from '../components/ChatsPageComponents/ChatContainer';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';

const ChatsPage = () => {
    const [selectedChat, setSelectedChat] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();

    // Get the current logged-in user's info
    useEffect(() => {
        axios.get('http://localhost:5000/auth/me', { withCredentials: true })
            .then(response => {
                if (response.data.loggedIn) {
                    setCurrentUser(response.data.user);
                }
            })
            .catch(err => console.error(err));
    }, []);

    // If navigated here with a contact-seller state, auto-select that conversation
    useEffect(() => {
        if (location.state && location.state.listing_id && location.state.other_user_id) {
            setSelectedChat({
                listing_id: location.state.listing_id,
                other_user_id: location.state.other_user_id,
                other_username: location.state.other_username,
                car_year: location.state.car_year,
                car_make: location.state.car_make,
                car_model: location.state.car_model,
                item_photo: location.state.item_photo || ''
            });

            // Clear the navigation state so refreshing doesn't re-trigger
            navigate('/chats', { replace: true, state: null });
        }
    }, [location.state]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Navbar pageLocation={ChatsPage.name} />
            <div style={{ display: 'flex', flex: 1, height: '100%', minHeight: 0 }}>
                <ChatsBar
                    onSelectChat={setSelectedChat}
                    activeChat={selectedChat}
                    initialChat={selectedChat}
                />
                <ChatContainer
                    chat={selectedChat}
                    currentUser={currentUser}
                />
            </div>
        </div>
    );
};

export default ChatsPage;