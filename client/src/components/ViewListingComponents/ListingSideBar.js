import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ListingSideBar = ({ listingData }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const boxStyle = {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '1.5rem',
      marginBottom: '1.5rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
      border: '1px solid #dcedff'
  };

  const handleContactSeller = async () => {
    setLoading(true);
    try {
      // Check if user is logged in
      const authRes = await axios.get('http://localhost:5000/auth/me', { withCredentials: true });
      if (!authRes.data.loggedIn) {
        navigate('/login');
        return;
      }

      const currentUserId = authRes.data.user.id;

      // Prevent messaging yourself
      if (currentUserId === listingData.user_id) {
        alert("You can't message yourself on your own listing.");
        setLoading(false);
        return;
      }

      // Navigate to chats page with listing + seller context
      navigate('/chats', {
        state: {
          listing_id: listingData.id,
          other_user_id: listingData.user_id,
          other_username: listingData.seller_username,
          car_year: listingData.car_year,
          car_make: listingData.car_make,
          car_model: listingData.car_model,
          item_photo: listingData.item_photo || ''
        }
      });
    } catch (err) {
      console.error('Error contacting seller:', err);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      <div style={boxStyle}>
        <div style={{ fontSize: '2rem', fontWeight: '700', color: '#343f3e', marginBottom: '0.5rem' }}>
             ${new Intl.NumberFormat('en-US').format(listingData.price)}
        </div>
        <div style={{ color: '#8f91a2', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fa-solid fa-location-dot"></i> {listingData.location}
        </div>
      </div>

      <div style={{ ...boxStyle, flex: 1 }}>
        <div style={{ marginBottom: '0.5rem', fontWeight: '600', color: '#343f3e' }}>Description</div>
        <div style={{ lineHeight: '1.6', color: '#505a5b' }}>{listingData.description}</div>
      </div>

      <button 
        className="btn-primary" 
        onClick={handleContactSeller}
        disabled={loading}
        style={{ 
          width: '100%', 
          padding: '1rem', 
          background: '#343f3e', 
          color: 'white',
          border: 'none', 
          borderRadius: '12px',
          fontSize: '1.1rem',
          fontWeight: '600',
          cursor: loading ? 'wait' : 'pointer',
          boxShadow: '0 4px 10px rgba(52, 63, 62, 0.2)',
          opacity: loading ? 0.7 : 1
        }}>
        <i className="fa-regular fa-envelope"></i> {loading ? 'Loading...' : 'Contact Seller'}
      </button>
    </div>
  );
};

export default ListingSideBar;