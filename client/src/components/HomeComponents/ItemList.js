import React, { useEffect, useState } from 'react';
import ItemCard from './ItemCard';
import Spinner from './Spinner';

const ItemList = ({ items, onMsgClick, selectedSort }) => {

  const [loading, setLoading] = useState(true);
  const [sortedItems, setSortedItems] = useState(items);

  useEffect(() => {
    if (items || items.length > 0){
      setLoading(false);
    }

    const timer = setTimeout(() => {
      setLoading(false)
    }, 2000);
    return () => clearTimeout(timer);

  }, [items]);

  useEffect(() => {
    let newItems = [...items];
    console.log(items.price)
    
    if(selectedSort === 'lowtohigh'){
      newItems.sort((a, b) => a.price - b.price)
    }
    if(selectedSort === 'hightolow'){
      newItems.sort((a, b) => b.price - a.price)
    }
    
    
    setSortedItems(newItems);
  }, [selectedSort, items]);

  if (loading){
    return <Spinner></Spinner>
  }

  if(!items || items.length === 0){
    return (
        <div style={{width: '100%', textAlign: 'center', padding: '2rem', color: '#8f91a2'}}>
            <h3>No listings found.</h3>
        </div>
    );
  }


  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '2rem',
      width: '100%'
    }}>
      {sortedItems.map((item, idx) => (
        <ItemCard
          key={item.id || idx}
          itemId={item.id}
          itemPhoto={item.item_photo}
          productName={`${item.car_year} ${item.car_make} ${item.car_model}`}
          price={item.price}
          location={item.location}
          description={item.description}
          mileage={item.mileage}
          onMsgClick={() => onMsgClick(item)}
        />
      ))}
    </div>
  );
};

export default ItemList;