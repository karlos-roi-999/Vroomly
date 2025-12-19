import { Link } from 'react-router-dom';

const SideBar = ({setSelectedSort, setMinPrice, setMaxPrice, minPrice, maxPrice}) => {
  const sectionStyle = { marginBottom: '1.5rem' };
  const labelStyle = { display: 'block', marginBottom: '0.5rem', color: '#505a5b', fontSize: '0.95rem', cursor: 'pointer' };
  const headerStyle = { fontSize: '1rem', fontWeight: '600', color: '#343f3e', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' };

  const handleSortChange = (event) => {
    setSelectedSort(event.target.value)
  }

  const handleMinPriceChange = (e) => {
    setMinPrice(parseFloat(e.target.value));
  }

  const handleMaxPriceChange = (e) => {
    setMaxPrice(parseFloat(e.target.value));
  }

  return (
    <aside style={{ 
      flexBasis: '250px', 
      minWidth: '250px', 
      marginRight: '2rem', 
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '16px',
      height: 'fit-content',
      boxShadow: '0 2px 12px rgba(0,0,0,0.03)'
    }}>
      <form style={{display:'flex', flexDirection:'column', width:'100%'}}>
        
        <div style={sectionStyle}>
          <div style={headerStyle}><i className="fa-solid fa-sort"></i> Sort By</div>
          <div>
            <label style={labelStyle}><input type="radio" name="sort" value="newest" defaultChecked onChange={handleSortChange} style={{marginRight: '8px'}} /> Newest First</label>
            <label style={labelStyle}><input type="radio" name="sort" value="lowtohigh" onChange={handleSortChange} style={{marginRight: '8px'}} /> Price: Low to High</label>
            <label style={labelStyle}><input type="radio" name="sort" value="hightolow" onChange={handleSortChange} style={{marginRight: '8px'}} /> Price: High to Low</label>
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={headerStyle}><i className="fa-solid fa-tag"></i> Price Range</div>
          <div style={{display: 'flex', gap: '0.5rem'}}>
            <input className="input-focus" type="number" name="minPrice" placeholder="Min" value={minPrice} onChange={handleMinPriceChange} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #8f91a2' }} />
            <input className="input-focus" type="number" name="maxPrice" placeholder="Max" value={maxPrice} onChange={handleMaxPriceChange} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #8f91a2' }} />
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={headerStyle}><i className="fa-solid fa-car"></i> Make</div>
          {['Toyota', 'Honda', 'Ford', 'GMC'].map(make => (
             <label key={make} style={labelStyle}>
               <input type="checkbox" name="make" value={make} style={{marginRight: '8px'}} /> {make}
             </label>
          ))}
        </div>

        <div style={sectionStyle}>
          <div style={headerStyle}><i className="fa-solid fa-map-pin"></i> Location</div>
          <input className="input-focus" type="text" name="location" placeholder="City or Zip" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #8f91a2' }} />
        </div>

        <button className="btn-primary" type="submit" style={{
          width: '100%',
          padding: '12px',
          backgroundColor: '#343f3e',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontWeight: '600',
          cursor: 'pointer',
          marginBottom: '1rem'
        }}>Apply Filters</button>
      </form>
      
      <div style={{borderTop: '1px solid #dcedff', paddingTop: '1rem'}}>
        <Link to={'/selling'} style={{textDecoration: 'none'}}>
            <button className="btn-primary" style={{
                width:'100%', 
                padding: '12px', 
                backgroundColor: 'white', 
                color: '#343f3e', 
                border: '1px solid #343f3e', 
                borderRadius: '8px', 
                fontWeight: '600',
                cursor: 'pointer'
            }}>
                <i className="fa-solid fa-plus"></i> Sell Your Car
            </button>
        </Link>
      </div>
    </aside>
  );
};

export default SideBar;