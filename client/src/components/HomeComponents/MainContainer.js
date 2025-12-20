import SideBar from './SideBar';
import ItemList from './ItemList';
import { useState } from 'react';

const MainContainer = ({listings}) => {

  const [selectedSort, setSelectedSort] = useState("");
  const [minPrice, setMinPrice] = useState();
  const [maxPrice, setMaxPrice] = useState();
  const [selectedMakes, setSelectedMakes] = useState([]);

  return (
    <div style={{ display: 'flex', flexDirection: 'row', width: '100%', boxSizing:'border-box', maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
      <SideBar setSelectedSort={setSelectedSort} setMinPrice={setMinPrice} setMaxPrice={setMaxPrice} minPrice={minPrice} maxPrice={maxPrice} listings={listings} setSelectedMakes={setSelectedMakes}/>
      <div style={{ flex: 1 }} id='itemsContainer'>
        <ItemList items={listings} selectedSort={selectedSort} minPrice={minPrice} maxPrice={maxPrice} selectedMakes={selectedMakes}/>
      </div>
    </div>
  );
};

export default MainContainer;