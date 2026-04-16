import React, { useState, useEffect } from 'react';
import Chats from './Chats';
import axios from 'axios'

const ChatsBar = ({ onSelectChat, activeChat, initialChat }) => {
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/conversations', { withCredentials: true })
      .then(response => {
        setConversations(response.data)
      })
      .catch(err => {
        console.error('Error fetching conversations', err);
      })
  }, []);

  // Merge initialChat into the list if it's not already present (new conversation with no messages yet)
  const displayConversations = (() => {
    if (!initialChat) return conversations;

    const alreadyExists = conversations.some(
      c => c.listing_id === initialChat.listing_id && c.other_user_id === initialChat.other_user_id
    );

    if (alreadyExists) return conversations;

    // Prepend the new conversation placeholder at the top
    return [
      {
        listing_id: initialChat.listing_id,
        other_user_id: initialChat.other_user_id,
        other_username: initialChat.other_username,
        car_year: initialChat.car_year,
        car_make: initialChat.car_make,
        car_model: initialChat.car_model,
        item_photo: initialChat.item_photo || '',
        latest_content: '',
        latest_time: null
      },
      ...conversations
    ];
  })();

  return (
    <aside style={{ flexBasis: '350px', backgroundColor: 'white', borderRight: '1px solid #dcedff', height:'100%', overflowY: 'auto' }}>
      <div style={{padding: '1.5rem', borderBottom: '1px solid #dcedff', fontWeight: 'bold', fontSize: '1.2rem'}}>
        Messages
      </div>
      {displayConversations.length === 0 && (
        <div style={{ padding: '2rem', textAlign:'center', color:'#8f91a2' }}>
          No conversations yet
        </div>
      )}
      {displayConversations.map((conv, idx) => 
        <Chats
          key={`${conv.listing_id}-${conv.other_user_id}`}
          itemPhoto={conv.item_photo || ''}
          productName={`${conv.car_year} ${conv.car_make} ${conv.car_model}`}
          latestMessage={conv.latest_content}
          onClick={() => onSelectChat(conv)}
          isActive={
            activeChat &&
            activeChat.listing_id === conv.listing_id &&
            activeChat.other_user_id === conv.other_user_id
          }
        />
      )}
    </aside>
  );
};
export default ChatsBar;