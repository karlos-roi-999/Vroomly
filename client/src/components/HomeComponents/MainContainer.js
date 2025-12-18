import SideBar from './SideBar';
import ItemList from './ItemList';
import { useState } from 'react';

const MainContainer = ({listings}) => {

  const [selectedSort, setSelectedSort] = useState("");

  return (
    <div style={{ display: 'flex', flexDirection: 'row', width: '100%', boxSizing:'border-box', maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
      <SideBar setSelectedSort={setSelectedSort}/>
      <div style={{ flex: 1 }} id='itemsContainer'>
        <ItemList items={listings} selectedSort={selectedSort}/>
      </div>
    </div>
  );
};

export default MainContainer;